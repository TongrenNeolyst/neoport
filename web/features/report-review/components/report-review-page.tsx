import * as React from "react";

import { listReviewReportsAction } from "../actions";
import { ReportReviewPageClient } from "./report-review-page-client";

export interface ReportReviewPageProps {
  searchParams: Promise<{
    page?: string;
    query?: string;
    status?: string;
  }>;
}

const VALID_STATUS = new Set(["all", "submitted", "published", "rejected"]);

export async function ReportReviewPage({ searchParams }: ReportReviewPageProps) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const query = params.query?.trim() || null;
  const status = VALID_STATUS.has(params.status ?? "")
    ? (params.status as "all" | "submitted" | "published" | "rejected")
    : "all";

  const listResult = await listReviewReportsAction({
    page,
    query,
    status,
  });

  if (!listResult.ok) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--fg-secondary)]">
          Failed to load review reports: {listResult.error}
        </p>
      </div>
    );
  }

  return (
    <ReportReviewPageClient
      reports={listResult.data.items}
      total={listResult.data.total}
      page={listResult.data.page}
      totalPages={listResult.data.totalPages}
      currentQuery={query}
      currentStatus={listResult.data.applied_status}
    />
  );
}
