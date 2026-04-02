@echo off
REM Auto Report Distribution Queue Processor
REM Usage: Create a Windows Task Scheduler task that runs this script every 5 minutes
REM Example: schtasks /create /tn "AutoReportDistribution" /tr "path\to\process-auto-distribution-queue.bat" /sc minute /mo 5

echo %date% %time%: Starting auto report distribution...

REM Run from web directory (parent of scripts/)
cd /d "%~dp0"

REM Run the processor
npx tsx --env-file=.env scripts/process-auto-distribution-queue-standalone.ts
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE% equ 0 (
  echo %date% %time%: Auto distribution completed successfully
) else (
  echo %date% %time%: Auto distribution failed with exit code %EXIT_CODE%
)

exit /b %EXIT_CODE%
