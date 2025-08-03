// Instagram Automation Popup Script
// Handles popup UI interactions and communication with background/content scripts

class PopupController {
  constructor() {
    this.currentState = null;
    this.currentStats = null;
    this.updateInterval = null;
    
    this.initialize();
  }

  // Initialize popup
  async initialize() {
    console.log('Initializing popup...');
    
    try {
      // Set up event listeners
      this.setupEventListeners();
      
      // Load current state
      await this.loadCurrentState();
      
      // Update UI
      this.updateUI();
      
      // Start periodic updates
      this.startPeriodicUpdates();
      
      console.log('Popup initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Failed to initialize popup: ' + error.message);
    }
  }

  // Set up event listeners
  setupEventListeners() {
    // Control buttons
    document.getElementById('start-btn').addEventListener('click', () => this.startAutomation());
    document.getElementById('pause-btn').addEventListener('click', () => this.pauseAutomation());
    document.getElementById('stop-btn').addEventListener('click', () => this.stopAutomation());
    
    // File upload
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
    uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    
    // Settings
    document.getElementById('save-limits-btn').addEventListener('click', () => this.saveLimits());
    
    // Test buttons
    document.getElementById('test-follow-popup-btn').addEventListener('click', () => this.testFollow());
    document.getElementById('test-unfollow-popup-btn').addEventListener('click', () => this.testUnfollow());
    
    // Footer buttons
    document.getElementById('open-instagram-btn').addEventListener('click', () => this.openInstagram());
    document.getElementById('view-logs-btn').addEventListener('click', () => this.viewLogs());
    document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
    });
  }

  // Load current automation state
  async loadCurrentState() {
    try {
      // Get state from background script
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AUTOMATION_STATE'
      });
      
      if (response && response.state) {
        this.currentState = response.state;
      }
      
      // Get statistics
      const statsResponse = await chrome.runtime.sendMessage({
        type: 'GET_STATISTICS'
      });
      
      if (statsResponse && statsResponse.stats) {
        this.currentStats = statsResponse.stats;
      }
      
    } catch (error) {
      console.error('Failed to load current state:', error);
    }
  }

  // Check if content script is ready on Instagram tab
  async isContentScriptReady(tabId) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: 'PING'
      });
      return response && response.success;
    } catch (error) {
      return false;
    }
  }

  // Wait for content script to be ready
  async waitForContentScript(tabId, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      if (await this.isContentScriptReady(tabId)) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    return false;
  }

  // Update UI with current state
  updateUI() {
    this.updateStatusIndicator();
    this.updateStats();
    this.updateCurrentAction();
    this.updateControlButtons();
    this.updateSettings();
    this.updateRecentActivity();
  }

  // Update status indicator
  updateStatusIndicator() {
    const statusIndicator = document.getElementById('status-indicator');
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');
    
    if (!this.currentState) {
      statusDot.className = 'status-dot stopped';
      statusText.textContent = 'Ready';
      return;
    }
    
    if (!this.currentState.isRunning) {
      statusDot.className = 'status-dot stopped';
      statusText.textContent = 'Stopped';
    } else if (this.currentState.isPaused) {
      statusDot.className = 'status-dot paused';
      statusText.textContent = 'Paused';
    } else {
      statusDot.className = 'status-dot running';
      statusText.textContent = 'Running';
    }
  }

  // Update statistics
  updateStats() {
    const dailyFollows = document.getElementById('daily-follows');
    const dailyUnfollows = document.getElementById('daily-unfollows');
    const queueTotal = document.getElementById('queue-total');
    
    if (this.currentState && this.currentState.dailyStats) {
      dailyFollows.textContent = this.currentState.dailyStats.follows || 0;
      dailyUnfollows.textContent = this.currentState.dailyStats.unfollows || 0;
    } else {
      dailyFollows.textContent = '0';
      dailyUnfollows.textContent = '0';
    }
    
    if (this.currentState && this.currentState.queues) {
      const followQueue = this.currentState.queues.follow?.length || 0;
      const unfollowQueue = this.currentState.queues.unfollow?.length || 0;
      queueTotal.textContent = followQueue + unfollowQueue;
    } else {
      queueTotal.textContent = '0';
    }
  }

  // Update current action display
  updateCurrentAction() {
    const currentAction = document.getElementById('current-action');
    const actionText = currentAction.querySelector('.action-text');
    const actionDetails = currentAction.querySelector('.action-details');
    
    if (!this.currentState || !this.currentState.isRunning) {
      currentAction.className = 'current-action';
      actionText.textContent = 'Ready to start';
      actionDetails.textContent = '';
      return;
    }
    
    if (this.currentState.isPaused) {
      currentAction.className = 'current-action paused';
      actionText.textContent = 'Paused';
      actionDetails.textContent = '';
      return;
    }
    
    if (this.currentState.currentAction) {
      const action = this.currentState.currentAction;
      
      if (action.type === 'follow' || action.type === 'unfollow') {
        currentAction.className = 'current-action running';
        actionText.textContent = `${action.type === 'follow' ? 'Following' : 'Unfollowing'}`;
        actionDetails.textContent = action.username;
      } else if (action.type === 'break') {
        const remaining = Math.round((action.duration - (Date.now() - action.startTime)) / 60000);
        currentAction.className = 'current-action';
        actionText.textContent = 'Taking Break';
        actionDetails.textContent = `${remaining} minutes remaining`;
      } else if (action.type === 'rate_limit') {
        const remaining = Math.round((action.waitTime - (Date.now() - action.startTime)) / 60000);
        currentAction.className = 'current-action error';
        actionText.textContent = 'Rate Limited';
        actionDetails.textContent = `${remaining} minutes remaining`;
      }
    } else {
      currentAction.className = 'current-action running';
      actionText.textContent = 'Running';
      actionDetails.textContent = 'Waiting for next action';
    }
  }

  // Update control buttons
  updateControlButtons() {
    const startBtn = document.getElementById('start-btn');
    const pauseBtn = document.getElementById('pause-btn');
    const stopBtn = document.getElementById('stop-btn');
    
    if (!this.currentState || !this.currentState.isRunning) {
      startBtn.disabled = false;
      startBtn.innerHTML = '<span class="btn-icon">▶</span>Start';
      pauseBtn.disabled = true;
      stopBtn.disabled = true;
    } else if (this.currentState.isPaused) {
      startBtn.disabled = false;
      startBtn.innerHTML = '<span class="btn-icon">▶</span>Resume';
      pauseBtn.disabled = true;
      stopBtn.disabled = false;
    } else {
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      stopBtn.disabled = false;
    }
  }

  // Update settings
  updateSettings() {
    const followLimit = document.getElementById('follow-limit');
    const unfollowLimit = document.getElementById('unfollow-limit');
    
    if (this.currentState && this.currentState.settings) {
      followLimit.value = this.currentState.settings.dailyLimits?.follows || 100;
      unfollowLimit.value = this.currentState.settings.dailyLimits?.unfollows || 100;
    }
  }

  // Update recent activity
  updateRecentActivity() {
    const activityList = document.getElementById('activity-list');
    
    if (!this.currentStats || !this.currentStats.recentActions || this.currentStats.recentActions.length === 0) {
      activityList.innerHTML = '<div class="no-activity">No recent activity</div>';
      return;
    }
    
    const recentActions = this.currentStats.recentActions.slice(-5).reverse();
    
    const activityHTML = recentActions.map(action => {
      const time = new Date(action.timestamp).toLocaleTimeString();
      const statusClass = action.success ? 'success' : 'error';
      const testIndicator = action.isTest ? ' (TEST)' : '';
      
      return `
        <div class="activity-item ${statusClass}">
          <div class="activity-info">
            <div class="activity-action">${action.type}${testIndicator} ${action.username}</div>
            <div class="activity-username">${action.success ? 'Success' : 'Failed'}</div>
          </div>
          <div class="activity-time">${time}</div>
        </div>
      `;
    }).join('');
    
    activityList.innerHTML = activityHTML;
  }

  // Start automation
  async startAutomation() {
    try {
      this.showLoading('Starting automation...');
      
      // Check if we're on Instagram
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab.url.includes('instagram.com')) {
        // Open Instagram first
        await this.openInstagram();
        this.hideLoading();
        this.showError('Please wait for Instagram to load, then try again');
        return;
      }
      
      // Wait for content script to be ready
      this.showLoading('Waiting for extension to load...');
      const isReady = await this.waitForContentScript(currentTab.id);
      
      if (!isReady) {
        throw new Error('Extension not ready on Instagram page. Please refresh the page and try again.');
      }
      
      // Send start message to content script
      this.showLoading('Starting automation...');
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: 'START_AUTOMATION'
      });
      
      if (response && response.success) {
        this.showSuccess('Automation started successfully');
        await this.loadCurrentState();
        this.updateUI();
      } else {
        throw new Error(response?.error || 'Failed to start automation');
      }
      
    } catch (error) {
      console.error('Failed to start automation:', error);
      this.showError('Failed to start automation: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  // Pause automation
  async pauseAutomation() {
    try {
      this.showLoading('Pausing automation...');
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      // Wait for content script to be ready
      const isReady = await this.waitForContentScript(currentTab.id);
      
      if (!isReady) {
        throw new Error('Extension not ready on Instagram page. Please refresh the page and try again.');
      }
      
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: 'PAUSE_AUTOMATION'
      });
      
      if (response && response.success) {
        this.showSuccess('Automation paused');
        await this.loadCurrentState();
        this.updateUI();
      } else {
        throw new Error(response?.error || 'Failed to pause automation');
      }
      
    } catch (error) {
      console.error('Failed to pause automation:', error);
      this.showError('Failed to pause automation: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  // Stop automation
  async stopAutomation() {
    try {
      this.showLoading('Stopping automation...');
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      // Wait for content script to be ready
      const isReady = await this.waitForContentScript(currentTab.id);
      
      if (!isReady) {
        throw new Error('Extension not ready on Instagram page. Please refresh the page and try again.');
      }
      
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: 'STOP_AUTOMATION'
      });
      
      if (response && response.success) {
        this.showSuccess('Automation stopped');
        await this.loadCurrentState();
        this.updateUI();
      } else {
        throw new Error(response?.error || 'Failed to stop automation');
      }
      
    } catch (error) {
      console.error('Failed to stop automation:', error);
      this.showError('Failed to stop automation: ' + error.message);
    } finally {
      this.hideLoading();
    }
  }

  // Handle file drag over
  handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('drag-over');
  }

  // Handle file drop
  async handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await this.processFile(files[0]);
    }
  }

  // Handle file selection
  async handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
      await this.processFile(files[0]);
    }
  }

  // Process uploaded file
  async processFile(file) {
    const statusDiv = document.getElementById('upload-status');
    
    try {
      statusDiv.innerHTML = '<div class="loading">Processing file...</div>';
      statusDiv.className = 'upload-status loading';
      
      // Validate file type
      if (!file.name.match(/\.(csv|txt)$/i)) {
        throw new Error('Please upload a CSV or TXT file');
      }
      
      // Read file content
      const content = await this.readFileContent(file);
      
      // Parse usernames
      const usernames = this.parseUsernames(content);
      
      if (usernames.length === 0) {
        throw new Error('No valid usernames found in file');
      }
      
      // Send to content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab.url.includes('instagram.com')) {
        throw new Error('Please open Instagram first');
      }
      
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: 'ADD_FOLLOW_ACCOUNTS',
        usernames: usernames
      });
      
      if (response.success) {
        statusDiv.innerHTML = `✓ Successfully loaded ${usernames.length} accounts`;
        statusDiv.className = 'upload-status success';
        
        // Update UI
        await this.loadCurrentState();
        this.updateUI();
        
        this.showSuccess(`Loaded ${usernames.length} accounts to follow queue`);
      } else {
        throw new Error('Failed to add accounts to queue');
      }
      
    } catch (error) {
      statusDiv.innerHTML = `✗ Error: ${error.message}`;
      statusDiv.className = 'upload-status error';
      this.showError(error.message);
    }
  }

  // Read file content
  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  // Parse usernames from file content
  parseUsernames(content) {
    const lines = content.split(/\r?\n/);
    const usernames = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      // Handle CSV format (take first column)
      const username = trimmed.split(',')[0].trim();
      
      // Remove @ symbol if present
      const cleanUsername = username.replace(/^@/, '');
      
      // Validate username format
      if (this.isValidUsername(cleanUsername)) {
        usernames.push(cleanUsername);
      }
    }
    
    return [...new Set(usernames)]; // Remove duplicates
  }

  // Validate username format
  isValidUsername(username) {
    // Instagram username rules: 1-30 characters, letters, numbers, periods, underscores
    return /^[a-zA-Z0-9._]{1,30}$/.test(username);
  }

  // Save daily limits
  async saveLimits() {
    try {
      const followLimit = parseInt(document.getElementById('follow-limit').value);
      const unfollowLimit = parseInt(document.getElementById('unfollow-limit').value);
      
      if (followLimit < 1 || followLimit > 200 || unfollowLimit < 1 || unfollowLimit > 200) {
        throw new Error('Limits must be between 1 and 200');
      }
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab.url.includes('instagram.com')) {
        throw new Error('Please open Instagram first');
      }
      
      const response = await chrome.tabs.sendMessage(currentTab.id, {
        type: 'UPDATE_SETTINGS',
        settings: {
          dailyLimits: {
            follows: followLimit,
            unfollows: unfollowLimit
          }
        }
      });
      
      if (response.success) {
        const btn = document.getElementById('save-limits-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Saved!';
        btn.style.background = '#42b883';
        btn.style.color = 'white';
        
        setTimeout(() => {
          btn.textContent = originalText;
          btn.style.background = '';
          btn.style.color = '';
        }, 2000);
        
        this.showSuccess('Daily limits updated');
      } else {
        throw new Error('Failed to update settings');
      }
      
    } catch (error) {
      this.showError('Failed to save limits: ' + error.message);
    }
  }

  // Open Instagram
  async openInstagram() {
    try {
      await chrome.tabs.create({
        url: 'https://www.instagram.com',
        active: true
      });
      
      // Close popup
      window.close();
      
    } catch (error) {
      this.showError('Failed to open Instagram: ' + error.message);
    }
  }

  // View logs
  async viewLogs() {
    try {
      // Export data and create blob URL
      const response = await chrome.runtime.sendMessage({
        type: 'EXPORT_DATA',
        format: 'csv'
      });
      
      if (response.data) {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        // Download file
        const a = document.createElement('a');
        a.href = url;
        a.download = `instagram-automation-logs-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
        
        this.showSuccess('Logs exported successfully');
      } else {
        throw new Error('No data to export');
      }
      
    } catch (error) {
      this.showError('Failed to export logs: ' + error.message);
    }
  }

  // Test follow action
  async testFollow() {
    const username = document.getElementById('test-username-popup').value.trim();
    const statusDiv = document.getElementById('test-status-popup');
    
    if (!username) {
      statusDiv.innerHTML = '<div class="error">Please enter a username</div>';
      return;
    }
    
    if (!this.isValidUsername(username)) {
      statusDiv.innerHTML = '<div class="error">Invalid username format</div>';
      return;
    }
    
    try {
      statusDiv.innerHTML = '<div class="loading">Testing follow action...</div>';
      
      // Get active Instagram tab
      const tabs = await chrome.tabs.query({ url: '*://www.instagram.com/*' });
      
      if (tabs.length === 0) {
        throw new Error('Please open Instagram first');
      }
      
      const instagramTab = tabs[0];
      
      // Send test follow message to content script
      const response = await chrome.tabs.sendMessage(instagramTab.id, {
        type: 'TEST_FOLLOW',
        username: username
      });
      
      if (response.success) {
        if (response.alreadyFollowing) {
          statusDiv.innerHTML = '<div class="success">✓ Already following this account</div>';
        } else {
          statusDiv.innerHTML = '<div class="success">✓ Successfully followed ' + username + '</div>';
        }
      } else {
        throw new Error(response.error || 'Follow action failed');
      }
      
    } catch (error) {
      console.error('Test follow error:', error);
      statusDiv.innerHTML = '<div class="error">✗ Error: ' + error.message + '</div>';
    }
    
    // Clear status after 5 seconds
    setTimeout(() => {
      statusDiv.innerHTML = '';
    }, 5000);
  }

  // Test unfollow action
  async testUnfollow() {
    const username = document.getElementById('test-username-popup').value.trim();
    const statusDiv = document.getElementById('test-status-popup');
    
    if (!username) {
      statusDiv.innerHTML = '<div class="error">Please enter a username</div>';
      return;
    }
    
    if (!this.isValidUsername(username)) {
      statusDiv.innerHTML = '<div class="error">Invalid username format</div>';
      return;
    }
    
    try {
      statusDiv.innerHTML = '<div class="loading">Testing unfollow action...</div>';
      
      // Get active Instagram tab
      const tabs = await chrome.tabs.query({ url: '*://www.instagram.com/*' });
      
      if (tabs.length === 0) {
        throw new Error('Please open Instagram first');
      }
      
      const instagramTab = tabs[0];
      
      // Send test unfollow message to content script
      const response = await chrome.tabs.sendMessage(instagramTab.id, {
        type: 'TEST_UNFOLLOW',
        username: username
      });
      
      if (response.success) {
        if (response.wasNotFollowing) {
          statusDiv.innerHTML = '<div class="success">✓ Not following this account</div>';
        } else {
          statusDiv.innerHTML = '<div class="success">✓ Successfully unfollowed ' + username + '</div>';
        }
      } else {
        throw new Error(response.error || 'Unfollow action failed');
      }
      
    } catch (error) {
      console.error('Test unfollow error:', error);
      statusDiv.innerHTML = '<div class="error">✗ Error: ' + error.message + '</div>';
    }
    
    // Clear status after 5 seconds
    setTimeout(() => {
      statusDiv.innerHTML = '';
    }, 5000);
  }

  // Open settings (placeholder)
  openSettings() {
    this.showError('Advanced settings coming soon!');
  }

  // Handle messages from background script
  handleMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'STATE_CHANGED':
        this.currentState = message.state;
        this.currentStats = message.stats;
        this.updateUI();
        break;
    }
  }

  // Start periodic updates
  startPeriodicUpdates() {
    this.updateInterval = setInterval(async () => {
      await this.loadCurrentState();
      this.updateUI();
    }, 5000); // Update every 5 seconds
  }

  // Show loading overlay
  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loading-overlay');
    const text = overlay.querySelector('.loading-text');
    text.textContent = message;
    overlay.style.display = 'flex';
  }

  // Hide loading overlay
  hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = 'none';
  }

  // Show error toast
  showError(message) {
    const toast = document.getElementById('error-toast');
    const messageSpan = toast.querySelector('.toast-message');
    messageSpan.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
      toast.style.display = 'none';
    }, 5000);
  }

  // Show success toast
  showSuccess(message) {
    const toast = document.getElementById('success-toast');
    const messageSpan = toast.querySelector('.toast-message');
    messageSpan.textContent = message;
    toast.style.display = 'block';
    
    setTimeout(() => {
      toast.style.display = 'none';
    }, 3000);
  }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PopupController();
});

console.log('Instagram Automation: Popup script loaded');