/**
 * Standalone 邮件分发队列处理器（不依赖 server-only）
 * 用法: npx tsx --env-file=.env scripts/process-auto-distribution-queue-standalone.ts
 */
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// ===== 配置 =====
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ===== 类型 =====
type SubscriptionType = "normal" | "wind" | "tonghuashun";

interface ReportForEmail {
  id: string;
  title: string;
  report_type: string;
  published_at: string;
  analyst: string | null;
  investment_thesis: string | null;
  ticker: string | null;
}

interface ReportAttachment {
  file_path: string;
  original_name: string;
}

interface RecipientEntry {
  email: string;
  subscriptionType: SubscriptionType | "analyst" | "contact";
}

// ===== 邮件主题生成 =====
function generateEmailSubject(
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
      const writeTime = new Date(report.published_at)
        .toISOString()
        .replace("T", " ")
        .substring(0, 16);
      return `华福国际 * 个股研究 * ${report.ticker || ""} * ${analystName} * ${writeTime} * ${report.title}`;
    }
    case "normal":
    default:
      return report.title;
  }
}

// ===== 邮件正文 =====
function buildEmailBody(report: ReportForEmail): string {
  const lines: string[] = [
    `Report: ${report.title}`,
    `Published: ${new Date(report.published_at).toLocaleDateString("zh-CN")}`,
  ];
  if (report.analyst) lines.push(`Analyst: ${report.analyst}`);
  if (report.ticker) lines.push(`Ticker: ${report.ticker}`);
  lines.push("");
  if (report.investment_thesis) lines.push(report.investment_thesis);
  lines.push("", "Please find the report attached.", "---", "This is an automated email. Please do not reply.");
  return lines.join("\n");
}

// ===== SMTP 配置加载 =====
interface SmtpConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
}

async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  const { data, error } = await supabase
    .from("email_config")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from")
    .eq("is_enabled", true)
    .limit(1)
    .single();

  if (error || !data) {
    console.error("[process-queue] SMTP config not found or disabled:", error);
    return null;
  }
  return data;
}

// ===== 附件下载 =====
async function resolveAttachments(
  attachments: ReportAttachment[],
): Promise<{ filename: string; content: Buffer }[]> {
  const resolved: { filename: string; content: Buffer }[] = [];
  for (const att of attachments) {
    const { data, error } = await supabase.storage
      .from("external-reports")
      .download(att.file_path);

    if (error || !data) {
      console.warn(`[process-queue] Failed to download ${att.file_path}: ${error?.message ?? "unknown"}`);
      continue;
    }

    resolved.push({
      filename: att.original_name,
      content: Buffer.from(await data.arrayBuffer()),
    });
  }
  return resolved;
}

// ===== 发送邮件 =====
const MAX_RETRIES = 1;
const CONNECTION_TIMEOUT_MS = 30_000;
const SEND_TIMEOUT_MS = 60_000;

async function sendReportEmail(params: {
  report: ReportForEmail;
  recipientEmail: string;
  attachments: ReportAttachment[];
  subject?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const config = await loadSmtpConfig();
  if (!config) return { ok: false, error: "SMTP config not available" };

  const transporter = nodemailer.createTransport({
    host: config.smtp_host,
    port: config.smtp_port,
    auth: { user: config.smtp_user, pass: config.smtp_pass },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: SEND_TIMEOUT_MS,
    tls: { rejectUnauthorized: false },
  });

  const subject =
    params.subject ||
    `[Report] ${params.report.title} - ${new Date(params.report.published_at).toLocaleDateString("zh-CN")}`;
  const bodyText = buildEmailBody(params.report);
  const mailAttachments = await resolveAttachments(params.attachments);

  let lastError = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail({
        from: config.smtp_from,
        to: params.recipientEmail,
        subject,
        text: bodyText,
        attachments: mailAttachments,
      });
      return { ok: true };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      if (attempt < MAX_RETRIES) {
        console.warn(`[process-queue] Retry attempt ${attempt + 1} failed for ${params.recipientEmail}`);
      }
    }
  }
  return { ok: false, error: lastError };
}

// ===== 历史记录 =====
async function recordSendHistory(params: {
  reportId: string;
  email: string;
  status: "sent" | "failed";
  sentAt?: string;
  errorMessage?: string;
}) {
  await supabase.from("report_distribution_history").insert({
    report_id: params.reportId,
    recipient_email: params.email,
    status: params.status,
    sent_at: params.sentAt ?? null,
    error_message: params.errorMessage ?? null,
  });
}

// ===== 获取报告详情 =====
async function fetchReport(reportId: string): Promise<ReportForEmail | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, title, report_type, published_at, analyst, investment_thesis, ticker")
    .eq("id", reportId)
    .single();

  if (error || !data) {
    console.error(`[process-queue] Failed to fetch report ${reportId}:`, error);
    return null;
  }
  return data;
}

// ===== 获取收件人 =====
async function fetchRecipients(reportId: string): Promise<RecipientEntry[]> {
  const result: RecipientEntry[] = [];

  // 分析师
  const { data: analysts } = await supabase
    .from("report_analyst")
    .select("analyst_email")
    .eq("report_id", reportId);
  if (analysts) for (const a of analysts) result.push({ email: a.analyst_email, subscriptionType: "analyst" });

  // 联系人
  const { data: contacts } = await supabase
    .from("report_contact")
    .select("contact_email")
    .eq("report_id", reportId);
  if (contacts) for (const c of contacts) result.push({ email: c.contact_email, subscriptionType: "contact" });

  // Wind
  const { data: windSubs } = await supabase
    .from("email_subscription")
    .select("email")
    .eq("subscription_type", "wind")
    .eq("is_active", true);
  if (windSubs) for (const s of windSubs) result.push({ email: s.email, subscriptionType: "wind" });

  // 同花顺
  const { data: thsSubs } = await supabase
    .from("email_subscription")
    .select("email")
    .eq("subscription_type", "tonghuashun")
    .eq("is_active", true);
  if (thsSubs) for (const s of thsSubs) result.push({ email: s.email, subscriptionType: "tonghuashun" });

  // 普通
  const { data: normalSubs } = await supabase
    .from("email_subscription")
    .select("email")
    .eq("subscription_type", "normal")
    .eq("is_active", true);
  if (normalSubs) for (const s of normalSubs) result.push({ email: s.email, subscriptionType: "normal" });

  return result;
}

// ===== 获取附件 =====
async function fetchAttachments(reportId: string): Promise<ReportAttachment[]> {
  const { data } = await supabase
    .from("report_attachments")
    .select("file_path, original_name")
    .eq("report_id", reportId);
  return (data ?? []).map((a) => ({ file_path: a.file_path, original_name: a.original_name }));
}

// ===== 主逻辑 =====
async function processQueueItem(queueId: string, reportId: string) {
  console.log(`[process-queue] Processing queue item ${queueId} (report: ${reportId})`);

  // 标记 processing
  const { error: updateError } = await supabase
    .from("report_distribution_queue")
    .update({ status: "processing" })
    .eq("id", queueId)
    .eq("status", "waiting");

  if (updateError) {
    console.error(`[process-queue] Failed to update queue ${queueId}:`, updateError);
    return;
  }

  try {
    const report = await fetchReport(reportId);
    if (!report) {
      await supabase.from("report_distribution_queue").update({ status: "failed", error_message: "Report not found" }).eq("id", queueId);
      return;
    }

    const recipients = await fetchRecipients(reportId);
    if (recipients.length === 0) {
      console.log(`[process-queue] No recipients for report ${reportId}. Marking published.`);
      await supabase.from("report_distribution_queue").update({ status: "published", sent_at: new Date().toISOString() }).eq("id", queueId);
      return;
    }

    const attachments = await fetchAttachments(reportId);

    let firstError: string | undefined = undefined;
    let allSucceeded = true;

    for (const recipient of recipients) {
      const sentAt = new Date().toISOString();

      // Wind / 同花顺使用差异化主题
      let subject: string | undefined;
      if (recipient.subscriptionType === "wind" || recipient.subscriptionType === "tonghuashun") {
        subject = generateEmailSubject(recipient.subscriptionType as SubscriptionType, report, report.analyst || "");
      }

      console.log(`[process-queue] Sending to ${recipient.email} (${recipient.subscriptionType}): ${subject || "default"}`);

      const result = await sendReportEmail({ report, recipientEmail: recipient.email, attachments, subject });

      if (result.ok) {
        await recordSendHistory({ reportId, email: recipient.email, status: "sent", sentAt });
        console.log(`[process-queue] Sent to ${recipient.email}`);
      } else {
        allSucceeded = false;
        firstError ??= result.error;
        await recordSendHistory({ reportId, email: recipient.email, status: "failed", errorMessage: result.error });
        console.error(`[process-queue] Failed to send to ${recipient.email}: ${result.error}`);
      }
    }

    if (allSucceeded) {
      await supabase.from("report_distribution_queue").update({ status: "published", sent_at: new Date().toISOString() }).eq("id", queueId);
      console.log(`[process-queue] Queue ${queueId} marked as published.`);
    } else {
      await supabase.from("report_distribution_queue").update({ status: "failed", error_message: firstError }).eq("id", queueId);
      console.error(`[process-queue] Queue ${queueId} marked as failed: ${firstError}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[process-queue] Exception processing ${queueId}:`, msg);
    await supabase.from("report_distribution_queue").update({ status: "failed", error_message: msg }).eq("id", queueId);
  }
}

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

async function pollQueue() {
  console.log(`[${new Date().toISOString()}] Starting auto distribution queue processor...`);

  const { data: queueItems, error: queueError } = await supabase
    .from("report_distribution_queue")
    .select("id, report_id, created_at")
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(50);

  if (queueError) {
    console.error("[process-queue] Failed to fetch queue:", queueError);
    return;
  }

  if (!queueItems || queueItems.length === 0) {
    console.log("[process-queue] No waiting items in queue.");
    return;
  }

  console.log(`[process-queue] Found ${queueItems.length} waiting items.`);

  for (const item of queueItems) {
    await processQueueItem(item.id, item.report_id);
  }
}

async function main() {
  console.log(`[${new Date().toISOString()}] Auto distribution queue processor started (polling every 5 minutes).`);

  // 启动时立即执行一次
  await pollQueue();

  setInterval(async () => {
    await pollQueue();
  }, POLL_INTERVAL_MS);
}

main().catch((err) => {
  console.error("[process-queue] Fatal error:", err);
  process.exit(1);
});
