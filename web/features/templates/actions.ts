"use server";

import { revalidatePath } from "next/cache";

import {
  templateSchema,
  templateUpdateSchema,
} from "@/domain/schemas/template";
import { err, ok, type Result } from "@/lib/result";
import { requireAdmin, getCurrentUser } from "@/lib/supabase/server";

import {
  activateTemplate as activateTemplateRepo,
  createTemplate as createTemplateRepo,
  deleteTemplate as deleteTemplateRepo,
  getTemplate as getTemplateRepo,
  getActiveTemplate as getActiveTemplateRepo,
  listTemplates as listTemplatesRepo,
  listTemplatesGrouped as listTemplatesGroupedRepo,
  listTemplateReportTypes as listTemplateReportTypesRepo,
  type Template,
  type TemplateGroup,
  type ReportType,
  type FileType,
} from "./repo/templates-repo";

async function requireAdminOrThrow() {
  await requireAdmin();
}

/**
 * List all templates grouped by report_type and file_type
 */
export async function listTemplatesGroupedAction(): Promise<
  Result<TemplateGroup[]>
> {
  await requireAdminOrThrow();

  try {
    return await listTemplatesGroupedRepo();
  } catch {
    return err("Failed to list templates.");
  }
}

/**
 * List templates with optional filters
 */
export async function listTemplatesAction(params?: {
  report_type?: ReportType;
  file_type?: FileType;
  is_active?: boolean;
}): Promise<Result<Template[]>> {
  await requireAdminOrThrow();

  try {
    return await listTemplatesRepo(params);
  } catch {
    return err("Failed to list templates.");
  }
}

/**
 * List all distinct report types from template table
 */
export async function listTemplateReportTypesAction(): Promise<Result<string[]>> {
  try {
    return await listTemplateReportTypesRepo();
  } catch {
    return err("Failed to list report types.");
  }
}

/**
 * Get a single template
 */
export async function getTemplateAction(id: string): Promise<Result<Template>> {
  await requireAdminOrThrow();

  try {
    return await getTemplateRepo(id);
  } catch {
    return err("Failed to get template.");
  }
}

/**
 * Get the active template for a report type and file type
 */
export async function getActiveTemplateAction(
  report_type: ReportType,
  file_type: FileType,
): Promise<Result<Template>> {
  await requireAdminOrThrow();

  try {
    return await getActiveTemplateRepo(report_type, file_type);
  } catch {
    return err("Failed to get active template.");
  }
}

/**
 * Create a new template version
 */
export async function createTemplateAction(input: {
  name: string;
  report_type: ReportType;
  file_type: FileType;
  language?: "en" | "zh";
  file_path: string;
}): Promise<Result<Template>> {
  await requireAdminOrThrow();

  const user = await getCurrentUser();
  if (!user) {
    return err("Unauthorized");
  }

  const parsed = templateSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await createTemplateRepo({
    ...parsed.data,
    language: input.language,
    file_path: input.file_path,
    uploaded_by: user.id,
    set_active: true, // New templates are activated by default
  });

  if (result.ok) {
    revalidatePath("/templates");
  }
  return result;
}

/**
 * Activate a template version
 */
export async function activateTemplateAction(
  id: string,
): Promise<Result<Template>> {
  await requireAdminOrThrow();

  const result = await activateTemplateRepo(id);
  if (result.ok) {
    revalidatePath("/templates");
  }
  return result;
}

/**
 * Update template metadata
 */
export async function updateTemplateAction(
  id: string,
  input: unknown,
): Promise<Result<Template>> {
  await requireAdminOrThrow();

  const parsed = templateUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  // Note: Only name can be updated via this action
  const result = await createTemplateRepo({
    name: parsed.data.name || "",
  } as Parameters<typeof createTemplateRepo>[0]);

  // Use direct repo call for simple name update
  const { updateTemplate } = await import("./repo/templates-repo");
  const updateResult = await updateTemplate(id, { name: parsed.data.name });

  if (updateResult.ok) {
    revalidatePath("/templates");
  }
  return updateResult;
}

/**
 * Delete a template
 */
export async function deleteTemplateAction(id: string): Promise<Result<null>> {
  await requireAdminOrThrow();

  const result = await deleteTemplateRepo(id);
  if (!result.ok) {
    return result;
  }
  revalidatePath("/templates");
  return ok(null);
}
