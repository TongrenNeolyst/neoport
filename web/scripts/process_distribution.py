"""处理 Neoport 报告自动分发队列：取 waiting 项，发邮件，记录历史。"""

from __future__ import annotations

import html
import re
import smtplib
from datetime import datetime, timezone
from email.message import EmailMessage

from supabase import Client

from . import connection

# ── 邮件主题生成 ──

_WIND_CATEGORY = {
    "company": "公司研究", "company_flash": "公司研究", "company-translate": "公司研究",
    "sector": "行业研究", "sector_flash": "行业研究", "sector-translate": "行业研究",
    "macro": "宏观研究", "macro-translate": "宏观研究",
    "strategy": "策略研究", "strategy-translate": "策略研究",
    "quantitative": "策略研究", "quantitative-translate": "策略研究",
    "bond": "债券研究", "bond-translate": "债券研究",
}

_THS_CATEGORY = {
    "company": "个股研究", "company_flash": "个股研究", "company-translate": "个股研究",
    "sector": "行业研究", "sector_flash": "行业研究", "sector-translate": "行业研究",
    "macro": "宏观经济", "macro-translate": "宏观经济",
    "strategy": "投资策略", "strategy-translate": "投资策略",
    "quantitative": "投资策略", "quantitative-translate": "投资策略",
    "bond": "债券研究", "bond-translate": "债券研究",
}


def _format_date(published_at: str | None, fmt: str) -> str:
    if not published_at:
        return datetime.now(timezone.utc).strftime(fmt)
    try:
        dt = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        return dt.strftime(fmt)
    except ValueError:
        return datetime.now(timezone.utc).strftime(fmt)


def generate_subject(sub_type: str, report: dict) -> str:
    analysts = report.get("analysts", [])
    authors = ",".join(analysts)
    first_author = analysts[0] if analysts else ""
    rt = (report.get("report_type") or "").lower()

    if sub_type == "wind":
        date_str = _format_date(report.get("published_at"), "%Y%m%d")
        cat = _WIND_CATEGORY.get(rt, report.get("report_type", ""))
        return f"华福国际*{cat}*{report['title']}*{date_str}*{authors}"

    if sub_type == "tonghuashun":
        date_str = _format_date(report.get("published_at"), "%Y-%m-%d")
        if rt in ("company", "company_flash", "company-translate"):
            return f"华福国际*个股研究*{report.get('ticker_name') or ''}*{first_author}*{date_str}*{report['title']}"
        elif rt in ("sector", "sector_flash", "sector-translate"):
            return f"华福国际*行业研究*{report.get('sector') or ''}*{first_author}*{date_str}*{report['title']}"
        else:
            cat = _THS_CATEGORY.get(rt, report.get("report_type", ""))
            return f"华福国际*{cat}*{first_author}*{date_str}*{report['title']}"

    if sub_type in ("bloomberg_zh", "bloomberg_en"):
        return extract_bloomberg_subject(report["title"])

    return report["title"]


# ── Bloomberg 邮件 ──

# 冒号同时支持英文 ":" 和中文全角 "："（U+FF1A）
_BLOOMBERG_COLON_RE = re.compile(r"[:：]")


def _is_company_report(report_type: str) -> bool:
    t = (report_type or "").lower()
    return t == "company" or t == "company flash" or t == "company-translate"


def _is_sector_report(report_type: str) -> bool:
    t = (report_type or "").lower()
    return t == "sector" or t == "sector flash" or t == "sector-translate"


def extract_bloomberg_subject(report_title: str) -> str:
    """取报告标题第一个冒号前的内容（兼容英文/中文冒号）"""
    m = _BLOOMBERG_COLON_RE.search(report_title or "")
    if m:
        return report_title[: m.start()]
    return report_title or ""


def build_bloomberg_html_body(report: dict, language: str) -> str:
    """构造 Bloomberg 邮件正文（按语言）"""
    # T: 行
    rt = report.get("report_type", "")
    if _is_company_report(rt):
        ticker = (report.get("ticker") or "").strip()
        ticker_line = f"(T: {ticker.replace(' ', '@')})" if ticker else "(T: N/A)"
    elif _is_sector_report(rt):
        sector = (report.get("sector") or "").strip()
        ticker_line = f"(I: {sector})" if sector else "(I: N/A)"
    else:
        ticker_line = "(I: N/A)"

    thesis = report.get("investment_thesis") or "<p>Please find the report attached.</p>"
    title_escaped = html.escape(report.get("title") or "")

    if language == "zh":
        return "\n".join([
            f"<p>{ticker_line}</p>",
            "<p>&nbsp;</p>",
            "<p>尊敬的彭博研究团队，</p>",
            "<p>&nbsp;</p>",
            "<p>报告标题:</p>",
            f"<p>{title_escaped}</p>",
            "<p>&nbsp;</p>",
            "<p>主要观点摘要：</p>",
            thesis,
        ])

    return "\n".join([
        f"<p>{ticker_line}</p>",
        "<p>&nbsp;</p>",
        "<p>Dear Bloomberg Research Team,</p>",
        "<p>&nbsp;</p>",
        "<p>Report Title:</p>",
        f"<p>{title_escaped}</p>",
        "<p>&nbsp;</p>",
        "<p>Summary of main points:</p>",
        thesis,
    ])


def resolve_bloomberg_subscription_type(report: dict) -> str:
    """根据 report.report_language 决定彭博订阅类型（'zh' → bloomberg_zh，其它 → bloomberg_en）"""
    return "bloomberg_zh" if (report.get("report_language") or "").lower() == "zh" else "bloomberg_en"


# ── SMTP ──

def load_smtp_config(local: Client) -> dict | None:
    resp = local.table("email_config").select(
        "smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from"
    ).eq("is_enabled", True).limit(1).execute()
    rows = resp.data or []
    return rows[0] if rows else None


def _smtp_send(smtp_cfg: dict, to: str, subject: str, body_html: str,
               attachments: list[tuple[str, bytes]]) -> None:
    msg = EmailMessage()
    msg["From"] = smtp_cfg["smtp_from"]
    msg["To"] = to
    msg["Subject"] = subject
    if body_html:
        msg.set_content(body_html, subtype="html")

    for filename, content in attachments:
        msg.add_attachment(
            content,
            maintype="application",
            subtype="pdf",
            filename=filename,
        )

    host = smtp_cfg["smtp_host"]
    port = int(smtp_cfg["smtp_port"])
    user = smtp_cfg["smtp_user"]
    password = smtp_cfg["smtp_pass"]

    if port == 465:
        with smtplib.SMTP_SSL(host, port) as s:
            s.login(user, password)
            s.send_message(msg)
    else:
        with smtplib.SMTP(host, port) as s:
            s.starttls()
            s.login(user, password)
            s.send_message(msg)


# ── 数据查询 ──

def fetch_report(local: Client, report_id: str) -> dict | None:
    resp = local.table("reports").select(
        "id, title, report_type, published_at, investment_thesis, ticker, ticker_name, sector, analyst, report_language"
    ).eq("id", report_id).execute()
    rows = resp.data or []
    if not rows:
        return None
    r = rows[0]
    r["analysts"] = [n.strip() for n in (r.get("analyst") or "").split(",") if n.strip()]
    return r


def fetch_recipients(local: Client, report: dict) -> list[dict]:
    """获取本报告的收件人列表。

    去重策略：
      1) 分析师与联系人之间按邮箱（lowercase）去重，分析师优先
      2) 每个订阅类型（wind / tonghuashun / normal / bloomberg_zh / bloomberg_en）
         内部按邮箱去重，防止同一 email 在 email_subscription 表里以多行存在
         而被重复发送
      3) 分析师 / 联系人 邮箱若同时出现在普通订阅（normal）里，跳过 normal
         这一路（普通订阅与分析师 / 联系人的主题、正文完全相同，重复发没意义；
         分析师 > 联系人 > 普通订阅）
      4) 跨订阅类型（wind / tonghuashun / bloomberg）之间、以及它们与
         分析师 / 联系人的交叉：仍按各自主题格式分别发送（不同格式是业务预期）
    """
    # 分析师 / 联系人 邮箱集合（lowercase），用于跨类型去重时优先匹配
    analyst_contact_emails: set[str] = set()
    seen_internal_contact: dict[str, dict] = {}

    report_id = report["id"]

    # 1) 分析师
    resp = local.table("report_analyst").select("analyst_email").eq("report_id", report_id).execute()
    for a in resp.data or []:
        email = (a.get("analyst_email") or "").strip().lower()
        if not email or email in analyst_contact_emails:
            continue
        analyst_contact_emails.add(email)
        seen_internal_contact[email] = {"email": a["analyst_email"], "type": "analyst"}

    # 2) 联系人（邮箱未出现过才入库，分析师优先）
    resp = local.table("report_contact").select("contact_email").eq("report_id", report_id).execute()
    for c in resp.data or []:
        email = (c.get("contact_email") or "").strip().lower()
        if not email or email in analyst_contact_emails:
            continue
        analyst_contact_emails.add(email)
        seen_internal_contact[email] = {"email": c["contact_email"], "type": "contact"}

    result: list[dict] = list(seen_internal_contact.values())

    # 3) 订阅类型：wind / tonghuashun（各自内部去重；不同主题/正文，保留重复发）
    for sub_type in ("wind", "tonghuashun"):
        resp = local.table("email_subscription").select("email").eq(
            "subscription_type", sub_type
        ).eq("is_active", True).execute()
        seen_in_type: set[str] = set()
        for s in resp.data or []:
            email = (s.get("email") or "").strip().lower()
            if not email or email in seen_in_type:
                continue
            seen_in_type.add(email)
            result.append({"email": s["email"], "type": sub_type})

    # 4) 普通订阅 normal：内部去重 + 分析师/联系人邮箱优先
    #    同一邮箱如果在分析师/联系人名单里出现过，跳过 normal
    #    （避免同一封主题、正文都相同的邮件被发两次）
    resp = local.table("email_subscription").select("email").eq(
        "subscription_type", "normal"
    ).eq("is_active", True).execute()
    seen_in_type = set()
    for s in resp.data or []:
        email = (s.get("email") or "").strip().lower()
        if not email or email in seen_in_type:
            continue
        seen_in_type.add(email)
        if email in analyst_contact_emails:
            # 分析师/联系人已发送，normal 这一路跳过
            continue
        result.append({"email": s["email"], "type": "normal"})

    # 5) Bloomberg（彭博）：按 report.report_language 路由到对应语言的邮箱
    #    - 'zh' → 仅 bloomberg_zh 订阅者收到
    #    - 其他（'en' 或 null）→ 仅 bloomberg_en 订阅者收到
    #    同类型内部按邮箱去重（同一邮箱在该类型多行 → 仅发一次）
    bloomberg_type = resolve_bloomberg_subscription_type(report)
    resp = local.table("email_subscription").select("email").eq(
        "subscription_type", bloomberg_type
    ).eq("is_active", True).execute()
    seen_in_type = set()
    for s in resp.data or []:
        email = (s.get("email") or "").strip().lower()
        if not email or email in seen_in_type:
            continue
        seen_in_type.add(email)
        result.append({"email": s["email"], "type": bloomberg_type})

    return result


def fetch_pdf_attachments(local: Client, report_id: str) -> list[dict]:
    resp = local.table("report_attachments").select(
        "file_path, original_name, mime_type"
    ).eq("report_id", report_id).execute()
    return [
        a for a in (resp.data or [])
        if (a.get("mime_type") or "").lower() == "application/pdf"
        or a.get("original_name", "").lower().endswith(".pdf")
    ]


def download_attachment(neo: Client, file_path: str) -> tuple[str, bytes] | None:
    filename = file_path.rsplit("/", 1)[-1] if "/" in file_path else file_path
    try:
        data = neo.storage.from_(connection.neolyst_bucket()).download(file_path)
        if not data:
            return None
        return filename, bytes(data)
    except Exception:
        return None


def record_history(local: Client, report_id: str, email: str,
                   status: str, error_msg: str | None = None) -> None:
    row: dict = {
        "report_id": report_id,
        "recipient_email": email,
        "status": status,
    }
    if status == "sent":
        row["sent_at"] = datetime.now(timezone.utc).isoformat()
    if error_msg:
        row["error_message"] = error_msg
    local.table("report_distribution_history").insert(row).execute()


# ── 队列处理 ──

def process_item(neo: Client, local: Client, smtp_cfg: dict,
                 queue_id: str, report_id: str) -> dict:
    local.table("report_distribution_queue").update(
        {"status": "processing"}
    ).eq("id", queue_id).eq("status", "waiting").execute()

    check = local.table("report_distribution_queue").select(
        "status"
    ).eq("id", queue_id).execute()
    if not check.data or check.data[0]["status"] != "processing":
        return {"status": "skipped", "reason": "状态已变"}

    report = fetch_report(local, report_id)
    if not report:
        local.table("report_distribution_queue").update(
            {"status": "failed", "error_message": "报告不存在"}
        ).eq("id", queue_id).execute()
        return {"status": "failed", "reason": "报告不存在"}

    recipients = fetch_recipients(local, report)
    if not recipients:
        local.table("report_distribution_queue").update({
            "status": "published",
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", queue_id).execute()
        return {"status": "published", "reason": "无收件人"}

    pdf_atts = fetch_pdf_attachments(local, report_id)
    resolved_atts = []
    for att in pdf_atts:
        result = download_attachment(neo, att["file_path"])
        if result:
            resolved_atts.append(result)

    first_error = None
    all_ok = True

    for rec in recipients:
        sub_type = rec["type"]
        # Wind / 同花顺 / Bloomberg 使用差异化主题与正文；analyst/contact/normal 使用 investment_thesis
        if sub_type in ("wind", "tonghuashun", "bloomberg_zh", "bloomberg_en"):
            subject = generate_subject(sub_type, report)
        else:
            subject = report["title"]

        if sub_type == "bloomberg_zh":
            body_html = build_bloomberg_html_body(report, "zh")
        elif sub_type == "bloomberg_en":
            body_html = build_bloomberg_html_body(report, "en")
        else:
            body_html = report.get("investment_thesis") or ""

        try:
            _smtp_send(smtp_cfg, rec["email"], subject, body_html, resolved_atts)
            record_history(local, report_id, rec["email"], "sent")
        except Exception as e:
            all_ok = False
            err = str(e)
            if first_error is None:
                first_error = err
            record_history(local, report_id, rec["email"], "failed", err)

    if all_ok:
        local.table("report_distribution_queue").update({
            "status": "published",
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", queue_id).execute()
        return {"status": "published"}
    else:
        local.table("report_distribution_queue").update({
            "status": "failed",
            "error_message": first_error,
        }).eq("id", queue_id).execute()
        return {"status": "failed", "reason": first_error}


def poll_queue(neo: Client, local: Client, smtp_cfg: dict) -> dict:
    resp = local.table("report_distribution_queue").select(
        "id, report_id, created_at"
    ).eq("status", "waiting").order(
        "created_at", desc=False
    ).limit(50).execute()

    items = resp.data or []
    if not items:
        return {"processed": 0, "succeeded": 0, "failed": 0}

    succeeded = 0
    failed = 0
    errors: list[str] = []

    for item in items:
        result = process_item(neo, local, smtp_cfg, item["id"], item["report_id"])
        if result.get("status") == "published":
            succeeded += 1
        elif result.get("status") == "failed":
            failed += 1
            if result.get("reason"):
                errors.append(f"{item['report_id']}: {result['reason']}")

    return {"processed": len(items), "succeeded": succeeded, "failed": failed, "errors": errors}
