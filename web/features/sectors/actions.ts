"use server";

import { revalidatePath } from "next/cache";

import { sectorSchema, sectorUpdateSchema } from "@/domain/schemas/sector";
import { err, ok, type Result } from "@/lib/result";
import { requireAdmin } from "@/lib/supabase/server";

import {
  createSector as createSectorRepo,
  deleteSector as deleteSectorRepo,
  getSector as getSectorRepo,
  listLevel1Sectors,
  listSectors as listSectorsRepo,
  listSectorsGrouped as listSectorsGroupedRepo,
  type PaginatedList,
  type Sector,
  type SectorWithChildren,
  updateSector as updateSectorRepo,
} from "./repo/sectors-repo";

async function requireAdminOrThrow() {
  await requireAdmin();
}

/**
 * List sectors with pagination and search
 */
export async function listSectorsAction(input: {
  page?: number;
  query?: string | null;
  level?: 1 | 2;
}): Promise<Result<PaginatedList<Sector>>> {
  await requireAdminOrThrow();

  const page = Math.max(1, input.page ?? 1);
  const query = input.query ?? null;

  try {
    return await listSectorsRepo({ page, query, level: input.level });
  } catch {
    return err("Failed to list sectors.");
  }
}

/**
 * List all sectors grouped by level (with children)
 */
export async function listSectorsGroupedAction(params?: {
  level?: 1 | 2;
  is_active?: boolean;
}): Promise<Result<SectorWithChildren[]>> {
  await requireAdminOrThrow();

  try {
    return await listSectorsGroupedRepo(params);
  } catch {
    return err("Failed to list sectors.");
  }
}

/**
 * List level-1 sectors (for parent selection dropdown)
 */
export async function listLevel1SectorsAction(): Promise<Result<Sector[]>> {
  await requireAdminOrThrow();

  try {
    return await listLevel1Sectors();
  } catch {
    return err("Failed to list level-1 sectors.");
  }
}

/**
 * Get a single sector
 */
export async function getSectorAction(id: string): Promise<Result<Sector>> {
  await requireAdminOrThrow();

  try {
    return await getSectorRepo(id);
  } catch {
    return err("Failed to get sector.");
  }
}

/**
 * Create a new sector
 */
export async function createSectorAction(
  input: unknown,
): Promise<Result<Sector>> {
  await requireAdminOrThrow();

  const parsed = sectorSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await createSectorRepo(parsed.data);
  if (result.ok) {
    revalidatePath("/sectors");
  }
  return result;
}

/**
 * Update an existing sector
 */
export async function updateSectorAction(
  id: string,
  input: unknown,
): Promise<Result<Sector>> {
  await requireAdminOrThrow();

  const parsed = sectorUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await updateSectorRepo(id, parsed.data);
  if (result.ok) {
    revalidatePath("/sectors");
  }
  return result;
}

/**
 * Delete a sector
 */
export async function deleteSectorAction(id: string): Promise<Result<null>> {
  await requireAdminOrThrow();

  const result = await deleteSectorRepo(id);
  if (!result.ok) {
    return result;
  }
  revalidatePath("/sectors");
  return ok(null);
}
