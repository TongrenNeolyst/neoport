import "server-only";

import { err, ok, type Result } from "@/lib/result";
import { createServerClient } from "@/lib/supabase/server";

export type Template = {
  id: string;
  name: string;
  report_type: string;
  file_type: "report" | "model";
  language: "en" | "zh";
  file_path: string;
  version: number;
  is_active: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TemplateGroup = {
  report_type: string;
  language: "en" | "zh";
  // All templates in this group (different file_types)
  templates: Template[];
};

export type ReportType =
  | "company"
  | "sector"
  | "company_flash"
  | "sector_flash"
  | "macro"
  | "strategy"
  | "quantitative"
  | "bond";
export type FileType = "report" | "model";
export type Language = "en" | "zh";

function hasTemplateFile(template: Pick<Template, "file_path">): boolean {
  return template.file_path.trim().length > 0;
}

/**
 * List all templates grouped by report_type and language
 */
export async function listTemplatesGrouped(): Promise<Result<TemplateGroup[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("template")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch templates");

  // Group templates by (report_type, language)
  const groups = new Map<string, Template[]>();

  for (const template of data) {
    const key = `${template.report_type}:${template.language}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(template as Template);
  }

  // Convert to TemplateGroup format
  const result: TemplateGroup[] = [];

  for (const [key, templates] of groups) {
    const [report_type, language] = key.split(":") as [string, "en" | "zh"];

    result.push({
      report_type,
      language,
      templates,
    });
  }

  // Sort by report_type, then language
  result.sort((a, b) => {
    if (a.report_type !== b.report_type) {
      return a.report_type.localeCompare(b.report_type);
    }
    return a.language.localeCompare(b.language);
  });

  return ok(result);
}

/**
 * List templates with optional filters
 */
export async function listTemplates(params?: {
  report_type?: ReportType;
  file_type?: FileType;
  is_active?: boolean;
}): Promise<Result<Template[]>> {
  const supabase = await createServerClient();

  let query = supabase
    .from("template")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.report_type) {
    query = query.eq("report_type", params.report_type);
  }

  if (params?.file_type) {
    query = query.eq("file_type", params.file_type);
  }

  if (params?.is_active !== undefined) {
    query = query.eq("is_active", params.is_active);
  }

  const { data, error } = await query;

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch templates");

  return ok(data as Template[]);
}

/**
 * Get a single template by ID
 */
export async function getTemplate(id: string): Promise<Result<Template>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("template")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return err(error.message);
  if (!data) return err("Template not found");

  return ok(data as Template);
}

/**
 * Get the active template for a report_type and file_type
 */
export async function getActiveTemplate(
  report_type: ReportType,
  file_type: FileType
): Promise<Result<Template>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("template")
    .select("*")
    .eq("report_type", report_type)
    .eq("file_type", file_type)
    .eq("is_active", true)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return err("No active template found for this report type and file type");
    }
    return err(error.message);
  }

  if (!data || !hasTemplateFile(data as Template)) {
    return err("No active template found for this report type and file type");
  }

  return ok(data as Template);
}

export async function listTemplateReportTypes(): Promise<Result<string[]>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("report_type")
    .select("code")
    .eq("is_active", true)
    .order("sort", { ascending: true });

  if (error) return err(error.message);
  if (!data) return err("Failed to fetch report types");

  const codes = data.map((item) => item.code).filter((code): code is string => Boolean(code));

  return ok(codes);
}

export async function hasValidTemplateForReportType(
  reportType: string,
  language?: "en" | "zh",
): Promise<Result<boolean>> {
  const supabase = await createServerClient();

  let query = supabase
    .from("template")
    .select("id, file_path, is_active")
    .eq("report_type", reportType)
    .eq("is_active", true);

  if (language) {
    query = query.eq("language", language);
  }

  const { data, error } = await query;

  if (error) return err(error.message);
  if (!data || data.length === 0) return ok(false);

  return ok(
    data.some((item) => Boolean(item.file_path && item.file_path.trim().length > 0)),
  );
}

/**
 * Get the next version number for a report_type, file_type, and language
 */
export async function getNextVersion(
  report_type: ReportType,
  file_type: FileType,
  language: "en" | "zh" = "en"
): Promise<number> {
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("template")
    .select("version")
    .eq("report_type", report_type)
    .eq("file_type", file_type)
    .eq("language", language)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  return (data?.version ?? 0) + 1;
}

/**
 * Create a new template version
 */
export async function createTemplate(params: {
  name: string;
  report_type: ReportType;
  file_type: FileType;
  language?: "en" | "zh";
  file_path: string;
  uploaded_by: string;
  set_active?: boolean;
}): Promise<Result<Template>> {
  const supabase = await createServerClient();
  const language = params.language ?? "en";

  // Get next version number
  const version = await getNextVersion(params.report_type, params.file_type, language);

  // If set_active is true, deactivate existing active templates first
  // to avoid unique constraint violation (template_report_type_file_type_active_idx)
  if (params.set_active) {
    await supabase
      .from("template")
      .update({ is_active: false })
      .eq("report_type", params.report_type)
      .eq("file_type", params.file_type)
      .eq("language", language)
      .eq("is_active", true);
  }

  const { data, error } = await supabase
    .from("template")
    .insert({
      name: params.name,
      report_type: params.report_type,
      file_type: params.file_type,
      language,
      file_path: params.file_path,
      version,
      is_active: false, // Always insert as inactive first, then activate
      uploaded_by: params.uploaded_by,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return err("Template version conflict. Please try again.");
    }
    return err(error.message);
  }

  if (!data) return err("Failed to create template");

  // If set_active is true, activate this template
  if (params.set_active) {
    const activateResult = await activateTemplate(data.id);
    if (!activateResult.ok) {
      return activateResult;
    }
    return activateResult;
  }

  return ok(data as Template);
}

/**
 * Activate a template (deactivates others in the same group)
 */
export async function activateTemplate(id: string): Promise<Result<Template>> {
  const supabase = await createServerClient();

  // First, get the template to know its group
  const templateResult = await getTemplate(id);
  if (!templateResult.ok) return templateResult;

  const template = templateResult.data;

  // Deactivate all templates in the same group
  const { error: deactivateError } = await supabase
    .from("template")
    .update({ is_active: false })
    .eq("report_type", template.report_type)
    .eq("file_type", template.file_type)
    .eq("language", template.language);

  if (deactivateError) return err(deactivateError.message);

  // Activate the target template
  const { data, error: activateError } = await supabase
    .from("template")
    .update({ is_active: true })
    .eq("id", id)
    .select()
    .single();

  if (activateError) return err(activateError.message);
  if (!data) return err("Failed to activate template");

  return ok(data as Template);
}

/**
 * Update template metadata (not file)
 */
export async function updateTemplate(
  id: string,
  params: {
    name?: string;
  }
): Promise<Result<Template>> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("template")
    .update(params)
    .eq("id", id)
    .select()
    .single();

  if (error) return err(error.message);
  if (!data) return err("Failed to update template");

  return ok(data as Template);
}

/**
 * Delete a template (soft delete by deactivating, or hard delete if not active)
 */
export async function deleteTemplate(id: string): Promise<Result<null>> {
  const supabase = await createServerClient();

  // Check if template is active
  const templateResult = await getTemplate(id);
  if (!templateResult.ok) return templateResult;

  if (templateResult.data.is_active) {
    return err("Cannot delete an active template. Activate another version first.");
  }

  const { error } = await supabase.from("template").delete().eq("id", id);

  if (error) return err(error.message);

  return ok(null);
}
