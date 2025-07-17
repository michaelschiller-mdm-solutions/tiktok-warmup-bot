# Technology Stack

## Languages & Runtimes
- **Node.js 18+** - Primary runtime for TikTok bot and Instagram tracker backend
- **Python 3.8+** - Used for X.com scroll bot and browser automation
- **TypeScript** - Instagram tracker frontend and backend
- **JavaScript** - TikTok bot and various automation scripts

## Package Managers
- **pnpm 8+** - Preferred for Instagram tracker (workspace management)
- **npm** - Used for TikTok bot
- **pip** - Python package management

## Frameworks & Libraries

### Frontend
- **React + TypeScript** - Instagram tracker UI
- **Tailwind CSS** - Styling framework
- **Radix UI** - Component library

### Backend
- **Express.js** - Instagram tracker API server
- **PostgreSQL 15** - Database (Docker container)

### Automation & AI
- **Playwright** - Browser automation
- **browser-use** - Browser automation framework
- **Google Generative AI (Gemini)** - AI-powered automation
- **LangChain** - AI framework integration

### Utilities
- **chalk** - Terminal styling
- **ora** - Loading spinners
- **cli-table3** - Table formatting
- **concurrently** - Parallel script execution

## Build & Development Commands

### TikTok Bot
```bash
npm install          # Install dependencies
npm start           # Run the bot
npm start -- --duration=20  # Run with custom duration
```

### Instagram Tracker
```bash
pnpm run setup      # Start database + install all dependencies
pnpm run dev        # Start frontend (3090) + backend (3001)
pnpm run db:start   # Start PostgreSQL container
pnpm run db:stop    # Stop database
pnpm run db:reset   # Reset database (removes all data)
pnpm run build      # Build for production
```

### X.com Bot
```bash
pip install -r requirements.txt  # Install Python dependencies
playwright install               # Install browser binaries
python x_scroll_bot.py          # Run the bot
```

## Environment Setup
- **TikTok Bot**: No environment file needed
- **Instagram Tracker**: Copy `backend/env.example` to `backend/.env`
- **X.com Bot**: Create `.env` with `GOOGLE_API_KEY=your_key`

## Database
- **PostgreSQL 15** running in Docker container
- Default credentials: admin/password123
- Port: 5432
- Database: instagram_tracker