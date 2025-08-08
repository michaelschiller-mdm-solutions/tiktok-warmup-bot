# Markt.de Profile Scraper

Automated scraper for extracting user data from markt.de profile pages. Scrapes both "mir gefallen" (host accounts) and "ich gefalle" (target accounts) with automatic pagination handling.

## 🚀 Features

- **Visual Browser Automation**: Opens a real Chromium browser window so you can watch it work
- **Automatic Navigation**: Navigates to markt.de profile pages automatically
- **Modal Interaction**: Automatically clicks "mir gefallen" and "ich gefalle" buttons
- **Smart Pagination**: Handles "Mehr Likes laden" clicking until no more accounts load
- **Progressive CSV Saving**: Saves accounts immediately as they're found
- **Duplicate Prevention**: Tracks all processed IDs across sessions
- **Error Recovery**: Continues working even if individual accounts fail

## 📋 Setup Instructions

1. **Install dependencies:**
```bash
npm run setup
```

2. **Configure the target profile** (edit `markt-de-scraper-automated.js`):
```javascript
profileUrl: 'https://www.markt.de/dinademona/userId,19354400/profile.htm'
```

3. **Run the automated scraper:**
```bash
npm start
```

## 📁 Files

- `markt-de-scraper-automated.js` - Main automated scraper using Playwright
- `markt-de-scraper.js` - Console-based version (paste into browser console)
- `package.json` - Dependencies and scripts
- `README.md` - This file

## 📊 Output

The scraper creates two CSV files:
- `host_accounts.csv` - Accounts from "mir gefallen" modal
- `target_accounts.csv` - Accounts from "ich gefalle" modal

CSV format: `name,ID,link`

Example:
```csv
name,ID,link
vince_klein,34962654,https://www.markt.de/vince_klein/userId,34962654/profile.htm
aceeco,31768452,https://www.markt.de/aceeco/userId,31768452/profile.htm
```

## ⚙️ Configuration

You can modify these settings in `markt-de-scraper-automated.js`:

- `headless: false` → Set to `true` to run without GUI
- `slowMo: 500` → Speed up/slow down actions for visibility
- `profileUrl` → Target profile to scrape
- Various delays for page loading, modal opening, etc.

## 🎯 What You'll See

1. Browser opens automatically
2. Script navigates to the profile page
3. Clicks "mir gefallen" button → modal opens
4. Extracts all visible accounts
5. Clicks "Mehr Likes laden" repeatedly until no more accounts
6. Saves to `host_accounts.csv` progressively
7. Closes modal, waits, then repeats for "ich gefalle"
8. Saves to `target_accounts.csv`
9. Shows detailed progress logs in terminal

## 🛠️ Alternative Usage

### Console Version
If you prefer to run the script manually in a browser:

1. Navigate to a markt.de profile page
2. Open browser developer console (F12)
3. Copy and paste the contents of `markt-de-scraper.js`
4. Press Enter to execute

## 📝 Notes

- The scraper respects the site's structure and includes reasonable delays
- Anonymous accounts (href="#") are automatically skipped
- Duplicate accounts are filtered out automatically
- CSV files are created with proper headers and escaping
- All account data is saved locally - no external data transmission