# PBI-8: Human Review Queue System

## Overview

This PBI implements a human review queue system that automatically captures failed operations during the warmup and automation process, flags accounts for manual review, and provides an interface for campaign managers to resolve issues and get accounts back on track.

## Problem Statement

Bot automation will inevitably encounter failures - Instagram challenges, unexpected captchas, content rejection, or other platform issues. When these failures occur, accounts need human intervention to resolve the problems. Without a systematic approach:

- Failed accounts get stuck in the pipeline
- Manual intervention is reactive rather than proactive
- No tracking of resolution efforts or success rates
- Campaign managers lack visibility into failure patterns

## User Stories

**Primary Story**: As a campaign manager, I want a human review queue for failed operations so that I can manually resolve issues and maintain account health.

**Supporting Stories**:
- As a campaign manager, I want to see all accounts that need manual intervention so that I can prioritize my time effectively
- As a campaign manager, I want to understand why an account failed so that I can take appropriate action
- As a campaign manager, I want to track my resolution efforts so that the system learns from manual interventions
- As a campaign manager, I want accounts to automatically resume after I fix issues so that the pipeline continues smoothly

## Technical Approach

### Review Status Integration
- Add `review_required` status to existing warmup phase system
- When bot operations fail, automatically set phase status to `review_required`
- Include failure reason, timestamp, and retry count in status details

### Database Enhancements
- Extend existing `warmup_phases` table with review fields
- Add `review_logs` table for tracking resolution efforts
- Store failure reasons, attempted solutions, and outcomes

### Backend Services
- **ReviewQueueService**: Manage review queue operations
- **FailureDetectionService**: Automatically flag failed operations
- **ResolutionTrackingService**: Track manual intervention outcomes

### Frontend Components
- **ReviewQueue view**: List of accounts needing attention
- **AccountReview component**: Detailed review interface for individual accounts
- **ResolutionActions component**: Common resolution workflows

## UX/UI Considerations

### Review Queue Interface
- Priority-sorted list of accounts needing review
- Clear failure reason display
- Account context (username, current phase, last bot action)
- Quick action buttons for common resolutions

### Account Review Details
- Complete timeline of bot actions leading to failure
- Screenshots or error messages from bot
- Manual action buttons (retry, skip phase, reset account)
- Notes field for documenting resolution

### Status Management
- Clear visual indicators for review status
- Easy transition back to automated pipeline
- Bulk actions for similar failures
- Success/failure tracking for interventions

## Acceptance Criteria

### Automatic Failure Detection
- ✅ Bot failures automatically trigger review status
- ✅ Include detailed failure context and timestamps
- ✅ Support multiple failure types (captcha, challenge, content rejection, etc.)
- ✅ Prevent accounts from getting stuck in failed states

### Review Queue Management
- ✅ Prioritized list of accounts needing review
- ✅ Filter by failure type, account status, or time since failure
- ✅ Search for specific accounts by username
- ✅ Bulk operations for similar issues

### Manual Resolution Interface
- ✅ Clear display of failure reason and context
- ✅ Action buttons for common resolutions
- ✅ Ability to add resolution notes
- ✅ Resume automation after manual fix

### Resolution Tracking
- ✅ Log all manual interventions with timestamps
- ✅ Track success rates for different resolution types
- ✅ Report on common failure patterns
- ✅ Learning system for improved bot retry logic

## Dependencies

- Warmup process system (from Task 2-7)
- Account lifecycle management (from PBI 2)
- Bot integration and error handling
- Notification system (optional)

## Open Questions

1. Should we implement automatic retry logic before flagging for review?
2. How long should accounts wait in review status before escalation?
3. Should we integrate with notification systems (email, Slack) for urgent failures?
4. What metrics should we track for resolution effectiveness?

## Related Tasks

This PBI will be broken down into the following tasks:
- [View Tasks](./tasks.md)

[View in Backlog](../backlog.md#user-content-8) 