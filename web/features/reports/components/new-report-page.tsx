import * as React from "react";

import { listAllActiveAnalysts } from "@/features/analyst-info/repo/analysts-repo";
import { listCoverages } from "@/features/coverage/repo/coverage-repo";
import { listAllRatings } from "@/features/ratings/repo/ratings-repo";
import { listAllRegions } from "@/features/regions/repo/regions-repo";
import { listAllActiveSectors } from "@/features/sectors/repo/sectors-repo";
import { listUsers } from "@/features/users/repo/users-admin-repo";

import { listReportTypeOptionsAction } from "../actions";
import { NewReportPageClient } from "./new-report-page-client";

export interface NewReportPageProps {
  userRole: "admin" | "analyst";
}

export async function NewReportPage({ userRole }: NewReportPageProps) {
  const [typesResult, analystsResult, regionsResult, sectorsResult, coveragesResult, ratingsResult] =
    await Promise.all([
      listReportTypeOptionsAction(),
      listAllActiveAnalysts(),
      listAllRegions(),
      listAllActiveSectors(),
      listCoverages({ page: 1, query: null }),
      listAllRatings(),
    ]);

  const usersResult = await listUsers({ page: 1, query: null });

  if (!typesResult.ok) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--fg-secondary)]">
          Failed to load report type options: {typesResult.error}
        </p>
      </div>
    );
  }

  return (
    <NewReportPageClient
      userRole={userRole}
      reportTypes={typesResult.data}
      analysts={analystsResult.ok ? analystsResult.data : []}
      regions={regionsResult.ok ? regionsResult.data : []}
      sectors={sectorsResult.ok ? sectorsResult.data : []}
      coverages={coveragesResult.ok ? coveragesResult.data.items : []}
      ratings={ratingsResult.ok ? ratingsResult.data : []}
      users={usersResult.items}
    />
  );
}
