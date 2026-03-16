# Stock Quote Sync - Scheduled Task Setup

## Overview

This document describes how to set up automatic stock quote synchronization as a scheduled task.

## Files

| File | Description |
|------|-------------|
| `scripts/sync-stock-quotes.ts` | Main sync script |
| `scripts/sync-stock-quotes-cron.sh` | Linux/Mac cron script |
| `scripts/sync-stock-quotes.bat` | Windows batch script |
| `scripts/sync-stock-quotes.config` | Configuration file |

## Setup Instructions

### Linux/Mac (Cron)

1. Open terminal and edit crontab:
   ```bash
   crontab -e
   ```

2. Add one of the following lines:

   **Every day at 6:00 AM:**
   ```
   0 6 * * * cd /path/to/web && ./scripts/sync-stock-quotes-cron.sh
   ```

   **Every weekday at 6:00 AM:**
   ```
   0 6 * * 1-5 cd /path/to/web && ./scripts/sync-stock-quotes-cron.sh
   ```

   **Every 4 hours:**
   ```
   0 */4 * * * cd /path/to/web && ./scripts/sync-stock-quotes-cron.sh
   ```

3. Save and exit

### Windows (Task Scheduler)

1. Open Task Scheduler (`taskschd.msc`)

2. Create Basic Task:
   - Name: `StockQuoteSync`
   - Trigger: Daily at 6:00 AM (or your preferred time)
   - Action: Start a program
   - Program: `C:\path\to\web\scripts\sync-stock-quotes.bat`
   - Start in: `C:\path\to\web`

3. Configure settings as needed

### Docker (with cron)

Create a Dockerfile or docker-compose.yml:

```yaml
version: '3.8'
services:
  sync:
    build: .
    env_file: .env
    entrypoint: /bin/sh -c
    command: |
      echo "Waiting for dependencies..." &&
      sleep 5 &&
      npx tsx scripts/sync-stock-quotes.ts
    restart: unless-stopped
    # Or use cron:
    # command: crontab -l && crond -f
```

## Cron Expression Format

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (Sunday=0)
│ │ │ │ │
* * * * *
```

### Examples

| Expression | Description |
|------------|-------------|
| `0 0 * * *` | Daily at midnight |
| `0 6 * * *` | Daily at 6:00 AM |
| `0 6 * * 1-5` | Weekdays at 6:00 AM |
| `0 6 * * 0,6` | Weekends at 6:00 AM |
| `0 */4 * * *` | Every 4 hours |
| `0 0 * * 0` | Weekly on Sunday |

## Configuration

Edit `scripts/sync-stock-quotes.config` to customize:

- Schedule timing
- API delay settings
- Log file location

## Manual Run

To run manually:

```bash
# From web directory
cd web
npx tsx scripts/sync-stock-quotes.ts
```

## Logs

Check logs in:
- Linux/Mac: System cron log or custom log file
- Windows: Task Scheduler history
