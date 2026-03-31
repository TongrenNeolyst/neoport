import "server-only";

import { err, ok, type Result } from "@/lib/result";
import { createServerClient } from "@/lib/supabase/server";

export type SmtpConfig = {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_from: string;
  is_enabled: boolean;
};

/**
 * Load enabled SMTP config from email_config table.
 */
export async function loadSmtpConfig(): Promise<Result<SmtpConfig>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("email_config")
    .select("*")
    .eq("is_enabled", true)
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return err("SMTP not configured or disabled");
    }
    return err(error.message);
  }

  return ok({
    smtp_host: data.smtp_host,
    smtp_port: data.smtp_port,
    smtp_user: data.smtp_user,
    smtp_pass: data.smtp_pass,
    smtp_from: data.smtp_from,
    is_enabled: data.is_enabled,
  });
}

export { sendReportEmail, type ReportAttachment, type ReportForEmail } from "./send-email";
export { recordSendHistory, type SendStatus, type SendHistoryRecord } from "./distribution-history-repo";
