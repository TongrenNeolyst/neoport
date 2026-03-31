import { NextRequest, NextResponse } from "next/server";

import {
  addAnalystEmail,
  addContactEmail,
  createAttachment,
  createReport,
  findReportByExternalId,
} from "@/features/external-reports/repo/external-reports-repo";
import { err, ok, type Result } from "@/lib/result";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_ATTACHMENT_COUNT = 20;
const API_KEY = process.env.EXTERNAL_REPORT_API_KEY ?? "";

const REQUIRED_FIELDS: { name: string; maxLength?: number }[] = [
  { name: "external_id", maxLength: 100 },
  { name: "title", maxLength: 500 },
  { name: "report_type", maxLength: 100 },
  { name: "published_at" },
];

const OPTIONAL_FIELDS: { name: string; maxLength?: number }[] = [
  { name: "ticker", maxLength: 50 },
  { name: "rating", maxLength: 100 },
  { name: "target_price" },
  { name: "sector", maxLength: 200 },
  { name: "region", maxLength: 100 },
  { name: "report_language", maxLength: 10 },
  { name: "investment_thesis", maxLength: 5000 },
  { name: "analyst", maxLength: 500 },
  { name: "contact_person", maxLength: 200 },
];

function validateApiKey(request: NextRequest): boolean {
  const key = request.headers.get("X-API-Key");
  return key === API_KEY && API_KEY !== "";
}

function parseAnalystAndEmails(raw: string): { name: string | null; emails: string[] } {
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const emails: string[] = [];

  for (const part of parts) {
    const emailMatch = part.match(/<([^>]+)>/);
    if (emailMatch) {
      emails.push(emailMatch[1].trim().toLowerCase());
    }
  }

  const firstPart = parts[0] ?? "";
  const nameMatch = firstPart.match(/^(.+?)\s*</);
  const name = nameMatch ? nameMatch[1].trim() : null;

  return { name, emails };
}

function parseContactAndEmail(raw: string): { name: string | null; email: string | null } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (!match) {
    return { name: null, email: null };
  }
  return {
    name: match[1].trim(),
    email: match[2].trim().toLowerCase(),
  };
}

export async function POST(request: NextRequest) {
  // 1. API Key 鉴权
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. 解析 multipart/form-data
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Failed to parse form data" }, { status: 400 });
  }

  // 3. 收集字段
  const fields: Record<string, string | null> = {};
  for (const field of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]) {
    const value = formData.get(field.name);
    fields[field.name] = value instanceof File ? null : (value as string | null);
  }

  // 4. 必填字段校验
  const missingFields: string[] = [];
  for (const field of REQUIRED_FIELDS) {
    const value = fields[field.name];
    if (value === null || value === undefined || value.trim() === "") {
      missingFields.push(field.name);
    }
  }
  if (missingFields.length > 0) {
    return NextResponse.json(
      { error: "Missing required fields", fields: missingFields },
      { status: 400 },
    );
  }

  // 5. 字段长度校验
  const lengthErrors: string[] = [];
  for (const field of [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS]) {
    const value = fields[field.name];
    if (value && field.maxLength && value.length > field.maxLength) {
      lengthErrors.push(`${field.name} exceeds max length of ${field.maxLength}`);
    }
  }
  if (lengthErrors.length > 0) {
    return NextResponse.json(
      { error: "Field validation error", details: lengthErrors },
      { status: 400 },
    );
  }

  // 6. target_price 正数校验
  const targetPriceRaw = fields["target_price"];
  if (targetPriceRaw !== null && targetPriceRaw !== "") {
    const targetPrice = parseFloat(targetPriceRaw);
    if (isNaN(targetPrice) || targetPrice <= 0) {
      return NextResponse.json(
        { error: "target_price must be greater than 0" },
        { status: 400 },
      );
    }
  }

  // 7. report_language 枚举校验
  const language = fields["report_language"];
  if (language !== null && language !== "" && !["zh", "en"].includes(language)) {
    return NextResponse.json(
      { error: "report_language must be 'zh' or 'en'" },
      { status: 400 },
    );
  }

  // 8. published_at 日期格式校验
  const publishedAt = fields["published_at"]!;
  const parsedDate = new Date(publishedAt);
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json(
      { error: "published_at must be a valid ISO 8601 date" },
      { status: 400 },
    );
  }

  // 9. 附件数量校验
  const attachments: { name: string; file: File }[] = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("attachment_") && value instanceof File && value.size > 0) {
      attachments.push({ name: key, file: value });
    }
  }
  if (attachments.length > MAX_ATTACHMENT_COUNT) {
    return NextResponse.json(
      { error: `Too many attachments. Maximum is ${MAX_ATTACHMENT_COUNT}` },
      { status: 413 },
    );
  }

  // 10. 单文件大小校验
  for (const att of attachments) {
    if (att.file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File '${att.file.name}' exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 413 },
      );
    }
  }

  const externalId = fields["external_id"]!;

  // 11. 幂等处理：检查是否已存在
  const existingResult = await findReportByExternalId(externalId);
  if (!existingResult.ok) {
    return NextResponse.json({ error: existingResult.error }, { status: 500 });
  }
  if (existingResult.data !== null) {
    return NextResponse.json(
      { id: existingResult.data.id, message: "Report already exists" },
      { status: 200 },
    );
  }

  // 12. 解析 analyst 和 contact_person
  const analystRaw = fields["analyst"] ?? "";
  const analystParsed = parseAnalystAndEmails(analystRaw);
  const contactParsed = parseContactAndEmail(fields["contact_person"] ?? "");

  // 13. 写入 reports 表
  const reportResult = await createReport({
    external_id: externalId,
    title: fields["title"]!,
    report_type: fields["report_type"]!,
    ticker: fields["ticker"] ?? null,
    rating: fields["rating"] ?? null,
    target_price: fields["target_price"] ? parseFloat(fields["target_price"]!) : null,
    sector: fields["sector"] ?? null,
    region: fields["region"] ?? null,
    report_language: fields["report_language"] ?? null,
    investment_thesis: fields["investment_thesis"] ?? null,
    analyst: analystParsed.name,
    contact_person: contactParsed.name,
    published_at: parsedDate.toISOString(),
  });
  if (!reportResult.ok) {
    return NextResponse.json({ error: reportResult.error }, { status: 500 });
  }

  const report = reportResult.data;

  // 14. 写入关联表
  for (const email of analystParsed.emails) {
    if (email) {
      await addAnalystEmail({ report_id: report.id, analyst_email: email });
    }
  }
  if (contactParsed.email) {
    await addContactEmail({ report_id: report.id, contact_email: contactParsed.email });
  }

  // 15. 上传附件到 Storage 并写入元信息
  for (const att of attachments) {
    const buffer = Buffer.from(await att.file.arrayBuffer());
    const filePath = `external-reports/${report.id}/${att.file.name}`;

    const uploadResult = await uploadToStorage(filePath, buffer, att.file.type);
    if (!uploadResult.ok) {
      return NextResponse.json({ error: `Failed to upload ${att.file.name}: ${uploadResult.error}` }, { status: 500 });
    }

    await createAttachment({
      report_id: report.id,
      original_name: att.file.name,
      file_path: filePath,
      file_size: att.file.size,
      mime_type: att.file.type || "application/octet-stream",
    });
  }

  // 16. 将报告加入自动发布队列
  try {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const adminClient = createAdminClient();
    const { error: queueError } = await adminClient.rpc(
      "add_to_distribution_queue",
      { p_report_id: report.id },
    );
    if (queueError) {
      console.error("[external-reports] Failed to add to distribution queue:", queueError);
    }
  } catch (err) {
    console.error("[external-reports] Exception adding to distribution queue:", err);
  }

  return NextResponse.json({ id: report.id }, { status: 201 });
}

async function uploadToStorage(
  path: string,
  data: Buffer,
  contentType: string,
): Promise<Result<void>> {
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const supabase = createAdminClient();

  const { error } = await supabase.storage
    .from("external-reports")
    .upload(path, data, {
      contentType,
      upsert: true,
    });

  if (error) {
    return err(error.message);
  }

  return ok(undefined);
}
