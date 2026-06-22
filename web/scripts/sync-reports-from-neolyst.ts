/**
 * 从 Neolyst 同步已发布报告到本地数据库
 * 用法: npx tsx --env-file=.env scripts/sync-reports-from-neolyst.ts
 *
 * 支持两种运行模式：
 *   1. 定时模式（默认）：同步最近 5 分钟内发布的报告，持续轮询
 *   2. 全量模式：传入 --full 参数，同步指定时间以来的所有报告（用于初始化）
 *
 * 示例（Windows 任务计划程序 / cron）：
 *   每 5 分钟执行一次，指向 .env：
 *   npx tsx --env-file=.env scripts/sync-reports-from-neolyst.ts
 *
 *   初始化全量同步（过去 30 天）：
 *   npx tsx --env-file=.env scripts/sync-reports-from-neolyst.ts --full --since-days=30
 */
import { createClient } from "@supabase/supabase-js";

// ===== 配置 =====
const LOCAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const LOCAL_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NEOLYST_URL = process.env.NEOLYST_SUPABASE_URL!;
const NEOLYST_KEY = process.env.NEOLYST_SUPABASE_SERVICE_ROLE_KEY!;

const localClient = createClient(LOCAL_URL, LOCAL_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const neolystClient = createClient(NEOLYST_URL, NEOLYST_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const LOCAL_BUCKET = "external-reports";

// ===== 类型 =====
interface NeolystReport {
  id: string;
  title: string;
  report_type: string;
  report_language: string | null;
  status: string;
  lead_analyst_email: string;
  analyst_emails: string[] | null;
  contact_person: string | null;
  coverage_id: string | null;
  ticker: string | null;
  sector_id: string | null;
  region_code: string | null;
  rating: string | null;
  target_price: number | null;
  investment_thesis: string | null;
  word_path: string | null;
  pdf_path: string | null;
  model_path: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

// ===== MIME 类型 =====
function getMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return mimeTypes[ext ?? ""] ?? "application/octet-stream";
}

// ===== 从 Neolyst Storage 下载并上传到本地 Storage =====
async function downloadFromNeolyst(neolystPath: string): Promise<Buffer | null> {
  const { data, error } = await neolystClient.storage
    .from("reports")
    .download(neolystPath);

  if (error || !data) {
    console.warn(`[sync] Failed to download from Neolyst ${neolystPath}: ${error?.message ?? "unknown"}`);
    return null;
  }

  return Buffer.from(await data.arrayBuffer());
}

async function uploadToLocal(localPath: string, content: Buffer, mimeType: string): Promise<string | null> {
  const { error } = await localClient.storage
    .from(LOCAL_BUCKET)
    .upload(localPath, content, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.warn(`[sync] Failed to upload to local ${localPath}: ${error.message}`);
    return null;
  }

  return localPath;
}

// ===== 检查本地 Storage 是否已有该文件（幂等：避免重复下载/上传）=====
async function fileExistsInLocal(localPath: string): Promise<boolean> {
  const { error } = await localClient.storage.from(LOCAL_BUCKET).info(localPath);
  return !error;
}

// ===== 从 Neolyst 获取已发布报告 =====
async function fetchNeolystReports(since: Date): Promise<NeolystReport[]> {
  const { data, error } = await neolystClient
    .from("report")
    .select("*")
    .eq("status", "published")
    .gte("published_at", since.toISOString())
    .order("published_at", { ascending: true });

  if (error) {
    throw new Error(`Neolyst query failed: ${error.message}`);
  }

  return (data as unknown as NeolystReport[]) ?? [];
}

// ===== 批量获取分析师姓名 =====
async function resolveAnalystNames(
  emails: string[],
): Promise<Map<string, string>> {
  if (emails.length === 0) return new Map();

  const { data } = await neolystClient
    .from("analyst")
    .select("email, chinese_name, english_name")
    .in("email", emails.map((e) => e.toLowerCase()));

  const map = new Map<string, string>();
  for (const a of data ?? []) {
    const name = a.chinese_name || a.english_name || a.email;
    map.set(a.email.toLowerCase(), name);
  }
  return map;
}

// ===== 批量获取联系人姓名（按邮箱查 analyst 表）=====
async function resolveContactPersonNames(
  emails: (string | null)[],
): Promise<Map<string, string>> {
  const validEmails = emails.filter((e): e is string => Boolean(e));
  if (validEmails.length === 0) return new Map();

  const { data } = await neolystClient
    .from("analyst")
    .select("email, chinese_name, english_name")
    .in("email", validEmails.map((e) => e.toLowerCase()));

  const map = new Map<string, string>();
  for (const a of data ?? []) {
    const name = a.chinese_name || a.english_name || a.email;
    map.set(a.email.toLowerCase(), name);
  }
  return map;
}

// ===== 批量获取行业名称（按 sector_id 查 sector 表）=====
async function resolveSectorNames(
  sectorIds: (string | null)[],
): Promise<Map<string, string>> {
  const validIds = sectorIds.filter((id): id is string => Boolean(id));
  if (validIds.length === 0) return new Map();

  const { data } = await neolystClient
    .from("sector")
    .select("id, name_cn, wind_name")
    .in("id", validIds);

  const map = new Map<string, string>();
  for (const s of data ?? []) {
    // 优先用 wind_name（与同花顺/Wind 渠道对齐），缺失时回退到 name_cn
    map.set(s.id, s.wind_name || s.name_cn || "");
  }
  return map;
}

// ===== 检查本地是否已存在 =====
async function findLocalByNeolystId(neolystId: string): Promise<string | null> {
  const { data } = await localClient
    .from("reports")
    .select("id")
    .eq("external_id", neolystId)
    .single();

  return data?.id ?? null;
}

// ===== Upsert 主表 =====
async function upsertReport(
  report: NeolystReport,
  analystName: string | null,
  contactPersonName: string | null,
  sectorName: string | null,
): Promise<string> {
  const { data, error } = await localClient
    .from("reports")
    .upsert(
      {
        external_id: report.id,
        title: report.title,
        report_type: report.report_type,
        ticker: report.ticker,
        ticker_name: null,
        rating: report.rating,
        target_price: report.target_price,
        sector: sectorName,
        region: report.region_code,
        report_language: report.report_language,
        investment_thesis: report.investment_thesis,
        analyst: analystName,
        contact_person: contactPersonName,
        published_at: report.published_at ?? report.created_at,
        created_at: report.created_at,
        updated_at: report.updated_at,
      },
      { onConflict: "external_id" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`upsert reports failed: ${error?.message ?? "no id"}`);
  }

  return data.id;
}

// ===== 同步分析师关联（先删后插） =====
async function syncAnalysts(localId: string, emails: string[]): Promise<void> {
  await localClient.from("report_analyst").delete().eq("report_id", localId);

  for (const email of emails) {
    const { error } = await localClient
      .from("report_analyst")
      .insert({ report_id: localId, analyst_email: email.toLowerCase() });

    if (error) {
      throw new Error(`insert analyst failed: ${error.message}`);
    }
  }
}

// ===== 同步联系人关联（先删后插） =====
async function syncContacts(localId: string, email: string | null): Promise<void> {
  await localClient.from("report_contact").delete().eq("report_id", localId);

  if (email) {
    const { error } = await localClient
      .from("report_contact")
      .insert({ report_id: localId, contact_email: email.toLowerCase() });

    if (error) {
      throw new Error(`insert contact failed: ${error.message}`);
    }
  }
}

// ===== 同步附件（先删后插）：从 Neolyst 下载并上传到本地 Storage =====
async function syncAttachments(
  localId: string,
  attachments: Array<{ path: string; createdAt: string }>,
): Promise<void> {
  await localClient.from("report_attachments").delete().eq("report_id", localId);

  for (const att of attachments) {
    const neolystPath = att.path.replace(/^reports\//, "");
    const fileName = neolystPath.split("/").pop() ?? neolystPath;
    const mimeType = getMimeType(fileName);

    // 幂等检查：本地已有则跳过下载/上传
    const alreadySynced = await fileExistsInLocal(neolystPath);
    let fileSize = 0;

    if (!alreadySynced) {
      // 从 Neolyst 下载
      const content = await downloadFromNeolyst(neolystPath);
      if (!content) {
        console.warn(`[sync] Skipping attachment ${fileName} due to download failure`);
        continue;
      }
      fileSize = content.length;

      // 上传到本地 Storage（使用与 Neolyst 相同的相对路径）
      const localPath = await uploadToLocal(neolystPath, content, mimeType);
      if (!localPath) {
        console.warn(`[sync] Skipping attachment ${fileName} due to upload failure`);
        continue;
      }
    } else {
      console.log(`[sync] Attachment already synced: ${fileName}`);
    }

    const { error } = await localClient
      .from("report_attachments")
      .insert({
        report_id: localId,
        file_path: neolystPath,
        original_name: fileName,
        file_size: fileSize,
        mime_type: mimeType,
        created_at: att.createdAt,
      });

    if (error) {
      throw new Error(`insert attachment failed: ${error.message}`);
    }
  }
}

// ===== 加入分发队列 =====
async function addToDistributionQueue(localId: string): Promise<void> {
  const { error } = await localClient.rpc("add_to_distribution_queue", {
    p_report_id: localId,
  });

  if (error) {
    throw new Error(`add_to_distribution_queue failed: ${error.message}`);
  }
}

// ===== 单次同步 =====
export async function syncOnce(since: Date): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
}> {
  const reports = await fetchNeolystReports(since);
  if (reports.length === 0) {
    return { synced: 0, skipped: 0, errors: [] };
  }

  // 批量解析分析师姓名
  const allEmails = [
    ...new Set(
      reports.flatMap((r) => [r.lead_analyst_email, ...(r.analyst_emails ?? [])].filter(Boolean)),
    ),
  ] as string[];
  const analystNameMap = await resolveAnalystNames(allEmails);

  // 收集所有联系人邮箱
  const contactEmails = reports.map((r) =>
    r.contact_person && r.contact_person.includes("@")
      ? r.contact_person.trim().toLowerCase()
      : null,
  );
  const contactNameMap = await resolveContactPersonNames(contactEmails);

  // 收集所有 sector_id，批量解析行业名称
  const sectorIds = reports.map((r) => r.sector_id ?? null);
  const sectorNameMap = await resolveSectorNames(sectorIds);

  const result = { synced: 0, skipped: 0, errors: [] as string[] };

  for (const r of reports) {
    try {
      // 幂等检查
      const existingId = await findLocalByNeolystId(r.id);

      // 解析分析师姓名
      const emails = r.analyst_emails ?? [];
      const leadEmail = r.lead_analyst_email ?? emails[0] ?? null;
      const analystName = leadEmail
        ? (analystNameMap.get(leadEmail.toLowerCase()) ?? leadEmail)
        : null;

      // 解析联系人邮箱和姓名
      const contactEmail =
        r.contact_person && r.contact_person.includes("@")
          ? r.contact_person.trim().toLowerCase()
          : null;
      const contactPersonName = contactEmail
        ? (contactNameMap.get(contactEmail) ?? contactEmail)
        : null;

      // 解析行业名称
      const sectorName = r.sector_id
        ? (sectorNameMap.get(r.sector_id) ?? null)
        : null;

      // 构建附件列表
      const attachments: Array<{ path: string; createdAt: string }> = [];
      for (const path of [r.pdf_path, r.word_path, r.model_path]) {
        if (path) {
          attachments.push({ path, createdAt: r.created_at });
        }
      }

      if (existingId) {
        // 已存在：只同步附件（报告数据不变）
        await syncAttachments(existingId, attachments);
        result.skipped++;
      } else {
        // 新报告：完整同步
        const localId = await upsertReport(r, analystName, contactPersonName, sectorName);
        await syncAnalysts(localId, emails);
        await syncContacts(localId, contactEmail);
        await syncAttachments(localId, attachments);
        result.synced++;
        console.log(`[sync] Synced: ${r.title} (${r.id})`);
        await addToDistributionQueue(localId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${r.id} (${r.title}): ${msg}`);
      console.error(`[sync] Error: ${r.id} - ${msg}`);
    }
  }

  return result;
}

// ===== 解析命令行参数 =====
function parseArgs(): { full: boolean; sinceMinutes: number; sinceDays: number } {
  const args = process.argv.slice(2);
  let full = false;
  let sinceMinutes = 5;
  let sinceDays = 0;

  for (const arg of args) {
    if (arg === "--full") {
      full = true;
    } else if (arg.startsWith("--since-minutes=")) {
      sinceMinutes = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--since-days=")) {
      sinceDays = parseInt(arg.split("=")[1], 10);
    }
  }

  return { full, sinceMinutes, sinceDays };
}

// ===== 主入口 =====
async function main() {
  const { full, sinceMinutes, sinceDays } = parseArgs();

  if (full) {
    // 全量模式：同步指定天数以来的所有报告（仅执行一次）
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    console.log(`[sync] Full sync mode: since ${sinceDays} days ago (${since.toISOString()})`);
    const result = await syncOnce(since);
    console.log(`[sync] Done. synced=${result.synced}, skipped=${result.skipped}, errors=${result.errors.length}`);
    if (result.errors.length > 0) {
      console.error("[sync] Errors:", result.errors);
    }
    return;
  }

  // 定时模式：每 5 分钟同步最近 5 分钟内发布的报告
  const INTERVAL_MS = 5 * 60 * 1000;
  console.log(`[sync] Interval mode: polling every ${INTERVAL_MS / 1000 / 60} minutes`);

  while (true) {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [sync] Polling reports published in last ${sinceMinutes} minutes...`);

    try {
      const result = await syncOnce(since);
      console.log(
        `[${new Date().toISOString()}] [sync] Done. synced=${result.synced}, skipped=${result.skipped}, errors=${result.errors.length}`,
      );
      if (result.errors.length > 0) {
        console.error("[sync] Errors:", result.errors);
      }
    } catch (err) {
      console.error(`[sync] Fatal: ${err instanceof Error ? err.message : String(err)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`[sync] Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
