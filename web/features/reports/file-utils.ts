import type { ReportFileLabel } from "@/domain/schemas/report";

export const REPORT_FILE_EXTENSIONS = ["doc", "docx", "pdf", "ppt", "pptx"] as const;
export const MODEL_FILE_EXTENSIONS = ["xls", "xlsx", "csv"] as const;

export function toUtcTimestamp(date = new Date()): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getFileExtension(fileName: string): string {
  const cleaned = sanitizeFileName(fileName);
  const parts = cleaned.split(".");
  if (parts.length < 2) {
    return "";
  }
  return parts[parts.length - 1].toLowerCase();
}

export function validateUploadExtension(
  label: ReportFileLabel,
  fileName: string,
): { ok: true; extension: string } | { ok: false; error: string } {
  const extension = getFileExtension(fileName);
  if (!extension) {
    return { ok: false, error: "File extension is required." };
  }

  const allowed: readonly string[] =
    label === "report"
      ? REPORT_FILE_EXTENSIONS
      : MODEL_FILE_EXTENSIONS;

  if (!allowed.includes(extension as (typeof allowed)[number])) {
    return {
      ok: false,
      error:
        label === "report"
          ? "Report file must be .doc, .docx, .pdf, .ppt, or .pptx"
          : "Model file must be .xls, .xlsx, or .csv",
    };
  }

  return { ok: true, extension };
}

export function buildReportStoragePath(params: {
  reportId: string;
  versionNo: number;
  label: ReportFileLabel;
  extension: string;
  ts?: Date;
}): string {
  const extension = params.extension.replace(/^\./, "").toLowerCase();
  const timestamp = toUtcTimestamp(params.ts);
  const versionNo3 = String(params.versionNo).padStart(3, "0");
  const fileName = `${params.reportId}_${versionNo3}_${params.label}_${timestamp}.${extension}`;
  return `reports/${params.reportId}/${fileName}`;
}
