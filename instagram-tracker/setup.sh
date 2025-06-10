#!/bin/bash

echo "🚀 Instagram Tracker Setup"
echo "========================="

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install pnpm first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

echo "📦 Starting PostgreSQL database..."
docker-compose up -d

echo "⏳ Waiting for database to be ready..."
sleep 5

echo "📥 Installing dependencies..."
pnpm install

echo "🔧 Installing backend dependencies..."
cd backend && pnpm install && cd ..

echo "🎨 Installing frontend dependencies..."
cd frontend && pnpm install && cd ..

echo "📋 Creating environment file..."
if [ ! -f backend/.env ]; then
    cp backend/env.example backend/.env
    echo "✅ Created backend/.env file"
else
    echo "⚠️  backend/.env already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the application:"
echo "   pnpm run dev"
echo ""
echo "🌐 Access points:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo "   Database: localhost:5432"
echo "" 