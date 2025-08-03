// Enhanced Queue Manager
// Manages follow/unfollow queues with advanced balancing, tracking, and configuration

class EnhancedQueueManager {
  constructor(settings = {}) {
    this.settings = {
      queueManagement: {
        autoUnfollowProbability: 0.2,
        unfollowDelayMin: 3 * 24 * 60 * 60 * 1000, // 3 days
        unfollowDelayMax: 5 * 24 * 60 * 60 * 1000, // 5 days
        queueBalanceRatio: 0.7, // 70% follows, 30% unfollows
        queueStrategy: 'ratio',
        priorityUnfollows: false,
        retryFailedActions: 2,
        queueCleanupInterval: 6 * 60 * 60 * 1000 // 6 hours
      },
      followTracking: {
        maxConcurrentFollows: 500,
        unfollowNonFollowersAfter: 7 * 24 * 60 * 60 * 1000, // 7 days
        keepMutualFollows: true,
        trackEngagement: true
      },
      ...settings
    };

    this.queues = {
      follow: [],
      unfollow: []
    };

    this.followedAccounts = new Map(); // username -> follow data
    this.statistics = {
      totalFollows: 0,
      totalUnfollows: 0,
      mutualFollows: 0,
      scheduledUnfollows: 0,
      failedActions: 0
    };

    this.lastCleanup = Date.now();
    this.initializeFromStorage();
  }

  // Initialize data from chrome storage
  async initializeFromStorage() {
    try {
      const result = await chrome.storage.local.get(['followedAccounts', 'queueData', 'queueStatistics']);
      
      if (result.followedAccounts) {
        this.followedAccounts = new Map(Object.entries(result.followedAccounts));
      }
      
      if (result.queueData) {
        this.queues = result.queueData;
      }
      
      if (result.queueStatistics) {
        this.statistics = { ...this.statistics, ...result.queueStatistics };
      }
      
      console.log('✅ Queue manager initialized from storage');
      console.log(`📊 Loaded ${this.followedAccounts.size} followed accounts`);
      
    } catch (error) {
      console.log('⚠️  Could not load queue data from storage:', error);
    }
  }

  // Save data to chrome storage
  async saveToStorage() {
    try {
      const followedAccountsObj = Object.fromEntries(this.followedAccounts);
      
      await chrome.storage.local.set({
        followedAccounts: followedAccountsObj,
        queueData: this.queues,
        queueStatistics: this.statistics
      });
      
    } catch (error) {
      console.error('Error saving queue data:', error);
    }
  }

  // Update settings
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    console.log('⚙️ Queue manager settings updated');
  }

  // Add account to follow queue
  addToFollowQueue(username, priority = 'normal') {
    const action = {
      username,
      priority,
      addedAt: Date.now(),
      retries: 0
    };

    if (priority === 'high') {
      this.queues.follow.unshift(action);
    } else {
      this.queues.follow.push(action);
    }

    console.log(`➕ Added ${username} to follow queue (priority: ${priority})`);
    this.saveToStorage();
  }

  // Add account to unfollow queue
  addToUnfollowQueue(username, scheduledTime = null, reason = 'manual') {
    const action = {
      username,
      scheduledTime: scheduledTime || Date.now(),
      reason,
      addedAt: Date.now(),
      retries: 0
    };

    this.queues.unfollow.push(action);
    
    if (reason === 'auto') {
      this.statistics.scheduledUnfollows++;
    }

    console.log(`➖ Added ${username} to unfollow queue (reason: ${reason})`);
    this.saveToStorage();
  }

  // Record successful follow
  recordFollow(username, followData = {}) {
    const followRecord = {
      username,
      followedAt: Date.now(),
      isFollowingBack: false,
      isMutual: false,
      engagementScore: 0,
      lastEngagement: null,
      scheduledUnfollow: null,
      ...followData
    };

    this.followedAccounts.set(username, followRecord);
    this.statistics.totalFollows++;

    // Probabilistic auto-unfollow scheduling
    if (Math.random() < this.settings.queueManagement.autoUnfollowProbability) {
      this.scheduleAutoUnfollow(username);
    }

    console.log(`✅ Recorded follow: ${username}`);
    this.saveToStorage();
  }

  // Record successful unfollow
  recordUnfollow(username) {
    if (this.followedAccounts.has(username)) {
      this.followedAccounts.delete(username);
    }

    this.statistics.totalUnfollows++;
    
    // Remove from unfollow queue if present
    this.queues.unfollow = this.queues.unfollow.filter(action => action.username !== username);

    console.log(`✅ Recorded unfollow: ${username}`);
    this.saveToStorage();
  }

  // Schedule auto-unfollow for a followed account
  scheduleAutoUnfollow(username) {
    const minDelay = this.settings.queueManagement.unfollowDelayMin;
    const maxDelay = this.settings.queueManagement.unfollowDelayMax;
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    const scheduledTime = Date.now() + delay;

    // Update follow record
    if (this.followedAccounts.has(username)) {
      const followRecord = this.followedAccounts.get(username);
      followRecord.scheduledUnfollow = scheduledTime;
      this.followedAccounts.set(username, followRecord);
    }

    // Add to unfollow queue
    this.addToUnfollowQueue(username, scheduledTime, 'auto');

    const daysFromNow = Math.round(delay / (24 * 60 * 60 * 1000));
    console.log(`⏰ Scheduled auto-unfollow for ${username} in ${daysFromNow} days`);
  }

  // Get next action based on queue balancing strategy
  getNextAction() {
    // Clean up queues if needed
    if (Date.now() - this.lastCleanup > this.settings.queueManagement.queueCleanupInterval) {
      this.cleanupQueues();
    }

    // Filter ready actions
    const readyUnfollows = this.queues.unfollow.filter(action => 
      action.scheduledTime <= Date.now()
    );

    const availableFollows = this.queues.follow.filter(action => 
      !this.followedAccounts.has(action.username)
    );

    // Apply queue balancing strategy
    return this.applyQueueStrategy(availableFollows, readyUnfollows);
  }

  // Apply the configured queue balancing strategy
  applyQueueStrategy(followQueue, unfollowQueue) {
    const strategy = this.settings.queueManagement.queueStrategy;
    const priorityUnfollows = this.settings.queueManagement.priorityUnfollows;

    // Priority unfollows always go first
    if (priorityUnfollows && unfollowQueue.length > 0) {
      return {
        type: 'unfollow',
        ...unfollowQueue.shift()
      };
    }

    switch (strategy) {
      case 'ratio':
        return this.ratioBasedSelection(followQueue, unfollowQueue);
      
      case 'time':
        return this.timeBasedSelection(followQueue, unfollowQueue);
      
      case 'limit':
        return this.limitBasedSelection(followQueue, unfollowQueue);
      
      case 'random':
        return this.randomSelection(followQueue, unfollowQueue);
      
      default:
        return this.ratioBasedSelection(followQueue, unfollowQueue);
    }
  }

  // Ratio-based queue selection (recommended)
  ratioBasedSelection(followQueue, unfollowQueue) {
    const ratio = this.settings.queueManagement.queueBalanceRatio;
    
    if (Math.random() < ratio && followQueue.length > 0) {
      return {
        type: 'follow',
        ...followQueue.shift()
      };
    } else if (unfollowQueue.length > 0) {
      return {
        type: 'unfollow',
        ...unfollowQueue.shift()
      };
    } else if (followQueue.length > 0) {
      return {
        type: 'follow',
        ...followQueue.shift()
      };
    }
    
    return null;
  }

  // Time-based alternating selection
  timeBasedSelection(followQueue, unfollowQueue) {
    const hour = new Date().getHours();
    const isFollowHour = hour % 2 === 0;
    
    if (isFollowHour && followQueue.length > 0) {
      return {
        type: 'follow',
        ...followQueue.shift()
      };
    } else if (unfollowQueue.length > 0) {
      return {
        type: 'unfollow',
        ...unfollowQueue.shift()
      };
    } else if (followQueue.length > 0) {
      return {
        type: 'follow',
        ...followQueue.shift()
      };
    }
    
    return null;
  }

  // Daily limit based selection
  limitBasedSelection(followQueue, unfollowQueue) {
    // This would need daily stats tracking
    // For now, fall back to ratio-based
    return this.ratioBasedSelection(followQueue, unfollowQueue);
  }

  // Random selection
  randomSelection(followQueue, unfollowQueue) {
    const allActions = [
      ...followQueue.map(action => ({ type: 'follow', ...action })),
      ...unfollowQueue.map(action => ({ type: 'unfollow', ...action }))
    ];
    
    if (allActions.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * allActions.length);
    const selectedAction = allActions[randomIndex];
    
    // Remove from appropriate queue
    if (selectedAction.type === 'follow') {
      this.queues.follow = this.queues.follow.filter(a => a.username !== selectedAction.username);
    } else {
      this.queues.unfollow = this.queues.unfollow.filter(a => a.username !== selectedAction.username);
    }
    
    return selectedAction;
  }

  // Clean up expired and invalid queue items
  cleanupQueues() {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    // Clean follow queue
    const initialFollowCount = this.queues.follow.length;
    this.queues.follow = this.queues.follow.filter(action => {
      return (now - action.addedAt) < maxAge;
    });
    
    // Clean unfollow queue
    const initialUnfollowCount = this.queues.unfollow.length;
    this.queues.unfollow = this.queues.unfollow.filter(action => {
      return (now - action.addedAt) < maxAge;
    });
    
    const followCleaned = initialFollowCount - this.queues.follow.length;
    const unfollowCleaned = initialUnfollowCount - this.queues.unfollow.length;
    
    if (followCleaned > 0 || unfollowCleaned > 0) {
      console.log(`🧹 Queue cleanup: removed ${followCleaned} follow, ${unfollowCleaned} unfollow actions`);
    }
    
    this.lastCleanup = now;
    this.saveToStorage();
  }

  // Bulk schedule unfollows
  bulkScheduleUnfollows(count, criteria = 'oldest') {
    const candidates = this.getCandidatesForUnfollow(criteria);
    const toSchedule = candidates.slice(0, count);
    
    toSchedule.forEach(username => {
      if (!this.isScheduledForUnfollow(username)) {
        this.addToUnfollowQueue(username, Date.now(), 'bulk');
      }
    });
    
    console.log(`📅 Bulk scheduled ${toSchedule.length} accounts for unfollow`);
    return toSchedule;
  }

  // Get candidates for unfollowing based on criteria
  getCandidatesForUnfollow(criteria) {
    const accounts = Array.from(this.followedAccounts.entries());
    
    switch (criteria) {
      case 'oldest':
        return accounts
          .sort((a, b) => a[1].followedAt - b[1].followedAt)
          .map(([username]) => username);
      
      case 'non-followers':
        return accounts
          .filter(([, data]) => !data.isFollowingBack)
          .map(([username]) => username);
      
      case 'inactive':
        const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        return accounts
          .filter(([, data]) => !data.lastEngagement || data.lastEngagement < weekAgo)
          .map(([username]) => username);
      
      case 'random':
        return accounts
          .sort(() => Math.random() - 0.5)
          .map(([username]) => username);
      
      default:
        return accounts.map(([username]) => username);
    }
  }

  // Check if account is scheduled for unfollow
  isScheduledForUnfollow(username) {
    return this.queues.unfollow.some(action => action.username === username);
  }

  // Get current statistics
  getStatistics() {
    const currentFollows = this.followedAccounts.size;
    const scheduledUnfollows = this.queues.unfollow.length;
    const mutualFollows = Array.from(this.followedAccounts.values())
      .filter(data => data.isMutual).length;
    
    return {
      ...this.statistics,
      currentFollows,
      scheduledUnfollows,
      mutualFollows,
      queueSizes: {
        follow: this.queues.follow.length,
        unfollow: this.queues.unfollow.length
      }
    };
  }

  // Export followed accounts
  exportFollowedAccounts() {
    const data = Array.from(this.followedAccounts.entries()).map(([username, data]) => ({
      username,
      followedAt: new Date(data.followedAt).toISOString(),
      isFollowingBack: data.isFollowingBack,
      isMutual: data.isMutual,
      scheduledUnfollow: data.scheduledUnfollow ? new Date(data.scheduledUnfollow).toISOString() : null
    }));
    
    return JSON.stringify(data, null, 2);
  }

  // Import unfollow list
  importUnfollowList(usernames) {
    let imported = 0;
    
    usernames.forEach(username => {
      if (this.followedAccounts.has(username) && !this.isScheduledForUnfollow(username)) {
        this.addToUnfollowQueue(username, Date.now(), 'imported');
        imported++;
      }
    });
    
    console.log(`📥 Imported ${imported} accounts to unfollow queue`);
    return imported;
  }
}

// Export for use in other modules
window.EnhancedQueueManager = EnhancedQueueManager;