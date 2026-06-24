"""从 Neolyst 同步已发布报告到 Neoport 数据库。"""

from __future__ import annotations

from datetime import datetime, timezone

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
    local.rpc("add_to_distribution_queue", {"p_report_id": local_id}).execute()


# ── 单次同步 ──

def sync_once(neo: Client, local: Client, since: datetime) -> dict:
    reports = fetch_published_reports(neo, since)
    if not reports:
        return {"synced": 0, "skipped": 0, "errors": []}

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

    result: dict = {"synced": 0, "skipped": 0, "errors": []}

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
