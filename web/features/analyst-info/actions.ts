"use server";

import { revalidatePath } from "next/cache";

import {
  analystCreateSchema,
  analystUpdateSchema,
} from "@/domain/schemas/analyst";
import { err, ok, type Result } from "@/lib/result";
import { requireAdmin } from "@/lib/supabase/server";

import {
  createAnalyst as createAnalystRepo,
  deleteAnalyst as deleteAnalystRepo,
  getRegionsForSelect as getRegionsForSelectRepo,
  listAnalysts as listAnalystsRepo,
  type Analyst,
  type PaginatedList,
  updateAnalyst as updateAnalystRepo,
} from "./repo/analysts-repo";

async function requireAdminOrThrow() {
  await requireAdmin();
}

/**
 * List analysts with pagination and search
 */
export async function listAnalystsAction(input: {
  page?: number;
  query?: string | null;
}): Promise<Result<PaginatedList<Analyst>>> {
  await requireAdminOrThrow();

  const page = Math.max(1, input.page ?? 1);
  const query = input.query ?? null;

  try {
    return await listAnalystsRepo({ page, query });
  } catch {
    return err("Failed to list analysts.");
  }
}

/**
 * Create a new analyst
 */
export async function createAnalystAction(
  input: unknown,
): Promise<Result<Analyst>> {
  await requireAdminOrThrow();

  const parsed = analystCreateSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await createAnalystRepo(parsed.data);
  if (result.ok) {
    revalidatePath("/analyst-info");
  }
  return result;
}

/**
 * Update an existing analyst
 */
export async function updateAnalystAction(
  id: string,
  input: unknown,
): Promise<Result<Analyst>> {
  await requireAdminOrThrow();

  const parsed = analystUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await updateAnalystRepo(id, parsed.data);
  if (result.ok) {
    revalidatePath("/analyst-info");
  }
  return result;
}

/**
 * Delete an analyst
 */
export async function deleteAnalystAction(id: string): Promise<Result<null>> {
  await requireAdminOrThrow();

  const result = await deleteAnalystRepo(id);
  if (!result.ok) {
    return result;
  }
  revalidatePath("/analyst-info");
  return ok(null);
}

/**
 * Get all regions for form dropdown
 */
export async function getRegionsForSelectAction(): Promise<
  Result<{ id: string; name: string; code: string; name_en: string; name_cn: string }[]>
> {
  try {
    await requireAdminOrThrow();
    return await getRegionsForSelectRepo();
  } catch {
    return err("Failed to fetch regions.");
  }
}
