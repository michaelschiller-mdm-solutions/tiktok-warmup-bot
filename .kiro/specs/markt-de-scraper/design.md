# Design Document

## Overview

The markt.de scraper will be implemented as a JavaScript console script that can be executed directly in the browser's developer console while on a markt.de profile page. This approach eliminates the need for external browser automation tools and allows for immediate execution and testing. The script will handle modal interactions, data extraction, and CSV file generation entirely within the browser environment.

## Architecture

### Console Script Architecture
- **Single JavaScript File**: A self-contained script that can be copy-pasted into the browser console
- **Browser APIs**: Utilizes native browser APIs for DOM manipulation, file downloads, and user interaction
- **Asynchronous Processing**: Uses async/await patterns for handling modal loading and pagination
- **Progressive Data Export**: Downloads CSV files incrementally as data is collected

### Execution Flow
1. Script initialization and validation of current page
2. Host accounts extraction from "mir gefallen" modal
3. Target accounts extraction from "ich gefalle" modal  
4. CSV file generation and download for each dataset

## Components and Interfaces

### Main Controller
```javascript
class MarktDeScraper {
  constructor() {
    this.hostAccounts = [];
    this.targetAccounts = [];
    this.processedUrls = new Set();
  }
  
  async scrapeProfile() {
    // Main orchestration method
  }
}
```

### Modal Handler
```javascript
class ModalHandler {
  async openModal(buttonSelector) {
    // Click button and wait for modal to load
  }
  
  async loadAllAccounts(modalSelector) {
    // Extract current visible accounts
    // Check for "Mehr Likes laden" button
    // Click button and wait for new accounts to load
    // Repeat until button no longer exists or no new accounts appear
    // Return all collected accounts
  }
  
  async clickLoadMore() {
    // Click "Mehr Likes laden" button
    // Wait for new content to load
    // Return success/failure status
  }
  
  closeModal() {
    // Close current modal
  }
}
```

### Data Extractor
```javascript
class DataExtractor {
  extractAccountsFromModal(modalElement) {
    // Parse clsy-c-userbox elements
    // Return array of {name, userId, link}
  }
  
  parseProfileUrl(href) {
    // Extract userId from URL pattern
  }
  
  sanitizeForCSV(text) {
    // Handle special characters and escaping
  }
}
```

### CSV Generator
```javascript
class CSVGenerator {
  constructor() {
    this.existingData = new Map(); // Track existing entries by userId
  }
  
  appendToCSV(newAccounts, filename) {
    // Check for duplicates against existing data
    // Only add new unique accounts
    // Append to existing CSV or create new one
  }
  
  loadExistingCSV(filename) {
    // Load previously downloaded CSV data to check for duplicates
  }
  
  downloadUpdatedCSV(filename) {
    // Download complete CSV with all accumulated data
  }
}
```

## Data Models

### Account Data Structure
```javascript
{
  name: string,      // Profile display name
  userId: string,    // Extracted from URL userId parameter
  link: string       // Full profile URL
}
```

### Processing State
```javascript
{
  currentModal: 'host' | 'target' | null,
  totalProcessed: number,
  duplicatesSkipped: number,
  newAccountsAdded: number,
  loadMoreClicks: number,
  errors: Array<{account: string, error: string}>
}
```

## Error Handling

### Modal Loading Errors
- Implement retry logic with exponential backoff
- Timeout handling for slow-loading modals
- Fallback selectors for modal detection

### Data Extraction Errors
- Skip malformed account entries and log errors
- Handle missing userId or profile name gracefully
- Continue processing remaining accounts on individual failures

### Network and DOM Errors
- Detect when "Mehr Likes laden" button fails to load more content
- Handle DOM changes during extraction process
- Provide user feedback for critical failures

## Testing Strategy

### Manual Testing Approach
Since this is a console script, testing will be primarily manual:

1. **Profile Page Validation**: Test on various markt.de profile pages
2. **Modal Interaction Testing**: Verify both "mir gefallen" and "ich gefalle" modals work
3. **Pagination Testing**: Test with profiles that have many likes (requiring pagination)
4. **Edge Case Testing**: Test with profiles having special characters, anonymous users
5. **CSV Output Validation**: Verify CSV format and data accuracy

### Console Logging Strategy
- Progress indicators showing current extraction status
- Error logging with specific account information
- Summary statistics at completion
- Debug mode for detailed operation logging

## Implementation Considerations

### CSV Duplication Prevention
- Maintain in-memory Set of processed userIds to prevent duplicates within session
- Check against existing CSV data if files already exist
- Only append new unique accounts to CSV files
- Never recreate or delete existing CSV files - only append new data

### Scrolling/Pagination Logic
- After extracting visible accounts, look for "Mehr Likes laden" button
- Click button and wait for new accounts to load into the modal
- Compare account count before/after to detect if new accounts were loaded
- Continue clicking until button disappears or no new accounts appear
- Handle cases where button exists but no more data is available

### Browser Compatibility
- Use modern JavaScript features (ES6+) available in current browsers
- Avoid deprecated APIs or browser-specific features
- Test in Chrome/Edge (primary) and Firefox (secondary)

### Performance Optimization
- Batch DOM queries to minimize reflows
- Use efficient selectors for account extraction
- Implement reasonable delays to avoid overwhelming the server
- Process accounts in chunks to prevent browser freezing
### User Experience
- Clear console output with progress indicators
- Automatic file downloads with descriptive filenames
- Error recovery suggestions for common issues
- Estimated completion time based on current progress

### Security Considerations
- No external API calls or data transmission
- All processing happens locally in the browser
- CSV files are generated and downloaded locally
- No sensitive data storage or persistence

## File Structure

```
markt-de-scraper.js          # Main console script
├── MarktDeScraper           # Main controller class
├── ModalHandler             # Modal interaction logic
├── DataExtractor            # HTML parsing and data extraction
├── CSVGenerator             # CSV creation and download
└── Utils                    # Helper functions and constants
```

## Configuration Options

The script will include configurable options at the top:

```javascript
const CONFIG = {
  delays: {
    modalLoad: 2000,        // Wait time for modal loading
    loadMore: 1500,         // Wait between "Mehr Likes laden" clicks
    extraction: 500,        // Wait between account extractions
    duplicateCheck: 200     // Wait during duplicate checking
  },
  selectors: {
    hostButton: '.clsy-profile__likes-dialog-i-them',
    targetButton: '.clsy-profile__likes-dialog-they-me',
    modal: '.clsy-c-dialog__body',
    loadMoreButton: '.clsy-c-endlessScrolling--hasMore',
    accountBox: '.clsy-c-userbox'
  },
  csv: {
    hostFilename: 'host_accounts.csv',
    targetFilename: 'target_accounts.csv'
  }
};
```