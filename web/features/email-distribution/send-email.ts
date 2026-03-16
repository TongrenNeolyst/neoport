import nodemailer from "nodemailer";
import { createServerClient } from "@/lib/supabase/server";

export type SubscriptionType = "normal" | "wind" | "tonghuashun";

export interface ReportForEmail {
  id: string;
  title: string;
  report_type: string;
  ticker: string | null;
  investment_thesis: string | null;
  published_at: string | null;
  created_at: string;
  analysts: {
    analyst?: {
      full_name: string;
      chinese_name: string | null;
    };
  }[];
  latest_version?: {
    word_file_path: string | null;
    word_file_name: string | null;
  };
}

interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

/**
 * Generate email subject based on subscription type
 */
export function generateEmailSubject(
  subscriptionType: SubscriptionType,
  report: ReportForEmail,
): string {
  const reportDate = report.published_at
    ? new Date(report.published_at).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0];
  const author = report.analysts?.[0]?.analyst?.full_name || report.analysts?.[0]?.analyst?.chinese_name || "";

  switch (subscriptionType) {
    case "wind":
      // 华福国际 * 报告类别 * 报告标题 * 报告日期 * 报告作者
      return `华福国际 * ${report.report_type} * ${report.title} * ${reportDate} * ${author}`;

    case "tonghuashun":
      // 华福国际 * 个股研究 * 股票代码 * 作者 * 报告撰写时间 * 标题
      const ticker = report.ticker || "";
      const writeTime = report.created_at
        ? new Date(report.created_at).toISOString().replace("T", " ").substring(0, 16)
        : new Date().toISOString().replace("T", " ").substring(0, 16);
      return `华福国际 * 个股研究 * ${ticker} * ${author} * ${writeTime} * ${report.title}`;

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
  const supabase = await createServerClient();

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
export async function sendEmail(params: SendEmailParams): Promise<boolean> {
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
      // For local development or when attachment is a local path
      if (params.attachmentUrl.startsWith("http")) {
        // Download the file and attach it
        const response = await fetch(params.attachmentUrl);
        const buffer = await response.arrayBuffer();
        mailOptions.attachments = [
          {
            filename: params.attachmentName,
            content: Buffer.from(buffer),
          },
        ];
      } else {
        // Local file path
        mailOptions.attachments = [
          {
            filename: params.attachmentName,
            path: params.attachmentUrl,
          },
        ];
      }
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
export async function getActiveSubscriptions(): Promise<
  { email: string; subscription_type: SubscriptionType }[]
> {
  const supabase = await createServerClient();

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
export async function getReportForEmail(reportId: string): Promise<ReportForEmail | null> {
  const supabase = await createServerClient();

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

  // Transform analysts data from Supabase nested structure to flat structure
  const analysts = (data.analysts || []).map((item: { analyst?: { full_name: string; chinese_name: string | null }[] }) => ({
    analyst: item.analyst ? item.analyst[0] : undefined,
  }));

  return {
    ...data,
    analysts,
    latest_version: versions.length > 0 ? versions[versions.length - 1] : undefined,
  };
}

/**
 * Process distribution queue - send emails for pending reports
 */
export async function processDistributionQueue(): Promise<{
  success: number;
  failed: number;
}> {
  const supabase = await createServerClient();

  // Get pending queue items
  const { data: queueItems, error: queueError } = await supabase
    .from("report_distribution_queue")
    .select("id, report_id")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(10);

  if (queueError || !queueItems || queueItems.length === 0) {
    return { success: 0, failed: 0 };
  }

  let successCount = 0;
  let failedCount = 0;

  for (const item of queueItems) {
    // Mark as processing
    await supabase
      .from("report_distribution_queue")
      .update({ status: "processing" })
      .eq("id", item.id);

    try {
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

      // Get active subscriptions
      const subscriptions = await getActiveSubscriptions();
      if (subscriptions.length === 0) {
        await supabase
          .from("report_distribution_queue")
          .update({ status: "completed", sent_at: new Date().toISOString() })
          .eq("id", item.id);
        continue;
      }

      // Get attachment URL if available
      let attachmentUrl: string | undefined;
      let attachmentName: string | undefined;

      if (report.latest_version?.word_file_path) {
        const { data: signedData } = await supabase.storage
          .from("reports")
          .createSignedUrl(report.latest_version.word_file_path, 3600); // 1 hour expiry

        if (signedData?.signedUrl) {
          attachmentUrl = signedData.signedUrl;
          attachmentName = report.latest_version.word_file_name || "report.pdf";
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

  return { success: successCount, failed: failedCount };
}
