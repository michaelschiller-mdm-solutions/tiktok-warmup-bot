@echo off
REM Manual Docker commands for older Docker versions

echo ========================================
echo Marktde Scraper Frontend (Manual Mode)
echo ========================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed
    pause
    exit /b 1
)

echo Docker is running...
echo.

echo Choose an option:
echo 1. Build and run container
echo 2. Stop container
echo 3. View logs
echo 4. Remove container and rebuild
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo Building Docker image...
    docker build -t marktde-scraper .
    
    echo Stopping any existing container...
    docker stop marktde-scraper-frontend 2>nul
    docker rm marktde-scraper-frontend 2>nul
    
    echo Starting new container...
    docker run -d ^
        --name marktde-scraper-frontend ^
        -p 3000:3000 ^
        -p 3001:3001 ^
        -v "%cd%\data:/app/data" ^
        -v "%cd%\..\scraper:/app/scraper" ^
        marktde-scraper
    
    goto :success
    
) else if "%choice%"=="2" (
    echo Stopping container...
    docker stop marktde-scraper-frontend
    docker rm marktde-scraper-frontend
    echo Container stopped and removed.
    goto :end
    
) else if "%choice%"=="3" (
    echo Showing logs (Press Ctrl+C to exit)...
    docker logs -f marktde-scraper-frontend
    goto :end
    
) else if "%choice%"=="4" (
    echo Removing existing container and image...
    docker stop marktde-scraper-frontend 2>nul
    docker rm marktde-scraper-frontend 2>nul
    docker rmi marktde-scraper 2>nul
    
    echo Rebuilding...
    docker build -t marktde-scraper .
    
    echo Starting new container...
    docker run -d ^
        --name marktde-scraper-frontend ^
        -p 3000:3000 ^
        -p 3001:3001 ^
        -v "%cd%\data:/app/data" ^
        -v "%cd%\..\scraper:/app/scraper" ^
        marktde-scraper
    
    goto :success
    
) else (
    echo Invalid choice. Please run the script again.
    goto :end
)

:success
echo.
echo ========================================
echo SUCCESS! Container is running
echo ========================================
echo.
echo Web Interface: http://localhost:3000
echo.
echo To view logs: docker logs -f marktde-scraper-frontend
echo To stop: docker stop marktde-scraper-frontend
echo.

:end
pause