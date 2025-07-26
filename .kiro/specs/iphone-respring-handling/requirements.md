# Requirements Document

## Introduction

The iPhone automation system currently has a critical issue where the iPhone resprings (restarts) during certain operations, particularly during photo cleaning tasks. When this happens, subsequent automation tasks are being marked as completed even though they didn't actually execute, leading to incomplete warmup phases and unreliable automation results.

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want the automation system to detect when the iPhone has resprung, so that automation doesn't continue with invalid state.

#### Acceptance Criteria

1. WHEN the iPhone resprings during an automation task THEN the system SHALL detect the respring event
2. WHEN a respring is detected THEN the system SHALL pause automation execution
3. WHEN a respring is detected THEN the system SHALL log the respring event with timestamp and context

### Requirement 2

**User Story:** As a system administrator, I want the automation system to automatically wake up the iPhone after a respring, so that automation can continue reliably.

#### Acceptance Criteria

1. WHEN a respring is detected THEN the system SHALL execute wake_up.lua script
2. WHEN wake_up.lua is executed THEN the system SHALL wait for the iPhone to be fully responsive
3. WHEN the iPhone is responsive after wake-up THEN the system SHALL verify the iPhone is ready for automation
4. IF wake_up.lua fails THEN the system SHALL retry up to 3 times with exponential backoff

### Requirement 3

**User Story:** As a system administrator, I want failed automation tasks due to resprings to be properly handled, so that accounts don't get stuck in invalid states.

#### Acceptance Criteria

1. WHEN a task fails due to iPhone respring THEN the system SHALL mark the task as failed (not completed)
2. WHEN a task fails due to respring THEN the system SHALL reset the account's warmup phase status to allow retry
3. WHEN a respring occurs THEN the system SHALL apply appropriate cooldown before retrying
4. WHEN retrying after respring THEN the system SHALL re-execute the complete phase (not just continue from where it left off)

### Requirement 4

**User Story:** As a system administrator, I want respring events to be monitored and reported, so that I can track iPhone stability and take corrective action.

#### Acceptance Criteria

1. WHEN resprings occur THEN the system SHALL track respring frequency and patterns
2. WHEN respring frequency exceeds threshold THEN the system SHALL alert administrators
3. WHEN resprings occur THEN the system SHALL log detailed context including current phase, account, and container
4. WHEN multiple resprings occur in short time THEN the system SHALL temporarily pause automation to prevent device damage