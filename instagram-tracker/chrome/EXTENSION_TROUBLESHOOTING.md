# Instagram Automation Extension Troubleshooting

## Current Issue: Content Script Not Loading

Based on the debug results, the main issue is that the content script is not loading properly. Here's how to fix it:

### Step 1: Verify Extension Installation

1. **Open Chrome Extensions Page**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)

2. **Check Extension Status**:
   - Find "Instagram Follow/Unfollow Automation"
   - Ensure it's **enabled** (toggle should be blue)
   - Look for any **error messages** in red

3. **Reload Extension**:
   - Click the **"Reload"** button (circular arrow icon)
   - Check for any error messages after reload

### Step 2: Test Extension Loading

1. **Go to Instagram**:
   - Navigate to `https://www.instagram.com`
   - Wait for page to fully load

2. **Open Browser Console**:
   - Press `F12` or right-click → "Inspect"
   - Go to "Console" tab

3. **Run Test Script**:
   ```javascript
   // Copy and paste this into the console:
   
   console.log('=== Extension Loading Test ===');
   
   // Test 1: Check if Chrome runtime is available
   console.log('Chrome Runtime:', typeof chrome !== 'undefined' && chrome.runtime ? '✅ Available' : '❌ Not Available');
   
   // Test 2: Check if content script classes are loaded
   console.log('HumanBehaviorSimulator:', typeof HumanBehaviorSimulator !== 'undefined' ? '✅ Loaded' : '❌ Not Loaded');
   console.log('InstagramInterface:', typeof InstagramInterface !== 'undefined' ? '✅ Loaded' : '❌ Not Loaded');
   console.log('AutomationEngine:', typeof AutomationEngine !== 'undefined' ? '✅ Loaded' : '❌ Not Loaded');
   console.log('ContentScript:', typeof InstagramAutomationContentScript !== 'undefined' ? '✅ Loaded' : '❌ Not Loaded');
   
   // Test 3: Check if content script instance exists
   console.log('Content Script Instance:', window.instagramAutomationContentScript ? '✅ Created' : '❌ Not Created');
   
   // Test 4: Check if sidebar exists
   const sidebar = document.getElementById('instagram-automation-sidebar');
   console.log('Sidebar Element:', sidebar ? '✅ Present' : '❌ Missing');
   
   // Test 5: Try to ping background script
   if (typeof chrome !== 'undefined' && chrome.runtime) {
     chrome.runtime.sendMessage({type: 'PING'}, (response) => {
       console.log('Background Script:', response && response.success ? '✅ Responding' : '❌ Not Responding');
     });
   }
   ```

### Step 3: Manual Initialization (If Needed)

If the content script classes are loaded but not initialized:

```javascript
// Manual initialization script:
if (typeof InstagramAutomationContentScript !== 'undefined' && !window.instagramAutomationContentScript) {
  console.log('🔄 Attempting manual initialization...');
  try {
    window.instagramAutomationContentScript = new InstagramAutomationContentScript();
    window.instagramAutomationContentScript.initialize();
    console.log('✅ Manual initialization successful');
  } catch (error) {
    console.log('❌ Manual initialization failed:', error.message);
  }
}
```

### Step 4: Common Solutions

#### Problem: "Chrome runtime not available"
**Solution**: Extension not loaded properly
- Go to `chrome://extensions/`
- Reload the extension
- Refresh Instagram page

#### Problem: "Content script classes not loaded"
**Solution**: Files missing or manifest issue
- Check that all files exist in the chrome folder:
  - `content/human-behavior.js`
  - `content/instagram-interface.js`
  - `content/automation-engine.js`
  - `content/content-script.js`
- Verify `manifest.json` is valid JSON

#### Problem: "Sidebar missing"
**Solution**: Content script not initializing
- Run manual initialization script above
- Check console for JavaScript errors
- Ensure you're on `https://www.instagram.com` (not `http://`)

#### Problem: "Search button not found"
**Solution**: Instagram interface changed
- This is expected - the extension uses search-only navigation
- The search functionality will work once content script loads

### Step 5: File Verification

Ensure these files exist in your `instagram-tracker/chrome/` folder:

```
chrome/
├── manifest.json
├── background.js
├── content/
│   ├── content-script.js
│   ├── human-behavior.js
│   ├── instagram-interface.js
│   ├── automation-engine.js
│   └── sidebar.css
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

### Step 6: Generate Missing Icons (If Needed)

If icons are missing:

**Windows (PowerShell)**:
```powershell
cd instagram-tracker/chrome
./generate-icons.ps1
```

**Windows (Command Prompt)**:
```cmd
cd instagram-tracker/chrome
generate-icons.bat
```

### Step 7: Test Follow/Unfollow

Once the extension is loaded:

1. **Look for sidebar** on the right side of Instagram
2. **Enter a username** in the test field (try "instagram")
3. **Click "Test Follow"** - should work without errors
4. **Click "Test Unfollow"** - should work without errors

### Expected Behavior

When working correctly:
- ✅ Sidebar appears on Instagram pages
- ✅ Test buttons work without connection errors
- ✅ Console shows "Content script loaded" message
- ✅ Search functionality uses human-like behavior (no direct URLs)

### Still Having Issues?

If the extension still doesn't work after following these steps:

1. **Check browser compatibility**: Ensure you're using Chrome or Chromium-based browser
2. **Disable other extensions**: Temporarily disable other extensions that might conflict
3. **Clear browser cache**: Clear cache and cookies for Instagram
4. **Try incognito mode**: Test in incognito window to rule out cache issues
5. **Check permissions**: Ensure the extension has permission to access Instagram

### Debug Scripts Available

- `debug-extension.js` - Comprehensive testing suite
- `reload-extension.js` - Extension reload helper
- Manual test scripts (provided above)

Run these in the browser console on Instagram for detailed diagnostics.

## Human-Like Navigation Confirmed

The extension now uses **ONLY** search-based navigation:
- ✅ Clicks search button in navigation
- ✅ Types username in search input
- ✅ Selects profile from search results
- ✅ No direct URL navigation
- ✅ Human-like delays and behavior

This ensures maximum authenticity and avoids detection.