"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Table, TD, TH, THead, TR } from "@/components/ui/table";
import type { ReportStatus } from "@/domain/schemas/report";
import type { ReportSummary } from "@/features/reports/repo/reports-repo";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "published", label: "Published" },
  { value: "rejected", label: "Rejected" },
];

function statusTone(
  status: ReportStatus,
): "secondary" | "blue" | "green" | "red" {
  if (status === "draft") return "secondary";
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

export interface ReportsPageClientProps {
  reports: ReportSummary[];
  total: number;
  page: number;
  totalPages: number;
  currentQuery: string | null;
  currentStatus: ReportStatus | null;
  userRole: "admin" | "sa" | "analyst";
  currentUserId: string;
}

export function ReportsPageClient({
  reports,
  total,
  page,
  totalPages,
  currentQuery,
  currentStatus,
  userRole,
  currentUserId,
}: ReportsPageClientProps) {
  const router = useRouter();

  const canCreate = userRole === "admin" || userRole === "analyst";
  const [queryDraft, setQueryDraft] = React.useState(currentQuery ?? "");
  const defaultStatus = "all";
  const [statusFilter, setStatusFilter] = React.useState<string | null>(
    currentStatus ?? defaultStatus,
  );

  React.useEffect(() => {
    setQueryDraft(currentQuery ?? "");
    setStatusFilter(currentStatus ?? "all");
  }, [currentQuery, currentStatus]);

  function goToPage(nextPage: number) {
    router.push(
      `/reports${toQueryString({ q: queryDraft, status: statusFilter || "all", page: nextPage })}`,
    );
  }

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    goToPage(1);
  }

  function onStatusChange(value: string) {
    setStatusFilter(value as ReportStatus | "all");
    router.push(
      `/reports${toQueryString({ q: queryDraft, status: value, page: 1 })}`,
    );
  }

  function canEditReport(
    report: Pick<ReportSummary, "owner_user_id" | "status">,
  ): boolean {
    if (userRole === "admin") {
      return report.status === "draft" || report.status === "submitted";
    }
    if (userRole === "analyst") {
      return (
        report.owner_user_id === currentUserId &&
        (report.status === "draft" || report.status === "submitted")
      );
    }
    return false;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/60 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-xl font-semibold text-[var(--fg-primary)]">
            Analyst Revise
          </div>
          {canCreate ? (
            <Link
              href="/reports/new"
              className="inline-flex items-center justify-center rounded-[6px] bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60"
            >
              Add Report
            </Link>
          ) : (
            <div />
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-4 px-6 py-8">
        <div className="flex items-end justify-between gap-4">
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
                value={statusFilter ?? "all"}
                onChange={(event) => onStatusChange(event.target.value)}
                options={STATUS_OPTIONS}
              />
            </div>
          </form>
        </div>

        <Table>
          <THead>
            <TR>
              <TH className="w-full">Title</TH>
              <TH className="whitespace-nowrap">Type</TH>
              <TH className="whitespace-nowrap">Status</TH>
              <TH className="whitespace-nowrap">Owner</TH>
              <TH className="whitespace-nowrap">Updated</TH>
              <TH className="text-right">Actions</TH>
            </TR>
          </THead>
          <tbody>
            {reports.length === 0 ? (
              <TR>
                <TD colSpan={6} className="py-10 text-center text-[var(--fg-secondary)]">
                  No reports found.
                </TD>
              </TR>
            ) : (
              reports.map((report) => (
                <TR key={report.id}>
                  <TD className="font-medium text-[var(--fg-primary)]">{report.title}</TD>
                  <TD className="text-[var(--fg-secondary)]">{report.report_type}</TD>
                  <TD>
                    <Badge tone={statusTone(report.status)}>
                      {report.status}
                    </Badge>
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {report.owner_user_id === currentUserId
                      ? "Me"
                      : report.owner_name ?? `${report.owner_user_id.slice(0, 8)}...`}
                  </TD>
                  <TD className="text-[var(--fg-secondary)]">
                    {formatDateTime(report.updated_at)}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      <Link href={`/reports/${report.id}/edit`}>
                        <Button variant="outline" className="h-7 px-2 text-xs">
                          {canEditReport(report) ? "Edit" : "View"}
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
    </div>
  );
}
