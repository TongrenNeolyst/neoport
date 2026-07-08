"""从 Neolyst 同步已发布报告到 Neoport 数据库。"""

from __future__ import annotations

import sys
import time
from datetime import datetime, timedelta, timezone

from supabase import Client

from . import connection

MIME_MAP = {
    "pdf": "application/pdf",
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


def _mime(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return MIME_MAP.get(ext, "application/octet-stream")


# ── Neolyst 查询 ──

def fetch_published_reports(neo: Client, since: datetime) -> list[dict]:
    resp = neo.table("report").select("*").eq(
        "status", "published"
    ).gte("published_at", since.isoformat()).order(
        "published_at", desc=False
    ).execute()
    return resp.data or []


def resolve_analyst_names(neo: Client, emails: list[str]) -> dict[str, str]:
    if not emails:
        return {}
    resp = neo.table("analyst").select(
        "email, chinese_name, english_name"
    ).in_("email", [e.lower() for e in emails]).execute()
    result = {}
    for a in resp.data or []:
        name = a.get("chinese_name") or a.get("english_name") or a["email"]
        result[a["email"].lower()] = name
    return result


def resolve_sector_names(neo: Client, sector_ids: list[str]) -> dict[str, str]:
    ids = [s for s in sector_ids if s]
    if not ids:
        return {}
    resp = neo.table("sector").select("id, name_cn, wind_name").in_("id", ids).execute()
    result = {}
    for s in resp.data or []:
        result[s["id"]] = s.get("wind_name") or s.get("name_cn") or ""
    return result


def resolve_ticker_names(neo: Client, coverage_ids: list[str]) -> dict[str, str]:
    """coverage_id → Neolyst coverage.english_name（公司英文名）"""
    ids = [c for c in coverage_ids if c]
    if not ids:
        return {}
    resp = neo.table("coverage").select("id, english_name").in_("id", ids).execute()
    result = {}
    for c in resp.data or []:
        result[c["id"]] = c.get("english_name") or ""
    return result


# ── 文件同步 ──

def file_exists_in_local(local: Client, path: str) -> bool:
    try:
        local.storage.from_(connection.neoport_bucket()).info(path)
        return True
    except Exception:
        return False


def transfer_file(neo: Client, local: Client, neolyst_path: str) -> int:
    """从 neolyst storage 下载，上传到 neoport storage。返回文件大小。"""
    rel_path = neolyst_path.removeprefix("reports/")
    if file_exists_in_local(local, rel_path):
        return 0

    resp = neo.storage.from_(connection.neolyst_bucket()).download(rel_path)
    if not resp:
        return -1

    content = bytes(resp)
    filename = rel_path.rsplit("/", 1)[-1] if "/" in rel_path else rel_path
    local.storage.from_(connection.neoport_bucket()).upload(
        rel_path, content,
        file_options={"content-type": _mime(filename), "upsert": "true"},
    )
    return len(content)


# ── Neoport 写入 ──

def upsert_report(
    local: Client, report: dict,
    analyst_name: str | None,
    contact_name: str | None,
    sector_name: str | None,
    ticker_name: str | None = None,
) -> str:
    row = {
        "external_id": report["id"],
        "title": report["title"],
        "report_type": report.get("report_type"),
        "ticker": report.get("ticker"),
        "ticker_name": ticker_name,
        "rating": report.get("rating"),
        "target_price": report.get("target_price"),
        "sector": sector_name,
        "region": report.get("region_code"),
        "report_language": report.get("report_language"),
        "investment_thesis": report.get("investment_thesis"),
        "analyst": analyst_name,
        "contact_person": contact_name,
        "published_at": report.get("published_at") or report["created_at"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    resp = local.table("reports").upsert(
        row, on_conflict="external_id"
    ).execute()
    return resp.data[0]["id"]


def sync_analysts(local: Client, local_id: str, emails: list[str]) -> None:
    local.table("report_analyst").delete().eq("report_id", local_id).execute()
    for email in emails:
        local.table("report_analyst").insert({
            "report_id": local_id,
            "analyst_email": email.lower(),
        }).execute()


def sync_contacts(local: Client, local_id: str, contact_email: str | None) -> None:
    local.table("report_contact").delete().eq("report_id", local_id).execute()
    if contact_email:
        local.table("report_contact").insert({
            "report_id": local_id,
            "contact_email": contact_email.lower(),
        }).execute()


def sync_attachments(
    neo: Client, local: Client, local_id: str,
    paths: list[str], created_at: str,
) -> None:
    local.table("report_attachments").delete().eq("report_id", local_id).execute()
    for path in paths:
        if not path:
            continue
        rel_path = path.removeprefix("reports/")
        filename = rel_path.rsplit("/", 1)[-1] if "/" in rel_path else rel_path
        file_size = transfer_file(neo, local, path)
        if file_size < 0:
            continue
        local.table("report_attachments").insert({
            "report_id": local_id,
            "file_path": rel_path,
            "original_name": filename,
            "file_size": max(file_size, 0),
            "mime_type": _mime(filename),
            "created_at": created_at,
        }).execute()


def add_to_distribution_queue(local: Client, local_id: str) -> None:
    """带 3 次重试 + 指数退避（200ms / 800ms / 3200ms）的入队。

    背景：曾出现 RPC 偶发失败导致 reports 主表已写入但 queue 缺失（孤儿报告），
    增加重试可以显著降低这种偶发失败造成的业务影响。
    """
    last_err: Exception | None = None
    for attempt in range(3):
        try:
            local.rpc("add_to_distribution_queue", {"p_report_id": local_id}).execute()
            return
        except Exception as e:
            last_err = e
            if attempt < 2:
                delay = 0.2 * (4 ** attempt)
                print(
                    f"[sync] add_to_distribution_queue attempt {attempt + 1} failed "
                    f"for {local_id}: {e}; retrying in {delay}s",
                    file=sys.stderr,
                )
                time.sleep(delay)
    raise RuntimeError(
        f"add_to_distribution_queue failed after 3 attempts: {last_err}"
    )


# 孤儿报告补偿窗口：只补偿最近 N 天内发布的报告，避免把旧系统同步过来的
# 历史数据捞回来发邮件
ORPHAN_RECOVER_WINDOW_DAYS = 7


def recover_orphan_reports(local: Client) -> list[str]:
    """找出"应该入队但漏入队"的报告，自动补入队。

    关键过滤：
      - 只看 published_at >= cutoff（默认 7 天前）的报告；
        历史从旧系统同步过来的报告即使没入队也不需要补发邮件。
      - 只补偿"queue 里完全没有任何记录"的报告。

    这是修复 2026-07-08 那篇 AI 报告未发邮件的兜底逻辑——
    即便 add_to_distribution_queue 当时抛错，下一轮同步会把它补上。

    注意：add_to_distribution_queue RPC 是 ON CONFLICT (report_id) DO NOTHING 幂等的，
    所以即便我们误判某个 report 已经有 queue 行，调用也只是 no-op；
    真正"补成功"的判定：调用后 select queue 行是否真的存在。
    """
    cutoff = (
        datetime.now(timezone.utc) - timedelta(days=ORPHAN_RECOVER_WINDOW_DAYS)
    ).isoformat()

    reports = (
        local.table("reports")
        .select("id")
        .gte("published_at", cutoff)
        .order("published_at", desc=True)
        .limit(500)
        .execute()
        .data
        or []
    )
    if not reports:
        return []

    ids = [r["id"] for r in reports]
    queue_rows = (
        local.table("report_distribution_queue")
        .select("report_id")
        .in_("report_id", ids)
        .execute()
        .data
        or []
    )
    queue_set = {q["report_id"] for q in queue_rows}
    orphans = [i for i in ids if i not in queue_set]
    if not orphans:
        return []

    print(
        f"[sync] recover orphan reports: {len(orphans)} "
        f"(published_at >= {cutoff}, no queue row)",
        file=sys.stderr,
    )
    recovered: list[str] = []
    for rid in orphans:
        try:
            add_to_distribution_queue(local, rid)
            # 二次校验：是否真的入队成功（ON CONFLICT 时 RPC 会返回成功但实际不插入）
            check = (
                local.table("report_distribution_queue")
                .select("id")
                .eq("report_id", rid)
                .maybe_single()
                .execute()
                .data
            )
            if check:
                recovered.append(rid)
                print(f"[sync] orphan recovered: {rid}")
            else:
                print(f"[sync] orphan recovery no-op (queue row still missing): {rid}")
        except Exception as e:
            print(f"[sync] orphan recovery failed for {rid}: {e}", file=sys.stderr)
    return recovered


# ── 单次同步 ──

def sync_once(neo: Client, local: Client, since: datetime) -> dict:
    # 1) 先做孤儿补偿（防止历史孤儿报告 + 兜底本轮 add_to_distribution_queue 失败的报告）
    recovered_ids: list[str] = []
    try:
        recovered_ids = recover_orphan_reports(local)
    except Exception as e:
        print(
            f"[sync] recover_orphan_reports failed: {e}",
            file=sys.stderr,
        )

    reports = fetch_published_reports(neo, since)
    if not reports:
        return {
            "synced": 0,
            "skipped": 0,
            "recovered": len(recovered_ids),
            "errors": [],
        }

    all_emails = list({
        e.lower()
        for r in reports
        for e in [r.get("lead_analyst_email")] + (r.get("analyst_emails") or [])
        if e
    })
    analyst_names = resolve_analyst_names(neo, all_emails)

    contact_emails = [
        r.get("contact_person", "").strip().lower()
        for r in reports
        if r.get("contact_person") and "@" in r.get("contact_person", "")
    ]
    contact_names = resolve_analyst_names(neo, contact_emails)

    sector_ids = [r.get("sector_id") for r in reports if r.get("sector_id")]
    sector_names = resolve_sector_names(neo, sector_ids)

    coverage_ids = [r.get("coverage_id") for r in reports if r.get("coverage_id")]
    ticker_names = resolve_ticker_names(neo, coverage_ids)

    result: dict = {
        "synced": 0,
        "skipped": 0,
        "recovered": len(recovered_ids),
        "errors": [],
    }

    for r in reports:
        try:
            existing = local.table("reports").select("id").eq(
                "external_id", r["id"]
            ).execute().data
            existing_id = existing[0]["id"] if existing else None

            emails = r.get("analyst_emails") or []
            lead = r.get("lead_analyst_email") or (emails[0] if emails else None)
            analyst_name = analyst_names.get(lead.lower()) if lead else None

            cp = r.get("contact_person", "")
            contact_email = cp.strip().lower() if cp and "@" in cp else None
            contact_name = contact_names.get(contact_email) if contact_email else None

            sector_name = sector_names.get(r.get("sector_id", ""))
            ticker_name = ticker_names.get(r.get("coverage_id", "")) or None

            att_paths = [p for p in [r.get("pdf_path"), r.get("word_path"), r.get("model_path")] if p]

            if existing_id:
                sync_attachments(neo, local, existing_id, att_paths, r["created_at"])
                result["skipped"] += 1
            else:
                local_id = upsert_report(local, r, analyst_name, contact_name, sector_name, ticker_name)
                sync_analysts(local, local_id, emails)
                sync_contacts(local, local_id, contact_email)
                sync_attachments(neo, local, local_id, att_paths, r["created_at"])
                add_to_distribution_queue(local, local_id)
                result["synced"] += 1
        except Exception as e:
            result["errors"].append(f"{r['id']} ({r.get('title', '?')}): {e}")

    return result
