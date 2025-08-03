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
          <h4>⚙️ Advanced Settings</h4>
          
          <!-- Daily Limits -->
          <div class="settings-group">
            <h5>📊 Daily Limits</h5>
            <div class="settings-grid">
              <div class="setting-item">
                <label for="follow-limit-input">Daily Follow Limit:</label>
                <input type="number" id="follow-limit-input" min="1" max="200" value="50">
                <span class="tooltip" data-tooltip="Recommended: 20-50 for new accounts, 50-100 for established accounts. Higher limits increase detection risk.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="unfollow-limit-input">Daily Unfollow Limit:</label>
                <input type="number" id="unfollow-limit-input" min="1" max="200" value="50">
                <span class="tooltip" data-tooltip="Should match or be slightly lower than follow limit. Instagram tracks follow/unfollow ratios.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="hourly-limit-input">Hourly Action Limit:</label>
                <input type="number" id="hourly-limit-input" min="1" max="20" value="8">
                <span class="tooltip" data-tooltip="Maximum actions per hour. Recommended: 5-8 to avoid hourly rate limits.">ℹ️</span>
              </div>
            </div>
          </div>

          <!-- Timing Controls -->
          <div class="settings-group">
            <h5>⏱️ Timing Controls</h5>
            <div class="settings-grid">
              <div class="setting-item">
                <label for="min-action-delay-input">Min Action Delay (seconds):</label>
                <input type="number" id="min-action-delay-input" min="30" max="300" value="60">
                <span class="tooltip" data-tooltip="Minimum time between actions. Recommended: 60-90 seconds for safety.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="max-action-delay-input">Max Action Delay (seconds):</label>
                <input type="number" id="max-action-delay-input" min="60" max="600" value="300">
                <span class="tooltip" data-tooltip="Maximum time between actions. Creates natural variation. Recommended: 3-5 minutes.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="unfollow-delay-input">Unfollow Delay (days):</label>
                <input type="number" id="unfollow-delay-input" min="1" max="14" value="3">
                <span class="tooltip" data-tooltip="Days to wait before unfollowing. Recommended: 2-7 days to appear natural.">ℹ️</span>
              </div>
            </div>
          </div>

          <!-- Human Behavior -->
          <div class="settings-group">
            <h5>🎭 Human Behavior</h5>
            <div class="settings-grid">
              <div class="setting-item">
                <label for="scroll-probability-input">Home Scroll Probability (%):</label>
                <input type="number" id="scroll-probability-input" min="0" max="100" value="70">
                <span class="tooltip" data-tooltip="Chance to scroll home feed between actions. Higher = more natural but slower.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="idle-probability-input">Idle Behavior Probability (%):</label>
                <input type="number" id="idle-probability-input" min="0" max="100" value="25">
                <span class="tooltip" data-tooltip="Chance to pause and do nothing (like reading). Mimics human attention patterns.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="scroll-duration-input">Scroll Duration (seconds):</label>
                <input type="number" id="scroll-duration-input" min="5" max="60" value="15">
                <span class="tooltip" data-tooltip="How long to scroll home feed. Recommended: 10-30 seconds.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="idle-duration-input">Idle Duration (seconds):</label>
                <input type="number" id="idle-duration-input" min="5" max="120" value="30">
                <span class="tooltip" data-tooltip="How long to stay idle. Simulates reading/thinking time.">ℹ️</span>
              </div>
            </div>
          </div>

          <!-- Safety Features -->
          <div class="settings-group">
            <h5>🛡️ Safety Features</h5>
            <div class="settings-grid">
              <div class="setting-item">
                <label for="session-break-interval-input">Session Break Interval (minutes):</label>
                <input type="number" id="session-break-interval-input" min="10" max="120" value="30">
                <span class="tooltip" data-tooltip="Take breaks every X minutes. Recommended: 20-45 minutes to avoid detection.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="session-break-duration-input">Session Break Duration (minutes):</label>
                <input type="number" id="session-break-duration-input" min="5" max="60" value="15">
                <span class="tooltip" data-tooltip="How long to pause during breaks. Recommended: 10-30 minutes.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="error-rate-input">Simulated Error Rate (%):</label>
                <input type="number" id="error-rate-input" min="0" max="20" value="5">
                <span class="tooltip" data-tooltip="Chance to simulate human errors (misclicks, etc.). Low rate appears more human.">ℹ️</span>
              </div>
            </div>
          </div>

          <!-- Account Targeting -->
          <div class="settings-group">
            <h5>🎯 Account Targeting</h5>
            <div class="settings-grid">
              <div class="setting-item">
                <label for="profile-visit-probability-input">Profile Visit Probability (%):</label>
                <input type="number" id="profile-visit-probability-input" min="0" max="100" value="30">
                <span class="tooltip" data-tooltip="Chance to visit profile before following. More natural but slower.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="story-view-probability-input">Story View Probability (%):</label>
                <input type="number" id="story-view-probability-input" min="0" max="100" value="15">
                <span class="tooltip" data-tooltip="Chance to view stories before following. Increases engagement authenticity.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="like-posts-probability-input">Like Posts Probability (%):</label>
                <input type="number" id="like-posts-probability-input" min="0" max="100" value="20">
                <span class="tooltip" data-tooltip="Chance to like recent posts before following. Builds engagement history.">ℹ️</span>
              </div>
            </div>
          </div>

          <!-- Queue Management -->
          <div class="settings-group">
            <h5>🔄 Queue Management</h5>
            <div class="settings-grid">
              <div class="setting-item">
                <label for="auto-unfollow-probability-input">Auto-Unfollow Probability (%):</label>
                <input type="number" id="auto-unfollow-probability-input" min="0" max="100" value="20">
                <span class="tooltip" data-tooltip="Chance to automatically schedule unfollow when following someone. Recommended: 15-25%.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="unfollow-delay-min-input">Min Unfollow Delay (days):</label>
                <input type="number" id="unfollow-delay-min-input" min="1" max="14" value="3">
                <span class="tooltip" data-tooltip="Minimum days to wait before unfollowing. Recommended: 2-4 days.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="unfollow-delay-max-input">Max Unfollow Delay (days):</label>
                <input type="number" id="unfollow-delay-max-input" min="2" max="21" value="5">
                <span class="tooltip" data-tooltip="Maximum days to wait before unfollowing. Creates natural variation.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="queue-balance-ratio-input">Follow/Unfollow Ratio (% follows):</label>
                <input type="number" id="queue-balance-ratio-input" min="10" max="90" value="70">
                <span class="tooltip" data-tooltip="Percentage of actions that should be follows vs unfollows. 70% = mostly follows.">ℹ️</span>
              </div>
            </div>
          </div>

          <!-- Follow Tracking -->
          <div class="settings-group">
            <h5>📊 Follow Tracking</h5>
            <div class="settings-grid">
              <div class="setting-item">
                <label for="max-concurrent-follows-input">Max Concurrent Follows:</label>
                <input type="number" id="max-concurrent-follows-input" min="50" max="2000" value="500">
                <span class="tooltip" data-tooltip="Maximum accounts to follow at once. Higher = more aggressive growth.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="unfollow-non-followers-input">Unfollow Non-Followers After (days):</label>
                <input type="number" id="unfollow-non-followers-input" min="0" max="30" value="7">
                <span class="tooltip" data-tooltip="Auto-unfollow accounts that don't follow back. 0 = disabled.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="keep-mutual-follows-input">Keep Mutual Follows:</label>
                <select id="keep-mutual-follows-input">
                  <option value="true">Yes - Keep mutual followers</option>
                  <option value="false">No - Unfollow everyone</option>
                </select>
                <span class="tooltip" data-tooltip="Whether to keep accounts that follow you back permanently.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="track-engagement-input">Track Engagement:</label>
                <select id="track-engagement-input">
                  <option value="true">Yes - Track likes/comments</option>
                  <option value="false">No - Basic tracking only</option>
                </select>
                <span class="tooltip" data-tooltip="Track which followed accounts engage with your content.">ℹ️</span>
              </div>
            </div>
          </div>

          <!-- Advanced Queue Settings -->
          <div class="settings-group">
            <h5>⚙️ Advanced Queue Settings</h5>
            <div class="settings-grid">
              <div class="setting-item">
                <label for="queue-strategy-input">Queue Balancing Strategy:</label>
                <select id="queue-strategy-input">
                  <option value="ratio">Ratio-Based (Recommended)</option>
                  <option value="time">Time-Based Alternating</option>
                  <option value="limit">Daily Limit Based</option>
                  <option value="random">Random Selection</option>
                </select>
                <span class="tooltip" data-tooltip="How to balance follow vs unfollow actions. Ratio-based is most natural.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="priority-unfollows-input">Priority Unfollows:</label>
                <select id="priority-unfollows-input">
                  <option value="true">Yes - Unfollows first</option>
                  <option value="false">No - Balanced approach</option>
                </select>
                <span class="tooltip" data-tooltip="Whether to always prioritize unfollows over follows for cleanup.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="retry-failed-actions-input">Retry Failed Actions:</label>
                <input type="number" id="retry-failed-actions-input" min="0" max="5" value="2">
                <span class="tooltip" data-tooltip="How many times to retry failed follow/unfollow actions.">ℹ️</span>
              </div>
              <div class="setting-item">
                <label for="queue-cleanup-interval-input">Queue Cleanup Interval (hours):</label>
                <input type="number" id="queue-cleanup-interval-input" min="1" max="24" value="6">
                <span class="tooltip" data-tooltip="How often to clean up expired and invalid queue items.">ℹ️</span>
              </div>
            </div>
          </div>

          <button id="save-settings-btn" class="btn btn-secondary">💾 Save All Settings</button>
          <button id="reset-settings-btn" class="btn btn-outline">🔄 Reset to Defaults</button>
        </div>

        <!-- Current Follows Management Section -->
        <div class="section">
          <h4>👥 Current Follows Management</h4>
          
          <div class="follows-stats">
            <div class="stat-item">
              <span class="stat-label">Currently Following:</span>
              <span class="stat-value" id="current-follows-count">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Scheduled for Unfollow:</span>
              <span class="stat-value" id="scheduled-unfollows-count">Loading...</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Mutual Followers:</span>
              <span class="stat-value" id="mutual-followers-count">Loading...</span>
            </div>
          </div>

          <div class="follows-controls">
            <div class="bulk-actions">
              <h5>Bulk Actions</h5>
              <div class="bulk-input-group">
                <input type="number" id="bulk-unfollow-count" placeholder="Number to unfollow" min="1" max="500">
                <select id="bulk-unfollow-criteria">
                  <option value="oldest">Oldest Follows First</option>
                  <option value="non-followers">Non-Followers Only</option>
                  <option value="inactive">Inactive Accounts</option>
                  <option value="random">Random Selection</option>
                </select>
              </div>
              <div class="bulk-buttons">
                <button id="schedule-bulk-unfollow-btn" class="btn btn-secondary">📅 Schedule Bulk Unfollow</button>
                <button id="immediate-bulk-unfollow-btn" class="btn btn-danger">⚡ Immediate Bulk Unfollow</button>
              </div>
            </div>

            <div class="import-export">
              <h5>Import/Export</h5>
              <div class="import-export-buttons">
                <button id="export-follows-btn" class="btn btn-outline">📤 Export Current Follows</button>
                <button id="import-unfollow-list-btn" class="btn btn-outline">📥 Import Unfollow List</button>
                <input type="file" id="import-file-input" accept=".txt,.csv,.json" style="display: none;">
              </div>
            </div>
          </div>

          <div class="follows-list">
            <h5>Recent Follows <button id="refresh-follows-btn" class="btn-small">🔄</button></h5>
            <div id="follows-list-container" class="scrollable-list">
              <div class="loading-message">Loading follows...</div>
            </div>
          </div>
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
    this.sidebar.querySelector('#reset-settings-btn').addEventListener('click', () => {
      if (confirm('Reset all settings to defaults? This cannot be undone.')) {
        this.resetSettings();
      }
    });
    
    // Load saved settings
    this.loadSettings();
    
    // Current follows management
    this.sidebar.querySelector('#refresh-follows-btn').addEventListener('click', () => this.refreshFollowsList());
    this.sidebar.querySelector('#schedule-bulk-unfollow-btn').addEventListener('click', () => this.scheduleBulkUnfollow());
    this.sidebar.querySelector('#immediate-bulk-unfollow-btn').addEventListener('click', () => this.immediateBulkUnfollow());
    this.sidebar.querySelector('#export-follows-btn').addEventListener('click', () => this.exportFollows());
    this.sidebar.querySelector('#import-unfollow-list-btn').addEventListener('click', () => this.importUnfollowList());
    this.sidebar.querySelector('#import-file-input').addEventListener('change', (e) => this.handleImportFile(e));
    
    // Initialize follows management
    this.initializeFollowsManagement();
    
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
    const settings = {
      dailyLimits: {
        follows: parseInt(this.sidebar.querySelector('#follow-limit-input').value),
        unfollows: parseInt(this.sidebar.querySelector('#unfollow-limit-input').value),
        hourlyLimit: parseInt(this.sidebar.querySelector('#hourly-limit-input').value)
      },
      timingLimits: {
        minActionInterval: parseInt(this.sidebar.querySelector('#min-action-delay-input').value) * 1000,
        maxActionInterval: parseInt(this.sidebar.querySelector('#max-action-delay-input').value) * 1000,
        unfollowDelay: parseInt(this.sidebar.querySelector('#unfollow-delay-input').value) * 24 * 60 * 60 * 1000,
        sessionBreakInterval: parseInt(this.sidebar.querySelector('#session-break-interval-input').value) * 60 * 1000,
        sessionBreakDuration: parseInt(this.sidebar.querySelector('#session-break-duration-input').value) * 60 * 1000
      },
      humanBehavior: {
        scrollProbability: parseInt(this.sidebar.querySelector('#scroll-probability-input').value) / 100,
        idleProbability: parseInt(this.sidebar.querySelector('#idle-probability-input').value) / 100,
        scrollDuration: parseInt(this.sidebar.querySelector('#scroll-duration-input').value) * 1000,
        idleDuration: parseInt(this.sidebar.querySelector('#idle-duration-input').value) * 1000,
        errorRate: parseInt(this.sidebar.querySelector('#error-rate-input').value) / 100
      },
      targeting: {
        profileVisitProbability: parseInt(this.sidebar.querySelector('#profile-visit-probability-input').value) / 100,
        storyViewProbability: parseInt(this.sidebar.querySelector('#story-view-probability-input').value) / 100,
        likePostsProbability: parseInt(this.sidebar.querySelector('#like-posts-probability-input').value) / 100
      },
      queueManagement: {
        autoUnfollowProbability: parseInt(this.sidebar.querySelector('#auto-unfollow-probability-input').value) / 100,
        unfollowDelayMin: parseInt(this.sidebar.querySelector('#unfollow-delay-min-input').value) * 24 * 60 * 60 * 1000,
        unfollowDelayMax: parseInt(this.sidebar.querySelector('#unfollow-delay-max-input').value) * 24 * 60 * 60 * 1000,
        queueBalanceRatio: parseInt(this.sidebar.querySelector('#queue-balance-ratio-input').value) / 100,
        queueStrategy: this.sidebar.querySelector('#queue-strategy-input').value,
        priorityUnfollows: this.sidebar.querySelector('#priority-unfollows-input').value === 'true',
        retryFailedActions: parseInt(this.sidebar.querySelector('#retry-failed-actions-input').value),
        queueCleanupInterval: parseInt(this.sidebar.querySelector('#queue-cleanup-interval-input').value) * 60 * 60 * 1000
      },
      followTracking: {
        maxConcurrentFollows: parseInt(this.sidebar.querySelector('#max-concurrent-follows-input').value),
        unfollowNonFollowersAfter: parseInt(this.sidebar.querySelector('#unfollow-non-followers-input').value) * 24 * 60 * 60 * 1000,
        keepMutualFollows: this.sidebar.querySelector('#keep-mutual-follows-input').value === 'true',
        trackEngagement: this.sidebar.querySelector('#track-engagement-input').value === 'true'
      }
    };
    
    this.automationEngine.updateSettings(settings);
    
    // Save to storage
    chrome.storage.local.set({ automationSettings: settings });
    
    // Show confirmation
    const btn = this.sidebar.querySelector('#save-settings-btn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Saved!';
    btn.classList.add('success');
    
    setTimeout(() => {
      btn.textContent = originalText;
      btn.classList.remove('success');
    }, 2000);
  }

  // Reset settings to defaults
  resetSettings() {
    // Reset all inputs to default values
    this.sidebar.querySelector('#follow-limit-input').value = '50';
    this.sidebar.querySelector('#unfollow-limit-input').value = '50';
    this.sidebar.querySelector('#hourly-limit-input').value = '8';
    this.sidebar.querySelector('#min-action-delay-input').value = '60';
    this.sidebar.querySelector('#max-action-delay-input').value = '300';
    this.sidebar.querySelector('#unfollow-delay-input').value = '3';
    this.sidebar.querySelector('#scroll-probability-input').value = '70';
    this.sidebar.querySelector('#idle-probability-input').value = '25';
    this.sidebar.querySelector('#scroll-duration-input').value = '15';
    this.sidebar.querySelector('#idle-duration-input').value = '30';
    this.sidebar.querySelector('#session-break-interval-input').value = '30';
    this.sidebar.querySelector('#session-break-duration-input').value = '15';
    this.sidebar.querySelector('#error-rate-input').value = '5';
    this.sidebar.querySelector('#profile-visit-probability-input').value = '30';
    this.sidebar.querySelector('#story-view-probability-input').value = '15';
    this.sidebar.querySelector('#like-posts-probability-input').value = '20';
    
    // Queue Management defaults
    this.sidebar.querySelector('#auto-unfollow-probability-input').value = '20';
    this.sidebar.querySelector('#unfollow-delay-min-input').value = '3';
    this.sidebar.querySelector('#unfollow-delay-max-input').value = '5';
    this.sidebar.querySelector('#queue-balance-ratio-input').value = '70';
    this.sidebar.querySelector('#queue-strategy-input').value = 'ratio';
    this.sidebar.querySelector('#priority-unfollows-input').value = 'false';
    this.sidebar.querySelector('#retry-failed-actions-input').value = '2';
    this.sidebar.querySelector('#queue-cleanup-interval-input').value = '6';
    
    // Follow Tracking defaults
    this.sidebar.querySelector('#max-concurrent-follows-input').value = '500';
    this.sidebar.querySelector('#unfollow-non-followers-input').value = '7';
    this.sidebar.querySelector('#keep-mutual-follows-input').value = 'true';
    this.sidebar.querySelector('#track-engagement-input').value = 'true';
    
    // Save the reset settings
    this.saveSettings();
    
    // Show confirmation
    const btn = this.sidebar.querySelector('#reset-settings-btn');
    const originalText = btn.textContent;
    btn.textContent = '🔄 Reset!';
    
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }

  // Load settings from storage
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get(['automationSettings']);
      if (result.automationSettings) {
        const settings = result.automationSettings;
        
        // Load daily limits
        if (settings.dailyLimits) {
          this.sidebar.querySelector('#follow-limit-input').value = settings.dailyLimits.follows || 50;
          this.sidebar.querySelector('#unfollow-limit-input').value = settings.dailyLimits.unfollows || 50;
          this.sidebar.querySelector('#hourly-limit-input').value = settings.dailyLimits.hourlyLimit || 8;
        }
        
        // Load timing limits
        if (settings.timingLimits) {
          this.sidebar.querySelector('#min-action-delay-input').value = (settings.timingLimits.minActionInterval || 60000) / 1000;
          this.sidebar.querySelector('#max-action-delay-input').value = (settings.timingLimits.maxActionInterval || 300000) / 1000;
          this.sidebar.querySelector('#unfollow-delay-input').value = (settings.timingLimits.unfollowDelay || 259200000) / (24 * 60 * 60 * 1000);
          this.sidebar.querySelector('#session-break-interval-input').value = (settings.timingLimits.sessionBreakInterval || 1800000) / (60 * 1000);
          this.sidebar.querySelector('#session-break-duration-input').value = (settings.timingLimits.sessionBreakDuration || 900000) / (60 * 1000);
        }
        
        // Load human behavior settings
        if (settings.humanBehavior) {
          this.sidebar.querySelector('#scroll-probability-input').value = (settings.humanBehavior.scrollProbability || 0.7) * 100;
          this.sidebar.querySelector('#idle-probability-input').value = (settings.humanBehavior.idleProbability || 0.25) * 100;
          this.sidebar.querySelector('#scroll-duration-input').value = (settings.humanBehavior.scrollDuration || 15000) / 1000;
          this.sidebar.querySelector('#idle-duration-input').value = (settings.humanBehavior.idleDuration || 30000) / 1000;
          this.sidebar.querySelector('#error-rate-input').value = (settings.humanBehavior.errorRate || 0.05) * 100;
        }
        
        // Load targeting settings
        if (settings.targeting) {
          this.sidebar.querySelector('#profile-visit-probability-input').value = (settings.targeting.profileVisitProbability || 0.3) * 100;
          this.sidebar.querySelector('#story-view-probability-input').value = (settings.targeting.storyViewProbability || 0.15) * 100;
          this.sidebar.querySelector('#like-posts-probability-input').value = (settings.targeting.likePostsProbability || 0.2) * 100;
        }
        
        // Load queue management settings
        if (settings.queueManagement) {
          this.sidebar.querySelector('#auto-unfollow-probability-input').value = (settings.queueManagement.autoUnfollowProbability || 0.2) * 100;
          this.sidebar.querySelector('#unfollow-delay-min-input').value = (settings.queueManagement.unfollowDelayMin || 259200000) / (24 * 60 * 60 * 1000);
          this.sidebar.querySelector('#unfollow-delay-max-input').value = (settings.queueManagement.unfollowDelayMax || 432000000) / (24 * 60 * 60 * 1000);
          this.sidebar.querySelector('#queue-balance-ratio-input').value = (settings.queueManagement.queueBalanceRatio || 0.7) * 100;
          this.sidebar.querySelector('#queue-strategy-input').value = settings.queueManagement.queueStrategy || 'ratio';
          this.sidebar.querySelector('#priority-unfollows-input').value = settings.queueManagement.priorityUnfollows ? 'true' : 'false';
          this.sidebar.querySelector('#retry-failed-actions-input').value = settings.queueManagement.retryFailedActions || 2;
          this.sidebar.querySelector('#queue-cleanup-interval-input').value = (settings.queueManagement.queueCleanupInterval || 21600000) / (60 * 60 * 1000);
        }
        
        // Load follow tracking settings
        if (settings.followTracking) {
          this.sidebar.querySelector('#max-concurrent-follows-input').value = settings.followTracking.maxConcurrentFollows || 500;
          this.sidebar.querySelector('#unfollow-non-followers-input').value = (settings.followTracking.unfollowNonFollowersAfter || 604800000) / (24 * 60 * 60 * 1000);
          this.sidebar.querySelector('#keep-mutual-follows-input').value = settings.followTracking.keepMutualFollows ? 'true' : 'false';
          this.sidebar.querySelector('#track-engagement-input').value = settings.followTracking.trackEngagement ? 'true' : 'false';
        }
      }
    } catch (error) {
      console.log('Could not load settings:', error);
    }
  }

  // Initialize follows management
  async initializeFollowsManagement() {
    // Initialize queue manager if not already done
    if (!this.queueManager) {
      // Load the enhanced queue manager
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('content/enhanced-queue-manager.js');
      document.head.appendChild(script);
      
      // Wait for script to load
      await new Promise((resolve) => {
        script.onload = resolve;
        setTimeout(resolve, 1000); // Fallback timeout
      });
      
      this.queueManager = new EnhancedQueueManager();
    }
    
    // Update statistics
    this.updateFollowsStatistics();
    
    // Load follows list
    this.refreshFollowsList();
    
    // Set up periodic updates
    setInterval(() => {
      this.updateFollowsStatistics();
    }, 30000); // Update every 30 seconds
  }

  // Update follows statistics
  async updateFollowsStatistics() {
    try {
      const stats = this.queueManager ? this.queueManager.getStatistics() : {
        currentFollows: 0,
        scheduledUnfollows: 0,
        mutualFollows: 0
      };
      
      this.sidebar.querySelector('#current-follows-count').textContent = stats.currentFollows || 0;
      this.sidebar.querySelector('#scheduled-unfollows-count').textContent = stats.scheduledUnfollows || 0;
      this.sidebar.querySelector('#mutual-followers-count').textContent = stats.mutualFollows || 0;
      
    } catch (error) {
      console.error('Error updating follows statistics:', error);
    }
  }

  // Refresh follows list
  async refreshFollowsList() {
    const container = this.sidebar.querySelector('#follows-list-container');
    
    try {
      container.innerHTML = '<div class="loading-message">Loading follows...</div>';
      
      if (!this.queueManager) {
        container.innerHTML = '<div class="empty-message">Queue manager not initialized</div>';
        return;
      }
      
      const followedAccounts = Array.from(this.queueManager.followedAccounts.entries());
      
      if (followedAccounts.length === 0) {
        container.innerHTML = '<div class="empty-message">No followed accounts found</div>';
        return;
      }
      
      // Sort by follow date (newest first)
      followedAccounts.sort((a, b) => b[1].followedAt - a[1].followedAt);
      
      // Show only recent 20 follows
      const recentFollows = followedAccounts.slice(0, 20);
      
      const followsHtml = recentFollows.map(([username, data]) => {
        const followDate = new Date(data.followedAt).toLocaleDateString();
        const isScheduled = this.queueManager.isScheduledForUnfollow(username);
        const isMutual = data.isMutual;
        
        let statusClass = 'pending';
        let statusText = 'Following';
        
        if (isMutual) {
          statusClass = 'mutual';
          statusText = 'Mutual';
        } else if (isScheduled) {
          statusClass = 'scheduled';
          statusText = 'Scheduled';
        }
        
        return `
          <div class="follow-item ${statusClass}">
            <div class="follow-username">@${username}</div>
            <div class="follow-date">${followDate}</div>
            <div class="follow-status ${statusClass}">${statusText}</div>
            <div class="follow-actions">
              ${!isScheduled ? `<button class="follow-action-btn unfollow" onclick="window.instagramAutomation.scheduleUnfollow('${username}')" title="Schedule Unfollow">📅</button>` : ''}
              ${isScheduled ? `<button class="follow-action-btn cancel" onclick="window.instagramAutomation.cancelUnfollow('${username}')" title="Cancel Unfollow">❌</button>` : ''}
              <button class="follow-action-btn unfollow" onclick="window.instagramAutomation.immediateUnfollow('${username}')" title="Unfollow Now">⚡</button>
            </div>
          </div>
        `;
      }).join('');
      
      container.innerHTML = followsHtml;
      
    } catch (error) {
      console.error('Error refreshing follows list:', error);
      container.innerHTML = '<div class="empty-message">Error loading follows</div>';
    }
  }

  // Schedule bulk unfollow
  async scheduleBulkUnfollow() {
    try {
      const count = parseInt(this.sidebar.querySelector('#bulk-unfollow-count').value);
      const criteria = this.sidebar.querySelector('#bulk-unfollow-criteria').value;
      
      if (!count || count < 1) {
        alert('Please enter a valid number of accounts to unfollow');
        return;
      }
      
      if (!this.queueManager) {
        alert('Queue manager not initialized');
        return;
      }
      
      const scheduled = this.queueManager.bulkScheduleUnfollows(count, criteria);
      
      alert(`Successfully scheduled ${scheduled.length} accounts for unfollow`);
      
      // Refresh displays
      this.updateFollowsStatistics();
      this.refreshFollowsList();
      
    } catch (error) {
      console.error('Error scheduling bulk unfollow:', error);
      alert('Error scheduling bulk unfollow: ' + error.message);
    }
  }

  // Immediate bulk unfollow
  async immediateBulkUnfollow() {
    try {
      const count = parseInt(this.sidebar.querySelector('#bulk-unfollow-count').value);
      const criteria = this.sidebar.querySelector('#bulk-unfollow-criteria').value;
      
      if (!count || count < 1) {
        alert('Please enter a valid number of accounts to unfollow');
        return;
      }
      
      if (!confirm(`Are you sure you want to immediately unfollow ${count} accounts? This action cannot be undone.`)) {
        return;
      }
      
      if (!this.queueManager) {
        alert('Queue manager not initialized');
        return;
      }
      
      const candidates = this.queueManager.getCandidatesForUnfollow(criteria);
      const toUnfollow = candidates.slice(0, count);
      
      // Add to unfollow queue with immediate scheduling
      toUnfollow.forEach(username => {
        this.queueManager.addToUnfollowQueue(username, Date.now(), 'immediate');
      });
      
      alert(`Added ${toUnfollow.length} accounts to immediate unfollow queue`);
      
      // Refresh displays
      this.updateFollowsStatistics();
      this.refreshFollowsList();
      
    } catch (error) {
      console.error('Error scheduling immediate unfollow:', error);
      alert('Error scheduling immediate unfollow: ' + error.message);
    }
  }

  // Export follows
  async exportFollows() {
    try {
      if (!this.queueManager) {
        alert('Queue manager not initialized');
        return;
      }
      
      const data = this.queueManager.exportFollowedAccounts();
      
      // Create download
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `instagram-follows-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('✅ Follows exported successfully');
      
    } catch (error) {
      console.error('Error exporting follows:', error);
      alert('Error exporting follows: ' + error.message);
    }
  }

  // Import unfollow list
  importUnfollowList() {
    this.sidebar.querySelector('#import-file-input').click();
  }

  // Handle import file
  async handleImportFile(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;
      
      const text = await file.text();
      let usernames = [];
      
      // Parse different file formats
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        usernames = Array.isArray(data) ? data.map(item => 
          typeof item === 'string' ? item : item.username
        ) : [];
      } else {
        // Assume text file with one username per line
        usernames = text.split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);
      }
      
      if (usernames.length === 0) {
        alert('No valid usernames found in file');
        return;
      }
      
      if (!this.queueManager) {
        alert('Queue manager not initialized');
        return;
      }
      
      const imported = this.queueManager.importUnfollowList(usernames);
      
      alert(`Successfully imported ${imported} accounts to unfollow queue`);
      
      // Refresh displays
      this.updateFollowsStatistics();
      this.refreshFollowsList();
      
      // Clear file input
      event.target.value = '';
      
    } catch (error) {
      console.error('Error importing unfollow list:', error);
      alert('Error importing file: ' + error.message);
    }
  }

  // Schedule single unfollow
  scheduleUnfollow(username) {
    try {
      if (!this.queueManager) {
        alert('Queue manager not initialized');
        return;
      }
      
      this.queueManager.addToUnfollowQueue(username, Date.now(), 'manual');
      
      // Refresh displays
      this.updateFollowsStatistics();
      this.refreshFollowsList();
      
      console.log(`📅 Scheduled ${username} for unfollow`);
      
    } catch (error) {
      console.error('Error scheduling unfollow:', error);
    }
  }

  // Cancel scheduled unfollow
  cancelUnfollow(username) {
    try {
      if (!this.queueManager) {
        alert('Queue manager not initialized');
        return;
      }
      
      // Remove from unfollow queue
      this.queueManager.queues.unfollow = this.queueManager.queues.unfollow.filter(
        action => action.username !== username
      );
      
      // Update follow record
      if (this.queueManager.followedAccounts.has(username)) {
        const followRecord = this.queueManager.followedAccounts.get(username);
        followRecord.scheduledUnfollow = null;
        this.queueManager.followedAccounts.set(username, followRecord);
      }
      
      this.queueManager.saveToStorage();
      
      // Refresh displays
      this.updateFollowsStatistics();
      this.refreshFollowsList();
      
      console.log(`❌ Cancelled unfollow for ${username}`);
      
    } catch (error) {
      console.error('Error cancelling unfollow:', error);
    }
  }

  // Immediate unfollow
  immediateUnfollow(username) {
    try {
      if (!confirm(`Are you sure you want to immediately unfollow @${username}?`)) {
        return;
      }
      
      if (!this.queueManager) {
        alert('Queue manager not initialized');
        return;
      }
      
      this.queueManager.addToUnfollowQueue(username, Date.now(), 'immediate');
      
      // Refresh displays
      this.updateFollowsStatistics();
      this.refreshFollowsList();
      
      console.log(`⚡ Added ${username} to immediate unfollow queue`);
      
    } catch (error) {
      console.error('Error scheduling immediate unfollow:', error);
    }
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