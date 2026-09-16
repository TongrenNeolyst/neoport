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
  title?: string | null;
  ticker?: string | null;
  reportType?: string | null;
  analyst?: string | null;
}): Promise<
  Result<{
    items: ExternalReport[];
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  await requireAuth();
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    return err("No permission");
  }

  return listExternalReports({
    page: input.page ?? 1,
    title: input.title ?? null,
    ticker: input.ticker ?? null,
    reportType: input.reportType ?? null,
    analyst: input.analyst ?? null,
  });
}

export async function getExternalReportDetailAction(
  reportId: string,
): Promise<Result<ExternalReportDetail>> {
  await requireAuth();
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    return err("No permission");
  }

  return getExternalReportDetail(reportId);
}

export async function getExternalReportSignedUrlAction(
  filePath: string,
): Promise<Result<string>> {
  await requireAuth();
  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    return err("No permission");
  }

  return getExternalReportSignedUrl(filePath);
}
