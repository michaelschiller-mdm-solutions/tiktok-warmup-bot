@echo off
echo 🚀 Instagram Tracker Setup
echo =========================

REM Check if pnpm is installed
pnpm --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pnpm is not installed. Please install pnpm first:
    echo    npm install -g pnpm
    exit /b 1
)

REM Check if Docker is running
docker info > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not running. Please start Docker first.
    exit /b 1
)

echo 📦 Starting PostgreSQL database...
docker-compose up -d

echo ⏳ Waiting for database to be ready...
timeout /t 5 > nul

echo 📥 Installing dependencies...
pnpm install

echo 🔧 Installing backend dependencies...
cd backend && pnpm install && cd ..

echo 🎨 Installing frontend dependencies...
cd frontend && pnpm install && cd ..

echo 📋 Creating environment file...
if not exist backend\.env (
    copy backend\env.example backend\.env
    echo ✅ Created backend/.env file
) else (
    echo ⚠️  backend/.env already exists
)

echo.
echo ✅ Setup complete!
echo.
echo 🚀 To start the application:
echo    pnpm run dev
echo.
echo 🌐 Access points:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:3001
echo    Database: localhost:5432
echo. 