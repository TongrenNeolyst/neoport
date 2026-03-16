#!/usr/bin/env bash
#
# Run E2E tests with proper reporting
#
# Usage:
#   bash scripts/run-tests.sh
#   # or with specific test file
#   bash scripts/run-tests.sh reports.spec.ts
#
# Exit codes:
#   0 - All tests passed
#   1 - Some tests failed
#   2 - Setup error
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TESTS_DIR="$PROJECT_ROOT/tests"
TEMP_DIR="$PROJECT_ROOT/temp"
REPORT_DIR="$TEMP_DIR/test-results"

echo "=== E2E Test Runner ==="
echo ""

# Ensure temp directory exists
mkdir -p "$TEMP_DIR"

# Check if web server is running
echo "1. Checking prerequisites..."
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo "Warning: Web server not detected at localhost:3000"
  echo "Tests will attempt to start the server automatically."
fi

# Setup test users if needed
echo ""
echo "2. Ensuring test users exist..."
cd "$TESTS_DIR"
if [[ -f "../supabase/supabase_service_role_key.token" ]]; then
  pnpm run setup:test-users 2>/dev/null || echo "Test users may already exist"
else
  echo "Warning: supabase_service_role_key.token not found, skipping test user setup"
fi

# Run tests
echo ""
echo "3. Running E2E tests..."
echo ""

TEST_FILE="${1:-}"
REPORTER="html"

if [[ -n "$TEST_FILE" ]]; then
  echo "Running specific test: $TEST_FILE"
  pnpm exec playwright test "$TEST_FILE" --reporter="$REPORTER"
else
  echo "Running all tests..."
  pnpm exec playwright test --reporter="$REPORTER"
fi

TEST_EXIT_CODE=$?

echo ""
if [[ $TEST_EXIT_CODE -eq 0 ]]; then
  echo "=== All Tests Passed ==="
  echo ""
  echo "View report: cd tests && pnpm run test:report"
else
  echo "=== Tests Failed ==="
  echo ""
  echo "Exit code: $TEST_EXIT_CODE"
  echo ""
  echo "View report: cd tests && pnpm run test:report"
  echo ""
  echo "Failed test artifacts are in: $REPORT_DIR"
  exit 1
fi
