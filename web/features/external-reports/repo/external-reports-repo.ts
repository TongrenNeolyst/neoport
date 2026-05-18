import "server-only";

import { createNeolystClient } from "@/lib/supabase/neolyst";
import { createAdminClient } from "@/lib/supabase/admin";
import { err, ok, type Result } from "@/lib/result";
import type { PaginatedList } from "@/lib/pagination";

/**
 * 获取本地 Supabase Client（读本地 reports 表）
 */
function createLocalClient() {
  return createAdminClient();
}

/**
 * Neolyst report 表原始类型（不含 join 字段）
 */
export type NeolystReport = {
  id: string;
  title: string;
  report_type: string;
  report_language: string | null;
  status: string;
  lead_analyst_email: string;
  analyst_emails: string[] | null;
  contact_person: string | null;
  coverage_id: string | null;
  ticker: string | null;
  sector_id: string | null;
  region_code: string | null;
  rating: string | null;
  target_price: number | null;
  investment_thesis: string | null;
  word_path: string | null;
  pdf_path: string | null;
  model_path: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ExternalReport = {
  id: string;
  external_id: string;
  title: string;
  report_type: string;
  ticker: string | null;
  ticker_name: string | null;
  rating: string | null;
  target_price: number | null;
  sector: string | null;
  region: string | null;
  report_language: string | null;
  investment_thesis: string | null;
  analyst: string | null;
  contact_person: string | null;
  published_at: string;
  created_at: string;
  updated_at: string;
};

export type ExternalReportAttachment = {
  id: string;
  report_id: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  created_at: string;
};

export type ExternalReportWithAttachments = ExternalReport & {
  attachments: ExternalReportAttachment[];
  analyst_emails: string[];
  contact_emails: string[];
};

const PAGE_SIZE = 20;

export type ListExternalReportsParams = {
  page: number;
  query?: string | null;
};

export type ExternalReportDetail = ExternalReport & {
  attachments: ExternalReportAttachment[];
  analyst_emails: string[];
  contact_emails: string[];
};

/**
 * 批量获取分析师姓名（供同步使用）
 */
export async function resolveAnalystDisplayNames(
  emails: string[],
): Promise<Map<string, string>> {
  if (emails.length === 0) return new Map();
  const supabase = createNeolystClient();
  return resolveAnalystNames(supabase, emails);
}

/**
 * 获取分析师姓名（用于列表展示）
 */
async function resolveAnalystNames(
  supabase: ReturnType<typeof createNeolystClient>,
  emails: string[],
): Promise<Map<string, string>> {
  if (emails.length === 0) return new Map();

  const { data } = await supabase
    .from("analyst")
    .select("email, chinese_name, english_name")
    .in("email", emails.map((e) => e.toLowerCase()));

  const map = new Map<string, string>();
  for (const a of data ?? []) {
    const name = a.chinese_name || a.english_name || a.email;
    map.set(a.email.toLowerCase(), name);
  }
  return map;
}


export async function listExternalReports(
  params: ListExternalReportsParams,
): Promise<Result<PaginatedList<ExternalReport>>> {
  const supabase = createLocalClient();

  // 1. 查询本地 reports 表
  let queryBuilder = supabase
    .from("reports")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false });

  if (params.query) {
    queryBuilder = queryBuilder.ilike("title", `%${params.query}%`);
  }

  const page = Math.max(1, params.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: reports, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error("listExternalReports: query failed", { error });
    return err(error.message);
  }

  if (!reports || reports.length === 0) {
    return ok({ items: [], total: 0, page, totalPages: 1 });
  }

  // 2. 组装结果
  const items: ExternalReport[] = reports.map((r) => ({
    id: r.id,
    external_id: r.external_id,
    title: r.title,
    report_type: r.report_type,
    ticker: r.ticker,
    ticker_name: r.ticker_name,
    rating: r.rating,
    target_price: r.target_price ? Number(r.target_price) : null,
    sector: r.sector,
    region: r.region,
    report_language: r.report_language,
    investment_thesis: r.investment_thesis,
    analyst: r.analyst,
    contact_person: r.contact_person,
    published_at: r.published_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return ok({ items, total, page, totalPages });
}

export async function getExternalReportDetail(
  reportId: string,
): Promise<Result<ExternalReportDetail>> {
  const supabase = createLocalClient();

  // 1. 查询报告
  const { data: report, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error || !report) {
    return err(error?.message ?? "Report not found.");
  }

  // 2. 查询分析师邮箱
  const { data: analystRows } = await supabase
    .from("report_analyst")
    .select("analyst_email")
    .eq("report_id", reportId);

  const analystEmails = (analystRows ?? []).map((a) => a.analyst_email);

  // 3. 查询联系人邮箱
  const { data: contactRows } = await supabase
    .from("report_contact")
    .select("contact_email")
    .eq("report_id", reportId);

  const contactEmails = (contactRows ?? []).map((c) => c.contact_email);

  // 4. 查询附件
  const { data: attachmentRows } = await supabase
    .from("report_attachments")
    .select("id, file_path, original_name, file_size, mime_type, created_at")
    .eq("report_id", reportId);

  const attachments: ExternalReportAttachment[] = (attachmentRows ?? []).map((a) => ({
    id: a.id,
    report_id: reportId,
    original_name: a.original_name,
    file_path: a.file_path,
    file_size: Number(a.file_size),
    mime_type: a.mime_type,
    created_at: a.created_at,
  }));

  return ok({
    id: report.id,
    external_id: report.external_id,
    title: report.title,
    report_type: report.report_type,
    ticker: report.ticker,
    ticker_name: report.ticker_name,
    rating: report.rating,
    target_price: report.target_price ? Number(report.target_price) : null,
    sector: report.sector,
    region: report.region,
    report_language: report.report_language,
    investment_thesis: report.investment_thesis,
    analyst: report.analyst,
    contact_person: report.contact_person,
    published_at: report.published_at,
    created_at: report.created_at,
    updated_at: report.updated_at,
    attachments,
    analyst_emails: analystEmails,
    contact_emails: contactEmails,
  });
}

export async function getExternalReportSignedUrl(
  filePath: string,
): Promise<Result<string>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.storage
    .from("external-reports")
    .createSignedUrl(filePath, 3600);

  if (error || !data?.signedUrl) {
    return err(error?.message ?? "Failed to create signed URL.");
  }

  return ok(data.signedUrl);
}

// ============================================================================
// 以下函数操作本地 Supabase（admin client，绕过 RLS）
// 用于将 Neolyst 的报告同步到本地 reports 表
// ============================================================================

/**
 * 从 Neolyst 读取指定时间之后已发布的报告
 */
export async function fetchNeolystPublishedReports(
  since: Date,
): Promise<Result<NeolystReport[]>> {
  const supabase = createNeolystClient();

  const { data, error } = await supabase
    .from("report")
    .select("*")
    .eq("status", "published")
    .gte("published_at", since.toISOString())
    .order("published_at", { ascending: true });

  if (error) {
    return err(error.message);
  }

  return ok((data as unknown as NeolystReport[]) ?? []);
}

/**
 * 检查本地是否已存在该 Neolyst 报告
 */
export async function findLocalReportByNeolystId(
  neolystId: string,
): Promise<Result<{ id: string } | null>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select("id")
    .eq("external_id", neolystId)
    .single();

  if (error && error.code !== "PGRST116") {
    return err(error.message);
  }

  return ok(data ? { id: data.id } : null);
}

/**
 * Upsert 本地 reports 表（主表）
 */
export async function upsertLocalReport(report: {
  neolyst_id: string;
  title: string;
  report_type: string;
  ticker: string | null;
  rating: string | null;
  target_price: number | null;
  sector: string | null;
  region: string | null;
  report_language: string | null;
  investment_thesis: string | null;
  analyst: string | null;
  contact_person: string | null;
  published_at: string;
}): Promise<Result<string>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .upsert(
      {
        external_id: report.neolyst_id,
        title: report.title,
        report_type: report.report_type,
        ticker: report.ticker,
        ticker_name: null,
        rating: report.rating,
        target_price: report.target_price,
        sector: report.sector,
        region: report.region,
        report_language: report.report_language,
        investment_thesis: report.investment_thesis,
        analyst: report.analyst,
        contact_person: report.contact_person,
        published_at: report.published_at,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "external_id" },
    )
    .select("id")
    .single();

  if (error) {
    return err(error.message);
  }

  return ok(data.id);
}

/**
 * Upsert 本地 report_analyst 表（先删后插，确保幂等）
 */
export async function upsertLocalAnalystEmail(
  localReportId: string,
  emails: string[],
): Promise<Result<void>> {
  const supabase = createAdminClient();

  // 先删除该报告的旧分析师关联
  const { error: deleteError } = await supabase
    .from("report_analyst")
    .delete()
    .eq("report_id", localReportId);

  if (deleteError) {
    return err(deleteError.message);
  }

  for (const email of emails) {
    const { error } = await supabase
      .from("report_analyst")
      .insert({ report_id: localReportId, analyst_email: email.toLowerCase() });

    if (error) {
      return err(error.message);
    }
  }

  return ok(undefined);
}

/**
 * Upsert 本地 report_contact 表（先删后插，确保幂等）
 */
export async function upsertLocalContactEmail(
  localReportId: string,
  email: string | null,
): Promise<Result<void>> {
  const supabase = createAdminClient();

  // 先删除该报告的旧联系人
  const { error: deleteError } = await supabase
    .from("report_contact")
    .delete()
    .eq("report_id", localReportId);

  if (deleteError) {
    return err(deleteError.message);
  }

  if (email) {
    const { error } = await supabase
      .from("report_contact")
      .insert({ report_id: localReportId, contact_email: email.toLowerCase() });

    if (error) {
      return err(error.message);
    }
  }

  return ok(undefined);
}

const LOCAL_BUCKET = "external-reports";

function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeTypes[ext ?? ""] ?? "application/octet-stream";
}

/**
 * Upsert 本地 report_attachments 表（先删后插，基于 file_path 去重）
 * 同时从 Neolyst 下载附件并上传到本地 external-reports bucket
 */
export async function upsertLocalAttachments(
  localReportId: string,
  attachments: Array<{
    file_path: string; // Neolyst 中的原始路径（可能含 reports/ 前缀）
    created_at: string;
  }>,
): Promise<Result<void>> {
  const admin = createAdminClient();
  const neolyst = createNeolystClient();

  // 先删除该报告的旧附件记录
  const { error: deleteError } = await admin
    .from("report_attachments")
    .delete()
    .eq("report_id", localReportId);

  if (deleteError) {
    return err(deleteError.message);
  }

  for (const att of attachments) {
    const neolystPath = att.file_path.replace(/^reports\//, "");
    const fileName = neolystPath.split("/").pop() ?? neolystPath;
    const mimeType = getMimeType(fileName);

    // 从 Neolyst 下载
    const { data: blob, error: dlErr } = await neolyst.storage
      .from("reports")
      .download(neolystPath);

    if (dlErr || !blob) {
      console.warn(`[repo] Failed to download from Neolyst ${neolystPath}: ${dlErr?.message ?? "unknown"}`);
      continue;
    }

    const content = Buffer.from(await blob.arrayBuffer());

    // 上传到本地 Storage（幂等 upsert）
    const { error: upErr } = await admin.storage
      .from(LOCAL_BUCKET)
      .upload(neolystPath, content, {
        contentType: mimeType,
        upsert: true,
      });

    if (upErr) {
      console.warn(`[repo] Failed to upload to local ${neolystPath}: ${upErr.message}`);
      continue;
    }

    const { error } = await admin
      .from("report_attachments")
      .insert({
        report_id: localReportId,
        file_path: neolystPath,
        original_name: fileName,
        file_size: content.length,
        mime_type: mimeType,
        created_at: att.created_at,
      });

    if (error) {
      return err(error.message);
    }
  }

  return ok(undefined);
}

/**
 * 将报告加入本地分发队列
 */
export async function addToLocalDistributionQueue(
  localReportId: string,
): Promise<Result<void>> {
  const supabase = createAdminClient();

  const { error } = await supabase.rpc("add_to_distribution_queue", {
    p_report_id: localReportId,
  });

  if (error) {
    return err(error.message);
  }

  return ok(undefined);
}
