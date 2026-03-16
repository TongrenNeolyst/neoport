import * as React from "react";

import { listCoveragesAction } from "../actions";
import { CoveragePageClient } from "./coverage-page-client";
import { listAllActiveSectors } from "@/features/sectors/repo/sectors-repo";
import { listAllActiveAnalysts } from "@/features/analyst-info/repo/analysts-repo";
import { listAllRegions } from "@/features/regions/repo/regions-repo";

export interface CoveragePageProps {
  searchParams: Promise<{
    page?: string;
    query?: string;
    sector_id?: string;
  }>;
  userRole: "admin" | "sa" | "analyst";
}

export async function CoveragePage({ searchParams, userRole }: CoveragePageProps) {
  const params = await searchParams;
  const page = Number(params.page ?? 1);
  const query = params.query ?? null;
  const sector_id = params.sector_id ?? null;

  const [coveragesResult, sectorsResult, analystsResult, regionsResult] = await Promise.all([
    listCoveragesAction({ page, query, sector_id }),
    listAllActiveSectors(),
    listAllActiveAnalysts(),
    listAllRegions(),
  ]);

  if (!coveragesResult.ok) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--fg-secondary)]">Failed to load coverages: {coveragesResult.error}</p>
      </div>
    );
  }

  const { items: coverages, total, page: currentPage, totalPages } = coveragesResult.data;
  const sectors = sectorsResult.ok ? sectorsResult.data : [];
  const analysts = analystsResult.ok ? analystsResult.data : [];
  const regions = regionsResult.ok ? regionsResult.data : [];

  return (
    <CoveragePageClient
      coverages={coverages}
      total={total}
      page={currentPage}
      totalPages={totalPages}
      currentQuery={query}
      currentSectorId={sector_id}
      sectors={sectors}
      analysts={analysts}
      regions={regions}
      userRole={userRole}
    />
  );
}
