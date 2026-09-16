"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ExternalReport } from "@/features/external-reports";
import { knownReportTypes } from "@/domain/schemas/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";

export type PublishedReportsClientProps = {
  items: ExternalReport[];
  total: number;
  page: number;
  totalPages: number;
  roleLabel: string;
  filters: {
    title: string;
    ticker: string;
    reportType: string;
    analyst: string;
  };
};

const REPORT_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All types" },
  ...knownReportTypes.map((t) => ({ value: t, label: t })),
];

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getReportTypeLabel(type: string): string {
  return type.split("_").map(capitalize).join(" ");
}

function getLanguageLabel(lang: string | null): string {
  if (!lang) return "-";
  return lang === "zh" ? "Chinese" : lang === "en" ? "English" : lang;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function buildQueryString(params: {
  title: string;
  ticker: string;
  reportType: string;
  analyst: string;
  page: number;
}): string {
  const sp = new URLSearchParams();
  if (params.title.trim()) sp.set("title", params.title.trim());
  if (params.ticker.trim()) sp.set("ticker", params.ticker.trim());
  if (params.reportType) sp.set("type", params.reportType);
  if (params.analyst.trim()) sp.set("analyst", params.analyst.trim());
  if (params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function PublishedReportsClient({
  items,
  total,
  page,
  totalPages,
  roleLabel,
  filters,
}: PublishedReportsClientProps) {
  const router = useRouter();

  const [title, setTitle] = React.useState(filters.title);
  const [ticker, setTicker] = React.useState(filters.ticker);
  const [reportType, setReportType] = React.useState(filters.reportType);
  const [analyst, setAnalyst] = React.useState(filters.analyst);

  React.useEffect(() => {
    setTitle(filters.title);
    setTicker(filters.ticker);
    setReportType(filters.reportType);
    setAnalyst(filters.analyst);
  }, [filters.title, filters.ticker, filters.reportType, filters.analyst]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(
      `/published-reports${buildQueryString({
        title,
        ticker,
        reportType,
        analyst,
        page: 1,
      })}`,
    );
  }

  function handleReset() {
    setTitle("");
    setTicker("");
    setReportType("");
    setAnalyst("");
    router.push("/published-reports");
  }

  function handlePageChange(next: number) {
    router.push(
      `/published-reports${buildQueryString({
        title,
        ticker,
        reportType,
        analyst,
        page: next,
      })}`,
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--fg-primary)]">
            Published Reports
          </h1>
          <p className="text-sm text-[var(--fg-tertiary)] mt-1">{roleLabel}</p>
        </div>

        <form
          onSubmit={handleSearch}
          className="mb-6 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-subtle)] p-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              label="Title"
              placeholder="Search by title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              label="Ticker"
              placeholder="Search by ticker"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
            />
            <Select
              label="Type"
              options={REPORT_TYPE_OPTIONS}
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            />
            <Input
              label="Analyst"
              placeholder="Search by analyst"
              value={analyst}
              onChange={(e) => setAnalyst(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={handleReset}>
              Reset
            </Button>
            <Button type="submit">Search</Button>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-8 text-center">
            <p className="text-[var(--fg-tertiary)]">No published reports</p>
          </div>
        ) : (
          <>
            <div className="bg-[var(--bg-surface)] rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                <thead className="bg-[var(--bg-subtle)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider min-w-[300px]">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider w-20">
                      Ticker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider w-28">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider w-28">
                      Language
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider w-28">
                      Publish Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider w-32">
                      Analyst
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider w-20">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
                  {items.map((report) => (
                    <tr key={report.id} className="hover:bg-[var(--bg-surface-hover)]">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-[var(--fg-primary)]">
                          {report.title}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[var(--fg-secondary)]">
                          {report.ticker ?? "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[var(--fg-secondary)]">
                          {getReportTypeLabel(report.report_type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[var(--fg-secondary)]">
                          {getLanguageLabel(report.report_language)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[var(--fg-secondary)]">
                          {formatDate(report.published_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[var(--fg-secondary)]">
                          {report.analyst ?? "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link
                          href={`/published-reports/${report.id}`}
                          className="text-[var(--fg-accent)] hover:underline text-sm font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={handlePageChange}
              />
              <p className="mt-2 text-center text-sm text-[var(--fg-tertiary)]">
                {total} total
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}