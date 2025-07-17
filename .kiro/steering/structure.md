# Project Structure

## Root Level Organization

```
├── instagram-tracker/     # Full-stack Instagram management app
├── voice-actions/         # Audio files for TikTok voice control
├── database/             # Root database scripts/migrations
├── index.js              # TikTok bot main entry point
├── x_scroll_bot*.py      # X.com automation variants
├── setup.py              # Python setup script
└── package.json          # TikTok bot dependencies
```

## Instagram Tracker Structure

**Monorepo with pnpm workspaces:**

```
instagram-tracker/
├── frontend/             # React TypeScript app (port 3090)
├── backend/              # Express API server (port 3001)
├── database/             # SQL migrations and scripts
├── bot/                  # Automation scripts and Lua files
├── chrome/               # Browser automation configs
├── docs/                 # Documentation
├── scripts/              # Utility scripts
├── docker-compose.yml    # PostgreSQL container only
└── package.json          # Workspace configuration
```

## Key File Patterns

### Configuration Files
- **Environment**: `.env` files in project roots
- **Package Management**: `package.json` + `pnpm-lock.yaml` or `package-lock.json`
- **Database**: `docker-compose.yml` for PostgreSQL setup
- **Python**: `requirements.txt` for dependencies

### Entry Points
- **TikTok Bot**: `index.js` (root level)
- **Instagram Tracker**: Workspace scripts in root `package.json`
- **X.com Bot**: `x_scroll_bot.py` variants

### Automation Scripts
- **Voice Actions**: `.mp3` files in `voice-actions/`
- **Lua Scripts**: iOS automation in `instagram-tracker/bot/scripts/`
- **SQL Scripts**: Database operations in `database/` folders

## Development Workflow

### Multi-Project Setup
1. **TikTok Bot**: Standard npm project at root
2. **Instagram Tracker**: pnpm workspace with frontend/backend
3. **X.com Bot**: Standalone Python scripts

### Database Management
- PostgreSQL runs in Docker container
- Migrations in `database/migrations/`
- Init scripts auto-loaded on container start

### Automation Components
- **iOS Voice Control**: Audio files + JavaScript coordination
- **Browser Automation**: Playwright + Gemini AI integration
- **Account Management**: Full-stack web interface

## Naming Conventions
- **Kebab-case**: File and folder names
- **Snake_case**: Python files and database objects
- **CamelCase**: JavaScript/TypeScript variables and functions
- **UPPER_CASE**: Environment variables and constants