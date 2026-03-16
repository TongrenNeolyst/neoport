import { redirect } from "next/navigation";

import { getCurrentUserRole } from "@/lib/supabase/server";
import { listAnalysts } from "@/features/analyst-info/repo/analysts-repo";
import type { Analyst } from "@/features/analyst-info/repo/analysts-repo";

import { ReviewReportPage as ReviewReportPageContent } from "@/features/report-review/components/review-report-page";

export default async function ReviewReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa") {
    redirect("/403");
  }

  // Fetch analysts list on server side
  const analystsResult = await listAnalysts({ page: 1, query: null });
  const analysts: Analyst[] = analystsResult.ok ? analystsResult.data.items : [];

  const { id } = await params;
  return <ReviewReportPageContent reportId={id} userRole={role} analysts={analysts} />;
}
