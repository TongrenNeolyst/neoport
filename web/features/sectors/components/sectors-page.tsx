import * as React from "react";

import { listSectorsAction } from "../actions";
import { SectorsPageClient } from "./sectors-page-client";

export interface SectorsPageProps {
  searchParams: Promise<{
    page?: string;
    query?: string;
    level?: string;
  }>;
}

export async function SectorsPage({ searchParams }: SectorsPageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const query = params.query ?? null;
  const level = params.level === "1" || params.level === "2" ? Number(params.level) as 1 | 2 : undefined;

  const result = await listSectorsAction({ page, query, level });

  if (!result.ok) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--fg-secondary)]">Failed to load sectors: {result.error}</p>
      </div>
    );
  }

  const { items: sectors, total, page: currentPage, totalPages } = result.data;

  return (
    <SectorsPageClient
      sectors={sectors}
      total={total}
      page={currentPage}
      totalPages={totalPages}
      currentQuery={query}
      currentLevel={level}
    />
  );
}
