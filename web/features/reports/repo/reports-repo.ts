import "server-only";

import type {
  ReportAnalystInput,
  ReportFileLabel,
  ReportLanguage,
  ReportStatus,
  ReportType,
} from "@/domain/schemas/report";
import { err, ok, type Result } from "@/lib/result";
import type { PaginatedList } from "@/lib/pagination";
import { createServerClient } from "@/lib/supabase/server";
import {
  buildReportStoragePath as buildReportStoragePathValue,
  getFileExtension as getFileExtensionValue,
  validateUploadExtension as validateUploadExtensionValue,
  toUtcTimestamp as toUtcTimestampValue,
} from "@/features/reports/file-utils";

const PAGE_SIZE = 15;

export type ReportAnalyst = {
  id: string;
  report_id: string;
  analyst_id: string;
  role: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  analyst?: {
    id: string;
    full_name: string;
    chinese_name: string | null;
    email: string;
  };
};

export type ReportVersion = {
  id: string;
  report_id: string;
  version_no: number;
  snapshot_json: Record<string, unknown>;
  word_file_path: string | null;
  word_file_name: string | null;
  model_file_path: string | null;
  model_file_name: string | null;
  changed_by: string;
  changed_by_name?: string | null;
  changed_at: string;
  created_at: string;
};

export type ReportStatusLog = {
  id: string;
  report_id: string;
  from_status: ReportStatus;
  to_status: ReportStatus;
  action_by: string;
  action_by_name: string | null;
  action_at: string;
  reason: string | null;
  version_no: number;
  created_at: string;
  word_file_path: string | null;
  word_file_name: string | null;
  model_file_path: string | null;
  model_file_name: string | null;
};

export type ReportSummary = {
  id: string;
  owner_user_id: string;
  owner_name: string | null;
  title: string;
  report_type: ReportType;
  ticker: string | null;
  rating: string | null;
  target_price: string | null;
  region_code: string | null;
  report_language: ReportLanguage | null;
  contact_person_id: string | null;
  contact_person_name: string | null;
  investment_thesis: string | null;
  certificate_confirmed: boolean;
  status: ReportStatus;
  current_version_no: number;
  coverage_id: string | null;
  sector_id: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  analysts: ReportAnalyst[];
};

export type ReportDetail = ReportSummary & {
  coverage?: {
    id: string;
    ticker: string;
    english_full_name: string;
  } | null;
  region?: {
    id: string;
    name_en: string;
    name_cn: string;
    code: string;
    is_active: boolean;
  } | null;
  sector?: {
    id: string;
    name_en: string;
    name_cn: string | null;
  } | null;
  chief_approve: ChiefApprove | null;
  versions: ReportVersion[];
  latest_version: ReportVersion | null;
  status_logs: ReportStatusLog[];
};

export type CoverageMatch = {
  id: string;
  ticker: string;
  analyst_ids: string[];
};

export type ChiefApprove = {
  id: string;
  report_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
  created_at: string;
};

export type CreateReportParams = {
  owner_user_id: string;
  title: string;
  report_type: ReportType;
  ticker?: string | null;
  rating?: string | null;
  target_price?: string | null;
  region_code?: string | null;
  coverage_id?: string | null;
  sector_id?: string | null;
  report_language?: ReportLanguage | null;
  contact_person_id?: string | null;
  investment_thesis?: string | null;
  certificate_confirmed?: boolean;
  analysts: ReportAnalystInput[];
};

export type SaveReportContentParams = {
  report_id: string;
  title: string;
  report_type: ReportType;
  ticker?: string | null;
  rating?: string | null;
  target_price?: string | null;
  region_code?: string | null;
  coverage_id?: string | null;
  sector_id?: string | null;
  report_language?: ReportLanguage | null;
  contact_person_id?: string | null;
  investment_thesis?: string | null;
  certificate_confirmed?: boolean;
  analysts: ReportAnalystInput[];
  changed_by: string;
  word_file_path?: string | null;
  word_file_name?: string | null;
  model_file_path?: string | null;
  model_file_name?: string | null;
};

export type ListReportsParams = {
  page: number;
  query: string | null;
  status: "all" | ReportStatus | null;
};

type AnalystRelation = NonNullable<ReportAnalyst["analyst"]>;

type ReportAnalystRow = {
  id: string;
  report_id: string;
  analyst_id: string;
  role: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  analyst?: AnalystRelation | AnalystRelation[] | null;
};

type ReportSummaryRow = Omit<ReportSummary, "analysts"> & {
  analysts?: ReportAnalystRow[] | null;
};

function firstRelation<T>(value: unknown): T | null {
  if (Array.isArray(value)) {
    return (value[0] as T | undefined) ?? null;
  }
  return (value as T | null) ?? null;
}

function normalizeReportAnalystRow(row: ReportAnalystRow): ReportAnalyst {
  return {
    id: row.id,
    report_id: row.report_id,
    analyst_id: row.analyst_id,
    role: row.role,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    analyst: firstRelation<ReportAnalyst["analyst"]>(row.analyst) ?? undefined,
  };
}

function normalizeReportSummaryRow(row: ReportSummaryRow): ReportSummary {
  // owner_name is pre-fetched via RPC in listReports
  const ownerName = (row as unknown as { owner_name?: string | null }).owner_name ?? null;

  return {
    id: row.id,
    owner_user_id: row.owner_user_id,
    owner_name: ownerName,
    title: row.title,
    report_type: row.report_type,
    ticker: row.ticker,
    rating: row.rating,
    target_price: row.target_price,
    region_code: row.region_code,
    report_language: row.report_language,
    contact_person_id: row.contact_person_id,
    contact_person_name: (row as unknown as { contact_person_name?: string | null }).contact_person_name ?? null,
    investment_thesis: row.investment_thesis,
    certificate_confirmed: row.certificate_confirmed,
    status: row.status,
    current_version_no: row.current_version_no,
    coverage_id: row.coverage_id,
    sector_id: row.sector_id,
    published_by: row.published_by,
    published_at: row.published_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    analysts: Array.isArray(row.analysts)
      ? row.analysts.map((item) => normalizeReportAnalystRow(item))
      : [],
  };
}

export const toUtcTimestamp = toUtcTimestampValue;
export const getFileExtension = getFileExtensionValue;

export function validateUploadExtension(
  label: ReportFileLabel,
  fileName: string,
): Result<string> {
  const result = validateUploadExtensionValue(label, fileName);
  if (!result.ok) {
    return err(result.error);
  }
  return ok(result.extension);
}

export function buildReportStoragePath(params: {
  reportId: string;
  versionNo: number;
  label: ReportFileLabel;
  extension: string;
  ts?: Date;
}): string {
  return buildReportStoragePathValue(params);
}

export async function getChiefApproveByReportId(reportId: string): Promise<Result<ChiefApprove | null>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("chief_approve")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned - this is ok, means no chief approval yet
      return ok(null);
    }
    return err(error.message);
  }

  return ok(data as ChiefApprove);
}

export async function saveChiefApprove(params: {
  report_id: string;
  file_path: string;
  file_name: string;
  file_type: string;
}): Promise<Result<ChiefApprove>> {
  const supabase = await createServerClient();

  // Delete existing chief_approve for this report first
  await supabase.from("chief_approve").delete().eq("report_id", params.report_id);

  const { data, error } = await supabase
    .from("chief_approve")
    .insert({
      report_id: params.report_id,
      file_path: params.file_path,
      file_name: params.file_name,
      file_type: params.file_type,
    })
    .select()
    .single();

  if (error) {
    return err(error.message);
  }

  return ok(data as ChiefApprove);
}

export async function deleteChiefApprove(reportId: string): Promise<Result<null>> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from("chief_approve")
    .delete()
    .eq("report_id", reportId);

  if (error) {
    return err(error.message);
  }

  return ok(null);
}

export async function listReportTypeOptions(): Promise<Result<string[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("template")
    .select("report_type")
    .eq("is_active", true)
    .neq("report_type", "");

  if (error) {
    return err(error.message);
  }

  const distinct = Array.from(
    new Set(
      (data ?? [])
        .map((item) => item.report_type?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  );

  return ok(distinct);
}

export async function reportTypeExists(reportType: string): Promise<Result<boolean>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("report_type")
    .select("id")
    .eq("code", reportType)
    .eq("is_active", true)
    .limit(1);

  if (error) {
    return err(error.message);
  }

  return ok((data ?? []).length > 0);
}

export async function hasValidTemplateForReportType(
  reportType: string,
): Promise<Result<boolean>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("template")
    .select("id, file_path")
    .eq("report_type", reportType)
    .eq("is_active", true);

  if (error) {
    return err(error.message);
  }

  const valid = (data ?? []).some(
    (row) => Boolean(row.file_path && row.file_path.trim().length > 0),
  );
  return ok(valid);
}

export async function regionCodeExists(regionCode: string): Promise<Result<boolean>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("region")
    .select("code")
    .eq("code", regionCode)
    .eq("is_active", true)
    .limit(1);

  if (error) {
    return err(error.message);
  }
  return ok((data ?? []).length > 0);
}

export async function sectorExists(sectorId: string): Promise<Result<boolean>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("sector")
    .select("id")
    .eq("id", sectorId)
    .eq("is_active", true)
    .limit(1);

  if (error) {
    return err(error.message);
  }
  return ok((data ?? []).length > 0);
}

export async function findCoverageByTicker(
  ticker: string,
): Promise<Result<CoverageMatch | null>> {
  const normalizedTicker = ticker.trim().toUpperCase();
  if (!normalizedTicker) {
    return ok(null);
  }

  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("coverage")
    .select(
      `
      id,
      ticker,
      analysts:coverage_analyst (
        analyst_id
      )
    `,
    )
    .eq("is_active", true)
    .ilike("ticker", normalizedTicker)
    .limit(1)
    .maybeSingle();

  if (error) {
    return err(error.message);
  }

  if (!data) {
    return ok(null);
  }

  const analystIds = Array.isArray(data.analysts)
    ? data.analysts
        .map((item) => item.analyst_id as string | null)
        .filter((value): value is string => Boolean(value))
    : [];

  return ok({
    id: data.id,
    ticker: data.ticker,
    analyst_ids: analystIds,
  });
}

export async function listReports(
  params: ListReportsParams,
): Promise<Result<PaginatedList<ReportSummary>>> {
  const supabase = await createServerClient();

  let queryBuilder = supabase.from("report").select(
    `
      id,
      owner_user_id,
      title,
      report_type,
      ticker,
      rating,
      target_price,
      region_code,
      report_language,
      contact_person_id,
      investment_thesis,
      certificate_confirmed,
      status,
      current_version_no,
      coverage_id,
      sector_id,
      published_by,
      published_at,
      created_at,
      updated_at,
      analysts:report_analyst (
        id,
        report_id,
        analyst_id,
        role,
        sort_order,
        created_at,
        updated_at,
        analyst:analyst_id (
          id,
          full_name,
          chinese_name,
          email
        )
      )
    `,
    { count: "exact" },
  );

  if (params.query) {
    const term = `%${params.query}%`;
    queryBuilder = queryBuilder.ilike("title", term);
  }

  if (params.status && params.status !== "all") {
    queryBuilder = queryBuilder.eq("status", params.status);
  }

  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await queryBuilder
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    return err(error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Get unique owner IDs to fetch names
  const ownerIds = [...new Set((data ?? []).map((item) => item.owner_user_id).filter(Boolean))];
  // Get unique contact_person_ids to fetch names
  const contactPersonIds = [...new Set((data ?? []).map((item) => item.contact_person_id).filter(Boolean))];

  // Fetch owner names via RPC
  const ownerNamesMap: Record<string, string> = {};
  for (const ownerId of ownerIds) {
    const { data: ownerName } = await supabase.rpc("get_user_full_name", { p_user_id: ownerId });
    if (ownerName) {
      ownerNamesMap[ownerId] = ownerName;
    }
  }

  // Fetch contact_person names via RPC
  const contactPersonNamesMap: Record<string, string> = {};
  for (const contactPersonId of contactPersonIds) {
    const { data: contactPersonName } = await supabase.rpc("get_user_full_name", { p_user_id: contactPersonId });
    if (contactPersonName) {
      contactPersonNamesMap[contactPersonId] = contactPersonName;
    }
  }

  // Process each row to add owner name and contact_person name
  const items = (data ?? []).map((item) => {
    const ownerName = ownerNamesMap[item.owner_user_id] ?? null;
    const contactPersonName = item.contact_person_id ? (contactPersonNamesMap[item.contact_person_id] ?? null) : null;
    return normalizeReportSummaryRow({
      ...item,
      owner_name: ownerName,
      contact_person_name: contactPersonName,
    } as ReportSummaryRow);
  });

  return ok({
    items,
    total,
    page: params.page,
    totalPages,
  });
}

export async function getReportDetail(
  reportId: string,
): Promise<Result<ReportDetail>> {
  const supabase = await createServerClient();

  const { data: reportData, error: reportError } = await supabase
    .from("report")
    .select(
      `
      id,
      owner_user_id,
      title,
      report_type,
      ticker,
      rating,
      target_price,
      region_code,
      report_language,
      contact_person_id,
      investment_thesis,
      certificate_confirmed,
      status,
      current_version_no,
      coverage_id,
      sector_id,
      published_by,
      published_at,
      created_at,
      updated_at,
      coverage:coverage_id (
        id,
        ticker,
        english_full_name
      ),
      region:region_code (
        id,
        name_en,
        name_cn,
        code
      ),
      sector:sector_id (
        id,
        name_en,
        name_cn
      ),
      analysts:report_analyst (
        id,
        report_id,
        analyst_id,
        role,
        sort_order,
        created_at,
        updated_at,
        analyst:analyst_id (
          id,
          full_name,
          chinese_name,
          email
        )
      )
    `,
    )
    .eq("id", reportId)
    .single();

  if (reportError || !reportData) {
    console.error("getReportDetail: report query failed", { reportId, reportError });
    return err(reportError?.message ?? "Report not found or no permission.");
  }

  const { data: versions, error: versionError } = await supabase
    .from("report_version")
    .select("*")
    .eq("report_id", reportId)
    .order("version_no", { ascending: false });

  if (versionError) {
    return err(versionError.message);
  }

  const { data: logs, error: logError } = await supabase
    .from("report_status_log")
    .select("*")
    .eq("report_id", reportId)
    .order("action_at", { ascending: false });

  if (logError) {
    return err(logError.message);
  }

  // Get chief_approve data
  const chiefApproveResult = await getChiefApproveByReportId(reportId);
  if (!chiefApproveResult.ok) {
    return err(chiefApproveResult.error);
  }

  // Get unique user IDs from versions and status_logs
  const allUserIds = [
    ...(versions ?? []).map((v) => v.changed_by).filter(Boolean),
    ...(logs ?? []).map((l) => l.action_by).filter(Boolean),
  ];
  const uniqueUserIds = [...new Set(allUserIds)];

  // Fetch user names from auth.users
  let userNamesMap: Record<string, string> = {};
  if (uniqueUserIds.length > 0) {
    for (const userId of uniqueUserIds) {
      const { data: userData } = await supabase.rpc("get_user_full_name", { p_user_id: userId });
      if (userData) {
        userNamesMap[userId] = userData;
      }
    }
  }

  // Fetch contact_person name
  let contactPersonName: string | null = null;
  if (reportData.contact_person_id) {
    const { data: contactPersonData } = await supabase.rpc("get_user_full_name", { p_user_id: reportData.contact_person_id });
    contactPersonName = contactPersonData ?? null;
  }

  // Fetch owner name
  let ownerName: string | null = null;
  if (reportData.owner_user_id) {
    const { data: ownerNameData } = await supabase.rpc("get_user_full_name", { p_user_id: reportData.owner_user_id });
    ownerName = ownerNameData ?? null;
  }

  // Create version map for attachments
  const versionMap = (versions ?? []).reduce((acc, v) => {
    acc[v.version_no] = v;
    return acc;
  }, {} as Record<number, Record<string, unknown>>);

  // Process versions to add changed_by_name
  const processedVersions = (versions ?? []).map((v: Record<string, unknown>) => ({
    ...v,
    changed_by_name: userNamesMap[v.changed_by as string] ?? null,
  }));

  // Process status_logs to add action_by_name and attachments
  const processedLogs = (logs ?? []).map((l: Record<string, unknown>) => {
    const version = versionMap[l.version_no as number];
    return {
      ...l,
      action_by_name: userNamesMap[l.action_by as string] ?? null,
      word_file_path: version?.word_file_path ?? null,
      word_file_name: version?.word_file_name ?? null,
      model_file_path: version?.model_file_path ?? null,
      model_file_name: version?.model_file_name ?? null,
    };
  });

  const summary = normalizeReportSummaryRow({
    ...reportData,
    owner_name: ownerName,
    contact_person_name: contactPersonName,
  } as ReportSummaryRow);
  const detail: ReportDetail = {
    ...summary,
    coverage:
      firstRelation<ReportDetail["coverage"]>(reportData.coverage) ?? null,
    region: firstRelation<ReportDetail["region"]>(reportData.region) ?? null,
    sector: firstRelation<ReportDetail["sector"]>(reportData.sector) ?? null,
    chief_approve: chiefApproveResult.data,
    versions: processedVersions as ReportVersion[],
    latest_version: (processedVersions[0] as ReportVersion | undefined) ?? null,
    status_logs: processedLogs as ReportStatusLog[],
  };

  return ok(detail);
}

export async function createReport(
  params: CreateReportParams,
): Promise<Result<ReportDetail>> {
  const supabase = await createServerClient();

  const { data: reportData, error: reportError } = await supabase
    .from("report")
    .insert({
      owner_user_id: params.owner_user_id,
      title: params.title,
      report_type: params.report_type,
      ticker: params.ticker?.trim() || null,
      rating: params.rating?.trim() || null,
      target_price: params.target_price?.trim() || null,
      region_code: params.region_code ?? null,
      coverage_id: params.coverage_id ?? null,
      sector_id: params.sector_id ?? null,
      report_language: params.report_language ?? null,
      contact_person_id: params.contact_person_id ?? null,
      investment_thesis: params.investment_thesis?.trim() || null,
      certificate_confirmed: Boolean(params.certificate_confirmed),
      status: "draft",
      current_version_no: 0,
    })
    .select("id")
    .single();

  if (reportError || !reportData) {
    return err(reportError?.message ?? "Failed to create report.");
  }

  if (params.analysts.length > 0) {
    const { error: analystError } = await supabase
      .from("report_analyst")
      .insert(
        params.analysts.map((item) => ({
          report_id: reportData.id,
          analyst_id: item.analyst_id,
          role: item.role,
          sort_order: item.sort_order,
        })),
      );

    if (analystError) {
      return err(analystError.message);
    }
  }

  return getReportDetail(reportData.id);
}

export async function replaceReportAnalysts(
  reportId: string,
  analysts: ReportAnalystInput[],
): Promise<Result<null>> {
  const supabase = await createServerClient();

  const { error: deleteError } = await supabase
    .from("report_analyst")
    .delete()
    .eq("report_id", reportId);

  if (deleteError) {
    return err(deleteError.message);
  }

  if (analysts.length > 0) {
    const { error: insertError } = await supabase.from("report_analyst").insert(
      analysts.map((item) => ({
        report_id: reportId,
        analyst_id: item.analyst_id,
        role: item.role,
        sort_order: item.sort_order,
      })),
    );

    if (insertError) {
      return err(insertError.message);
    }
  }

  return ok(null);
}

export async function saveReportContent(
  params: SaveReportContentParams,
): Promise<Result<ReportDetail>> {
  const supabase = await createServerClient();

  const { error } = await supabase.rpc("report_save_content_atomic", {
    p_report_id: params.report_id,
    p_title: params.title,
    p_report_type: params.report_type,
    p_ticker: params.ticker ?? null,
    p_rating: params.rating ?? null,
    p_target_price: params.target_price ?? null,
    p_region_code: params.region_code ?? null,
    p_sector_id: params.sector_id ?? null,
    p_report_language: params.report_language ?? null,
    p_contact_person_id: params.contact_person_id ?? null,
    p_investment_thesis: params.investment_thesis ?? null,
    p_certificate_confirmed: Boolean(params.certificate_confirmed),
    p_coverage_id: params.coverage_id ?? null,
    p_analysts: params.analysts,
    p_changed_by: params.changed_by,
    p_word_file_path: params.word_file_path ?? null,
    p_model_file_path: params.model_file_path ?? null,
    p_word_file_name: params.word_file_name ?? null,
    p_model_file_name: params.model_file_name ?? null,
  });

  if (error) {
    return err(error.message);
  }

  return getReportDetail(params.report_id);
}

export async function changeReportStatus(params: {
  report_id: string;
  to_status: ReportStatus;
  action_by: string;
  reason?: string | null;
}): Promise<Result<ReportDetail>> {
  const supabase = await createServerClient();

  const { error } = await supabase.rpc("report_change_status_atomic", {
    p_report_id: params.report_id,
    p_to_status: params.to_status,
    p_action_by: params.action_by,
    p_reason: params.reason?.trim() || null,
  });

  if (error) {
    return err(error.message);
  }

  return getReportDetail(params.report_id);
}

export async function getReportDownloadUrl(params: {
  report_id: string;
  file_path: string;
}): Promise<Result<string>> {
  const supabase = await createServerClient();

  const { data: reportVersionByWord } = await supabase
    .from("report_version")
    .select("id")
    .eq("report_id", params.report_id)
    .eq("word_file_path", params.file_path)
    .maybeSingle();

  const { data: reportVersionByModel } = reportVersionByWord
    ? { data: null }
    : await supabase
        .from("report_version")
        .select("id")
        .eq("report_id", params.report_id)
        .eq("model_file_path", params.file_path)
        .maybeSingle();

  if (!reportVersionByWord && !reportVersionByModel) {
    return err("No permission to download this file.");
  }

  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(params.file_path, 60 * 5);

  if (error || !data?.signedUrl) {
    return err(error?.message ?? "Failed to create download URL.");
  }

  return ok(data.signedUrl);
}
