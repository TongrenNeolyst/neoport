"""
connection.py — Neoport 双库 Supabase 客户端管理。

配置文件（相对于 skill 根目录）：
  neoport.yaml   → URL 和 bucket 名（提交 git）
  secrets.yaml   → service_role_key（不提交 git）

环境变量覆盖（测试用）：
  NEOPORT_URL, NEOPORT_SERVICE_ROLE_KEY
  NEOLYST_URL, NEOLYST_SERVICE_ROLE_KEY
"""

from __future__ import annotations

import os
from pathlib import Path

import yaml
from supabase import Client, create_client

SKILL_ROOT = Path(__file__).resolve().parent.parent

_config_cache: dict | None = None
_secrets_cache: dict | None = None


def _load_yaml(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def _config() -> dict:
    global _config_cache
    if _config_cache is None:
        _config_cache = _load_yaml(SKILL_ROOT / "neoport.yaml")
    return _config_cache


def _secrets() -> dict:
    global _secrets_cache
    if _secrets_cache is None:
        _secrets_cache = _load_yaml(SKILL_ROOT / "secrets.yaml")
    return _secrets_cache


def get_neoport_client() -> Client:
    cfg = _config().get("neoport", {})
    url = os.environ.get("NEOPORT_URL") or cfg.get("supabase_url", "")
    key = os.environ.get("NEOPORT_SERVICE_ROLE_KEY") or _secrets().get("neoport", {}).get("service_role_key", "")
    if not url:
        raise ValueError("neoport supabase_url 未配置，检查 neoport.yaml 或 NEOPORT_URL 环境变量")
    if not key:
        raise ValueError("neoport service_role_key 未配置，检查 secrets.yaml 或 NEOPORT_SERVICE_ROLE_KEY 环境变量")
    return create_client(url, key)


def get_neolyst_client() -> Client:
    cfg = _config().get("neolyst", {})
    url = os.environ.get("NEOLYST_URL") or cfg.get("supabase_url", "")
    key = os.environ.get("NEOLYST_SERVICE_ROLE_KEY") or _secrets().get("neolyst", {}).get("service_role_key", "")
    if not url:
        raise ValueError("neolyst supabase_url 未配置，检查 neoport.yaml 或 NEOLYST_URL 环境变量")
    if not key:
        raise ValueError("neolyst service_role_key 未配置，检查 secrets.yaml 或 NEOLYST_SERVICE_ROLE_KEY 环境变量")
    return create_client(url, key)


def neoport_bucket() -> str:
    return _config().get("neoport", {}).get("storage_bucket", "external-reports")


def neolyst_bucket() -> str:
    return _config().get("neolyst", {}).get("storage_bucket", "reports")
