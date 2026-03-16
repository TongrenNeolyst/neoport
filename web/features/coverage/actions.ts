"use server";

import { revalidatePath } from "next/cache";

import { coverageSchema, coverageUpdateSchema } from "@/domain/schemas/coverage";
import { err, ok, type Result } from "@/lib/result";
import { requireAdmin, requireAdminOrAnalyst } from "@/lib/supabase/server";
import { listAllActiveAnalysts } from "@/features/analyst-info/repo/analysts-repo";
import { listAllActiveSectors } from "@/features/sectors/repo/sectors-repo";

import {
  createCoverage as createCoverageRepo,
  deleteCoverage as deleteCoverageRepo,
  getCoverage as getCoverageRepo,
  listCoverages as listCoveragesRepo,
  type CoverageWithDetails,
  type PaginatedList,
  updateCoverage as updateCoverageRepo,
} from "./repo/coverage-repo";

async function validateCoverageSelectOptions(input: {
  sector_id?: string;
  analysts?: { analyst_id: string }[];
}): Promise<string | null> {
  if (!input.sector_id && !input.analysts) {
    return null;
  }

  const [sectorsResult, analystsResult] = await Promise.all([
    input.sector_id ? listAllActiveSectors() : Promise.resolve(null),
    input.analysts ? listAllActiveAnalysts() : Promise.resolve(null),
  ]);

  if (input.sector_id) {
    if (!sectorsResult || !sectorsResult.ok) {
      return "Failed to validate sector list.";
    }
    const activeSectorIds = new Set(sectorsResult.data.map((item) => item.id));
    if (!activeSectorIds.has(input.sector_id)) {
      return "Sector must be selected from the active sector list.";
    }
  }

  if (input.analysts) {
    if (!analystsResult || !analystsResult.ok) {
      return "Failed to validate analyst list.";
    }
    const activeAnalystIds = new Set(
      analystsResult.data.map((item) => item.id),
    );
    const hasInvalidAnalyst = input.analysts.some(
      (item) => !activeAnalystIds.has(item.analyst_id),
    );
    if (hasInvalidAnalyst) {
      return "Analyst must be selected from the active analyst list.";
    }
  }

  return null;
}

/**
 * List coverages with pagination and search
 * Admin and Analyst can list coverages
 */
export async function listCoveragesAction(input: {
  page?: number;
  query?: string | null;
  sector_id?: string | null;
}): Promise<Result<PaginatedList<CoverageWithDetails>>> {
  await requireAdminOrAnalyst();

  const page = Math.max(1, input.page ?? 1);
  const query = input.query ?? null;

  try {
    return await listCoveragesRepo({ page, query, sector_id: input.sector_id });
  } catch {
    return err("Failed to list coverages.");
  }
}

/**
 * Get a single coverage
 * Admin and Analyst can view coverages
 */
export async function getCoverageAction(id: string): Promise<Result<CoverageWithDetails>> {
  await requireAdminOrAnalyst();

  try {
    return await getCoverageRepo(id);
  } catch {
    return err("Failed to get coverage.");
  }
}

/**
 * Create a new coverage
 * Admin and Analyst can create coverages
 */
export async function createCoverageAction(
  input: unknown,
): Promise<Result<CoverageWithDetails>> {
  await requireAdminOrAnalyst();

  const parsed = coverageSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const optionError = await validateCoverageSelectOptions({
    sector_id: parsed.data.sector_id,
    analysts: parsed.data.analysts,
  });
  if (optionError) {
    return err(optionError);
  }

  const result = await createCoverageRepo(parsed.data);
  if (result.ok) {
    revalidatePath("/coverage");
  }
  return result;
}

/**
 * Update an existing coverage
 * Only Admin can update coverages
 */
export async function updateCoverageAction(
  id: string,
  input: unknown,
): Promise<Result<CoverageWithDetails>> {
  await requireAdmin();

  const parsed = coverageUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const optionError = await validateCoverageSelectOptions({
    sector_id: parsed.data.sector_id,
    analysts: parsed.data.analysts,
  });
  if (optionError) {
    return err(optionError);
  }

  const result = await updateCoverageRepo(id, parsed.data);
  if (result.ok) {
    revalidatePath("/coverage");
  }
  return result;
}

/**
 * Delete a coverage
 * Only Admin can delete coverages
 */
export async function deleteCoverageAction(id: string): Promise<Result<null>> {
  await requireAdmin();

  const result = await deleteCoverageRepo(id);
  if (!result.ok) {
    return result;
  }
  revalidatePath("/coverage");
  return ok(null);
}
