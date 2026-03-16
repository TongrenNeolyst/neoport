import "server-only";

import { err, ok, type Result } from "@/lib/result";
import type { PaginatedList } from "@/lib/pagination";
import { createServerClient } from "@/lib/supabase/server";

export type { PaginatedList };

export type Sector = {
  id: string;
  level: 1 | 2;
  parent_id: string | null;
  name_en: string;
  name_cn: string | null;
  wind_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SectorWithChildren = Sector & {
  children: Sector[];
};

const PAGE_SIZE = 15;

/**
 * List all sectors grouped by level with children
 */
export async function listSectorsGrouped(params?: {
  level?: 1 | 2;
  is_active?: boolean;
}): Promise<Result<SectorWithChildren[]>> {
  const supabase = await createServerClient();

  let query = supabase
    .from("sector")
    .select("*")
    .order("name_en", { ascending: true });

  if (params?.level) {
    query = query.eq("level", params.level);
  }

  if (params?.is_active !== undefined) {
    query = query.eq("is_active", params.is_active);
  }

  const { data, error } = await query;

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch sectors");

  // Group: level 1 sectors with their children
  const level1Sectors = data.filter((s) => s.level === 1);
  const level2Sectors = data.filter((s) => s.level === 2);

  const result: SectorWithChildren[] = level1Sectors.map((parent) => ({
    ...parent,
    children: level2Sectors.filter((child) => child.parent_id === parent.id),
  }));

  return ok(result);
}

/**
 * List sectors with pagination and search (flat list)
 */
export async function listSectors(params: {
  page: number;
  query: string | null;
  level?: 1 | 2;
}): Promise<Result<PaginatedList<Sector>>> {
  const supabase = await createServerClient();

  let queryBuilder = supabase.from("sector").select("*", { count: "exact" });

  // Apply search filter
  if (params.query) {
    const searchTerm = `%${params.query}%`;
    queryBuilder = queryBuilder.or(
      `name_en.ilike.${searchTerm},name_cn.ilike.${searchTerm}`,
    );
  }

  // Apply level filter
  if (params.level) {
    queryBuilder = queryBuilder.eq("level", params.level);
  }

  // Apply pagination
  const from = (params.page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  queryBuilder = queryBuilder
    .order("level", { ascending: true })
    .order("name_en", { ascending: true })
    .range(from, to);

  const { data, error, count } = await queryBuilder;

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch sectors");

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
 * Get all level-1 sectors for parent selection
 */
export async function listLevel1Sectors(): Promise<Result<Sector[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("sector")
    .select("*")
    .eq("level", 1)
    .eq("is_active", true)
    .order("name_en", { ascending: true });

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch level-1 sectors");

  return ok(data);
}

/**
 * Get all active sectors for coverage form selector
 */
export async function listAllActiveSectors(): Promise<Result<Sector[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("sector")
    .select("*")
    .eq("is_active", true)
    .order("level", { ascending: true })
    .order("name_en", { ascending: true });

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch sectors");

  return ok(data);
}

/**
 * Get a single sector by ID
 */
export async function getSector(id: string): Promise<Result<Sector>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("sector")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return err(error.message);
  if (!data) return err("Sector not found");

  return ok(data);
}

/**
 * Create a new sector
 */
export async function createSector(params: {
  level: 1 | 2;
  name_en: string;
  name_cn?: string | null;
  wind_name?: string | null;
  parent_id?: string | null;
}): Promise<Result<Sector>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("sector")
    .insert({
      level: params.level,
      name_en: params.name_en,
      name_cn: params.name_cn ?? null,
      wind_name: params.wind_name ?? null,
      parent_id: params.level === 1 ? null : params.parent_id,
    })
    .select()
    .single();

  if (error) {
    // Handle unique constraint violations
    if (error.code === "23505") {
      return err("Sector name already exists");
    }
    // Handle hierarchy constraint violations
    if (error.message.includes("level 1 sector cannot have parent")) {
      return err("Level 1 sector cannot have a parent");
    }
    if (error.message.includes("level 2 sector parent must be level 1")) {
      return err("Parent must be a level 1 sector");
    }
    return err(error.message);
  }

  if (!data) return err("Failed to create sector");

  return ok(data);
}

/**
 * Update an existing sector
 */
export async function updateSector(
  id: string,
  params: {
    name_en?: string;
    name_cn?: string | null;
    wind_name?: string | null;
    is_active?: boolean;
    parent_id?: string | null;
  },
): Promise<Result<Sector>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("sector")
    .update(params)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return err("Sector name already exists");
    }
    if (error.message.includes("level 1 sector cannot have parent")) {
      return err("Level 1 sector cannot have a parent");
    }
    if (error.message.includes("level 2 sector parent must be level 1")) {
      return err("Parent must be a level 1 sector");
    }
    return err(error.message);
  }

  if (!data) return err("Failed to update sector");

  return ok(data);
}

/**
 * Delete a sector
 */
export async function deleteSector(id: string): Promise<Result<null>> {
  const supabase = await createServerClient();

  const { error } = await supabase.from("sector").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return err("Cannot delete sector: it is referenced by coverage records");
    }
    return err(error.message);
  }

  return ok(null);
}
