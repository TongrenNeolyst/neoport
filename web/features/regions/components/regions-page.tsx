import * as React from "react";

import { listRegionsAction } from "../actions";
import { RegionsPageClient } from "./regions-page-client";

export interface RegionsPageProps {
  searchParams: Promise<{
    page?: string;
    query?: string;
  }>;
}

export async function RegionsPage({ searchParams }: RegionsPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const query = params.query ?? null;

  const result = await listRegionsAction({ page, query });

  if (!result.ok) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--fg-secondary)]">Failed to load regions: {result.error}</p>
      </div>
    );
  }

  const { items: regions, total, page: currentPage, totalPages } = result.data;

  return (
    <RegionsPageClient
      regions={regions}
      total={total}
      page={currentPage}
      totalPages={totalPages}
      currentQuery={query}
    />
  );
}
