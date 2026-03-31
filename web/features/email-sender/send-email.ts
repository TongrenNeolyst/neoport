import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import { err, ok, type Result } from "@/lib/result";
import { loadSmtpConfig, type SmtpConfig } from "./index";

export type SubscriptionType = "normal" | "wind" | "tonghuashun";

export type ReportAttachment = {
  file_path: string;
  original_name: string;
};

export type ReportForEmail = {
  id: string;
  title: string;
  report_type: string;
  published_at: string;
  analyst: string | null;
  investment_thesis: string | null;
  ticker: string | null;
};

const MAX_RETRIES = 1;
const CONNECTION_TIMEOUT_MS = 30_000;
const SEND_TIMEOUT_MS = 60_000;

/**
 * Generate email subject based on subscription type.
 * Wind: 华福国际 * 报告类型 * 标题 * 日期 * 分析师
 * 同花顺: 华福国际 * 个股研究 * 股票代码 * 分析师 * 时间 * 标题
 * 普通: 标题
 */
export function generateEmailSubject(
  subscriptionType: SubscriptionType,
  report: ReportForEmail,
  analystName: string,
): string {
  const reportDate = report.published_at
    ? new Date(report.published_at).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];

  switch (subscriptionType) {
    case "wind":
      return `华福国际 * ${report.report_type} * ${report.title} * ${reportDate} * ${analystName}`;

    case "tonghuashun": {
      const writeTime = new Date(report.published_at).toISOString().replace("T", " ").substring(0, 16);
      return `华福国际 * 个股研究 * ${report.ticker || ""} * ${analystName} * ${writeTime} * ${report.title}`;
    }

    case "normal":
    default:
      return report.title;
  }
}

/**
 * Send a report email to a single recipient with PDF attachments.
 * Retries once on failure.
 */
export async function sendReportEmail(params: {
  report: ReportForEmail;
  recipientEmail: string;
  attachments: ReportAttachment[];
  subject?: string;
}): Promise<Result<void>> {
  const configResult = await loadSmtpConfig();
  if (!configResult.ok) {
    return err(configResult.error);
  }

  const config = configResult.data;

  const transporter = buildTransporter(config);

  let lastError: string = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await trySend(transporter, config, params, attempt);
    if (result.ok) {
      return ok(undefined);
    }
    lastError = result.error;
  }

  return err(lastError);
}

async function trySend(
  transporter: Transporter,
  config: SmtpConfig,
  params: { report: ReportForEmail; recipientEmail: string; attachments: ReportAttachment[]; subject?: string },
  attempt: number,
): Promise<Result<void>> {
  const { report, recipientEmail, attachments, subject: customSubject } = params;

  const subject = customSubject || `[Report] ${report.title} - ${new Date(report.published_at).toLocaleDateString("zh-CN")}`;

  const bodyText = buildEmailBody(report);

  const mailAttachments = await resolveAttachments(attachments);

  try {
    await transporter.sendMail({
      from: config.smtp_from,
      to: recipientEmail,
      subject,
      text: bodyText,
      attachments: mailAttachments,
    });

    return ok(undefined);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (attempt < MAX_RETRIES) {
      console.warn(`[send-email] Attempt ${attempt + 1} failed for ${recipientEmail}: ${msg}, retrying...`);
    }
    return err(msg);
  }
}

function buildTransporter(config: SmtpConfig): Transporter {
  return nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
    tls: {
      rejectUnauthorized: false,
    },
  });
}

function buildEmailBody(report: ReportForEmail): string {
  const lines: string[] = [
    `Report: ${report.title}`,
    `Published: ${new Date(report.published_at).toLocaleDateString("zh-CN")}`,
  ];

  if (report.analyst) {
    lines.push(`Analyst: ${report.analyst}`);
  }

  if (report.ticker) {
    lines.push(`Ticker: ${report.ticker}`);
  }

  lines.push("");

  if (report.investment_thesis) {
    lines.push(report.investment_thesis);
  }

  lines.push("", "Please find the report attached.", "---", "This is an automated email. Please do not reply.");

  return lines.join("\n");
}

async function resolveAttachments(attachments: ReportAttachment[]): Promise<{ filename: string; content: Buffer }[]> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const resolved: { filename: string; content: Buffer }[] = [];

  for (const att of attachments) {
    const { data, error } = await supabase.storage
      .from("external-reports")
      .download(att.file_path);

    if (error || !data) {
      console.warn(`[send-email] Failed to download attachment ${att.file_path}: ${error?.message ?? "unknown error"}`);
      continue;
    }

    const buffer = Buffer.from(await data.arrayBuffer());

    resolved.push({
      filename: att.original_name,
      content: buffer,
    });
  }

  return resolved;
}
