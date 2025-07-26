# Implementation Plan

- [ ] 1. Fix Critical Single Bot Constraint Violation
  - Implement stuck process detection and reset in WarmupQueueService
  - Add single bot constraint enforcement to prevent multiple simultaneous processing
  - Add startup cleanup to reset orphaned "in_progress" processes from previous runs
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 5.2_

- [ ] 2. Implement Stuck Process Detection and Recovery
  - Create detectAndResetStuckProcesses method to find accounts stuck > 10 minutes
  - Add process timeout tracking with process_timeout_at field
  - Implement automatic reset of stuck processes to "available" status
  - Add logging for stuck process incidents and recovery actions
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ] 3. Enhance Queue Processing with Single Bot Logic
  - Modify processQueue to check for any "in_progress" accounts before processing
  - Update getValidatedReadyAccounts to return empty if any account is "in_progress"
  - Add isAnyAccountInProgress method to enforce single bot constraint
  - Implement proper error handling and cleanup in processAccountPhase
  - _Requirements: 1.1, 1.2, 1.4, 5.1, 5.3_

- [ ] 4. Integrate Skip Onboarding for New Accounts
  - Add first_automation_completed boolean field to accounts table
  - Implement isFirstTimeAutomation check in WarmupExecutor
  - Add executeSkipOnboarding method to run skip_onboarding.lua before phase scripts
  - Update container selection flow to include skip onboarding when needed
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 5. Implement Model-Specific Cooldown Configuration
  - Create getWarmupConfiguration method to read model-specific cooldown settings
  - Replace hardcoded cooldown values with configuration-based cooldown calculation
  - Implement applyCooldownFromConfiguration method in WarmupQueueService
  - Add fallback to default 15-24 hours when configuration is missing
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 6. Add Enhanced Error Handling and Process Cleanup
  - Implement timeout handling for iPhone script execution (5-minute maximum)
  - Add comprehensive error recovery that resets phase status after failures
  - Create graceful shutdown handling that cleans up running processes
  - Add retry logic for transient failures with exponential backoff
  - _Requirements: 5.1, 5.3, 5.4, 3.4_

- [ ] 7. Add Database Schema Updates for Process Tracking
  - Add first_automation_completed field to accounts table
  - Add process_timeout_at, stuck_reset_count, last_stuck_reset_at fields to account_warmup_phases
  - Add consecutive_failures and last_failure_reason fields for enhanced error tracking
  - Create database migration for new fields
  - _Requirements: 2.1, 2.3, 5.1, 3.1_

- [ ] 8. Test and Validate Single Bot Constraint Enforcement
  - Create test script to verify only one account processes at a time
  - Test stuck process detection and automatic recovery
  - Validate that queue properly blocks when account is "in_progress"
  - Test startup cleanup of orphaned processes
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

- [ ] 9. Test Skip Onboarding Integration
  - Test skip_onboarding.lua execution on new accounts
  - Verify skip onboarding runs before phase scripts
  - Test retry logic when skip onboarding fails
  - Validate first_automation_completed flag is set correctly
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 10. Test Cooldown Configuration Application
  - Configure different cooldown ranges in frontend for test models
  - Verify cooldowns are applied according to model-specific configuration
  - Test fallback to default values when configuration is missing
  - Validate random cooldown generation within configured ranges
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
