# Automated Account Setup API Guide

This document outlines how to use the automated Instagram account setup process. The API has been simplified to automatically detect email server settings and provides real-time progress updates via WebSockets.

## Endpoint

The process is initiated by executing a Node.js script from the command line, passing a single JSON string as an argument.

```bash
node scripts/api/account_setup.js '<json_payload>'
```

## Data Payload

The script can accept either a single JSON object for one account or an array of JSON objects for processing multiple accounts in a batch.

The system automatically determines the correct IMAP server settings for `gmail.com` and `rambler.ru`.

### JSON Structure (Single Account)

```json
{
  "containerNumber": 123,
  "username": "your_instagram_username",
  "password": "your_instagram_password",
  "email": "verification_email@gmail.com",
  "email_password": "your_email_app_password"
}
```

### JSON Structure (Batch of Accounts)
To process multiple accounts, provide an array of account objects. They will be processed sequentially.

```json
[
  {
    "containerNumber": 1,
    "username": "user_one",
    "password": "password_one",
    "email": "one@gmail.com",
    "email_password": "email_pass_one"
  },
  {
    "containerNumber": 2,
    "username": "user_two",
    "password": "password_two",
    "email": "two@rambler.ru",
    "email_password": "email_pass_two"
  }
]
```

### Field Descriptions

| Field             | Type   | Description                                                                                                                              | Required |
| ----------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | :------: |
| `containerNumber` | number | The 1-based index of the iPhone container to use for the setup.                                                                          |   Yes    |
| `username`        | string | The username for the new Instagram account.                                                                                              |   Yes    |
| `password`        | string | The password for the new Instagram account.                                                                                              |   Yes    |
| `email`           | string | The email address for verification. Used to find the IMAP server and log in.                                                             |   Yes    |
| `email_password`  | string | The password for the verification email account. **Note:** For services like Gmail, this must be an "App Password," not the main password. |   Yes    |

### Important Notes

- The entire JSON payload must be enclosed in single quotes (`'`) to be treated as a single argument.
- The `email` and `email_password` are only used to fetch the 6-digit verification token and are not stored.

---

## Final Output

When processing is complete, the script will output a final JSON summary.

### Example Success Output (Batch)
```json
{
  "success": true,
  "message": "Processed 2 accounts.",
  "results": [
    {
      "username": "user_one",
      "success": true,
      "message": "Account setup for user_one completed successfully."
    },
    {
      "username": "user_two",
      "success": true,
      "message": "Account setup for user_two completed successfully."
    }
  ]
}
```

### Example Mixed Output (Batch)
```json
{
  "success": false,
  "message": "Processed 2 accounts.",
  "results": [
    {
      "username": "user_one",
      "success": true,
      "message": "Account setup for user_one completed successfully."
    },
    {
      "username": "user_two",
      "success": false,
      "error": "Timeout: No verification email..."
    }
  ]
}
```

---

## Real-Time Progress Updates

The system provides real-time progress updates via a WebSocket server, allowing a frontend to monitor the automation step-by-step. When running a batch, a new session is started for each account.

### WebSocket Server

The WebSocket server starts automatically on port `3001` when the `account_setup.js` script is run. A frontend can connect to `ws://localhost:3001`.

For development, you can run the server independently:
```bash
node scripts/api/progress_server.js
```

### WebSocket Message Types

The server broadcasts JSON messages with a `type` and `data` field.

#### 1. `session_started`
Sent when the automation process begins.

#### 2. `step_update`
Sent each time the process moves to a new step. The `data` object includes the current step number, name, and overall progress percentage.

#### 3. `session_completed`
Sent when the process finishes, indicating either success or failure.

#### 4. `session_status`
Sent to a newly connected client if a session is already in progress, allowing the frontend to sync up.

*For detailed message structures, see the `test_progress_client.html` source code or the `ProgressReporter.js` service.*

### Step Progression (5 Steps)

| Step | Name                             | Progress |
| :--- | :------------------------------- | :------: |
| 1    | Selecting Container              |   20%    |
| 2    | Entering Username                |   40%    |
| 3    | Entering Password & Login        |   60%    |
| 4    | Fetching Verification Token      |   80%    |
| 5    | Entering Token & Skipping Onboarding |   100%   |

---

## Testing & Demos

### Live Progress Monitoring
A test client is provided to visualize the progress updates.
1.  Open `scripts/api/test_progress_client.html` in your web browser.
2.  Run the `account_setup.js` script in your terminal.
3.  The test client will connect automatically and display the live progress.

### Demo Mode
To test the WebSocket integration without running the full automation, use the demo script. It simulates the 5-step process with realistic delays.
```bash
node scripts/api/demo_progress.js
```
Open the test client to watch the simulated progress. 