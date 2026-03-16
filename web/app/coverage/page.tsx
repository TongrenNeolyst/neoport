import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";

import { CoveragePage as CoveragePageContent } from "@/features/coverage/components/coverage-page";

export default async function CoveragePage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    query?: string;
    sector_id?: string;
  }>;
}) {
  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Check admin, sa, or analyst role
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    redirect("/403");
  }

  return <CoveragePageContent searchParams={searchParams} userRole={role} />;
}
