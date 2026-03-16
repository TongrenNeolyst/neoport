"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { ActionButton } from "@/components/ui/action-button";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { formatShanghaiYmd } from "@/lib/time";
import { createBrowserClient } from "@/lib/supabase/browser";
import {
  activateTemplateAction,
  createTemplateAction,
  deleteTemplateAction,
} from "../actions";
import type {
  TemplateGroup,
  ReportType,
  FileType,
  Language,
} from "../repo/templates-repo";

export interface TemplatesPageClientProps {
  templateGroups: TemplateGroup[];
  reportTypes: string[];
}

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  company: "Company",
  sector: "Sector",
  company_flash: "Company Flash",
  sector_flash: "Sector Flash",
  macro: "Macro",
  strategy: "Strategy",
  quantitative: "Quantitative",
  bond: "Bond",
};

const FILE_TYPE_LABELS: Record<FileType, string> = {
  report: "Report",
  model: "Model",
};

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  zh: "Chinese",
};

export function TemplatesPageClient({
  templateGroups,
  reportTypes,
}: TemplatesPageClientProps) {
  const router = useRouter();
  const toast = useToast();

  // Upload modal
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadReportType, setUploadReportType] =
    React.useState<ReportType>("company");
  const [uploadFileType, setUploadFileType] = React.useState<FileType>("report");
  const [uploadLanguage, setUploadLanguage] = React.useState<Language>("en");
  const [uploadName, setUploadName] = React.useState("");
  const [uploadFile, setUploadFile] = React.useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = React.useState(false);
  const [uploadErrors, setUploadErrors] = React.useState<
    Record<string, string>
  >({});

  // Delete confirm
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);

  function openUpload(reportType?: ReportType, fileType?: FileType, language?: Language) {
    // Collect all available report types from both sources
    const existingTypes = templateGroups.map(g => g.report_type);
    const allTypes = [...new Set([...reportTypes, ...existingTypes])];
    const defaultType = reportType ?? (allTypes.length > 0 ? allTypes[0] : "company");
    setUploadReportType(defaultType as ReportType);
    setUploadFileType(fileType ?? "report");
    setUploadLanguage(language ?? "en");
    setUploadName("");
    setUploadFile(null);
    setUploadErrors({});
    setUploadOpen(true);
  }

  async function submitUpload(e: React.FormEvent) {
    e.preventDefault();

    const name = uploadName.trim();
    if (!name) {
      setUploadErrors({ name: "Name is required" });
      return;
    }
    if (!uploadFile) {
      setUploadErrors({ file: "File is required" });
      return;
    }

    // Validate file type
    const validExtensions =
      uploadFileType === "report" ? [".docx", ".doc"] : [".xlsx", ".xls"];
    const fileExt = uploadFile.name
      .toLowerCase()
      .slice(uploadFile.name.lastIndexOf("."));
    if (!validExtensions.includes(fileExt)) {
      setUploadErrors({
        file: `Invalid file type. Expected ${validExtensions.join(" or ")}`,
      });
      return;
    }

    setUploadLoading(true);
    setUploadErrors({});

    try {
      const supabase = createBrowserClient();
      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `templates/${uploadReportType}/${uploadFileType}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("templates")
        .upload(filePath, uploadFile, { upsert: false });

      if (uploadError) {
        toast.error(uploadError.message, { title: "Error" });
        setUploadLoading(false);
        return;
      }

      const res = await createTemplateAction({
        name,
        report_type: uploadReportType,
        file_type: uploadFileType,
        language: uploadLanguage,
        file_path: filePath,
      });

      if (!res.ok) {
        toast.error(res.error, { title: "Error" });
        setUploadLoading(false);
        return;
      }

      setUploadOpen(false);
      toast.success("Template uploaded and activated.", { title: "Success" });
      router.refresh();
    } catch {
      toast.error("Failed to upload template", { title: "Error" });
    } finally {
      setUploadLoading(false);
    }
  }

  async function handleActivate(templateId: string) {
    const res = await activateTemplateAction(templateId);
    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }
    toast.success("Template activated.", { title: "Success" });
    router.refresh();
  }

  function openDelete(templateId: string) {
    setDeleteId(templateId);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;

    setDeleteLoading(true);
    const res = await deleteTemplateAction(deleteId);
    setDeleteLoading(false);

    if (!res.ok) {
      toast.error(res.error, { title: "Error" });
      return;
    }

    setDeleteOpen(false);
    toast.success("Template deleted.", { title: "Success" });
    router.refresh();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-xl font-semibold text-[var(--fg-primary)]">Templates</div>
          <Button onClick={() => openUpload()}>Upload Template</Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        {templateGroups.length === 0 ? (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]/30 p-8 text-center">
            <p className="text-[var(--fg-secondary)]">No templates uploaded yet.</p>
            <Button className="mt-4" onClick={() => openUpload()}>
              Upload First Template
            </Button>
          </div>
        ) : (
          templateGroups.map((group) => (
            <div
              key={`${group.report_type}-${group.language}`}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]/30"
            >
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
                <div>
                  <span className="font-medium text-[var(--fg-primary)]">
                    {REPORT_TYPE_LABELS[group.report_type as ReportType] ?? group.report_type}
                  </span>
                  <span className="mx-2 text-[var(--fg-tertiary)]">/</span>
                  <span className="text-[var(--fg-secondary)]">
                    {LANGUAGE_LABELS[group.language]}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() =>
                    openUpload(
                      group.report_type as ReportType,
                      "report",
                      group.language,
                    )
                  }
                  className="text-xs px-2 py-1"
                >
                  Upload Template
                </Button>
              </div>

              {/* Templates by file_type */}
              {(["report", "model"] as FileType[]).map((fileType) => {
                const fileTypeTemplates = group.templates.filter(t => t.file_type === fileType);
                const activeTemplate = fileTypeTemplates.find(t => t.is_active && t.file_path) || null;
                const historyTemplates = fileTypeTemplates.filter(t => t.id !== activeTemplate?.id);

                return (
                  <div key={fileType}>
                    <div className="bg-[var(--bg-surface-hover)]/50 px-4 py-2 border-b border-white/5">
                      <span className="text-sm font-medium text-[var(--fg-secondary)]">
                        {FILE_TYPE_LABELS[fileType]}
                      </span>
                    </div>

                    {/* Active template */}
                    {activeTemplate ? (
                      <div className="border-b border-white/5 bg-green-500/5 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex items-center rounded bg-green-500/20 px-2 py-0.5 text-xs font-medium text-green-300">
                              Active
                            </span>
                            <span className="text-[var(--fg-primary)]">
                              {activeTemplate.name}
                            </span>
                            <span className="text-sm text-[var(--fg-secondary)]">
                              v{activeTemplate.version}
                            </span>
                            <span className="text-sm text-[var(--fg-tertiary)]">
                              {formatShanghaiYmd(activeTemplate.created_at)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <ActionButton
                              onClick={() => openDelete(activeTemplate.id)}
                            >
                              Delete
                            </ActionButton>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-b border-white/5 px-4 py-3 text-[var(--fg-secondary)]">
                        No {FILE_TYPE_LABELS[fileType]} template
                      </div>
                    )}

                    {/* History versions */}
                    {historyTemplates.length > 0 && (
                      <div className="divide-y divide-white/5">
                        {historyTemplates.map((template) => (
                          <div
                            key={template.id}
                            className="flex items-center justify-between px-4 py-2 hover:bg-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-[var(--fg-secondary)]">{template.name}</span>
                              <span className="text-sm text-[var(--fg-tertiary)]">
                                v{template.version}
                              </span>
                              <span className="text-sm text-[var(--fg-tertiary)]">
                                {formatShanghaiYmd(template.created_at)}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              <ActionButton
                                onClick={() => handleActivate(template.id)}
                              >
                                Activate
                              </ActionButton>
                              <ActionButton
                                tone="danger"
                                onClick={() => openDelete(template.id)}
                              >
                                Delete
                              </ActionButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}
      </main>

      <Modal
        open={uploadOpen}
        title="Upload Template"
        onClose={() => setUploadOpen(false)}
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setUploadOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" form="upload-form" isLoading={uploadLoading}>
              Upload
            </Button>
          </>
        }
      >
        <form id="upload-form" className="space-y-3" onSubmit={submitUpload}>
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Report Type"
              value={uploadReportType}
              onChange={(e) =>
                setUploadReportType(e.target.value as ReportType)
              }
              options={(() => {
                // Collect all available report types from both sources
                const existingTypes = templateGroups.map(g => g.report_type);
                const allTypes = [...new Set([...reportTypes, ...existingTypes])];
                if (allTypes.length === 0) {
                  return [
                    { value: "company", label: "company" },
                    { value: "sector", label: "sector" },
                    { value: "macro", label: "macro" },
                    { value: "strategy", label: "strategy" },
                  ];
                }
                return allTypes.map((rt) => ({ value: rt, label: rt }));
              })()}
            />
            <Select
              label="File Type"
              value={uploadFileType}
              onChange={(e) => setUploadFileType(e.target.value as FileType)}
              options={[
                { value: "report", label: "Report (.docx)" },
                { value: "model", label: "Model (.xlsx)" },
              ]}
            />
            <Select
              label="Language"
              value={uploadLanguage}
              onChange={(e) => setUploadLanguage(e.target.value as Language)}
              options={[
                { value: "en", label: "English" },
                { value: "zh", label: "Chinese" },
              ]}
            />
          </div>
          <Input
            label="Template Name"
            placeholder="e.g., Company Report Template v1"
            value={uploadName}
            onChange={(e) => setUploadName(e.target.value)}
            error={uploadErrors.name}
          />
          <div className="space-y-1.5">
            <FileDropzone
              label="File"
              accept={uploadFileType === "report" ? ".docx,.doc" : ".xlsx,.xls"}
              file={uploadFile}
              onFileChange={setUploadFile}
              error={uploadErrors.file}
              hint={
                uploadFileType === "report"
                  ? "Supports .doc/.docx"
                  : "Supports .xls/.xlsx"
              }
            />
          </div>
          <p className="text-sm text-[var(--fg-secondary)]">
            The uploaded template will be automatically activated.
          </p>
        </form>
      </Modal>

      <ConfirmModal
        open={deleteOpen}
        title="Delete template?"
        description="This action cannot be undone. Active templates cannot be deleted."
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        confirmTone="danger"
        confirmLabel="Delete"
        loading={deleteLoading}
      />
    </div>
  );
}
