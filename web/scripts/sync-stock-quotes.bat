@echo off
REM Stock Quote Sync Windows Scheduled Task Script
REM Usage: Create a Windows Task Scheduler task that runs this script
REM Example: schtasks /create /tn "StockQuoteSync" /tr "path\to\sync-stock-quotes.bat" /sc daily /st 06:00

echo %date% %time%: Starting stock quote sync...

cd /d "%~dp0"

REM Load environment variables
if exist .env (
  for /f "usebackq tokens=*" %%a in (.env) do set %%a
)

REM Run the sync
npx tsx scripts/sync-stock-quotes.ts
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% equ 0 (
  echo %date% %time%: Stock quote sync completed successfully
) else (
  echo %date% %time%: Stock quote sync failed with exit code %EXIT_CODE%
)

exit /b %EXIT_CODE%
