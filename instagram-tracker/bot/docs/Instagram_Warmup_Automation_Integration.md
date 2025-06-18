# 🔥 Instagram Warmup Automation Integration

## 🚀 Overview

This document outlines how to integrate the **iPhone automation bot** with your **main Instagram tracker app** for automated account warmup when accounts enter the pipeline.

The system provides:
- **Automated container switching** using XXTouch Elite + Crane
- **Queue-based warmup processing** with 30 concurrent containers
- **Event-driven architecture** for real-time status updates
- **Robust error handling** and retry mechanisms
- **Complete audit trail** of all warmup activities

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Main App      │    │ Automation      │    │   iPhone Bot    │
│                 │    │ Bridge Service  │    │                 │
│ • Account DB    │◄──►│                 │◄──►│ • XXTouch Elite │
│ • Warmup Queue  │    │ • Container Mgmt│    │ • Crane         │
│ • Status API    │    │ • Script Exec   │    │ • 30 Containers │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Key Components**

1. **AutomationBridge** - Core service connecting main app to iPhone
2. **Container Management** - Tracks 30 containers and their availability
3. **Warmup Queue** - Processes accounts entering warmup pipeline
4. **Script Execution** - Executes iPhone automation scripts via XXTouch API
5. **Event System** - Real-time updates and monitoring

---

## 📋 Integration Steps

### **Step 1: Install Dependencies**

```bash
# Add to your main app's package.json
npm install axios events
```

### **Step 2: Create Automation Bridge Service**

Create `services/AutomationBridge.js` in your main app:

```javascript
// Copy the AutomationBridge class from the previous code block
const AutomationBridge = require('./AutomationBridge');
```

### **Step 3: Initialize in Main App**

```javascript
// In your main app initialization
const AutomationBridge = require('./services/AutomationBridge');

const automationBridge = new AutomationBridge({
    iphoneIP: '192.168.178.65',
    iphonePort: 46952,
    maxContainers: 30,
    actionDelay: 30000 // 30 seconds between actions
});

// Set up event listeners
automationBridge.on('warmup_started', (data) => {
    console.log(`🔥 Warmup started for account ${data.accountId} in container ${data.containerNumber}`);
    // Update your database
});

automationBridge.on('warmup_completed', (data) => {
    console.log(`✅ Warmup completed for account ${data.accountId}`);
    // Update account status in database
});

automationBridge.on('warmup_failed', (data) => {
    console.error(`❌ Warmup failed for account ${data.accountId}: ${data.error}`);
    // Handle failure, maybe retry later
});
```

### **Step 4: Create Warmup Queue Processor**

```javascript
class WarmupQueueProcessor {
    constructor(automationBridge, database) {
        this.bridge = automationBridge;
        this.db = database;
        this.processingInterval = null;
    }

    start() {
        // Process queue every 30 seconds
        this.processingInterval = setInterval(() => {
            this.processQueue();
        }, 30000);
        
        console.log('🔄 Warmup queue processor started');
    }

    async processQueue() {
        try {
            // Get accounts waiting for warmup
            const waitingAccounts = await this.db.getAccountsInWarmupQueue();
            
            // Check available containers
            const status = this.bridge.getStatus();
            const availableSlots = status.availableContainers;
            
            if (availableSlots === 0) {
                console.log('⏳ No available containers, waiting...');
                return;
            }
            
            // Process up to available slots
            const accountsToProcess = waitingAccounts.slice(0, availableSlots);
            
            for (const account of accountsToProcess) {
                await this.startAccountWarmup(account);
            }
            
        } catch (error) {
            console.error('❌ Queue processing error:', error);
        }
    }

    async startAccountWarmup(account) {
        try {
            // Create warmup plan based on account needs
            const warmupPlan = await this.createWarmupPlan(account);
            
            // Start warmup
            const result = await this.bridge.startWarmup(account.id, warmupPlan);
            
            if (result.success) {
                // Update account status
                await this.db.updateAccountStatus(account.id, 'warming_up');
                console.log(`🔥 Started warmup for account: ${account.username}`);
            } else {
                console.error(`❌ Failed to start warmup for ${account.username}: ${result.error}`);
            }
            
        } catch (error) {
            console.error(`❌ Warmup start error for ${account.username}:`, error);
        }
    }

    async createWarmupPlan(account) {
        // Create customized warmup plan based on account type/needs
        const basePlan = {
            actions: [
                {
                    type: 'change_profile_pic',
                    delay: 60000 // 1 minute
                },
                {
                    type: 'change_bio',
                    data: account.targetBio,
                    delay: 45000 // 45 seconds
                },
                {
                    type: 'change_name',
                    data: account.targetName,
                    delay: 30000 // 30 seconds
                },
                {
                    type: 'upload_story',
                    delay: 120000 // 2 minutes
                }
            ]
        };
        
        return basePlan;
    }

    stop() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        console.log('🛑 Warmup queue processor stopped');
    }
}
```

---

## 🎯 Warmup Action Types

The system supports these warmup actions:

| Action Type | Script File | Description |
|-------------|-------------|-------------|
| `change_bio` | `change_bio_to_clipboard.lua` | Updates Instagram bio from clipboard |
| `change_username` | `change_username_to_clipboard.lua` | Changes username from clipboard |
| `change_name` | `change_name_to_clipboard.lua` | Updates display name from clipboard |
| `change_profile_pic` | `change_pfp_to_newest_picture.lua` | Sets profile pic from newest photo |
| `upload_story` | `upload_story_newest_media_no_caption.lua` | Uploads story from newest media |
| `upload_post` | `upload_post_newest_media_no_caption.lua` | Uploads post from newest media |

### **Custom Warmup Plans**

```javascript
// Example warmup plans for different account types

// New Account Warmup (Day 1-3)
const newAccountPlan = {
    actions: [
        { type: 'change_profile_pic', delay: 60000 },
        { type: 'change_bio', delay: 45000 },
        { type: 'change_name', delay: 30000 }
    ]
};

// Active Account Warmup (Day 4-7)
const activeAccountPlan = {
    actions: [
        { type: 'upload_story', delay: 120000 },
        { type: 'change_bio', delay: 60000 },
        { type: 'upload_post', delay: 180000 }
    ]
};

// Mature Account Warmup (Day 8+)
const matureAccountPlan = {
    actions: [
        { type: 'upload_story', delay: 90000 },
        { type: 'upload_post', delay: 240000 },
        { type: 'change_bio', delay: 45000 }
    ]
};
```

---

## 📊 Monitoring and Status

### **Real-time Status Dashboard**

```javascript
// Get current system status
app.get('/api/automation/status', (req, res) => {
    const status = automationBridge.getStatus();
    res.json(status);
});

// Example response:
{
    "totalContainers": 30,
    "availableContainers": 25,
    "activeWarmups": 5,
    "containerStatus": {
        "1": { "available": false, "accountId": "acc_123", "status": "reserved" },
        "2": { "available": true, "accountId": null, "status": "idle" }
    },
    "activeWarmupSessions": {
        "acc_123": {
            "containerNumber": 1,
            "startTime": "2024-01-15T10:30:00Z",
            "currentAction": 2,
            "status": "in_progress"
        }
    }
}
```

### **Event Monitoring**

```javascript
// Set up comprehensive event logging
automationBridge.on('container_reserved', (data) => {
    console.log(`📦 Container ${data.containerNumber} reserved for account ${data.accountId}`);
});

automationBridge.on('container_released', (data) => {
    console.log(`📦 Container ${data.containerNumber} released`);
});

automationBridge.on('warmup_progress', (data) => {
    console.log(`🎯 Account ${data.accountId}: Action ${data.action}/${data.total} (${data.actionType})`);
});
```

---

## 🔧 Configuration Options

### **AutomationBridge Configuration**

```javascript
const config = {
    // iPhone connection
    iphoneIP: '192.168.178.65',
    iphonePort: 46952,
    
    // Container management
    maxContainers: 30,
    
    // Timing
    actionDelay: 30000,        // Default delay between actions (30s)
    retryAttempts: 3,          // Retry failed operations
    
    // Monitoring
    healthCheckInterval: 60000, // Check iPhone connectivity (1min)
    
    // Error handling
    maxFailuresPerHour: 5,     // Max failures before pausing
    pauseDuration: 300000      // Pause duration after max failures (5min)
};
```

### **Queue Processing Configuration**

```javascript
const queueConfig = {
    processingInterval: 30000,  // Check queue every 30s
    maxConcurrentWarmups: 30,   // Max simultaneous warmups
    priorityLevels: ['high', 'normal', 'low'],
    retryFailedAfter: 3600000   // Retry failed warmups after 1 hour
};
```

---

## 🚨 Error Handling and Recovery

### **Automatic Recovery Mechanisms**

1. **Container Recovery**: If a container becomes stuck, automatically release and reset
2. **Script Failure Recovery**: Retry failed scripts up to 3 times with exponential backoff
3. **iPhone Connectivity**: Monitor connection and pause processing if iPhone is unreachable
4. **Queue Persistence**: Save queue state to prevent loss during restarts

### **Error Types and Responses**

```javascript
const errorHandlers = {
    'CONTAINER_UNAVAILABLE': async (error, accountId) => {
        // Wait for container to become available
        console.log(`⏳ Waiting for available container for account ${accountId}`);
        return 'retry_later';
    },
    
    'SCRIPT_EXECUTION_FAILED': async (error, accountId) => {
        // Retry with different container
        console.log(`🔄 Retrying script execution for account ${accountId}`);
        return 'retry_different_container';
    },
    
    'IPHONE_UNREACHABLE': async (error, accountId) => {
        // Pause all processing
        console.log(`📱 iPhone unreachable, pausing warmup processing`);
        return 'pause_processing';
    }
};
```

---

## 🔄 Database Integration

### **Required Database Tables**

```sql
-- Warmup queue table
CREATE TABLE warmup_queue (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal',
    warmup_plan JSON,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0
);

-- Warmup history table
CREATE TABLE warmup_history (
    id SERIAL PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    container_number INTEGER,
    actions_completed INTEGER,
    total_actions INTEGER,
    duration_ms INTEGER,
    status VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### **Database Helper Functions**

```javascript
class WarmupDatabase {
    async addToWarmupQueue(accountId, warmupPlan, priority = 'normal') {
        const query = `
            INSERT INTO warmup_queue (account_id, warmup_plan, priority)
            VALUES ($1, $2, $3)
            RETURNING id
        `;
        return await this.db.query(query, [accountId, JSON.stringify(warmupPlan), priority]);
    }

    async getAccountsInWarmupQueue(limit = 30) {
        const query = `
            SELECT * FROM warmup_queue 
            WHERE status = 'pending'
            ORDER BY priority DESC, created_at ASC
            LIMIT $1
        `;
        return await this.db.query(query, [limit]);
    }

    async updateWarmupStatus(accountId, status, errorMessage = null) {
        const query = `
            UPDATE warmup_queue 
            SET status = $2, error_message = $3, updated_at = NOW()
            WHERE account_id = $1
        `;
        return await this.db.query(query, [accountId, status, errorMessage]);
    }
}
```

---

## 🚀 Deployment and Scaling

### **Production Deployment**

1. **iPhone Setup**: Ensure iPhone is always connected to power and WiFi
2. **Network Stability**: Use dedicated WiFi network for iPhone automation
3. **Monitoring**: Set up alerts for iPhone connectivity and script failures
4. **Backup iPhone**: Consider having a backup iPhone for redundancy

### **Scaling Considerations**

- **Multiple iPhones**: Scale to multiple iPhones with load balancing
- **Container Optimization**: Optimize container switching speed
- **Action Timing**: Fine-tune delays based on Instagram rate limits
- **Queue Management**: Implement priority queues for urgent warmups

---

## 📈 Performance Metrics

### **Key Metrics to Track**

```javascript
const metrics = {
    // Throughput
    warmupsPerHour: 0,
    averageWarmupDuration: 0,
    
    // Success rates
    successRate: 0.95,
    scriptSuccessRate: 0.98,
    
    // Resource utilization
    containerUtilization: 0.85,
    averageQueueWaitTime: 0,
    
    // Error rates
    errorRate: 0.05,
    retryRate: 0.10
};
```

### **Performance Optimization**

1. **Parallel Processing**: Run multiple warmups simultaneously
2. **Smart Scheduling**: Schedule warmups during optimal times
3. **Resource Pooling**: Efficiently manage container allocation
4. **Caching**: Cache frequently used data and scripts

---

## 🎯 Next Steps

1. **Implement AutomationBridge** in your main app
2. **Set up warmup queue processing**
3. **Create database tables** for queue management
4. **Test with a few accounts** before full deployment
5. **Monitor and optimize** based on performance metrics
6. **Scale to multiple iPhones** as needed

This integration will provide you with a fully automated Instagram account warmup system that scales to handle hundreds of accounts efficiently! 🚀 