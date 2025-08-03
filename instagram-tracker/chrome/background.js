// Background Service Worker
// Manages extension lifecycle, storage, and cross-tab communication

class BackgroundService {
  constructor() {
    this.activeContentScripts = new Map();
    this.automationState = null;
    this.alarmHandlers = new Map();
    
    this.initialize();
  }

  // Initialize background service
  initialize() {
    console.log('Instagram Automation: Background service initializing...');
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Load saved state
    this.loadState();
    
    // Set up periodic tasks
    this.setupPeriodicTasks();
    
    console.log('Instagram Automation: Background service initialized');
  }

  // Set up event listeners
  setupEventListeners() {
    // Extension installation/startup
    chrome.runtime.onInstalled.addListener((details) => {
      this.handleInstallation(details);
    });
    
    chrome.runtime.onStartup.addListener(() => {
      this.handleStartup();
    });
    
    // Message handling
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
    
    // Tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });
    
    // Tab removal
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoved(tabId);
    });
    
    // Alarm handling
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });
    
    // Storage changes
    chrome.storage.onChanged.addListener((changes, namespace) => {
      this.handleStorageChange(changes, namespace);
    });
  }

  // Handle extension installation
  async handleInstallation(details) {
    console.log('Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
      // First time installation
      await this.initializeDefaultSettings();
      
      // Show welcome notification
      this.showNotification({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'Instagram Automation Installed',
        message: 'Extension is ready to use. Visit Instagram to get started.'
      });
      
    } else if (details.reason === 'update') {
      // Extension updated
      console.log('Extension updated from version:', details.previousVersion);
      
      // Handle any migration if needed
      await this.handleVersionMigration(details.previousVersion);
    }
  }

  // Handle extension startup
  async handleStartup() {
    console.log('Extension startup');
    
    // Restore any active automation sessions
    await this.restoreActiveSessions();
  }

  // Handle messages from content scripts and popup
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'CONTENT_SCRIPT_READY':
          await this.handleContentScriptReady(sender, message);
          sendResponse({ success: true });
          break;
          
        case 'GET_AUTOMATION_STATE':
          const state = await this.getAutomationState();
          sendResponse({ state });
          break;
          
        case 'UPDATE_AUTOMATION_STATE':
          await this.updateAutomationState(message.state);
          sendResponse({ success: true });
          break;
          
        case 'SCHEDULE_AUTOMATION':
          await this.scheduleAutomation(message.schedule);
          sendResponse({ success: true });
          break;
          
        case 'CANCEL_SCHEDULED_AUTOMATION':
          await this.cancelScheduledAutomation();
          sendResponse({ success: true });
          break;
          
        case 'GET_STATISTICS':
          const stats = await this.getStatistics();
          sendResponse({ stats });
          break;
          
        case 'EXPORT_DATA':
          const exportData = await this.exportData(message.format);
          sendResponse({ data: exportData });
          break;
          
        case 'CLEAR_DATA':
          await this.clearData(message.dataType);
          sendResponse({ success: true });
          break;
          
        case 'STATE_CHANGED':
          // Broadcast state change to all content scripts
          await this.broadcastStateChange(message.state, message.stats);
          sendResponse({ success: true });
          break;
          
        case 'SAVE_STATE':
          // Save state to chrome.storage
          await chrome.storage.local.set(message.data);
          sendResponse({ success: true });
          break;
          
        case 'LOAD_STATE':
          // Load state from chrome.storage
          const stateData = await chrome.storage.local.get([
            'automationState',
            'actionHistory',
            'lastActionTime',
            'consecutiveActions',
            'rateLimitBackoff'
          ]);
          sendResponse({ success: true, data: stateData });
          break;
          
        case 'PING':
          // Simple ping to check if background script is alive
          sendResponse({ success: true, timestamp: Date.now() });
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
          sendResponse({ error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ error: error.message });
    }
  }

  // Handle content script ready
  async handleContentScriptReady(sender, message) {
    const tabId = sender.tab.id;
    const url = message.url;
    
    console.log(`Content script ready on tab ${tabId}: ${url}`);
    
    // Register active content script
    this.activeContentScripts.set(tabId, {
      url: url,
      timestamp: Date.now(),
      frameId: sender.frameId
    });
    
    // Send current automation state to content script
    if (this.automationState) {
      chrome.tabs.sendMessage(tabId, {
        type: 'AUTOMATION_STATE_UPDATE',
        state: this.automationState
      }).catch(() => {
        // Ignore errors if content script is not ready
      });
    }
  }

  // Handle tab updates
  handleTabUpdate(tabId, changeInfo, tab) {
    // Check if tab navigated to Instagram
    if (changeInfo.url && this.isInstagramUrl(changeInfo.url)) {
      console.log(`Instagram page loaded in tab ${tabId}`);
      
      // Update active content script info
      if (this.activeContentScripts.has(tabId)) {
        const scriptInfo = this.activeContentScripts.get(tabId);
        scriptInfo.url = changeInfo.url;
        scriptInfo.timestamp = Date.now();
      }
    }
    
    // Remove from active scripts if navigated away from Instagram
    if (changeInfo.url && !this.isInstagramUrl(changeInfo.url)) {
      this.activeContentScripts.delete(tabId);
    }
  }

  // Handle tab removal
  handleTabRemoved(tabId) {
    console.log(`Tab ${tabId} removed`);
    this.activeContentScripts.delete(tabId);
  }

  // Handle alarms
  async handleAlarm(alarm) {
    console.log('Alarm triggered:', alarm.name);
    
    const handler = this.alarmHandlers.get(alarm.name);
    if (handler) {
      try {
        await handler(alarm);
      } catch (error) {
        console.error(`Error handling alarm ${alarm.name}:`, error);
      }
    }
  }

  // Handle storage changes
  handleStorageChange(changes, namespace) {
    if (namespace === 'local') {
      // Update local state if automation state changed
      if (changes.automationState) {
        this.automationState = changes.automationState.newValue;
        
        // Broadcast to all active content scripts
        this.broadcastToContentScripts({
          type: 'AUTOMATION_STATE_UPDATE',
          state: this.automationState
        });
      }
    }
  }

  // Initialize default settings
  async initializeDefaultSettings() {
    const defaultSettings = {
      dailyLimits: {
        follows: 100,
        unfollows: 100
      },
      timingLimits: {
        minActionInterval: 30000, // 30 seconds
        maxActionInterval: 300000, // 5 minutes
        breakAfterActions: 10,
        breakDuration: { min: 600000, max: 1800000 } // 10-30 minutes
      },
      rateLimiting: {
        maxRetries: 3,
        backoffMultiplier: 2,
        baseBackoffDelay: 60000
      },
      antiDetection: {
        enableContextualBrowsing: true,
        enableRandomBreaks: true,
        enableUnpredictableBehavior: true
      },
      notifications: {
        enabled: true,
        dailyLimitReached: true,
        rateLimitDetected: true,
        errorsOccurred: true
      }
    };
    
    await chrome.storage.local.set({
      extensionSettings: defaultSettings,
      installDate: Date.now(),
      version: chrome.runtime.getManifest().version
    });
    
    console.log('Default settings initialized');
  }

  // Handle version migration
  async handleVersionMigration(previousVersion) {
    console.log(`Migrating from version ${previousVersion}`);
    
    // Add migration logic here for future versions
    // For now, just update the version
    await chrome.storage.local.set({
      version: chrome.runtime.getManifest().version,
      lastUpdateDate: Date.now()
    });
  }

  // Restore active automation sessions
  async restoreActiveSessions() {
    try {
      const result = await chrome.storage.local.get(['automationState']);
      
      if (result.automationState && result.automationState.isRunning) {
        console.log('Restoring active automation session');
        this.automationState = result.automationState;
        
        // Find Instagram tabs and notify them
        const tabs = await chrome.tabs.query({ url: '*://www.instagram.com/*' });
        
        for (const tab of tabs) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'RESTORE_AUTOMATION_SESSION',
            state: this.automationState
          }).catch(() => {
            // Ignore errors if content script is not ready
          });
        }
      }
    } catch (error) {
      console.error('Error restoring active sessions:', error);
    }
  }

  // Set up periodic tasks
  setupPeriodicTasks() {
    // Daily reset alarm
    chrome.alarms.create('dailyReset', {
      when: this.getNextMidnight(),
      periodInMinutes: 24 * 60 // 24 hours
    });
    
    this.alarmHandlers.set('dailyReset', this.handleDailyReset.bind(this));
    
    // Cleanup old data alarm
    chrome.alarms.create('dataCleanup', {
      delayInMinutes: 60, // 1 hour after startup
      periodInMinutes: 24 * 60 // Daily
    });
    
    this.alarmHandlers.set('dataCleanup', this.handleDataCleanup.bind(this));
    
    // Statistics update alarm
    chrome.alarms.create('statsUpdate', {
      delayInMinutes: 5,
      periodInMinutes: 15 // Every 15 minutes
    });
    
    this.alarmHandlers.set('statsUpdate', this.handleStatsUpdate.bind(this));
  }

  // Get next midnight timestamp
  getNextMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
  }

  // Handle daily reset
  async handleDailyReset() {
    console.log('Performing daily reset');
    
    try {
      // Reset daily statistics
      const result = await chrome.storage.local.get(['automationState']);
      
      if (result.automationState) {
        result.automationState.dailyStats = {
          follows: 0,
          unfollows: 0,
          errors: 0,
          date: new Date().toDateString()
        };
        
        await chrome.storage.local.set({
          automationState: result.automationState
        });
        
        // Notify content scripts
        this.broadcastToContentScripts({
          type: 'DAILY_RESET',
          newStats: result.automationState.dailyStats
        });
        
        console.log('Daily statistics reset');
      }
    } catch (error) {
      console.error('Error during daily reset:', error);
    }
  }

  // Handle data cleanup
  async handleDataCleanup() {
    console.log('Performing data cleanup');
    
    try {
      // Clean up old action history (keep last 30 days)
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const result = await chrome.storage.local.get(['actionHistory']);
      
      if (result.actionHistory) {
        const filteredHistory = result.actionHistory.filter(
          action => new Date(action.timestamp).getTime() > thirtyDaysAgo
        );
        
        if (filteredHistory.length < result.actionHistory.length) {
          await chrome.storage.local.set({
            actionHistory: filteredHistory
          });
          
          console.log(`Cleaned up ${result.actionHistory.length - filteredHistory.length} old action records`);
        }
      }
      
      // Clean up old error logs
      const errorLogs = await chrome.storage.local.get(['errorLogs']);
      
      if (errorLogs.errorLogs) {
        const filteredErrors = errorLogs.errorLogs.filter(
          error => new Date(error.timestamp).getTime() > thirtyDaysAgo
        );
        
        if (filteredErrors.length < errorLogs.errorLogs.length) {
          await chrome.storage.local.set({
            errorLogs: filteredErrors
          });
          
          console.log(`Cleaned up ${errorLogs.errorLogs.length - filteredErrors.length} old error logs`);
        }
      }
      
    } catch (error) {
      console.error('Error during data cleanup:', error);
    }
  }

  // Handle statistics update
  async handleStatsUpdate() {
    try {
      // Update usage statistics
      const stats = await this.calculateUsageStats();
      
      await chrome.storage.local.set({
        usageStats: stats,
        lastStatsUpdate: Date.now()
      });
      
    } catch (error) {
      console.error('Error updating statistics:', error);
    }
  }

  // Calculate usage statistics
  async calculateUsageStats() {
    const result = await chrome.storage.local.get([
      'actionHistory',
      'automationState',
      'installDate'
    ]);
    
    const actionHistory = result.actionHistory || [];
    const installDate = result.installDate || Date.now();
    
    // Calculate various statistics
    const totalActions = actionHistory.length;
    const successfulActions = actionHistory.filter(a => a.success).length;
    const failedActions = totalActions - successfulActions;
    const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 0;
    
    // Daily statistics for last 7 days
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentActions = actionHistory.filter(
      a => new Date(a.timestamp).getTime() > sevenDaysAgo
    );
    
    const dailyStats = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
      const dateString = date.toDateString();
      
      const dayActions = recentActions.filter(
        a => new Date(a.timestamp).toDateString() === dateString
      );
      
      dailyStats[dateString] = {
        follows: dayActions.filter(a => a.type === 'follow' && a.success).length,
        unfollows: dayActions.filter(a => a.type === 'unfollow' && a.success).length,
        errors: dayActions.filter(a => !a.success).length
      };
    }
    
    return {
      totalActions,
      successfulActions,
      failedActions,
      successRate,
      dailyStats,
      installDate,
      lastCalculated: Date.now()
    };
  }

  // Get automation state
  async getAutomationState() {
    const result = await chrome.storage.local.get(['automationState']);
    return result.automationState || null;
  }

  // Update automation state
  async updateAutomationState(state) {
    this.automationState = state;
    await chrome.storage.local.set({ automationState: state });
  }

  // Schedule automation
  async scheduleAutomation(schedule) {
    const alarmName = `scheduledAutomation_${Date.now()}`;
    
    chrome.alarms.create(alarmName, {
      when: schedule.startTime
    });
    
    this.alarmHandlers.set(alarmName, async () => {
      // Start automation on scheduled time
      this.broadcastToContentScripts({
        type: 'START_SCHEDULED_AUTOMATION',
        schedule: schedule
      });
    });
    
    // Save scheduled automation info
    await chrome.storage.local.set({
      scheduledAutomation: {
        alarmName: alarmName,
        schedule: schedule,
        createdAt: Date.now()
      }
    });
  }

  // Cancel scheduled automation
  async cancelScheduledAutomation() {
    const result = await chrome.storage.local.get(['scheduledAutomation']);
    
    if (result.scheduledAutomation) {
      chrome.alarms.clear(result.scheduledAutomation.alarmName);
      this.alarmHandlers.delete(result.scheduledAutomation.alarmName);
      
      await chrome.storage.local.remove(['scheduledAutomation']);
    }
  }

  // Get statistics
  async getStatistics() {
    const result = await chrome.storage.local.get([
      'usageStats',
      'actionHistory',
      'automationState'
    ]);
    
    return {
      usageStats: result.usageStats || {},
      recentActions: (result.actionHistory || []).slice(-100),
      currentState: result.automationState || {}
    };
  }

  // Export data
  async exportData(format = 'json') {
    const result = await chrome.storage.local.get();
    
    if (format === 'csv') {
      return this.convertToCSV(result.actionHistory || []);
    } else {
      return JSON.stringify(result, null, 2);
    }
  }

  // Convert action history to CSV
  convertToCSV(actionHistory) {
    if (actionHistory.length === 0) {
      return 'No data to export';
    }
    
    const headers = ['Timestamp', 'Type', 'Username', 'Success', 'Error'];
    const rows = actionHistory.map(action => [
      new Date(action.timestamp).toISOString(),
      action.type,
      action.username,
      action.success ? 'Yes' : 'No',
      action.error || ''
    ]);
    
    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  // Clear data
  async clearData(dataType) {
    switch (dataType) {
      case 'actionHistory':
        await chrome.storage.local.remove(['actionHistory']);
        break;
      case 'statistics':
        await chrome.storage.local.remove(['usageStats']);
        break;
      case 'all':
        await chrome.storage.local.clear();
        await this.initializeDefaultSettings();
        break;
    }
  }

  // Broadcast state change to content scripts
  async broadcastStateChange(state, stats) {
    this.broadcastToContentScripts({
      type: 'STATE_CHANGED',
      state: state,
      stats: stats
    });
  }

  // Broadcast message to all active content scripts
  broadcastToContentScripts(message) {
    for (const [tabId, scriptInfo] of this.activeContentScripts) {
      chrome.tabs.sendMessage(tabId, message).catch(() => {
        // Remove inactive content script
        this.activeContentScripts.delete(tabId);
      });
    }
  }

  // Check if URL is Instagram
  isInstagramUrl(url) {
    return url && (url.includes('instagram.com') || url.includes('www.instagram.com'));
  }

  // Show notification
  showNotification(options) {
    if (chrome.notifications) {
      chrome.notifications.create(options);
    }
  }

  // Load state from storage
  async loadState() {
    try {
      const result = await chrome.storage.local.get(['automationState']);
      if (result.automationState) {
        this.automationState = result.automationState;
      }
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }
}

// Initialize background service
const backgroundService = new BackgroundService();

console.log('Instagram Automation: Background service worker loaded');

// ES Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackgroundService;
}