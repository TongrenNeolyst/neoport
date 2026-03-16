import "server-only";

import { err, ok, type Result } from "@/lib/result";
import type { PaginatedList } from "@/lib/pagination";
import { createServerClient } from "@/lib/supabase/server";

export type { PaginatedList };

export type Coverage = {
  id: string;
  ticker: string;
  english_full_name: string;
  chinese_short_name: string | null;
  traditional_chinese: string | null;
  sector_id: string;
  isin: string;
  country_of_domicile: string;
  reporting_currency: string | null;
  ads_conversion_factor: number | null;
  is_duplicate: boolean;
  approved_by: string | null;
  approved_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CoverageAnalyst = {
  id: string;
  coverage_id: string;
  analyst_id: string;
  role: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined data
  analyst?: {
    id: string;
    full_name: string;
    chinese_name: string | null;
    email: string;
  };
};

export type CoverageWithDetails = Coverage & {
  sector?: {
    id: string;
    name_en: string;
    name_cn: string | null;
    level: number;
  };
  analysts: CoverageAnalyst[];
};

export type CoverageAnalystInput = {
  analyst_id: string;
  role: number;
  sort_order: number;
};

const PAGE_SIZE = 15;

/**
 * List coverages with pagination, search, and sector filter
 */
export async function listCoverages(params: {
  page: number;
  query: string | null;
  sector_id?: string | null;
}): Promise<Result<PaginatedList<CoverageWithDetails>>> {
  const supabase = await createServerClient();

  let queryBuilder = supabase.from("coverage").select(
    `
      *,
      sector:sector_id (
        id,
        name_en,
        name_cn,
        level
      ),
      analysts:coverage_analyst (
        id,
        coverage_id,
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

  // Apply search filter
  if (params.query) {
    const searchTerm = `%${params.query}%`;
    queryBuilder = queryBuilder.or(
      `ticker.ilike.${searchTerm},english_full_name.ilike.${searchTerm},chinese_short_name.ilike.${searchTerm}`,
    );
  }

  // Apply sector filter
  if (params.sector_id) {
    queryBuilder = queryBuilder.eq("sector_id", params.sector_id);
  }

  // Apply pagination
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  queryBuilder = queryBuilder
    .order("updated_at", { ascending: false })
    .range(from, to);

  const { data, error, count } = await queryBuilder;

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch coverages");

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return ok({
    items: data as CoverageWithDetails[],
    total,
    page: params.page,
    totalPages,
  });
}

/**
 * Get a single coverage by ID with details
 */
export async function getCoverage(
  id: string,
): Promise<Result<CoverageWithDetails>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("coverage")
    .select(
      `
      *,
      sector:sector_id (
        id,
        name_en,
        name_cn,
        level
      ),
      analysts:coverage_analyst (
        id,
        coverage_id,
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
    .eq("id", id)
    .single();

  if (error) return err(error.message);
  if (!data) return err("Coverage not found");

  return ok(data as CoverageWithDetails);
}

/**
 * Create a new coverage with analysts
 */
export async function createCoverage(params: {
  ticker: string;
  country_of_domicile: string;
  english_full_name: string;
  chinese_short_name?: string | null;
  traditional_chinese?: string | null;
  sector_id: string;
  isin: string;
  reporting_currency?: string | null;
  ads_conversion_factor?: number | null;
  analysts: CoverageAnalystInput[];
}): Promise<Result<CoverageWithDetails>> {
  const supabase = await createServerClient();

  // Validate analysts count
  if (params.analysts.length < 1 || params.analysts.length > 4) {
    return err("Coverage must have 1-4 analysts");
  }

  // Start transaction by creating coverage first
  const { data: coverage, error: coverageError } = await supabase
    .from("coverage")
    .insert({
      ticker: params.ticker,
      country_of_domicile: params.country_of_domicile,
      english_full_name: params.english_full_name,
      chinese_short_name: params.chinese_short_name ?? null,
      traditional_chinese: params.traditional_chinese ?? null,
      sector_id: params.sector_id,
      isin: params.isin,
      reporting_currency: params.reporting_currency ?? null,
      ads_conversion_factor: params.ads_conversion_factor ?? null,
    })
    .select()
    .single();

  if (coverageError) {
    if (coverageError.code === "23505") {
      if (coverageError.message.includes("ticker")) {
        return err("Ticker already exists");
      }
      if (coverageError.message.includes("isin")) {
        return err("ISIN already exists");
      }
    }
    return err(coverageError.message);
  }

  if (!coverage) return err("Failed to create coverage");

  // Create coverage_analyst relations
  const analystRecords = params.analysts.map((a) => ({
    coverage_id: coverage.id,
    analyst_id: a.analyst_id,
    role: a.role,
    sort_order: a.sort_order,
  }));

  const { error: analystsError } = await supabase
    .from("coverage_analyst")
    .insert(analystRecords);

  if (analystsError) {
    // Rollback: delete the coverage we just created
    await supabase.from("coverage").delete().eq("id", coverage.id);

    if (
      analystsError.message.includes("a coverage can have at most 4 analysts")
    ) {
      return err("A coverage can have at most 4 analysts");
    }
    return err(analystsError.message);
  }

  // Fetch the complete coverage with details
  return getCoverage(coverage.id);
}

/**
 * Update an existing coverage
 */
export async function updateCoverage(
  id: string,
  params: {
    ticker?: string;
    country_of_domicile?: string;
    english_full_name?: string;
    chinese_short_name?: string | null;
    traditional_chinese?: string | null;
    sector_id?: string;
    isin?: string;
    reporting_currency?: string | null;
    ads_conversion_factor?: number | null;
    is_active?: boolean;
    analysts?: CoverageAnalystInput[];
  },
): Promise<Result<CoverageWithDetails>> {
  const supabase = await createServerClient();

  // Validate analysts count if provided
  if (params.analysts !== undefined) {
    if (params.analysts.length < 1 || params.analysts.length > 4) {
      return err("Coverage must have 1-4 analysts");
    }
  }

  // Update coverage record
  const updateData: Record<string, unknown> = {};
  if (params.ticker !== undefined) updateData.ticker = params.ticker;
  if (params.country_of_domicile !== undefined)
    updateData.country_of_domicile = params.country_of_domicile;
  if (params.english_full_name !== undefined)
    updateData.english_full_name = params.english_full_name;
  if (params.chinese_short_name !== undefined)
    updateData.chinese_short_name = params.chinese_short_name;
  if (params.traditional_chinese !== undefined)
    updateData.traditional_chinese = params.traditional_chinese;
  if (params.sector_id !== undefined) updateData.sector_id = params.sector_id;
  if (params.isin !== undefined) updateData.isin = params.isin;
  if (params.reporting_currency !== undefined)
    updateData.reporting_currency = params.reporting_currency;
  if (params.ads_conversion_factor !== undefined)
    updateData.ads_conversion_factor = params.ads_conversion_factor;
  if (params.is_active !== undefined) updateData.is_active = params.is_active;

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from("coverage")
      .update(updateData)
      .eq("id", id);

    if (updateError) {
      if (updateError.code === "23505") {
        if (updateError.message.includes("ticker")) {
          return err("Ticker already exists");
        }
        if (updateError.message.includes("isin")) {
          return err("ISIN already exists");
        }
      }
      return err(updateError.message);
    }
  }

  // Update analysts if provided
  if (params.analysts !== undefined) {
    // Delete existing analysts
    const { error: deleteError } = await supabase
      .from("coverage_analyst")
      .delete()
      .eq("coverage_id", id);

    if (deleteError) return err(deleteError.message);

    // Insert new analysts
    const analystRecords = params.analysts.map((a) => ({
      coverage_id: id,
      analyst_id: a.analyst_id,
      role: a.role,
      sort_order: a.sort_order,
    }));

    const { error: insertError } = await supabase
      .from("coverage_analyst")
      .insert(analystRecords);

    if (insertError) {
      return err(insertError.message);
    }
  }

  return getCoverage(id);
}

/**
 * Delete a coverage
 */
export async function deleteCoverage(id: string): Promise<Result<null>> {
  const supabase = await createServerClient();

  const { error } = await supabase.from("coverage").delete().eq("id", id);

  if (error) return err(error.message);

  return ok(null);
}

/**
 * Get all active coverages (for stock quote sync)
 */
export async function listActiveCoverages(): Promise<Result<Coverage[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("coverage")
    .select("*")
    .eq("is_active", true);

  if (error) {
    console.error("Error fetching active coverages:", error);
    return err(error.message);
  }

  return ok(data ?? []);
}
