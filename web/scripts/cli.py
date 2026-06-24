#!/usr/bin/env python3
"""Neoport 报告同步与分发 CLI。"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

_SKILL_ROOT = str(Path(__file__).resolve().parent.parent)
if _SKILL_ROOT not in sys.path:
    sys.path.insert(0, _SKILL_ROOT)

from scripts.connection import get_neoport_client, get_neolyst_client
from scripts.sync_reports import sync_once
from scripts.process_distribution import load_smtp_config, poll_queue


def _ok(results: dict) -> str:
    return json.dumps({"ok": True, "results": results}, ensure_ascii=False)


def _fail(error: str) -> str:
    return json.dumps({"ok": False, "error": error}, ensure_ascii=False)


def _run(handler, args: argparse.Namespace) -> int:
    try:
        neoport = get_neoport_client()
        neolyst = get_neolyst_client()
        result = handler(neoport, neolyst, args)
        print(_ok(result))
        return 0
    except Exception as e:
        print(_fail(f"{type(e).__name__}: {e}"), file=sys.stderr)
        return 1


# ── 命令处理 ──

def _sync_reports(neoport, neolyst, args):
    since = datetime.now(timezone.utc) - timedelta(minutes=args.since_minutes)
    return sync_once(neolyst, neoport, since)


def _sync_reports_full(neoport, neolyst, args):
    since = datetime.now(timezone.utc) - timedelta(days=args.since_days)
    return sync_once(neolyst, neoport, since)


def _process_distribution(neoport, neolyst, args):
    smtp_cfg = load_smtp_config(neoport)
    if not smtp_cfg:
        raise ValueError("未找到启用的 SMTP 配置（email_config 表）")
    return poll_queue(neolyst, neoport, smtp_cfg)


# ── 入口 ──

def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Neoport 报告同步与分发")
    sub = parser.add_subparsers(dest="command", required=True)

    sr = sub.add_parser("sync-reports", help="增量同步（默认最近 10 分钟）")
    sr.add_argument("--since-minutes", type=int, default=10)
    sr.set_defaults(func=_sync_reports)

    srf = sub.add_parser("sync-reports-full", help="全量同步（默认最近 30 天）")
    srf.add_argument("--since-days", type=int, default=30)
    srf.set_defaults(func=_sync_reports_full)

    pd = sub.add_parser("process-distribution", help="处理分发队列")
    pd.set_defaults(func=_process_distribution)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return _run(args.func, args)


if __name__ == "__main__":
    sys.exit(main())
