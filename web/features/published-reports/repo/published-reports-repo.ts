import "server-only";

import { err, ok, type Result } from "@/lib/result";
import type { PaginatedList } from "@/lib/pagination";
import { createServerClient } from "@/lib/supabase/server";

export type PublishedReport = {
  id: string;
  owner_user_id: string;
  owner_name: string | null;
  title: string;
  report_type: string;
  ticker: string | null;
  rating: string | null;
  target_price: string | null;
  region_code: string | null;
  sector_id: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  investment_thesis: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysts: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  latest_version: any | null;
};

const PAGE_SIZE = 20;

export type ListPublishedReportsParams = {
  page: number;
  userId: string;
  role: "admin" | "sa" | "analyst";
};

export async function listPublishedReports(
  params: ListPublishedReportsParams,
): Promise<Result<PaginatedList<PublishedReport>>> {
  const supabase = await createServerClient();

  let queryBuilder = supabase
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
      sector_id,
      published_by,
      published_at,
      created_at,
      updated_at,
      investment_thesis,
      analysts:report_analyst (
        id,
        analyst_id,
        analyst:analyst_id (
          id,
          full_name,
          chinese_name
        )
      ),
      report_version!inner(
        id,
        version_no,
        word_file_path,
        word_file_name
      )
    `,
      { count: "exact" },
    )
    .eq("status", "published");

  // For analyst role, filter by owner or analyst
  if (params.role === "analyst") {
    queryBuilder = queryBuilder.or(
      `owner_user_id.eq.${params.userId},report_analyst.analyst_id.in.(select id from analyst where user_id = '${params.userId}')`,
    );
  }

  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, error, count } = await queryBuilder
    .order("published_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("listPublishedReports: query failed", { error });
    return err(error.message);
  }

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Process data to get unique latest version per report
  const items: PublishedReport[] = [];
  const seen = new Set<string>();

  for (const item of data ?? []) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);

    // Get the latest version (highest version_no)
    const versions = item.report_version ?? [];
    const latestVersion = Array.isArray(versions)
      ? versions.sort((a, b) => b.version_no - a.version_no)[0]
      : null;

    items.push({
      id: item.id,
      owner_user_id: item.owner_user_id,
      owner_name: null, // Will be fetched separately
      title: item.title,
      report_type: item.report_type,
      ticker: item.ticker,
      rating: item.rating,
      target_price: item.target_price,
      region_code: item.region_code,
      sector_id: item.sector_id,
      published_by: item.published_by,
      published_at: item.published_at,
      created_at: item.created_at,
      updated_at: item.updated_at,
      investment_thesis: item.investment_thesis,
      analysts: item.analysts ?? [],
      latest_version: latestVersion,
    });
  }

  // Fetch owner names
  const ownerIds = [...new Set(items.map((item) => item.owner_user_id).filter(Boolean))];
  const ownerNamesMap: Record<string, string> = {};
  for (const ownerId of ownerIds) {
    const { data: ownerName } = await supabase.rpc("get_user_full_name", { p_user_id: ownerId });
    if (ownerName) {
      ownerNamesMap[ownerId] = ownerName;
    }
  }

  // Add owner names to items
  const itemsWithOwnerNames = items.map((item) => ({
    ...item,
    owner_name: ownerNamesMap[item.owner_user_id] ?? null,
  }));

  return ok({
    items: itemsWithOwnerNames,
    total,
    page: params.page,
    totalPages,
  });
}

export type PublishedReportDetail = PublishedReport & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  coverage?: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  region?: any | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sector?: any | null;
};

export async function getPublishedReportDetail(
  reportId: string,
  userId: string,
  role: "admin" | "sa" | "analyst",
): Promise<Result<PublishedReportDetail>> {
  const supabase = await createServerClient();

  // First check if report exists and is published
  const { data: reportData, error: reportError } = await supabase
    .from("report")
    .select("id, owner_user_id")
    .eq("id", reportId)
    .eq("status", "published")
    .single();

  if (reportError || !reportData) {
    return err("Report not found or not published.");
  }

  // For analyst role, check permission
  if (role === "analyst") {
    // Check if user is owner
    if (reportData.owner_user_id !== userId) {
      // Check if user is an analyst on the report
      const { data: analystData } = await supabase
        .from("report_analyst")
        .select("id")
        .eq("report_id", reportId)
        .in("analyst_id", [
          // Need to get analyst IDs by user_id - this is a limitation
        ]);

      // For simplicity, we'll do a more permissive check for now
      // A proper implementation would need to join with analyst table
      const { data: userAnalyst } = await supabase
        .from("analyst")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (userAnalyst) {
        const { data: reportAnalyst } = await supabase
          .from("report_analyst")
          .select("id")
          .eq("report_id", reportId)
          .eq("analyst_id", userAnalyst.id)
          .maybeSingle();

        if (!reportAnalyst) {
          return err("No permission to view this report.");
        }
      } else {
        return err("No permission to view this report.");
      }
    }
  }

  // Get full report details
  const { data, error } = await supabase
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
      sector_id,
      published_by,
      published_at,
      created_at,
      updated_at,
      investment_thesis,
      analysts:report_analyst (
        id,
        analyst_id,
        analyst:analyst_id (
          id,
          full_name,
          chinese_name
        )
      ),
      coverage:coverage_id (
        ticker,
        english_full_name
      ),
      region:region_code (
        code,
        name_en,
        name_cn
      ),
      sector:sector_id (
        name_en,
        name_cn
      )
    `,
    )
    .eq("id", reportId)
    .single();

  if (error || !data) {
    return err(error?.message ?? "Failed to fetch report.");
  }

  // Get latest version with PDF file
  const { data: versionData } = await supabase
    .from("report_version")
    .select("id, version_no, pdf_file_path, pdf_file_name")
    .eq("report_id", reportId)
    .not("pdf_file_path", "is", null)
    .order("version_no", { ascending: false })
    .limit(1)
    .single();

  // Fetch owner name
  let ownerName: string | null = null;
  if (data.owner_user_id) {
    const { data: ownerNameData } = await supabase.rpc("get_user_full_name", { p_user_id: data.owner_user_id });
    ownerName = ownerNameData ?? null;
  }

  // Get analyst IDs from report
  const analystIds = (data.analysts ?? []).map((a: { analyst_id: string }) => a.analyst_id);

  return ok({
    id: data.id,
    owner_user_id: data.owner_user_id,
    owner_name: ownerName,
    title: data.title,
    report_type: data.report_type,
    ticker: data.ticker,
    rating: data.rating,
    target_price: data.target_price,
    region_code: data.region_code,
    sector_id: data.sector_id,
    published_by: data.published_by,
    published_at: data.published_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    investment_thesis: data.investment_thesis,
    analysts: data.analysts ?? [],
    latest_version: versionData,
    coverage: data.coverage ?? null,
    region: data.region ?? null,
    sector: data.sector ?? null,
  });
}

export async function getReportSignedUrl(
  reportId: string,
  filePath: string,
): Promise<Result<string>> {
  const supabase = await createServerClient();

  // Verify the file belongs to the report
  const { data: versionData } = await supabase
    .from("report_version")
    .select("id")
    .eq("report_id", reportId)
    .eq("pdf_file_path", filePath)
    .maybeSingle();

  if (!versionData) {
    return err("File not found.");
  }

  // Create signed URL for download
  const { data, error } = await supabase.storage
    .from("reports")
    .createSignedUrl(filePath, 3600, { download: null }); // null for inline

  if (error || !data?.signedUrl) {
    return err(error?.message ?? "Failed to create URL.");
  }

  return ok(data.signedUrl);
}
