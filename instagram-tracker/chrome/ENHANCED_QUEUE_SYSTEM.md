# Enhanced Follow/Unfollow Queue System

## 🎯 System Overview

The enhanced queue system provides sophisticated follow/unfollow management with 20+ configurable settings, automatic unfollow scheduling, and comprehensive tracking.

## 📊 How Unfollow Queuing Works

### 1. **Automatic Unfollow Scheduling**

```javascript
// When following an account:
if (Math.random() < autoUnfollowProbability) {
  // Default: 20%
  scheduleAutoUnfollow(username);
}
```

**Process:**

1. User follows account via automation
2. 20% chance (configurable) to auto-schedule unfollow
3. Random delay between 3-5 days (configurable)
4. Account added to unfollow queue with scheduled time

### 2. **Manual Unfollow Management**

- **Bulk Scheduling**: Select criteria (oldest, non-followers, inactive, random)
- **Import Lists**: Upload CSV/JSON files with usernames to unfollow
- **Individual Control**: Schedule/cancel unfollows for specific accounts

### 3. **Current Follows Tracking**

- **Real-time tracking** of all followed accounts
- **Follow dates** and engagement metrics
- **Mutual follower detection**
- **Scheduled unfollow status**

## ⚖️ Queue Balancing Strategies

### **Strategy 1: Ratio-Based (Recommended)**

```javascript
// 70% follows, 30% unfollows
if (Math.random() < 0.7 && followQueue.length > 0) {
  return followAction;
} else if (unfollowQueue.length > 0) {
  return unfollowAction;
}
```

### **Strategy 2: Time-Based**

```javascript
// Alternate by hour
const hour = new Date().getHours();
if (hour % 2 === 0) {
  // Even hours: prioritize follows
} else {
  // Odd hours: prioritize unfollows
}
```

### **Strategy 3: Limit-Based**

```javascript
// Balance based on remaining daily limits
const followsRemaining = dailyFollowLimit - todaysFollows;
const unfollowsRemaining = dailyUnfollowLimit - todaysUnfollows;
```

### **Strategy 4: Random Selection**

- Randomly selects from all available actions
- Provides maximum unpredictability

## 🔧 Configuration Settings

### **Queue Management (8 settings)**

1. **Auto-Unfollow Probability** (0-100%, default: 20%)
   - Chance to schedule unfollow when following
2. **Min Unfollow Delay** (1-14 days, default: 3 days)
   - Minimum time before unfollowing
3. **Max Unfollow Delay** (2-21 days, default: 5 days)
   - Maximum time before unfollowing
4. **Queue Balance Ratio** (10-90%, default: 70%)
   - Percentage of actions that should be follows
5. **Queue Strategy** (ratio/time/limit/random, default: ratio)
   - How to balance follow vs unfollow actions
6. **Priority Unfollows** (true/false, default: false)
   - Whether unfollows always go first
7. **Retry Failed Actions** (0-5, default: 2)
   - How many times to retry failed actions
8. **Queue Cleanup Interval** (1-24 hours, default: 6 hours)
   - How often to clean expired queue items

### **Follow Tracking (4 settings)**

1. **Max Concurrent Follows** (50-2000, default: 500)
   - Maximum accounts to follow at once
2. **Unfollow Non-Followers After** (0-30 days, default: 7 days)
   - Auto-unfollow accounts that don't follow back
3. **Keep Mutual Follows** (true/false, default: true)
   - Whether to keep accounts that follow back
4. **Track Engagement** (true/false, default: true)
   - Track which accounts engage with content

## 📈 Queue Execution Flow

```
┌─────────────────┐
│   START CYCLE   │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ CLEANUP QUEUES  │ ◄─── Every 6 hours
└─────────┬───────┘
          │
          ▼
┌─────────────────┐
│ GET NEXT ACTION │
└─────────┬───────┘
          │
          ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ PRIORITY CHECK  │───►│ STRATEGY CHECK  │───►│ QUEUE SELECTION │
│ Unfollows first?│    │ Ratio/Time/etc  │    │ Follow/Unfollow │
└─────────────────┘    └─────────────────┘    └─────────┬───────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │ EXECUTE ACTION  │
                                              └─────────┬───────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │ UPDATE TRACKING │
                                              └─────────┬───────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │ SCHEDULE NEXT   │
                                              └─────────────────┘
```

## 🎛️ Frontend Interface

### **Current Follows Management Section**

- **Statistics Display**: Current follows, scheduled unfollows, mutual followers
- **Bulk Actions**: Schedule/immediate unfollow with criteria selection
- **Import/Export**: Manage follow lists via files
- **Recent Follows List**: View and manage individual accounts

### **Advanced Settings Panel**

- **25+ Configuration Options** across 5 categories
- **Tooltips with Recommendations** for every setting
- **Save/Reset Functionality** with persistence
- **Real-time Validation** of input ranges

## 📊 Data Persistence

### **Chrome Storage Structure**

```javascript
{
  followedAccounts: {
    "username1": {
      followedAt: timestamp,
      isFollowingBack: boolean,
      isMutual: boolean,
      engagementScore: number,
      scheduledUnfollow: timestamp
    }
  },
  queueData: {
    follow: [...actions],
    unfollow: [...actions]
  },
  queueStatistics: {
    totalFollows: number,
    totalUnfollows: number,
    mutualFollows: number
  }
}
```

## 🔄 Queue Balancing Examples

### **Scenario 1: Growth Phase (70% follows)**

- **Follow Queue**: 100 accounts
- **Unfollow Queue**: 30 scheduled
- **Result**: ~70 follows, ~30 unfollows per 100 actions

### **Scenario 2: Maintenance Phase (50% follows)**

- **Follow Queue**: 50 accounts
- **Unfollow Queue**: 200 scheduled
- **Result**: Balanced follow/unfollow activity

### **Scenario 3: Cleanup Phase (Priority Unfollows)**

- **Priority Unfollows**: Enabled
- **Result**: All unfollows processed first, then follows

## 🛡️ Safety Features

### **Rate Limiting Integration**

- Respects daily/hourly limits for both follows and unfollows
- Automatic queue pausing when limits reached
- Session break integration

### **Anti-Detection**

- Variable timing between actions
- Natural behavior simulation during waits
- Queue strategy randomization

### **Error Handling**

- Automatic retry of failed actions
- Queue cleanup of expired items
- Graceful degradation on errors

## 📈 Analytics & Monitoring

### **Real-time Statistics**

- Current follows count
- Scheduled unfollows count
- Mutual followers count
- Queue sizes and health

### **Export Capabilities**

- JSON export of all followed accounts
- CSV export for spreadsheet analysis
- Import/export of unfollow lists

## 🎯 Best Practices

### **Recommended Settings for New Accounts**

```javascript
{
  autoUnfollowProbability: 15%, // Conservative
  unfollowDelayMin: 4 days,      // Longer delay
  unfollowDelayMax: 7 days,      // More variation
  queueBalanceRatio: 80%,        // More follows
  maxConcurrentFollows: 300      // Lower limit
}
```

### **Recommended Settings for Established Accounts**

```javascript
{
  autoUnfollowProbability: 25%, // More aggressive
  unfollowDelayMin: 2 days,     // Shorter delay
  unfollowDelayMax: 5 days,     // Standard variation
  queueBalanceRatio: 60%,       // Balanced approach
  maxConcurrentFollows: 800     // Higher limit
}
```

This enhanced system provides complete control over follow/unfollow automation while maintaining natural, human-like behavior patterns.
