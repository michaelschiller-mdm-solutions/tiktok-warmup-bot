# Requirements Document

## Introduction

This feature adds an "Actions" column to all warmup phase tables in the frontend, providing manual intervention capabilities for account management. The Actions column will contain "Invalid" and "Get Token" buttons that allow administrators to manually mark accounts as invalid or retrieve authentication tokens when needed.

## Requirements

### Requirement 1

**User Story:** As an administrator, I want to see an Actions column in every warmup phase table, so that I can perform manual interventions on accounts during the warmup process.

#### Acceptance Criteria

1. WHEN viewing any warmup phase table THEN the system SHALL display an "Actions" column as the last column
2. WHEN the Actions column is displayed THEN it SHALL contain two buttons: "Invalid" and "Get Token"
3. WHEN the Actions column is added THEN it SHALL be consistent across all warmup phase tables (bio, username, post_no_caption, etc.)
4. WHEN the Actions column is displayed THEN it SHALL maintain proper table formatting and responsiveness

### Requirement 2

**User Story:** As an administrator, I want to click an "Invalid" button for any account, so that I can mark problematic accounts as invalid and remove them from the warmup pipeline.

#### Acceptance Criteria

1. WHEN I click the "Invalid" button THEN the system SHALL prompt for confirmation before proceeding
2. WHEN I confirm the invalid action THEN the system SHALL update the account's lifecycle_state to 'invalid'
3. WHEN an account is marked invalid THEN it SHALL be removed from all warmup phase tables
4. WHEN an account is marked invalid THEN the system SHALL log the action with timestamp and user information
5. WHEN the invalid action completes THEN the system SHALL show a success notification
6. IF the invalid action fails THEN the system SHALL show an error message and maintain the current state

### Requirement 3

**User Story:** As an administrator, I want to click a "Get Token" button for any account, so that I can retrieve or refresh the authentication token for troubleshooting purposes.

#### Acceptance Criteria

1. WHEN I click the "Get Token" button THEN the system SHALL attempt to retrieve the current authentication token
2. WHEN the token retrieval is successful THEN the system SHALL display the token in a modal or popup
3. WHEN the token is displayed THEN it SHALL be copyable to clipboard
4. WHEN the token retrieval fails THEN the system SHALL show an appropriate error message
5. WHEN the Get Token action is performed THEN it SHALL not affect the account's warmup status
6. WHEN the token modal is open THEN I SHALL be able to close it without affecting the account

### Requirement 4

**User Story:** As an administrator, I want the Actions column to be properly styled and responsive, so that it integrates seamlessly with the existing UI design.

#### Acceptance Criteria

1. WHEN the Actions column is displayed THEN it SHALL use consistent styling with existing table columns
2. WHEN buttons are displayed THEN they SHALL follow the existing design system (colors, fonts, spacing)
3. WHEN the table is viewed on different screen sizes THEN the Actions column SHALL remain accessible
4. WHEN buttons are hovered THEN they SHALL show appropriate hover states
5. WHEN buttons are disabled THEN they SHALL show appropriate disabled states
6. WHEN the Actions column is added THEN it SHALL not break existing table functionality (sorting, filtering, etc.)

### Requirement 5

**User Story:** As an administrator, I want appropriate permissions and error handling for Actions column operations, so that only authorized users can perform these actions safely.

#### Acceptance Criteria

1. WHEN a user without proper permissions views the table THEN the Actions column SHALL still be visible but buttons SHALL be disabled
2. WHEN an action fails due to network issues THEN the system SHALL show a retry option
3. WHEN an action is in progress THEN the relevant button SHALL show a loading state
4. WHEN multiple actions are attempted simultaneously THEN the system SHALL handle them appropriately
5. WHEN an action completes THEN the table data SHALL refresh to reflect changes
6. WHEN an error occurs THEN the system SHALL log it for debugging purposes