/*
 * Background Script - Service worker for Chrome extension coordination
 * Manages communication between popup and content scripts, handles extension lifecycle
 * 
 * Updated: Completed background script coordination system for markt.de DM bot
 */

class BackgroundService {
  constructor() {
    this.isInitialized = false;
    this.campaignState = {
      isRunning: false,
      isPaused: false,
      currentAccount: null,
      stats: {
        totalAccounts: 0,
        processedAccounts: 0,
        successfulContacts: 0,
        failedContacts: 0
      }
    };
    
    this.messageHandlers = new Map();
    this.activeTab = null;
    this.contentScriptReady = false;
    
    this.setupMessageHandlers();
    
    // Initialize when service worker starts
    this.initialize();
  }

  // Initialize the background service
  async initialize() {
    try {
      console.log('🚀 Initializing Markt.de DM Bot background service');
      
      // Set up extension event listeners
      this.setupExtensionListeners();
      
      // Load saved campaign state
      await this.loadCampaignState();
      
      this.isInitialized = true;
      console.log('✅ Background service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize background service:', error);
    }
  }

  // Set up extension event listeners
  setupExtensionListeners() {
    // Handle extension installation/startup
    chrome.runtime.onStartup.addListener(() => {
      console.log('Extension startup detected');
      this.initialize();
    });

    chrome.runtime.onInstalled.addListener((details) => {
      console.log('Extension installed/updated:', details.reason);
      if (details.reason === 'install') {
        this.handleFirstInstall();
      } else if (details.reason === 'update') {
        this.handleUpdate(details.previousVersion);
      }
    });

    // Handle tab updates to track markt.de pages
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url && tab.url.includes('markt.de')) {
        this.handleMarktDeTabReady(tabId, tab);
      }
    });

    // Handle tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      chrome.tabs.get(activeInfo.tabId, (tab) => {
        if (tab.url && tab.url.includes('markt.de')) {
          this.activeTab = activeInfo.tabId;
        }
      });
    });

    // Handle messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
  }

  // Set up message handlers
  setupMessageHandlers() {
    // Popup messages
    this.messageHandlers.set('popup_get_status', this.handleGetStatus.bind(this));
    this.messageHandlers.set('popup_start_campaign', this.handleStartCampaign.bind(this));
    this.messageHandlers.set('popup_stop_campaign', this.handleStopCampaign.bind(this));
    this.messageHandlers.set('popup_pause_campaign', this.handlePauseCampaign.bind(this));
    this.messageHandlers.set('popup_resume_campaign', this.handleResumeCampaign.bind(this));
    this.messageHandlers.set('popup_login', this.handleLogin.bind(this));
    this.messageHandlers.set('popup_upload_csv', this.handleUploadCSV.bind(this));
    this.messageHandlers.set('popup_update_config', this.handleUpdateConfig.bind(this));
    this.messageHandlers.set('popup_get_logs', this.handleGetLogs.bind(this));
    this.messageHandlers.set('popup_clear_logs', this.handleClearLogs.bind(this));
    this.messageHandlers.set('popup_export_logs', this.handleExportLogs.bind(this));

    // Content script messages
    this.messageHandlers.set('content_ready', this.handleContentScriptReady.bind(this));
    this.messageHandlers.set('content_progress_update', this.handleProgressUpdate.bind(this));
    this.messageHandlers.set('content_campaign_complete', this.handleCampaignComplete.bind(this));
    this.messageHandlers.set('content_error', this.handleContentScriptError.bind(this));
    this.messageHandlers.set('content_login_status', this.handleLoginStatus.bind(this));
    this.messageHandlers.set('content_account_processed', this.handleAccountProcessed.bind(this));
  }

  // Handle incoming messages
  async handleMessage(message, sender, sendResponse) {
    try {
      const { type, data } = message;
      
      console.log(`📨 Received message: ${type}`, data);
      
      const handler = this.messageHandlers.get(type);
      if (handler) {
        const response = await handler(data, sender);
        sendResponse({ success: true, data: response });
      } else {
        console.warn(`⚠️ Unknown message type: ${type}`);
        sendResponse({ success: false, error: `Unknown message type: ${type}` });
      }
      
    } catch (error) {
      console.error(`❌ Error handling message ${message.type}:`, error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Popup message handlers
  async handleGetStatus(data, sender) {
    return {
      isInitialized: this.isInitialized,
      campaignState: this.campaignState,
      contentScriptReady: this.contentScriptReady,
      activeTab: this.activeTab
    };
  }

  async handleStartCampaign(data, sender) {
    if (!this.contentScriptReady) {
      throw new Error('Content script not ready. Please navigate to markt.de first.');
    }

    // Forward to content script
    const response = await this.sendMessageToContentScript('start_campaign', data);
    
    if (response.success) {
      this.campaignState.isRunning = true;
      this.campaignState.isPaused = false;
      await this.saveCampaignState();
    }
    
    return response;
  }

  async handleStopCampaign(data, sender) {
    if (!this.contentScriptReady) {
      throw new Error('Content script not ready');
    }

    const response = await this.sendMessageToContentScript('stop_campaign', data);
    
    if (response.success) {
      this.campaignState.isRunning = false;
      this.campaignState.isPaused = false;
      await this.saveCampaignState();
    }
    
    return response;
  }

  async handlePauseCampaign(data, sender) {
    if (!this.contentScriptReady) {
      throw new Error('Content script not ready');
    }

    const response = await this.sendMessageToContentScript('pause_campaign', data);
    
    if (response.success) {
      this.campaignState.isPaused = true;
      await this.saveCampaignState();
    }
    
    return response;
  }

  async handleResumeCampaign(data, sender) {
    if (!this.contentScriptReady) {
      throw new Error('Content script not ready');
    }

    const response = await this.sendMessageToContentScript('resume_campaign', data);
    
    if (response.success) {
      this.campaignState.isPaused = false;
      await this.saveCampaignState();
    }
    
    return response;
  }

  async handleLogin(data, sender) {
    if (!this.contentScriptReady) {
      throw new Error('Content script not ready. Please navigate to markt.de first.');
    }

    return await this.sendMessageToContentScript('login', data);
  }

  async handleUploadCSV(data, sender) {
    // Store CSV data in chrome storage
    try {
      await chrome.storage.local.set({ 
        targetAccounts: data.accounts,
        csvUploadTimestamp: Date.now()
      });
      
      console.log(`✅ Stored ${data.accounts.length} accounts from CSV upload`);
      return { accountCount: data.accounts.length };
      
    } catch (error) {
      console.error('❌ Failed to store CSV data:', error);
      throw error;
    }
  }

  async handleUpdateConfig(data, sender) {
    try {
      await chrome.storage.local.set({ config: data });
      console.log('✅ Configuration updated');
      
      // Forward to content script if ready
      if (this.contentScriptReady) {
        await this.sendMessageToContentScript('update_config', data);
      }
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to update configuration:', error);
      throw error;
    }
  }

  async handleGetLogs(data, sender) {
    try {
      const result = await chrome.storage.local.get(['logs']);
      return result.logs || [];
    } catch (error) {
      console.error('❌ Failed to get logs:', error);
      throw error;
    }
  }

  async handleClearLogs(data, sender) {
    try {
      await chrome.storage.local.set({ logs: [] });
      console.log('✅ Logs cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear logs:', error);
      throw error;
    }
  }

  async handleExportLogs(data, sender) {
    try {
      const result = await chrome.storage.local.get(['logs']);
      const logs = result.logs || [];
      
      const exportData = {
        exportDate: new Date().toISOString(),
        totalLogs: logs.length,
        logs: logs
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('❌ Failed to export logs:', error);
      throw error;
    }
  }

  // Content script message handlers
  async handleContentScriptReady(data, sender) {
    this.contentScriptReady = true;
    this.activeTab = sender.tab.id;
    
    console.log('✅ Content script ready on tab:', sender.tab.id);
    
    // Notify popup if it's open
    this.notifyPopup('content_script_ready', { tabId: sender.tab.id });
    
    return { success: true };
  }

  async handleProgressUpdate(data, sender) {
    this.campaignState.stats = { ...this.campaignState.stats, ...data };
    this.campaignState.currentAccount = data.currentAccount;
    
    // Save state
    await this.saveCampaignState();
    
    // Notify popup
    this.notifyPopup('progress_update', data);
    
    return { success: true };
  }

  async handleCampaignComplete(data, sender) {
    this.campaignState.isRunning = false;
    this.campaignState.isPaused = false;
    this.campaignState.stats = { ...this.campaignState.stats, ...data };
    
    await this.saveCampaignState();
    
    // Notify popup
    this.notifyPopup('campaign_complete', data);
    
    console.log('✅ Campaign completed');
    return { success: true };
  }

  async handleContentScriptError(data, sender) {
    console.error('❌ Content script error:', data);
    
    // Log the error
    await this.addLog({
      level: 'error',
      message: data.message,
      context: data.context,
      timestamp: Date.now()
    });
    
    // Notify popup
    this.notifyPopup('error', data);
    
    return { success: true };
  }

  async handleLoginStatus(data, sender) {
    console.log('🔐 Login status update:', data);
    
    // Notify popup
    this.notifyPopup('login_status', data);
    
    return { success: true };
  }

  async handleAccountProcessed(data, sender) {
    console.log('📊 Account processed:', data);
    
    // Update stats
    this.campaignState.stats.processedAccounts = (this.campaignState.stats.processedAccounts || 0) + 1;
    
    if (data.success) {
      this.campaignState.stats.successfulContacts = (this.campaignState.stats.successfulContacts || 0) + 1;
    } else {
      this.campaignState.stats.failedContacts = (this.campaignState.stats.failedContacts || 0) + 1;
    }
    
    await this.saveCampaignState();
    
    // Notify popup
    this.notifyPopup('account_processed', data);
    
    return { success: true };
  }

  // Send message to content script
  async sendMessageToContentScript(type, data = {}) {
    if (!this.activeTab) {
      throw new Error('No active markt.de tab found');
    }

    try {
      const response = await chrome.tabs.sendMessage(this.activeTab, { type, data });
      return response;
    } catch (error) {
      console.error(`❌ Failed to send message to content script: ${type}`, error);
      throw new Error(`Failed to communicate with content script: ${error.message}`);
    }
  }

  // Notify popup of updates
  async notifyPopup(type, data = {}) {
    try {
      // Send message to popup if it's open
      chrome.runtime.sendMessage({ type: `popup_${type}`, data });
    } catch (error) {
      // Popup might not be open, which is fine
      console.log('Popup not available for notification:', type);
    }
  }

  // Handle markt.de tab ready
  async handleMarktDeTabReady(tabId, tab) {
    console.log('🌐 Markt.de tab ready:', tab.url);
    
    this.activeTab = tabId;
    
    // Inject content script if not already injected
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: [
          'utils/logger.js',
          'utils/storage-manager.js',
          'content/human-behavior.js',
          'content/markt-interface.js',
          'content/automation-engine.js',
          'content/content-script.js'
        ]
      });
      
      console.log('✅ Content scripts injected into tab:', tabId);
    } catch (error) {
      console.error('❌ Failed to inject content scripts:', error);
    }
  }

  // Handle first installation
  async handleFirstInstall() {
    console.log('🎉 First installation detected');
    
    // Set up default configuration
    const defaultConfig = {
      maxAccountsPerSession: 50,
      delayBetweenAccounts: 5000,
      messageTemplate: 'Hey ich habe gesehen, dass du einer Freundin von mir auch folgst 🫣 Falls du mich auch ganz süß findestund mich kennenlerenen willst schreib mir doch auf Telegram @',
      retryAttempts: 3,
      timeouts: {
        login: 30000,
        navigation: 30000,
        dmSend: 15000
      }
    };
    
    await chrome.storage.local.set({ 
      config: defaultConfig,
      logs: [],
      firstInstall: Date.now()
    });
    
    // Open welcome page or instructions
    chrome.tabs.create({ url: 'https://markt.de' });
  }

  // Handle extension update
  async handleUpdate(previousVersion) {
    console.log(`🔄 Extension updated from ${previousVersion}`);
    
    // Perform any necessary data migrations
    await this.migrateData(previousVersion);
  }

  // Migrate data between versions
  async migrateData(fromVersion) {
    try {
      console.log(`🔄 Migrating data from version ${fromVersion}`);
      
      // Add migration logic here as needed for future versions
      // For now, just ensure all required keys exist
      
      const result = await chrome.storage.local.get(['config', 'logs']);
      
      if (!result.config) {
        await this.handleFirstInstall();
      }
      
      if (!result.logs) {
        await chrome.storage.local.set({ logs: [] });
      }
      
      console.log('✅ Data migration completed');
    } catch (error) {
      console.error('❌ Data migration failed:', error);
    }
  }

  // Load campaign state from storage
  async loadCampaignState() {
    try {
      const result = await chrome.storage.local.get(['campaignState']);
      if (result.campaignState) {
        this.campaignState = { ...this.campaignState, ...result.campaignState };
        console.log('✅ Campaign state loaded');
      }
    } catch (error) {
      console.error('❌ Failed to load campaign state:', error);
    }
  }

  // Save campaign state to storage
  async saveCampaignState() {
    try {
      await chrome.storage.local.set({ 
        campaignState: this.campaignState,
        lastUpdated: Date.now()
      });
    } catch (error) {
      console.error('❌ Failed to save campaign state:', error);
    }
  }

  // Add log entry
  async addLog(logEntry) {
    try {
      const result = await chrome.storage.local.get(['logs']);
      const logs = result.logs || [];
      
      logs.push({
        ...logEntry,
        id: Date.now() + Math.random(),
        timestamp: logEntry.timestamp || Date.now()
      });
      
      // Keep only the last 1000 log entries
      const trimmedLogs = logs.slice(-1000);
      
      await chrome.storage.local.set({ logs: trimmedLogs });
    } catch (error) {
      console.error('❌ Failed to add log entry:', error);
    }
  }

  // Get extension status
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      campaignState: this.campaignState,
      contentScriptReady: this.contentScriptReady,
      activeTab: this.activeTab
    };
  }

  // Cleanup
  cleanup() {
    this.isInitialized = false;
    this.contentScriptReady = false;
    this.activeTab = null;
    this.messageHandlers.clear();
    console.log('🧹 Background service cleaned up');
  }
}

// Initialize the background service
const backgroundService = new BackgroundService(); 