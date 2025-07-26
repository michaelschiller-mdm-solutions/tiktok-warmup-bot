# Design Document

## Overview

This design addresses the critical warmup automation blocking issue where multiple accounts get stuck in "in_progress" status, violating the single iPhone constraint. The solution involves implementing robust single-account processing, stuck process detection, skip onboarding integration, proper cooldown configuration, and comprehensive error handling.

## Architecture

### Current Problem Analysis
- **Root Cause**: WarmupQueueService starts processing accounts but they get stuck in "in_progress" status
- **Symptom**: 4 accounts showing as "in_progress" for 14-15 minutes each
- **Impact**: Queue is blocked, no new accounts can be processed
- **Constraint**: Only ONE iPhone available, so only ONE account can be processed at a time

### Solution Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    WarmupQueueService                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Startup Cleanup    │ Reset orphaned "in_progress"       │
│ 2. Single Bot Check   │ Skip if any account "in_progress"  │
│ 3. Stuck Detection    │ Reset accounts stuck > 10 minutes  │
│ 4. Process Execution  │ Enhanced error handling & cleanup  │
│ 5. Skip Onboarding    │ Run skip_onboarding.lua first      │
│ 6. Cooldown Config    │ Use model-specific settings        │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Enhanced WarmupQueueService

#### New Methods:
```typescript
class WarmupQueueService {
  // Startup cleanup
  private async cleanupOrphanedProcesses(): Promise<void>
  
  // Single bot constraint enforcement
  private async isAnyAccountInProgress(): Promise<boolean>
  
  // Stuck process detection
  private async detectAndResetStuckProcesses(): Promise<void>
  
  // Skip onboarding integration
  private async executeSkipOnboardingIfNeeded(accountId: number): Promise<boolean>
  
  // Enhanced cooldown application
  private async applyCooldownFromConfiguration(accountId: number, phase: string): Promise<void>
}
```

#### Modified Process Flow:
```typescript
async processQueue(): Promise<void> {
  // 1. Clean up any stuck processes
  await this.detectAndResetStuckProcesses();
  
  // 2. Check single bot constraint
  if (await this.isAnyAccountInProgress()) {
    return; // Skip this cycle
  }
  
  // 3. Get ready accounts (should return 0 if any in progress)
  const readyAccounts = await this.getValidatedReadyAccounts();
  
  // 4. Process single account with enhanced error handling
  if (readyAccounts.length > 0) {
    await this.processAccountWithCleanup(readyAccounts[0]);
  }
}
```

### 2. Skip Onboarding Integration

#### Implementation in WarmupExecutor:
```javascript
async executePhase(accountId, containerNumber, phase, username) {
  // 1. Container selection
  await this.bridge.selectContainer(containerNumber);
  
  // 2. Skip onboarding if first time
  const isFirstTime = await this.isFirstTimeAutomation(accountId);
  if (isFirstTime) {
    await this.executeSkipOnboarding();
  }
  
  // 3. Execute phase script
  await this.executePhaseScript(phase);
}
```

### 3. Database Schema Updates

#### New Tracking Fields:
```sql
-- Add first_automation_completed flag to accounts
ALTER TABLE accounts ADD COLUMN first_automation_completed BOOLEAN DEFAULT FALSE;

-- Add process tracking to account_warmup_phases
ALTER TABLE account_warmup_phases ADD COLUMN process_timeout_at TIMESTAMP;
```

### 4. Cooldown Configuration Integration

#### Enhanced Cooldown Logic:
```typescript
private async applyCooldownFromConfiguration(accountId: number, phase: string): Promise<void> {
  // Get model-specific configuration
  const config = await this.getWarmupConfiguration(accountId);
  
  // Use configured cooldown or defaults
  const minHours = config?.min_cooldown_hours || 15;
  const maxHours = config?.max_cooldown_hours || 24;
  
  // Apply random cooldown within range
  const cooldownHours = minHours + Math.random() * (maxHours - minHours);
  const cooldownUntil = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);
  
  // Update database
  await this.updatePhaseCooldown(accountId, phase, cooldownUntil);
}
```

## Data Models

### Enhanced Account Warmup Phases
```sql
CREATE TABLE account_warmup_phases (
  -- Existing fields...
  
  -- New fields for process tracking
  process_timeout_at TIMESTAMP,
  stuck_reset_count INTEGER DEFAULT 0,
  last_stuck_reset_at TIMESTAMP,
  
  -- Enhanced error tracking
  consecutive_failures INTEGER DEFAULT 0,
  last_failure_reason TEXT
);
```

### Warmup Configuration Usage
```sql
-- Ensure warmup_configuration is properly used
SELECT 
  wc.min_cooldown_hours,
  wc.max_cooldown_hours,
  wc.single_bot_constraint
FROM warmup_configuration wc
JOIN accounts a ON a.model_id = wc.model_id
WHERE a.id = $1;
```

## Error Handling

### 1. Stuck Process Detection
- **Timeout**: 10 minutes maximum for any "in_progress" phase
- **Detection**: Run every 30 seconds during queue processing
- **Recovery**: Reset to "available" status, log incident, increment stuck_reset_count

### 2. iPhone Script Failures
- **Timeout Handling**: 5-minute maximum per script execution
- **Retry Logic**: Up to 3 retries for transient failures
- **Cleanup**: Always reset status on failure after cooldown

### 3. Skip Onboarding Failures
- **Detection**: Monitor skip_onboarding.lua execution
- **Retry**: Up to 3 attempts with 2-second delays
- **Fallback**: Continue with phase if skip onboarding fails after retries

### 4. Cooldown Configuration Errors
- **Missing Config**: Fall back to default 15-24 hour range
- **Invalid Values**: Validate min < max, both > 0
- **Database Errors**: Log error, use defaults, continue processing

## Testing Strategy

### 1. Single Bot Constraint Testing
- Start multiple backend instances, verify only one processes accounts
- Simulate stuck processes, verify detection and reset
- Test queue blocking and recovery

### 2. Skip Onboarding Testing
- Test with new accounts (first_automation_completed = false)
- Verify skip_onboarding.lua executes before phase scripts
- Test failure scenarios and retry logic

### 3. Cooldown Configuration Testing
- Configure different cooldown ranges in frontend
- Verify cooldowns are applied according to configuration
- Test fallback to defaults when configuration missing

### 4. Error Recovery Testing
- Simulate iPhone disconnection during processing
- Test stuck process detection and reset
- Verify system recovery after errors

## Implementation Priority

### Phase 1: Critical Fixes (Immediate)
1. Implement stuck process detection and reset
2. Enforce single bot constraint in queue processing
3. Add startup cleanup for orphaned processes

### Phase 2: Skip Onboarding Integration
1. Add first_automation_completed tracking
2. Integrate skip_onboarding.lua execution
3. Test with new accounts

### Phase 3: Cooldown Configuration
1. Implement model-specific cooldown reading
2. Replace hardcoded cooldown values
3. Test frontend configuration integration

### Phase 4: Enhanced Error Handling
1. Add comprehensive timeout handling
2. Implement retry logic improvements
3. Add detailed logging and monitoring