#!/usr/bin/env bash
#
# Database initialization script
# Runs migrations, SQL seed, and Auth user initialization
#
# Usage:
#   bash scripts/db-init.sh
#   # or
#   pnpm run db:init
#
# Prerequisites:
#   - Supabase CLI installed
#   - Project linked (supabase link --project-ref <ref>)
#   - Environment variables set (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
#

set -euo pipefail

echo "=== Database Initialization ==="
echo ""

# Load envs from web/.env by default.
if [[ -f "web/.env" ]]; then
  set -a
  source "web/.env"
  set +a
fi

if [[ -z "${SUPABASE_ACCESS_TOKEN:-}" && -f "supabase/supabase_access.token" ]]; then
  export SUPABASE_ACCESS_TOKEN="$(tr -d '\r\n' < supabase/supabase_access.token)"
fi

if [[ -z "${SUPABASE_URL:-}" && -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
  export SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
fi

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set." >&2
  echo "Tip: configure web/.env or export them before running db:init." >&2
  exit 1
fi

echo "1. Pushing migrations + SQL seed..."
supabase db push --linked --include-seed --yes

echo ""
echo "2. Verifying migration status..."
supabase migration list --linked

echo ""
echo "3. Initializing Auth users..."
pnpm -s run seed:auth

echo ""
echo "=== Initialization Complete ==="
