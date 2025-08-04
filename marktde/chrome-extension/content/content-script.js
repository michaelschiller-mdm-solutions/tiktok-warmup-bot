/*
 * Content Script - Main entry point for markt.de Chrome extension
 * Coordinates all content script modules and handles communication with background script
 * 
 * Created: Complete content script integration and message coordination
 */

// Prevent duplicate class declarations
if (typeof window.MarktDMContentScript === 'undefined') {

class MarktDMContentScript {
  constructor() {
    this.isInitialized = false;
    this.isReady = false;
    
    // Initialize core modules
    this.logger = new Logger('ContentScript');
    this.storageManager = new StorageManager();
    this.humanBehavior = new HumanBehavior();
    this.marktInterface = new MarktInterface(this.humanBehavior, this.logger);
    this.automationEngine = new AutomationEngine(
      this.marktInterface, 
      this.humanBehavior, 
      this.storageManager, 
      this.logger
    );
    
    this.messageHandlers = new Map();
    this.setupMessageHandlers();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  // Initialize the content script
  async initialize() {
    try {
      this.logger.info('🚀 Initializing Markt.de DM Bot content script');
      
      // Check if extension context is valid
      if (!this.isContextValid()) {
        console.warn('Extension context is invalid, skipping initialization');
        return;
      }
      
      // Check if we're on markt.de
      if (!window.location.hostname.includes('markt.de')) {
        this.logger.warning('Not on markt.de domain, content script will not activate');
        return;
      }
      
      // Initialize modules in order
      await this.initializeModules();
      
      // Set up message listener
      this.setupMessageListener();
      
      // Notify background script that we're ready
      await this.notifyBackgroundReady();
      
      this.isInitialized = true;
      this.isReady = true;
      
      this.logger.success('✅ Content script initialized and ready');
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize content script', error);
      throw error;
    }
  }

  // Initialize all modules
  async initializeModules() {
    try {
      this.logger.info('Initializing modules...');
      
      // Initialize storage manager
      const storageValid = await this.storageManager.validateStorage();
      if (!storageValid) {
        throw new Error('Storage validation failed');
      }
      
      // Initialize markt.de interface
      await this.marktInterface.initialize();
      
      // Initialize automation engine
      await this.automationEngine.initialize();
      
      this.logger.success('All modules initialized successfully');
      
    } catch (error) {
      this.logger.error('Failed to initialize modules', error);
      throw error;
    }
  }

  // Set up message handlers
  setupMessageHandlers() {
    // Campaign management
    this.messageHandlers.set('start_campaign', this.handleStartCampaign.bind(this));
    this.messageHandlers.set('stop_campaign', this.handleStopCampaign.bind(this));
    this.messageHandlers.set('pause_campaign', this.handlePauseCampaign.bind(this));
    this.messageHandlers.set('resume_campaign', this.handleResumeCampaign.bind(this));
    this.messageHandlers.set('get_campaign_status', this.handleGetCampaignStatus.bind(this));
    
    // Authentication
    this.messageHandlers.set('login', this.handleLogin.bind(this));
    this.messageHandlers.set('check_login_status', this.handleCheckLoginStatus.bind(this));
    this.messageHandlers.set('logout', this.handleLogout.bind(this));
    
    // Configuration
    this.messageHandlers.set('update_config', this.handleUpdateConfig.bind(this));
    this.messageHandlers.set('get_config', this.handleGetConfig.bind(this));
    
    // Account management
    this.messageHandlers.set('load_accounts', this.handleLoadAccounts.bind(this));
    this.messageHandlers.set('get_account_stats', this.handleGetAccountStats.bind(this));
    
    // Utility
    this.messageHandlers.set('ping', this.handlePing.bind(this));
    this.messageHandlers.set('get_status', this.handleGetStatus.bind(this));
    this.messageHandlers.set('cleanup', this.handleCleanup.bind(this));
  }

  // Set up message listener with context validation
  setupMessageListener() {
    if (!this.isContextValid()) {
      console.warn('Cannot set up message listener - extension context invalid');
      return;
    }

    try {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async responses
      });
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated while setting up message listener');
        return;
      }
      console.error('Error setting up message listener:', error);
    }
  }

  // Handle incoming messages
  async handleMessage(message, sender, sendResponse) {
    try {
      const { type, data } = message;
      
      this.logger.debug(`📨 Received message: ${type}`, data);
      
      if (!this.isReady && type !== 'ping') {
        sendResponse({ 
          success: false, 
          error: 'Content script not ready yet' 
        });
        return;
      }
      
      const handler = this.messageHandlers.get(type);
      if (handler) {
        const response = await handler(data);
        sendResponse({ success: true, data: response });
      } else {
        this.logger.warning(`Unknown message type: ${type}`);
        sendResponse({ 
          success: false, 
          error: `Unknown message type: ${type}` 
        });
      }
      
    } catch (error) {
      this.logger.error(`Error handling message ${message.type}`, error);
      sendResponse({ 
        success: false, 
        error: error.message 
      });
    }
  }

  // Message handlers
  async handleStartCampaign(data) {
    this.logger.info('🚀 Starting DM campaign');
    
    try {
      // Verify login status
      if (!this.marktInterface.isLoggedIn) {
        const loginValid = await this.marktInterface.checkLoginStatus();
        if (!loginValid) {
          throw new Error('Must be logged in to start campaign');
        }
      }
      
      // Update configuration if provided
      if (data && Object.keys(data).length > 0) {
        this.automationEngine.updateConfig(data);
      }
      
      // Start the campaign
      await this.automationEngine.startCampaign(data);
      
      // Set up progress reporting
      this.setupProgressReporting();
      
      this.logger.success('Campaign started successfully');
      return { success: true };
      
    } catch (error) {
      this.logger.error('Failed to start campaign', error);
      throw error;
    }
  }

  async handleStopCampaign(data) {
    this.logger.info('🛑 Stopping DM campaign');
    
    try {
      await this.automationEngine.stopCampaign();
      this.cleanupProgressReporting();
      
      this.logger.success('Campaign stopped successfully');
      return { success: true };
      
    } catch (error) {
      this.logger.error('Failed to stop campaign', error);
      throw error;
    }
  }

  async handlePauseCampaign(data) {
    this.logger.info('⏸️ Pausing DM campaign');
    
    try {
      await this.automationEngine.pauseCampaign();
      
      this.logger.success('Campaign paused successfully');
      return { success: true };
      
    } catch (error) {
      this.logger.error('Failed to pause campaign', error);
      throw error;
    }
  }

  async handleResumeCampaign(data) {
    this.logger.info('▶️ Resuming DM campaign');
    
    try {
      await this.automationEngine.resumeCampaign();
      
      this.logger.success('Campaign resumed successfully');
      return { success: true };
      
    } catch (error) {
      this.logger.error('Failed to resume campaign', error);
      throw error;
    }
  }

  async handleGetCampaignStatus(data) {
    try {
      const status = this.automationEngine.getCampaignStatus();
      return status;
    } catch (error) {
      this.logger.error('Failed to get campaign status', error);
      throw error;
    }
  }

  async handleLogin(data) {
    this.logger.login('🔐 Attempting login');
    
    try {
      const { email, password } = data;
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Perform login
      await this.marktInterface.login(email, password);
      
      // Save credentials securely
      await this.storageManager.saveCredentials(email, password);
      
      // Get session cookies
      const sessionCookies = await this.marktInterface.getSessionCookies();
      await this.storageManager.saveSessionData({
        isLoggedIn: true,
        sessionCookies,
        loginTime: new Date().toISOString()
      });
      
      // Notify background script
      await this.sendMessageToBackground('content_login_status', {
        success: true,
        message: 'Login successful'
      });
      
      this.logger.success('Login successful');
      return { 
        success: true, 
        sessionCookies: Object.keys(sessionCookies).length 
      };
      
    } catch (error) {
      this.logger.error('Login failed', error);
      
      // Notify background script
      await this.sendMessageToBackground('content_login_status', {
        success: false,
        message: error.message
      });
      
      throw error;
    }
  }

  async handleCheckLoginStatus(data) {
    try {
      const isLoggedIn = await this.marktInterface.checkLoginStatus();
      const sessionData = await this.storageManager.loadSessionData();
      
      return {
        isLoggedIn,
        sessionValid: await this.storageManager.isSessionValid(),
        sessionData: sessionData ? {
          loginTime: sessionData.loginTime,
          cookieCount: sessionData.sessionCookies ? Object.keys(sessionData.sessionCookies).length : 0
        } : null
      };
    } catch (error) {
      this.logger.error('Failed to check login status', error);
      throw error;
    }
  }

  async handleLogout(data) {
    this.logger.login('🚪 Logging out');
    
    try {
      // Clear session data
      await this.storageManager.clearSessionData();
      await this.storageManager.clearCredentials();
      
      // Update interface state
      this.marktInterface.cleanup();
      
      this.logger.success('Logout successful');
      return { success: true };
      
    } catch (error) {
      this.logger.error('Logout failed', error);
      throw error;
    }
  }

  async handleUpdateConfig(data) {
    try {
      // Update automation engine config
      this.automationEngine.updateConfig(data);
      
      // Save to storage
      await this.storageManager.saveConfig(data);
      
      this.logger.success('Configuration updated');
      return { success: true };
      
    } catch (error) {
      this.logger.error('Failed to update configuration', error);
      throw error;
    }
  }

  async handleGetConfig(data) {
    try {
      const config = this.automationEngine.getConfig();
      return config;
    } catch (error) {
      this.logger.error('Failed to get configuration', error);
      throw error;
    }
  }

  async handleLoadAccounts(data) {
    try {
      const { accounts } = data;
      
      if (!Array.isArray(accounts)) {
        throw new Error('Accounts must be an array');
      }
      
      // Save accounts to storage
      await this.storageManager.saveTargetAccounts(accounts);
      
      this.logger.success(`Loaded ${accounts.length} target accounts`);
      return { 
        success: true, 
        accountCount: accounts.length 
      };
      
    } catch (error) {
      this.logger.error('Failed to load accounts', error);
      throw error;
    }
  }

  async handleGetAccountStats(data) {
    try {
      const targetAccounts = await this.storageManager.loadTargetAccounts();
      const contactedAccounts = await this.storageManager.loadContactedAccounts();
      const uncontactedAccounts = await this.storageManager.getUncontactedAccounts();
      
      const stats = {
        total: targetAccounts.length,
        contacted: contactedAccounts.length,
        uncontacted: uncontactedAccounts.length,
        pending: targetAccounts.filter(a => a.status === 'pending').length,
        failed: targetAccounts.filter(a => a.status === 'failed').length,
        successful: targetAccounts.filter(a => a.status === 'contacted').length
      };
      
      return stats;
    } catch (error) {
      this.logger.error('Failed to get account stats', error);
      throw error;
    }
  }

  async handlePing(data) {
    return { 
      pong: true, 
      timestamp: Date.now(),
      ready: this.isReady,
      url: window.location.href
    };
  }

  async handleGetStatus(data) {
    try {
      const status = {
        isInitialized: this.isInitialized,
        isReady: this.isReady,
        url: window.location.href,
        pageType: this.marktInterface.getCurrentPageType(),
        isLoggedIn: this.marktInterface.isLoggedIn,
        campaignStatus: this.automationEngine.getCampaignStatus(),
        interfaceStatus: this.marktInterface.getStatus()
      };
      
      return status;
    } catch (error) {
      this.logger.error('Failed to get status', error);
      throw error;
    }
  }

  async handleCleanup(data) {
    try {
      this.cleanup();
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to cleanup', error);
      throw error;
    }
  }

  // Set up progress reporting to background script
  setupProgressReporting() {
    // Add progress listener to automation engine
    this.automationEngine.addProgressListener((progress) => {
      this.sendMessageToBackground('content_progress_update', progress);
    });
    
    this.logger.info('Progress reporting enabled');
  }

  // Clean up progress reporting
  cleanupProgressReporting() {
    // Remove all progress listeners
    this.automationEngine.progressListeners = [];
    this.logger.info('Progress reporting disabled');
  }

  // Check if chrome extension context is valid
  isContextValid() {
    try {
      return typeof chrome !== 'undefined' && 
             chrome.runtime && 
             chrome.runtime.sendMessage &&
             !chrome.runtime.lastError;
    } catch (error) {
      return false;
    }
  }

  // Send message to background script with context validation
  async sendMessageToBackground(type, data = {}) {
    if (!this.isContextValid()) {
      console.warn(`Extension context invalid, cannot send message: ${type}`);
      return { success: false, error: 'Extension context invalidated' };
    }

    try {
      const response = await chrome.runtime.sendMessage({ type, data });
      
      if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
      }
      
      return response;
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn(`Extension context invalidated while sending message: ${type}`);
        return { success: false, error: 'Extension context invalidated' };
      }
      
      this.logger.error(`Failed to send message to background: ${type}`, error);
      throw error;
    }
  }

  // Notify background script that content script is ready
  async notifyBackgroundReady() {
    if (!this.isContextValid()) {
      console.warn('Cannot notify background script - extension context invalid');
      return;
    }

    try {
      const response = await this.sendMessageToBackground('content_ready', {
        url: window.location.href,
        timestamp: Date.now()
      });
      
      if (response && response.success) {
        this.logger.success('Notified background script that content script is ready');
      } else {
        this.logger.warning('Background script notification may have failed');
      }
    } catch (error) {
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.warn('Extension context invalidated while notifying background script');
        return;
      }
      this.logger.error('Failed to notify background script', error);
    }
  }

  // Handle page navigation
  handlePageNavigation() {
    // Listen for navigation events
    let lastUrl = window.location.href;
    
    const checkForNavigation = () => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastUrl) {
        this.logger.info(`Page navigation detected: ${lastUrl} -> ${currentUrl}`);
        lastUrl = currentUrl;
        
        // Re-initialize interface if needed
        if (currentUrl.includes('markt.de')) {
          this.marktInterface.initialize().catch(error => {
            this.logger.error('Failed to re-initialize interface after navigation', error);
          });
        }
      }
    };
    
    // Check for navigation every second
    setInterval(checkForNavigation, 1000);
    
    // Also listen for popstate events
    window.addEventListener('popstate', checkForNavigation);
  }

  // Handle errors and report to background
  handleError(error, context = 'general') {
    this.logger.error(`Content script error in ${context}`, error);
    
    // Report to background script
    this.sendMessageToBackground('content_error', {
      message: error.message,
      context,
      stack: error.stack,
      timestamp: Date.now(),
      url: window.location.href
    }).catch(bgError => {
      console.error('Failed to report error to background script:', bgError);
    });
  }

  // Get extension status for debugging
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      isReady: this.isReady,
      url: window.location.href,
      modules: {
        logger: !!this.logger,
        storageManager: !!this.storageManager,
        humanBehavior: !!this.humanBehavior,
        marktInterface: !!this.marktInterface,
        automationEngine: !!this.automationEngine
      },
      marktInterface: this.marktInterface ? this.marktInterface.getStatus() : null,
      campaignStatus: this.automationEngine ? this.automationEngine.getCampaignStatus() : null
    };
  }

  // Cleanup
  cleanup() {
    try {
      this.logger.info('🧹 Cleaning up content script');
      
      // Stop any running campaigns
      if (this.automationEngine && this.automationEngine.isRunning) {
        this.automationEngine.stopCampaign().catch(error => {
          this.logger.error('Error stopping campaign during cleanup', error);
        });
      }
      
      // Cleanup modules
      if (this.automationEngine) {
        this.automationEngine.cleanup();
      }
      
      if (this.marktInterface) {
        this.marktInterface.cleanup();
      }
      
      // Clear progress reporting
      this.cleanupProgressReporting();
      
      // Clear message handlers
      this.messageHandlers.clear();
      
      this.isInitialized = false;
      this.isReady = false;
      
      this.logger.success('Content script cleanup completed');
      
    } catch (error) {
      console.error('Error during content script cleanup:', error);
    }
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  if (window.marktDMContentScript) {
    window.marktDMContentScript.handleError(event.error, 'global');
  }
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  if (window.marktDMContentScript) {
    window.marktDMContentScript.handleError(event.reason, 'promise');
  }
});

// Initialize content script
try {
  window.marktDMContentScript = new MarktDMContentScript();
  
  // Expose for debugging
  if (typeof window !== 'undefined') {
    window.getMarktDMDebugInfo = () => {
      return window.marktDMContentScript ? window.marktDMContentScript.getDebugInfo() : null;
    };
  }
  
} catch (error) {
  console.error('❌ Failed to initialize Markt.de DM Bot content script:', error);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (window.marktDMContentScript) {
    window.marktDMContentScript.cleanup();
  }
});

} // End of duplicate prevention check