import { redirect } from "next/navigation";

import { NewReportPage as NewReportPageContent } from "@/features/reports/components/new-report-page";
import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";

export default async function NewReportPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "analyst") {
    redirect("/403");
  }

  return <NewReportPageContent userRole={role} />;
}
