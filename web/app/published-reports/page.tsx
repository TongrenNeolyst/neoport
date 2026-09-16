import { redirect } from "next/navigation";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";
import {
  listExternalReportsAction,
  type ExternalReport,
} from "@/features/external-reports";
import { PublishedReportsClient } from "@/features/external-reports/components/published-reports-client";

type Role = "admin" | "sa" | "analyst";

function pickString(value: string | string[] | undefined): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? "";
  return "";
}

function parsePage(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default async function PublishedReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const role = (await getCurrentUserRole()) as Role | null;
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    redirect("/403");
  }

  const params = await searchParams;
  const filters = {
    title: pickString(params.title),
    ticker: pickString(params.ticker),
    reportType: pickString(params.type),
    analyst: pickString(params.analyst),
  };
  const page = parsePage(pickString(params.page));

  const result = await listExternalReportsAction({
    page,
    title: filters.title || null,
    ticker: filters.ticker || null,
    reportType: filters.reportType || null,
    analyst: filters.analyst || null,
  });

  const reports: ExternalReport[] = result.ok ? result.data.items : [];
  const total = result.ok ? result.data.total : 0;
  const totalPages = result.ok ? result.data.totalPages : 1;

  const roleLabel =
    role === "analyst"
      ? "Reports you submitted or are assigned to"
      : "All published reports";

  return (
    <PublishedReportsClient
      items={reports}
      total={total}
      page={result.ok ? result.data.page : page}
      totalPages={totalPages}
      roleLabel={roleLabel}
      filters={filters}
    />
  );
}