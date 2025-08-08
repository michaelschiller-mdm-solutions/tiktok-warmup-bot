@echo off
echo ========================================
echo   Parallel Premium Scraper Launcher
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if target_accounts.csv exists
if not exist "target_accounts.csv" (
    echo ERROR: target_accounts.csv not found
    echo Please make sure the target accounts CSV file is in this directory
    pause
    exit /b 1
)

echo Node.js version:
node --version
echo.

echo Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install playwright
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo Installing Playwright browsers...
npx playwright install chromium
if errorlevel 1 (
    echo ERROR: Failed to install Playwright browsers
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Starting Parallel Premium Scraper
echo ========================================
echo.
echo Configuration:
echo - 10 parallel browser instances
echo - Automatic workload distribution
echo - Real-time progress monitoring
echo - Crash recovery enabled
echo.
echo Press Ctrl+C to stop the scraper
echo.

REM Run the parallel scraper
node parallel-premium-scraper.js

echo.
echo ========================================
echo   Scraping Complete
echo ========================================
echo.
echo Output files:
echo - premium_followed_by.csv (main results)
echo - premium_processed_targets.csv (processing log)
echo - parallel_progress.json (progress tracking)
echo.

pause