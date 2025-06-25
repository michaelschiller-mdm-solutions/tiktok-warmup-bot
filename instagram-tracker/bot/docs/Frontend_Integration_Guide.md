# Frontend Integration Guide for Password Reset Detection

## Overview

The frontend needs to understand the new password reset detection messages and handle them appropriately. Here's everything the frontend needs to know:

## 🚨 New Message Types to Handle

### 1. Password Reset Detection Message
```json
{
    "type": "password_reset_detected",
    "data": {
        "sessionId": "setup_1234567890_abc123",
        "accountId": "account_123",
        "username": "problematicuser",
        "email": "user@rambler.ru",
        "timestamp": "2024-01-15T10:30:00.000Z",
        "accountInvalid": true,
        "message": "Password reset email detected for problematicuser. Account marked as invalid."
    }
}
```

**Frontend Action**: 
- Mark account as "Invalid Password" 
- Remove from active processing queue
- Free up assigned resources (container, proxy)
- Update UI status to show "Password Incorrect"

### 2. Enhanced Session Completion
```json
{
    "type": "session_completed",
    "data": {
        "sessionId": "setup_1234567890_abc123",  
        "accountId": "account_123",
        "status": "failed",
        "endTime": "2024-01-15T10:30:00.000Z",
        "errorType": "password_reset_detected",
        "errorMetadata": {
            "username": "problematicuser",
            "email": "user@rambler.ru", 
            "accountInvalid": true
        }
    }
}
```

**Frontend Action**:
- Update account status in database
- Show specific "Invalid Password" error vs generic failure
- Track password accuracy metrics

### 3. Account Status Change
```json
{
    "type": "account_status_change",
    "data": {
        "sessionId": "setup_1234567890_abc123",
        "accountId": "account_123", 
        "username": "problematicuser",
        "email": "user@rambler.ru",
        "status": "invalid",
        "reason": "Incorrect password - reset email detected",
        "timestamp": "2024-01-15T10:30:00.000Z"
    }
}
```

**Frontend Action**:
- Update account database record
- Trigger resource cleanup workflows  
- Send notifications if needed

## 📊 Frontend UI Updates Needed

### Account Status Display
Add new status types:
- ✅ `"completed"` - Setup successful
- ❌ `"failed"` - Technical failure  
- 🚨 `"invalid_password"` - Password reset detected
- ⏳ `"in_progress"` - Currently processing

### Error Handling
Differentiate between:
- **Technical Errors**: Network issues, script failures, timeouts
- **Credential Errors**: Invalid password detected via reset email
- **Resource Errors**: No containers available, proxy issues

### Dashboard Metrics
Track additional metrics:
- **Password Accuracy Rate**: % of accounts with correct passwords
- **Invalid Account Count**: Number of accounts with wrong passwords  
- **Resource Efficiency**: Time/resources saved by early detection

## 🔄 Workflow Integration

### Before (Without Detection)
```
Account Setup → Retries → Eventually Fails → Manual Investigation
```

### After (With Detection)  
```
Account Setup → Password Reset Detected → Immediate Failure → Auto Cleanup
```

### Frontend Workflow Changes

1. **Account Queue Management**
   ```javascript
   // Remove invalid accounts from processing queue
   if (message.type === 'password_reset_detected') {
       removeFromQueue(message.data.accountId);
       markAccountInvalid(message.data.username, 'incorrect_password');
       freeResources(message.data.containerNumber);
   }
   ```

2. **Resource Tracking**
   ```javascript
   // Update resource availability immediately  
   if (message.data.accountInvalid) {
       releaseContainer(message.data.containerNumber);
       releaseProxy(assignedProxy);
       updateResourcePool();
   }
   ```

3. **User Notifications**
   ```javascript
   // Show specific error messages
   if (errorType === 'password_reset_detected') {
       showNotification(`Account ${username} has incorrect password`, 'warning');
   } else {
       showNotification(`Account ${username} setup failed: ${error}`, 'error');
   }
   ```

## 📱 Real-time Updates

The frontend should listen for these events and update the UI in real-time:

### Progress Updates
```javascript
// Enhanced step monitoring
if (message.type === 'step_update' && message.data.status === 'password_reset_detected') {
    updateProgressUI(accountId, 'Password Reset Detected', 'warning');
    stopProgressTimer(accountId);
}
```

### Resource Management
```javascript  
// Immediate resource updates
function handlePasswordResetDetection(data) {
    // Update account status
    updateAccountStatus(data.accountId, 'invalid_password', data.reason);
    
    // Free resources
    markContainerAvailable(data.containerNumber);
    releaseProxyAssignment(data.accountId);
    
    // Update dashboard metrics
    incrementCounter('invalid_passwords');
    updatePasswordAccuracyRate();
}
```

## 🚀 Quick Implementation Checklist

### ✅ Message Handling
- [ ] Add handler for `password_reset_detected` messages
- [ ] Update `session_completed` handler for enhanced error metadata  
- [ ] Add handler for `account_status_change` messages

### ✅ UI Updates  
- [ ] Add "Invalid Password" status to account display
- [ ] Update progress indicators to show password reset detection
- [ ] Add password accuracy metrics to dashboard

### ✅ Database Updates
- [ ] Add `invalid_password` status to account status enum
- [ ] Track password reset detection events
- [ ] Store resource cleanup timestamps

### ✅ Resource Management
- [ ] Immediate container release on password reset detection
- [ ] Proxy deallocation for invalid accounts  
- [ ] Resource pool updates in real-time

## 🛠️ Example Frontend Code

### React Component Example
```javascript
import { useState, useEffect } from 'react';

function AccountSetupMonitor() {
    const [accounts, setAccounts] = useState([]);
    const [metrics, setMetrics] = useState({
        total: 0,
        successful: 0,
        failed: 0,
        invalidPasswords: 0
    });

    useEffect(() => {
        const eventSource = new EventSource('/api/setup-events');
        
        eventSource.onmessage = (event) => {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'password_reset_detected':
                    handlePasswordResetDetection(message.data);
                    break;
                    
                case 'session_completed':
                    handleSessionCompleted(message.data);
                    break;
                    
                case 'account_status_change':
                    handleAccountStatusChange(message.data);
                    break;
            }
        };
        
        return () => eventSource.close();
    }, []);

    const handlePasswordResetDetection = (data) => {
        // Update account immediately
        setAccounts(prev => prev.map(account => 
            account.id === data.accountId 
                ? { ...account, status: 'invalid_password', error: 'Incorrect password detected' }
                : account
        ));
        
        // Update metrics
        setMetrics(prev => ({
            ...prev,
            invalidPasswords: prev.invalidPasswords + 1,
            failed: prev.failed + 1
        }));
        
        // Show notification
        showNotification(`Account ${data.username} has incorrect password`, 'warning');
    };

    return (
        <div className="account-monitor">
            <div className="metrics">
                <div className="metric">
                    <span>Total: {metrics.total}</span>
                </div>
                <div className="metric success">
                    <span>Successful: {metrics.successful}</span>  
                </div>
                <div className="metric failed">
                    <span>Failed: {metrics.failed}</span>
                </div>
                <div className="metric invalid">
                    <span>Invalid Passwords: {metrics.invalidPasswords}</span>
                </div>
            </div>
            
            <div className="accounts-list">
                {accounts.map(account => (
                    <AccountItem key={account.id} account={account} />
                ))}
            </div>
        </div>
    );
}
```

## 🔧 Configuration

No additional frontend configuration is required. The password reset detection works automatically and sends standard JSON messages via the existing communication channel.

## 📋 Summary

The frontend needs to:

1. **Handle 3 new message types** for password reset detection
2. **Update UI immediately** when invalid passwords are detected  
3. **Free up resources** (containers, proxies) automatically
4. **Track metrics** for password accuracy and system efficiency
5. **Show specific error messages** to differentiate password issues from technical issues

The implementation is backward compatible - existing functionality continues to work while gaining the benefits of faster failure detection and better resource management. 