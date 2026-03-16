import "server-only";

import { err, ok, type Result } from "@/lib/result";
import type { PaginatedList } from "@/lib/pagination";
import { createServerClient } from "@/lib/supabase/server";

export type { PaginatedList };

export type Analyst = {
  id: string;
  full_name: string;
  chinese_name: string | null;
  email: string;
  region_code: string | null;
  region: {
    id: string;
    name_en: string;
    name_cn: string;
    code: string;
    is_active: boolean;
  } | null;
  suffix: string | null;
  sfc: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const PAGE_SIZE = 15;

/**
 * List analysts with pagination and search
 */
export async function listAnalysts(params: {
  page: number;
  query: string | null;
}): Promise<Result<PaginatedList<Analyst>>> {
  const supabase = await createServerClient();

  let query = supabase
    .from("analyst")
    .select("*, region(id, name_en, name_cn, code, is_active)", { count: "exact" });

  // Apply search filter
  if (params.query) {
    const searchTerm = `%${params.query}%`;
    query = query.or(
      `full_name.ilike.${searchTerm},chinese_name.ilike.${searchTerm},email.ilike.${searchTerm}`,
    );
  }

  // Apply pagination
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch analysts");

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return ok({
    items: data as Analyst[],
    total,
    page: params.page,
    totalPages,
  });
}

/**
 * Create a new analyst with email unique validation
 */
export async function createAnalyst(params: {
  full_name: string;
  chinese_name?: string;
  email: string;
  region_code: string;
  suffix?: string;
  sfc?: string;
}): Promise<Result<Analyst>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("analyst")
    .insert(params)
    .select("*, region(id, name_en, name_cn, code, is_active)")
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === "23505") {
      if (error.message.includes("email")) {
        return err("Email already exists");
      }
    }
    return err(error.message);
  }

  if (!data) return err("Failed to create analyst");

  return ok(data as Analyst);
}

/**
 * Update an existing analyst with email unique validation
 */
export async function updateAnalyst(
  id: string,
  params: {
    full_name?: string;
    chinese_name?: string;
    email?: string;
    region_code?: string;
    suffix?: string;
    sfc?: string;
    is_active?: boolean;
  },
): Promise<Result<Analyst>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("analyst")
    .update(params)
    .eq("id", id)
    .select("*, region(id, name_en, name_cn, code, is_active)")
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === "23505") {
      if (error.message.includes("email")) {
        return err("Email already exists");
      }
    }
    return err(error.message);
  }

  if (!data) return err("Failed to update analyst");

  return ok(data as Analyst);
}

/**
 * Delete an analyst
 */
export async function deleteAnalyst(id: string): Promise<Result<null>> {
  const supabase = await createServerClient();

  const { error } = await supabase.from("analyst").delete().eq("id", id);

  if (error) return err(error.message);

  return ok(null);
}

/**
 * Get all regions for form dropdown
 */
export async function getRegionsForSelect(): Promise<
  Result<{ id: string; name: string; code: string; name_en: string; name_cn: string }[]>
> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("region")
    .select("code, name_en, name_cn")
    .eq("is_active", true)
    .order("name_en");

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch regions");

  return ok(
    data.map((r) => ({
      id: r.code,
      name: r.name_en,
      code: r.code,
      name_en: r.name_en,
      name_cn: r.name_cn,
    }))
  );
}

/**
 * Get all active analysts for coverage form selector
 */
export async function listAllActiveAnalysts(): Promise<Result<Analyst[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("analyst")
    .select("*, region(id, name_en, name_cn, code, is_active)")
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch analysts");

  return ok(data as Analyst[]);
}
