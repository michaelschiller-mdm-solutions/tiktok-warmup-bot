/*
 * SIMPLE ROBUST DM AUTOMATION - ENHANCED VERSION WITH PREMIUM ACCOUNT INTEGRATION
 * Fixed infinite reload bug and added mobile responsiveness
 * Handles navigation, sends DMs, tracks progress with proper state management
 * NEW: Premium account placeholder support with fallback functionality
 */

console.log('🚀 SIMPLE ROBUST DM AUTOMATION LOADED - ENHANCED VERSION');

// Simple state management using localStorage (survives page reloads)
class SimpleState {
    static save(key, data) {
        try {
            localStorage.setItem(`dm_bot_${key}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Failed to save state:', error);
            return false;
        }
    }

    static load(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(`dm_bot_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Failed to load state:', error);
            return defaultValue;
        }
    }

    static clear(key) {
        try {
            localStorage.removeItem(`dm_bot_${key}`);
            return true;
        } catch (error) {
            console.error('Failed to clear state:', error);
            return false;
        }
    }
}

// Simple DM automation class
class SimpleDMBot {
    constructor() {
        this.campaign = null;
        this.isRunning = false;
        this.isNavigating = false; // Prevent multiple navigation attempts
        this.navigationTimeout = null;
        this.messageTemplate = 'Hey ich habe gesehen, dass du {premium_account1} auch folgst 🫣 Falls du mich auch ganz süß findest und mich kennenlerenen willst schreib mir doch auf Telegrm @xxcherry12 oder auf instagrm @notAnnaFae';
        this.fallbackText = 'einer Freundin von mir';
        this.delay = 8000; // 8 seconds between accounts
        
        // Premium account data
        this.premiumFollowedData = null; // Will store the premium followed relationships
        this.followedAccountsMap = new Map(); // Map of target_account -> array of followed accounts

        this.init();
    }

    init() {
        console.log('🔧 Initializing Simple DM Bot...');

        // Check if we have an ongoing campaign
        this.campaign = SimpleState.load('campaign');

        // Load premium followed data if available
        this.premiumFollowedData = SimpleState.load('premiumFollowedData');
        const savedFollowedMap = SimpleState.load('followedAccountsMap');
        if (savedFollowedMap) {
            this.followedAccountsMap = new Map(savedFollowedMap);
            console.log(`👥 Loaded premium data for ${this.followedAccountsMap.size} accounts`);
        }

        // AUTO-RESUME: If campaign is running, automatically continue
        if (this.campaign && this.campaign.isRunning) {
            console.log('📋 Found ongoing campaign, AUTO-RESUMING...');
            this.isRunning = true;
            
            // Wait a moment for page to fully load, then continue
            setTimeout(() => {
                this.autoResumeAfterPageLoad();
            }, 2000);
        } else {
            console.log('✅ Ready for new campaign');
        }

        this.createUI();
        
        // Add navigation state tracking
        this.trackNavigationState();
    }

    trackNavigationState() {
        // Clear any existing navigation flags on page load
        this.isNavigating = false;
        if (this.navigationTimeout) {
            clearTimeout(this.navigationTimeout);
            this.navigationTimeout = null;
        }
    }

    async autoResumeAfterPageLoad() {
        if (!this.campaign || !this.campaign.isRunning || !this.isRunning) {
            console.log('❌ No active campaign to resume');
            return;
        }

        console.log('🔄 AUTO-RESUMING after page load...');
        this.updateActionStatus('🔄 Auto-resuming campaign...');

        // Check if we're on the correct profile page
        const currentAccount = this.campaign.accounts[this.campaign.currentIndex];
        if (!currentAccount) {
            console.log('✅ No more accounts, completing campaign');
            await this.completeCampaign();
            return;
        }

        console.log(`🔍 Checking if on correct page for: ${currentAccount.name}`);
        
        // Check if this is a private/unavailable account
        if (this.isAccountUnavailable()) {
            console.log(`🔒 Account appears to be private/unavailable: ${currentAccount.name}`);
            this.updateActionStatus(`🔒 Account private/unavailable: ${currentAccount.name}`);
            
            // Mark as failed and move to next
            currentAccount.status = 'private_unavailable';
            this.campaign.stats.failed++;
            this.campaign.currentIndex++;
            this.campaign.stats.processed++;
            
            SimpleState.save('campaign', this.campaign);
            this.updateUI();
            
            // Continue with next account after delay
            console.log(`⏭️ Moving to next account after ${this.delay / 1000} seconds...`);
            await this.sleep(this.delay);
            await this.navigateToNextAccount();
            return;
        }
        
        if (this.isOnCorrectProfilePage(currentAccount)) {
            console.log('✅ On correct page, processing current account');
            try {
                await this.processCurrentAccount();
                
                // After successful processing, move to next account
                this.campaign.currentIndex++;
                this.campaign.stats.processed++;
                SimpleState.save('campaign', this.campaign);
                this.updateUI();
                
                // Continue with next account after delay
                console.log(`⏭️ Moving to next account after ${this.delay / 1000} seconds...`);
                await this.sleep(this.delay);
                await this.navigateToNextAccount();
                
            } catch (error) {
                console.error(`❌ Failed to process ${currentAccount.name}:`, error);
                currentAccount.status = 'failed';
                this.campaign.stats.failed++;
                this.campaign.currentIndex++;
                this.campaign.stats.processed++;
                
                SimpleState.save('campaign', this.campaign);
                this.updateUI();
                
                // Continue with next account even after failure
                console.log(`⏭️ Moving to next account after failure in ${this.delay / 1000} seconds...`);
                await this.sleep(this.delay);
                await this.navigateToNextAccount();
            }
        } else {
            console.log('🔗 Not on correct page, navigating to current account');
            await this.navigateToNextAccount();
        }
    }

    isAccountUnavailable() {
        // Check for common indicators that an account is private or unavailable
        const indicators = [
            'Profil nicht gefunden',
            'Account nicht verfügbar',
            'Dieser Nutzer ist nicht verfügbar',
            'Profil wurde nicht gefunden',
            'Seite nicht gefunden',
            '404',
            'nicht gefunden'
        ];
        
        const pageText = document.body.textContent.toLowerCase();
        const pageTitle = document.title.toLowerCase();
        
        for (const indicator of indicators) {
            if (pageText.includes(indicator.toLowerCase()) || pageTitle.includes(indicator.toLowerCase())) {
                console.log(`🔒 Found unavailable indicator: "${indicator}"`);
                return true;
            }
        }
        
        // Check if the contact button is missing or disabled (might indicate private profile or disabled DMs)
        const dmButton = document.querySelector('a.clsy-profile__toolbar-open-contact-dialog.clsy-c-pwa-toolbar__action.clsy-c-btn.clsy-c-btn--icon');
        if (!dmButton && this.isOnProfilePage()) {
            console.log('🔒 No contact button found on profile page - likely private');
            return true;
        }
        
        if (dmButton && dmButton.classList.contains('clsy-clickable-disabled') && this.isOnProfilePage()) {
            console.log('🔒 Contact button is disabled - user has disabled profile messages');
            return true;
        }
        
        return false;
    }

    createUI() {
        // Remove existing UI if present
        const existingUI = document.getElementById('simple-dm-ui');
        if (existingUI) {
            existingUI.remove();
        }

        const ui = document.createElement('div');
        ui.id = 'simple-dm-ui';
        ui.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                right: 10px;
                width: min(350px, calc(100vw - 20px));
                max-height: calc(100vh - 20px);
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 14px;
                overflow-y: auto;
                overflow-x: hidden;
            ">
                <div style="padding: 15px;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <h3 style="margin: 0; color: #fff; font-size: 16px;">🚀 Simple DM Bot</h3>
                        <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 11px;">Upload CSV → Send DMs → Done!</p>
                    </div>
                    
                    <!-- Automation Status Section -->
                    <div id="automation-status" style="background: rgba(255,255,255,0.15); padding: 12px; border-radius: 8px; margin-bottom: 10px; border: 2px solid rgba(255,255,255,0.3);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <div style="font-weight: bold; font-size: 12px;">🤖 Automation Status</div>
                            <div id="status-indicator" style="width: 12px; height: 12px; border-radius: 50%; background: #666; animation: pulse 2s infinite;"></div>
                        </div>
                        <div id="current-action" style="font-size: 11px; margin-bottom: 4px;">Ready to start</div>
                        <div id="current-url" style="font-size: 10px; opacity: 0.8;">Current: Loading...</div>
                    </div>
                    
                    <!-- CSV Upload Section -->
                    <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold; font-size: 12px;">📁 Upload Target Accounts CSV:</label>
                        <input type="file" id="csv-upload" accept=".csv" style="width: 100%; padding: 6px; border: none; border-radius: 5px; margin-bottom: 8px; font-size: 12px;">
                        <button id="load-csv" style="width: 100%; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px;">📋 Load Target Accounts</button>
                    </div>
                    
                    <!-- Premium Followed Data Upload Section -->
                    <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold; font-size: 12px;">👥 Upload Premium Followed Data CSV:</label>
                        <input type="file" id="premium-csv-upload" accept=".csv" style="width: 100%; padding: 6px; border: none; border-radius: 5px; margin-bottom: 8px; font-size: 12px;">
                        <button id="load-premium-csv" style="width: 100%; padding: 8px; background: #9C27B0; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; font-size: 12px;">👥 Load Premium Data</button>
                        <div id="premium-data-status" style="font-size: 10px; margin-top: 5px; opacity: 0.8;">No premium data loaded</div>
                    </div>
                    
                    <!-- Message Template Section -->
                    <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; margin-bottom: 12px;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <label style="font-weight: bold; font-size: 12px; margin-right: 8px;">💬 Message Template:</label>
                            <div style="position: relative;">
                                <span style="cursor: help; font-size: 14px;" title="Use placeholders: {premium_account1}, {premium_account2}, {premium_account3} - These will be replaced with accounts the target is following. Premium accounts are used first, then regular accounts, then fallback text if none available.">ℹ️</span>
                            </div>
                        </div>
                        <textarea id="message-template" style="width: 100%; height: 60px; padding: 6px; border: none; border-radius: 5px; resize: vertical; font-size: 11px;" placeholder="Your DM message with placeholders like {premium_account1}...">${this.messageTemplate}</textarea>
                        <div style="font-size: 9px; opacity: 0.7; margin-top: 4px;">💡 Use: {premium_account1}, {premium_account2}, {premium_account3}</div>
                    </div>
                    
                    <!-- Fallback Text Section -->
                    <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold; font-size: 12px;">🔄 Fallback Text:</label>
                        <input type="text" id="fallback-text" style="width: 100%; padding: 6px; border: none; border-radius: 5px; font-size: 11px;" placeholder="Text to use when no followed accounts found..." value="${this.fallbackText}">
                        <div style="font-size: 9px; opacity: 0.7; margin-top: 4px;">Used when target has no followed accounts or data not available</div>
                    </div>
                    
                    <!-- Delay Section -->
                    <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 8px; font-weight: bold; font-size: 12px;">⏱️ Delay Between Accounts:</label>
                        <input type="range" id="delay-slider" min="3" max="30" value="8" style="width: 100%; margin-bottom: 5px;">
                        <div style="text-align: center; font-size: 11px;"><span id="delay-value">8</span> seconds</div>
                    </div>
                    
                    <!-- Account Info Section -->
                    <div id="account-info" style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 10px; margin-bottom: 12px; display: none;">
                        <div style="font-weight: bold; margin-bottom: 8px; font-size: 12px;">📊 Campaign Status:</div>
                        <div id="progress-info" style="font-size: 11px;">No accounts loaded</div>
                        <div id="premium-stats" style="font-size: 10px; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2);">
                            <div>👥 Premium data: <span id="premium-coverage">Not loaded</span></div>
                        </div>
                    </div>
                    
                    <!-- Control Buttons -->
                    <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <button id="start-campaign" style="flex: 1; padding: 10px; background: #FF6B6B; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px;" disabled>🚀 START</button>
                        <button id="stop-campaign" style="flex: 1; padding: 10px; background: #FFA500; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px;" disabled>⏹️ STOP</button>
                    </div>
                    
                    <!-- Manual Controls -->
                    <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                        <button id="process-current" style="flex: 1; padding: 8px; background: #9C27B0; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 10px;" disabled>📤 Process Current</button>
                        <button id="skip-current" style="flex: 1; padding: 8px; background: #607D8B; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 10px;" disabled>⏭️ Skip</button>
                    </div>
                    
                    <!-- Emergency Controls -->
                    <div style="display: flex; gap: 8px;">
                        <button id="clear-state" style="flex: 1; padding: 6px; background: #F44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 10px;">🗑️ Clear State</button>
                        <button id="resume-campaign" style="flex: 1; padding: 6px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 10px;" disabled>🔄 Resume</button>
                    </div>
                    
                    <div style="margin-top: 10px; text-align: center; font-size: 9px; opacity: 0.8;">
                        Fixed: No More Infinite Loops!
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(ui);
        this.setupEventListeners();
        this.updateUI();
        this.updateDebugInfo();
    }

    setupEventListeners() {
        document.getElementById('load-csv').onclick = () => this.loadCSV();
        document.getElementById('load-premium-csv').onclick = () => this.loadPremiumCSV();
        document.getElementById('start-campaign').onclick = () => this.startCampaign();
        document.getElementById('stop-campaign').onclick = () => this.stopCampaign();
        document.getElementById('process-current').onclick = () => this.processCurrentAccount();
        document.getElementById('skip-current').onclick = () => this.skipCurrentAccount();
        document.getElementById('clear-state').onclick = () => this.clearState();
        document.getElementById('resume-campaign').onclick = () => this.resumeCampaign();

        const delaySlider = document.getElementById('delay-slider');
        const delayValue = document.getElementById('delay-value');

        delaySlider.oninput = () => {
            this.delay = parseInt(delaySlider.value) * 1000;
            delayValue.textContent = delaySlider.value;
        };

        const messageTemplate = document.getElementById('message-template');
        messageTemplate.onchange = () => {
            this.messageTemplate = messageTemplate.value;
        };

        const fallbackText = document.getElementById('fallback-text');
        fallbackText.onchange = () => {
            this.fallbackText = fallbackText.value;
        };
    }

    updateDebugInfo() {
        const currentUrlEl = document.getElementById('current-url');
        const currentActionEl = document.getElementById('current-action');
        const statusIndicatorEl = document.getElementById('status-indicator');
        
        if (currentUrlEl) {
            currentUrlEl.textContent = `Current: ${window.location.href.substring(0, 50)}...`;
        }
        
        if (currentActionEl && statusIndicatorEl) {
            let action = 'Ready to start';
            let indicatorColor = '#666';
            let indicatorAnimation = 'none';
            
            if (this.isNavigating) {
                action = '🔗 Navigating to next account...';
                indicatorColor = '#FFA500';
                indicatorAnimation = 'pulse 1s infinite';
            } else if (this.isRunning) {
                const currentAccount = this.campaign?.accounts[this.campaign?.currentIndex];
                if (currentAccount) {
                    action = `📤 Processing: ${currentAccount.name}`;
                } else {
                    action = '🚀 Campaign running...';
                }
                indicatorColor = '#4CAF50';
                indicatorAnimation = 'pulse 2s infinite';
            } else if (this.campaign && this.campaign.isRunning) {
                action = '⏸️ Campaign paused - Use Resume';
                indicatorColor = '#FF9800';
                indicatorAnimation = 'pulse 3s infinite';
            }
            
            currentActionEl.textContent = action;
            statusIndicatorEl.style.background = indicatorColor;
            statusIndicatorEl.style.animation = indicatorAnimation;
        }
    }

    updateActionStatus(message) {
        const currentActionEl = document.getElementById('current-action');
        if (currentActionEl) {
            currentActionEl.textContent = message;
        }
        console.log(`🤖 ${message}`);
    }

    async loadCSV() {
        const fileInput = document.getElementById('csv-upload');
        const file = fileInput.files[0];

        if (!file) {
            alert('❌ Please select a CSV file first!');
            return;
        }

        try {
            console.log('📋 Loading target accounts CSV file...');
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());

            // Parse CSV (skip header if present) - Handle quoted fields properly
            const accounts = lines.map((line, index) => {
                // Skip header row if it contains 'name' or 'link'
                if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('link'))) {
                    return null;
                }
                
                const fields = this.parseCSVLine(line);
                const name = fields[0] || `Account_${index + 1}`;
                const id = fields[1] || `unknown_${index + 1}`;
                const link = fields[2] || '';
                
                console.log(`📋 Parsed target account: "${name}", ID: ${id}, Link: ${link}`);
                
                return {
                    name: name,
                    userId: id,
                    link: link,
                    status: 'pending'
                };
            }).filter(account => account && account.link && account.link.includes('markt.de'));

            if (accounts.length === 0) {
                alert('❌ No valid markt.de accounts found in CSV!');
                return;
            }

            // Initialize campaign
            this.campaign = {
                accounts: accounts,
                currentIndex: 0,
                isRunning: false,
                isPaused: false,
                stats: {
                    total: accounts.length,
                    processed: 0,
                    successful: 0,
                    failed: 0
                }
            };

            SimpleState.save('campaign', this.campaign);

            console.log(`✅ Loaded ${accounts.length} target accounts`);
            alert(`✅ Loaded ${accounts.length} target accounts successfully!`);

            this.updateUI();

        } catch (error) {
            console.error('❌ Error loading target accounts CSV:', error);
            alert('❌ Error loading target accounts CSV file. Please check the format.');
        }
    }

    async loadPremiumCSV() {
        const fileInput = document.getElementById('premium-csv-upload');
        const file = fileInput.files[0];

        if (!file) {
            alert('❌ Please select a premium followed data CSV file first!');
            return;
        }

        try {
            console.log('👥 Loading premium followed data CSV file...');
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());

            // Parse premium followed data CSV
            const followedData = [];
            this.followedAccountsMap.clear();

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Skip header row
                if (i === 0 && line.toLowerCase().includes('target_account')) {
                    continue;
                }
                
                try {
                    const fields = this.parseCSVLine(line);
                    if (fields.length < 5) {
                        console.log(`⚠️ Skipping line ${i + 1} with insufficient fields (${fields.length}): ${line.substring(0, 100)}...`);
                        continue;
                    }
                    
                    const targetAccount = fields[0]?.trim();
                    const targetAccountId = fields[1]?.trim();
                    const followedAccount = fields[2]?.trim();
                    const followedAccountId = fields[3]?.trim();
                    const isPremium = fields[4]?.trim() === 'true';
                    
                    // Validate required fields
                    if (!targetAccount || !followedAccount) {
                        console.log(`⚠️ Skipping line ${i + 1} with empty required fields: target="${targetAccount}", followed="${followedAccount}"`);
                        continue;
                    }
                
                    // Skip entries with NO_FOLLOWS
                    if (followedAccount === 'NO_FOLLOWS') {
                        continue;
                    }
                    
                    const followedEntry = {
                        targetAccount,
                        targetAccountId,
                        followedAccount,
                        followedAccountId,
                        isPremium
                    };
                    
                    // Only log first few entries to avoid spam
                    if (followedData.length < 5) {
                        console.log(`👥 Parsed premium relationship: "${targetAccount}" follows "${followedAccount}" (premium: ${isPremium})`);
                    }
                    
                    followedData.push(followedEntry);
                    
                    // Build map for quick lookup
                    if (!this.followedAccountsMap.has(targetAccount)) {
                        this.followedAccountsMap.set(targetAccount, []);
                    }
                    this.followedAccountsMap.get(targetAccount).push(followedEntry);
                    
                } catch (lineError) {
                    console.error(`❌ Error parsing line ${i + 1}: ${lineError.message}`);
                    console.log(`📄 Problematic line: ${line}`);
                    continue;
                }
            }

            this.premiumFollowedData = followedData;
            
            // Save to localStorage
            SimpleState.save('premiumFollowedData', this.premiumFollowedData);
            SimpleState.save('followedAccountsMap', Array.from(this.followedAccountsMap.entries()));

            console.log(`✅ Loaded ${followedData.length} followed relationships for ${this.followedAccountsMap.size} target accounts`);
            
            // Show summary of premium data
            const premiumCount = followedData.filter(f => f.isPremium).length;
            const regularCount = followedData.filter(f => !f.isPremium).length;
            console.log(`👥 Premium data summary: ${premiumCount} premium, ${regularCount} regular relationships`);
            console.log(`👥 Target accounts with data: ${Array.from(this.followedAccountsMap.keys()).slice(0, 10).join(', ')}${this.followedAccountsMap.size > 10 ? ` and ${this.followedAccountsMap.size - 10} more` : ''}`);
            
            // Update UI status
            const statusEl = document.getElementById('premium-data-status');
            if (statusEl) {
                statusEl.textContent = `✅ ${followedData.length} relationships loaded for ${this.followedAccountsMap.size} accounts`;
                statusEl.style.color = '#4CAF50';
            }

            alert(`✅ Loaded premium data: ${followedData.length} relationships for ${this.followedAccountsMap.size} accounts!`);

            this.updateUI();

        } catch (error) {
            console.error('❌ Error loading premium followed data CSV:', error);
            alert('❌ Error loading premium followed data CSV file. Please check the format.');
            
            const statusEl = document.getElementById('premium-data-status');
            if (statusEl) {
                statusEl.textContent = '❌ Failed to load premium data';
                statusEl.style.color = '#F44336';
            }
        }
    }

    async startCampaign() {
        if (!this.campaign || this.campaign.accounts.length === 0) {
            alert('❌ Please load a CSV file first!');
            return;
        }

        if (this.isRunning) {
            alert('❌ Campaign is already running!');
            return;
        }

        console.log('🚀 Starting campaign...');
        this.campaign.isRunning = true;
        this.isRunning = true;

        SimpleState.save('campaign', this.campaign);
        this.updateUI();
        this.updateDebugInfo();

        // Start processing
        await this.processCampaign();
    }

    async stopCampaign() {
        console.log('⏹️ Stopping campaign...');
        this.campaign.isRunning = false;
        this.isRunning = false;
        this.isNavigating = false;

        if (this.navigationTimeout) {
            clearTimeout(this.navigationTimeout);
            this.navigationTimeout = null;
        }

        SimpleState.save('campaign', this.campaign);
        this.updateUI();
        this.updateDebugInfo();
    }

    async resumeCampaign() {
        if (!this.campaign || !this.campaign.isRunning) {
            alert('❌ No campaign to resume!');
            return;
        }

        console.log('🔄 Manually resuming campaign...');
        this.isRunning = true;
        this.updateUI();
        this.updateDebugInfo();

        // Check if we're on the correct profile page
        const currentAccount = this.campaign.accounts[this.campaign.currentIndex];
        if (currentAccount && this.isOnCorrectProfilePage(currentAccount)) {
            console.log('✅ On correct page, processing current account');
            await this.processCurrentAccount();
        } else {
            console.log('🔗 Not on correct page, navigating to next account');
            await this.navigateToNextAccount();
        }
    }

    async skipCurrentAccount() {
        if (!this.campaign || this.campaign.currentIndex >= this.campaign.accounts.length) {
            alert('❌ No account to skip!');
            return;
        }

        const account = this.campaign.accounts[this.campaign.currentIndex];
        console.log(`⏭️ Skipping account: ${account.name}`);
        
        account.status = 'skipped';
        this.campaign.currentIndex++;
        this.campaign.stats.processed++;

        SimpleState.save('campaign', this.campaign);
        this.updateUI();

        if (this.isRunning) {
            await this.navigateToNextAccount();
        }
    }

    clearState() {
        if (confirm('🗑️ Clear all campaign data? This cannot be undone!')) {
            SimpleState.clear('campaign');
            SimpleState.clear('premiumFollowedData');
            SimpleState.clear('followedAccountsMap');
            
            this.campaign = null;
            this.premiumFollowedData = null;
            this.followedAccountsMap.clear();
            this.isRunning = false;
            this.isNavigating = false;
            
            if (this.navigationTimeout) {
                clearTimeout(this.navigationTimeout);
                this.navigationTimeout = null;
            }
            
            this.updateUI();
            this.updateDebugInfo();
            console.log('🗑️ State cleared');
        }
    }



    // Process message template with premium account placeholders
    processMessageTemplate(targetAccountName, messageTemplate) {
        let processedMessage = messageTemplate;
        
        console.log(`🔍 Looking up premium data for target: "${targetAccountName}"`);
        console.log(`🔍 Available targets in map:`, Array.from(this.followedAccountsMap.keys()));
        
        // Get followed accounts for this target
        const followedAccounts = this.followedAccountsMap.get(targetAccountName) || [];
        
        if (followedAccounts.length === 0) {
            console.log(`👥 No followed accounts found for "${targetAccountName}", using fallback text`);
            // Replace all placeholders with fallback text
            processedMessage = processedMessage
                .replace(/{premium_account1}/g, this.fallbackText)
                .replace(/{premium_account2}/g, this.fallbackText)
                .replace(/{premium_account3}/g, this.fallbackText);
            return processedMessage;
        }

        // Separate premium and regular accounts
        const premiumAccounts = followedAccounts.filter(acc => acc.isPremium);
        const regularAccounts = followedAccounts.filter(acc => !acc.isPremium);
        
        console.log(`👥 Found ${premiumAccounts.length} premium and ${regularAccounts.length} regular followed accounts for ${targetAccountName}`);

        // Create a pool of accounts to use (premium first, then regular)
        const accountPool = [...premiumAccounts, ...regularAccounts];
        
        // Shuffle the pool for randomness
        for (let i = accountPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [accountPool[i], accountPool[j]] = [accountPool[j], accountPool[i]];
        }

        // Process each placeholder
        const placeholders = ['premium_account1', 'premium_account2', 'premium_account3'];
        const usedAccounts = new Set(); // Prevent using the same account twice
        
        for (let i = 0; i < placeholders.length; i++) {
            const placeholder = placeholders[i];
            const regex = new RegExp(`{${placeholder}}`, 'g');
            
            if (processedMessage.includes(`{${placeholder}}`)) {
                // Find an unused account from the pool
                let selectedAccount = null;
                for (const account of accountPool) {
                    if (!usedAccounts.has(account.followedAccount)) {
                        selectedAccount = account;
                        usedAccounts.add(account.followedAccount);
                        break;
                    }
                }
                
                const replacementText = selectedAccount ? selectedAccount.followedAccount : this.fallbackText;
                processedMessage = processedMessage.replace(regex, replacementText);
                
                console.log(`👥 Replaced {${placeholder}} with: ${replacementText} (${selectedAccount ? (selectedAccount.isPremium ? 'premium' : 'regular') : 'fallback'})`);
            }
        }

        return processedMessage;
    }

    async navigateToNextAccount() {
        if (this.isNavigating) {
            console.log('🔄 Already navigating, skipping...');
            return;
        }

        if (!this.campaign || this.campaign.currentIndex >= this.campaign.accounts.length) {
            console.log('✅ No more accounts to process');
            await this.completeCampaign();
            return;
        }

        const account = this.campaign.accounts[this.campaign.currentIndex];
        console.log(`🔗 Navigating to account ${this.campaign.currentIndex + 1}/${this.campaign.accounts.length}: ${account.name}`);
        console.log(`🔗 Target URL: ${account.link}`);

        // Set navigation flag to prevent multiple attempts
        this.isNavigating = true;
        this.updateDebugInfo();

        // Save current state before navigation
        SimpleState.save('campaign', this.campaign);

        // Set timeout to clear navigation flag if navigation fails
        this.navigationTimeout = setTimeout(() => {
            console.log('⚠️ Navigation timeout, clearing flag');
            this.isNavigating = false;
            this.updateDebugInfo();
        }, 10000); // 10 second timeout

        // Navigate directly to the account URL
        window.location.href = account.link;
    }

    async processCampaign() {
        while (this.isRunning && this.campaign.currentIndex < this.campaign.accounts.length) {
            const account = this.campaign.accounts[this.campaign.currentIndex];

            console.log(`📧 Processing account ${this.campaign.currentIndex + 1}/${this.campaign.accounts.length}: ${account.name}`);
            console.log(`🔗 Target URL: ${account.link}`);
            console.log(`🌐 Current URL: ${window.location.href}`);

            try {
                // If we're not on the right profile page, navigate to it
                if (!this.isOnCorrectProfilePage(account)) {
                    console.log(`🔗 Not on correct page, navigating to: ${account.link}`);
                    await this.navigateToNextAccount();
                    return; // Navigation will reload page and resume
                }

                console.log(`✅ On correct page: ${account.link}`);

                // Process current account
                await this.processCurrentAccount();

            } catch (error) {
                console.error(`❌ Failed to process ${account.name}:`, error);
                this.campaign.accounts[this.campaign.currentIndex].status = 'failed';
                this.campaign.stats.failed++;
                
                // CRITICAL: Continue to next account even if current one fails
                console.log(`⏭️ Moving to next account after failure...`);
            }

            // Always move to next account (whether success or failure)
            this.campaign.currentIndex++;
            this.campaign.stats.processed++;

            SimpleState.save('campaign', this.campaign);
            this.updateUI();

            // Check if campaign is complete
            if (this.campaign.currentIndex >= this.campaign.accounts.length) {
                await this.completeCampaign();
                return;
            }

            // Wait before next account
            console.log(`⏱️ Waiting ${this.delay / 1000} seconds before next account...`);
            await this.sleep(this.delay);
        }
    }

    async processCurrentAccount() {
        if (!this.campaign || this.campaign.currentIndex >= this.campaign.accounts.length) {
            console.log('❌ No current account to process');
            return;
        }

        const account = this.campaign.accounts[this.campaign.currentIndex];

        console.log(`📤 Sending DM to ${account.name}...`);
        console.log(`🌐 Current URL: ${window.location.href}`);
        console.log(`📊 Campaign progress: ${this.campaign.currentIndex + 1}/${this.campaign.accounts.length}`);

        try {
            // Step 1: Wait for page to load
            this.updateActionStatus('⏱️ Waiting for page to load...');
            await this.sleep(3000);
            
            // Debug: Check page state
            console.log(`📋 Page title: ${document.title}`);
            console.log(`📋 Page ready state: ${document.readyState}`);
            console.log(`📋 Profile elements found: ${document.querySelectorAll('.clsy-profile__toolbar-open-contact-dialog').length}`);

            // Step 2: Find and click the "Nachricht" button with multiple strategies
            this.updateActionStatus('🔍 Looking for Nachricht button...');
            const dmButton = await this.findDMButtonRobust();
            
            if (!dmButton) {
                throw new Error('Nachricht button not found with any detection strategy');
            }

            // Check if the button is disabled (user has disabled profile messages)
            if (dmButton.classList.contains('clsy-clickable-disabled')) {
                const errorMessage = dmButton.getAttribute('data-error-message');
                let reason = 'User has disabled profile messages';
                
                if (errorMessage) {
                    try {
                        const parsed = JSON.parse(errorMessage.replace(/&quot;/g, '"'));
                        reason = parsed.plain || reason;
                    } catch (e) {
                        // Use default reason if parsing fails
                    }
                }
                
                throw new Error(`Cannot send DM: ${reason}`);
            }

            this.updateActionStatus('✅ Found active Nachricht button, clicking...');
            
            // Scroll button into view to ensure it's clickable
            dmButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await this.sleep(500); // Wait for scroll to complete
            
            // Try clicking with multiple methods
            try {
                dmButton.click();
            } catch (clickError) {
                console.log('⚠️ Regular click failed, trying alternative methods...');
                
                // Alternative click method 1: Dispatch click event
                try {
                    dmButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                } catch (dispatchError) {
                    // Alternative click method 2: Focus and trigger
                    dmButton.focus();
                    dmButton.click();
                }
            }

            // Step 3: Wait for modal to load
            this.updateActionStatus('⏱️ Waiting for modal to load...');
            await this.sleep(3000);

            // Step 4: Find the exact textarea and enter text
            this.updateActionStatus('🔍 Looking for message textarea...');
            const textarea = document.querySelector('textarea#clsy-c-contactPopup-message.clsy-c-form__smartLabeledField');
            if (!textarea) {
                throw new Error('Message textarea not found with exact selector');
            }

            this.updateActionStatus('✅ Found textarea, processing message template...');
            
            // Process message template with premium account placeholders
            const processedMessage = this.processMessageTemplate(account.name, this.messageTemplate);
            console.log(`💬 Original message: ${this.messageTemplate}`);
            console.log(`💬 Processed message: ${processedMessage}`);
            
            textarea.value = processedMessage;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));

            // Step 5: Wait a moment then find and click send button
            await this.sleep(1000);

            this.updateActionStatus('🔍 Looking for send button...');
            const sendButton = document.querySelector('button.clsy-c-contactPopup-submit.clsy-c-btn.clsy-c-btn--cta.clsy-c-prevent-double-click');
            if (!sendButton) {
                throw new Error('Send button not found with exact selector');
            }

            this.updateActionStatus('✅ Found send button, clicking...');
            sendButton.click();

            // Step 6: Wait 1.5 seconds as specified
            this.updateActionStatus('⏱️ Waiting 1.5 seconds after sending...');
            await this.sleep(1500);

            // Mark as successful
            account.status = 'contacted';
            this.campaign.stats.successful++;

            this.updateActionStatus(`✅ Successfully sent DM to ${account.name}`);
            console.log(`✅ Successfully sent DM to ${account.name}`);

        } catch (error) {
            this.updateActionStatus(`❌ Failed to send DM to ${account.name}`);
            console.error(`❌ Failed to send DM to ${account.name}:`, error);
            account.status = 'failed';
            this.campaign.stats.failed++;
            throw error;
        }
    }


    isOnProfilePage() {
        return window.location.pathname.includes('/userId,') ||
            window.location.pathname.includes('/profil/') ||
            document.querySelector('.clsy-profile__toolbar-open-contact-dialog') !== null;
    }

    isOnCorrectProfilePage(account) {
        // More flexible URL matching to handle redirects and variations
        const currentUrl = window.location.href;
        const targetUrl = account.link;
        
        console.log(`🔍 URL Comparison:`);
        console.log(`   Current: "${currentUrl}"`);
        console.log(`   Target:  "${targetUrl}"`);
        
        // Exact match first
        if (currentUrl === targetUrl) {
            console.log(`   ✅ Exact match`);
            return true;
        }
        
        // Extract user ID from both URLs for comparison
        const currentUserId = this.extractUserIdFromUrl(currentUrl);
        const targetUserId = this.extractUserIdFromUrl(targetUrl);
        
        console.log(`   Current ID: "${currentUserId}"`);
        console.log(`   Target ID:  "${targetUserId}"`);
        
        if (currentUserId && targetUserId && currentUserId === targetUserId) {
            console.log(`   ✅ User ID match`);
            return true;
        }
        
        console.log(`   ❌ No match`);
        return false;
    }

    extractUserIdFromUrl(url) {
        // Extract user ID from markt.de URLs
        const match = url.match(/userId,(\d+)/);
        return match ? match[1] : null;
    }

    async completeCampaign() {
        console.log('🎉 Campaign completed!');

        this.campaign.isRunning = false;
        this.isRunning = false;
        this.isNavigating = false;

        if (this.navigationTimeout) {
            clearTimeout(this.navigationTimeout);
            this.navigationTimeout = null;
        }

        const { successful, failed, total } = this.campaign.stats;

        alert(`🎉 Campaign completed!\n\n✅ Successful: ${successful}\n❌ Failed: ${failed}\n📊 Total: ${total}`);

        SimpleState.clear('campaign');
        this.campaign = null;
        this.updateUI();
        this.updateDebugInfo();
    }

    updateUI() {
        const accountInfo = document.getElementById('account-info');
        const progressInfo = document.getElementById('progress-info');
        const premiumStats = document.getElementById('premium-coverage');
        const startButton = document.getElementById('start-campaign');
        const stopButton = document.getElementById('stop-campaign');
        const processCurrentButton = document.getElementById('process-current');
        const skipCurrentButton = document.getElementById('skip-current');
        const resumeButton = document.getElementById('resume-campaign');

        if (!this.campaign) {
            accountInfo.style.display = 'none';
            startButton.disabled = true;
            stopButton.disabled = true;
            processCurrentButton.disabled = true;
            skipCurrentButton.disabled = true;
            resumeButton.disabled = true;
            return;
        }

        accountInfo.style.display = 'block';

        const { stats, currentIndex, accounts } = this.campaign;
        const currentAccount = accounts[currentIndex];

        progressInfo.innerHTML = `
            <div style="margin-bottom: 6px;">
                <strong>Progress:</strong> ${stats.processed}/${stats.total} accounts
            </div>
            <div style="margin-bottom: 6px;">
                <strong>Success:</strong> ${stats.successful} | <strong>Failed:</strong> ${stats.failed}
            </div>
            ${currentAccount ? `<div style="margin-bottom: 6px;"><strong>Current:</strong> ${currentAccount.name}</div>` : ''}
            <div style="background: rgba(255,255,255,0.2); border-radius: 10px; height: 6px; margin-top: 6px;">
                <div style="background: #4CAF50; height: 100%; border-radius: 10px; width: ${(stats.processed / stats.total) * 100}%;"></div>
            </div>
        `;

        // Update premium data statistics
        if (premiumStats) {
            if (this.followedAccountsMap.size > 0) {
                // Calculate how many target accounts have premium data
                let accountsWithData = 0;
                let totalPremiumAccounts = 0;
                let totalRegularAccounts = 0;
                
                for (const targetAccount of accounts) {
                    const followedAccounts = this.followedAccountsMap.get(targetAccount.name) || [];
                    if (followedAccounts.length > 0) {
                        accountsWithData++;
                        totalPremiumAccounts += followedAccounts.filter(acc => acc.isPremium).length;
                        totalRegularAccounts += followedAccounts.filter(acc => !acc.isPremium).length;
                    }
                }
                
                const coverage = Math.round((accountsWithData / stats.total) * 100);
                premiumStats.innerHTML = `${accountsWithData}/${stats.total} accounts (${coverage}%) have data<br>
                    <span style="font-size: 9px;">👑 ${totalPremiumAccounts} premium | 👤 ${totalRegularAccounts} regular</span>`;
                premiumStats.style.color = coverage > 50 ? '#4CAF50' : '#FFA500';
            } else {
                premiumStats.textContent = 'No premium data loaded';
                premiumStats.style.color = '#666';
            }
        }

        startButton.disabled = this.isRunning || this.campaign.isRunning;
        stopButton.disabled = !this.isRunning && !this.campaign.isRunning;
        processCurrentButton.disabled = !currentAccount;
        skipCurrentButton.disabled = !currentAccount;
        resumeButton.disabled = !this.campaign.isRunning || this.isRunning;
    }

    // Robust DM button detection with multiple fallback strategies
    async findDMButtonRobust() {
        console.log('🔍 Starting robust DM button detection...');
        
        // Strategy 1: Exact selector (current method)
        let dmButton = document.querySelector('a.clsy-profile__toolbar-open-contact-dialog.clsy-c-pwa-toolbar__action.clsy-c-btn.clsy-c-btn--icon');
        if (dmButton && this.isElementClickable(dmButton)) {
            console.log('✅ Found DM button with exact selector');
            return dmButton;
        }
        
        // Strategy 2: Partial class matching
        dmButton = document.querySelector('a.clsy-profile__toolbar-open-contact-dialog');
        if (dmButton && this.isElementClickable(dmButton)) {
            console.log('✅ Found DM button with partial selector');
            return dmButton;
        }
        
        // Strategy 3: Text-based search
        const allLinks = document.querySelectorAll('a');
        for (const link of allLinks) {
            if (link.textContent.trim().toLowerCase() === 'nachricht' && this.isElementClickable(link)) {
                console.log('✅ Found DM button by text content');
                return link;
            }
        }
        
        // Strategy 4: Wait and retry (maybe page is still loading)
        console.log('⏳ Button not found, waiting 2 seconds and retrying...');
        await this.sleep(2000);
        
        dmButton = document.querySelector('a.clsy-profile__toolbar-open-contact-dialog.clsy-c-pwa-toolbar__action.clsy-c-btn.clsy-c-btn--icon');
        if (dmButton && this.isElementClickable(dmButton)) {
            console.log('✅ Found DM button after retry');
            return dmButton;
        }
        
        // Strategy 5: Look for any button with "nachricht" in class or data attributes
        const allButtons = document.querySelectorAll('a, button');
        for (const button of allButtons) {
            const className = button.className.toLowerCase();
            const dataAttrs = Array.from(button.attributes).map(attr => attr.name + '=' + attr.value).join(' ').toLowerCase();
            
            if ((className.includes('contact') || className.includes('nachricht') || dataAttrs.includes('contact')) 
                && this.isElementClickable(button)) {
                console.log('✅ Found DM button by attribute matching');
                return button;
            }
        }
        
        console.log('❌ No DM button found with any strategy');
        return null;
    }
    
    // Check if element is actually clickable
    isElementClickable(element) {
        if (!element) return false;
        
        // Check if element is visible
        const rect = element.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0 && 
                         window.getComputedStyle(element).visibility !== 'hidden' &&
                         window.getComputedStyle(element).display !== 'none';
        
        // Check if element is not disabled
        const isNotDisabled = !element.classList.contains('clsy-clickable-disabled') &&
                             !element.disabled &&
                             !element.hasAttribute('disabled');
        
        const clickable = isVisible && isNotDisabled;
        
        if (!clickable) {
            console.log(`🔍 Element not clickable: visible=${isVisible}, notDisabled=${isNotDisabled}`);
        }
        
        return clickable;
    }

    // Enhanced CSV parsing that handles URLs with commas and quoted fields
    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                fields.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        // Add the last field
        fields.push(current.trim());
        
        // Remove quotes from fields
        const cleanFields = fields.map(field => {
            if (field.startsWith('"') && field.endsWith('"')) {
                return field.slice(1, -1);
            }
            return field;
        });
        
        return cleanFields;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the bot
const dmBot = new SimpleDMBot();

console.log(`
🚀 SIMPLE ROBUST DM BOT READY - FIXED VERSION!

✅ FIXES APPLIED:
- ❌ No more infinite reload loops
- 📱 Mobile responsive and scrollable UI
- 🔧 Manual controls for stuck situations
- 🔍 Debug info to track state
- ⚡ Better error handling and navigation

✅ Features:
- Upload CSV files with account data
- Automatic navigation between profiles
- Robust DM sending with multiple fallbacks
- Progress tracking and statistics
- Survives page reloads and navigation
- Emergency controls to fix stuck states

📋 How to Use:
1. Upload your CSV file (name,ID,link format)
2. Adjust message template and timing
3. Click "START CAMPAIGN"
4. Use manual controls if needed

🔧 The bot is now ready in the top-right corner!
`);
