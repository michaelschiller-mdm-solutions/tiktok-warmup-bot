# Installation Guide - Enhanced DM Bot v3.0.0

## What's New in v3.0.0
- **Premium Account Integration**: Personalize messages with accounts your targets are following
- **Smart Placeholder System**: Use `{premium_account1}`, `{premium_account2}`, `{premium_account3}`
- **Fallback Text Support**: Automatic fallback when no followed accounts are available
- **Data Coverage Statistics**: See how many targets have premium data available
- **Enhanced UI**: Better tooltips and status indicators

## Installation Steps

### 1. Download Extension Files
Ensure you have these files:
- `manifest.json`
- `simple-robust-dm.js`

### 2. Load Extension in Chrome
1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the folder containing the extension files
5. The extension should now appear in your extensions list

### 3. Verify Installation
1. Navigate to any markt.de profile page
2. You should see the DM Bot UI in the top-right corner
3. The UI should show "Enhanced Version" in the title area

## Usage Guide

### Step 1: Prepare Your Data Files

#### Target Accounts CSV (same as before)
```csv
name,ID,link
Xlyeds,38826864,https://www.markt.de/xlyeds/userId,38826864/profile.htm
DavidH31,13251843,https://www.markt.de/davidh31/userId,13251843/profile.htm
```

#### Premium Followed Data CSV (NEW!)
```csv
target_account,target_account_id,followed_account,followed_account_id,is_premium,profile_image_url,profile_link
Xlyeds,38826864,Beheo,31787572,true,https://static.markt.de/bundles/edhjdhjj/image/markt/userprofile/default_private.svg,"https://www.markt.de/beheo/userId,31787572/profile.htm"
DavidH31,13251843,Lady Sassy99,26005535,true,https://imagecache.markt.de/N8jkxyXVUhrR3LWnMYwsNDy-jK0=/fit-in/160x200/images_profile/23/02/8a68-1e95-4f1c-8c1f-d9310d5b0884/image,"https://www.markt.de/lady+sassy99/userId,26005535/profile.htm"
```

### Step 2: Configure the Bot
1. **Upload Target Accounts**: Click "Load Target Accounts" and select your target accounts CSV
2. **Upload Premium Data**: Click "Load Premium Data" and select your premium followed data CSV
3. **Set Message Template**: Use placeholders like `{premium_account1}` in your message
4. **Configure Fallback Text**: Set text to use when no followed accounts are available
5. **Adjust Delay**: Set delay between accounts (3-30 seconds)

### Step 3: Example Message Template
```
Hey ich habe gesehen, dass du {premium_account1} auch folgst 🫣 Falls du mich auch ganz süß findest und mich kennenlerenen willst schreib mir doch auf Telegrm @xxcherry12 oder auf instagrm @notAnnaFae
```

### Step 4: Start Campaign
1. Click "START" to begin the automated DM campaign
2. Monitor progress in the UI
3. Use "STOP" to pause, "Resume" to continue
4. Check premium data coverage statistics

## Features Overview

### Smart Account Selection
1. **Premium accounts first** (is_premium: true)
2. **Regular accounts second** (is_premium: false)  
3. **Fallback text last** (when no accounts available)

### Placeholder System
- `{premium_account1}` - First random followed account
- `{premium_account2}` - Second random followed account
- `{premium_account3}` - Third random followed account

### Data Coverage
- Shows percentage of targets with premium data
- Displays premium vs regular account counts
- Color-coded indicators (green >50%, orange ≤50%)

## Troubleshooting

### Common Issues

**"No premium data loaded"**
- Make sure you uploaded the premium followed data CSV
- Check that the CSV has the correct format and headers
- Verify the file contains valid data (not just headers)

**"Coverage 0%"**
- Target account names in both CSV files must match exactly
- Check for spelling differences or extra spaces
- Ensure target accounts exist in the premium data

**Placeholders not replaced**
- Verify placeholder syntax: `{premium_account1}` (with curly braces)
- Check that fallback text is configured
- Ensure premium data is loaded before starting campaign

**Extension not visible**
- Make sure you're on a markt.de page
- Check that the extension is enabled in chrome://extensions/
- Try refreshing the page

### Debug Information
The extension logs detailed information to the browser console:
1. Press F12 to open Developer Tools
2. Go to the Console tab
3. Look for messages starting with 🚀, 👥, or 💬

## Data Privacy
- All data is stored locally in your browser
- No data is sent to external servers
- Clear browser data to remove stored information
- Use "Clear State" button to reset all data

## Support
For issues or questions:
1. Check the console for error messages
2. Verify your CSV file formats
3. Test with a small dataset first
4. Review the PREMIUM_ACCOUNT_FEATURE.md for detailed documentation