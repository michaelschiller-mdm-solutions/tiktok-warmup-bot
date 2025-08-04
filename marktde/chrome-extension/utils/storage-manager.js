/*
 * Storage Manager - Chrome Extension Storage API Wrapper
 * Handles all data persistence for the Markt.de DM Bot extension
 */

// Prevent duplicate class declarations
if (typeof window.StorageManager === 'undefined') {

window.StorageManager = class StorageManager {
  constructor() {
    this.storageKeys = {
      TARGET_ACCOUNTS: 'targetAccounts',
      CONTACTED_ACCOUNTS: 'contactedAccounts',
      CREDENTIALS: 'credentials',
      CONFIG: 'config',
      SESSION_DATA: 'sessionData',
      STATISTICS: 'statistics',
      LOGS: 'logs',
      CAMPAIGN_STATE: 'campaignState'
    };

    this.defaultConfig = {
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

    this.defaultStats = {
      totalAccounts: 0,
      processedAccounts: 0,
      successfulContacts: 0,
      failedContacts: 0,
      skippedAccounts: 0,
      startTime: null,
      endTime: null,
      successRate: 0,
      averageTimePerAccount: 0
    };
  }

  // Check if chrome extension context is valid
  isContextValid() {
    try {
      return typeof chrome !== 'undefined' && 
             chrome.storage && 
             chrome.storage.local && 
             !chrome.runtime.lastError;
    } catch (error) {
      return false;
    }
  }

  // Generic storage operations with context validation
  async set(key, value) {
    if (!this.isContextValid()) {
      console.warn(`Storage context invalid, cannot set ${key}`);
      return false;
    }

    try {
      await chrome.storage.local.set({ [key]: value });
      return true;
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn(`Extension context invalidated while setting ${key}`);
        return false;
      }
      console.error(`Storage set error for key ${key}:`, error);
      return false;
    }
  }

  async get(key, defaultValue = null) {
    if (!this.isContextValid()) {
      console.warn(`Storage context invalid, returning default for ${key}`);
      return defaultValue;
    }

    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      if (error.message.includes('Extension context invalidated')) {
        console.warn(`Extension context invalidated while getting ${key}`);
        return defaultValue;
      }
      console.error(`Storage get error for key ${key}:`, error);
      return defaultValue;
    }
  }

  async remove(key) {
    try {
      await chrome.storage.local.remove([key]);
      return true;
    } catch (error) {
      console.error(`Storage remove error for key ${key}:`, error);
      return false;
    }
  }

  async clear() {
    try {
      await chrome.storage.local.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  // Account data management
  async saveTargetAccounts(accounts) {
    if (!Array.isArray(accounts)) {
      throw new Error('Target accounts must be an array');
    }

    const validatedAccounts = accounts.map(account => ({
      name: account.name || '',
      userId: account.userId || '',
      link: account.link || '',
      status: account.status || 'pending',
      contactedAt: account.contactedAt || null,
      error: account.error || null,
      retryCount: account.retryCount || 0
    }));

    return await this.set(this.storageKeys.TARGET_ACCOUNTS, validatedAccounts);
  }

  async loadTargetAccounts() {
    return await this.get(this.storageKeys.TARGET_ACCOUNTS, []);
  }

  async saveContactedAccounts(accounts) {
    if (!Array.isArray(accounts)) {
      throw new Error('Contacted accounts must be an array');
    }
    return await this.set(this.storageKeys.CONTACTED_ACCOUNTS, accounts);
  }

  async loadContactedAccounts() {
    return await this.get(this.storageKeys.CONTACTED_ACCOUNTS, []);
  }

  async markAccountAsContacted(account, status, error = null) {
    try {
      const contactedAccounts = await this.loadContactedAccounts();
      const targetAccounts = await this.loadTargetAccounts();

      // Create contacted account entry
      const contactedEntry = {
        name: account.name,
        userId: account.userId,
        link: account.link,
        contactedAt: new Date().toISOString(),
        status: status,
        error: error,
        retryCount: account.retryCount || 0
      };

      // Add to contacted accounts
      contactedAccounts.push(contactedEntry);
      await this.saveContactedAccounts(contactedAccounts);

      // Update target account status
      const updatedTargetAccounts = targetAccounts.map(targetAccount => {
        if (targetAccount.userId === account.userId) {
          return {
            ...targetAccount,
            status: status,
            contactedAt: contactedEntry.contactedAt,
            error: error
          };
        }
        return targetAccount;
      });

      await this.saveTargetAccounts(updatedTargetAccounts);
      return true;
    } catch (error) {
      console.error('Error marking account as contacted:', error);
      return false;
    }
  }

  async getUncontactedAccounts(limit = null) {
    try {
      const targetAccounts = await this.loadTargetAccounts();
      const uncontacted = targetAccounts.filter(account => 
        account.status === 'pending' || account.status === 'failed'
      );

      if (limit && limit > 0) {
        return uncontacted.slice(0, limit);
      }
      
      return uncontacted;
    } catch (error) {
      console.error('Error getting uncontacted accounts:', error);
      return [];
    }
  }

  // Configuration management
  async saveConfig(config) {
    const mergedConfig = { ...this.defaultConfig, ...config };
    return await this.set(this.storageKeys.CONFIG, mergedConfig);
  }

  async loadConfig() {
    const config = await this.get(this.storageKeys.CONFIG, this.defaultConfig);
    return { ...this.defaultConfig, ...config };
  }

  async updateConfigField(field, value) {
    try {
      const config = await this.loadConfig();
      config[field] = value;
      return await this.saveConfig(config);
    } catch (error) {
      console.error(`Error updating config field ${field}:`, error);
      return false;
    }
  }

  // Credentials management (encrypted storage)
  async saveCredentials(email, password) {
    try {
      // Simple encoding (not true encryption, but better than plain text)
      const encoded = {
        email: btoa(email),
        password: btoa(password),
        timestamp: Date.now()
      };
      return await this.set(this.storageKeys.CREDENTIALS, encoded);
    } catch (error) {
      console.error('Error saving credentials:', error);
      return false;
    }
  }

  async loadCredentials() {
    try {
      const encoded = await this.get(this.storageKeys.CREDENTIALS, null);
      if (!encoded) return null;

      return {
        email: atob(encoded.email),
        password: atob(encoded.password),
        timestamp: encoded.timestamp
      };
    } catch (error) {
      console.error('Error loading credentials:', error);
      return null;
    }
  }

  async clearCredentials() {
    return await this.remove(this.storageKeys.CREDENTIALS);
  }

  // Session management
  async saveSessionData(data) {
    const sessionData = {
      ...data,
      timestamp: Date.now()
    };
    return await this.set(this.storageKeys.SESSION_DATA, sessionData);
  }

  async loadSessionData() {
    return await this.get(this.storageKeys.SESSION_DATA, null);
  }

  async clearSessionData() {
    return await this.remove(this.storageKeys.SESSION_DATA);
  }

  async isSessionValid() {
    try {
      const sessionData = await this.loadSessionData();
      if (!sessionData) return false;

      // Check if session is less than 24 hours old
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const age = Date.now() - sessionData.timestamp;
      
      return age < maxAge;
    } catch (error) {
      console.error('Error checking session validity:', error);
      return false;
    }
  }

  // Statistics management
  async saveStats(stats) {
    const mergedStats = { ...this.defaultStats, ...stats };
    return await this.set(this.storageKeys.STATISTICS, mergedStats);
  }

  async loadStats() {
    const stats = await this.get(this.storageKeys.STATISTICS, this.defaultStats);
    return { ...this.defaultStats, ...stats };
  }

  async updateStats(newStats) {
    try {
      const currentStats = await this.loadStats();
      const updatedStats = { ...currentStats, ...newStats };
      
      // Calculate success rate
      if (updatedStats.processedAccounts > 0) {
        updatedStats.successRate = Math.round(
          (updatedStats.successfulContacts / updatedStats.processedAccounts) * 100
        );
      }

      // Calculate average time per account
      if (updatedStats.startTime && updatedStats.processedAccounts > 0) {
        const elapsed = Date.now() - new Date(updatedStats.startTime).getTime();
        updatedStats.averageTimePerAccount = Math.round(elapsed / updatedStats.processedAccounts);
      }

      return await this.saveStats(updatedStats);
    } catch (error) {
      console.error('Error updating stats:', error);
      return false;
    }
  }

  async resetStats() {
    return await this.saveStats(this.defaultStats);
  }

  // Campaign state management
  async saveCampaignState(state) {
    const campaignState = {
      ...state,
      timestamp: Date.now()
    };
    return await this.set(this.storageKeys.CAMPAIGN_STATE, campaignState);
  }

  async loadCampaignState() {
    return await this.get(this.storageKeys.CAMPAIGN_STATE, {
      isRunning: false,
      isPaused: false,
      currentAccountIndex: 0,
      totalAccounts: 0,
      startTime: null
    });
  }

  async clearCampaignState() {
    return await this.remove(this.storageKeys.CAMPAIGN_STATE);
  }

  // Logs management
  async saveLogs(logs) {
    if (!Array.isArray(logs)) {
      throw new Error('Logs must be an array');
    }
    
    // Keep only the last 1000 log entries to prevent storage bloat
    const trimmedLogs = logs.slice(-1000);
    return await this.set(this.storageKeys.LOGS, trimmedLogs);
  }

  async loadLogs() {
    return await this.get(this.storageKeys.LOGS, []);
  }

  async addLog(logEntry) {
    try {
      const logs = await this.loadLogs();
      logs.push({
        ...logEntry,
        timestamp: Date.now(),
        id: Date.now() + Math.random()
      });
      
      return await this.saveLogs(logs);
    } catch (error) {
      console.error('Error adding log entry:', error);
      return false;
    }
  }

  async clearLogs() {
    return await this.saveLogs([]);
  }

  async exportLogs() {
    try {
      const logs = await this.loadLogs();
      const exportData = {
        exportDate: new Date().toISOString(),
        totalLogs: logs.length,
        logs: logs
      };
      
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting logs:', error);
      return null;
    }
  }

  // Utility methods
  async getStorageUsage() {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      return {
        used: usage,
        quota: chrome.storage.local.QUOTA_BYTES,
        percentage: Math.round((usage / chrome.storage.local.QUOTA_BYTES) * 100)
      };
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return null;
    }
  }

  async validateStorage() {
    try {
      // Test basic storage operations
      const testKey = 'storage_test';
      const testValue = { test: true, timestamp: Date.now() };
      
      await this.set(testKey, testValue);
      const retrieved = await this.get(testKey);
      await this.remove(testKey);
      
      return retrieved && retrieved.test === true;
    } catch (error) {
      console.error('Storage validation failed:', error);
      return false;
    }
  }

  // Data migration and cleanup
  async migrateData(fromVersion, toVersion) {
    try {
      console.log(`Migrating data from version ${fromVersion} to ${toVersion}`);
      
      // Add migration logic here as needed for future versions
      // For now, just ensure all required keys exist with defaults
      
      const config = await this.loadConfig();
      await this.saveConfig(config);
      
      const stats = await this.loadStats();
      await this.saveStats(stats);
      
      return true;
    } catch (error) {
      console.error('Data migration failed:', error);
      return false;
    }
  }

  async cleanup() {
    try {
      // Remove old session data
      const sessionData = await this.loadSessionData();
      if (sessionData) {
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        const age = Date.now() - sessionData.timestamp;
        
        if (age > maxAge) {
          await this.clearSessionData();
        }
      }

      // Trim logs to prevent storage bloat
      const logs = await this.loadLogs();
      if (logs.length > 1000) {
        await this.saveLogs(logs.slice(-1000));
      }

      // Clean up old contacted accounts (keep last 30 days)
      const contactedAccounts = await this.loadContactedAccounts();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      
      const recentContacted = contactedAccounts.filter(account => {
        const contactedTime = new Date(account.contactedAt).getTime();
        return contactedTime > thirtyDaysAgo;
      });

      if (recentContacted.length !== contactedAccounts.length) {
        await this.saveContactedAccounts(recentContacted);
      }

      return true;
    } catch (error) {
      console.error('Storage cleanup failed:', error);
      return false;
    }
  }
}; // End of class definition

} // End of duplicate prevention check

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.StorageManager;
}

} // End of duplicate prevention check