import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { err, ok, type Result } from "@/lib/result";
import type { PaginatedList } from "@/lib/pagination";

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

export type CreateReportParams = {
  external_id: string;
  title: string;
  report_type: string;
  ticker?: string | null;
  ticker_name?: string | null;
  rating?: string | null;
  target_price?: number | null;
  sector?: string | null;
  region?: string | null;
  report_language?: string | null;
  investment_thesis?: string | null;
  analyst?: string | null;
  contact_person?: string | null;
  published_at: string;
};

export type CreateAttachmentParams = {
  report_id: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
};

export type AddAnalystEmailParams = {
  report_id: string;
  analyst_email: string;
};

export type AddContactEmailParams = {
  report_id: string;
  contact_email: string;
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

export async function listExternalReports(
  params: ListExternalReportsParams,
): Promise<Result<PaginatedList<ExternalReport>>> {
  const supabase = createAdminClient();

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

  const { data, error, count } = await queryBuilder.range(from, to);

  if (error) {
    console.error("listExternalReports: query failed", { error });
    return err(error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return ok({
    items: (data ?? []) as ExternalReport[],
    total,
    page,
    totalPages,
  });
}

export async function getExternalReportDetail(
  reportId: string,
): Promise<Result<ExternalReportDetail>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", reportId)
    .single();

  if (error || !data) {
    return err(error?.message ?? "Report not found.");
  }

  const [attachments, analystRows, contactRows] = await Promise.all([
    supabase
      .from("report_attachments")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at"),
    supabase
      .from("report_analyst")
      .select("analyst_email")
      .eq("report_id", reportId),
    supabase
      .from("report_contact")
      .select("contact_email")
      .eq("report_id", reportId),
  ]);

  return ok({
    ...(data as ExternalReport),
    attachments: (attachments.data ?? []) as ExternalReportAttachment[],
    analyst_emails: (analystRows.data ?? []).map(
      (r: { analyst_email: string }) => r.analyst_email,
    ),
    contact_emails: (contactRows.data ?? []).map(
      (r: { contact_email: string }) => r.contact_email,
    ),
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

export async function findReportByExternalId(externalId: string): Promise<Result<ExternalReport | null>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) {
    return err(error.message);
  }

  return ok(data as ExternalReport | null);
}

export async function createReport(params: CreateReportParams): Promise<Result<ExternalReport>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("reports")
    .insert({
      external_id: params.external_id,
      title: params.title,
      report_type: params.report_type,
      ticker: params.ticker ?? null,
      ticker_name: params.ticker_name ?? null,
      rating: params.rating ?? null,
      target_price: params.target_price ?? null,
      sector: params.sector ?? null,
      region: params.region ?? null,
      report_language: params.report_language ?? null,
      investment_thesis: params.investment_thesis ?? null,
      analyst: params.analyst ?? null,
      contact_person: params.contact_person ?? null,
      published_at: params.published_at,
    })
    .select()
    .single();

  if (error) {
    return err(error.message);
  }

  return ok(data as ExternalReport);
}

export async function createAttachment(params: CreateAttachmentParams): Promise<Result<ExternalReportAttachment>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("report_attachments")
    .insert({
      report_id: params.report_id,
      original_name: params.original_name,
      file_path: params.file_path,
      file_size: params.file_size,
      mime_type: params.mime_type,
    })
    .select()
    .single();

  if (error) {
    return err(error.message);
  }

  return ok(data as ExternalReportAttachment);
}

export async function addAnalystEmail(params: AddAnalystEmailParams): Promise<Result<void>> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("report_analyst").upsert(
    {
      report_id: params.report_id,
      analyst_email: params.analyst_email,
    },
    { onConflict: "report_id,analyst_email", ignoreDuplicates: true },
  );

  if (error) {
    return err(error.message);
  }

  return ok(undefined);
}

export async function addContactEmail(params: AddContactEmailParams): Promise<Result<void>> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("report_contact").upsert(
    {
      report_id: params.report_id,
      contact_email: params.contact_email,
    },
    { onConflict: "report_id,contact_email", ignoreDuplicates: true },
  );

  if (error) {
    return err(error.message);
  }

  return ok(undefined);
}
