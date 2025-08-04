/*
 * Markt.de DM Bot - Automated Direct Messaging
 * 
 * This bot logs into markt.de and sends direct messages to target accounts
 * from the scraped target_accounts.csv file.
 * 
 * Features:
 * - Automatic login with session cookie management
 * - Tracks contacted accounts to avoid duplicates
 * - Sends personalized DMs to target accounts
 * - Robust error handling and retry logic
 * - Cookie consent handling
 * - Progress tracking and logging
 * 
 * Installation:
 * npm install playwright
 * npx playwright install chromium
 * 
 * Usage:
 * node marktde/markt-de-dm-bot.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    // Login credentials
    loginUrl: 'https://www.markt.de/nichtangemeldet.htm',
    email: 'jodie@kodo-marketing.de',
    password: 'PW%xZ,kjb5CF_R*',

    // DM content
    dmMessage: 'Hey ich habe gesehen, dass du einer Freundin von mir auch folgst 🫣 Falls du mich auch ganz süß findestund mich kennenlerenen willst schreib mir doch auf Telegram @',

    // File paths
    targetAccountsFile: './marktde/target_accounts.csv',
    contactedAccountsFile: './marktde/contacted_accounts.csv',
    
    // Delays (in milliseconds)
    delays: {
        pageLoad: 3000,
        afterLogin: 5000,
        beforeDM: 2000,
        afterDM: 3000,
        betweenAccounts: 5000,
        cookieConsent: 1500,
        typing: 100 // Delay between keystrokes for natural typing
    },

    // Limits
    limits: {
        maxAccountsPerSession: 50, // Maximum accounts to contact per session
        loginTimeout: 30000,
        dmTimeout: 15000,
        navigationTimeout: 30000
    },

    // Selectors
    selectors: {
        // Login form
        emailInput: '#clsy-login-username',
        passwordInput: '#clsy-login-password',
        rememberMeCheckbox: '#clsy-login-rememberme',
        loginButton: 'button[type="submit"]:has-text("Anmelden")',
        
        // DM functionality
        dmButton: '.clsy-profile__toolbar-open-contact-dialog',
        dmTextarea: '#clsy-c-contactPopup-message',
        sendButton: '.clsy-c-contactPopup-submit',
        
        // Cookie consent (from working scraper)
        cookieAccept: [
            'div[role="button"].cmp_button.cmp_button_bg.cmp_button_font_color.cmp-button-accept-all',
            'div.cmp-button-accept-all[role="button"]',
            '.cmp-button-accept-all',
            'div[role="button"]:has-text("AKZEPTIEREN UND WEITER")',
            '[class*="cmp-button-accept-all"]',
            'button:has-text("Akzeptieren")',
            'button:has-text("AKZEPTIEREN UND WEITER")'
        ]
    },

    browser: {
        headless: false, // Set to true to run without GUI
        slowMo: 300,
        viewport: { width: 1280, height: 720 }
    }
};

// Utility functions
class Utils {
    static log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const typeEmoji = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'dm': '💬',
            'login': '🔐'
        };
        
        console.log(`[${timestamp}] DM Bot: ${typeEmoji[type] || 'ℹ️'} ${message}`);
    }

    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static async typeNaturally(page, selector, text) {
        await page.click(selector);
        await page.fill(selector, ''); // Clear first
        
        // Type character by character with small delays
        for (const char of text) {
            await page.type(selector, char, { delay: CONFIG.delays.typing });
        }
    }

    static sanitizeForCSV(text) {
        if (!text) return '';
        
        let sanitized = text.replace(/"/g, '""');
        
        if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')) {
            sanitized = `"${sanitized}"`;
        }
        
        return sanitized;
    }
}

// Account Manager - handles CSV files and tracking
class AccountManager {
    constructor() {
        this.contactedIds = new Set();
        this.targetAccounts = [];
        this.contactedAccounts = [];
        
        this.initializeFiles();
        this.loadData();
    }

    initializeFiles() {
        // Create contacted accounts file if it doesn't exist
        if (!fs.existsSync(CONFIG.contactedAccountsFile)) {
            const header = 'name,ID,link,contacted_timestamp,status,error_message\n';
            fs.writeFileSync(CONFIG.contactedAccountsFile, header);
            Utils.log('Created contacted_accounts.csv');
        }
    }

    loadData() {
        try {
            // Load target accounts
            if (fs.existsSync(CONFIG.targetAccountsFile)) {
                const content = fs.readFileSync(CONFIG.targetAccountsFile, 'utf8');
                const lines = content.split('\n').slice(1).filter(line => line.trim());
                
                this.targetAccounts = lines.map(line => {
                    const parts = this.parseCSVLine(line);
                    if (parts.length >= 3) {
                        return {
                            name: parts[0].replace(/^"|"$/g, ''), // Remove quotes
                            userId: parts[1],
                            link: parts[2].replace(/^"|"$/g, '') // Remove quotes
                        };
                    }
                    return null;
                }).filter(account => account !== null);

                Utils.log(`Loaded ${this.targetAccounts.length} target accounts`);
            } else {
                Utils.log('Target accounts file not found', 'warning');
            }

            // Load already contacted accounts
            if (fs.existsSync(CONFIG.contactedAccountsFile)) {
                const content = fs.readFileSync(CONFIG.contactedAccountsFile, 'utf8');
                const lines = content.split('\n').slice(1).filter(line => line.trim());
                
                lines.forEach(line => {
                    const parts = this.parseCSVLine(line);
                    if (parts.length >= 2) {
                        this.contactedIds.add(parts[1]); // Add userId to contacted set
                    }
                });

                Utils.log(`Loaded ${this.contactedIds.size} already contacted accounts`);
            }

        } catch (error) {
            Utils.log(`Error loading data: ${error.message}`, 'error');
        }
    }

    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }

    getUncontactedAccounts(limit = CONFIG.limits.maxAccountsPerSession) {
        const uncontacted = this.targetAccounts.filter(account => 
            !this.contactedIds.has(account.userId)
        );

        Utils.log(`Found ${uncontacted.length} uncontacted accounts`);
        return uncontacted.slice(0, limit);
    }

    markAsContacted(account, status = 'success', errorMessage = '') {
        this.contactedIds.add(account.userId);
        
        const contactedEntry = {
            name: Utils.sanitizeForCSV(account.name),
            userId: account.userId,
            link: `"${account.link}"`,
            contacted_timestamp: new Date().toISOString(),
            status: status,
            error_message: Utils.sanitizeForCSV(errorMessage)
        };

        // Append to CSV file
        const csvRow = `${contactedEntry.name},${contactedEntry.userId},${contactedEntry.link},${contactedEntry.contacted_timestamp},${contactedEntry.status},${contactedEntry.error_message}\n`;
        fs.appendFileSync(CONFIG.contactedAccountsFile, csvRow);
        
        Utils.log(`Marked ${account.name} as contacted (${status})`, status === 'success' ? 'success' : 'warning');
    }
}

// DM Bot Main Class
class MarktDMBot {
    constructor() {
        this.browser = null;
        this.page = null;
        this.accountManager = new AccountManager();
        this.isLoggedIn = false;
        this.stats = {
            attempted: 0,
            successful: 0,
            failed: 0,
            skipped: 0
        };
    }

    async initialize() {
        Utils.log('🚀 Initializing Markt.de DM Bot...');

        this.browser = await chromium.launch({
            headless: CONFIG.browser.headless,
            slowMo: CONFIG.browser.slowMo
        });

        const context = await this.browser.newContext({
            viewport: CONFIG.browser.viewport
        });

        this.page = await context.newPage();
        Utils.log('✅ Browser initialized');
    }

    async handleCookieConsent() {
        Utils.log('🍪 Checking for cookie consent dialog...');
        
        try {
            await Utils.sleep(CONFIG.delays.cookieConsent);
            
            for (const selector of CONFIG.selectors.cookieAccept) {
                try {
                    const cookieButton = await this.page.$(selector);
                    if (cookieButton) {
                        const isVisible = await cookieButton.isVisible().catch(() => false);
                        if (isVisible) {
                            Utils.log(`🍪 Found cookie consent button: ${selector}`);
                            await cookieButton.click();
                            Utils.log('✅ Cookie consent accepted', 'success');
                            await Utils.sleep(1000);
                            return;
                        }
                    }
                } catch (error) {
                    continue;
                }
            }
            
            Utils.log('ℹ️ No cookie consent dialog found or already accepted');
            
        } catch (error) {
            Utils.log(`⚠️ Error handling cookie consent: ${error.message}`, 'warning');
        }
    }

    async login() {
        Utils.log('🔐 Starting login process...', 'login');

        try {
            // Navigate to login page
            await this.page.goto(CONFIG.loginUrl, { 
                waitUntil: 'networkidle',
                timeout: CONFIG.limits.navigationTimeout 
            });
            
            await Utils.sleep(CONFIG.delays.pageLoad);
            await this.handleCookieConsent();

            // Fill email
            Utils.log('📧 Entering email...');
            await this.page.waitForSelector(CONFIG.selectors.emailInput, { timeout: 10000 });
            await Utils.typeNaturally(this.page, CONFIG.selectors.emailInput, CONFIG.email);

            // Fill password
            Utils.log('🔑 Entering password...');
            await this.page.waitForSelector(CONFIG.selectors.passwordInput, { timeout: 10000 });
            await Utils.typeNaturally(this.page, CONFIG.selectors.passwordInput, CONFIG.password);

            // Check "remember me" box
            Utils.log('☑️ Checking remember me...');
            const rememberMeBox = await this.page.$(CONFIG.selectors.rememberMeCheckbox);
            if (rememberMeBox) {
                const isChecked = await rememberMeBox.isChecked();
                if (!isChecked) {
                    await rememberMeBox.click();
                }
            }

            // Click login button
            Utils.log('🚀 Clicking login button...');
            await this.page.click(CONFIG.selectors.loginButton);

            // Wait for login to complete
            await Utils.sleep(CONFIG.delays.afterLogin);

            // Check if login was successful by looking for login-specific elements disappearing
            const loginForm = await this.page.$(CONFIG.selectors.emailInput);
            if (!loginForm) {
                this.isLoggedIn = true;
                Utils.log('✅ Login successful!', 'success');
                
                // Log session cookies for debugging
                const cookies = await this.page.context().cookies();
                const sessionCookies = cookies.filter(cookie => 
                    cookie.name.includes('ssid') || 
                    cookie.name.includes('rtbh') || 
                    cookie.name.includes('spdt')
                );
                
                if (sessionCookies.length > 0) {
                    Utils.log(`🍪 Session cookies found: ${sessionCookies.map(c => c.name).join(', ')}`, 'login');
                }
                
            } else {
                throw new Error('Login form still visible - login may have failed');
            }

        } catch (error) {
            Utils.log(`❌ Login failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async sendDMToAccount(account) {
        this.stats.attempted++;
        
        try {
            Utils.log(`💬 Sending DM to: ${account.name} (${account.userId})`, 'dm');

            // Navigate to account profile
            await this.page.goto(account.link, { 
                waitUntil: 'networkidle',
                timeout: CONFIG.limits.navigationTimeout 
            });
            
            await Utils.sleep(CONFIG.delays.beforeDM);

            // Click DM button
            Utils.log('📝 Opening DM dialog...');
            await this.page.waitForSelector(CONFIG.selectors.dmButton, { timeout: 10000 });
            await this.page.click(CONFIG.selectors.dmButton);

            // Wait for DM dialog to open
            await this.page.waitForSelector(CONFIG.selectors.dmTextarea, { timeout: 10000 });
            await Utils.sleep(1000);

            // Type message
            Utils.log('✍️ Typing message...');
            await Utils.typeNaturally(this.page, CONFIG.selectors.dmTextarea, CONFIG.dmMessage);

            // Send message
            Utils.log('📤 Sending message...');
            await this.page.click(CONFIG.selectors.sendButton);

            await Utils.sleep(CONFIG.delays.afterDM);

            // Mark as successfully contacted
            this.accountManager.markAsContacted(account, 'success');
            this.stats.successful++;
            
            Utils.log(`✅ DM sent successfully to ${account.name}`, 'success');

        } catch (error) {
            Utils.log(`❌ Failed to send DM to ${account.name}: ${error.message}`, 'error');
            this.accountManager.markAsContacted(account, 'failed', error.message);
            this.stats.failed++;
        }

        await Utils.sleep(CONFIG.delays.betweenAccounts);
    }

    async runDMCampaign() {
        if (!this.isLoggedIn) {
            throw new Error('Not logged in - cannot send DMs');
        }

        const accountsToContact = this.accountManager.getUncontactedAccounts();
        
        if (accountsToContact.length === 0) {
            Utils.log('🎉 No uncontacted accounts found - campaign complete!', 'success');
            return;
        }

        Utils.log(`📋 Starting DM campaign for ${accountsToContact.length} accounts`);

        for (let i = 0; i < accountsToContact.length; i++) {
            const account = accountsToContact[i];
            
            Utils.log(`📊 Progress: ${i + 1}/${accountsToContact.length} - Processing ${account.name}`);
            
            await this.sendDMToAccount(account);
            
            // Progress update every 10 accounts
            if ((i + 1) % 10 === 0) {
                this.printStats();
            }
        }

        Utils.log('🎉 DM campaign completed!', 'success');
        this.printStats();
    }

    printStats() {
        Utils.log('\n📊 === DM CAMPAIGN STATS ===');
        Utils.log(`Attempted: ${this.stats.attempted}`);
        Utils.log(`Successful: ${this.stats.successful}`);
        Utils.log(`Failed: ${this.stats.failed}`);
        Utils.log(`Success Rate: ${this.stats.attempted > 0 ? ((this.stats.successful / this.stats.attempted) * 100).toFixed(1) : 0}%`);
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
            Utils.log('Browser closed');
        }
    }

    async run() {
        try {
            await this.initialize();
            await this.login();
            await this.runDMCampaign();
            
            Utils.log('\n🎉 === DM BOT COMPLETE ===', 'success');
            this.printStats();
            
        } catch (error) {
            Utils.log(`Fatal error: ${error.message}`, 'error');
        } finally {
            await this.cleanup();
        }
    }
}

// Run the bot
if (require.main === module) {
    const bot = new MarktDMBot();
    bot.run().catch(console.error);
}

module.exports = MarktDMBot;
