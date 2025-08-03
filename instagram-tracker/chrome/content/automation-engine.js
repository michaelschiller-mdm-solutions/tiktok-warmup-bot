// Automation Engine
// Coordinates follow/unfollow operations with rate limiting, scheduling, and safety systems

class AutomationEngine {
  constructor() {
    this.humanBehavior = new HumanBehaviorSimulator();
    this.instagramInterface = new InstagramInterface(this.humanBehavior);
    
    this.state = {
      isRunning: false,
      isPaused: false,
      currentAction: null,
      dailyStats: {
        follows: 0,
        unfollows: 0,
        errors: 0,
        date: new Date().toDateString()
      },
      queues: {
        follow: [],
        unfollow: []
      },
      settings: {
        dailyLimits: {
          follows: 100, // Conservative default for new accounts
          unfollows: 100
        },
        timingLimits: {
          minActionInterval: 30000, // 30 seconds minimum between actions
          maxActionInterval: 300000, // 5 minutes maximum
          breakAfterActions: 10, // Take break after N actions
          breakDuration: { min: 600000, max: 1800000 } // 10-30 minute breaks
        },
        rateLimiting: {
          maxRetries: 3,
          backoffMultiplier: 2,
          baseBackoffDelay: 60000 // 1 minute base
        },
        antiDetection: {
          enableContextualBrowsing: true,
          enableRandomBreaks: true,
          enableUnpredictableBehavior: true
        }
      }
    };
    
    this.actionHistory = [];
    this.lastActionTime = 0;
    this.consecutiveActions = 0;
    this.rateLimitBackoff = 0;
    
    this.bindEvents();
  }

  // Initialize automation engine
  async initialize() {
    try {
      console.log('Initializing automation engine...');
      
      // Initialize Instagram interface
      await this.instagramInterface.initialize();
      
      // Load saved state and settings
      await this.loadState();
      
      // Reset daily stats if new day
      this.checkDailyReset();
      
      console.log('Automation engine initialized successfully');
      return true;
      
    } catch (error) {
      console.error('Failed to initialize automation engine:', error);
      throw error;
    }
  }

  // Start automation process
  async start() {
    if (this.state.isRunning) {
      console.log('Automation already running');
      return;
    }
    
    console.log('Starting automation engine...');
    this.state.isRunning = true;
    this.state.isPaused = false;
    
    // Save state
    await this.saveState();
    
    // Start main automation loop
    this.automationLoop();
    
    // Notify UI
    this.notifyStateChange();
  }

  // Stop automation process
  async stop() {
    console.log('Stopping automation engine...');
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.currentAction = null;
    
    // Save state
    await this.saveState();
    
    // Notify UI
    this.notifyStateChange();
  }

  // Pause automation process
  async pause() {
    console.log('Pausing automation engine...');
    this.state.isPaused = true;
    
    // Save state
    await this.saveState();
    
    // Notify UI
    this.notifyStateChange();
  }

  // Resume automation process
  async resume() {
    if (!this.state.isRunning) {
      await this.start();
      return;
    }
    
    console.log('Resuming automation engine...');
    this.state.isPaused = false;
    
    // Save state
    await this.saveState();
    
    // Continue automation loop
    this.automationLoop();
    
    // Notify UI
    this.notifyStateChange();
  }

  // Main automation loop
  async automationLoop() {
    while (this.state.isRunning && !this.state.isPaused) {
      try {
        // Check if we need a break
        if (this.needsBreak()) {
          await this.takeBreak();
          continue;
        }
        
        // Check daily limits
        if (this.dailyLimitsReached()) {
          console.log('Daily limits reached, stopping for today');
          await this.stop();
          break;
        }
        
        // Check rate limiting
        if (this.isRateLimited()) {
          await this.handleRateLimit();
          continue;
        }
        
        // Get next action
        const nextAction = await this.getNextAction();
        
        if (!nextAction) {
          console.log('No more actions in queue');
          await this.stop();
          break;
        }
        
        // Execute action
        await this.executeAction(nextAction);
        
        // Wait before next action
        await this.waitForNextAction();
        
      } catch (error) {
        console.error('Error in automation loop:', error);
        this.handleError(error);
        
        // Wait before retrying
        await this.humanBehavior.delay(5000 + Math.random() * 10000);
      }
    }
  }

  // Get next action from queues
  async getNextAction() {
    // Prioritize unfollow actions (cleanup)
    if (this.state.queues.unfollow.length > 0) {
      const action = this.state.queues.unfollow.shift();
      return {
        type: 'unfollow',
        username: action.username,
        ...action
      };
    }
    
    // Then follow actions
    if (this.state.queues.follow.length > 0) {
      const action = this.state.queues.follow.shift();
      return {
        type: 'follow',
        username: action.username,
        ...action
      };
    }
    
    return null;
  }

  // Execute a single action
  async executeAction(action) {
    console.log(`Executing ${action.type} action for ${action.username}`);
    
    this.state.currentAction = action;
    this.notifyStateChange();
    
    try {
      // Navigate to user profile
      const searchSuccess = await this.instagramInterface.searchAccount(action.username);
      
      if (!searchSuccess) {
        throw new Error(`Failed to find user: ${action.username}`);
      }
      
      // Check for rate limiting before action
      const rateLimitCheck = await this.instagramInterface.detectRateLimit();
      if (rateLimitCheck.detected) {
        throw new Error(`Rate limit detected: ${rateLimitCheck.message}`);
      }
      
      // Execute the action
      let result;
      if (action.type === 'follow') {
        result = await this.instagramInterface.followAccount();
      } else if (action.type === 'unfollow') {
        result = await this.instagramInterface.unfollowAccount();
      }
      
      // Handle result
      if (result.success) {
        this.handleActionSuccess(action, result);
      } else {
        this.handleActionFailure(action, result.error);
      }
      
      // Random unpredictable behavior
      if (this.state.settings.antiDetection.enableUnpredictableBehavior) {
        await this.executeUnpredictableBehavior();
      }
      
    } catch (error) {
      this.handleActionFailure(action, error.message);
    } finally {
      this.state.currentAction = null;
      this.consecutiveActions++;
      this.lastActionTime = Date.now();
      
      // Save state
      await this.saveState();
      this.notifyStateChange();
    }
  }

  // Handle successful action
  handleActionSuccess(action, result) {
    console.log(`${action.type} action successful for ${action.username}`);
    
    // Update daily stats
    if (action.type === 'follow') {
      this.state.dailyStats.follows++;
      
      // Add to unfollow queue if not already following
      if (!result.alreadyFollowing) {
        this.scheduleUnfollow(action.username);
      }
    } else if (action.type === 'unfollow') {
      this.state.dailyStats.unfollows++;
    }
    
    // Log action
    this.logAction({
      type: action.type,
      username: action.username,
      success: true,
      timestamp: new Date(),
      result: result
    });
  }

  // Handle failed action
  handleActionFailure(action, error) {
    console.error(`${action.type} action failed for ${action.username}:`, error);
    
    this.state.dailyStats.errors++;
    
    // Log error
    this.logAction({
      type: action.type,
      username: action.username,
      success: false,
      timestamp: new Date(),
      error: error
    });
    
    // Check if we should retry
    if (action.retries < this.state.settings.rateLimiting.maxRetries) {
      action.retries = (action.retries || 0) + 1;
      
      // Add back to queue with delay
      setTimeout(() => {
        if (action.type === 'follow') {
          this.state.queues.follow.push(action);
        } else {
          this.state.queues.unfollow.push(action);
        }
      }, this.calculateBackoffDelay(action.retries));
    }
  }

  // Schedule unfollow for a followed account
  scheduleUnfollow(username) {
    const unfollowDelay = 3 * 24 * 60 * 60 * 1000; // 3 days default
    const scheduledTime = Date.now() + unfollowDelay;
    
    this.state.queues.unfollow.push({
      username: username,
      scheduledTime: scheduledTime,
      retries: 0
    });
  }

  // Check if we need a break
  needsBreak() {
    const actionsSinceBreak = this.consecutiveActions % this.state.settings.timingLimits.breakAfterActions;
    return actionsSinceBreak === 0 && this.consecutiveActions > 0;
  }

  // Take a break
  async takeBreak() {
    const breakDuration = this.state.settings.timingLimits.breakDuration.min + 
      Math.random() * (this.state.settings.timingLimits.breakDuration.max - this.state.settings.timingLimits.breakDuration.min);
    
    console.log(`Taking break for ${Math.round(breakDuration / 60000)} minutes`);
    
    this.state.currentAction = {
      type: 'break',
      duration: breakDuration,
      startTime: Date.now()
    };
    
    this.notifyStateChange();
    
    // Simulate human behavior during break
    if (this.state.settings.antiDetection.enableRandomBreaks) {
      await this.simulateBreakBehavior(breakDuration);
    } else {
      await this.humanBehavior.delay(breakDuration);
    }
    
    this.state.currentAction = null;
    this.consecutiveActions = 0;
  }

  // Simulate human behavior during breaks
  async simulateBreakBehavior(duration) {
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime && this.state.isRunning && !this.state.isPaused) {
      // Random idle movements
      await this.humanBehavior.simulateIdleMovements();
      
      // Random delays
      await this.humanBehavior.delay(30000 + Math.random() * 120000); // 30s - 2.5min
    }
  }

  // Check if daily limits are reached
  dailyLimitsReached() {
    return this.state.dailyStats.follows >= this.state.settings.dailyLimits.follows ||
           this.state.dailyStats.unfollows >= this.state.settings.dailyLimits.unfollows;
  }

  // Check if we're rate limited
  isRateLimited() {
    return Date.now() < this.rateLimitBackoff;
  }

  // Handle rate limiting
  async handleRateLimit() {
    const waitTime = this.rateLimitBackoff - Date.now();
    console.log(`Rate limited, waiting ${Math.round(waitTime / 60000)} minutes`);
    
    this.state.currentAction = {
      type: 'rate_limit',
      waitTime: waitTime,
      startTime: Date.now()
    };
    
    this.notifyStateChange();
    
    await this.humanBehavior.delay(waitTime);
    
    this.state.currentAction = null;
    this.rateLimitBackoff = 0;
  }

  // Calculate backoff delay for retries
  calculateBackoffDelay(retryCount) {
    const baseDelay = this.state.settings.rateLimiting.baseBackoffDelay;
    const multiplier = this.state.settings.rateLimiting.backoffMultiplier;
    const jitter = Math.random() * 0.3; // 30% jitter
    
    return baseDelay * Math.pow(multiplier, retryCount - 1) * (1 + jitter);
  }

  // Wait for next action with human-like timing and behavior
  async waitForNextAction() {
    const minInterval = this.state.settings.timingLimits.minActionInterval || 60000;
    const maxInterval = this.state.settings.timingLimits.maxActionInterval || 300000;
    
    const baseDelay = minInterval + Math.random() * (maxInterval - minInterval);
    
    // Add extra delay based on recent activity
    const activityMultiplier = Math.min(2, 1 + (this.consecutiveActions * 0.1));
    const finalDelay = baseDelay * activityMultiplier;
    
    console.log(`Waiting ${Math.round(finalDelay / 1000)} seconds before next action`);
    
    // Execute human behavior during wait time
    await this.executeHumanBehaviorDuringWait(finalDelay);
  }

  // Execute human-like behavior during wait periods
  async executeHumanBehaviorDuringWait(totalWaitTime) {
    const behaviorSettings = this.state.settings.humanBehavior || {};
    const scrollProbability = behaviorSettings.scrollProbability || 0.7;
    const idleProbability = behaviorSettings.idleProbability || 0.25;
    
    let remainingTime = totalWaitTime;
    
    while (remainingTime > 5000) { // Continue until less than 5 seconds remain
      const behaviorChoice = Math.random();
      
      if (behaviorChoice < scrollProbability) {
        // Scroll home feed
        console.log('🏠 Scrolling home feed during wait...');
        const scrollTime = await this.scrollHomeFeed();
        remainingTime -= scrollTime;
        
      } else if (behaviorChoice < scrollProbability + idleProbability) {
        // Idle behavior (just wait and do nothing)
        console.log('😴 Idle behavior - simulating reading/thinking...');
        const idleTime = await this.simulateIdleBehavior();
        remainingTime -= idleTime;
        
      } else {
        // Regular wait
        const waitTime = Math.min(remainingTime, 10000 + Math.random() * 20000);
        await this.humanBehavior.delay(waitTime);
        remainingTime -= waitTime;
      }
      
      // Small buffer between behaviors
      if (remainingTime > 2000) {
        await this.humanBehavior.delay(1000 + Math.random() * 2000);
        remainingTime -= 2000;
      }
    }
    
    // Wait remaining time
    if (remainingTime > 0) {
      await this.humanBehavior.delay(remainingTime);
    }
  }

  // Scroll home feed naturally
  async scrollHomeFeed() {
    const behaviorSettings = this.state.settings.humanBehavior || {};
    const scrollDuration = behaviorSettings.scrollDuration || 15000;
    
    try {
      // Navigate to home if not already there
      if (!window.location.pathname.includes('/') || window.location.pathname.length > 1) {
        console.log('📱 Navigating to home feed...');
        
        // Find home button
        const homeButton = document.querySelector('a[href="/"]') || 
                          document.querySelector('svg[aria-label="Home"]')?.closest('a');
        
        if (homeButton) {
          await this.humanBehavior.navigateToElement(homeButton);
          await this.humanBehavior.delay(200 + Math.random() * 300);
          homeButton.click();
          
          // Wait for page load
          await this.humanBehavior.delay(2000 + Math.random() * 2000);
        }
      }
      
      // Perform natural scrolling
      const startTime = Date.now();
      const endTime = startTime + scrollDuration;
      
      while (Date.now() < endTime) {
        // Random scroll amount and direction
        const scrollAmount = 200 + Math.random() * 400;
        const scrollDirection = Math.random() > 0.1 ? 1 : -1; // 90% down, 10% up
        
        window.scrollBy({
          top: scrollAmount * scrollDirection,
          behavior: 'smooth'
        });
        
        // Random pause between scrolls (simulating reading)
        const pauseTime = 1000 + Math.random() * 3000;
        await this.humanBehavior.delay(pauseTime);
        
        // Occasionally interact with posts (like, save, etc.)
        if (Math.random() < 0.1) { // 10% chance
          await this.simulatePostInteraction();
        }
      }
      
      console.log(`✅ Scrolled home feed for ${Math.round(scrollDuration / 1000)} seconds`);
      return scrollDuration;
      
    } catch (error) {
      console.error('Error scrolling home feed:', error);
      return 5000; // Return minimum time if error
    }
  }

  // Simulate idle behavior (reading, thinking)
  async simulateIdleBehavior() {
    const behaviorSettings = this.state.settings.humanBehavior || {};
    const idleDuration = behaviorSettings.idleDuration || 30000;
    
    // Add some variation to idle time
    const actualIdleTime = idleDuration * (0.7 + Math.random() * 0.6);
    
    // Occasionally move mouse slightly during idle time
    const idleStartTime = Date.now();
    while (Date.now() - idleStartTime < actualIdleTime) {
      // Small mouse movements every 5-10 seconds
      if (Math.random() < 0.3) {
        await this.humanBehavior.simulateIdleMovements();
      }
      
      // Wait 5-10 seconds before next check
      await this.humanBehavior.delay(5000 + Math.random() * 5000);
    }
    
    console.log(`✅ Idle behavior completed (${Math.round(actualIdleTime / 1000)} seconds)`);
    return actualIdleTime;
  }

  // Simulate post interactions during scrolling
  async simulatePostInteraction() {
    try {
      // Find visible posts
      const posts = document.querySelectorAll('article');
      const visiblePosts = Array.from(posts).filter(post => {
        const rect = post.getBoundingClientRect();
        return rect.top >= 0 && rect.top <= window.innerHeight;
      });
      
      if (visiblePosts.length === 0) return;
      
      const randomPost = visiblePosts[Math.floor(Math.random() * visiblePosts.length)];
      const interactionType = Math.random();
      
      if (interactionType < 0.3) {
        // Like post
        const likeButton = randomPost.querySelector('svg[aria-label="Like"]')?.closest('button');
        if (likeButton) {
          console.log('❤️ Liking post during scroll...');
          await this.humanBehavior.navigateToElement(likeButton);
          await this.humanBehavior.delay(300 + Math.random() * 500);
          likeButton.click();
        }
      } else if (interactionType < 0.4) {
        // Save post
        const saveButton = randomPost.querySelector('svg[aria-label="Save"]')?.closest('button');
        if (saveButton) {
          console.log('💾 Saving post during scroll...');
          await this.humanBehavior.navigateToElement(saveButton);
          await this.humanBehavior.delay(300 + Math.random() * 500);
          saveButton.click();
        }
      }
      // 60% chance of no interaction (just scrolling)
      
    } catch (error) {
      console.log('Could not interact with post:', error.message);
    }
  }

  // Execute unpredictable behavior
  async executeUnpredictableBehavior() {
    const behaviors = [
      () => this.humanBehavior.simulateIdleMovements(),
      () => this.simulateRandomScrolling(),
      () => this.simulateRandomNavigation(),
      () => this.simulateReadingPause()
    ];
    
    // 25% chance of random behavior
    if (Math.random() < 0.25) {
      const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
      await behavior();
    }
  }

  // Simulate random scrolling
  async simulateRandomScrolling() {
    const scrollDirection = Math.random() < 0.5 ? -1 : 1;
    const scrollAmount = 100 + Math.random() * 400;
    
    window.scrollBy(0, scrollDirection * scrollAmount);
    await this.humanBehavior.delay(500 + Math.random() * 1500);
    
    // Sometimes scroll back
    if (Math.random() < 0.4) {
      window.scrollBy(0, -scrollDirection * scrollAmount * 0.7);
      await this.humanBehavior.delay(300 + Math.random() * 1000);
    }
  }

  // Simulate random navigation
  async simulateRandomNavigation() {
    // Hover over random elements without clicking
    const elements = document.querySelectorAll('a, button, img');
    if (elements.length > 0) {
      const randomElement = elements[Math.floor(Math.random() * elements.length)];
      await this.humanBehavior.navigateToElement(randomElement);
      await this.humanBehavior.delay(500 + Math.random() * 1500);
    }
  }

  // Simulate reading pause
  async simulateReadingPause() {
    const readingTime = 2000 + Math.random() * 5000;
    await this.humanBehavior.delay(readingTime);
  }

  // Add accounts to follow queue
  addToFollowQueue(usernames) {
    const newActions = usernames.map(username => ({
      username: username.trim(),
      addedAt: Date.now(),
      retries: 0
    }));
    
    this.state.queues.follow.push(...newActions);
    console.log(`Added ${newActions.length} accounts to follow queue`);
    
    this.saveState();
    this.notifyStateChange();
  }

  // Add accounts to unfollow queue
  addToUnfollowQueue(usernames) {
    const newActions = usernames.map(username => ({
      username: username.trim(),
      addedAt: Date.now(),
      retries: 0
    }));
    
    this.state.queues.unfollow.push(...newActions);
    console.log(`Added ${newActions.length} accounts to unfollow queue`);
    
    this.saveState();
    this.notifyStateChange();
  }

  // Update settings
  updateSettings(newSettings) {
    this.state.settings = { ...this.state.settings, ...newSettings };
    this.saveState();
    this.notifyStateChange();
  }

  // Set state (for external updates)
  setState(newState) {
    this.state = { ...this.state, ...newState };
    console.log('State updated:', this.state);
  }

  // Restore session (for browser restart recovery)
  async restoreSession(savedState) {
    if (savedState) {
      this.state = { ...this.state, ...savedState };
      this.checkDailyReset();
      await this.saveState();
      console.log('Session restored:', this.state);
    }
  }

  // Reset daily stats
  resetDailyStats(newStats) {
    this.state.dailyStats = { ...newStats };
    this.saveState();
    console.log('Daily stats reset:', this.state.dailyStats);
  }

  // Check for daily reset
  checkDailyReset() {
    const today = new Date().toDateString();
    if (this.state.dailyStats.date !== today) {
      this.state.dailyStats = {
        follows: 0,
        unfollows: 0,
        errors: 0,
        date: today
      };
      console.log('Daily stats reset for new day');
    }
  }

  // Log action to history
  logAction(actionLog) {
    this.actionHistory.push(actionLog);
    
    // Keep only last 1000 actions
    if (this.actionHistory.length > 1000) {
      this.actionHistory = this.actionHistory.slice(-1000);
    }
  }

  // Handle errors
  handleError(error) {
    console.error('Automation error:', error);
    
    // Check if it's a rate limit error
    if (error.message.includes('rate limit') || error.message.includes('blocked')) {
      this.rateLimitBackoff = Date.now() + (60000 * Math.pow(2, this.state.dailyStats.errors));
    }
    
    this.state.dailyStats.errors++;
  }

  // Save state to storage
  async saveState() {
    try {
      const stateData = {
        automationState: this.state,
        actionHistory: this.actionHistory,
        lastActionTime: this.lastActionTime,
        consecutiveActions: this.consecutiveActions,
        rateLimitBackoff: this.rateLimitBackoff
      };

      // Try chrome.runtime message passing first (Manifest V3 way)
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'SAVE_STATE',
            data: stateData
          });
          
          if (response && response.success) {
            console.log('State saved via background script');
            return;
          }
        } catch (runtimeError) {
          console.log('Runtime message failed, trying direct storage:', runtimeError.message);
        }
      }

      // Try direct chrome.storage (might work in some contexts)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set(stateData);
        console.log('State saved via direct chrome.storage');
        return;
      }

      // Fallback to localStorage
      localStorage.setItem('instagram-automation-state', JSON.stringify(stateData));
      console.log('State saved to localStorage (fallback)');
      
    } catch (error) {
      console.error('Failed to save state:', error);
      // Final fallback to localStorage
      try {
        const stateData = {
          automationState: this.state,
          actionHistory: this.actionHistory,
          lastActionTime: this.lastActionTime,
          consecutiveActions: this.consecutiveActions,
          rateLimitBackoff: this.rateLimitBackoff
        };
        localStorage.setItem('instagram-automation-state', JSON.stringify(stateData));
        console.log('State saved to localStorage (final fallback)');
      } catch (fallbackError) {
        console.error('All storage methods failed:', fallbackError);
      }
    }
  }

  // Load state from storage
  async loadState() {
    try {
      let result = null;
      
      // Try chrome.runtime message passing first (Manifest V3 way)
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'LOAD_STATE'
          });
          
          if (response && response.success && response.data) {
            result = response.data;
            console.log('State loaded via background script');
          }
        } catch (runtimeError) {
          console.log('Runtime message failed, trying direct storage:', runtimeError.message);
        }
      }

      // Try direct chrome.storage if runtime failed
      if (!result && typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        result = await chrome.storage.local.get([
          'automationState',
          'actionHistory',
          'lastActionTime',
          'consecutiveActions',
          'rateLimitBackoff'
        ]);
        console.log('State loaded via direct chrome.storage');
      }

      // Fallback to localStorage
      if (!result) {
        const savedData = localStorage.getItem('instagram-automation-state');
        if (savedData) {
          result = JSON.parse(savedData);
          console.log('State loaded from localStorage (fallback)');
        }
      }
      
      if (result.automationState) {
        this.state = { ...this.state, ...result.automationState };
      }
      
      if (result.actionHistory) {
        this.actionHistory = result.actionHistory;
      }
      
      if (result.lastActionTime) {
        this.lastActionTime = result.lastActionTime;
      }
      
      if (result.consecutiveActions) {
        this.consecutiveActions = result.consecutiveActions;
      }
      
      if (result.rateLimitBackoff) {
        this.rateLimitBackoff = result.rateLimitBackoff;
      }
      
    } catch (error) {
      console.error('Failed to load state:', error);
    }
  }

  // Bind event listeners
  bindEvents() {
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
    
    // Listen for page navigation
    window.addEventListener('beforeunload', () => {
      this.saveState();
    });
  }

  // Handle messages from other parts of extension
  async handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'START_AUTOMATION':
        await this.start();
        sendResponse({ success: true });
        break;
        
      case 'STOP_AUTOMATION':
        await this.stop();
        sendResponse({ success: true });
        break;
        
      case 'PAUSE_AUTOMATION':
        await this.pause();
        sendResponse({ success: true });
        break;
        
      case 'RESUME_AUTOMATION':
        await this.resume();
        sendResponse({ success: true });
        break;
        
      case 'ADD_FOLLOW_ACCOUNTS':
        this.addToFollowQueue(message.usernames);
        sendResponse({ success: true });
        break;
        
      case 'ADD_UNFOLLOW_ACCOUNTS':
        this.addToUnfollowQueue(message.usernames);
        sendResponse({ success: true });
        break;
        
      case 'UPDATE_SETTINGS':
        this.updateSettings(message.settings);
        sendResponse({ success: true });
        break;
        
      case 'GET_STATUS':
        sendResponse({
          state: this.state,
          actionHistory: this.actionHistory.slice(-50), // Last 50 actions
          stats: this.getStats()
        });
        break;
        
      case 'TEST_FOLLOW':
        this.testFollowAction(message.username, sendResponse);
        break;
        
      case 'TEST_UNFOLLOW':
        this.testUnfollowAction(message.username, sendResponse);
        break;
        
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  // Get automation statistics
  getStats() {
    return {
      dailyStats: this.state.dailyStats,
      queueSizes: {
        follow: this.state.queues.follow.length,
        unfollow: this.state.queues.unfollow.length
      },
      lastActionTime: this.lastActionTime,
      consecutiveActions: this.consecutiveActions,
      isRateLimited: this.isRateLimited(),
      rateLimitBackoff: this.rateLimitBackoff
    };
  }

  // Test follow action for a specific username
  async testFollowAction(username, sendResponse) {
    try {
      console.log(`Testing follow action for: ${username}`);
      
      // Search for the account
      const searchSuccess = await this.instagramInterface.searchAccount(username);
      
      if (!searchSuccess) {
        sendResponse({ success: false, error: `Could not find user: ${username}` });
        return;
      }
      
      // Attempt to follow
      const result = await this.instagramInterface.followAccount();
      
      if (result.success) {
        // Log the test action
        this.logAction({
          type: 'follow',
          username: username,
          success: true,
          timestamp: new Date(),
          result: result,
          isTest: true
        });
        
        sendResponse({ 
          success: true, 
          alreadyFollowing: result.alreadyFollowing 
        });
      } else {
        // Log the failed test action
        this.logAction({
          type: 'follow',
          username: username,
          success: false,
          timestamp: new Date(),
          error: result.error,
          isTest: true
        });
        
        sendResponse({ success: false, error: result.error });
      }
      
    } catch (error) {
      console.error('Test follow error:', error);
      
      // Log the error
      this.logAction({
        type: 'follow',
        username: username,
        success: false,
        timestamp: new Date(),
        error: error.message,
        isTest: true
      });
      
      sendResponse({ success: false, error: error.message });
    }
  }

  // Test unfollow action for a specific username
  async testUnfollowAction(username, sendResponse) {
    try {
      console.log(`Testing unfollow action for: ${username}`);
      
      // Search for the account
      const searchSuccess = await this.instagramInterface.searchAccount(username);
      
      if (!searchSuccess) {
        sendResponse({ success: false, error: `Could not find user: ${username}` });
        return;
      }
      
      // Attempt to unfollow
      const result = await this.instagramInterface.unfollowAccount();
      
      if (result.success) {
        // Log the test action
        this.logAction({
          type: 'unfollow',
          username: username,
          success: true,
          timestamp: new Date(),
          result: result,
          isTest: true
        });
        
        sendResponse({ 
          success: true, 
          wasNotFollowing: result.wasNotFollowing 
        });
      } else {
        // Log the failed test action
        this.logAction({
          type: 'unfollow',
          username: username,
          success: false,
          timestamp: new Date(),
          error: result.error,
          isTest: true
        });
        
        sendResponse({ success: false, error: result.error });
      }
      
    } catch (error) {
      console.error('Test unfollow error:', error);
      
      // Log the error
      this.logAction({
        type: 'unfollow',
        username: username,
        success: false,
        timestamp: new Date(),
        error: error.message,
        isTest: true
      });
      
      sendResponse({ success: false, error: error.message });
    }
  }

  // Notify UI of state changes
  notifyStateChange() {
    // Send message to popup and background script
    chrome.runtime.sendMessage({
      type: 'STATE_CHANGED',
      state: this.state,
      stats: this.getStats()
    }).catch(() => {
      // Ignore errors if popup is closed
    });
  }
}

// Export for use in other modules
window.AutomationEngine = AutomationEngine;

// ES Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AutomationEngine;
}