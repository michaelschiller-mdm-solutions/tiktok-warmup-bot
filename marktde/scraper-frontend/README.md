# Marktde Scraper Frontend

A simple web interface for the Marktde premium scraper, designed to run in Docker containers.

## Features

- 📁 **File Upload**: Drag & drop CSV files with target accounts
- ⚙️ **Scraper Controls**: Start/stop scraper with configurable settings
- 📊 **Real-time Progress**: Live progress tracking and statistics
- 📝 **Live Logs**: Real-time scraper output with WebSocket updates
- 📥 **File Downloads**: Download results and processed data as CSV files
- 🐳 **Docker Ready**: Fully containerized for easy deployment

## Quick Start

### Using Docker Compose (Recommended)

1. **Build and run the container:**
   ```bash
   cd marktde/scraper-frontend
   docker-compose up --build
   ```

2. **Access the web interface:**
   Open your browser to `http://localhost:3000`

3. **Upload target accounts:**
   - Drag & drop your `target_accounts.csv` file
   - Or click to browse and select the file

4. **Configure and start scraping:**
   - Choose your settings (headless mode, max accounts, etc.)
   - Click "Start Scraping"
   - Monitor progress in real-time

5. **Download results:**
   - Download `premium_followed_by.csv` when complete
   - Access other files like processed targets and logs

### Using Docker Build

```bash
# Build the image
docker build -t marktde-scraper .

# Run the container
docker run -p 3000:3000 -p 3001:3001 -v $(pwd)/data:/app/data marktde-scraper
```

### Manual Installation (Development)

```bash
# Install dependencies
npm install

# Start the server
npm start
```

## Configuration

### Environment Variables

- `PORT`: Web server port (default: 3000)
- `NODE_ENV`: Environment mode (development/production)

### Scraper Settings (Web UI)

- **Headless Mode**: Run browser in background (recommended for production)
- **Max Accounts**: Limit number of target accounts to process
- **Session Size**: Number of accounts to process per session (default: 50)

## File Structure

```
marktde/scraper-frontend/
├── server.js              # Express server with API endpoints
├── public/
│   ├── index.html         # Web interface
│   ├── style.css          # Styling
│   └── app.js             # Frontend JavaScript
├── scraper/               # Your existing scraper scripts (mounted)
├── data/                  # Persistent data directory
├── uploads/               # Temporary file uploads
├── Dockerfile             # Container definition
├── docker-compose.yml     # Docker Compose configuration
└── package.json           # Node.js dependencies
```

## API Endpoints

- `POST /upload-targets` - Upload target accounts CSV
- `POST /start-scraper` - Start the scraper with settings
- `POST /stop-scraper` - Stop the running scraper
- `GET /status` - Get current scraper status and logs
- `GET /progress` - Get scraping progress statistics
- `GET /files` - List available files with metadata
- `GET /download/:filename` - Download result files

## WebSocket Events

Real-time updates via WebSocket on port 3001:

- `status_change` - Scraper status updates
- `log` - New log entries
- `file_uploaded` - File upload notifications
- `progress_update` - Progress statistics

## Deployment on Windows Server

1. **Install Docker Desktop** on your Windows server

2. **Transfer the project:**
   ```bash
   # Copy the entire marktde/scraper-frontend directory to your server
   scp -r marktde/scraper-frontend user@your-server:/path/to/deployment/
   ```

3. **Build and run:**
   ```bash
   cd /path/to/deployment/marktde/scraper-frontend
   docker-compose up -d --build
   ```

4. **Access remotely:**
   - Web interface: `http://your-server-ip:3000`
   - Configure Windows Firewall to allow port 3000

## Data Persistence

- CSV files are stored in the `data/` directory
- This directory is mounted as a Docker volume for persistence
- Files survive container restarts and updates

## Troubleshooting

### Container Issues
```bash
# Check container logs
docker-compose logs -f

# Restart the container
docker-compose restart

# Rebuild after changes
docker-compose up --build
```

### Browser Issues
- Ensure ports 3000 and 3001 are accessible
- Check Windows Firewall settings
- Verify Docker port mapping

### Scraper Issues
- Check the live logs in the web interface
- Verify target_accounts.csv format
- Ensure sufficient disk space for results

## Security Notes

- This interface is designed for internal/private network use
- No authentication is implemented
- Ensure proper network security when deploying
- Consider using a reverse proxy with SSL for production

## Updates

To update the application:

1. Pull new code changes
2. Rebuild the container: `docker-compose up --build`
3. Data and settings are preserved in mounted volumes