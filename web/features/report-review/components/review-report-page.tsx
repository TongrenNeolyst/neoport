"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { FileDropzone } from "@/components/ui/file-dropzone";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { useToast } from "@/components/ui/toast";
import type { ReportDetail } from "@/features/reports/repo/reports-repo";
import type { Analyst } from "@/features/analyst-info/repo/analysts-repo";
import { getReportDownloadUrlAction } from "@/features/reports/actions";

import {
  executeReviewAction,
  getReviewReportDetailAction,
} from "../actions";

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export interface ReviewReportPageProps {
  reportId: string;
  userRole: "admin" | "sa";
  analysts: Analyst[];
}

export function ReviewReportPage({
  reportId,
  userRole,
  analysts: analystsProp,
}: ReviewReportPageProps) {
  const router = useRouter();
  const toast = useToast();

  const [loading, setLoading] = React.useState(true);
  const [detail, setDetail] = React.useState<ReportDetail | null>(null);
  const [reportFile, setReportFile] = React.useState<File | null>(null);
  const [modelFile, setModelFile] = React.useState<File | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  // Form state
  const [formTitle, setFormTitle] = React.useState("");
  const [formInvestmentThesis, setFormInvestmentThesis] = React.useState("");
  const [formAnalysts, setFormAnalysts] = React.useState<{ analyst_id: string; role: number; sort_order: number }[]>([]);

  // File state

  React.useEffect(() => {
    async function loadData() {
      const detailResult = await getReviewReportDetailAction(reportId);
      setLoading(false);

      if (!detailResult.ok) {
        toast.error(detailResult.error, { title: "Error" });
        return;
      }

      setDetail(detailResult.data);
      setFormTitle(detailResult.data.title);
      setFormInvestmentThesis(detailResult.data.investment_thesis ?? "");
      setFormAnalysts(
        detailResult.data.analysts
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((item) => ({
            analyst_id: item.analyst_id,
            role: item.role,
            sort_order: item.sort_order,
          }))
      );
    }

    loadData();
  }, [reportId, toast]);

  function getAnalystOptions(index: number): { value: string; label: string }[] {
    const selectedOthers = new Set(
      formAnalysts
        .filter((_, idx) => idx !== index)
        .map((item) => item.analyst_id)
        .filter(Boolean)
    );
    const current = formAnalysts[index]?.analyst_id;

    return [
      { value: "", label: "Select analyst..." },
      ...analystsProp.filter((item) => item.id === current || !selectedOthers.has(item.id))
        .map((item) => ({ value: item.id, label: item.full_name })),
    ];
  }

  function addAnalyst() {
    if (formAnalysts.length >= 4) return;
    setFormAnalysts((prev) => [
      ...prev,
      { analyst_id: "", role: prev.length + 1, sort_order: prev.length + 1 },
    ]);
  }

  function removeAnalyst(index: number) {
    setFormAnalysts((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((item, idx) => ({ ...item, role: idx + 1, sort_order: idx + 1 }))
    );
  }

  function updateAnalyst(index: number, analystId: string) {
    setFormAnalysts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], analyst_id: analystId };
      return next;
    });
  }

  async function handleDownload(filePath: string, fileName?: string) {
    if (!detail) {
      return;
    }

    const result = await getReportDownloadUrlAction({
      report_id: detail.id,
      file_path: filePath,
    });

    if (!result.ok) {
      toast.error(result.error, { title: "Error" });
      return;
    }

    window.open(result.data, "_blank", "noopener,noreferrer");
  }

  async function runAction(action: "approve" | "reject" | "reopen") {
    if (!detail) {
      return;
    }

    // 验证 Approve 操作必须上传 PDF 文件
    if (action === "approve") {
      const hasNewPdfFile = reportFile && reportFile.name.toLowerCase().endsWith(".pdf");
      const hasExistingPdfFile =
        detail.latest_version?.word_file_path?.toLowerCase().endsWith(".pdf");

      if (!hasNewPdfFile && !hasExistingPdfFile) {
        toast.error("Approve requires a PDF report file to be uploaded.", { title: "Validation Error" });
        return;
      }
    }

    setActionLoading(true);

    const payload =
      action === "reject"
        ? { action, report_id: detail.id, reason: rejectReason }
        : { action, report_id: detail.id };

    const result = await executeReviewAction(payload);
    setActionLoading(false);

    if (!result.ok) {
      toast.error(result.error, { title: "Error" });
      return;
    }

    setDetail(result.data);
    if (action === "reject") {
      setRejectReason("");
    }
    router.push("/report-review");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)]">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="py-10 text-center text-[var(--fg-secondary)]">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)]">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="py-10 text-center text-[var(--fg-secondary)]">
            Report not found.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)]">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Link href="/report-review">
              <Button type="button" variant="ghost">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </Button>
            </Link>
            <div>
              <div className="text-xl font-semibold text-[var(--fg-primary)]">
                Quality Review
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        {/* Basic Info Section */}
        <section className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--fg-secondary)]">
            Report Information
          </h2>
          <div className="space-y-4">
            <Textarea
              label="Title"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              rows={3}
            />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <span className="text-sm text-[var(--fg-tertiary)]">Type:</span>
              <span className="ml-2 text-sm text-[var(--fg-primary)]">{detail?.report_type}</span>
            </div>
            {detail?.ticker && (
              <div>
                <span className="text-sm text-[var(--fg-tertiary)]">Ticker:</span>
                <span className="ml-2 text-sm text-[var(--fg-primary)]">{detail.ticker}</span>
              </div>
            )}
            {detail?.rating && (
              <div>
                <span className="text-sm text-[var(--fg-tertiary)]">Rating:</span>
                <span className="ml-2 text-sm text-[var(--fg-primary)]">{detail.rating}</span>
              </div>
            )}
            {detail?.target_price && (
              <div>
                <span className="text-sm text-[var(--fg-tertiary)]">Target Price:</span>
                <span className="ml-2 text-sm text-[var(--fg-primary)]">{detail.target_price}</span>
              </div>
            )}
            {detail.region && (
              <div>
                <span className="text-sm text-[var(--fg-tertiary)]">Region:</span>
                <span className="ml-2 text-sm text-[var(--fg-primary)]">{detail.region.name_en}</span>
              </div>
            )}
            {detail.sector && (
              <div>
                <span className="text-sm text-[var(--fg-tertiary)]">Sector:</span>
                <span className="ml-2 text-sm text-[var(--fg-primary)]">{detail.sector.name_en}</span>
              </div>
            )}
            {detail.report_language && (
              <div>
                <span className="text-sm text-[var(--fg-tertiary)]">Language:</span>
                <span className="ml-2 text-sm text-[var(--fg-primary)]">
                  {detail.report_language === "en" ? "English" : detail.report_language === "zh" ? "Chinese" : detail.report_language}
                </span>
              </div>
            )}
          </div>

          {detail.coverage && (
            <div className="mt-4">
              <span className="text-sm text-[var(--fg-tertiary)]">Coverage:</span>
              <span className="ml-2 text-sm text-[var(--fg-primary)]">{detail.coverage.english_full_name}</span>
            </div>
          )}

          <div className="mt-4">
            <RichTextEditor
              label="Investment Thesis"
              value={formInvestmentThesis}
              onChange={setFormInvestmentThesis}
              placeholder="Report abstract..."
              minHeight="150px"
            />
          </div>

          {/* Analysts Section */}
          <div className="mt-4">
            <div className="mb-2 text-sm font-medium text-[var(--fg-primary)]">
              Analysts
            </div>
            {formAnalysts.length === 0 ? (
              <p className="text-sm text-[var(--fg-tertiary)]">No analyst assigned.</p>
            ) : (
              formAnalysts.map((item, index) => (
                <div key={`${item.analyst_id}-${index}`} className="mb-2 grid grid-cols-12 gap-2">
                  <div className="col-span-9">
                    <Select
                      value={item.analyst_id}
                      onChange={(e) => updateAnalyst(index, e.target.value)}
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
            {formAnalysts.length < 4 && (
              <Button type="button" variant="secondary" onClick={addAnalyst} className="mt-2">
                Add Analyst
              </Button>
            )}
          </div>
        </section>

        {/* Files Section */}
        <section className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--fg-secondary)]">
            Report Files
          </h2>
          <div className="space-y-4">
            {/* Existing Report File */}
            {detail.latest_version?.word_file_path ? (
              <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]/40 p-3">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                  onClick={() =>
                    handleDownload(
                      detail.latest_version!.word_file_path!,
                      detail.latest_version!.word_file_name ?? "report",
                    )
                  }
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Report : {detail.latest_version.word_file_name ?? "Unknown"}
                </button>
              </div>
            ) : null}

            <FileDropzone
              label="Report File (Word/PDF/PPT)"
              accept=".doc,.docx,.pdf,.ppt,.pptx"
              file={reportFile}
              onFileChange={setReportFile}
              hint="Supports .doc/.docx/.pdf/.ppt/.pptx"
            />

            {/* Existing Model File */}
            {detail.latest_version?.model_file_path ? (
              <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]/40 p-3">
                <button
                  type="button"
                  className="flex items-center gap-2 text-sm text-blue-500 hover:underline"
                  onClick={() =>
                    handleDownload(
                      detail.latest_version!.model_file_path!,
                      detail.latest_version!.model_file_name ?? "model",
                    )
                  }
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Model : {detail.latest_version.model_file_name ?? "Unknown"}
                </button>
              </div>
            ) : null}

            <FileDropzone
              label="Model File"
              accept=".xls,.xlsx,.csv"
              file={modelFile}
              onFileChange={setModelFile}
              hint="Supports .xls/.xlsx/.csv"
            />
          </div>
        </section>

        {/* Version History Section */}
        <section className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--fg-secondary)]">
            Report Version History
          </h2>
          {detail.versions.length === 0 ? (
            <p className="text-sm text-[var(--fg-tertiary)]">No versions yet.</p>
          ) : (
            <div className="space-y-2">
              {detail.versions.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]/40 p-3 text-sm"
                >
                  <div className="flex items-center gap-2 text-[var(--fg-primary)]">
                    <span className="rounded bg-zinc-600 px-2 py-0.5 text-xs text-white">
                      v{item.version_no}
                    </span>
                    <span>Changed by {item.changed_by_name ?? `${item.changed_by.slice(0, 8)}...`}</span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--fg-tertiary)]">
                    {formatDateTime(item.changed_at)}
                  </div>
                  {item.word_file_path || item.model_file_path ? (
                    <div className="mt-2 space-y-1">
                      {item.word_file_path ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                          onClick={() => handleDownload(item.word_file_path!, item.word_file_name ?? "report")}
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {item.word_file_name ?? "Report File"}
                        </button>
                      ) : null}
                      {item.model_file_path ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                          onClick={() => handleDownload(item.model_file_path!, item.model_file_name ?? "model")}
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {item.model_file_name ?? "Model File"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Status History Section */}
        <section className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--fg-secondary)]">
            Report Status History
          </h2>
          {detail.status_logs.length === 0 ? (
            <p className="text-sm text-[var(--fg-tertiary)]">No history yet.</p>
          ) : (
            <div className="space-y-2">
              {detail.status_logs.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]/40 p-3 text-sm"
                >
                  <div className="flex items-center gap-2 text-[var(--fg-primary)]">
                    <span>{item.from_status}</span>
                    <span className="text-[var(--fg-tertiary)]">-&gt;</span>
                    <span>{item.to_status}</span>
                    <span className="rounded bg-zinc-600 px-2 py-0.5 text-xs text-white">
                      v{item.version_no}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-[var(--fg-tertiary)]">
                    {formatDateTime(item.action_at)} by{" "}
                    {item.action_by_name ?? `${item.action_by.slice(0, 8)}...`}
                  </div>
                  {item.reason ? (
                    <div className="mt-1 text-xs text-amber-300">
                      Note: {item.reason}
                    </div>
                  ) : null}
                  {item.word_file_path || item.model_file_path ? (
                    <div className="mt-2 space-y-1">
                      {item.word_file_path ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                          onClick={() => handleDownload(item.word_file_path!, item.word_file_name ?? "report")}
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {item.word_file_name ?? "Report File"}
                        </button>
                      ) : null}
                      {item.model_file_path ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-blue-500 hover:underline"
                          onClick={() => handleDownload(item.model_file_path!, item.model_file_name ?? "model")}
                        >
                          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {item.model_file_name ?? "Model File"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Link href="/report-review">
            <Button type="button" variant="secondary">
              Back to Review List
            </Button>
          </Link>
          <div className="flex gap-3">
            {detail.status === "submitted" && (
              <>
                <Input
                  label="Reject Note"
                  placeholder="Note is required when rejecting"
                  value={rejectReason}
                  onChange={(event) => setRejectReason(event.target.value)}
                  className="w-64"
                />
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => runAction("reject")}
                  isLoading={actionLoading}
                  disabled={!rejectReason.trim()}
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  onClick={() => runAction("approve")}
                  isLoading={actionLoading}
                >
                  Approve
                </Button>
              </>
            )}
            {detail.status === "rejected" && (
              <Button
                type="button"
                onClick={() => runAction("reopen")}
                isLoading={actionLoading}
              >
                Reopen to Draft
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
