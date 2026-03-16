import * as React from "react";
import { notFound } from "next/navigation";

import { listAllActiveAnalysts } from "@/features/analyst-info/repo/analysts-repo";
import { listCoverages } from "@/features/coverage/repo/coverage-repo";
import { listAllRatings } from "@/features/ratings/repo/ratings-repo";
import { listAllRegions } from "@/features/regions/repo/regions-repo";
import { listAllActiveSectors } from "@/features/sectors/repo/sectors-repo";
import { listUsers } from "@/features/users/repo/users-admin-repo";

import { getReportDetailAction, listReportTypeOptionsAction } from "../actions";
import { EditReportPageClient } from "./edit-report-page-client";

export interface EditReportPageProps {
  params: Promise<{ id: string }>;
  userRole: "admin" | "analyst";
  currentUserId: string;
}

export async function EditReportPage({
  params,
  userRole,
  currentUserId,
}: EditReportPageProps) {
  const { id } = await params;

  const [detailResult, typesResult, analystsResult, regionsResult, sectorsResult, coveragesResult, ratingsResult] =
    await Promise.all([
      getReportDetailAction(id),
      listReportTypeOptionsAction(),
      listAllActiveAnalysts(),
      listAllRegions(),
      listAllActiveSectors(),
      listCoverages({ page: 1, query: null }),
      listAllRatings(),
    ]);

  const usersResult = await listUsers({ page: 1, query: null });

  if (!detailResult.ok) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-[var(--fg-secondary)]">
          Failed to load report: {detailResult.error}
        </p>
      </div>
    );
  }

  const report = detailResult.data;

  // Check permission: admin can edit draft/submitted, analyst can only edit own draft/submitted
  const canEdit =
    userRole === "admin" ||
    (userRole === "analyst" &&
      report.owner_user_id === currentUserId &&
      (report.status === "draft" || report.status === "submitted"));

  if (!canEdit) {
    notFound();
  }

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
    <EditReportPageClient
      report={report}
      userRole={userRole}
      currentUserId={currentUserId}
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
