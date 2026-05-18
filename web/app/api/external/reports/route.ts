import { NextRequest, NextResponse } from "next/server";

import {
  fetchNeolystPublishedReports,
  findLocalReportByNeolystId,
  upsertLocalReport,
  upsertLocalAnalystEmail,
  upsertLocalContactEmail,
  upsertLocalAttachments,
  addToLocalDistributionQueue,
  resolveAnalystDisplayNames,
} from "@/features/external-reports/repo/external-reports-repo";

/**
 * 从 Neolyst 拉取已发布的报告并同步到本地
 *
 * GET /api/external/reports?since=2024-01-01T00:00:00Z
 * - since: 可选，ISO 8601 时间戳。默认为 24 小时前。
 *   只同步 published_at >= since 的报告。
 *
 * 幂等：重复同步同一报告不会产生重复记录。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sinceParam = searchParams.get("since");

  let since: Date;
  if (sinceParam) {
    since = new Date(sinceParam);
    if (isNaN(since.getTime())) {
      return NextResponse.json(
        { error: "Invalid 'since' parameter. Must be ISO 8601 date string." },
        { status: 400 },
      );
    }
  } else {
    // 默认同步最近 24 小时
    since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  }

  const reportsResult = await fetchNeolystPublishedReports(since);
  if (!reportsResult.ok) {
    console.error("[sync] Failed to fetch from Neolyst:", reportsResult.error);
    return NextResponse.json(
      { error: `Failed to fetch from Neolyst: ${reportsResult.error}` },
      { status: 502 },
    );
  }

  const neolystReports = reportsResult.data;
  if (!neolystReports || neolystReports.length === 0) {
    return NextResponse.json({
      message: "No new published reports found.",
      synced: 0,
      skipped: 0,
    });
  }

  // 批量解析所有分析师的显示名
  const allEmails = [
    ...new Set(
      neolystReports.flatMap((r) => [
        r.lead_analyst_email,
        ...(r.analyst_emails ?? []),
      ].filter(Boolean)),
    ),
  ];
  const analystNameMap = await resolveAnalystDisplayNames(allEmails as string[]);

  const results = {
    synced: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const r of neolystReports) {
    // 1. 检查本地是否已存在（幂等）
    const existingResult = await findLocalReportByNeolystId(r.id);
    if (!existingResult.ok) {
      results.errors.push(`Report ${r.id}: check existing failed - ${existingResult.error}`);
      continue;
    }
    if (existingResult.data !== null) {
      results.skipped++;
      continue;
    }

    // 2. 解析分析师邮箱和姓名
    const emails = r.analyst_emails ?? [];
    const leadEmail = r.lead_analyst_email ?? emails[0] ?? null;
    const analystName = leadEmail
      ? (analystNameMap.get(leadEmail.toLowerCase()) ?? leadEmail)
      : null;

    // 3. 解析联系人（Neolyst 中 contact_person 直接是邮箱）
    let contactEmail: string | null = null;
    if (r.contact_person && r.contact_person.includes("@")) {
      contactEmail = r.contact_person.trim().toLowerCase();
    }

    // 4. 构建附件列表（原始路径，upsertLocalAttachments 内部处理下载/上传）
    const attachments = [];
    for (const path of [r.pdf_path, r.word_path, r.model_path]) {
      if (path) {
        attachments.push({ file_path: path, created_at: r.created_at });
      }
    }

    // 5. Upsert 主表（analyst 字段存分析师姓名）
    const upsertResult = await upsertLocalReport({
      neolyst_id: r.id,
      title: r.title,
      report_type: r.report_type,
      ticker: r.ticker,
      rating: r.rating,
      target_price: r.target_price ? Number(r.target_price) : null,
      sector: null,
      region: r.region_code,
      report_language: r.report_language,
      investment_thesis: r.investment_thesis,
      analyst: analystName,
      contact_person: r.contact_person,
      published_at: r.published_at ?? r.created_at,
    });

    if (!upsertResult.ok) {
      results.errors.push(
        `Report ${r.id} (${r.title}): upsert failed - ${upsertResult.error}`,
      );
      continue;
    }

    const localId = upsertResult.data;

    // 6. Upsert 分析师邮箱
    if (emails.length > 0) {
      const analystResult = await upsertLocalAnalystEmail(localId, emails);
      if (!analystResult.ok) {
        results.errors.push(
          `Report ${r.id}: analyst email upsert failed - ${analystResult.error}`,
        );
      }
    }

    // 7. Upsert 联系人邮箱
    if (contactEmail) {
      const contactResult = await upsertLocalContactEmail(localId, contactEmail);
      if (!contactResult.ok) {
        results.errors.push(
          `Report ${r.id}: contact email upsert failed - ${contactResult.error}`,
        );
      }
    }

    // 8. Upsert 附件
    if (attachments.length > 0) {
      const attResult = await upsertLocalAttachments(localId, attachments);
      if (!attResult.ok) {
        results.errors.push(
          `Report ${r.id}: attachments upsert failed - ${attResult.error}`,
        );
      }
    }

    // 9. 加入分发队列
    const queueResult = await addToLocalDistributionQueue(localId);
    if (!queueResult.ok) {
      results.errors.push(
        `Report ${r.id}: add to distribution queue failed - ${queueResult.error}`,
      );
    }

    results.synced++;
  }

  return NextResponse.json({
    message: `Sync completed. Since: ${since.toISOString()}`,
    synced: results.synced,
    skipped: results.skipped,
    errors: results.errors.length > 0 ? results.errors : undefined,
  });
}
