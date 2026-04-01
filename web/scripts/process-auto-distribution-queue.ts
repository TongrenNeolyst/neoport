/**
 * Process Auto Distribution Queue
 *
 * 扫描 report_distribution_queue 中 status='waiting' 的记录，
 * 发送邮件给分析师、联系人、Wind/同花顺/普通订阅者，
 * Wind 和同花顺邮件使用差异化主题格式，
 * 记录发送历史。
 *
 * 用法: npx tsx scripts/process-auto-distribution-queue.ts
 * 建议通过 Task Scheduler 每 5 分钟执行一次
 */

import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateEmailSubject,
  sendReportEmail,
  type ReportForEmail,
  type SubscriptionType,
} from "@/features/email-sender/send-email";
import { recordSendHistory } from "@/features/email-sender/distribution-history-repo";

const supabase = createAdminClient();

async function main() {
  console.log(`[${new Date().toISOString()}] Starting auto distribution queue processor...`);

  // 1. 获取等待发布的队列记录（加行锁防止并发）
  const { data: queueItems, error: queueError } = await supabase
    .from("report_distribution_queue")
    .select("id, report_id, created_at")
    .eq("status", "waiting")
    .order("created_at", { ascending: true })
    .limit(50);

  if (queueError) {
    console.error("[process-auto-distribution-queue] Failed to fetch queue:", queueError);
    return;
  }

  if (!queueItems || queueItems.length === 0) {
    console.log("[process-auto-distribution-queue] No waiting items in queue. Exiting.");
    return;
  }

  console.log(`[process-auto-distribution-queue] Found ${queueItems.length} waiting items.`);

  for (const item of queueItems) {
    await processQueueItem(item.id, item.report_id);
  }

  console.log("[process-auto-distribution-queue] Done.");
}

async function processQueueItem(queueId: string, reportId: string) {
  console.log(`[process-auto-distribution-queue] Processing queue item ${queueId} (report: ${reportId})`);

  // 2. 标记为 processing
  const { error: updateError } = await supabase
    .from("report_distribution_queue")
    .update({ status: "processing" })
    .eq("id", queueId)
    .eq("status", "waiting"); // 乐观锁

  if (updateError) {
    console.error(`[process-auto-distribution-queue] Failed to update queue ${queueId}:`, updateError);
    return;
  }

  try {
    // 3. 获取报告详情
    const report = await fetchReport(reportId);
    if (!report) {
      await markFailed(queueId, reportId, "Report not found");
      return;
    }

    // 4. 获取所有收件人（含订阅类型）
    const recipients = await fetchRecipients(reportId);

    if (recipients.length === 0) {
      console.log(`[process-auto-distribution-queue] No recipients for report ${reportId}. Marking published.`);
      await markPublished(queueId);
      return;
    }

    // 5. 获取附件
    const attachments = await fetchAttachments(reportId);

    // 6. 发送邮件
    let firstError: string | null = null;
    let allSucceeded = true;

    for (const recipient of recipients) {
      const sentAt = new Date().toISOString();

      // Wind / 同花顺使用差异化主题，普通/分析师/联系人使用标题
      let subject: string | undefined;
      if (recipient.subscriptionType === "wind" || recipient.subscriptionType === "tonghuashun") {
        subject = generateEmailSubject(recipient.subscriptionType, report);
      }

      const sendResult = await sendReportEmail({
        report,
        recipientEmail: recipient.email,
        attachments,
        subject,
      });

      if (sendResult.ok) {
        await recordSendHistory({
          reportId,
          email: recipient.email,
          status: "sent",
          sentAt,
        });
        console.log(`[process-auto-distribution-queue] Sent to ${recipient.email}`);
      } else {
        allSucceeded = false;
        firstError ??= sendResult.error;
        await recordSendHistory({
          reportId,
          email: recipient.email,
          status: "failed",
          errorMessage: sendResult.error,
        });
        console.error(`[process-auto-distribution-queue] Failed to send to ${recipient.email}: ${sendResult.error}`);
      }
    }

    // 7. 更新队列状态
    if (allSucceeded) {
      await markPublished(queueId);
    } else {
      await markFailed(queueId, reportId, firstError ?? "Unknown error");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[process-auto-distribution-queue] Exception processing ${queueId}:`, msg);
    await markFailed(queueId, reportId, msg);
  }
}

async function fetchReport(reportId: string): Promise<ReportForEmail | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("id, title, report_type, published_at, investment_thesis, ticker")
    .eq("id", reportId)
    .single();

  if (error || !data) {
    console.error(`[process-auto-distribution-queue] Failed to fetch report ${reportId}:`, error);
    return null;
  }

  // 从 report_analyst 表获取所有分析师名字
  const { data: analystRows } = await supabase
    .from("report_analyst")
    .select("analyst_name")
    .eq("report_id", reportId);

  const analysts: string[] = (analystRows ?? []).map((r) => r.analyst_name).filter(Boolean);

  return {
    id: data.id,
    title: data.title,
    report_type: data.report_type,
    published_at: data.published_at,
    analysts,
    investment_thesis: data.investment_thesis,
    ticker: data.ticker,
  };
}

type RecipientEntry = { email: string; subscriptionType: SubscriptionType | "analyst" | "contact" };

async function fetchRecipients(reportId: string): Promise<RecipientEntry[]> {
  const result: RecipientEntry[] = [];

  // 分析师邮箱（视为 normal 类型，无差异化主题）
  const { data: analysts } = await supabase
    .from("report_analyst")
    .select("analyst_email")
    .eq("report_id", reportId);
  if (analysts) {
    for (const a of analysts) result.push({ email: a.analyst_email, subscriptionType: "analyst" });
  }

  // 联系人邮箱（视为 normal 类型）
  const { data: contacts } = await supabase
    .from("report_contact")
    .select("contact_email")
    .eq("report_id", reportId);
  if (contacts) {
    for (const c of contacts) result.push({ email: c.contact_email, subscriptionType: "contact" });
  }

  // Wind 订阅者
  const { data: windSubs } = await supabase
    .from("email_subscription")
    .select("email")
    .eq("subscription_type", "wind")
    .eq("is_active", true);
  if (windSubs) {
    for (const s of windSubs) result.push({ email: s.email, subscriptionType: "wind" });
  }

  // 同花顺订阅者
  const { data: thsSubs } = await supabase
    .from("email_subscription")
    .select("email")
    .eq("subscription_type", "tonghuashun")
    .eq("is_active", true);
  if (thsSubs) {
    for (const s of thsSubs) result.push({ email: s.email, subscriptionType: "tonghuashun" });
  }

  // 普通第三方订阅者
  const { data: normalSubs } = await supabase
    .from("email_subscription")
    .select("email")
    .eq("subscription_type", "normal")
    .eq("is_active", true);
  if (normalSubs) {
    for (const s of normalSubs) result.push({ email: s.email, subscriptionType: "normal" });
  }

  return result;
}

async function fetchAttachments(reportId: string) {
  const { data } = await supabase
    .from("report_attachments")
    .select("file_path, original_name")
    .eq("report_id", reportId);

  return (data ?? []).map((a) => ({
    file_path: a.file_path,
    original_name: a.original_name,
  }));
}

async function markPublished(queueId: string) {
  await supabase
    .from("report_distribution_queue")
    .update({ status: "published", sent_at: new Date().toISOString(), error_message: null })
    .eq("id", queueId);
  console.log(`[process-auto-distribution-queue] Queue ${queueId} marked as published.`);
}

async function markFailed(queueId: string, reportId: string, errorMessage: string) {
  await supabase
    .from("report_distribution_queue")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", queueId);
  console.error(`[process-auto-distribution-queue] Queue ${queueId} marked as failed: ${errorMessage}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[process-auto-distribution-queue] Fatal error:", err);
    process.exit(1);
  });
