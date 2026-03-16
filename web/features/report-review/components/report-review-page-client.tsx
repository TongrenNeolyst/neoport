"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { getReportDownloadUrlAction } from "@/features/reports/actions";
import type {
  ReportDetail,
  ReportSummary,
} from "@/features/reports/repo/reports-repo";

import { executeReviewAction, getReviewReportDetailAction } from "../actions";

export interface ReportReviewPageClientProps {
  reports: ReportSummary[];
  total: number;
  page: number;
  totalPages: number;
  currentQuery: string | null;
  currentStatus: "all" | "submitted" | "published" | "rejected";
}

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "submitted", label: "Submitted" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

function statusTone(status: string): "blue" | "green" | "red" {
  if (status === "submitted") return "blue";
  if (status === "published") return "green";
  return "red";
}

function toQueryString(params: { q: string; status: string; page: number }) {
  const sp = new URLSearchParams();
  if (params.q.trim()) {
    sp.set("query", params.q.trim());
  }
  if (params.status && params.status !== "all") {
    sp.set("status", params.status);
  }
  if (params.page > 1) {
    sp.set("page", String(params.page));
  }
  const value = sp.toString();
  return value ? `?${value}` : "";
}

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

export function ReportReviewPageClient({
  reports,
  total,
  page,
  totalPages,
  currentQuery,
  currentStatus,
}: ReportReviewPageClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [queryDraft, setQueryDraft] = React.useState(currentQuery ?? "");
  const [statusFilter, setStatusFilter] = React.useState(currentStatus);

  React.useEffect(() => {
    setQueryDraft(currentQuery ?? "");
    setStatusFilter(currentStatus);
  }, [currentQuery, currentStatus]);

  const [detailOpen, setDetailOpen] = React.useState(false);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [detail, setDetail] = React.useState<ReportDetail | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  function goToPage(nextPage: number) {
    router.push(
      `/report-review${toQueryString({
        q: queryDraft,
        status: statusFilter,
        page: nextPage,
      })}`,
    );
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    goToPage(1);
  }

  function onStatusChange(value: "all" | "submitted" | "published" | "rejected") {
    setStatusFilter(value);
    router.push(
      `/report-review${toQueryString({ q: queryDraft, status: value, page: 1 })}`,
    );
  }

  async function openDetail(reportId: string) {
    setDetailOpen(true);
    setDetailLoading(true);
    setRejectReason("");

    const result = await getReviewReportDetailAction(reportId);
    setDetailLoading(false);

    if (!result.ok) {
      toast.error(result.error, { title: "Error" });
      setDetailOpen(false);
      return;
    }

    setDetail(result.data);
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
      router.push("/report-review");
      return;
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div>
            <div className="text-xl font-semibold text-[var(--fg-primary)]">
              Quality Review
            </div>
            <div className="text-xs text-[var(--fg-secondary)]">Total {total}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-8">
        <div className="flex items-end gap-4">
          <form className="flex flex-1 gap-4" onSubmit={submitSearch}>
            <div className="w-full max-w-md">
              <Input
                label="Search"
                placeholder="Search by title"
                value={queryDraft}
                onChange={(event) => setQueryDraft(event.target.value)}
              />
            </div>
            <div className="w-56">
              <Select
                label="Status"
                value={statusFilter}
                onChange={(event) =>
                  onStatusChange(
                    event.target.value as
                      | "all"
                      | "submitted"
                      | "published"
                      | "rejected",
                  )
                }
                options={FILTER_OPTIONS}
              />
            </div>
          </form>
        </div>

        <Table>
          <THead>
            <TR>
              <TH className="w-full">Title</TH>
              <TH className="whitespace-nowrap">Status</TH>
              <TH className="whitespace-nowrap">Owner</TH>
              <TH className="whitespace-nowrap">Updated</TH>
              <TH className="text-right">Action</TH>
            </TR>
          </THead>
          <tbody>
            {reports.length === 0 ? (
              <TR>
                <TD colSpan={5} className="py-10 text-center text-[var(--fg-secondary)]">
                  No reports found.
                </TD>
              </TR>
            ) : (
              reports.map((report) => (
                <TR key={report.id}>
                  <TD className="font-medium text-[var(--fg-primary)]">{report.title}</TD>
                  <TD>
                    <Badge tone={statusTone(report.status)}>
                      {report.status}
                    </Badge>
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">{report.owner_name ?? `${report.owner_user_id.slice(0, 8)}...`}</TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {formatDateTime(report.updated_at)}
                  </TD>
                  <TD>
                    <div className="flex justify-end">
                      <Link href={`/report-review/${report.id}`}>
                        <Button type="button" variant="secondary">
                          Review
                        </Button>
                      </Link>
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </tbody>
        </Table>

        <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
      </main>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title="Review Report"
        className="max-w-5xl"
        footer={
          <>
            <Button
              variant="ghost"
              type="button"
              onClick={() => setDetailOpen(false)}
            >
              Close
            </Button>
            {detail?.status === "submitted" ? (
              <>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => runAction("reject")}
                  isLoading={actionLoading}
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
            ) : null}
            {detail?.status === "rejected" ? (
              <Button
                type="button"
                onClick={() => runAction("reopen")}
                isLoading={actionLoading}
              >
                Reopen to Draft
              </Button>
            ) : null}
          </>
        }
      >
        {detailLoading ? (
          <div className="py-8 text-center text-[var(--fg-secondary)]">
            Loading detail...
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 p-4">
              <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div>
                  <span className="text-[var(--fg-tertiary)]">Title:</span>{" "}
                  <span className="text-[var(--fg-primary)]">{detail.title}</span>
                </div>
                <div>
                  <span className="text-[var(--fg-tertiary)]">Type:</span>{" "}
                  <span className="text-[var(--fg-primary)]">{detail.report_type}</span>
                </div>
                <div>
                  <span className="text-[var(--fg-tertiary)]">Status:</span>{" "}
                  <Badge tone={statusTone(detail.status)}>
                    {detail.status}
                  </Badge>
                </div>
                <div>
                  <span className="text-[var(--fg-tertiary)]">Version:</span>{" "}
                  <span className="text-[var(--fg-primary)]">
                    v{detail.current_version_no}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 p-4">
              <div className="mb-2 text-sm font-medium text-[var(--fg-primary)]">
                Files
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]/40 p-3 text-sm text-[var(--fg-secondary)]">
                  <div className="mb-1 text-xs text-[var(--fg-tertiary)]">Report</div>
                  {detail.latest_version?.word_file_path ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        handleDownload(detail.latest_version!.word_file_path!)
                      }
                    >
                      Download
                    </Button>
                  ) : (
                    <span className="text-[var(--fg-tertiary)]">No file</span>
                  )}
                </div>
                <div className="rounded-[8px] border border-[var(--border-subtle)] bg-[var(--bg-surface-hover)]/40 p-3 text-sm text-[var(--fg-secondary)]">
                  <div className="mb-1 text-xs text-[var(--fg-tertiary)]">Model</div>
                  {detail.latest_version?.model_file_path ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() =>
                        handleDownload(detail.latest_version!.model_file_path!)
                      }
                    >
                      Download
                    </Button>
                  ) : (
                    <span className="text-[var(--fg-tertiary)]">No file</span>
                  )}
                </div>
              </div>
            </div>

            {detail.status === "submitted" ? (
              <Input
                label="Reject Note"
                placeholder="Note is required when rejecting"
                value={rejectReason}
                onChange={(event) => setRejectReason(event.target.value)}
              />
            ) : null}

            {/* Version History Section */}
            <div className="space-y-2 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 p-4">
              <div className="text-sm font-medium text-[var(--fg-primary)]">
                Report Version History
              </div>
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
            </div>

            {/* Status History Section */}
            <div className="space-y-2 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]/70 p-4">
              <div className="text-sm font-medium text-[var(--fg-primary)]">
                Report Status History
              </div>
              {detail.status_logs.length === 0 ? (
                <p className="text-sm text-[var(--fg-tertiary)]">No history.</p>
              ) : (
                detail.status_logs.map((item) => (
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
                ))
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
