"use server";

import { revalidatePath } from "next/cache";

import {
  reportReviewActionSchema,
  reportSaveSchema,
  reportSubmitSchema,
  type ReportStatus,
} from "@/domain/schemas/report";
import { err, type Result } from "@/lib/result";
import { requireAuth } from "@/lib/supabase/server";

import {
  approveReport,
  getReviewReportDetail,
  listReviewReports,
  rejectReport,
  reopenReport,
  saveReviewReportContent,
} from "./repo/report-review-repo";

type ReviewFilterStatus = "all" | "submitted" | "published" | "rejected";
type Role = "admin" | "sa" | "analyst";

async function getReviewerActor(): Promise<
  Result<{ user: Awaited<ReturnType<typeof requireAuth>>; role: Role }>
> {
  try {
    const user = await requireAuth();
    const role = user.app_metadata?.role as Role | undefined;
    if (role !== "admin" && role !== "sa" && role !== "analyst") {
      return err("No permission");
    }
    return { ok: true, data: { user, role } };
  } catch {
    return err("Unauthorized");
  }
}

function ensureReviewerRole(role: Role): Result<null> {
  if (role !== "admin" && role !== "sa") {
    return err("No permission");
  }
  return { ok: true, data: null };
}

export async function listReviewReportsAction(input: {
  page?: number;
  query?: string | null;
  status?: ReviewFilterStatus | null;
}): Promise<
  Result<{
    items: Awaited<ReturnType<typeof listReviewReports>> extends Result<infer T>
      ? T extends { items: infer U }
        ? U
        : never
      : never;
    total: number;
    page: number;
    totalPages: number;
    applied_status: ReviewFilterStatus;
  }>
> {
  const actor = await getReviewerActor();
  if (!actor.ok) {
    return actor;
  }

  const roleCheck = ensureReviewerRole(actor.data.role);
  if (!roleCheck.ok) {
    return roleCheck;
  }

  const page = Math.max(1, input.page ?? 1);
  const query = input.query ?? null;
  const status = input.status ?? "all";

  const result = await listReviewReports({ page, query, status });
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    data: {
      ...result.data,
      applied_status: status,
    },
  };
}

export async function getReviewReportDetailAction(
  reportId: string,
): Promise<Result<Awaited<ReturnType<typeof getReviewReportDetail>> extends Result<infer T> ? T : never>> {
  const actor = await getReviewerActor();
  if (!actor.ok) {
    return actor;
  }

  const roleCheck = ensureReviewerRole(actor.data.role);
  if (!roleCheck.ok) {
    return roleCheck;
  }

  return getReviewReportDetail(reportId);
}

function validateStatusTransition(
  currentStatus: ReportStatus,
  action: "approve" | "reject" | "reopen",
): Result<null> {
  if (action === "approve" || action === "reject") {
    if (currentStatus !== "submitted") {
      return err("Only submitted reports can be approved or rejected.");
    }
    return { ok: true, data: null };
  }

  if (action === "reopen" && currentStatus !== "rejected") {
    return err("Only rejected reports can be reopened.");
  }

  return { ok: true, data: null };
}

export async function executeReviewAction(input: unknown): Promise<Result<Awaited<ReturnType<typeof getReviewReportDetail>> extends Result<infer T> ? T : never>> {
  const actor = await getReviewerActor();
  if (!actor.ok) {
    return actor;
  }

  const roleCheck = ensureReviewerRole(actor.data.role);
  if (!roleCheck.ok) {
    return roleCheck;
  }

  const parsed = reportReviewActionSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const detailResult = await getReviewReportDetail(parsed.data.report_id);
  if (!detailResult.ok) {
    return detailResult;
  }

  const statusCheck = validateStatusTransition(
    detailResult.data.status,
    parsed.data.action,
  );
  if (!statusCheck.ok) {
    return statusCheck;
  }

  const actionBy = actor.data.user.id;
  const actionResult =
    parsed.data.action === "approve"
      ? await approveReport({ report_id: parsed.data.report_id, action_by: actionBy })
      : parsed.data.action === "reject"
        ? await rejectReport({
            report_id: parsed.data.report_id,
            action_by: actionBy,
            reason: parsed.data.reason,
          })
        : await reopenReport({ report_id: parsed.data.report_id, action_by: actionBy });

  if (actionResult.ok) {
    revalidatePath("/report-review");
    revalidatePath("/reports");
  }

  return actionResult;
}

export async function getReviewReportAction(input: unknown): Promise<Result<Awaited<ReturnType<typeof getReviewReportDetail>> extends Result<infer T> ? T : never>> {
  const parsed = reportSubmitSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  return getReviewReportDetailAction(parsed.data.report_id);
}

export async function saveReviewReportAction(input: unknown): Promise<Result<Awaited<ReturnType<typeof getReviewReportDetail>> extends Result<infer T> ? T : never>> {
  const actor = await getReviewerActor();
  if (!actor.ok) {
    return actor;
  }

  const roleCheck = ensureReviewerRole(actor.data.role);
  if (!roleCheck.ok) {
    return roleCheck;
  }

  const parsed = reportSaveSchema.safeParse(input);
  if (!parsed.success) {
    return err(parsed.error.issues[0]?.message ?? "Invalid input.");
  }

  const result = await saveReviewReportContent({
    ...parsed.data,
    changed_by: actor.data.user.id,
  });

  if (result.ok) {
    revalidatePath("/report-review");
    revalidatePath("/reports");
  }

  return result;
}
