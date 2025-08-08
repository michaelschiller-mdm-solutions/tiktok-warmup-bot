@echo off
REM Install Node.js and run the scraper frontend directly on Windows

echo ========================================
echo Marktde Scraper Frontend Setup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed. Please install Node.js first:
    echo https://nodejs.org/en/download/
    echo.
    echo After installing Node.js, run this script again.
    pause
    exit /b 1
)

echo Node.js is installed: 
node --version
echo.

REM Install dependencies
echo Installing dependencies...
npm install

REM Copy scraper files
echo Copying scraper files...
if not exist "scraper" mkdir scraper
xcopy /E /Y "..\scraper\*" "scraper\"

REM Create data directory
if not exist "data" mkdir data

echo.
echo ========================================
echo Setup complete! Starting server...
echo ========================================
echo.
echo Web interface will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

REM Start the server
npm start