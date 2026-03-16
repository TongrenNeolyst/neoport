import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";

import { RegionsPage as RegionsPageContent } from "@/features/regions/components/regions-page";

export default async function RegionsPage({
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

  return <RegionsPageContent searchParams={searchParams} />;
}
