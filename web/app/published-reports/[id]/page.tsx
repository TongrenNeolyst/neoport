import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";
import {
  getExternalReportDetailAction,
  getExternalReportSignedUrlAction,
} from "@/features/external-reports";

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

  const result = await getExternalReportDetailAction(reportId);

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

  // Get signed URLs for all attachments
  const attachmentsWithUrls = await Promise.all(
    report.attachments.map(async (att) => {
      const urlResult = await getExternalReportSignedUrlAction(att.file_path);
      return {
        ...att,
        signedUrl: urlResult.ok ? urlResult.data : null,
      };
    }),
  );

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const capitalize = (s: string): string =>
    s.charAt(0).toUpperCase() + s.slice(1);

  const getReportTypeLabel = (type: string): string =>
    type.split("_").map(capitalize).join(" ");

  const getLanguageLabel = (lang: string | null): string => {
    if (!lang) return "-";
    return lang === "zh" ? "Chinese" : lang === "en" ? "English" : lang;
  };

  const getRatingBadge = (rating: string | null) => {
    if (!rating) return null;
    const colors: Record<string, string> = {
      buy: "bg-green-100 text-green-800",
      hold: "bg-yellow-100 text-yellow-800",
      sell: "bg-red-100 text-red-800",
      outperform: "bg-green-100 text-green-800",
      neutral: "bg-yellow-100 text-yellow-800",
      underperform: "bg-red-100 text-red-800",
    };
    const color = colors[rating.toLowerCase()] ?? "bg-gray-100 text-gray-800";
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${color}`}>
        {rating}
      </span>
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
          <div className="mt-2 flex flex-wrap gap-2">
            {report.rating && getRatingBadge(report.rating)}
            {report.report_language && (
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {getLanguageLabel(report.report_language)}
              </span>
            )}
            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
              {getReportTypeLabel(report.report_type)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
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
              Rating
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
              {report.rating ?? "-"}
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
            <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
              Target Price
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
              {report.target_price ?? "-"}
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
            <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
              Sector
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
              {report.sector ?? "-"}
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
            <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
              Region
            </div>
            <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
              {report.region ?? "-"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
            <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
              Analyst
            </div>
            <div className="mt-1 text-sm text-[var(--fg-primary)] space-y-1">
              {report.analyst
                ? report.analyst.split(",").map((name, i) => (
                    <div key={i}>
                      {name.trim()} {report.analyst_emails[i] ? `<${report.analyst_emails[i]}>` : ""}
                    </div>
                  ))
                : report.analyst_emails.map((email) => <div key={email}>{email}</div>)}
            </div>
          </div>
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4">
            <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
              Contact Person
            </div>
            <div className="mt-1 text-sm text-[var(--fg-primary)]">
              {report.contact_person ?? "-"}
            </div>
            {report.contact_emails.length > 0 && (
              <div className="mt-1 text-xs text-[var(--fg-tertiary)]">
                {report.contact_emails.join(", ")}
              </div>
            )}
          </div>
        </div>

        {/* Published Date */}
        <div className="bg-[var(--bg-surface)] rounded-lg shadow p-4 mb-6">
          <div className="text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider">
            Published Date
          </div>
          <div className="mt-1 text-lg font-semibold text-[var(--fg-primary)]">
            {formatDate(report.published_at)}
          </div>
        </div>

        {/* Investment Thesis */}
        {report.investment_thesis && (
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--fg-primary)] mb-4">Investment Thesis</h2>
            <div
              className="prose prose-sm max-w-none text-[var(--fg-secondary)]"
              dangerouslySetInnerHTML={{ __html: report.investment_thesis }}
            />
          </div>
        )}

        {/* Attachments */}
        {attachmentsWithUrls.length > 0 ? (
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-[var(--fg-primary)] mb-4">
              Attachments ({attachmentsWithUrls.length})
            </h2>
            <div className="space-y-3">
              {attachmentsWithUrls.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-3 border border-[var(--border-subtle)] rounded-lg hover:bg-[var(--bg-subtle)]"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-[var(--fg-tertiary)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <div>
                      <div className="text-sm font-medium text-[var(--fg-primary)]">
                        {att.original_name}
                      </div>
                      <div className="text-xs text-[var(--fg-tertiary)]">
                        {formatFileSize(att.file_size)} · {att.mime_type}
                      </div>
                    </div>
                  </div>
                  {att.signedUrl ? (
                    <a
                      href={att.signedUrl}
                      className="text-[var(--fg-accent)] hover:underline text-sm font-medium"
                      target="_blank"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-xs text-[var(--fg-tertiary)]">Unavailable</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-[var(--bg-surface)] rounded-lg shadow p-8 text-center">
            <p className="text-[var(--fg-tertiary)]">No attachments</p>
          </div>
        )}
      </div>
    </div>
  );
}
