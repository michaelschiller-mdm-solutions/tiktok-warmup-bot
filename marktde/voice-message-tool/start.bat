@echo off
echo Starting ElevenLabs Voice Message Generator...
echo.
echo Opening in your default browser...
echo Press Ctrl+C to stop the server
echo.

REM Try to start with Python first (most common)
python -m http.server 8080 2>nul
if %errorlevel% neq 0 (
    echo Python not found, trying with Node.js...
    npx http-server -p 8080 -o 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo Neither Python nor Node.js found!
        echo Please install one of them or open index.html directly in your browser.
        echo.
        echo Opening index.html directly...
        start index.html
    )
)

pause