@echo off
echo Generating Chrome Extension Icons...
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Generate PNG icons
echo Creating PNG icons...
node create-png-icons.js

if %errorlevel% equ 0 (
    echo.
    echo ✓ Icons generated successfully!
    echo ✓ Extension is ready to load in Chrome
    echo.
    echo Next steps:
    echo 1. Go to chrome://extensions/
    echo 2. Enable "Developer mode"
    echo 3. Click "Load unpacked" and select this folder
    echo.
) else (
    echo.
    echo ✗ Error generating icons
    echo Please check the error messages above
    echo.
)

pause