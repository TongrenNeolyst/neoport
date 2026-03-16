import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";

import { AnalystsPage } from "@/features/analyst-info/components/analysts-page";

export default async function AnalystInfoPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    query?: string;
  }>;
}) {
  // Check authentication
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  // Check admin role
  const role = await getCurrentUserRole();
  if (role !== "admin") {
    redirect("/403");
  }

  return <AnalystsPage searchParams={searchParams} />;
}
