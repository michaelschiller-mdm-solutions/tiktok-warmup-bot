@echo off
REM Marktde Scraper Frontend - Build and Run Script for Windows

echo ========================================
echo Marktde Scraper Frontend
echo ========================================
echo.

REM Check if Docker is running
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running or not installed
    echo Please install Docker Desktop and make sure it's running
    pause
    exit /b 1
)

echo Docker is running...
echo.

REM Check if docker-compose is available (try both old and new syntax)
docker-compose version >nul 2>&1
if %errorlevel% neq 0 (
    docker compose version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: docker-compose is not available
        echo Please install docker-compose or update Docker Desktop
        echo.
        echo For older Docker versions, install docker-compose separately:
        echo https://docs.docker.com/compose/install/
        pause
        exit /b 1
    ) else (
        set DOCKER_COMPOSE_CMD=docker compose
    )
) else (
    set DOCKER_COMPOSE_CMD=docker-compose
)

echo Docker Compose is available...
echo.

echo Choose an option:
echo 1. Build and run (first time or after changes)
echo 2. Start existing container
echo 3. Stop container
echo 4. View logs
echo 5. Rebuild from scratch
echo.

set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" (
    echo Building and starting the container...
    %DOCKER_COMPOSE_CMD% up --build -d
    goto :success
) else if "%choice%"=="2" (
    echo Starting existing container...
    %DOCKER_COMPOSE_CMD% up -d
    goto :success
) else if "%choice%"=="3" (
    echo Stopping container...
    %DOCKER_COMPOSE_CMD% down
    echo Container stopped.
    goto :end
) else if "%choice%"=="4" (
    echo Showing logs (Press Ctrl+C to exit)...
    %DOCKER_COMPOSE_CMD% logs -f
    goto :end
) else if "%choice%"=="5" (
    echo Rebuilding from scratch...
    %DOCKER_COMPOSE_CMD% down
    %DOCKER_COMPOSE_CMD% build --no-cache
    %DOCKER_COMPOSE_CMD% up -d
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
echo To view logs: docker-compose logs -f
echo To stop: docker-compose down
echo.
echo The web interface should now be accessible in your browser.

:end
pause