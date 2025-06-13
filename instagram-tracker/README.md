# Instagram Account Tracker

A comprehensive web application for tracking and managing Instagram automation accounts across multiple models/campaigns.

## Features

- **Model Management**: Organize accounts into different campaigns/models
- **Excel-like Interface**: Spreadsheet view for easy data management
- **Account Import**: Bulk import accounts from text format
- **Target User Management**: Track which accounts follow which targets
- **Analytics Dashboard**: Monitor account status, follow rates, and performance
- **Relationship Tracking**: Follow/unfollow dates and status per model

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Docker)
- **UI**: Modern data grid with Excel-like functionality

## Quick Start

1. **Prerequisites**:
   - Node.js 18+ 
   - pnpm 8+
   - Docker (for database)

2. **Setup & Run**:
   ```bash
   # Clone and navigate to project
   cd instagram-tracker
   
   # Start database and install dependencies
   pnpm run setup
   
   # Run the application (frontend + backend)
   pnpm run dev
   ```

3. **Access the Application**:
   - Frontend: http://localhost:3090
   - Backend API: http://localhost:3001
   - Database: localhost:5432

## Available Scripts

- `pnpm run dev` - Start both frontend and backend in development mode
- `pnpm run setup` - Start database and install all dependencies
- `pnpm run db:start` - Start PostgreSQL container
- `pnpm run db:stop` - Stop PostgreSQL container  
- `pnpm run db:reset` - Reset database (removes all data)
- `pnpm run build` - Build both frontend and backend for production

## Project Structure

```
instagram-tracker/
├── frontend/          # React TypeScript app (port 3090)
├── backend/           # Node.js API server (port 3001)
├── database/          # SQL scripts and migrations
├── docker-compose.yml # PostgreSQL container only
├── package.json       # Root workspace configuration
└── README.md
```

## Database Schema

- **models**: Campaign/model configurations
- **accounts**: Instagram accounts per model
- **target_users**: Users to be followed
- **model_target_follows**: Follow relationships and tracking

## Import Format

Accounts can be imported using this format:
```
username:password:email:account_code
```

Example:
```
mamah22hh:Tigermoon87:pthzchqona@rambler.ru:6273485MlweDA
```

## Environment Setup

The backend requires a `.env` file. Copy from `env.example`:
```bash
cd backend
cp env.example .env
```

Default database credentials are already configured in `docker-compose.yml`. 