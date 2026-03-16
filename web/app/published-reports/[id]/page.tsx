import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";
import {
  getPublishedReportDetailAction,
  getReportSignedUrlAction,
} from "@/features/published-reports";

export default async function PublishedReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    redirect("/403");
  }

  const resolvedParams = await params;
  const reportId = resolvedParams.id;

  const result = await getPublishedReportDetailAction(reportId);

  if (!result.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-[var(--bg-surface)] rounded-lg shadow p-8">
          <p className="text-[var(--fg-danger)]">{result.error}</p>
          <Link
            href="/published-reports"
            className="mt-4 inline-block text-[var(--fg-accent)] hover:underline"
          >
            Back to List
          </Link>
        </div>
      </div>
    );
  }

  const report = result.data;

  let pdfUrl: string | null = null;
  if (report.latest_version?.pdf_file_path) {
    const urlResult = await getReportSignedUrlAction(
      report.id,
      report.latest_version.pdf_file_path,
    );
    if (urlResult.ok) {
      pdfUrl = urlResult.data;
    }
  }

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const getReportTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      company: "Company",
      sector: "Sector",
      company_flash: "Company Flash",
      sector_flash: "Sector Flash",
      common: "Common",
    };
    return labels[type] ?? type;
  };

  const getAnalystNames = (): string => {
    const names = report.analysts
      .map((a) => a.analyst?.full_name ?? a.analyst?.chinese_name ?? "Unknown")
      .join(", ");
    return names || "-";
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/published-reports"
            className="text-[var(--fg-accent)] hover:underline inline-flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to List
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--fg-primary)]">{report.title}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
            <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
              Ticker
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
              {report.ticker ?? "-"}
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
            <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
              Report Type
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
              {getReportTypeLabel(report.report_type)}
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
            <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
              Analyst
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
              {getAnalystNames()}
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
            <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
              Published Date
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
              {formatDate(report.published_at)}
            </div>
          </div>
        </div>

        {(report.report_type === "company" || report.report_type === "company_flash") && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {report.rating && (
              <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
                <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
                  Rating
                </div>
                <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
                  {report.rating}
                </div>
              </div>
            )}
            {report.target_price && (
              <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
                <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
                  Target Price
                </div>
                <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
                  {report.target_price}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Investment Thesis */}
        {report.investment_thesis && (
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--fg-primary)] mb-4">Investment Thesis</h2>
            <div
              className="prose prose-sm max-w-none text-[var(--fg-secondary)]"
              style={{ fontFamily: "KaiTi, 'STKaiti', '楷体', '楷体GB_2312', Calibri, sans-serif" }}
              dangerouslySetInnerHTML={{ __html: report.investment_thesis }}
            />
          </div>
        )}

        {pdfUrl ? (
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-[var(--fg-primary)] mb-4">Report Attachment</h2>
            <a
              href={pdfUrl}
              download={report.latest_version?.pdf_file_name ?? "report.pdf"}
              className="inline-flex items-center gap-2 text-blue-600 hover:underline"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {report.latest_version?.pdf_file_name ?? "Download File"}
            </a>
          </div>
        ) : (
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-8 text-center">
            <p className="text-[var(--fg-tertiary)]">No PDF attachment available</p>
          </div>
        )}
      </div>
    </div>
  );
}
