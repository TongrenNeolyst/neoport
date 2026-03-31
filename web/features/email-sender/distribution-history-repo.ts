import "server-only";

import { err, ok, type Result } from "@/lib/result";

export type { SmtpConfig } from "./index";

export type SendStatus = "sent" | "failed";

export type SendHistoryRecord = {
  report_id: string;
  recipient_email: string;
  status: SendStatus;
  error_message: string | null;
  sent_at: string | null;
};

/**
 * Record a send attempt into report_distribution_history.
 * Uses service-role client (no RLS) since the cron script runs server-side.
 */
export async function recordSendHistory(params: {
  reportId: string;
  email: string;
  status: SendStatus;
  errorMessage?: string;
  sentAt?: string;
}): Promise<Result<void>> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("report_distribution_history")
    .insert({
      report_id: params.reportId,
      recipient_email: params.email,
      status: params.status,
      error_message: params.errorMessage ?? null,
      sent_at: params.sentAt ?? null,
    });

  if (error) {
    return err(error.message);
  }

  return ok(undefined);
}
