/**
 * Retry Distribution - 手动重试失败的报告分发
 *
 * 用法: npx tsx scripts/retry-distribution.ts [report_id]
 * 不带参数时重试所有失败的报告
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function retryFailedDistributions(reportId?: string) {
  console.log("Starting retry distribution...");

  let query = supabase
    .from("report_distribution_history")
    .select("report_id, recipient_email, status")
    .eq("status", "failed");

  if (reportId) {
    query = query.eq("report_id", reportId);
  }

  const { data: failedRecords, error } = await query;

  if (error) {
    console.error("Failed to query failed records:", error);
    return;
  }

  if (!failedRecords || failedRecords.length === 0) {
    console.log("No failed records found");
    return;
  }

  // Get unique report IDs
  const reportIds = [...new Set(failedRecords.map((r) => r.report_id))];
  console.log(`Found ${failedRecords.length} failed emails for ${reportIds.length} reports`);

  for (const id of reportIds) {
    // Delete failed history for this report
    await supabase
      .from("report_distribution_history")
      .delete()
      .eq("report_id", id)
      .eq("status", "failed");

    // Reset queue status to pending
    await supabase
      .from("report_distribution_queue")
      .update({ status: "pending", error_message: null })
      .eq("report_id", id)
      .eq("status", "completed");

    console.log(`Reset queue for report: ${id}`);
  }

  console.log("Done. Run process-distribution-queue.ts to send emails.");
}

const reportId = process.argv[2];
retryFailedDistributions(reportId)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
