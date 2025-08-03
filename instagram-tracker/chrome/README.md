# Instagram Follow/Unfollow Chrome Extension

A sophisticated Chrome extension that automates Instagram follow/unfollow operations with advanced anti-detection capabilities. Designed to work seamlessly with anti-detect browsers and implement human-like behavior patterns to avoid Instagram's bot detection systems.

## Features

### 🤖 Advanced Anti-Detection
- **Human-like Typing**: Variable typing speeds (80-200ms per character) with realistic typos and corrections
- **Natural Mouse Movements**: Curved paths with micro-jitter, detour routes, and unpredictable behavior
- **Contextual Browsing**: Profile viewing, scrolling, and content interaction before following
- **Intelligent Timing**: Random delays, mandatory breaks, and natural activity distribution
- **Rate Limit Compliance**: Respects Instagram's 2025 daily/hourly limits with exponential backoff

### 📊 Queue Management
- **CSV/TXT File Upload**: Bulk import of usernames with drag-and-drop support
- **Dual Queue System**: Separate follow and unfollow queues with intelligent prioritization
- **Progressive Daily Limits**: Configurable limits that can increase over time
- **Automatic Scheduling**: Smart unfollow scheduling after configurable delays

### 🎯 Safety Features
- **Daily Limit Enforcement**: Conservative defaults (100 follows/day for new accounts)
- **Rate Limit Detection**: Automatic detection and response to Instagram blocks
- **Error Recovery**: Exponential backoff retry logic with intelligent failure handling
- **Emergency Stop**: Instant automation halt with one-click stop button

### 📈 Analytics & Monitoring
- **Real-time Dashboard**: Live progress tracking and status monitoring
- **Action History**: Comprehensive logging of all follow/unfollow operations
- **Success Rate Tracking**: Performance analytics and error pattern detection
- **Export Functionality**: CSV export of action logs and statistics

## Installation

### Prerequisites
- Chrome browser (or Chromium-based browser)
- Anti-detect browser recommended for maximum protection
- Instagram account

### Steps
1. **Download Extension**
   ```bash
   git clone <repository-url>
   cd instagram-tracker/chrome
   ```

2. **Generate Icons** (Required)
   The extension needs icon files to load properly. Run one of these commands:
   
   **Windows (PowerShell):**
   ```powershell
   .\generate-icons.ps1
   ```
   
   **Windows (Command Prompt):**
   ```cmd
   generate-icons.bat
   ```
   
   **Manual Method:**
   - Open `create-icons.html` in your web browser
   - Click "Generate Icons" then "Download Icons"
   - Save all 4 PNG files to the `icons/` folder
   - Run the script again to update the manifest

3. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `chrome` directory
   - The extension icon should appear in your toolbar

## Usage

### Getting Started
1. **Open Instagram**: Navigate to `https://www.instagram.com` and log in
2. **Access Extension**: Click the extension icon in your toolbar or use the sidebar on Instagram
3. **Upload Accounts**: Upload a CSV or TXT file with usernames (one per line)
4. **Configure Limits**: Set daily follow/unfollow limits (start conservative)
5. **Start Automation**: Click "Start" to begin the automation process

### File Format
**CSV Format:**
```csv
username1
username2
username3
```

**TXT Format:**
```
username1
username2
username3
```

**Notes:**
- One username per line
- Remove @ symbols (they'll be stripped automatically)
- Comments starting with # are ignored
- Empty lines are skipped

### Recommended Settings

#### New Accounts (< 30 days old)
- **Daily Follow Limit**: 50-100
- **Daily Unfollow Limit**: 50-100
- **Min Action Interval**: 45-60 seconds
- **Break After Actions**: 8-10 actions
- **Break Duration**: 15-30 minutes

#### Established Accounts (> 30 days old)
- **Daily Follow Limit**: 100-150
- **Daily Unfollow Limit**: 100-150
- **Min Action Interval**: 30-45 seconds
- **Break After Actions**: 10-15 actions
- **Break Duration**: 10-20 minutes

## Anti-Detection Features

### Human Behavior Simulation
- **Typing Patterns**: Realistic typing with 5% error rate and natural corrections
- **Mouse Movement**: Curved paths with 30% detour probability and hover jitter
- **Reading Simulation**: Pauses to "read" profiles and content before actions
- **Unpredictable Behavior**: Random scrolling, navigation, and idle movements

### Rate Limiting Compliance
- **Instagram 2025 Limits**: Respects current platform limits
- **Hourly Distribution**: Spreads actions over 8-12 hours daily
- **Exponential Backoff**: Intelligent retry logic with increasing delays
- **Detection Response**: Immediate stop on CAPTCHA or verification prompts

### Anti-Detect Browser Integration
- **Fingerprint Protection**: Leverages browser's built-in protection
- **Session Management**: Works with browser's session isolation
- **Proxy Support**: Compatible with browser's proxy rotation
- **Focus on Behavior**: Concentrates on human-like interactions

## Architecture

### Extension Components
- **Content Script**: Injected into Instagram pages for DOM manipulation
- **Background Service Worker**: Manages extension lifecycle and storage
- **Popup Interface**: Quick access controls and status monitoring
- **Sidebar UI**: Comprehensive interface overlaid on Instagram

### Core Modules
- **HumanBehaviorSimulator**: Realistic typing and mouse movement
- **InstagramInterface**: DOM interaction and element detection
- **AutomationEngine**: Orchestrates all automation operations
- **QueueManager**: Handles follow/unfollow queue processing

## Safety Guidelines

### Account Safety
1. **Start Slowly**: Begin with very conservative limits
2. **Monitor Closely**: Watch for any signs of detection or blocks
3. **Use Breaks**: Take regular breaks and avoid 24/7 operation
4. **Vary Patterns**: Don't follow predictable schedules
5. **Quality Over Quantity**: Focus on targeted, relevant accounts

### Risk Mitigation
- **Test Accounts**: Use test accounts before main accounts
- **Backup Strategy**: Have multiple accounts and don't rely on one
- **Stay Updated**: Keep extension updated with latest anti-detection methods
- **Follow ToS**: Respect Instagram's Terms of Service
- **Professional Use**: Consider this for legitimate business growth only

## Troubleshooting

### Common Issues

#### "Could not establish connection. Receiving end does not exist"
This is the most common error and occurs when extension components can't communicate.

**Quick Fixes:**
1. **Refresh Instagram page** - Most common solution
2. **Wait 5-10 seconds** - Extension may still be loading
3. **Check extension is enabled** - Go to `chrome://extensions/`

**Detailed Steps:**
1. Go to `chrome://extensions/`
2. Find "Instagram Follow/Unfollow Automation"
3. Ensure it's enabled (toggle should be blue)
4. Click "Reload" if you see any errors
5. Refresh Instagram page completely (Ctrl+F5)
6. Wait for page to fully load before trying automation

**Test Extension Status:**
Open browser console (F12) on Instagram and run:
```javascript
// Test background script
chrome.runtime.sendMessage({type: 'PING'}, (response) => {
  console.log('Background script:', response ? 'Working ✓' : 'Not responding ✗');
});

// Test content script
console.log('Content script:', window.instagramAutomationContentScript ? 'Loaded ✓' : 'Not loaded ✗');
```

#### Extension Not Loading
- Check if developer mode is enabled
- Verify all files are present in the chrome directory
- Check browser console for error messages
- Try reloading the extension

#### Automation Not Starting
- Ensure you're on Instagram.com
- Check if content script is injected (sidebar should appear)
- Verify account queue has usernames loaded
- Check daily limits haven't been reached

#### Rate Limiting Detected
- Wait for the cooldown period to complete
- Reduce daily limits and increase delays
- Check if account has been temporarily restricted
- Consider taking a longer break (24-48 hours)

#### Selectors Not Working
- Instagram frequently updates their interface
- Check browser console for selector errors
- Update selectors in `instagram-interface.js`
- Report issues for updates

### Debug Mode
Enable debug mode by opening browser console on Instagram:
```javascript
// Show automation cursor
document.getElementById('automation-cursor').style.display = 'block';

// Enable verbose logging
localStorage.setItem('automation-debug', 'true');
```

### Latest Fixes Applied (January 2025)

#### Issues Fixed:
1. **"setState is not a function" error** - Added missing methods to AutomationEngine
2. **Search button not found** - Implemented direct profile navigation (more reliable)
3. **Connection establishment failures** - Enhanced message handling and validation
4. **Content script initialization issues** - Fixed incomplete initialization

#### New Features:
- **Direct Profile Navigation**: Bypasses search, goes directly to `instagram.com/username/`
- **Comprehensive Debug Tools**: Run `debug-extension.js` in console for full diagnostics
- **Enhanced Error Messages**: Clear, actionable error descriptions
- **Better Fallback Methods**: Multiple approaches when primary methods fail

#### Testing the Fixes:
1. Load the extension in Chrome (`chrome://extensions/`)
2. Go to Instagram and open browser console (F12)
3. Copy and paste the contents of `debug-extension.js` into console
4. Run comprehensive tests to verify all components work
5. Test follow/unfollow with a known username like "instagram"

#### If Still Having Issues:
- Check `EXTENSION_FIXES_APPLIED.md` for detailed solutions
- Run individual debug tests to identify specific problems
- Ensure you're using the latest version with all fixes applied

## Development

### Project Structure
```
chrome/
├── manifest.json              # Extension manifest
├── background.js             # Background service worker
├── content/                  # Content scripts
│   ├── content-script.js     # Main content script
│   ├── human-behavior.js     # Behavior simulation
│   ├── instagram-interface.js # Instagram DOM interface
│   ├── automation-engine.js  # Automation orchestration
│   └── sidebar.css          # Sidebar styling
├── popup/                   # Popup interface
│   ├── popup.html           # Popup HTML
│   ├── popup.css            # Popup styling
│   └── popup.js             # Popup logic
├── icons/                   # Extension icons
└── README.md               # This file
```

### Building and Testing
1. **Load Extension**: Use Chrome's developer mode
2. **Test on Instagram**: Navigate to Instagram and test functionality
3. **Monitor Console**: Check for errors and debug information
4. **Test Edge Cases**: Try various scenarios and error conditions

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make changes and test thoroughly
4. Submit a pull request with detailed description

## Legal and Ethical Considerations

### Terms of Service
- This extension automates interactions with Instagram
- Users are responsible for complying with Instagram's Terms of Service
- Automated actions may violate platform policies
- Use at your own risk and discretion

### Ethical Usage
- Only follow accounts relevant to your niche or interests
- Don't spam or harass other users
- Respect rate limits and platform guidelines
- Use for legitimate business growth, not manipulation

### Disclaimer
This extension is provided for educational and research purposes. The developers are not responsible for any account restrictions, bans, or other consequences resulting from its use. Users assume all risks associated with automated Instagram interactions.

## Support

### Getting Help
- Check this README for common solutions
- Review browser console for error messages
- Test with a fresh Instagram account
- Ensure extension is up to date

### Reporting Issues
When reporting issues, please include:
- Browser version and type
- Extension version
- Steps to reproduce the issue
- Console error messages
- Screenshots if applicable

## Changelog

### Version 1.0.0
- Initial release
- Basic follow/unfollow automation
- Human behavior simulation
- Anti-detection features
- Queue management system
- Real-time monitoring dashboard

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Instagram for providing the platform
- Chrome Extensions API documentation
- Anti-detect browser communities
- Open source automation projects