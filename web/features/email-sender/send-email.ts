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
  analysts: string[];
  investment_thesis: string | null;
  ticker: string | null;
  ticker_name: string | null;
  sector: string | null;
};

const MAX_RETRIES = 1;
const CONNECTION_TIMEOUT_MS = 30_000;
const SEND_TIMEOUT_MS = 60_000;

/** 报告类型 -> Wind 邮件主题中的报告类别 */
function mapCategoryWind(reportType: string): string {
  const t = reportType.toLowerCase();
  if (t === "company" || t === "company flash") return "公司研究";
  if (t === "sector" || t === "sector flash") return "行业研究";
  if (t === "macro") return "宏观研究";
  if (t === "strategy" || t === "quantitative") return "策略研究";
  if (t === "bond") return "债券研究";
  return reportType;
}

/** 报告类型 -> 同花顺邮件主题中的报告类别 */
function mapCategoryTonghuashun(reportType: string): string {
  const t = reportType.toLowerCase();
  if (t === "company" || t === "company flash") return "个股研究";
  if (t === "sector" || t === "sector flash") return "行业研究";
  if (t === "macro") return "宏观经济";
  if (t === "strategy" || t === "quantitative") return "投资策略";
  if (t === "bond") return "债券研究";
  return reportType;
}

/**
 * Generate email subject based on subscription type.
 * Wind:       华福国际 * 报告类别 * 报告标题 * 报告日期(yyyyMMdd) * 报告作者(,号分割)
 * 同花顺:     华福国际 * 报告类别 * 报告标题 * 报告日期(yyyy-MM-dd) * 报告作者(仅第一个)
 * 普通:       报告标题
 */
export function generateEmailSubject(
  subscriptionType: SubscriptionType,
  report: ReportForEmail,
): string {
  const authors = report.analysts.join(",");
  const firstAuthor = report.analysts[0] ?? "";

  switch (subscriptionType) {
    case "wind": {
      const dateStr = report.published_at
        ? new Date(report.published_at).toISOString().split("T")[0].replace(/-/g, "")
        : new Date().toISOString().split("T")[0].replace(/-/g, "");
      return `华福国际*${mapCategoryWind(report.report_type)}*${report.title}*${dateStr}*${authors}`;
    }

    case "tonghuashun": {
      const t = report.report_type.toLowerCase();
      const dateStr = report.published_at
        ? new Date(report.published_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      let subject = "";
      if (t === "company" || t === "company flash") {
        subject = `华福国际*个股研究*${report.ticker_name ?? ""}*${firstAuthor}*${dateStr}*${report.title}`;
      } else if (t === "sector" || t === "sector flash") {
        subject = `华福国际*行业研究*${report.sector ?? ""}*${firstAuthor}*${dateStr}*${report.title}`;
      } else {
        subject = `华福国际*${mapCategoryTonghuashun(report.report_type)}*${firstAuthor}*${dateStr}*${report.title}`;
      }
      return subject;
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

  const bodyHtml = buildEmailHtmlBody(report);

  const mailAttachments = await resolveAttachments(attachments);

  try {
    await transporter.sendMail({
      from: config.smtp_from,
      to: recipientEmail,
      subject,
      html: bodyHtml,
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

/**
 * Build HTML email body from Investment Thesis (rich text).
 */
function buildEmailHtmlBody(report: ReportForEmail): string {
  if (report.investment_thesis) {
    return report.investment_thesis;
  }
  return `<p>Please find the report attached.</p>`;
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
