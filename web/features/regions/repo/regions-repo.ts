import "server-only";

import { err, ok, type Result } from "@/lib/result";
import type { PaginatedList } from "@/lib/pagination";
import { createServerClient } from "@/lib/supabase/server";

export type { PaginatedList };

export type Region = {
  id: string;
  name_en: string;
  name_cn: string;
  code: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

const PAGE_SIZE = 15;

/**
 * List regions with pagination and search
 */
export async function listRegions(params: {
  page: number;
  query: string | null;
}): Promise<Result<PaginatedList<Region>>> {
  const supabase = await createServerClient();

  let query = supabase.from("region").select("*", { count: "exact" });

  // Apply search filter
  if (params.query) {
    const searchTerm = `%${params.query}%`;
    query = query.or(`name_en.ilike.${searchTerm},name_cn.ilike.${searchTerm},code.ilike.${searchTerm}`);
  }

  // Apply pagination
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  query = query.order("created_at", { ascending: false }).range(from, to);

  const { data, error, count } = await query;

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch regions");

  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return ok({
    items: data,
    total,
    page: params.page,
    totalPages,
  });
}

/**
 * Create a new region with unique validation
 */
export async function createRegion(params: {
  name: string;
  code: string;
}): Promise<Result<Region>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("region")
    .insert(params)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === "23505") {
      if (error.message.includes("name")) {
        return err("Region name already exists");
      }
      if (error.message.includes("code")) {
        return err("Region code already exists");
      }
    }
    return err(error.message);
  }

  if (!data) return err("Failed to create region");

  return ok(data);
}

/**
 * Update an existing region with unique validation
 */
export async function updateRegion(
  id: string,
  params: {
    name?: string;
    code?: string;
  },
): Promise<Result<Region>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("region")
    .update(params)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === "23505") {
      if (error.message.includes("name")) {
        return err("Region name already exists");
      }
      if (error.message.includes("code")) {
        return err("Region code already exists");
      }
    }
    return err(error.message);
  }

  if (!data) return err("Failed to update region");

  return ok(data);
}

/**
 * Delete a region (ON DELETE SET NULL will handle analyst references)
 */
export async function deleteRegion(id: string): Promise<Result<null>> {
  const supabase = await createServerClient();

  const { error } = await supabase.from("region").delete().eq("id", id);

  if (error) return err(error.message);

  return ok(null);
}

export async function listAllRegions(): Promise<Result<Region[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("region")
    .select("*")
    .eq("is_active", true)
    .order("name_en", { ascending: true });

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch regions");

  return ok(data);
}
