# 🚀 Installation Instructions

## Quick Install Steps

1. **Open Chrome Extensions**
   - Go to `chrome://extensions/` in your browser
   - Or click the puzzle piece icon → "Manage extensions"

2. **Enable Developer Mode**
   - Toggle "Developer mode" ON in the top right corner

3. **Load the Extension**
   - Click "Load unpacked"
   - Navigate to and select the `marktde/api-test-extension` folder
   - Click "Select Folder"

4. **Verify Installation**
   - You should see "Markt.de API Test Extension" in your extensions list
   - The extension icon should appear in your toolbar

## 🧪 Testing Steps

### Step 1: Navigate to Markt.de
- Go to `https://www.markt.de/benutzer/postfach.htm`
- Make sure you're logged in
- Navigate to the Anna-Fae chat (Thread ID: 2193521669)

### Step 2: Open Extension
- Click the extension icon in your toolbar
- The popup should open with pre-filled values

### Step 3: Test API Calls
1. **Extract Page Info** - Click to see current page data
2. **Get Messages** - Should show the conversation history
3. **Get Threads** - Should show your inbox threads
4. **Check Updates** - Should show update polling data

### Step 4: Test Message Sending (Optional)
⚠️ **Warning**: This will send real messages!

- **Text Only**: Enter "API Test" in message field, leave File ID empty
- **Image Only**: Leave message empty, use File ID: `486190cd-995e-4190-86aa-964ec377d48a`
- **Text + Image**: Enter both message and File ID

## 🐛 Troubleshooting

### Common Issues:

1. **"executeScript is undefined" Error**
   - Make sure you're using Chrome (not Firefox/Edge)
   - Ensure the extension has proper permissions
   - Try reloading the extension

2. **"Not on markt.de page" Error**
   - Navigate to any markt.de page first
   - Make sure the URL contains "markt.de"

3. **API Calls Failing**
   - Check if you're logged into markt.de
   - Open browser DevTools (F12) and check Console for errors
   - Use the "View Logs" button in the extension for detailed debugging

### Debug Information:

The extension logs everything to:
- Browser console (F12 → Console)
- Extension storage (use "View Logs" button)
- Network tab (F12 → Network) shows actual API calls

### Expected Results:

When working correctly, you should see:
- **Get Messages**: Full conversation with Anna-Fae (12+ messages)
- **Get Threads**: List of all your conversations
- **Send Message**: Success response with empty data object

## 📊 API Call Examples

Based on the latest intercepted data, here are the exact API patterns:

### Text-Only Message:
```
POST /benutzer/postfach.htm
Body: ajaxCall=submitMessage&threadId=2193521669&userId=39826031&message=test
```

### Image-Only Message:
```
POST /benutzer/postfach.htm  
Body: ajaxCall=submitMessage&threadId=2193521669&userId=39826031&fileId=486190cd-995e-4190-86aa-964ec377d48a
```

### Text + Image Message:
```
POST /benutzer/postfach.htm
Body: ajaxCall=submitMessage&threadId=2193521669&userId=39826031&message=text+mit+bild&fileId=1e2d2243-0e97-4a96-949a-dbe06c65c565
```

## ✅ Success Indicators

The extension is working correctly when:
- Page info extraction shows correct thread ID and user ID
- Get Messages returns conversation history with 12+ messages
- API calls return JSON responses (not HTML error pages)
- Console shows detailed logging with timestamps
- No "executeScript" or permission errors

If you see any issues, check the logs and let me know the exact error messages!