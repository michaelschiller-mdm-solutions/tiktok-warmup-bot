# Design Document

## Overview

This design addresses the critical issue where iPhone resprings during automation cause subsequent tasks to be marked as completed without actually executing. The solution involves implementing respring detection, automatic iPhone wake-up, proper error handling, and monitoring capabilities.

## Architecture

### Core Components

1. **RespringDetector**: Monitors iPhone state and detects respring events
2. **WakeUpManager**: Handles iPhone wake-up after resprings using wake_up.lua
3. **AutomationRecovery**: Manages task recovery and state reset after resprings
4. **RespringMonitor**: Tracks respring patterns and provides alerting

### Integration Points

- **AutomationBridge**: Enhanced with respring detection and recovery
- **WarmupExecutor**: Modified to handle respring scenarios
- **WarmupQueueService**: Updated to properly handle respring failures
- **Database**: Extended to track respring events and recovery attempts

## Components and Interfaces

### RespringDetector

```javascript
class RespringDetector {
  async detectRespring(beforeState, afterState)
  async isIPhoneResponsive()
  async getIPhoneState()
  async waitForStableState(timeout)
}
```

**Detection Methods:**
- Monitor XXTouch server connectivity
- Check for sudden script termination patterns
- Detect device state changes (screen lock, app state)
- Monitor response time patterns

### WakeUpManager

```javascript
class WakeUpManager {
  async executeWakeUp(maxRetries = 3)
  async verifyWakeUpSuccess()
  async waitForDeviceReady(timeout = 30000)
}
```

**Wake-up Process:**
1. Execute wake_up.lua script
2. Wait for script completion
3. Verify iPhone responsiveness
4. Confirm automation readiness
5. Retry with exponential backoff if needed

### AutomationRecovery

```javascript
class AutomationRecovery {
  async handleRespringFailure(accountId, phase, containerNumber)
  async resetPhaseStatus(accountId, phase)
  async applyCooldownAfterRespring(accountId)
  async scheduleRetry(accountId, phase, delay)
}
```

**Recovery Process:**
1. Mark current task as failed (not completed)
2. Reset warmup phase status to allow retry
3. Apply appropriate cooldown period
4. Schedule complete phase re-execution
5. Update failure tracking

### RespringMonitor

```javascript
class RespringMonitor {
  async recordRespring(context)
  async checkRespringFrequency()
  async shouldPauseAutomation()
  async alertAdministrators(severity, details)
}
```

**Monitoring Features:**
- Track respring frequency and patterns
- Alert on excessive respring rates
- Temporary automation pause for device protection
- Detailed logging with context

## Data Models

### Respring Event

```sql
CREATE TABLE respring_events (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES accounts(id),
  container_number INTEGER,
  phase VARCHAR(50),
  detected_at TIMESTAMP DEFAULT NOW(),
  context JSONB,
  recovery_attempted BOOLEAN DEFAULT FALSE,
  recovery_successful BOOLEAN,
  recovery_completed_at TIMESTAMP
);
```

### Enhanced Warmup Phases

```sql
ALTER TABLE warmup_phases 
ADD COLUMN respring_count INTEGER DEFAULT 0,
ADD COLUMN last_respring_at TIMESTAMP,
ADD COLUMN recovery_attempts INTEGER DEFAULT 0;
```

## Error Handling

### Respring Detection Flow

1. **Pre-Script Execution**: Capture iPhone state baseline
2. **During Execution**: Monitor for connectivity loss or unexpected termination
3. **Post-Script Execution**: Compare state and detect anomalies
4. **Recovery Trigger**: Initiate wake-up and recovery process

### Error Categories

- **Connectivity Loss**: XXTouch server becomes unreachable
- **Script Termination**: Script stops unexpectedly without completion
- **State Mismatch**: iPhone state differs from expected after script
- **Response Timeout**: iPhone stops responding to commands

### Recovery Strategies

- **Immediate Recovery**: For single respring events
- **Delayed Recovery**: For repeated resprings (exponential backoff)
- **Automation Pause**: For excessive respring frequency
- **Manual Intervention**: For persistent device issues

## Testing Strategy

### Unit Tests

- RespringDetector state comparison logic
- WakeUpManager retry mechanisms
- AutomationRecovery phase reset logic
- RespringMonitor frequency calculations

### Integration Tests

- End-to-end respring detection and recovery
- Wake-up script execution and verification
- Database state consistency after recovery
- Cooldown and retry scheduling

### Simulation Tests

- Mock respring scenarios during different phases
- Test recovery under various failure conditions
- Validate monitoring and alerting thresholds
- Performance impact of respring detection

## Implementation Phases

### Phase 1: Detection and Wake-up
- Implement RespringDetector in AutomationBridge
- Add WakeUpManager with wake_up.lua integration
- Basic respring event logging

### Phase 2: Recovery and State Management
- Implement AutomationRecovery
- Database schema updates
- Phase status reset logic
- Cooldown and retry mechanisms

### Phase 3: Monitoring and Alerting
- Implement RespringMonitor
- Frequency tracking and thresholds
- Administrator alerting system
- Automation pause mechanisms

### Phase 4: Integration and Testing
- Full integration with existing automation flow
- Comprehensive testing suite
- Performance optimization
- Documentation and monitoring dashboards