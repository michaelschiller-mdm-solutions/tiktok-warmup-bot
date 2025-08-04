# Requirements Document

## Introduction

This feature involves converting the existing markt.de DM bot from a Playwright-based Node.js application into a Chrome extension that can automatically log in to markt.de and send direct messages to target accounts. The Chrome extension will provide a more user-friendly interface and better integration with the browser environment while maintaining all the core functionality of the original bot.

## Requirements

### Requirement 1

**User Story:** As a user, I want to install a Chrome extension that can automatically log into markt.de with my credentials, so that I can manage DM campaigns directly from my browser without running separate Node.js scripts.

#### Acceptance Criteria

1. WHEN the extension is installed THEN it SHALL appear in the Chrome extensions toolbar with a recognizable icon
2. WHEN the user clicks the extension icon THEN it SHALL open a popup interface with login configuration options
3. WHEN the user enters valid markt.de credentials (jodie@kodo-marketing.de / PW%xZ,kjb5CF_R*) THEN the extension SHALL store them securely using Chrome storage API
4. WHEN the extension attempts login THEN it SHALL navigate to https://www.markt.de/nichtangemeldet.htm and fill the login form automatically
5. WHEN login is successful THEN it SHALL capture and store session cookies (__ssid, __rtbh.lid, __spdt) for future use
6. WHEN the "remember me" checkbox is available THEN it SHALL check it automatically during login

### Requirement 2

**User Story:** As a user, I want the extension to automatically handle cookie consent dialogs and other popups, so that the automation process runs smoothly without manual intervention.

#### Acceptance Criteria

1. WHEN the extension encounters a cookie consent dialog THEN it SHALL automatically click the accept button using the known selectors
2. WHEN multiple cookie consent selector options exist THEN it SHALL try each selector until one succeeds
3. WHEN cookie consent is handled THEN it SHALL wait appropriately before proceeding with other actions
4. WHEN no cookie consent dialog is found THEN it SHALL continue without error
5. WHEN cookie consent fails THEN it SHALL log the error but continue with the automation process

### Requirement 3

**User Story:** As a user, I want to load target accounts from a CSV file and have the extension track which accounts have been contacted, so that I never send duplicate messages to the same person.

#### Acceptance Criteria

1. WHEN the user uploads a target_accounts.csv file THEN the extension SHALL parse it and extract name, userId, and profile link for each account
2. WHEN the extension processes accounts THEN it SHALL maintain a contacted_accounts.csv file with timestamps and status
3. WHEN an account has already been contacted THEN it SHALL skip that account and move to the next one
4. WHEN the extension starts a campaign THEN it SHALL only process uncontacted accounts up to the configured limit
5. WHEN an account is successfully contacted THEN it SHALL be marked with status "success" and timestamp
6. WHEN an account contact fails THEN it SHALL be marked with status "failed" and include the error message

### Requirement 4

**User Story:** As a user, I want the extension to automatically navigate to target profiles and send personalized DMs, so that I can run automated outreach campaigns efficiently.

#### Acceptance Criteria

1. WHEN the extension processes a target account THEN it SHALL navigate to the account's profile link
2. WHEN on a profile page THEN it SHALL click the "Nachricht" button to open the DM dialog
3. WHEN the DM dialog opens THEN it SHALL wait for the textarea to be available
4. WHEN the textarea is ready THEN it SHALL type the configured message: "Hey ich habe gesehen, dass du einer Freundin von mir auch folgst 🫣 Falls du mich auch ganz süß findestund mich kennenlerenen willst schreib mir doch auf Telegram @"
5. WHEN the message is typed THEN it SHALL click the "Nachricht abschicken" button to send
6. WHEN the message is sent THEN it SHALL wait the configured delay before processing the next account

### Requirement 5

**User Story:** As a user, I want a user-friendly popup interface to control the extension, monitor progress, and configure settings, so that I can easily manage my DM campaigns.

#### Acceptance Criteria

1. WHEN the extension popup opens THEN it SHALL display current login status and session information
2. WHEN the user is not logged in THEN it SHALL show login controls and credential input fields
3. WHEN a campaign is running THEN it SHALL display real-time progress including accounts processed, successful sends, and failures
4. WHEN the user wants to start a campaign THEN it SHALL provide a "Start Campaign" button that begins processing uncontacted accounts
5. WHEN the user wants to stop a campaign THEN it SHALL provide a "Stop Campaign" button that halts processing
6. WHEN the extension encounters errors THEN it SHALL display them in the popup interface with clear error messages
7. WHEN the user wants to configure settings THEN it SHALL provide options for delays, limits, and message customization

### Requirement 6

**User Story:** As a user, I want the extension to implement human-like behavior and proper error handling, so that the automation appears natural and recovers gracefully from issues.

#### Acceptance Criteria

1. WHEN the extension types text THEN it SHALL simulate natural typing with character-by-character delays
2. WHEN the extension clicks elements THEN it SHALL include realistic delays between actions
3. WHEN the extension encounters network errors THEN it SHALL retry the operation up to 3 times with exponential backoff
4. WHEN the extension encounters missing elements THEN it SHALL wait up to 10 seconds before timing out
5. WHEN the extension processes accounts THEN it SHALL include random delays between 3-7 seconds between each account
6. WHEN the extension detects rate limiting THEN it SHALL pause for an extended period before continuing
7. WHEN the extension encounters unexpected errors THEN it SHALL log them and continue with the next account

### Requirement 7

**User Story:** As a user, I want the extension to maintain detailed logs and statistics, so that I can monitor campaign performance and troubleshoot issues.

#### Acceptance Criteria

1. WHEN the extension performs any action THEN it SHALL log the action with timestamp and status
2. WHEN the extension completes processing accounts THEN it SHALL display summary statistics including success rate
3. WHEN the extension encounters errors THEN it SHALL log detailed error information for debugging
4. WHEN the user views the popup THEN it SHALL show current session statistics and recent activity
5. WHEN the extension runs over multiple sessions THEN it SHALL persist statistics across browser restarts
6. WHEN the user wants to export logs THEN it SHALL provide an option to download log files
7. WHEN the extension updates account status THEN it SHALL immediately reflect changes in the CSV tracking files