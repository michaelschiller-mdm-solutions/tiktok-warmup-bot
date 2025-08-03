// Main Content Script
// Initializes and coordinates all automation components on Instagram pages

class InstagramAutomationContentScript {
  constructor() {
    this.automationEngine = null;
    this.sidebar = null;
    this.isInitialized = false;
    this.initializationAttempts = 0;
    this.maxInitializationAttempts = 5;
  }

  // Initialize the content script
  async initialize() {
    try {
      console.log('Instagram Automation: Initializing content script...');
      
      // Check if we're on Instagram
      if (!this.isInstagramPage()) {
        console.log('Not on Instagram page, skipping initialization');
        return;
      }
      
      // Wait for page to be ready
      await this.waitForPageReady();
      
      // Initialize automation engine
      this.automationEngine = new AutomationEngine();
      await this.automationEngine.initialize();
      
      // Create and inject sidebar UI
      await this.createSidebar();
      
      // Set up event listeners
      this.setupEventListeners();
      
      this.isInitialized = true;
      console.log('Instagram Automation: Content script initialized successfully');
      
      // Notify background script
      chrome.runtime.sendMessage({
        type: 'CONTENT_SCRIPT_READY',
        url: window.location.href
      });
      
    } catch (error) {
      console.error('Instagram Automation: Failed to initialize content script:', error);
      
      // Retry initialization
      this.initializationAttempts++;
      if (this.initializationAttempts < this.maxInitializationAttempts) {
        console.log(`Retrying initialization (attempt ${this.initializationAttempts + 1}/${this.maxInitializationAttempts})`);
        setTimeout(() => this.initialize(), 2000);
      }
    }
  }

  // Check if current page is Instagram
  isInstagramPage() {
    return window.location.hostname.includes('instagram.com');
  }

  // Wait for page to be ready for automation
  async waitForPageReady() {
    return new Promise((resolve) => {
      // Check if page is already loaded
      if (document.readyState === 'complete') {
        // Wait a bit more for Instagram's dynamic content
        setTimeout(resolve, 1000);
        return;
      }
      
      // Wait for load event
      window.addEventListener('load', () => {
        setTimeout(resolve, 1000);
      });
    });
  }

  // Create and inject sidebar UI
  async createSidebar() {
    // Remove existing sidebar if present
    const existingSidebar = document.getElementById('instagram-automation-sidebar');
    if (existingSidebar) {
      existingSidebar.remove();
    }
    
    // Create sidebar container
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'instagram-automation-sidebar';
    this.sidebar.className = 'instagram-automation-sidebar';
    
    // Set initial sidebar HTML
    this.sidebar.innerHTML = this.getSidebarHTML();
    
    // Inject sidebar into page
    document.body.appendChild(this.sidebar);
    
    // Set up sidebar event listeners
    this.setupSidebarEvents();
    
    // Update sidebar with current state
    await this.updateSidebarState();
    
    console.log('Sidebar created and injected');
  }

  // Get sidebar HTML template
  getSidebarHTML() {
    return `
      <div class="sidebar-header">
        <h3>Instagram Automation</h3>
        <button id="sidebar-toggle" class="toggle-btn">−</button>
      </div>
      
      <div class="sidebar-content">
        <!-- File Upload Section -->
        <div class="section">
          <h4>Upload Accounts</h4>
          <div class="upload-area" id="upload-area">
            <input type="file" id="file-input" accept=".csv,.txt" style="display: none;">
            <div class="upload-text">
              <p>Drop CSV/TXT file here or click to browse</p>
              <small>One username per line</small>
            </div>
          </div>
          <div id="file-status" class="file-status"></div>
        </div>
        
        <!-- Queue Status Section -->
        <div class="section">
          <h4>Queue Status</h4>
          <div class="queue-stats">
            <div class="stat-item">
              <span class="stat-label">Follow Queue:</span>
              <span id="follow-queue-count" class="stat-value">0</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Unfollow Queue:</span>
              <span id="unfollow-queue-count" class="stat-value">0</span>
            </div>
          </div>
        </div>
        
        <!-- Daily Progress Section -->
        <div class="section">
          <h4>Daily Progress</h4>
          <div class="progress-stats">
            <div class="stat-item">
              <span class="stat-label">Follows:</span>
              <span id="daily-follows" class="stat-value">0</span>
              <span class="stat-limit">/ <span id="follow-limit">100</span></span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Unfollows:</span>
              <span id="daily-unfollows" class="stat-value">0</span>
              <span class="stat-limit">/ <span id="unfollow-limit">100</span></span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Errors:</span>
              <span id="daily-errors" class="stat-value error">0</span>
            </div>
          </div>
        </div>
        
        <!-- Current Action Section -->
        <div class="section">
          <h4>Current Status</h4>
          <div id="current-status" class="status-display">
            <div class="status-text">Ready</div>
            <div class="status-details"></div>
          </div>
        </div>
        
        <!-- Control Buttons Section -->
        <div class="section">
          <div class="control-buttons">
            <button id="start-btn" class="btn btn-primary">Start</button>
            <button id="pause-btn" class="btn btn-secondary" disabled>Pause</button>
            <button id="stop-btn" class="btn btn-danger" disabled>Stop</button>
          </div>
        </div>
        
        <!-- Settings Section -->
        <div class="section">
          <h4>Quick Settings</h4>
          <div class="settings-grid">
            <div class="setting-item">
              <label for="follow-limit-input">Daily Follow Limit:</label>
              <input type="number" id="follow-limit-input" min="1" max="200" value="100">
            </div>
            <div class="setting-item">
              <label for="unfollow-limit-input">Daily Unfollow Limit:</label>
              <input type="number" id="unfollow-limit-input" min="1" max="200" value="100">
            </div>
            <div class="setting-item">
              <label for="action-delay-input">Min Action Delay (seconds):</label>
              <input type="number" id="action-delay-input" min="30" max="300" value="30">
            </div>
          </div>
          <button id="save-settings-btn" class="btn btn-secondary">Save Settings</button>
        </div>
        
        <!-- Test Section -->
        <div class="section">
          <h4>Test Actions</h4>
          <div class="test-controls">
            <div class="test-input-group">
              <input type="text" id="test-username" placeholder="Enter username to test" maxlength="30">
            </div>
            <div class="test-buttons">
              <button id="test-follow-btn" class="btn btn-test">Test Follow</button>
              <button id="test-unfollow-btn" class="btn btn-test">Test Unfollow</button>
            </div>
            <div id="test-status" class="test-status"></div>
          </div>
        </div>

        <!-- Recent Actions Section -->
        <div class="section">
          <h4>Recent Actions</h4>
          <div id="recent-actions" class="recent-actions">
            <div class="no-actions">No recent actions</div>
          </div>
        </div>
      </div>
    `;
  }

  // Set up sidebar event listeners
  setupSidebarEvents() {
    // Toggle sidebar
    const toggleBtn = this.sidebar.querySelector('#sidebar-toggle');
    toggleBtn.addEventListener('click', () => this.toggleSidebar());
    
    // File upload
    const uploadArea = this.sidebar.querySelector('#upload-area');
    const fileInput = this.sidebar.querySelector('#file-input');
    
    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
    uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
    fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    
    // Control buttons
    this.sidebar.querySelector('#start-btn').addEventListener('click', () => this.startAutomation());
    this.sidebar.querySelector('#pause-btn').addEventListener('click', () => this.pauseAutomation());
    this.sidebar.querySelector('#stop-btn').addEventListener('click', () => this.stopAutomation());
    
    // Settings
    this.sidebar.querySelector('#save-settings-btn').addEventListener('click', () => this.saveSettings());
    
    // Test buttons
    this.sidebar.querySelector('#test-follow-btn').addEventListener('click', () => this.testFollow());
    this.sidebar.querySelector('#test-unfollow-btn').addEventListener('click', () => this.testUnfollow());
  }

  // Toggle sidebar visibility
  toggleSidebar() {
    const content = this.sidebar.querySelector('.sidebar-content');
    const toggleBtn = this.sidebar.querySelector('#sidebar-toggle');
    
    if (content.style.display === 'none') {
      content.style.display = 'block';
      toggleBtn.textContent = '−';
      this.sidebar.classList.remove('collapsed');
    } else {
      content.style.display = 'none';
      toggleBtn.textContent = '+';
      this.sidebar.classList.add('collapsed');
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
    const statusDiv = this.sidebar.querySelector('#file-status');
    
    try {
      statusDiv.innerHTML = '<div class="loading">Processing file...</div>';
      
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
      
      // Add to follow queue
      this.automationEngine.addToFollowQueue(usernames);
      
      statusDiv.innerHTML = `
        <div class="success">
          ✓ Successfully loaded ${usernames.length} accounts
        </div>
      `;
      
      // Update sidebar state
      await this.updateSidebarState();
      
    } catch (error) {
      statusDiv.innerHTML = `
        <div class="error">
          ✗ Error: ${error.message}
        </div>
      `;
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

  // Start automation
  async startAutomation() {
    try {
      await this.automationEngine.start();
      this.updateControlButtons('running');
    } catch (error) {
      console.error('Failed to start automation:', error);
      this.showError('Failed to start automation: ' + error.message);
    }
  }

  // Pause automation
  async pauseAutomation() {
    try {
      await this.automationEngine.pause();
      this.updateControlButtons('paused');
    } catch (error) {
      console.error('Failed to pause automation:', error);
    }
  }

  // Stop automation
  async stopAutomation() {
    try {
      await this.automationEngine.stop();
      this.updateControlButtons('stopped');
    } catch (error) {
      console.error('Failed to stop automation:', error);
    }
  }

  // Save settings
  saveSettings() {
    const followLimit = parseInt(this.sidebar.querySelector('#follow-limit-input').value);
    const unfollowLimit = parseInt(this.sidebar.querySelector('#unfollow-limit-input').value);
    const actionDelay = parseInt(this.sidebar.querySelector('#action-delay-input').value) * 1000;
    
    const settings = {
      dailyLimits: {
        follows: followLimit,
        unfollows: unfollowLimit
      },
      timingLimits: {
        minActionInterval: actionDelay
      }
    };
    
    this.automationEngine.updateSettings(settings);
    
    // Show confirmation
    const btn = this.sidebar.querySelector('#save-settings-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Saved!';
    btn.classList.add('success');
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('success');
    }, 2000);
  }

  // Update control buttons based on state
  updateControlButtons(state) {
    const startBtn = this.sidebar.querySelector('#start-btn');
    const pauseBtn = this.sidebar.querySelector('#pause-btn');
    const stopBtn = this.sidebar.querySelector('#stop-btn');
    
    switch (state) {
      case 'running':
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        break;
      case 'paused':
        startBtn.textContent = 'Resume';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = false;
        break;
      case 'stopped':
        startBtn.textContent = 'Start';
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        break;
    }
  }

  // Update sidebar with current state
  async updateSidebarState() {
    if (!this.automationEngine) return;
    
    const stats = this.automationEngine.getStats();
    const state = this.automationEngine.state;
    
    // Update queue counts
    this.sidebar.querySelector('#follow-queue-count').textContent = stats.queueSizes.follow;
    this.sidebar.querySelector('#unfollow-queue-count').textContent = stats.queueSizes.unfollow;
    
    // Update daily progress
    this.sidebar.querySelector('#daily-follows').textContent = stats.dailyStats.follows;
    this.sidebar.querySelector('#daily-unfollows').textContent = stats.dailyStats.unfollows;
    this.sidebar.querySelector('#daily-errors').textContent = stats.dailyStats.errors;
    
    // Update limits
    this.sidebar.querySelector('#follow-limit').textContent = state.settings.dailyLimits.follows;
    this.sidebar.querySelector('#unfollow-limit').textContent = state.settings.dailyLimits.unfollows;
    
    // Update current status
    this.updateCurrentStatus(state);
    
    // Update control buttons
    if (state.isRunning) {
      this.updateControlButtons(state.isPaused ? 'paused' : 'running');
    } else {
      this.updateControlButtons('stopped');
    }
    
    // Update recent actions
    this.updateRecentActions();
  }

  // Update current status display
  updateCurrentStatus(state) {
    const statusDiv = this.sidebar.querySelector('#current-status');
    const statusText = statusDiv.querySelector('.status-text');
    const statusDetails = statusDiv.querySelector('.status-details');
    
    if (!state.isRunning) {
      statusText.textContent = 'Stopped';
      statusDetails.textContent = '';
      statusDiv.className = 'status-display stopped';
    } else if (state.isPaused) {
      statusText.textContent = 'Paused';
      statusDetails.textContent = '';
      statusDiv.className = 'status-display paused';
    } else if (state.currentAction) {
      const action = state.currentAction;
      
      if (action.type === 'follow' || action.type === 'unfollow') {
        statusText.textContent = `${action.type === 'follow' ? 'Following' : 'Unfollowing'}`;
        statusDetails.textContent = action.username;
        statusDiv.className = 'status-display running';
      } else if (action.type === 'break') {
        const remaining = Math.round((action.duration - (Date.now() - action.startTime)) / 60000);
        statusText.textContent = 'Taking Break';
        statusDetails.textContent = `${remaining} minutes remaining`;
        statusDiv.className = 'status-display break';
      } else if (action.type === 'rate_limit') {
        const remaining = Math.round((action.waitTime - (Date.now() - action.startTime)) / 60000);
        statusText.textContent = 'Rate Limited';
        statusDetails.textContent = `${remaining} minutes remaining`;
        statusDiv.className = 'status-display rate-limited';
      }
    } else {
      statusText.textContent = 'Running';
      statusDetails.textContent = 'Waiting for next action';
      statusDiv.className = 'status-display running';
    }
  }

  // Update recent actions list
  updateRecentActions() {
    const actionsDiv = this.sidebar.querySelector('#recent-actions');
    const recentActions = this.automationEngine.actionHistory.slice(-5).reverse();
    
    if (recentActions.length === 0) {
      actionsDiv.innerHTML = '<div class="no-actions">No recent actions</div>';
      return;
    }
    
    const actionsHTML = recentActions.map(action => {
      const time = new Date(action.timestamp).toLocaleTimeString();
      const status = action.success ? '✓' : '✗';
      const statusClass = action.success ? 'success' : 'error';
      const testIndicator = action.isTest ? ' (TEST)' : '';
      
      return `
        <div class="action-item ${statusClass}">
          <span class="action-status">${status}</span>
          <span class="action-type">${action.type}${testIndicator}</span>
          <span class="action-username">${action.username}</span>
          <span class="action-time">${time}</span>
        </div>
      `;
    }).join('');
    
    actionsDiv.innerHTML = actionsHTML;
  }

  // Test follow action
  async testFollow() {
    const username = this.sidebar.querySelector('#test-username').value.trim();
    const statusDiv = this.sidebar.querySelector('#test-status');
    
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
      
      // Search for the account
      const searchSuccess = await this.automationEngine.instagramInterface.searchAccount(username);
      
      if (!searchSuccess) {
        throw new Error(`Could not find user: ${username}`);
      }
      
      // Attempt to follow
      const result = await this.automationEngine.instagramInterface.followAccount();
      
      if (result.success) {
        if (result.alreadyFollowing) {
          statusDiv.innerHTML = '<div class="success">✓ Already following this account</div>';
        } else {
          statusDiv.innerHTML = '<div class="success">✓ Successfully followed ' + username + '</div>';
        }
      } else {
        throw new Error(result.error || 'Follow action failed');
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
    const username = this.sidebar.querySelector('#test-username').value.trim();
    const statusDiv = this.sidebar.querySelector('#test-status');
    
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
      
      // Search for the account
      const searchSuccess = await this.automationEngine.instagramInterface.searchAccount(username);
      
      if (!searchSuccess) {
        throw new Error(`Could not find user: ${username}`);
      }
      
      // Attempt to unfollow
      const result = await this.automationEngine.instagramInterface.unfollowAccount();
      
      if (result.success) {
        if (result.wasNotFollowing) {
          statusDiv.innerHTML = '<div class="success">✓ Not following this account</div>';
        } else {
          statusDiv.innerHTML = '<div class="success">✓ Successfully unfollowed ' + username + '</div>';
        }
      } else {
        throw new Error(result.error || 'Unfollow action failed');
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

  // Handle messages from popup and background script
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'START_AUTOMATION':
          await this.startAutomation();
          sendResponse({ success: true });
          break;
          
        case 'PAUSE_AUTOMATION':
          await this.pauseAutomation();
          sendResponse({ success: true });
          break;
          
        case 'STOP_AUTOMATION':
          await this.stopAutomation();
          sendResponse({ success: true });
          break;
          
        case 'ADD_FOLLOW_ACCOUNTS':
          this.automationEngine.addToFollowQueue(message.usernames);
          await this.updateSidebarState();
          sendResponse({ success: true });
          break;
          
        case 'UPDATE_SETTINGS':
          this.automationEngine.updateSettings(message.settings);
          sendResponse({ success: true });
          break;
          
        case 'TEST_FOLLOW':
          const followResult = await this.testFollowUser(message.username);
          sendResponse(followResult);
          break;
          
        case 'TEST_UNFOLLOW':
          const unfollowResult = await this.testUnfollowUser(message.username);
          sendResponse(unfollowResult);
          break;
          
        case 'STATE_CHANGED':
          await this.updateSidebarState();
          sendResponse({ success: true });
          break;
          
        case 'AUTOMATION_STATE_UPDATE':
          // Update local state from background script
          if (this.automationEngine) {
            this.automationEngine.setState(message.state);
            await this.updateSidebarState();
          }
          sendResponse({ success: true });
          break;
          
        case 'RESTORE_AUTOMATION_SESSION':
          // Restore automation session after browser restart
          if (this.automationEngine) {
            await this.automationEngine.restoreSession(message.state);
            await this.updateSidebarState();
          }
          sendResponse({ success: true });
          break;
          
        case 'DAILY_RESET':
          // Handle daily statistics reset
          if (this.automationEngine) {
            this.automationEngine.resetDailyStats(message.newStats);
            await this.updateSidebarState();
          }
          sendResponse({ success: true });
          break;
          
        case 'START_SCHEDULED_AUTOMATION':
          // Start automation from scheduled task
          await this.startAutomation();
          sendResponse({ success: true });
          break;
          
        case 'PING':
          // Simple ping to check if content script is ready
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

  // Test follow user (separate method for popup)
  async testFollowUser(username) {
    try {
      if (!this.isValidUsername(username)) {
        throw new Error('Invalid username format');
      }
      
      // Search for the account
      const searchSuccess = await this.automationEngine.instagramInterface.searchAccount(username);
      
      if (!searchSuccess) {
        throw new Error(`Could not find user: ${username}`);
      }
      
      // Attempt to follow
      const result = await this.automationEngine.instagramInterface.followAccount();
      
      return {
        success: result.success,
        alreadyFollowing: result.alreadyFollowing,
        error: result.error
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Test unfollow user (separate method for popup)
  async testUnfollowUser(username) {
    try {
      if (!this.isValidUsername(username)) {
        throw new Error('Invalid username format');
      }
      
      // Search for the account
      const searchSuccess = await this.automationEngine.instagramInterface.searchAccount(username);
      
      if (!searchSuccess) {
        throw new Error(`Could not find user: ${username}`);
      }
      
      // Attempt to unfollow
      const result = await this.automationEngine.instagramInterface.unfollowAccount();
      
      return {
        success: result.success,
        wasNotFollowing: result.wasNotFollowing,
        error: result.error
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Show error message
  showError(message) {
    // Create temporary error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.textContent = message;
    
    this.sidebar.appendChild(errorDiv);
    
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }

  // Set up global event listeners
  setupEventListeners() {
    // Listen for messages from popup and background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });
    
    // Update sidebar periodically
    setInterval(() => {
      if (this.isInitialized) {
        this.updateSidebarState();
      }
    }, 5000);
    
    // Handle page navigation
    let lastUrl = window.location.href;
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        console.log('Page navigation detected, reinitializing...');
        setTimeout(() => this.initialize(), 1000);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

function initializeContentScript() {
  // Prevent multiple initializations
  if (window.instagramAutomationContentScript) {
    return;
  }
  
  window.instagramAutomationContentScript = new InstagramAutomationContentScript();
  window.instagramAutomationContentScript.initialize();
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

function initializeContentScript() {
  // Prevent multiple initializations
  if (window.instagramAutomationContentScript) {
    return;
  }
  
  window.instagramAutomationContentScript = new InstagramAutomationContentScript();
  window.instagramAutomationContentScript.initialize();
}

console.log('Instagram Automation: Content script loaded');