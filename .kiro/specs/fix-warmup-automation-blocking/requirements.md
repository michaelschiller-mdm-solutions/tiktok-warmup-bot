# Requirements Document

## Introduction

The warmup automation system has a critical bug where multiple accounts are stuck in "in_progress" status, violating the single bot constraint. Since there's only one iPhone, only ONE account can be processed at a time. The system is currently showing 4 accounts in "in_progress" status for 14-15 minutes each, which indicates they're stuck and blocking the queue.

## Requirements

### Requirement 1: Single Account Processing Enforcement

**User Story:** As a system administrator, I want the warmup automation to process only one account at a time, so that the single iPhone resource is used efficiently and accounts don't get stuck.

#### Acceptance Criteria

1. WHEN the WarmupQueueService starts processing an account THEN it SHALL mark the account as "in_progress" and prevent other accounts from starting
2. WHEN an account is already "in_progress" THEN the queue service SHALL skip processing until that account completes
3. WHEN an account has been "in_progress" for more than 10 minutes THEN the system SHALL consider it stuck and reset it to "available"
4. WHEN the queue service polls for ready accounts THEN it SHALL return zero accounts if any account is currently "in_progress"

### Requirement 2: Stuck Process Detection and Recovery

**User Story:** As a system administrator, I want stuck automation processes to be automatically detected and recovered, so that the queue doesn't get permanently blocked.

#### Acceptance Criteria

1. WHEN an account has been "in_progress" for more than 10 minutes THEN the system SHALL log it as stuck and reset the status
2. WHEN a stuck process is detected THEN the system SHALL update the phase status to "available" and clear the bot session
3. WHEN resetting a stuck process THEN the system SHALL log the incident for debugging
4. WHEN the system detects multiple "in_progress" accounts THEN it SHALL reset all but the most recent one

### Requirement 3: Skip Onboarding Integration

**User Story:** As a system administrator, I want new accounts to automatically skip Instagram onboarding, so that the automation can proceed without manual intervention.

#### Acceptance Criteria

1. WHEN an account is being processed for the first time THEN the system SHALL execute "skip_onboarding.lua" before any other scripts
2. WHEN container selection is complete THEN the system SHALL check if this is the account's first automation
3. WHEN skip_onboarding is executed THEN the system SHALL wait for completion before proceeding with the actual phase script
4. WHEN skip_onboarding fails THEN the system SHALL retry up to 3 times before failing the phase

### Requirement 4: Cooldown Configuration Application

**User Story:** As a model manager, I want the cooldown settings I configure in the frontend to be properly applied to accounts, so that phases are spaced according to my specifications.

#### Acceptance Criteria

1. WHEN a phase completes successfully THEN the system SHALL read the cooldown configuration from the warmup_configuration table
2. WHEN applying cooldown THEN the system SHALL use the model-specific min/max cooldown hours instead of hardcoded values
3. WHEN no model-specific configuration exists THEN the system SHALL use default values of 15-24 hours
4. WHEN calculating cooldown THEN the system SHALL generate a random value between min_cooldown_hours and max_cooldown_hours

### Requirement 5: Process Cleanup and Error Handling

**User Story:** As a system administrator, I want robust error handling and process cleanup, so that failed automations don't leave the system in an inconsistent state.

#### Acceptance Criteria

1. WHEN an automation script fails THEN the system SHALL reset the account phase status to "available" after cooldown
2. WHEN the WarmupQueueService starts THEN it SHALL clean up any orphaned "in_progress" processes from previous runs
3. WHEN an iPhone script times out THEN the system SHALL terminate the process and mark the phase as failed
4. WHEN the system shuts down THEN it SHALL gracefully stop all running automations and reset their status