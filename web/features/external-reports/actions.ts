"use server";

import { err, ok, type Result } from "@/lib/result";
import { requireAuth, getCurrentUserRole } from "@/lib/supabase/server";

import {
  listExternalReports,
  getExternalReportDetail,
  getExternalReportSignedUrl,
  type ExternalReport,
  type ExternalReportDetail,
} from "./repo/external-reports-repo";

export async function listExternalReportsAction(input: {
  page?: number;
  query?: string | null;
}): Promise<
  Result<{
    items: ExternalReport[];
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  const user = await requireAuth();
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    return err("No permission");
  }

  return listExternalReports({ page: input.page ?? 1, query: input.query ?? null });
}

export async function getExternalReportDetailAction(
  reportId: string,
): Promise<Result<ExternalReportDetail>> {
  const user = await requireAuth();
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    return err("No permission");
  }

  return getExternalReportDetail(reportId);
}

export async function getExternalReportSignedUrlAction(
  filePath: string,
): Promise<Result<string>> {
  const user = await requireAuth();
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    return err("No permission");
  }

  return getExternalReportSignedUrl(filePath);
}
