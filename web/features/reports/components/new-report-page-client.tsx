"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useToast } from "@/components/ui/toast";
import type {
  ReportAnalystInput,
  ReportLanguage,
} from "@/domain/schemas/report";
import type { Analyst } from "@/features/analyst-info/repo/analysts-repo";
import type { CoverageWithDetails } from "@/features/coverage/repo/coverage-repo";
import type { Region } from "@/features/regions/repo/regions-repo";
import type { Rating } from "@/features/ratings/repo/ratings-repo";
import type { Sector } from "@/features/sectors/repo/sectors-repo";
import {
  createReportAction,
  directSubmitReportAction,
  saveChiefApproveAction,
  saveReportContentAction,
} from "@/features/reports/actions";
import {
  buildReportStoragePath,
  validateUploadExtension,
} from "@/features/reports/file-utils";
import type { ReportDetail } from "@/features/reports/repo/reports-repo";
import type { UserRow } from "@/domain/user";
import { createBrowserClient } from "@/lib/supabase/browser";

type FormAnalyst = ReportAnalystInput;

const LANGUAGE_OPTIONS: { value: ReportLanguage; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh", label: "Chinese" },
];

const CERTIFICATE_CLAUSES = [
  "members of my household and I have not traded any financial interest in the subject company since I started the coverage nor currently hold any financial interest in the subject company (including, without limitation, any securities, option, right, warrant, future, long or short position;",
  "I did not receive any compensation from the subject company in the previous 12 months;",
  "I have not served as an officer, director or employee of the subject company;",
  "none of my household serve as an officer of the subject company;",
  "I comply with the Group Compliance Policy with regards to gifts and entertainment in dealing with subject companies and investors;",
  "this research report contains no material non-public information.",
] as const;

function formatReportTypeLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isCompanyType(reportType: string): boolean {
  return reportType === "company" || reportType === "company_flash";
}

function requiresRegion(reportType: string): boolean {
  return (
    reportType === "sector" ||
    reportType === "sector_flash" ||
    reportType === "common"
  );
}

function requiresSector(reportType: string): boolean {
  return reportType === "sector" || reportType === "sector_flash";
}

function requiresModel(reportType: string): boolean {
  return reportType === "company";
}

export interface NewReportPageClientProps {
  userRole: "admin" | "analyst";
  reportTypes: string[];
  analysts: Analyst[];
  regions: Region[];
  sectors: Sector[];
  coverages: CoverageWithDetails[];
  ratings: Rating[];
  users: UserRow[];
}

export function NewReportPageClient({
  userRole,
  reportTypes,
  analysts,
  regions,
  sectors,
  coverages,
  ratings,
  users,
}: NewReportPageClientProps) {
  const router = useRouter();
  const toast = useToast();

  const canCreate = userRole === "admin" || userRole === "analyst";
  const [activeReport, setActiveReport] = React.useState<ReportDetail | null>(
    null,
  );
  const [saving, setSaving] = React.useState(false);

  const reportTypeOptions = React.useMemo(
    () =>
      reportTypes.map((value) => ({
        value,
        label: formatReportTypeLabel(value),
      })),
    [reportTypes],
  );

  const ratingOptions = React.useMemo(
    () =>
      ratings.map((rating) => ({
        value: rating.code,
        label: `${rating.name} (${rating.code})`,
      })),
    [ratings],
  );

  const [formTitle, setFormTitle] = React.useState("");
  const [formReportType, setFormReportType] = React.useState(
    reportTypes[0] ?? "company",
  );
  const [formTicker, setFormTicker] = React.useState("");
  const [formRating, setFormRating] = React.useState("");
  const [formTargetPrice, setFormTargetPrice] = React.useState("");
  const [formRegionCode, setFormRegionCode] = React.useState("");
  const [formSectorId, setFormSectorId] = React.useState("");
  const [formLanguage, setFormLanguage] = React.useState<ReportLanguage>("en");
  const [formContactPersonId, setFormContactPersonId] = React.useState("");
  const [formInvestmentThesis, setFormInvestmentThesis] = React.useState("");
  const [formCertificate, setFormCertificate] = React.useState(false);
  const [formAnalysts, setFormAnalysts] = React.useState<FormAnalyst[]>([]);
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>(
    {},
  );

  const [reportFile, setReportFile] = React.useState<File | null>(null);
  const [modelFile, setModelFile] = React.useState<File | null>(null);
  const [chiefApprovalScreenshotFile, setChiefApprovalScreenshotFile] = React.useState<File | null>(null);

  React.useEffect(() => {
    if (!reportTypes.includes(formReportType) && reportTypes.length > 0) {
      setFormReportType(reportTypes[0]);
    }
  }, [formReportType, reportTypes]);

  function getAnalystOptions(
    index: number,
  ): { value: string; label: string }[] {
    const selectedOthers = new Set(
      formAnalysts
        .filter((_, idx) => idx !== index)
        .map((item) => item.analyst_id)
        .filter(Boolean),
    );
    const current = formAnalysts[index]?.analyst_id;

    return [
      { value: "", label: "Select analyst..." },
      ...analysts
        .filter((item) => item.id === current || !selectedOthers.has(item.id))
        .map((item) => ({ value: item.id, label: item.full_name })),
    ];
  }

  function addAnalyst() {
    if (formAnalysts.length >= 4) {
      return;
    }
    setFormAnalysts((prev) => [
      ...prev,
      { analyst_id: "", role: prev.length + 1, sort_order: prev.length + 1 },
    ]);
  }

  function removeAnalyst(index: number) {
    setFormAnalysts((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((item, idx) => ({ ...item, role: idx + 1, sort_order: idx + 1 })),
    );
  }

  function updateAnalyst(index: number, analystId: string) {
    setFormAnalysts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], analyst_id: analystId };
      return next;
    });
  }

  function buildValidatedAnalysts(): FormAnalyst[] {
    return formAnalysts
      .filter((item) => item.analyst_id)
      .map((item, index) => ({
        analyst_id: item.analyst_id,
        role: index + 1,
        sort_order: index + 1,
      }));
  }

  function validateForm(): FormAnalyst[] | null {
    const errors: Record<string, string> = {};

    if (!formTitle.trim()) {
      errors.title = "Title is required";
    }

    if (!formReportType.trim()) {
      errors.report_type = "Report Type is required";
    }

    const validatedAnalysts = buildValidatedAnalysts();
    const unique = new Set(validatedAnalysts.map((item) => item.analyst_id));
    if (unique.size !== validatedAnalysts.length) {
      errors.analysts = "Analysts must be unique";
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return null;
    }
    return validatedAnalysts;
  }

  async function ensureReportId(
    analystsValue: FormAnalyst[],
  ): Promise<ReportDetail | null> {
    if (activeReport) {
      return activeReport;
    }

    const createResult = await createReportAction({
      title: formTitle.trim(),
      report_type: formReportType,
      ticker: formTicker || null,
      rating: formRating || null,
      target_price: formTargetPrice || null,
      region_code: formRegionCode || null,
      sector_id: formSectorId || null,
      report_language: formLanguage,
      contact_person_id: formContactPersonId || null,
      investment_thesis: formInvestmentThesis || null,
      certificate_confirmed: formCertificate,
      analysts: analystsValue,
    });

    if (!createResult.ok) {
      toast.error(createResult.error, { title: "Error" });
      return null;
    }

    setActiveReport(createResult.data);
    return createResult.data;
  }

  async function uploadReportFiles(params: {
    reportId: string;
    versionNo: number;
  }): Promise<
    | {
        ok: true;
        data: {
          word_file_path: string | null;
          word_file_name: string | null;
          model_file_path: string | null;
          model_file_name: string | null;
        };
      }
    | {
        ok: false;
        error: string;
      }
  > {
    const supabase = createBrowserClient();
    let wordFilePath: string | null =
      activeReport?.latest_version?.word_file_path ?? null;
    let wordFileName: string | null =
      activeReport?.latest_version?.word_file_name ?? null;
    let modelFilePath: string | null =
      activeReport?.latest_version?.model_file_path ?? null;
    let modelFileName: string | null =
      activeReport?.latest_version?.model_file_name ?? null;

    if (reportFile) {
      const check = validateUploadExtension("report", reportFile.name);
      if (!check.ok) {
        return { ok: false, error: check.error };
      }

      const path = buildReportStoragePath({
        reportId: params.reportId,
        versionNo: params.versionNo,
        label: "report",
        extension: check.extension,
      });

      const { error } = await supabase.storage
        .from("reports")
        .upload(path, reportFile, {
          upsert: true,
        });

      if (error) {
        return { ok: false, error: error.message };
      }
      wordFilePath = path;
      wordFileName = reportFile.name;
    }

    if (modelFile) {
      const check = validateUploadExtension("model", modelFile.name);
      if (!check.ok) {
        return { ok: false, error: check.error };
      }

      const path = buildReportStoragePath({
        reportId: params.reportId,
        versionNo: params.versionNo,
        label: "model",
        extension: check.extension,
      });

      const { error } = await supabase.storage
        .from("reports")
        .upload(path, modelFile, {
          upsert: true,
        });

      if (error) {
        return { ok: false, error: error.message };
      }
      modelFilePath = path;
      modelFileName = modelFile.name;
    }

    return {
      ok: true,
      data: {
        word_file_path: wordFilePath,
        word_file_name: wordFileName,
        model_file_path: modelFilePath,
        model_file_name: modelFileName,
      },
    };
  }

  async function uploadChiefApprovalScreenshot(params: {
    reportId: string;
  }): Promise<{ ok: boolean; error?: string }> {
    if (!chiefApprovalScreenshotFile) {
      return { ok: true };
    }

    const supabase = createBrowserClient();
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const fileName = chiefApprovalScreenshotFile.name.toLowerCase();
    const ext = fileName.match(/\.[^.]+$/)?.[0] ?? "";

    if (!allowedExtensions.includes(ext)) {
      return { ok: false, error: "Chief approval screenshot must be an image (jpg, png, gif, webp)" };
    }

    const path = `approvals/${params.reportId}/${Date.now()}${ext}`;

    const { error } = await supabase.storage
      .from("reports")
      .upload(path, chiefApprovalScreenshotFile, {
        upsert: true,
      });

    if (error) {
      return { ok: false, error: error.message };
    }

    // Save to chief_approve table
    const saveResult = await saveChiefApproveAction({
      report_id: params.reportId,
      file_path: path,
      file_name: chiefApprovalScreenshotFile.name,
      file_type: chiefApprovalScreenshotFile.type,
    });

    if (!saveResult.ok) {
      return { ok: false, error: saveResult.error };
    }

    return { ok: true };
  }

  async function handleSaveDraft() {
    if (!canCreate) {
      toast.error("No permission", { title: "Error" });
      return;
    }

    const analystsValue = validateForm();
    if (!analystsValue) {
      return;
    }

    setSaving(true);
    try {
      const ensuredReport = await ensureReportId(analystsValue);
      if (!ensuredReport) {
        return;
      }

      // Upload chief approval screenshot first (if any)
      if (chiefApprovalScreenshotFile) {
        const chiefUploadResult = await uploadChiefApprovalScreenshot({
          reportId: ensuredReport.id,
        });
        if (!chiefUploadResult.ok) {
          toast.error(chiefUploadResult.error ?? "Upload failed", { title: "Error" });
          setSaving(false);
          return;
        }
      }

      const uploadResult = await uploadReportFiles({
        reportId: ensuredReport.id,
        versionNo: ensuredReport.current_version_no + 1,
      });
      if (!uploadResult.ok) {
        toast.error(uploadResult.error, { title: "Error" });
        return;
      }

      const saveResult = await saveReportContentAction({
        report_id: ensuredReport.id,
        title: formTitle.trim(),
        report_type: formReportType,
        ticker: formTicker || null,
        rating: formRating || null,
        target_price: formTargetPrice || null,
        region_code: formRegionCode || null,
        sector_id: formSectorId || null,
        report_language: formLanguage,
        contact_person_id: formContactPersonId || null,
        investment_thesis: formInvestmentThesis || null,
        certificate_confirmed: formCertificate,
        analysts: analystsValue,
        word_file_path: uploadResult.data.word_file_path,
        word_file_name: uploadResult.data.word_file_name,
        model_file_path: uploadResult.data.model_file_path,
        model_file_name: uploadResult.data.model_file_name,
      });

      if (!saveResult.ok) {
        toast.error(saveResult.error, { title: "Error" });
        return;
      }

      setActiveReport(saveResult.data);
      setReportFile(null);
      setModelFile(null);
      setChiefApprovalScreenshotFile(null);
      toast.success("Draft saved.", { title: "Success" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleDirectSubmit() {
    if (!canCreate) {
      toast.error("No permission", { title: "Error" });
      return;
    }

    const analystsValue = validateForm();
    if (!analystsValue) {
      return;
    }

    if (!formCertificate) {
      setFormErrors((prev) => ({
        ...prev,
        certificate_confirmed: "Certificate must be confirmed before submit",
      }));
      return;
    }

    setSaving(true);
    try {
      const ensuredReport = await ensureReportId(analystsValue);
      if (!ensuredReport) {
        return;
      }

      // Upload chief approval screenshot first (if any)
      if (chiefApprovalScreenshotFile) {
        const chiefUploadResult = await uploadChiefApprovalScreenshot({
          reportId: ensuredReport.id,
        });
        if (!chiefUploadResult.ok) {
          toast.error(chiefUploadResult.error ?? "Upload failed", { title: "Error" });
          setSaving(false);
          return;
        }
      }

      const uploadResult = await uploadReportFiles({
        reportId: ensuredReport.id,
        versionNo: ensuredReport.current_version_no + 1,
      });
      if (!uploadResult.ok) {
        toast.error(uploadResult.error, { title: "Error" });
        return;
      }

      const directResult = await directSubmitReportAction({
        report_id: ensuredReport.id,
        title: formTitle.trim(),
        report_type: formReportType,
        ticker: formTicker || null,
        rating: formRating || null,
        target_price: formTargetPrice || null,
        region_code: formRegionCode || null,
        sector_id: formSectorId || null,
        report_language: formLanguage,
        contact_person_id: formContactPersonId || null,
        investment_thesis: formInvestmentThesis || null,
        certificate_confirmed: formCertificate,
        analysts: analystsValue,
        word_file_path: uploadResult.data.word_file_path,
        word_file_name: uploadResult.data.word_file_name,
        model_file_path: uploadResult.data.model_file_path,
        model_file_name: uploadResult.data.model_file_name,
      });

      if (!directResult.ok) {
        toast.error(directResult.error, { title: "Error" });
        return;
      }

      setActiveReport(directResult.data);
      setReportFile(null);
      setModelFile(null);
      setChiefApprovalScreenshotFile(null);
      toast.success("Report submitted.", { title: "Success" });
      router.push("/reports");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div>
            <div className="text-xl font-semibold text-[var(--fg-primary)]">
              Analyst Submit
            </div>
            {activeReport ? (
              <div className="text-xs text-[var(--fg-secondary)]">
                Draft ID: {activeReport.id.slice(0, 8)}... / v
                {activeReport.current_version_no}
              </div>
            ) : null}
          </div>
          <Link
            href="/reports"
            className="text-sm text-[var(--fg-secondary)] hover:text-[var(--fg-primary)]"
          >
            Back to Reports
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <section className="space-y-4 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--fg-secondary)]">
            Basic Information
          </h2>

          <Textarea
            label="Report Title"
            value={formTitle}
            onChange={(event) => setFormTitle(event.target.value)}
            error={formErrors.title}
            rows={3}
          />

          <Select
            label="Report Type"
            value={formReportType}
            onChange={(event) => setFormReportType(event.target.value)}
            options={reportTypeOptions}
            error={formErrors.report_type}
          />

          {isCompanyType(formReportType) ? (
            <SearchableSelect
              label="Ticker"
              value={formTicker}
              onChange={setFormTicker}
              placeholder="Search ticker..."
              options={[
                { value: "", label: "" },
                ...coverages
                  .filter((c) => c.analysts.length > 0)
                  .map((c) => {
                    const firstAnalyst = [...c.analysts]
                      .sort((a, b) => a.sort_order - b.sort_order)[0];
                    const analystName = firstAnalyst?.analyst?.full_name || "Unknown";
                    return {
                      value: c.ticker,
                      label: `${c.ticker} - ${analystName}`,
                    };
                  }),
              ]}
            />
          ) : null}

          {formReportType === "company" ? (
            <>
              <Select
                label="Rating"
                value={formRating}
                onChange={(event) => setFormRating(event.target.value)}
                options={[
                  { value: "", label: "Select rating..." },
                  ...ratingOptions,
                ]}
              />
              <Input
                label="Target Price"
                type="number"
                min={0}
                step={0.01}
                value={formTargetPrice}
                onChange={(event) => {
                  const value = event.target.value;
                  // 只允许数字和小数点
                  if (value === '' || /^\d*\.?\d*$/.test(value)) {
                    setFormTargetPrice(value);
                  }
                }}
              />
            </>
          ) : null}

          {requiresRegion(formReportType) ? (
            <Select
              label="Region"
              value={formRegionCode}
              onChange={(event) => setFormRegionCode(event.target.value)}
              options={[
                { value: "", label: "Select region..." },
                ...regions.map((item) => ({
                  value: item.code,
                  label: `${item.name_en} (${item.code})`,
                })),
              ]}
            />
          ) : null}

          {requiresSector(formReportType) ? (
            <Select
              label="Sector"
              value={formSectorId}
              onChange={(event) => setFormSectorId(event.target.value)}
              options={[
                { value: "", label: "Select sector..." },
                ...sectors.map((item) => ({
                  value: item.id,
                  label: item.name_en,
                })),
              ]}
            />
          ) : null}

          <Select
            label="Report Language"
            value={formLanguage}
            onChange={(event) =>
              setFormLanguage(event.target.value as ReportLanguage)
            }
            options={LANGUAGE_OPTIONS}
          />

          <div className="space-y-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]/40 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-[var(--fg-primary)]">Analyst</div>
              <Button type="button" variant="ghost" onClick={addAnalyst}>
                Add Analyst
              </Button>
            </div>
            {formAnalysts.length === 0 ? (
              <p className="text-sm text-[var(--fg-primary)]0">No analyst assigned.</p>
            ) : (
              formAnalysts.map((item, index) => (
                <div
                  key={`${item.analyst_id}-${index}`}
                  className="grid grid-cols-12 gap-2"
                >
                  <div className="col-span-9">
                    <Select
                      value={item.analyst_id}
                      onChange={(event) =>
                        updateAnalyst(index, event.target.value)
                      }
                      options={getAnalystOptions(index)}
                    />
                  </div>
                  <div className="col-span-1 flex items-center text-xs text-[var(--fg-secondary)]">
                    #{index + 1}
                  </div>
                  <div className="col-span-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => removeAnalyst(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))
            )}
            {formErrors.analysts ? (
              <p className="text-xs text-red-500">{formErrors.analysts}</p>
            ) : null}
          </div>

          <SearchableSelect
            label="Contact Person"
            value={formContactPersonId}
            onChange={setFormContactPersonId}
            placeholder="Search user..."
            options={[
              { value: "", label: "Select contact person..." },
              ...users.map((user) => ({
                value: user.id,
                label: user.fullName || user.email,
              })),
            ]}
          />

          <RichTextEditor
            label="Investment Thesis"
            value={formInvestmentThesis}
            onChange={setFormInvestmentThesis}
            placeholder="Report abstract..."
            minHeight="150px"
          />

          <div className="space-y-2 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]/30 p-4">
            <div className="text-sm font-medium text-[var(--fg-primary)]">
              * certificate
            </div>
            <label className="flex items-start gap-2 text-sm text-[var(--fg-primary)]">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-surface)]"
                checked={formCertificate}
                onChange={(event) => {
                  setFormCertificate(event.target.checked);
                  setFormErrors((prev) => {
                    const next = { ...prev };
                    delete next.certificate_confirmed;
                    return next;
                  });
                }}
              />
              <span>
                I and all the names listed as the authors of this uploaded
                notes, certify that'
              </span>
            </label>
            <ol className="list-decimal space-y-1 pl-6 text-sm text-[var(--fg-secondary)]">
              {CERTIFICATE_CLAUSES.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            {formErrors.certificate_confirmed ? (
              <p className="text-xs text-red-500">
                {formErrors.certificate_confirmed}
              </p>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--fg-secondary)]">
            Report Files
          </h2>
          <FileDropzone
            label="Report File (Word/PDF/PPT)"
            accept=".doc,.docx,.pdf,.ppt,.pptx"
            file={reportFile}
            onFileChange={setReportFile}
            hint="Required on submit. Supports .doc/.docx/.pdf/.ppt/.pptx"
          />
          <FileDropzone
            label="Model File"
            accept=".xls,.xlsx,.csv"
            file={modelFile}
            onFileChange={setModelFile}
            hint={
              requiresModel(formReportType)
                ? "Required for Company report on submit"
                : "Optional for non-Company reports"
            }
          />
          <FileDropzone
            label="Chief Approval Screenshot"
            accept=".jpg,.jpeg,.png,.gif,.webp"
            file={chiefApprovalScreenshotFile}
            onFileChange={setChiefApprovalScreenshotFile}
            hint="Required for Submit (jpg, png, gif, webp)"
          />
        </section>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDraft}
            isLoading={saving}
          >
            Save Draft
          </Button>
          <Button type="button" onClick={handleDirectSubmit} isLoading={saving}>
            Direct Submit
          </Button>
        </div>
      </main>
    </div>
  );
}
