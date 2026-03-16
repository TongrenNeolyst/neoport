/**
 * Report Distribution Queue Processor
 *
 * This script processes the report distribution queue and sends emails to subscribers.
 * It should be run periodically (e.g., every 5 minutes) via cron or task scheduler.
 *
 * Usage:
 *   node scripts/process-distribution-queue.js
 *
 * Cron example (every 5 minutes):
 *   (run every 5 minutes) cd /path/to/web && node scripts/process-distribution-queue.js
 */

import { createClient } from "@supabase/supabase-js";
import * as nodemailer from "nodemailer";

type SubscriptionType = "normal" | "wind" | "tonghuashun";

interface ReportForEmail {
  id: string;
  title: string;
  report_type: string;
  ticker: string | null;
  investment_thesis: string | null;
  published_at: string | null;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysts: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  latest_version?: any;
}

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Error: Missing required environment variables");
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Map report type to Chinese category name (Wind)
 */
function getReportCategory(reportType: string): string {
  const typeMap: Record<string, string> = {
    // 公司研究
    company: "公司研究",
    company_flash: "公司研究",
    // 行业研究
    sector: "行业研究",
    sector_flash: "行业研究",
    // 宏观研究
    macro: "宏观研究",
    // 策略研究
    strategy: "策略研究",
    quantitative: "策略研究",
    // 债券研究
    bond: "债券研究",
  };
  return typeMap[reportType.toLowerCase()] || reportType;
}

/**
 * Map report type to Chinese category name (同花顺)
 */
function getThsCategory(reportType: string): string {
  const typeMap: Record<string, string> = {
    // 个股研究
    company: "个股研究",
    company_flash: "个股研究",
    // 行业研究
    sector: "行业研究",
    sector_flash: "行业研究",
    // 宏观经济
    macro: "宏观经济",
    // 投资策略
    strategy: "投资策略",
    quantitative: "投资策略",
    // 债券研究
    bond: "债券研究",
  };
  return typeMap[reportType.toLowerCase()] || reportType;
}

/**
 * Format date as yyyyMMdd
 */
function formatDateYmd(dateStr: string | null): string {
  if (!dateStr) return new Date().toISOString().split("T")[0].replace(/-/g, "");
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Get author names separated by comma
 */
function getAuthorNames(report: ReportForEmail): string {
  if (!report.analysts || report.analysts.length === 0) return "";
  return report.analysts
    .map((a) => a.analyst?.full_name || a.analyst?.chinese_name || "")
    .filter((name) => name)
    .join(",");
}

/**
 * Generate email subject based on subscription type
 */
function generateEmailSubject(
  subscriptionType: SubscriptionType,
  report: ReportForEmail,
): string {
  const reportDate = formatDateYmd(report.published_at);
  const author = getAuthorNames(report);
  const category = getReportCategory(report.report_type);

  switch (subscriptionType) {
    case "wind":
      // 华福国际*报告类别*报告标题*报告日期(yyyyMMdd)*报告作者
      return `华福国际*${category}*${report.title}*${reportDate}*${author}`;

    case "tonghuashun":
      // 华福国际*报告类别*报告标题*报告日期(yyyy-MM-dd)*报告作者
      const thsCategory = getThsCategory(report.report_type);
      const thsDate = report.published_at
        ? new Date(report.published_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      const thsAuthor = report.analysts?.[0]?.analyst?.full_name || report.analysts?.[0]?.analyst?.chinese_name || "";
      return `华福国际*${thsCategory}*${report.title}*${thsDate}*${thsAuthor}`;

    case "normal":
    default:
      // 普通订阅：报告标题
      return report.title;
  }
}

/**
 * Get SMTP config from database
 */
async function getSmtpConfig(): Promise<{
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
} | null> {
  const { data, error } = await supabase
    .from("email_config")
    .select("smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from")
    .eq("is_enabled", true)
    .limit(1)
    .single();

  if (error || !data) {
    console.error("Failed to get SMTP config:", error);
    return null;
  }

  return {
    host: data.smtp_host,
    port: data.smtp_port,
    user: data.smtp_user,
    pass: data.smtp_pass,
    from: data.smtp_from,
  };
}

/**
 * Send email with optional attachment
 */
async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  attachmentUrl?: string;
  attachmentName?: string;
}): Promise<boolean> {
  const config = await getSmtpConfig();
  if (!config) {
    console.error("SMTP config not found or disabled");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  try {
    const mailOptions: nodemailer.SendMailOptions = {
      from: config.from,
      to: params.to,
      subject: params.subject,
      html: params.body,
    };

    // Add attachment if provided
    if (params.attachmentUrl && params.attachmentName) {
      const response = await fetch(params.attachmentUrl);
      const buffer = await response.arrayBuffer();
      mailOptions.attachments = [
        {
          filename: params.attachmentName,
          content: Buffer.from(buffer),
        },
      ];
    }

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${params.to}: ${params.subject}`);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

/**
 * Get all active subscriptions with their types
 */
async function getActiveSubscriptions(): Promise<
  { email: string; subscription_type: SubscriptionType }[]
> {
  const { data, error } = await supabase
    .from("email_subscription")
    .select("email, subscription_type")
    .eq("is_active", true)
    .not("email", "is", null);

  if (error) {
    console.error("Failed to get subscriptions:", error);
    return [];
  }

  return (data || []).map((row) => ({
    email: row.email,
    subscription_type: row.subscription_type as SubscriptionType,
  }));
}

/**
 * Get report details for email
 */
async function getReportForEmail(reportId: string): Promise<ReportForEmail | null> {
  const { data, error } = await supabase
    .from("report")
    .select(
      `
      id,
      title,
      report_type,
      ticker,
      investment_thesis,
      published_at,
      created_at,
      analysts:report_analyst(
        analyst:analyst_id(
          full_name,
          chinese_name
        )
      ),
      versions:report_version(
        word_file_path,
        word_file_name
      )
    `,
    )
    .eq("id", reportId)
    .single();

  if (error) {
    console.error("Failed to get report:", error);
    return null;
  }

  // Get latest version with word file
  const versions = (data.versions || []).filter(
    (v: { word_file_path: string | null }) => v.word_file_path,
  ) as { word_file_path: string; word_file_name: string }[];

  versions.sort((a, b) => a.word_file_path.localeCompare(b.word_file_path));

  return {
    ...data,
    analysts: data.analysts || [],
    latest_version: versions.length > 0 ? versions[versions.length - 1] : null,
  };
}

/**
 * Process distribution queue - send emails for pending/failed reports
 */
async function processDistributionQueue(): Promise<void> {
  console.log("Starting distribution queue processing...");

  // First, reset failed items to pending (for retry)
  const { error: resetError } = await supabase
    .from("report_distribution_queue")
    .update({ status: "pending", error_message: null })
    .eq("status", "failed");

  if (resetError) {
    console.error("Failed to reset failed items:", resetError);
  }

  // Get pending queue items (including newly reset failed ones)
  const { data: queueItems, error: queueError } = await supabase
    .from("report_distribution_queue")
    .select("id, report_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);

  if (queueError || !queueItems || queueItems.length === 0) {
    console.log("No pending items in distribution queue");
    return;
  }

  console.log(`Found ${queueItems.length} pending items (including retries)`);

  let successCount = 0;
  let failedCount = 0;

  for (const item of queueItems) {
    console.log(`Processing queue item: ${item.id}`);

    // Mark as processing
    await supabase
      .from("report_distribution_queue")
      .update({ status: "processing" })
      .eq("id", item.id);

    try {
      // Delete previous failed history for this report (to allow retry)
      await supabase
        .from("report_distribution_history")
        .delete()
        .eq("report_id", item.report_id);

      // Get report details
      const report = await getReportForEmail(item.report_id);
      if (!report) {
        await supabase
          .from("report_distribution_queue")
          .update({ status: "failed", error_message: "Report not found" })
          .eq("id", item.id);
        failedCount++;
        continue;
      }

      console.log(`Processing report: ${report.title}`);

      // Get active subscriptions
      const subscriptions = await getActiveSubscriptions();
      if (subscriptions.length === 0) {
        console.log("No active subscriptions, marking as completed");
        await supabase
          .from("report_distribution_queue")
          .update({ status: "completed", sent_at: new Date().toISOString() })
          .eq("id", item.id);
        continue;
      }

      console.log(`Sending to ${subscriptions.length} subscribers`);

      // Get attachment URL if available
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;

      if (report.latest_version?.word_file_path) {
        const { data: signedData } = await supabase.storage
          .from("reports")
          .createSignedUrl(report.latest_version.word_file_path, 3600);

        if (signedData?.signedUrl) {
          attachmentUrl = signedData.signedUrl;
          attachmentName =
            report.latest_version.word_file_name || "report.pdf";
        }
      }

      // Send emails to each subscription
      for (const sub of subscriptions) {
        const subject = generateEmailSubject(sub.subscription_type, report);
        const body = report.investment_thesis || "";

        const sent = await sendEmail({
          to: sub.email,
          subject,
          body,
          attachmentUrl,
          attachmentName,
        });

        // Record history
        await supabase.from("report_distribution_history").insert({
          report_id: item.report_id,
          recipient_email: sub.email,
          status: sent ? "sent" : "failed",
          sent_at: sent ? new Date().toISOString() : null,
          error_message: sent ? null : "Failed to send email",
        });

        if (!sent) {
          failedCount++;
        }
      }

      // Mark queue item as completed
      await supabase
        .from("report_distribution_queue")
        .update({ status: "completed", sent_at: new Date().toISOString() })
        .eq("id", item.id);

      successCount++;
    } catch (error) {
      console.error("Error processing queue item:", error);
      await supabase
        .from("report_distribution_queue")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
        })
        .eq("id", item.id);
      failedCount++;
    }
  }

  console.log(`Distribution queue processing completed. Success: ${successCount}, Failed: ${failedCount}`);
}

// Run the processor
processDistributionQueue()
  .then(() => {
    console.log("Done");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
