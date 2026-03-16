import { redirect } from "next/navigation";
import Link from "next/link";

import { getCurrentUser, getCurrentUserRole } from "@/lib/supabase/server";
import { listPublishedReportsAction, type PublishedReport } from "@/features/published-reports";

export default async function PublishedReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const role = await getCurrentUserRole();
  if (role !== "admin" && role !== "sa" && role !== "analyst") {
    redirect("/403");
  }

  const resolvedSearchParams = await searchParams;
  const page = parseInt(resolvedSearchParams.page ?? "1", 10);

  const result = await listPublishedReportsAction({ page });

  const reports: PublishedReport[] = result.ok ? result.data.items : [];
  const total = result.ok ? result.data.total : 0;
  const totalPages = result.ok ? result.data.totalPages : 1;

  const getAnalystNames = (report: PublishedReport): string => {
    const names = report.analysts
      .slice(0, 2)
      .map((a) => a.analyst?.full_name ?? a.analyst?.chinese_name ?? "Unknown")
      .join(", ");
    if (report.analysts.length > 2) {
      return `${names} +${report.analysts.length - 2}`;
    }
    return names;
  };

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

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--fg-primary)]">Published Reports</h1>
          <p className="text-sm text-[var(--fg-tertiary)] mt-1">
            {role === "analyst"
              ? "Reports you submitted or are assigned to"
              : "All published reports"}
          </p>
        </div>

        {reports.length === 0 ? (
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
                      Publish Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider w-40">
                      Analyst
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-[var(--fg-tertiary)] uppercase tracking-wider w-20">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[var(--bg-surface)] divide-y divide-[var(--border-subtle)]">
                  {reports.map((report) => (
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
                          {formatDate(report.published_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-[var(--fg-secondary)]">
                          {getAnalystNames(report)}
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

            {totalPages > 1 && (
              <div className="mt-4 flex justify-center gap-2">
                {page > 1 && (
                  <Link
                    href={`/published-reports?page=${page - 1}`}
                    className="px-4 py-2 border border-[var(--border-default)] rounded-md text-sm font-medium text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-hover)]"
                  >
                    Previous
                  </Link>
                )}
                <span className="px-4 py-2 text-sm text-[var(--fg-tertiary)]">
                  Page {page} of {totalPages} ({total} total)
                </span>
                {page < totalPages && (
                  <Link
                    href={`/published-reports?page=${page + 1}`}
                    className="px-4 py-2 border border-[var(--border-default)] rounded-md text-sm font-medium text-[var(--fg-secondary)] hover:bg-[var(--bg-surface-hover)]"
                  >
                    Next
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
