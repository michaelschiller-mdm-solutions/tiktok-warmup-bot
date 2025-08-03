# Follow Delay Analysis

## Current Follow Delay Settings

### 🔧 Chrome Extension (Follow/Unfollow)

**Default Settings:**
- **Minimum Action Delay**: `30 seconds` (configurable: 30-300 seconds)
- **Maximum Action Interval**: Not explicitly set (uses minActionInterval + randomization)
- **Unfollow Delay**: `3 days` (72 hours) after following

**Configuration Location:**
```javascript
// content-script.js line 198
<input type="number" id="action-delay-input" min="30" max="300" value="30">

// Converted to milliseconds
const actionDelay = parseInt(this.sidebar.querySelector('#action-delay-input').value) * 1000;
```

**Actual Implementation:**
```javascript
// automation-engine.js
async waitForNextAction() {
  const minInterval = this.state.settings.timingLimits.minActionInterval; // 30s default
  const maxInterval = this.state.settings.timingLimits.maxActionInterval; // Not set
  
  const baseDelay = minInterval + Math.random() * (maxInterval - minInterval);
  
  // Add extra delay based on recent activity (up to 2x multiplier)
  const activityMultiplier = Math.min(2, 1 + (this.consecutiveActions * 0.1));
  const finalDelay = baseDelay * activityMultiplier;
}
```

### 🤖 TikTok Bot (Voice Actions)

**Action Intervals:**
- **Swipe Actions**: 5 seconds duration
- **Like Post**: 1.5s duration + 4-7 swipe interval
- **Save Post**: 5s duration + 4-7 swipe interval  
- **Open Comments**: 7s duration + 4-7 swipe interval
- **Open Profile**: 7s duration + 10-15 swipe interval
- **Open Shop**: 15s duration + 30-35 swipe interval
- **Open Inbox**: 15s duration + 30-35 swipe interval

**Additional Randomization:**
```javascript
const totalWait = action.duration + random(1000, 4000); // +1-4 seconds
```

### 📱 Instagram Warmup System

**Current Status**: No explicit follow delays found in backend automation
- Uses phase-based progression (not direct follow/unfollow)
- Timing controlled by warmup phases and content assignment
- No rate limiting specifically for follows

## 🎯 Recommended Follow Delay Settings

### Conservative (Safe) Settings
```javascript
{
  minActionInterval: 60000,    // 1 minute minimum
  maxActionInterval: 300000,   // 5 minutes maximum
  dailyFollowLimit: 50,        // 50 follows per day
  dailyUnfollowLimit: 50,      // 50 unfollows per day
  unfollowDelay: 259200000     // 3 days (current)
}
```

### Moderate (Balanced) Settings
```javascript
{
  minActionInterval: 45000,    // 45 seconds minimum
  maxActionInterval: 180000,   // 3 minutes maximum
  dailyFollowLimit: 75,        // 75 follows per day
  dailyUnfollowLimit: 75,      // 75 unfollows per day
  unfollowDelay: 172800000     // 2 days
}
```

### Aggressive (Risky) Settings
```javascript
{
  minActionInterval: 30000,    // 30 seconds minimum (current default)
  maxActionInterval: 120000,   // 2 minutes maximum
  dailyFollowLimit: 100,       // 100 follows per day
  dailyUnfollowLimit: 100,     // 100 unfollows per day
  unfollowDelay: 86400000      // 1 day
}
```

## 📊 Instagram Rate Limits (Estimated)

### Official Limits (Approximate)
- **New Accounts**: 20-30 follows/day
- **Established Accounts**: 50-100 follows/day
- **Verified Accounts**: 100-200 follows/day

### Time-Based Limits
- **Per Hour**: 7-10 follows maximum
- **Per Minute**: 1 follow maximum (recommended)
- **Burst Protection**: No more than 3 follows in 5 minutes

### Detection Patterns
- **Too Fast**: < 30 seconds between actions
- **Too Regular**: Exact same intervals
- **Too Many**: > 100 follows/day for new accounts
- **Suspicious Timing**: Actions at exact intervals (e.g., every 60s)

## 🛡️ Anti-Detection Strategies

### Current Implementation
```javascript
// Human-like timing variation (10-15% jitter)
timingJitter: { min: 0.9, max: 1.15 }

// Activity-based slowdown
const activityMultiplier = Math.min(2, 1 + (this.consecutiveActions * 0.1));

// Random behavior injection (25% chance)
if (Math.random() < 0.25) {
  await this.executeUnpredictableBehavior();
}
```

### Enhanced Recommendations
1. **Variable Intervals**: 30s - 5min with weighted distribution
2. **Session Breaks**: 15-30 min breaks every 10-15 actions
3. **Daily Patterns**: Slower at night, faster during peak hours
4. **Weekly Patterns**: Reduced activity on weekends
5. **Error Simulation**: Occasional failed actions and retries

## 🔧 Configuration Updates Needed

### Chrome Extension Updates
```javascript
// Enhanced timing configuration
const settings = {
  timingLimits: {
    minActionInterval: 45000,     // 45 seconds
    maxActionInterval: 300000,    // 5 minutes
    sessionBreakInterval: 900000, // 15 minutes
    sessionBreakDuration: 1800000 // 30 minutes
  },
  rateLimiting: {
    hourlyLimit: 8,               // 8 follows per hour
    dailyLimit: 75,               // 75 follows per day
    burstLimit: 3,                // 3 follows per 5 minutes
    burstWindow: 300000           // 5 minutes
  }
}
```

### Backend Integration
```typescript
// Add to WarmupAutomationService
interface FollowTimingConfig {
  minInterval: number;      // 45000ms
  maxInterval: number;      // 300000ms
  dailyLimit: number;       // 75
  hourlyLimit: number;      // 8
  cooldownPeriod: number;   // 172800000ms (2 days)
}
```

## 📈 Current Risk Assessment

### Chrome Extension
- **Risk Level**: MEDIUM-HIGH
- **Issues**: 30s minimum is too aggressive for new accounts
- **Recommendation**: Increase to 45-60s minimum

### TikTok Bot
- **Risk Level**: LOW-MEDIUM  
- **Issues**: Good randomization, reasonable intervals
- **Recommendation**: Current settings are acceptable

### Instagram Warmup
- **Risk Level**: LOW
- **Issues**: No direct follow automation detected
- **Recommendation**: Add explicit follow rate limiting

## 🎯 Action Items

1. **Update Chrome Extension default delay** from 30s to 60s
2. **Add maxActionInterval** configuration option
3. **Implement session break logic** 
4. **Add hourly/daily rate limiting**
5. **Create account age-based delay scaling**
6. **Add time-of-day variation**
7. **Implement burst protection**

## 📝 Summary

**Current Follow Delays:**
- Chrome Extension: 30 seconds minimum (too fast)
- TikTok Bot: Variable 4-35 swipe intervals (good)
- Instagram Warmup: No explicit delays (needs implementation)

**Recommended Changes:**
- Increase minimum delay to 45-60 seconds
- Add maximum interval of 3-5 minutes
- Implement session breaks every 15 minutes
- Add daily/hourly rate limiting
- Scale delays based on account age and activity