# Auto Report Distribution Queue - Scheduled Task Setup

## Overview

This document describes how to set up the auto report distribution queue processor as a scheduled task.

## Files

| File | Description |
|------|-------------|
| `scripts/process-auto-distribution-queue-standalone.ts` | Main queue processor (standalone, no server dependencies) |
| `scripts/process-auto-distribution-queue.bat` | Windows batch script runner |
| `scripts/deploy-queue.sh*` | Linux/Mac deployment script |

## Setup Instructions

### Windows (Task Scheduler)

1. Open Task Scheduler (`taskschd.msc`)

2. Create Basic Task:
   - Name: `AutoReportDistribution`
   - Trigger: Every 5 minutes (or your preferred interval)
   - Action: Start a program
   - Program: `C:\path\to\web\scripts\process-auto-distribution-queue.bat`
   - Start in: `C:\path\to\web`

   Example command line:
   ```
   schtasks /create /tn "AutoReportDistribution" /tr "C:\path\to\web\scripts\process-auto-distribution-queue.bat" /sc minute /mo 5
   ```

### Linux/Mac (Cron)

Run the queue processor via cron:

```
*/5 * * * * cd /path/to/web && npx tsx --env-file=.env scripts/process-auto-distribution-queue-standalone.ts >> /var/log/queue-processor.log 2>&1
```

### Docker

```yaml
services:
  queue-processor:
    build: .
    env_file: .env
    command: npx tsx --env-file=.env scripts/process-auto-distribution-queue-standalone.ts
    restart: unless-stopped
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
| `*/5 * * * *` | Every 5 minutes |
| `0 * * * *` | Every hour |
| `0 6 * * *` | Daily at 6:00 AM |
| `0 6 * * 1-5` | Weekdays at 6:00 AM |

## Manual Run

```bash
# From web directory
cd web
npx tsx --env-file=.env scripts/process-auto-distribution-queue-standalone.ts
```

## Logs

Check console output for processing status. Exit code 0 indicates success.
