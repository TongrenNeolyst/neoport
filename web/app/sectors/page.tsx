import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";

import { SectorsPage as SectorsPageContent } from "@/features/sectors/components/sectors-page";

export default async function SectorsPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    query?: string;
    level?: string;
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

  return <SectorsPageContent searchParams={searchParams} />;
}
