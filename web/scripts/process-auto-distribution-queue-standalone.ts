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

// Neolyst Storage client（附件文件在 Neolyst 的 reports bucket）
const NEOLYST_URL = process.env.NEOLYST_SUPABASE_URL!;
const NEOLYST_KEY = process.env.NEOLYST_SUPABASE_SERVICE_ROLE_KEY!;
const neolystClient = createClient(NEOLYST_URL, NEOLYST_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ===== 类型 =====
type SubscriptionType = "normal" | "wind" | "tonghuashun" | "bloomberg_zh" | "bloomberg_en";

interface ReportForEmail {
  id: string;
  title: string;
  report_type: string;
  published_at: string;
  analysts: string[];
  investment_thesis: string | null;
  ticker: string | null;
  ticker_name: string | null;
  sector: string | null;
  report_language: string | null;
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
function mapCategoryWind(reportType: string): string {
  const t = reportType.toLowerCase();
  if (t === "company" || t === "company_flash" || t === "company-translate") return "公司研究";
  if (t === "sector" || t === "sector_flash" || t === "sector-translate") return "行业研究";
  if (t === "macro" || t === "macro-translate") return "宏观研究";
  if (t === "strategy" || t === "strategy-translate" || t === "quantitative" || t === "quantitative-translate") return "策略研究";
  if (t === "bond" || t === "bond-translate") return "债券研究";
  return reportType;
}

function mapCategoryTonghuashun(reportType: string): string {
  const t = reportType.toLowerCase();
  if (t === "company" || t === "company_flash" || t === "company-translate") return "个股研究";
  if (t === "sector" || t === "sector_flash" || t === "sector-translate") return "行业研究";
  if (t === "macro" || t === "macro-translate") return "宏观经济";
  if (t === "strategy" || t === "strategy-translate" || t === "quantitative" || t === "quantitative-translate") return "投资策略";
  if (t === "bond" || t === "bond-translate") return "债券研究";
  return reportType;
}

/** 是否为公司类报告（用于 Bloomberg 邮件 T: 行） */
function isCompanyReport(reportType: string): boolean {
  const t = reportType.toLowerCase();
  return t === "company" || t === "company_flash" || t === "company-translate";
}

/** 是否为行业类报告（用于 Bloomberg 邮件 T: 行） */
function isSectorReport(reportType: string): boolean {
  const t = reportType.toLowerCase();
  return t === "sector" || t === "sector_flash" || t === "sector-translate";
}

/** HTML 实体转义 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Bloomberg 邮件主题：取报告标题第一个冒号前的内容
 * 冒号同时支持英文冒号 ":" 和中文（全角）冒号 "："
 */
function extractBloombergSubject(reportTitle: string): string {
  // 匹配英文 ":" 或中文全角 "："（U+FF1A）
  const matcher = /[:：]/.exec(reportTitle);
  if (matcher) return reportTitle.substring(0, matcher.index);
  return reportTitle;
}

/** 构造 Bloomberg 邮件正文（按语言） */
function buildBloombergHtmlBody(report: ReportForEmail, language: "zh" | "en" = "en"): string {
  let tickerLine: string;
  if (isCompanyReport(report.report_type)) {
    const t = (report.ticker ?? "").trim();
    tickerLine = t ? `(T: ${t.replace(/\s+/g, "@")})` : "(T: N/A)";
  } else if (isSectorReport(report.report_type)) {
    const sector = (report.sector ?? "").trim();
    tickerLine = sector ? `(T: ${sector})` : "(T: N/A)";
  } else {
    tickerLine = "(T: N/A)";
  }

  const thesis = report.investment_thesis
    ? report.investment_thesis
    : "<p>Please find the report attached.</p>";

  if (language === "zh") {
    return [
      `<p>${tickerLine}</p>`,
      `<p>&nbsp;</p>`,
      `<p>尊敬的彭博研究团队，</p>`,
      `<p>&nbsp;</p>`,
      `<p>报告标题:</p>`,
      `<p>${escapeHtml(report.title)}</p>`,
      `<p>&nbsp;</p>`,
      `<p>主要观点摘要：</p>`,
      thesis,
    ].join("\n");
  }

  return [
    `<p>${tickerLine}</p>`,
    `<p>&nbsp;</p>`,
    `<p>Dear Bloomberg Research Team,</p>`,
    `<p>&nbsp;</p>`,
    `<p>Report Title:</p>`,
    `<p>${escapeHtml(report.title)}</p>`,
    `<p>&nbsp;</p>`,
    `<p>Summary of main points:</p>`,
    thesis,
  ].join("\n");
}

function generateEmailSubject(
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
      if (t === "company" || t === "company_flash" || t === "company-translate") {
        subject = `华福国际*个股研究*${report.ticker_name ?? ""}*${firstAuthor}*${dateStr}*${report.title}`;
      } else if (t === "sector" || t === "sector_flash" || t === "sector-translate") {
        subject = `华福国际*行业研究*${report.sector ?? ""}*${firstAuthor}*${dateStr}*${report.title}`;
      } else {
        subject = `华福国际*${mapCategoryTonghuashun(report.report_type)}*${firstAuthor}*${dateStr}*${report.title}`;
      }
      return subject;
    }
    case "bloomberg_zh":
    case "bloomberg_en": {
      return extractBloombergSubject(report.title);
    }
    case "normal":
    default:
      return report.title;
  }
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

// ===== 附件下载（从 Neolyst Storage） =====
async function resolveAttachments(
  attachments: ReportAttachment[],
): Promise<{ filename: string; content: Buffer }[]> {
  const resolved: { filename: string; content: Buffer }[] = [];
  for (const att of attachments) {
    // 从 Neolyst 的 reports bucket 下载
    const { data, error } = await neolystClient.storage
      .from("reports")
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
  bodyHtml?: string;
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

  const subject = params.subject || params.report.title;
  const mailAttachments = await resolveAttachments(params.attachments);

  let lastError = "";
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await transporter.sendMail({
        from: config.smtp_from,
        to: params.recipientEmail,
        subject,
        html: params.bodyHtml || undefined,
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
    .select("id, title, report_type, published_at, investment_thesis, ticker, ticker_name, sector, analyst, report_language")
    .eq("id", reportId)
    .single();

  if (error || !data) {
    console.error(`[process-queue] Failed to fetch report ${reportId}:`, error);
    return null;
  }

  const analysts: string[] = (data.analyst ?? "")
    .split(",")
    .map((n: string) => n.trim())
    .filter(Boolean);

  return {
    id: data.id,
    title: data.title,
    report_type: data.report_type,
    published_at: data.published_at,
    analysts,
    investment_thesis: data.investment_thesis,
    ticker: data.ticker,
    ticker_name: data.ticker_name,
    sector: data.sector,
    report_language: data.report_language,
  };
}

// ===== 获取收件人 =====
// 去重策略：
//   1) 分析师与联系人之间按邮箱（lowercase）去重，分析师优先
//   2) 每个订阅类型（wind / tonghuashun / normal / bloomberg_zh / bloomberg_en）
//      内部按邮箱去重，防止同一 email 在 email_subscription 表里以多行存在
//      而被重复发送
//   3) 分析师 / 联系人 邮箱若同时出现在普通订阅（normal）里，跳过 normal
//      这一路（普通订阅与分析师 / 联系人的主题、正文完全相同，重复发没意义；
//      分析师 > 联系人 > 普通订阅）
//   4) 跨订阅类型（wind / tonghuashun / bloomberg）之间、以及它们与
//      分析师 / 联系人的交叉：仍按各自主题格式分别发送（不同格式是业务预期）
async function fetchRecipients(report: ReportForEmail): Promise<RecipientEntry[]> {
  // 分析师 / 联系人 邮箱集合（lowercase），用于跨类型去重时优先匹配
  const analystContactEmails = new Set<string>();
  const analystContactMap = new Map<string, RecipientEntry>();

  // 1) 分析师
  const { data: analysts } = await supabase
    .from("report_analyst")
    .select("analyst_email")
    .eq("report_id", report.id);
  if (analysts) {
    for (const a of analysts) {
      const email = (a.analyst_email ?? "").trim().toLowerCase();
      if (!email || analystContactEmails.has(email)) continue;
      analystContactEmails.add(email);
      analystContactMap.set(email, { email: a.analyst_email, subscriptionType: "analyst" });
    }
  }

  // 2) 联系人（邮箱未出现过才入库，分析师优先）
  const { data: contacts } = await supabase
    .from("report_contact")
    .select("contact_email")
    .eq("report_id", report.id);
  if (contacts) {
    for (const c of contacts) {
      const email = (c.contact_email ?? "").trim().toLowerCase();
      if (!email || analystContactEmails.has(email)) continue;
      analystContactEmails.add(email);
      analystContactMap.set(email, { email: c.contact_email, subscriptionType: "contact" });
    }
  }

  const result: RecipientEntry[] = Array.from(analystContactMap.values());

  // 3) 订阅类型：wind / tonghuashun（各自内部去重；不同主题/正文，保留重复发）
  for (const subType of ["wind", "tonghuashun"] as const) {
    const { data: subs } = await supabase
      .from("email_subscription")
      .select("email")
      .eq("subscription_type", subType)
      .eq("is_active", true);
    if (!subs) continue;
    const seenInType = new Set<string>();
    for (const s of subs) {
      const email = (s.email ?? "").trim().toLowerCase();
      if (!email || seenInType.has(email)) continue;
      seenInType.add(email);
      result.push({ email: s.email, subscriptionType: subType });
    }
  }

  // 4) 普通订阅 normal：内部去重 + 分析师/联系人邮箱优先
  //    同一邮箱如果在分析师/联系人名单里出现过，跳过 normal
  //    （避免同一封主题、正文都相同的邮件被发两次）
  const { data: normalSubs } = await supabase
    .from("email_subscription")
    .select("email")
    .eq("subscription_type", "normal")
    .eq("is_active", true);
  if (normalSubs) {
    const seenInType = new Set<string>();
    for (const s of normalSubs) {
      const email = (s.email ?? "").trim().toLowerCase();
      if (!email || seenInType.has(email)) continue;
      seenInType.add(email);
      if (analystContactEmails.has(email)) continue; // 分析师/联系人已发送
      result.push({ email: s.email, subscriptionType: "normal" });
    }
  }

  // 5) Bloomberg (彭博)：按 report.report_language 路由到对应语言的邮箱
  //    - 'zh' → 仅 bloomberg_zh 订阅者收到
  //    - 其他（包括 'en' 与 null）→ 仅 bloomberg_en 订阅者收到
  //    同类型内部按邮箱去重（同一邮箱在该类型多行 → 仅发一次）
  const bloombergType: SubscriptionType = report.report_language === "zh" ? "bloomberg_zh" : "bloomberg_en";
  const { data: bloombergSubs } = await supabase
    .from("email_subscription")
    .select("email")
    .eq("subscription_type", bloombergType)
    .eq("is_active", true);
  if (bloombergSubs) {
    const seenInType = new Set<string>();
    for (const s of bloombergSubs) {
      const email = (s.email ?? "").trim().toLowerCase();
      if (!email || seenInType.has(email)) continue;
      seenInType.add(email);
      result.push({ email: s.email, subscriptionType: bloombergType });
    }
  }

  return result;
}

// ===== 获取附件（仅 PDF） =====
async function fetchAttachments(reportId: string): Promise<ReportAttachment[]> {
  const { data } = await supabase
    .from("report_attachments")
    .select("file_path, original_name, mime_type")
    .eq("report_id", reportId);

  return (data ?? [])
    .filter((a) => {
      // 优先按 mime_type 判断；缺失时回退到扩展名
      if (a.mime_type) return a.mime_type.toLowerCase() === "application/pdf";
      return a.original_name.toLowerCase().endsWith(".pdf");
    })
    .map((a) => ({ file_path: a.file_path, original_name: a.original_name }));
}

// ===== 主逻辑 =====
async function processQueueItem(queueId: string, reportId: string) {
  console.log(`[process-queue] Processing queue item ${queueId} (report: ${reportId})`);

  // 标记 processing（乐观锁：只有 status='waiting' 才能更新，防止重复处理）
  const { error: updateError } = await supabase
    .from("report_distribution_queue")
    .update({ status: "processing" })
    .eq("id", queueId)
    .eq("status", "waiting");

  if (updateError) {
    console.error(`[process-queue] Failed to update queue ${queueId}:`, updateError);
    return;
  }

  // 乐观锁检查：再次查询确认状态已更新，防止并发抢走
  const { data: currentRow } = await supabase
    .from("report_distribution_queue")
    .select("status")
    .eq("id", queueId)
    .single();

  if (currentRow?.status !== "processing") {
    console.log(`[process-queue] Queue ${queueId} status is ${currentRow?.status}, skipping.`);
    return;
  }

  try {
    const report = await fetchReport(reportId);
    if (!report) {
      await supabase.from("report_distribution_queue").update({ status: "failed", error_message: "Report not found" }).eq("id", queueId);
      return;
    }

    const recipients = await fetchRecipients(report);
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

      // Wind / 同花顺 / Bloomberg 使用差异化主题与正文；analyst/contact/normal 使用 investment_thesis
      let subject: string | undefined;
      let bodyHtml: string | undefined = report.investment_thesis || undefined;
      if (recipient.subscriptionType === "wind" || recipient.subscriptionType === "tonghuashun") {
        subject = generateEmailSubject(recipient.subscriptionType as SubscriptionType, report);
      } else if (recipient.subscriptionType === "bloomberg_zh") {
        subject = generateEmailSubject("bloomberg_zh", report);
        bodyHtml = buildBloombergHtmlBody(report, "zh");
      } else if (recipient.subscriptionType === "bloomberg_en") {
        subject = generateEmailSubject("bloomberg_en", report);
        bodyHtml = buildBloombergHtmlBody(report, "en");
      }

      console.log(`[process-queue] Sending to ${recipient.email} (${recipient.subscriptionType}): ${subject || "default"}`);

      const result = await sendReportEmail({ report, recipientEmail: recipient.email, attachments, subject, bodyHtml });

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
