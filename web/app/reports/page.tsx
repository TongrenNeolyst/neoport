import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";

import { ReportsPage as ReportsPageContent } from "@/features/reports/components/reports-page";

export default async function ReportsPage({
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
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    redirect("/403");
  }

  return (
    <ReportsPageContent
      searchParams={searchParams}
      userRole={role}
      currentUserId={user.id}
    />
  );
}
