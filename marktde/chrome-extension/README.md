# Markt.de DM Bot - Chrome Extension

A Chrome extension that automates direct messaging campaigns on markt.de with human-like behavior and comprehensive tracking.

## Features

- 🔐 **Automatic Login** - Secure credential storage and session management
- 📊 **CSV Account Management** - Import target accounts and track contacted users
- 💬 **Automated DM Sending** - Send personalized messages with natural timing
- 🤖 **Human-like Behavior** - Realistic typing, clicking, and delay patterns
- 📈 **Progress Tracking** - Real-time campaign statistics and monitoring
- 🛡️ **Error Recovery** - Robust error handling with retry mechanisms
- 📝 **Comprehensive Logging** - Detailed activity logs with export functionality
- ⚙️ **Configurable Settings** - Customizable delays, limits, and message templates

## Installation

### From Source

1. **Clone or download** this extension folder
2. **Generate Icons** (optional):
   ```bash
   node create-icons.js
   # Open create-icons.html in browser and download PNG icons
   ```
3. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the extension folder
   - The extension icon should appear in your toolbar

### From Chrome Web Store
*Coming soon - extension will be published after testing*

## Usage

### 1. Initial Setup

1. **Click the extension icon** in your Chrome toolbar
2. **Navigate to markt.de** in the same browser tab
3. **Enter your credentials** in the popup:
   - Email: `jodie@kodo-marketing.de`
   - Password: `PW%xZ,kjb5CF_R*`
4. **Click "Login to Markt.de"** and wait for confirmation

### 2. Upload Target Accounts

1. **Prepare a CSV file** with target accounts:
   ```csv
   name,userId,link
   "John Doe",12345,"https://www.markt.de/profil/john-doe"
   "Jane Smith",67890,"https://www.markt.de/profil/jane-smith"
   ```
2. **Click "Upload Target Accounts CSV"** in the popup
3. **Select your CSV file** - the extension will validate and load accounts
4. **Verify the account count** is displayed correctly

### 3. Configure Settings (Optional)

1. **Click "Settings"** to expand the configuration section
2. **Adjust parameters**:
   - **Max Accounts per Session**: Maximum accounts to contact (default: 50)
   - **Delay between accounts**: Seconds to wait between each DM (default: 5)
   - **DM Message Template**: Customize your message content
3. **Click "Save Settings"** to apply changes

### 4. Start Campaign

1. **Click "Start Campaign"** to begin automated DM sending
2. **Monitor progress** in real-time:
   - Current account being processed
   - Success/failure counts
   - Overall progress percentage
3. **Use "Stop Campaign"** to halt the process at any time

### 5. Review Results

1. **Check "Recent Activity"** for detailed logs
2. **Export logs** for external analysis if needed
3. **Review statistics** for campaign performance metrics

## Configuration

### Default Settings

```javascript
{
  maxAccountsPerSession: 50,
  delayBetweenAccounts: 5000, // 5 seconds
  messageTemplate: "Hey ich habe gesehen, dass du einer Freundin von mir auch folgst 🫣 Falls du mich auch ganz süß findestund mich kennenlerenen willst schreib mir doch auf Telegram @",
  retryAttempts: 3,
  timeouts: {
    login: 30000,      // 30 seconds
    navigation: 30000, // 30 seconds  
    dmSend: 15000      // 15 seconds
  }
}
```

### CSV Format

Your target accounts CSV must include these columns:
- **name**: Display name of the account
- **userId**: Unique identifier for the account
- **link**: Full URL to the markt.de profile

Example:
```csv
name,userId,link
"Max Mustermann",123456,"https://www.markt.de/profil/max-mustermann"
"Anna Schmidt",789012,"https://www.markt.de/profil/anna-schmidt"
```

## Safety Features

### Human-like Behavior
- **Natural typing speed** with character-by-character delays
- **Realistic click patterns** with mouse movement simulation
- **Random delays** between actions to avoid detection
- **Exponential backoff** for retry attempts

### Error Handling
- **Session validation** before starting campaigns
- **Automatic retry** for temporary failures
- **Graceful degradation** when encountering errors
- **Detailed error logging** for troubleshooting

### Rate Limiting Protection
- **Configurable delays** between account processing
- **Maximum accounts per session** limits
- **Automatic pause** on suspected rate limiting
- **Session cookie management** for authentication

## Troubleshooting

### Common Issues

**Extension not loading:**
- Ensure you're using Chrome (not other browsers)
- Check that Developer mode is enabled
- Verify all files are present in the extension folder

**"Extension context invalidated" errors:**
- This is normal during development when reloading the extension
- The extension handles these gracefully and will recover automatically
- Simply reload the markt.de page after reloading the extension
- No action needed - the extension will reinitialize properly

**Login fails:**
- Verify credentials are correct
- Check that you're on markt.de domain
- Clear browser cookies and try again
- Check browser console for error messages

**Campaign won't start:**
- Ensure you're logged in successfully
- Verify CSV file was uploaded correctly
- Check that target accounts are valid
- Navigate to a markt.de page first

**DM sending fails:**
- Check internet connection
- Verify target profile URLs are accessible
- Ensure markt.de site structure hasn't changed
- Review error logs for specific issues

**Extension stops working after reload:**
- This is expected behavior during development
- Refresh the markt.de page to reinitialize the content script
- The extension will automatically detect and handle context changes

### Debug Information

Access debug information in browser console:
```javascript
// Get extension status
window.getMarktDMDebugInfo()

// Check if content script is loaded
window.marktDMContentScript
```

### Log Export

Export detailed logs for analysis:
1. Open extension popup
2. Expand "Recent Activity" section
3. Click "Export Logs"
4. Save JSON file for review

## Development

### Project Structure

```
marktde/chrome-extension/
├── manifest.json              # Extension configuration
├── background.js              # Service worker
├── popup/
│   ├── popup.html            # Popup interface
│   ├── popup.js              # Popup controller
│   └── popup.css             # Popup styling
├── content/
│   ├── content-script.js     # Main content script
│   ├── markt-interface.js    # Markt.de DOM interactions
│   ├── automation-engine.js  # Campaign management
│   └── human-behavior.js     # Behavior simulation
├── utils/
│   ├── storage-manager.js    # Chrome storage wrapper
│   ├── csv-parser.js         # CSV processing
│   └── logger.js             # Logging system
└── icons/                    # Extension icons
```

### Building Icons

```bash
# Generate SVG icons
node create-icons.js

# Convert to PNG (manual step)
# 1. Open create-icons.html in browser
# 2. Download PNG files for each size
# 3. Save in icons/ directory
```

### Testing

1. **Load extension** in Chrome developer mode
2. **Navigate to markt.de** 
3. **Open browser console** to monitor logs
4. **Test context handling** (optional):
   ```javascript
   // Run this in browser console on markt.de
   // Copy and paste the contents of test-context-handling.js
   ```
5. **Test each feature** systematically:
   - Login functionality
   - CSV upload and parsing
   - Campaign start/stop
   - DM sending process
   - Error handling
6. **Test extension reload** (development):
   - Go to chrome://extensions/
   - Click reload button for the extension
   - Return to markt.de and refresh the page
   - Verify extension reinitializes properly

## Security Considerations

### Data Privacy
- **Local storage only** - no data sent to external servers
- **Encrypted credentials** using Chrome storage API
- **Session management** with automatic cleanup
- **No tracking or analytics** collection

### Safe Automation
- **Respectful delays** to avoid overwhelming servers
- **Error recovery** to handle temporary issues gracefully
- **Session validation** to ensure proper authentication
- **Rate limiting** to prevent abuse

## Support

### Getting Help
- Check this README for common solutions
- Review browser console for error messages
- Export and analyze extension logs
- Verify markt.de site hasn't changed structure

### Reporting Issues
When reporting issues, please include:
- Chrome version and operating system
- Extension version and installation method
- Steps to reproduce the problem
- Browser console errors (if any)
- Exported log files (if relevant)

## License

This extension is for educational and personal use only. Please respect markt.de's terms of service and use responsibly.

## Changelog

### Version 1.0.0
- Initial release
- Complete DM automation functionality
- CSV account management
- Human-like behavior simulation
- Comprehensive logging and statistics
- Chrome extension architecture