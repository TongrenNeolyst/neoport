import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";

import { ReportReviewPage as ReportReviewPageContent } from "@/features/report-review/components/report-review-page";

export default async function ReportReviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    query?: string;
    status?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa") {
    redirect("/403");
  }

  return <ReportReviewPageContent searchParams={searchParams} />;
}
