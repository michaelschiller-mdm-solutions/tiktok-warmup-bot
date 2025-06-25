# PBI-4: Automated Instagram Account Setup

## Overview
This PBI covers the creation of a resilient, automated workflow for setting up new Instagram accounts on an iPhone. The process will be orchestrated by a Node.js backend service that programmatically controls an iPhone via the XXTouch framework, handling everything from user login to verification and initial onboarding steps.

## Problem Statement
Manually setting up new Instagram accounts is time-consuming, error-prone, and does not scale. It requires manual data entry for username and password, waiting for a verification email, retrieving a token, and navigating through several onboarding screens. This manual process is a significant bottleneck in provisioning new accounts for the system.

## User Stories
- As a System Admin, I want to trigger a fully automated account setup process by providing the account credentials and target container, so that I can provision new accounts efficiently and without manual intervention.

## Technical Approach
The solution will be a new Node.js service (`AccountSetupService`) that orchestrates a sequence of actions. It will leverage the existing `AutomationBridge` to execute Lua scripts on the iPhone.

The flow is as follows:
1.  **Select Container**: Use the existing `AutomationBridge.selectContainer()` method.
2.  **Enter Credentials**: Push username and password to the iPhone's clipboard and execute Lua scripts (`enter_email.lua`, `enter_password_and_login.lua`) to paste them into the Instagram app.
3.  **Fetch Verification Token**: A new `EmailTokenFetcher` service will poll a specified email account (Gmail/Rambler) via IMAP until it finds the verification email and extracts the 6-digit token.
4.  **Enter Token**: Push the token to the clipboard and execute `enter_verification_token.lua`.
5.  **Skip Onboarding**: Execute `skip_onboarding.lua` to finalize the setup.

A new API script, `scripts/api/account_setup.js`, will be created to expose this functionality to the frontend.

## UX/UI Considerations
N/A. This is a backend automation feature. The primary interface will be a single API endpoint.

## Acceptance Criteria
- The system can successfully select a specified container on the iPhone.
- The system can input the username and password into the Instagram login screen.
- The system can poll an IMAP inbox, find a verification email, and extract a 6-digit code.
- The system can input the verification code to complete the login.
- The system can execute a script to skip the post-login onboarding flow.
- The entire process is exposed via a single script in `scripts/api/` that the frontend can call.

## Dependencies
- Existing `AutomationBridge` service.
- New `node-imap` or similar library for email fetching.
- A set of new Lua scripts for data entry and onboarding (to be provided separately).

## Open Questions
- What is the definitive timeout and polling interval for the email fetching logic? (Initial assumption: 60s timeout, 5s interval).
- What is the exact format of the verification email content for reliable token extraction?

## Related Tasks
- [View Tasks](./tasks.md) 