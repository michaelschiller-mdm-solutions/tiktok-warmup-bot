@echo off
REM Premium Followed Scraper Runner
REM This batch file provides easy ways to run the premium scraper

echo Premium Followed Scraper Runner
echo ================================
echo.
echo Choose an option:
echo 1. Run in background (headless) - recommended for production
echo 2. Run with visible browser - for debugging
echo 3. Test run (10 accounts only, visible)
echo 4. Small session (25 accounts per session, headless)
echo 5. Show help
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo Running in background mode...
    node premium-followed-scraper.js
) else if "%choice%"=="2" (
    echo Running with visible browser...
    node premium-followed-scraper.js --visible
) else if "%choice%"=="3" (
    echo Running test with 10 accounts...
    node premium-followed-scraper.js --visible --max=10
) else if "%choice%"=="4" (
    echo Running with small sessions...
    node premium-followed-scraper.js --session-size=25
) else if "%choice%"=="5" (
    node premium-followed-scraper.js --help
) else (
    echo Invalid choice. Please run the script again.
)

pause