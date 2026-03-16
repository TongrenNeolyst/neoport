"use server";

import { err, ok, type Result } from "@/lib/result";
import { requireAuth, getCurrentUserRole } from "@/lib/supabase/server";

import {
  listPublishedReports,
  getPublishedReportDetail,
  getReportSignedUrl,
  type PublishedReport,
  type PublishedReportDetail,
} from "./repo/published-reports-repo";

type Role = "admin" | "sa" | "analyst";

async function getActor(): Promise<
  Result<{ userId: string; role: Role }>
> {
  try {
    const user = await requireAuth();
    const role = user.app_metadata?.role as Role | undefined;
    if (role !== "admin" && role !== "sa" && role !== "analyst") {
      return err("No permission");
    }
    return ok({ userId: user.id, role });
  } catch (e) {
    return err("Unauthorized");
  }
}

export async function listPublishedReportsAction(input: {
  page?: number;
}): Promise<
  Result<{
    items: PublishedReport[];
    total: number;
    page: number;
    totalPages: number;
  }>
> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  const { userId, role } = actor.data;
  const page = Math.max(1, input.page ?? 1);

  const result = await listPublishedReports({
    page,
    userId,
    role,
  });

  if (!result.ok) {
    return result;
  }

  return ok({
    items: result.data.items,
    total: result.data.total,
    page: result.data.page,
    totalPages: result.data.totalPages,
  });
}

export async function getPublishedReportDetailAction(
  reportId: string,
): Promise<Result<PublishedReportDetail>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  const { userId, role } = actor.data;

  return getPublishedReportDetail(reportId, userId, role);
}

export async function getReportSignedUrlAction(
  reportId: string,
  filePath: string,
): Promise<Result<string>> {
  const actor = await getActor();
  if (!actor.ok) {
    return actor;
  }

  return getReportSignedUrl(reportId, filePath);
}
