# Scraper Folder Structure

All scraping-related files are now organized in the `marktde/scraper/` folder for better organization.

## Files in this folder:

### Main Scraper Files:
- `premium-followed-scraper.js` - Main premium scraper script
- `markt-de-scraper-automated.js` - Original account scraper
- `markt-de-scraper.js` - Basic scraper
- `markt-de-scraper-recursive-fixed.js` - Recursive scraper variant

### Utility Files:
- `check-premium-progress.js` - Progress monitoring script
- `run-premium-scraper.bat` - Windows batch runner
- `add-host-accounts-to-queue.js` - Queue management
- `markt-de-dm-bot.js` - DM bot script

### Data Files:
- `target_accounts.csv` - Input: Target accounts to process
- `host_accounts.csv` - Host accounts data
- `premium_followed_by.csv` - Output: Premium followed accounts
- `premium_processed_targets.csv` - Progress tracking
- `processed_accounts.csv` - General processed accounts
- `queue_accounts.csv` - Account queue

### Documentation:
- `PREMIUM_FOLLOWED_SCRAPER.md` - Premium scraper documentation
- `README.md` - General scraper documentation
- `README_FOLDER_STRUCTURE.md` - This file

## Usage:

Always navigate to the scraper folder first:

```bash
cd marktde/scraper

# Run premium scraper
node premium-followed-scraper.js

# Check progress
node check-premium-progress.js

# Run with options
node premium-followed-scraper.js --visible --max=10

# Use batch runner (Windows)
run-premium-scraper.bat
```

## File Paths:

All file paths are now relative to the `marktde/scraper/` directory:
- Input files: `./target_accounts.csv`
- Output files: `./premium_followed_by.csv`
- Progress files: `./premium_processed_targets.csv`

This organization keeps all scraping functionality contained in one folder while maintaining easy access to all necessary files.