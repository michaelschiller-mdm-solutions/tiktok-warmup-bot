# Markt.de API Test Extension

This extension allows you to test and verify the markt.de API endpoints before implementing the full AI chat bot.

## 🚀 Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the `marktde/api-test-extension` folder
4. Navigate to any markt.de page (preferably the inbox or a chat)

## 🧪 Features

### Page Data Extraction
- Extract current page information
- Identify chat elements and message counts
- Detect new vs existing chats
- Extract user IDs from various sources

### API Testing
- **Get Messages**: Test message retrieval for specific threads
- **Get Threads**: Test inbox thread listing
- **Check Updates**: Test real-time update polling
- **Send Message**: Test message sending (text, images, or both)

### DOM Analysis
- Extract all chat data from inbox
- Identify basis vs premium chats
- Extract user IDs from profile links
- Analyze conversation states

### Session Information
- View browser session data
- Check authentication status
- Inspect available cookies and storage

## 📋 Usage Instructions

### For the Anna-Fae Chat (Thread ID: 2193521669)

1. **Navigate to the chat**: Go to the Anna-Fae conversation
2. **Open the extension**: Click the extension icon in the toolbar
3. **Extract Page Info**: Click "Extract Page Data" to see current page details
4. **Test API Calls**: 
   - The Thread ID and User ID should auto-populate
   - Try "Get Messages" to see the conversation history
   - Try "Send Message" with a test message

### Testing Message Sending

The extension supports all three message types found in the API logs:

1. **Text Only**: Enter message text, leave File ID empty
2. **Image Only**: Leave message text empty, enter a File ID
3. **Text + Image**: Enter both message text and File ID

**Known File IDs from logs:**
- `00fa8d2c-9d01-42a9-b88f-5a44c718b36f`
- `1e2d2243-0e97-4a96-949a-dbe06c65c565`

## 🔍 Key Information Extracted

From the API logs, we know:

- **Your User ID**: `39826031`
- **Anna-Fae's User ID**: `39793847` 
- **Anna-Fae Thread ID**: `2193521669`
- **API Endpoint**: `/benutzer/postfach.htm`
- **Message Format**: URL-encoded form data

## ⚠️ Important Notes

- **Use with caution**: This extension makes real API calls to markt.de
- **Test messages**: Any messages sent will be real messages in the conversation
- **Rate limiting**: Be mindful of making too many API calls quickly
- **Session required**: You must be logged into markt.de for API calls to work

## 🐛 Debugging

The extension logs all API calls to the browser console. Open Developer Tools (F12) and check the Console tab for detailed information about:

- API call interceptions
- Request/response data
- Error messages
- Page state information

## 📊 Expected Results

When testing with the Anna-Fae chat, you should see:

- **Get Messages**: Full conversation history with message IDs, timestamps, and content
- **Get Threads**: List of all conversations in your inbox
- **Send Message**: Successful message delivery (check the actual chat to confirm)
- **DOM Extraction**: Chat elements with proper thread IDs and user information

This extension will help verify that our API understanding is correct before implementing the full AI chat bot system.