/*
 * Automation Engine - Core automation logic for DM campaigns
 * Orchestrates the entire DM sending process with error handling and recovery
 */

// Prevent duplicate class declarations
if (typeof window.AutomationEngine === 'undefined') {

window.AutomationEngine = class AutomationEngine {
  constructor(marktInterface, humanBehavior, storageManager, logger) {
    this.marktInterface = marktInterface;
    this.humanBehavior = humanBehavior;
    this.storageManager = storageManager;
    this.logger = logger;
    
    this.isRunning = false;
    this.isPaused = false;
    this.currentAccount = null;
    this.currentAccountIndex = 0;
    this.accountsToProcess = [];
    
    this.stats = {
      totalAccounts: 0,
      processedAccounts: 0,
      successfulContacts: 0,
      failedContacts: 0,
      skippedAccounts: 0,
      startTime: null,
      endTime: null,
      errors: []
    };

    this.config = {
      maxRetries: 3,
      retryDelay: 5000,
      accountDelay: 5000,
      maxAccountsPerSession: 50,
      messageTemplate: 'Hey ich habe gesehen, dass du einer Freundin von mir auch folgst 🫣 Falls du mich auch ganz süß findestund mich kennenlerenen willst schreib mir doch auf Telegram @',
      timeouts: {
        profileNavigation: 30000,
        dmDialog: 15000,
        messageSend: 15000
      }
    };
  }

  // Initialize the automation engine
  async initialize() {
    try {
      this.logger.info('Initializing automation engine');
      
      // Load configuration from storage
      const savedConfig = await this.storageManager.loadConfig();
      this.config = { ...this.config, ...savedConfig };
      
      // Load campaign state if exists
      const campaignState = await this.storageManager.loadCampaignState();
      if (campaignState.isRunning) {
        this.logger.info('Found existing campaign state - ready to resume');
      }
      
      this.logger.success('Automation engine initialized');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize automation engine', error);
      throw error;
    }
  }

  // Start DM campaign
  async startCampaign(options = {}) {
    if (this.isRunning) {
      throw new Error('Campaign is already running');
    }

    try {
      this.logger.info('Starting DM campaign');
      
      // Update configuration with any provided options
      this.config = { ...this.config, ...options };
      
      // Verify login status
      if (!this.marktInterface.isLoggedIn) {
        throw new Error('Must be logged in to start campaign');
      }

      // Load accounts to process
      await this.loadAccountsToProcess();
      
      if (this.accountsToProcess.length === 0) {
        throw new Error('No accounts to process');
      }

      // Initialize campaign state
      this.isRunning = true;
      this.isPaused = false;
      this.currentAccountIndex = 0;
      this.stats = {
        totalAccounts: this.accountsToProcess.length,
        processedAccounts: 0,
        successfulContacts: 0,
        failedContacts: 0,
        skippedAccounts: 0,
        startTime: new Date().toISOString(),
        endTime: null,
        errors: []
      };

      // Save campaign state
      await this.saveCampaignState();
      
      this.logger.success(`Campaign started with ${this.accountsToProcess.length} accounts`);
      
      // Start processing accounts
      await this.processCampaign();
      
    } catch (error) {
      this.logger.error('Failed to start campaign', error);
      this.isRunning = false;
      throw error;
    }
  }

  // Stop campaign
  async stopCampaign() {
    if (!this.isRunning) {
      this.logger.warning('No campaign is currently running');
      return;
    }

    try {
      this.logger.info('Stopping campaign');
      
      this.isRunning = false;
      this.isPaused = false;
      this.stats.endTime = new Date().toISOString();
      
      // Save final state
      await this.saveCampaignState();
      await this.storageManager.updateStats(this.stats);
      
      this.logger.success('Campaign stopped');
      this.reportFinalStats();
      
    } catch (error) {
      this.logger.error('Error stopping campaign', error);
    }
  }

  // Pause campaign
  async pauseCampaign() {
    if (!this.isRunning) {
      throw new Error('No campaign is currently running');
    }

    this.isPaused = true;
    await this.saveCampaignState();
    this.logger.info('Campaign paused');
  }

  // Resume campaign
  async resumeCampaign() {
    if (!this.isRunning) {
      throw new Error('No campaign to resume');
    }

    this.isPaused = false;
    await this.saveCampaignState();
    this.logger.info('Campaign resumed');
    
    // Continue processing
    await this.processCampaign();
  }

  // Load accounts to process
  async loadAccountsToProcess() {
    try {
      const uncontactedAccounts = await this.storageManager.getUncontactedAccounts(
        this.config.maxAccountsPerSession
      );
      
      this.accountsToProcess = uncontactedAccounts;
      this.logger.info(`Loaded ${this.accountsToProcess.length} accounts to process`);
      
      return this.accountsToProcess;
    } catch (error) {
      this.logger.error('Failed to load accounts to process', error);
      throw error;
    }
  }

  // Main campaign processing loop
  async processCampaign() {
    try {
      while (this.isRunning && this.currentAccountIndex < this.accountsToProcess.length) {
        // Check if paused
        if (this.isPaused) {
          this.logger.info('Campaign is paused, waiting...');
          await this.humanBehavior.sleep(1000);
          continue;
        }

        const account = this.accountsToProcess[this.currentAccountIndex];
        this.currentAccount = account;
        
        this.logger.info(`Processing account ${this.currentAccountIndex + 1}/${this.accountsToProcess.length}: ${account.name}`);
        
        try {
          // Process the account
          await this.processAccount(account);
          
          // Update progress
          this.currentAccountIndex++;
          this.stats.processedAccounts++;
          
          // Save progress
          await this.saveCampaignState();
          await this.storageManager.updateStats(this.stats);
          
          // Report progress
          this.reportProgress();
          
          // Delay between accounts (unless it's the last one)
          if (this.currentAccountIndex < this.accountsToProcess.length) {
            this.logger.info(`Waiting ${this.config.accountDelay}ms before next account`);
            await this.humanBehavior.sleep(this.config.accountDelay);
          }
          
        } catch (error) {
          this.logger.error(`Failed to process account ${account.name}`, error);
          this.stats.failedContacts++;
          this.stats.errors.push({
            account: account.name,
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          // Mark account as failed
          await this.storageManager.markAccountAsContacted(account, 'failed', error.message);
          
          // Continue to next account
          this.currentAccountIndex++;
          this.stats.processedAccounts++;
        }
      }

      // Campaign completed
      if (this.isRunning) {
        await this.completeCampaign();
      }
      
    } catch (error) {
      this.logger.error('Critical error in campaign processing', error);
      this.isRunning = false;
      throw error;
    }
  }

  // Process a single account
  async processAccount(account) {
    this.logger.dm(`Starting DM process for ${account.name} (${account.userId})`);
    
    let retryCount = 0;
    const maxRetries = this.config.maxRetries;
    
    while (retryCount <= maxRetries) {
      try {
        // Navigate to profile
        await this.navigateToProfile(account);
        
        // Send DM
        await this.sendDMToAccount(account);
        
        // Mark as successful
        await this.storageManager.markAccountAsContacted(account, 'contacted');
        this.stats.successfulContacts++;
        
        this.logger.success(`Successfully sent DM to ${account.name}`);
        return true;
        
      } catch (error) {
        retryCount++;
        this.logger.warning(`Attempt ${retryCount}/${maxRetries + 1} failed for ${account.name}: ${error.message}`);
        
        if (retryCount <= maxRetries) {
          // Wait before retry with exponential backoff
          const retryDelay = this.config.retryDelay * Math.pow(2, retryCount - 1);
          this.logger.info(`Retrying in ${retryDelay}ms...`);
          await this.humanBehavior.sleep(retryDelay);
        } else {
          // Max retries reached
          throw error;
        }
      }
    }
  }

  // Navigate to account profile
  async navigateToProfile(account) {
    try {
      this.logger.info(`Navigating to profile: ${account.link}`);
      
      // Navigate to the profile page
      await this.marktInterface.navigateToProfile(account.link);
      
      // Wait for page to load and settle
      await this.humanBehavior.sleep(2000);
      
      // Verify we're on the correct profile page
      if (!this.marktInterface.isOnProfilePage()) {
        throw new Error('Failed to navigate to profile page');
      }
      
      // Check if DM functionality is available
      if (!this.marktInterface.isDMAvailable()) {
        throw new Error('DM functionality not available on this profile');
      }
      
      this.logger.success('Successfully navigated to profile');
      return true;
      
    } catch (error) {
      this.logger.error('Failed to navigate to profile', error);
      throw error;
    }
  }

  // Send DM to account
  async sendDMToAccount(account) {
    try {
      this.logger.dm(`Sending DM to ${account.name}`);
      
      // Open DM dialog
      await this.marktInterface.openDMDialog();
      
      // Wait for dialog to be ready
      await this.humanBehavior.sleep(1000);
      
      // Send the message
      await this.marktInterface.sendMessage(this.config.messageTemplate);
      
      // Wait for confirmation
      await this.humanBehavior.sleep(2000);
      
      // Close dialog if still open
      await this.marktInterface.closeDMDialog();
      
      this.logger.success(`DM sent successfully to ${account.name}`);
      return true;
      
    } catch (error) {
      this.logger.error('Failed to send DM', error);
      
      // Try to close dialog in case of error
      try {
        await this.marktInterface.closeDMDialog();
      } catch (closeError) {
        // Ignore close errors
      }
      
      throw error;
    }
  }

  // Complete campaign
  async completeCampaign() {
    try {
      this.logger.info('Completing campaign');
      
      this.isRunning = false;
      this.isPaused = false;
      this.stats.endTime = new Date().toISOString();
      
      // Calculate final statistics
      this.calculateFinalStats();
      
      // Save final state
      await this.saveCampaignState();
      await this.storageManager.updateStats(this.stats);
      
      this.logger.success('Campaign completed successfully');
      this.reportFinalStats();
      
    } catch (error) {
      this.logger.error('Error completing campaign', error);
    }
  }

  // Calculate final statistics
  calculateFinalStats() {
    if (this.stats.processedAccounts > 0) {
      this.stats.successRate = Math.round(
        (this.stats.successfulContacts / this.stats.processedAccounts) * 100
      );
    }

    if (this.stats.startTime) {
      const startTime = new Date(this.stats.startTime).getTime();
      const endTime = this.stats.endTime ? new Date(this.stats.endTime).getTime() : Date.now();
      const totalTime = endTime - startTime;
      
      if (this.stats.processedAccounts > 0) {
        this.stats.averageTimePerAccount = Math.round(totalTime / this.stats.processedAccounts);
      }
    }
  }

  // Save campaign state
  async saveCampaignState() {
    try {
      const state = {
        isRunning: this.isRunning,
        isPaused: this.isPaused,
        currentAccountIndex: this.currentAccountIndex,
        totalAccounts: this.accountsToProcess.length,
        startTime: this.stats.startTime,
        stats: this.stats
      };
      
      await this.storageManager.saveCampaignState(state);
    } catch (error) {
      this.logger.error('Failed to save campaign state', error);
    }
  }

  // Report progress
  reportProgress() {
    const progress = {
      current: this.currentAccountIndex,
      total: this.accountsToProcess.length,
      processed: this.stats.processedAccounts,
      successful: this.stats.successfulContacts,
      failed: this.stats.failedContacts,
      percentage: Math.round((this.currentAccountIndex / this.accountsToProcess.length) * 100)
    };
    
    this.logger.info(`Progress: ${progress.current}/${progress.total} (${progress.percentage}%) - Success: ${progress.successful}, Failed: ${progress.failed}`);
    
    // Notify listeners (for UI updates)
    this.notifyProgressListeners(progress);
  }

  // Report final statistics
  reportFinalStats() {
    this.logger.info('=== CAMPAIGN STATISTICS ===');
    this.logger.info(`Total Accounts: ${this.stats.totalAccounts}`);
    this.logger.info(`Processed: ${this.stats.processedAccounts}`);
    this.logger.info(`Successful: ${this.stats.successfulContacts}`);
    this.logger.info(`Failed: ${this.stats.failedContacts}`);
    this.logger.info(`Success Rate: ${this.stats.successRate || 0}%`);
    
    if (this.stats.averageTimePerAccount) {
      const avgTimeSeconds = Math.round(this.stats.averageTimePerAccount / 1000);
      this.logger.info(`Average Time per Account: ${avgTimeSeconds}s`);
    }
    
    if (this.stats.errors.length > 0) {
      this.logger.warning(`Errors encountered: ${this.stats.errors.length}`);
    }
  }

  // Handle errors with retry logic
  async handleError(error, account, operation) {
    this.logger.error(`Error in ${operation} for ${account.name}`, error);
    
    // Check if it's a recoverable error
    if (this.isRecoverableError(error)) {
      this.logger.info('Error appears recoverable, will retry');
      return true;
    }
    
    // Check if we need to re-authenticate
    if (this.isAuthenticationError(error)) {
      this.logger.warning('Authentication error detected, session may have expired');
      
      // Validate session
      const sessionValid = await this.marktInterface.validateSession();
      if (!sessionValid) {
        throw new Error('Session expired - please log in again');
      }
    }
    
    return false;
  }

  // Check if error is recoverable
  isRecoverableError(error) {
    const recoverableErrors = [
      'timeout',
      'network',
      'element not found',
      'page load',
      'navigation'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return recoverableErrors.some(recoverable => 
      errorMessage.includes(recoverable)
    );
  }

  // Check if error is authentication related
  isAuthenticationError(error) {
    const authErrors = [
      'login',
      'authentication',
      'session',
      'unauthorized',
      'forbidden'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return authErrors.some(authError => 
      errorMessage.includes(authError)
    );
  }

  // Get current campaign status
  getCampaignStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentAccount: this.currentAccount,
      currentAccountIndex: this.currentAccountIndex,
      totalAccounts: this.accountsToProcess.length,
      stats: this.stats,
      progress: this.currentAccountIndex > 0 ? 
        Math.round((this.currentAccountIndex / this.accountsToProcess.length) * 100) : 0
    };
  }

  // Update configuration
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Configuration updated');
  }

  // Get configuration
  getConfig() {
    return { ...this.config };
  }

  // Progress listeners for UI updates
  progressListeners = [];

  addProgressListener(callback) {
    this.progressListeners.push(callback);
  }

  removeProgressListener(callback) {
    const index = this.progressListeners.indexOf(callback);
    if (index > -1) {
      this.progressListeners.splice(index, 1);
    }
  }

  notifyProgressListeners(progress) {
    for (const listener of this.progressListeners) {
      try {
        listener(progress);
      } catch (error) {
        this.logger.error('Error in progress listener', error);
      }
    }
  }

  // Cleanup
  cleanup() {
    this.isRunning = false;
    this.isPaused = false;
    this.currentAccount = null;
    this.accountsToProcess = [];
    this.progressListeners = [];
    this.logger.info('Automation engine cleaned up');
  }
}; // End of class definition

} // End of duplicate prevention check

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.AutomationEngine;
}

} // End of duplicate prevention check