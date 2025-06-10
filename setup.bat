@echo off
echo 🚀 Browser Use + Gemini Setup (Windows)
echo ==========================================

echo.
echo 🐍 Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://python.org
    pause
    exit /b 1
)

echo.
echo 🔧 Running Python setup script...
python setup.py

echo.
echo 📝 Setup completed! 
echo.
echo 📋 Next steps:
echo 1. Edit the .env file and add your Gemini API key
echo 2. Run: python browser_gemini_test.py
echo.
echo 🔗 Get your Gemini API key from:
echo    https://makersuite.google.com/app/apikey
echo.
pause 