import "server-only";

import type { Result } from "@/lib/result";

import {
  changeReportStatus,
  getReportDetail,
  listReports,
  saveReportContent,
  type ReportDetail,
  type ReportSummary,
} from "@/features/reports/repo/reports-repo";
import type { ReportAnalystInput } from "@/domain/schemas/report";

export async function listReviewReports(params: {
  page: number;
  query: string | null;
  status: "all" | "submitted" | "published" | "rejected";
}): Promise<
  Result<{
    items: ReportSummary[];
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  return listReports({
    page: params.page,
    query: params.query,
    status: params.status,
  });
}

export async function getReviewReportDetail(
  reportId: string,
): Promise<Result<ReportDetail>> {
  return getReportDetail(reportId);
}

export async function approveReport(params: {
  report_id: string;
  action_by: string;
}): Promise<Result<ReportDetail>> {
  return changeReportStatus({
    report_id: params.report_id,
    to_status: "published",
    action_by: params.action_by,
  });
}

export async function rejectReport(params: {
  report_id: string;
  action_by: string;
  reason: string;
}): Promise<Result<ReportDetail>> {
  return changeReportStatus({
    report_id: params.report_id,
    to_status: "rejected",
    action_by: params.action_by,
    reason: params.reason,
  });
}

export async function reopenReport(params: {
  report_id: string;
  action_by: string;
}): Promise<Result<ReportDetail>> {
  return changeReportStatus({
    report_id: params.report_id,
    to_status: "draft",
    action_by: params.action_by,
  });
}

export async function saveReviewReportContent(params: {
  report_id: string;
  title: string;
  report_type: string;
  ticker?: string | null;
  rating?: string | null;
  target_price?: string | null;
  region_code?: string | null;
  sector_id?: string | null;
  report_language?: "en" | "zh" | null;
  contact_person_id?: string | null;
  investment_thesis?: string | null;
  certificate_confirmed?: boolean;
  coverage_id?: string | null;
  analysts: ReportAnalystInput[];
  changed_by: string;
  word_file_path?: string | null;
  word_file_name?: string | null;
  model_file_path?: string | null;
  model_file_name?: string | null;
}): Promise<Result<ReportDetail>> {
  return saveReportContent({
    report_id: params.report_id,
    title: params.title,
    report_type: params.report_type,
    ticker: params.ticker,
    rating: params.rating,
    target_price: params.target_price,
    region_code: params.region_code,
    sector_id: params.sector_id,
    report_language: params.report_language,
    contact_person_id: params.contact_person_id,
    investment_thesis: params.investment_thesis,
    certificate_confirmed: params.certificate_confirmed,
    coverage_id: params.coverage_id,
    analysts: params.analysts,
    changed_by: params.changed_by,
    word_file_path: params.word_file_path,
    word_file_name: params.word_file_name,
    model_file_path: params.model_file_path,
    model_file_name: params.model_file_name,
  });
}
