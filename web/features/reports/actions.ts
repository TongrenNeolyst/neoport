"use server";

import { revalidatePath } from "next/cache";

import {
  reportCreateSchema,
  reportDirectSubmitSchema,
  reportDownloadSchema,
  reportSaveSchema,
  reportSubmitSchema,
  type ReportAnalystInput,
  type ReportLanguage,
  type ReportStatus,
} from "@/domain/schemas/report";
import { listAllActiveAnalysts } from "@/features/analyst-info/repo/analysts-repo";
import { err, type Result } from "@/lib/result";
import { requireAuth } from "@/lib/supabase/server";

import {
  changeReportStatus,
  createReport,
  findCoverageByTicker,
  getReportDetail,
  getReportDownloadUrl,
  hasValidTemplateForReportType,
  listReportTypeOptions,
  listReports,
  reportTypeExists,
  regionCodeExists,
  saveChiefApprove,
  saveReportContent,
  sectorExists,
  type ReportDetail,
} from "./repo/reports-repo";

type Role = "admin" | "sa" | "analyst";

async function getActor(): Promise<
  Result<{ user: Awaited<ReturnType<typeof requireAuth>>; role: Role }>
> {
  try {
    const user = await requireAuth();
    const role = user.app_metadata?.role as Role | undefined;
    if (role !== "admin" && role !== "sa" && role !== "analyst") {
      return err("No permission");
    }
    return { ok: true, data: { user, role } };
  } catch {
    return err("Unauthorized");
  }
}

function canCreateOrEdit(role: Role): boolean {
  return role === "admin" || role === "analyst";
}

function isEditableStatus(status: ReportStatus): boolean {
  return status === "draft" || status === "submitted";
}

function trimToNull(value?: string | number | null): string | null {
  if (!value) {
    return null;
  }
  const strValue = String(value);
  const trimmed = strValue.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function resolveOptionalText(
  input: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  if (input === undefined) {
    return fallback ?? null;
  }
  return trimToNull(input);
}

function resolveOptionalId(
  input: string | null | undefined,
  fallback: string | null | undefined,
): string | null {
  if (input === undefined) {
    return fallback ?? null;
  }
  return input ?? null;
}

function resolveOptionalBoolean(
  input: boolean | undefined,
  fallback: boolean | undefined,
): boolean {
  if (input === undefined) {
    return Boolean(fallback);
  }
  return Boolean(input);
}

function isCompanyType(reportType: string): boolean {
  return reportType === "company" || reportType === "company_flash";
}

function requiresRegion(reportType: string): boolean {
  return (
    reportType === "sector" ||
    reportType === "sector_flash" ||
    reportType === "common"
  );
}

function requiresSector(reportType: string): boolean {
  return reportType === "sector" || reportType === "sector_flash";
}

function requiresModel(reportType: string): boolean {
  return reportType === "company";
}

async function validateAnalysts(
  input: { analyst_id: string }[],
): Promise<string | null> {
  if (input.length === 0) {
    return null;
  }

  const analystsResult = await listAllActiveAnalysts();
  if (!analystsResult.ok) {
    return "Failed to validate analyst list.";
  }

  const activeIds = new Set(analystsResult.data.map((item) => item.id));
  const hasInvalid = input.some((item) => !activeIds.has(item.analyst_id));
  if (hasInvalid) {
    return "Analyst must be selected from the active analyst list.";
  }

  return null;
}

async function validateSourceTables(input: {
  report_type: string;
  region_code?: string | null;
  sector_id?: string | null;
}): Promise<string | null> {
  const reportTypeCheck = await reportTypeExists(input.report_type);
  if (!reportTypeCheck.ok) {
    return "Failed to validate report type.";
  }
  if (!reportTypeCheck.data) {
    return "Report Type must be a valid active type.";
  }

  if (input.region_code) {
    const regionCheck = await regionCodeExists(input.region_code);
    if (!regionCheck.ok) {
      return "Failed to validate region.";
    }
    if (!regionCheck.data) {
      return "Region must be selected from the valid region list.";
    }
  }

  if (input.sector_id) {
    const sectorCheck = await sectorExists(input.sector_id);
    if (!sectorCheck.ok) {
      return "Failed to validate sector.";
    }
    if (!sectorCheck.data) {
      return "Sector must be selected from the valid sector list.";
    }
  }

  return null;
}

async function resolveCoverageIdForDraft(input: {
  report_type: string;
  ticker?: string | null;
}): Promise<Result<string | null>> {
  if (!isCompanyType(input.report_type)) {
    return { ok: true, data: null };
  }

  const ticker = trimToNull(input.ticker);
  if (!ticker) {
    return { ok: true, data: null };
  }

  const coverageResult = await findCoverageByTicker(ticker);
  if (!coverageResult.ok) {
    return err("Failed to validate coverage.");
  }

  return { ok: true, data: coverageResult.data?.id ?? null };
}

async function validateReportForSubmit(
  detail: ReportDetail,
): Promise<string | null> {
  const sourceCheck = await validateSourceTables({
    report_type: detail.report_type,
    region_code: detail.region_code,
    sector_id: detail.sector_id,
  });
  if (sourceCheck) {
    return sourceCheck;
  }

  const templateCheck = await hasValidTemplateForReportType(detail.report_type);
  if (!templateCheck.ok) {
    return "Failed to validate template availability.";
  }
  if (!templateCheck.data) {
    return "No valid active template found for selected Report Type.";
  }

  if (!trimToNull(detail.title)) {
    return "Report title is required.";
  }
  if (!detail.report_language) {
    return "Report language is required.";
  }
  // Contact Person is optional
  // if (!trimToNull(detail.contact_person)) {
  //   return "Contact Person is required.";
  // }
  if (!trimToNull(detail.investment_thesis)) {
    return "Investment thesis (report abstract) is required.";
  }
  if (detail.analysts.length === 0) {
    return "At least one Analyst is required.";
  }
  if (!detail.certificate_confirmed) {
    return "Certificate must be confirmed before submit.";
  }

  if (requiresRegion(detail.report_type) && !detail.region_code) {
    return "Region is required for this Report Type.";
  }
  if (requiresSector(detail.report_type) && !detail.sector_id) {
    return "Sector is required for this Report Type.";
  }

  if (detail.report_type === "company") {
    if (!trimToNull(detail.ticker)) {
      return "Ticker is required for Company report.";
    }
    if (!trimToNull(detail.rating)) {
      return "Rating is required for Company report.";
    }
    if (!trimToNull(detail.target_price)) {
      return "Target price is required for Company report.";
    }
  }

  if (detail.report_type === "company_flash" && !trimToNull(detail.ticker)) {
    return "Ticker is required for Company Flash report.";
  }

  if (!detail.latest_version?.word_file_path) {
    return "Report Word file is required before submit.";
  }

  if (
    requiresModel(detail.report_type) &&
    !detail.latest_version?.model_file_path
  ) {
    return "Company report requires Model file before submit.";
  }

  if (isCompanyType(detail.report_type)) {
    const ticker = trimToNull(detail.ticker);
    if (!ticker) {
      return "Ticker is required for company-type reports.";
    }
    const coverageResult = await findCoverageByTicker(ticker);
    if (!coverageResult.ok) {
      return "Failed to validate Coverage relation.";
    }
    if (!coverageResult.data) {
      return "Company-type reports require a valid Coverage. Please complete Coverage maintenance first.";
    }
    if (coverageResult.data.analyst_ids.length === 0) {
      return "Matched Coverage has no Analyst mapping. Please maintain Coverage first.";
    }
    const reportAnalystIds = new Set(
      detail.analysts.map((item) => item.analyst_id),
    );
    const overlap = coverageResult.data.analyst_ids.some((id) =>
      reportAnalystIds.has(id),
    );
    if (!overlap) {
      return "Company-type submit requires Coverage relation with matching Analyst assignment.";
    }
  }

  return null;
}

async function assertEditable(
  role: Role,
  userId: string,
  reportId: string,
): Promise<Result<ReportDetail>> {
  const detailResult = await getReportDetail(reportId);
  if (!detailResult.ok) {
    return detailResult;
  }

  const detail = detailResult.data;
  if (!isEditableStatus(detail.status)) {
    return err("Only draft/submitted reports can be edited.");
  }

  if (role === "analyst" && detail.owner_user_id !== userId) {
    return err("No permission");
  }

  return detailResult;
}

function toSavePayload(input: {
  title: string;
  report_type: string;
  ticker?: string | null;
  rating?: string | null;
  target_price?: string | null;
  region_code?: string | null;
  sector_id?: string | null;
  report_language?: ReportLanguage | null;
  contact_person_id?: string | null;
  investment_thesis?: string | null;
  certificate_confirmed?: boolean;
  coverage_id?: string | null;
  analysts: ReportAnalystInput[];
  word_file_path?: string | null;
  word_file_name?: string | null;
  model_file_path?: string | null;
  model_file_name?: string | null;
  fallback?: Partial<ReportDetail>;
}) {
  return {
    title: input.title.trim(),
    report_type: input.report_type.trim(),
    ticker: resolveOptionalText(input.ticker, input.fallback?.ticker),
    rating: resolveOptionalText(input.rating, input.fallback?.rating),
    target_price: resolveOptionalText(
      input.target_price,
      input.fallback?.target_price,
    ),
    region_code: resolveOptionalId(input.region_code, input.fallback?.region_code),
    sector_id: resolveOptionalId(input.sector_id, input.fallback?.sector_id),
    report_language:
      input.report_language === undefined
        ? (input.fallback?.report_language ?? null)
        : (input.report_language ?? null),
    contact_person_id: resolveOptionalId(
      input.contact_person_id,
      input.fallback?.contact_person_id,
    ),
    investment_thesis: resolveOptionalText(
      input.investment_thesis,
      input.fallback?.investment_thesis,
    ),
    certificate_confirmed: resolveOptionalBoolean(
      input.certificate_confirmed,
      input.fallback?.certificate_confirmed,
    ),
    coverage_id: resolveOptionalId(
      input.coverage_id,
      input.fallback?.coverage_id,
    ),
    analysts: input.analysts,
    word_file_path:
      input.word_file_path === undefined
        ? (input.fallback?.latest_version?.word_file_path ?? null)
        : (input.word_file_path ?? null),
    word_file_name:
      input.word_file_name === undefined
        ? (input.fallback?.latest_version?.word_file_name ?? null)
        : (input.word_file_name ?? null),
    model_file_path:
      input.model_file_path === undefined
        ? (input.fallback?.latest_version?.model_file_path ?? null)
        : (input.model_file_path ?? null),
    model_file_name:
      input.model_file_name === undefined
        ? (input.fallback?.latest_version?.model_file_name ?? null)
        : (input.model_file_name ?? null),
  };
}

export async function listReportTypeOptionsAction(): Promise<Result<string[]>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }
  return listReportTypeOptions();
}

export async function listReportsAction(input: {
  page?: number;
  query?: string | null;
  status?: ReportStatus | null;
}): Promise<
  Result<{
    items: Awaited<ReturnType<typeof listReports>> extends Result<infer T>
      ? T extends { items: infer U }
        ? U
        : never
      : never;
    total: number;
    page: number;
    totalPages: number;
    applied_status: ReportStatus | null;
  }>
> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  const { role } = actor.data;
  const page = Math.max(1, input.page ?? 1);
  const query = input.query ?? null;
  // Default status: all reports
  const defaultStatus = null;
  const appliedStatus = input.status ?? defaultStatus;

  const listResult = await listReports({
    page,
    query,
    status: appliedStatus,
  });

  if (!listResult.ok) {
    return listResult;
  }

  return {
    ok: true,
    data: {
      ...listResult.data,
      applied_status: appliedStatus,
    },
  };
}

export async function getReportDetailAction(
  reportId: string,
): Promise<Result<ReportDetail>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }
  return getReportDetail(reportId);
}

export async function createReportAction(
  input: unknown,
): Promise<Result<ReportDetail>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  const { role, user } = actor.data;
  if (!canCreateOrEdit(role)) {
    return err("No permission");
  }

  const parsed = reportCreateSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const analystError = await validateAnalysts(parsed.data.analysts);
  if (analystError) {
    return err(analystError);
  }

  const sourceCheck = await validateSourceTables({
    report_type: parsed.data.report_type,
    region_code: parsed.data.region_code,
    sector_id: parsed.data.sector_id,
  });
  if (sourceCheck) {
    return err(sourceCheck);
  }

  const coverageIdResult = await resolveCoverageIdForDraft({
    report_type: parsed.data.report_type,
    ticker: parsed.data.ticker,
  });
  if (!coverageIdResult.ok) {
    return coverageIdResult;
  }

  const payload = toSavePayload({
    ...parsed.data,
    coverage_id: coverageIdResult.data,
  });

  const createResult = await createReport({
    owner_user_id: user.id,
    title: payload.title,
    report_type: payload.report_type,
    ticker: payload.ticker,
    rating: payload.rating,
    target_price: payload.target_price,
    region_code: payload.region_code,
    coverage_id: payload.coverage_id,
    sector_id: payload.sector_id,
    report_language: payload.report_language,
    contact_person_id: payload.contact_person_id,
    investment_thesis: payload.investment_thesis,
    certificate_confirmed: payload.certificate_confirmed,
    analysts: payload.analysts,
  });

  if (createResult.ok) {
    revalidatePath("/reports");
    revalidatePath("/report-review");
    revalidatePath("/reports/new");
  }

  return createResult;
}

export async function saveReportContentAction(
  input: unknown,
): Promise<Result<ReportDetail>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  const { role, user } = actor.data;
  if (!canCreateOrEdit(role)) {
    return err("No permission");
  }

  const parsed = reportSaveSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const editableResult = await assertEditable(
    role,
    user.id,
    parsed.data.report_id,
  );
  if (!editableResult.ok) {
    return editableResult;
  }

  const analystError = await validateAnalysts(parsed.data.analysts);
  if (analystError) {
    return err(analystError);
  }

  const sourceCheck = await validateSourceTables({
    report_type: parsed.data.report_type,
    region_code: parsed.data.region_code,
    sector_id: parsed.data.sector_id,
  });
  if (sourceCheck) {
    return err(sourceCheck);
  }

  const coverageIdResult = await resolveCoverageIdForDraft({
    report_type: parsed.data.report_type,
    ticker: parsed.data.ticker,
  });
  if (!coverageIdResult.ok) {
    return coverageIdResult;
  }

  const payload = toSavePayload({
    ...parsed.data,
    coverage_id: coverageIdResult.data,
  });

  const saveResult = await saveReportContent({
    report_id: parsed.data.report_id,
    changed_by: user.id,
    ...payload,
  });

  if (saveResult.ok) {
    revalidatePath("/reports");
    revalidatePath("/report-review");
    revalidatePath("/reports/new");
  }

  return saveResult;
}

export async function submitReportAction(
  input: unknown,
): Promise<Result<ReportDetail>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  const { role, user } = actor.data;
  if (!canCreateOrEdit(role)) {
    return err("No permission");
  }

  const parsed = reportSubmitSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const detailResult = await getReportDetail(parsed.data.report_id);
  if (!detailResult.ok) {
    return detailResult;
  }

  const detail = detailResult.data;
  if (detail.status !== "draft") {
    return err("Only draft reports can be submitted.");
  }

  if (role === "analyst" && detail.owner_user_id !== user.id) {
    return err("No permission");
  }

  const submitValidationError = await validateReportForSubmit(detail);
  if (submitValidationError) {
    return err(submitValidationError);
  }

  const submitResult = await changeReportStatus({
    report_id: parsed.data.report_id,
    to_status: "submitted",
    action_by: user.id,
  });

  if (submitResult.ok) {
    revalidatePath("/reports");
    revalidatePath("/report-review");
    revalidatePath("/reports/new");
  }

  return submitResult;
}

export async function directSubmitReportAction(
  input: unknown,
): Promise<Result<ReportDetail>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  const { role, user } = actor.data;
  if (!canCreateOrEdit(role)) {
    return err("No permission");
  }

  const parsed = reportDirectSubmitSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const analystError = await validateAnalysts(parsed.data.analysts);
  if (analystError) {
    return err(analystError);
  }

  const sourceCheck = await validateSourceTables({
    report_type: parsed.data.report_type,
    region_code: parsed.data.region_code,
    sector_id: parsed.data.sector_id,
  });
  if (sourceCheck) {
    return err(sourceCheck);
  }

  const coverageIdResult = await resolveCoverageIdForDraft({
    report_type: parsed.data.report_type,
    ticker: parsed.data.ticker,
  });
  if (!coverageIdResult.ok) {
    return coverageIdResult;
  }

  const payload = toSavePayload({
    ...parsed.data,
    coverage_id: coverageIdResult.data,
  });

  let reportId = parsed.data.report_id;

  if (!reportId) {
    const createResult = await createReport({
      owner_user_id: user.id,
      title: payload.title,
      report_type: payload.report_type,
      ticker: payload.ticker,
      rating: payload.rating,
      target_price: payload.target_price,
      region_code: payload.region_code,
      coverage_id: payload.coverage_id,
      sector_id: payload.sector_id,
      report_language: payload.report_language,
      contact_person_id: payload.contact_person_id,
      investment_thesis: payload.investment_thesis,
      certificate_confirmed: payload.certificate_confirmed,
      analysts: payload.analysts,
    });

    if (!createResult.ok) {
      return createResult;
    }

    reportId = createResult.data.id;
  }

  const editableResult = await assertEditable(role, user.id, reportId);
  if (!editableResult.ok) {
    return editableResult;
  }

  if (editableResult.data.status !== "draft") {
    return err("Direct submit only supports draft reports.");
  }

  const saveResult = await saveReportContent({
    report_id: reportId,
    changed_by: user.id,
    ...toSavePayload({
      ...parsed.data,
      coverage_id: coverageIdResult.data,
      fallback: editableResult.data,
    }),
  });

  if (!saveResult.ok) {
    return saveResult;
  }

  const submitValidationError = await validateReportForSubmit(saveResult.data);
  if (submitValidationError) {
    return err(`已保存为 Draft，提交失败：${submitValidationError}`);
  }

  const submitResult = await changeReportStatus({
    report_id: reportId,
    to_status: "submitted",
    action_by: user.id,
  });

  if (!submitResult.ok) {
    return err("已保存为 Draft，提交失败");
  }

  revalidatePath("/reports");
  revalidatePath("/report-review");
  revalidatePath("/reports/new");
  return submitResult;
}

export async function getReportDownloadUrlAction(
  input: unknown,
): Promise<Result<string>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  const parsed = reportDownloadSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  return getReportDownloadUrl(parsed.data);
}

export async function saveChiefApproveAction(input: {
  report_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
}): Promise<Result<{ id: string }>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  return saveChiefApprove({
    report_id: input.report_id,
    file_path: input.file_path,
    file_name: input.file_name,
    file_type: input.file_type,
  });
}
