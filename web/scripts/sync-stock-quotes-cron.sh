#!/bin/bash
# Stock Quote Sync Cron Script
# Add to crontab: crontab -e
# Example: Run at 6 AM daily
# 0 6 * * * /path/to/scripts/sync-stock-quotes-cron.sh

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Run the sync
echo "$(date): Starting stock quote sync..."
npx tsx scripts/sync-stock-quotes.ts
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo "$(date): Stock quote sync completed successfully"
else
  echo "$(date): Stock quote sync failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE
