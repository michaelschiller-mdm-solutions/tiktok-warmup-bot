# Requirements Document

## Introduction

This feature implements a web scraper for markt.de profile pages that extracts user data from "mir gefallen" (host accounts) and "ich gefalle" (target accounts) lists. The scraper navigates through modal dialogs, handles pagination, and progressively saves data to CSV files during the scraping process.

## Requirements

### Requirement 1

**User Story:** As a data analyst, I want to provide a markt.de profile URL and automatically scrape all host accounts from the "mir gefallen" modal, so that I can collect user data for analysis.

#### Acceptance Criteria

1. WHEN I provide a markt.de profile URL (e.g., https://www.markt.de/dinademona/userId,19354400/profile.htm) THEN the system SHALL navigate to the page and locate the "mir gefallen" button
2. WHEN the "mir gefallen" button is clicked THEN the system SHALL open the modal dialog and extract all visible user accounts
3. WHEN user accounts are found THEN the system SHALL extract name, userId, and profile link from each account
4. WHEN the "Mehr Likes laden" button exists THEN the system SHALL click it to load more accounts and repeat the extraction process
5. WHEN no more accounts can be loaded THEN the system SHALL complete the host accounts extraction
6. WHEN each account is processed THEN the system SHALL immediately append the data (name,ID,link format) to a host_accounts.csv file

### Requirement 2

**User Story:** As a data analyst, I want to automatically scrape all target accounts from the "ich gefalle" modal, so that I can collect comprehensive user relationship data.

#### Acceptance Criteria

1. WHEN the host accounts extraction is complete THEN the system SHALL locate and click the "ich gefalle" button
2. WHEN the "ich gefalle" modal opens THEN the system SHALL extract all visible target accounts using the same extraction logic
3. WHEN target accounts are found THEN the system SHALL extract name, userId, and profile link from each account
4. WHEN the "Mehr Likes laden" button exists THEN the system SHALL click it repeatedly until no more accounts can be loaded
5. WHEN each target account is processed THEN the system SHALL immediately append the data to a target_accounts.csv file
6. WHEN anonymous accounts (href="#") are encountered THEN the system SHALL skip them and continue processing

### Requirement 3

**User Story:** As a user, I want the scraper to handle browser automation reliably with proper error handling, so that the scraping process completes successfully even with network delays or page loading issues.

#### Acceptance Criteria

1. WHEN the scraper starts THEN the system SHALL use a headless browser automation framework (Playwright)
2. WHEN navigating to pages or clicking buttons THEN the system SHALL wait for elements to be fully loaded before proceeding
3. WHEN modal dialogs are opened THEN the system SHALL wait for the content to be populated before extracting data
4. WHEN network delays occur THEN the system SHALL implement appropriate timeouts and retry logic
5. WHEN extraction errors occur THEN the system SHALL log the error and continue with the next account
6. WHEN the scraping process completes THEN the system SHALL provide a summary of total accounts scraped

### Requirement 4

**User Story:** As a user, I want to see real-time progress updates and have the data saved incrementally, so that I don't lose progress if the scraping process is interrupted.

#### Acceptance Criteria

1. WHEN the scraping process starts THEN the system SHALL create CSV files with proper headers (name,ID,link)
2. WHEN each account is successfully extracted THEN the system SHALL immediately write the data to the appropriate CSV file
3. WHEN processing accounts THEN the system SHALL display progress updates showing current count and status
4. WHEN the process is interrupted THEN the system SHALL preserve all data that has been written to the CSV files
5. WHEN duplicate accounts are encountered THEN the system SHALL skip them to avoid duplicate entries
6. WHEN the scraping completes THEN the system SHALL display final statistics for both host and target accounts

### Requirement 5

**User Story:** As a developer, I want the scraper to properly parse markt.de HTML structure and handle edge cases, so that data extraction is accurate and reliable.

#### Acceptance Criteria

1. WHEN parsing user account elements THEN the system SHALL correctly extract data from the clsy-c-userbox structure
2. WHEN extracting profile links THEN the system SHALL parse the href attribute to get the full profile URL
3. WHEN extracting userIds THEN the system SHALL parse the userId parameter from the profile URL
4. WHEN extracting usernames THEN the system SHALL get the profile name from the clsy-c-userbox__profile-name element
5. WHEN encountering accounts with special characters or formatting THEN the system SHALL handle them properly in CSV output
6. WHEN the modal structure changes slightly THEN the system SHALL use robust selectors that can adapt to minor HTML variations