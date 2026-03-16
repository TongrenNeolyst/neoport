import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";

import { TemplatesPage as TemplatesPageContent } from "@/features/templates/components/templates-page";

export default async function TemplatesPage() {
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

  return <TemplatesPageContent />;
}
