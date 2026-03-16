import * as React from "react";

import { listAnalystsAction } from "../actions";
import { AnalystsPageClient } from "./analysts-page-client";

export interface AnalystsPageProps {
  searchParams: Promise<{
    page?: string;
    query?: string;
  }>;
}

export async function AnalystsPage({ searchParams }: AnalystsPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const query = params.query ?? null;

  const result = await listAnalystsAction({ page, query });

  if (!result.ok) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--fg-secondary)]">Failed to load analysts: {result.error}</p>
      </div>
    );
  }

  const { items: analysts, total, page: currentPage, totalPages } = result.data;

  return (
    <AnalystsPageClient
      analysts={analysts}
      total={total}
      page={currentPage}
      totalPages={totalPages}
      currentQuery={query}
    />
  );
}
