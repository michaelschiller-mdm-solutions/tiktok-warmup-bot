/*
 * Popup Controller - Manages the Chrome extension popup interface
 * Handles user interactions, displays campaign status, and communicates with background script
 * 
 * Created: Complete popup interface and user controls for markt.de DM bot
 */

class PopupController {
  constructor() {
    this.isInitialized = false;
    this.campaignState = {
      isRunning: false,
      isPaused: false,
      stats: {
        totalAccounts: 0,
        processedAccounts: 0,
        successfulContacts: 0,
        failedContacts: 0
      }
    };
    
    this.config = {
      maxAccountsPerSession: 50,
      delayBetweenAccounts: 5000,
      messageTemplate: 'Hey ich habe gesehen, dass du einer Freundin von mir auch folgst 🫣 Falls du mich auch ganz süß findestund mich kennenlerenen willst schreib mir doch auf Telegram @'
    };
    
    this.elements = {};
    this.updateInterval = null;
    this.logs = [];
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      this.initialize();
    }
  }

  // Initialize the popup controller
  async initialize() {
    try {
      console.log('🚀 Initializing popup controller');
      
      // Get DOM elements
      this.getElements();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadInitialData();
      
      // Update UI
      await this.updateUI();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      this.isInitialized = true;
      console.log('✅ Popup controller initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize popup controller:', error);
      this.showError('Failed to initialize extension popup');
    }
  }

  // Get DOM elements
  getElements() {
    this.elements = {
      // Status
      statusIndicator: document.getElementById('statusIndicator'),
      statusDot: document.querySelector('.status-dot'),
      statusText: document.querySelector('.status-text'),
      
      // Login section
      loginSection: document.getElementById('loginSection'),
      emailInput: document.getElementById('emailInput'),
      passwordInput: document.getElementById('passwordInput'),
      loginButton: document.getElementById('loginButton'),
      loginStatus: document.getElementById('loginStatus'),
      
      // Campaign section
      campaignSection: document.getElementById('campaignSection'),
      csvUpload: document.getElementById('csvUpload'),
      csvUploadBtn: document.getElementById('csvUploadBtn'),
      fileInfo: document.getElementById('fileInfo'),
      startCampaign: document.getElementById('startCampaign'),
      stopCampaign: document.getElementById('stopCampaign'),
      
      // Progress section
      progressSection: document.getElementById('progressSection'),
      processedCount: document.getElementById('processedCount'),
      successCount: document.getElementById('successCount'),
      failedCount: document.getElementById('failedCount'),
      successRate: document.getElementById('successRate'),
      progressFill: document.getElementById('progressFill'),
      currentAccount: document.getElementById('currentAccount'),
      
      // Settings section
      settingsSection: document.getElementById('settingsSection'),
      settingsContent: document.getElementById('settingsContent'),
      maxAccounts: document.getElementById('maxAccounts'),
      accountDelay: document.getElementById('accountDelay'),
      messageTemplate: document.getElementById('messageTemplate'),
      saveSettings: document.getElementById('saveSettings'),
      
      // Logs section
      logsSection: document.getElementById('logsSection'),
      logsContent: document.getElementById('logsContent'),
      logsContainer: document.getElementById('logsContainer'),
      clearLogs: document.getElementById('clearLogs'),
      exportLogs: document.getElementById('exportLogs')
    };
  }

  // Set up event listeners
  setupEventListeners() {
    // Login
    this.elements.loginButton.addEventListener('click', () => this.handleLogin());
    
    // CSV upload
    this.elements.csvUploadBtn.addEventListener('click', () => this.elements.csvUpload.click());
    this.elements.csvUpload.addEventListener('change', (e) => this.handleCSVUpload(e));
    
    // Campaign controls
    this.elements.startCampaign.addEventListener('click', () => this.handleStartCampaign());
    this.elements.stopCampaign.addEventListener('click', () => this.handleStopCampaign());
    
    // Settings
    this.elements.saveSettings.addEventListener('click', () => this.handleSaveSettings());
    
    // Logs
    this.elements.clearLogs.addEventListener('click', () => this.handleClearLogs());
    this.elements.exportLogs.addEventListener('click', () => this.handleExportLogs());
    
    // Collapsible sections
    document.querySelectorAll('.section-header').forEach(header => {
      header.addEventListener('click', (e) => this.toggleSection(e.target));
    });
    
    // Background script messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundMessage(message);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));
  }

  // Load initial data
  async loadInitialData() {
    try {
      // Get status from background script
      const statusResponse = await this.sendMessageToBackground('popup_get_status');
      if (statusResponse.success) {
        this.campaignState = statusResponse.data.campaignState || this.campaignState;
      }
      
      // Load configuration
      const configResult = await chrome.storage.local.get(['config']);
      if (configResult.config) {
        this.config = { ...this.config, ...configResult.config };
        this.populateSettings();
      }
      
      // Load logs
      const logsResponse = await this.sendMessageToBackground('popup_get_logs');
      if (logsResponse.success) {
        this.logs = logsResponse.data || [];
        this.updateLogsDisplay();
      }
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
    }
  }

  // Update UI based on current state
  async updateUI() {
    try {
      // Update status indicator
      this.updateStatusIndicator();
      
      // Update sections visibility
      this.updateSectionsVisibility();
      
      // Update progress
      this.updateProgress();
      
      // Update campaign controls
      this.updateCampaignControls();
      
    } catch (error) {
      console.error('❌ Failed to update UI:', error);
    }
  }

  // Update status indicator
  updateStatusIndicator() {
    const { statusDot, statusText } = this.elements;
    
    if (this.campaignState.isRunning) {
      if (this.campaignState.isPaused) {
        statusDot.className = 'status-dot paused';
        statusText.textContent = 'Paused';
      } else {
        statusDot.className = 'status-dot running';
        statusText.textContent = 'Running';
      }
    } else {
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = 'Ready';
    }
  }

  // Update sections visibility
  updateSectionsVisibility() {
    // Show campaign section if logged in
    const isLoggedIn = this.isLoggedIn();
    this.elements.campaignSection.style.display = isLoggedIn ? 'block' : 'none';
    
    // Show progress section if campaign is running or has stats
    const hasProgress = this.campaignState.stats.processedAccounts > 0;
    this.elements.progressSection.style.display = hasProgress ? 'block' : 'none';
  }

  // Update progress display
  updateProgress() {
    const { stats } = this.campaignState;
    
    this.elements.processedCount.textContent = stats.processedAccounts || 0;
    this.elements.successCount.textContent = stats.successfulContacts || 0;
    this.elements.failedCount.textContent = stats.failedContacts || 0;
    
    // Calculate success rate
    const successRate = stats.processedAccounts > 0 
      ? Math.round((stats.successfulContacts / stats.processedAccounts) * 100)
      : 0;
    this.elements.successRate.textContent = `${successRate}%`;
    
    // Update progress bar
    const progress = stats.totalAccounts > 0 
      ? Math.round((stats.processedAccounts / stats.totalAccounts) * 100)
      : 0;
    this.elements.progressFill.style.width = `${progress}%`;
    
    // Update current account
    if (this.campaignState.currentAccount) {
      this.elements.currentAccount.textContent = `Processing: ${this.campaignState.currentAccount.name}`;
    } else {
      this.elements.currentAccount.textContent = '';
    }
  }

  // Update campaign controls
  updateCampaignControls() {
    const isRunning = this.campaignState.isRunning;
    
    this.elements.startCampaign.style.display = isRunning ? 'none' : 'inline-block';
    this.elements.stopCampaign.style.display = isRunning ? 'inline-block' : 'none';
    
    // Disable start button if no accounts loaded
    const hasAccounts = this.campaignState.stats.totalAccounts > 0;
    this.elements.startCampaign.disabled = !hasAccounts;
  }

  // Handle login
  async handleLogin() {
    try {
      const email = this.elements.emailInput.value.trim();
      const password = this.elements.passwordInput.value.trim();
      
      if (!email || !password) {
        this.showError('Please enter both email and password');
        return;
      }
      
      this.setLoginStatus('Logging in...', 'info');
      this.elements.loginButton.disabled = true;
      
      const response = await this.sendMessageToBackground('popup_login', { email, password });
      
      if (response.success) {
        this.setLoginStatus('Login successful!', 'success');
        await this.updateUI();
      } else {
        this.setLoginStatus(`Login failed: ${response.error}`, 'error');
      }
      
    } catch (error) {
      console.error('❌ Login error:', error);
      this.setLoginStatus(`Login error: ${error.message}`, 'error');
    } finally {
      this.elements.loginButton.disabled = false;
    }
  }

  // Handle CSV upload
  async handleCSVUpload(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      this.setFileInfo('Processing CSV file...', 'info');
      
      // Parse CSV file
      const csvContent = await this.readFile(file);
      const accounts = await this.parseCSV(csvContent);
      
      // Send to background script
      const response = await this.sendMessageToBackground('popup_upload_csv', { accounts });
      
      if (response.success) {
        this.setFileInfo(`✅ Loaded ${response.data.accountCount} accounts`, 'success');
        this.campaignState.stats.totalAccounts = response.data.accountCount;
        await this.updateUI();
      } else {
        this.setFileInfo(`❌ Upload failed: ${response.error}`, 'error');
      }
      
    } catch (error) {
      console.error('❌ CSV upload error:', error);
      this.setFileInfo(`❌ Error: ${error.message}`, 'error');
    }
  }

  // Handle start campaign
  async handleStartCampaign() {
    try {
      this.elements.startCampaign.disabled = true;
      this.addLog('Starting campaign...', 'info');
      
      const response = await this.sendMessageToBackground('popup_start_campaign', this.config);
      
      if (response.success) {
        this.campaignState.isRunning = true;
        this.campaignState.isPaused = false;
        this.addLog('Campaign started successfully', 'success');
        await this.updateUI();
      } else {
        this.addLog(`Failed to start campaign: ${response.error}`, 'error');
        this.showError(response.error);
      }
      
    } catch (error) {
      console.error('❌ Start campaign error:', error);
      this.addLog(`Start campaign error: ${error.message}`, 'error');
      this.showError(error.message);
    } finally {
      this.elements.startCampaign.disabled = false;
    }
  }

  // Handle stop campaign
  async handleStopCampaign() {
    try {
      this.elements.stopCampaign.disabled = true;
      this.addLog('Stopping campaign...', 'info');
      
      const response = await this.sendMessageToBackground('popup_stop_campaign');
      
      if (response.success) {
        this.campaignState.isRunning = false;
        this.campaignState.isPaused = false;
        this.addLog('Campaign stopped', 'info');
        await this.updateUI();
      } else {
        this.addLog(`Failed to stop campaign: ${response.error}`, 'error');
      }
      
    } catch (error) {
      console.error('❌ Stop campaign error:', error);
      this.addLog(`Stop campaign error: ${error.message}`, 'error');
    } finally {
      this.elements.stopCampaign.disabled = false;
    }
  }

  // Handle save settings
  async handleSaveSettings() {
    try {
      const newConfig = {
        maxAccountsPerSession: parseInt(this.elements.maxAccounts.value) || 50,
        delayBetweenAccounts: parseInt(this.elements.accountDelay.value) * 1000 || 5000,
        messageTemplate: this.elements.messageTemplate.value.trim() || this.config.messageTemplate
      };
      
      const response = await this.sendMessageToBackground('popup_update_config', newConfig);
      
      if (response.success) {
        this.config = { ...this.config, ...newConfig };
        this.addLog('Settings saved successfully', 'success');
        this.showSuccess('Settings saved!');
      } else {
        this.addLog(`Failed to save settings: ${response.error}`, 'error');
        this.showError(response.error);
      }
      
    } catch (error) {
      console.error('❌ Save settings error:', error);
      this.addLog(`Save settings error: ${error.message}`, 'error');
      this.showError(error.message);
    }
  }

  // Handle clear logs
  async handleClearLogs() {
    try {
      const response = await this.sendMessageToBackground('popup_clear_logs');
      
      if (response.success) {
        this.logs = [];
        this.updateLogsDisplay();
        this.addLog('Logs cleared', 'info');
      } else {
        this.showError(response.error);
      }
      
    } catch (error) {
      console.error('❌ Clear logs error:', error);
      this.showError(error.message);
    }
  }

  // Handle export logs
  async handleExportLogs() {
    try {
      const response = await this.sendMessageToBackground('popup_export_logs');
      
      if (response.success) {
        this.downloadFile(response.data, 'markt_de_dm_bot_logs.json', 'application/json');
        this.addLog('Logs exported successfully', 'success');
      } else {
        this.showError(response.error);
      }
      
    } catch (error) {
      console.error('❌ Export logs error:', error);
      this.showError(error.message);
    }
  }

  // Handle background script messages
  handleBackgroundMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'popup_progress_update':
        this.campaignState.stats = { ...this.campaignState.stats, ...data };
        this.campaignState.currentAccount = data.currentAccount;
        this.updateProgress();
        break;
        
      case 'popup_campaign_complete':
        this.campaignState.isRunning = false;
        this.campaignState.isPaused = false;
        this.campaignState.stats = { ...this.campaignState.stats, ...data };
        this.updateUI();
        this.addLog('Campaign completed', 'success');
        break;
        
      case 'popup_error':
        this.addLog(`Error: ${data.message}`, 'error');
        break;
        
      case 'popup_login_status':
        this.setLoginStatus(data.message, data.success ? 'success' : 'error');
        if (data.success) {
          this.updateUI();
        }
        break;
        
      case 'popup_account_processed':
        this.addLog(`Account processed: ${data.account.name} - ${data.success ? 'Success' : 'Failed'}`, 
                   data.success ? 'success' : 'warning');
        break;
    }
  }

  // Toggle collapsible sections
  toggleSection(header) {
    const targetId = header.getAttribute('data-target');
    const content = document.getElementById(targetId);
    const icon = header.querySelector('.toggle-icon');
    
    if (content.style.display === 'none' || !content.style.display) {
      content.style.display = 'block';
      icon.textContent = '▲';
    } else {
      content.style.display = 'none';
      icon.textContent = '▼';
    }
  }

  // Handle keyboard shortcuts
  handleKeyboard(event) {
    // Ctrl+Enter to start/stop campaign
    if (event.ctrlKey && event.key === 'Enter') {
      if (this.campaignState.isRunning) {
        this.handleStopCampaign();
      } else {
        this.handleStartCampaign();
      }
      event.preventDefault();
    }
    
    // Escape to close any open dialogs
    if (event.key === 'Escape') {
      // Close any error/success messages
      document.querySelectorAll('.message').forEach(msg => msg.remove());
    }
  }

  // Utility functions
  async sendMessageToBackground(type, data = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type, data }, (response) => {
        resolve(response || { success: false, error: 'No response from background script' });
      });
    });
  }

  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  async parseCSV(csvContent) {
    // Simple CSV parser - in production, use the CSVParser class
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    const accounts = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      
      if (values.length >= 3) {
        accounts.push({
          name: values[0] || '',
          userId: values[1] || '',
          link: values[2] || '',
          status: 'pending'
        });
      }
    }
    
    return accounts;
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  populateSettings() {
    this.elements.maxAccounts.value = this.config.maxAccountsPerSession || 50;
    this.elements.accountDelay.value = Math.round((this.config.delayBetweenAccounts || 5000) / 1000);
    this.elements.messageTemplate.value = this.config.messageTemplate || '';
  }

  setLoginStatus(message, type) {
    const statusElement = this.elements.loginStatus;
    statusElement.textContent = message;
    statusElement.className = `login-status ${type}`;
    
    // Clear after 5 seconds for non-error messages
    if (type !== 'error') {
      setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'login-status';
      }, 5000);
    }
  }

  setFileInfo(message, type) {
    const fileInfoElement = this.elements.fileInfo;
    fileInfoElement.textContent = message;
    fileInfoElement.className = `file-info ${type}`;
  }

  addLog(message, level = 'info') {
    const logEntry = {
      message,
      level,
      timestamp: Date.now(),
      id: Date.now() + Math.random()
    };
    
    this.logs.unshift(logEntry); // Add to beginning
    
    // Keep only last 100 logs in popup
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }
    
    this.updateLogsDisplay();
  }

  updateLogsDisplay() {
    const container = this.elements.logsContainer;
    container.innerHTML = '';
    
    this.logs.slice(0, 20).forEach(log => { // Show only last 20 logs
      const logElement = document.createElement('div');
      logElement.className = `log-entry ${log.level}`;
      
      const time = new Date(log.timestamp).toLocaleTimeString();
      logElement.innerHTML = `<span class="log-time">${time}</span> ${log.message}`;
      
      container.appendChild(logElement);
    });
    
    // Scroll to top to show newest logs
    container.scrollTop = 0;
  }

  showError(message) {
    this.showMessage(message, 'error');
  }

  showSuccess(message) {
    this.showMessage(message, 'success');
  }

  showMessage(message, type) {
    // Remove existing messages
    document.querySelectorAll('.message').forEach(msg => msg.remove());
    
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    messageElement.textContent = message;
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.className = 'message-close';
    closeButton.onclick = () => messageElement.remove();
    messageElement.appendChild(closeButton);
    
    // Insert at top of popup
    document.querySelector('.popup-container').insertBefore(
      messageElement, 
      document.querySelector('.header').nextSibling
    );
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.remove();
      }
    }, 5000);
  }

  isLoggedIn() {
    // This would be determined by checking with background script
    // For now, assume logged in if we have campaign data
    return this.campaignState.stats.totalAccounts > 0;
  }

  startPeriodicUpdates() {
    // Update UI every 2 seconds when campaign is running
    this.updateInterval = setInterval(async () => {
      if (this.campaignState.isRunning) {
        try {
          const response = await this.sendMessageToBackground('popup_get_status');
          if (response.success) {
            this.campaignState = response.data.campaignState || this.campaignState;
            this.updateUI();
          }
        } catch (error) {
          console.error('❌ Periodic update error:', error);
        }
      }
    }, 2000);
  }

  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    this.isInitialized = false;
    console.log('🧹 Popup controller cleaned up');
  }
}

// Initialize popup controller when script loads
const popupController = new PopupController();

// Cleanup when popup closes
window.addEventListener('beforeunload', () => {
  if (popupController) {
    popupController.cleanup();
  }
});