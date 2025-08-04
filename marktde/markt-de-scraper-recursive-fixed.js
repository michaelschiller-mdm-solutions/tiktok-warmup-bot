/*
 * Fixed Markt.de Recursive Network Scraper - Multi-Tab Version
 * 
 * This advanced scraper runs 5 browser tabs simultaneously and recursively
 * scrapes through host accounts to build a massive network of accounts.
 * 
 * Key Fixes Applied:
 * - Robust cookie consent handling from working automated scraper
 * - Removed premature timeout-based tab closures
 * - Fixed queue management for proper recursive processing
 * - Added 2-retry system for failed accounts
 * - Improved modal interaction to prevent click interception
 * - Enhanced account extraction logic
 * 
 * Features:
 * - 5 concurrent browser tabs (no premature closures)
 * - Recursive scraping (each host account gets scraped)
 * - No time limits - accounts can take 10+ minutes if needed
 * - 2-retry system for failed accounts
 * - Tracks processed accounts to avoid duplicates
 * - Progressive CSV saving with batch processing
 * - Network effect: exponential account discovery
 * 
 * Installation:
 * npm install playwright
 * npx playwright install chromium
 * 
 * Usage:
 * node markt-de-scraper-recursive-fixed.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    // Starting profile URL
    startingProfileUrl: 'https://www.markt.de/lehrerinpam/userId,23305704/profile.htm',

    // Multi-tab configuration
    concurrentTabs: 10,          // Number of simultaneous browser tabs
    maxDepth: 3,                // Maximum recursion depth (0 = starting profile, 1 = first level hosts, etc.)
    maxAccountsPerLevel: 500,    // Maximum accounts to process per recursion level

    delays: {
        pageLoad: 3000,         // Wait for page to load
        modalLoad: 2000,        // Wait for modal to open
        loadMore: 1200,         // Wait between "Mehr Likes laden" clicks (from working scraper)
        extraction: 300,        // Wait between account extractions (from working scraper)
        betweenModals: 2000,    // Wait between host and target scraping (from working scraper)
        tabDelay: 500,          // Delay between starting new tabs
        cookieConsent: 1500     // Wait for cookie dialog to appear
    },

    limits: {
        maxPaginationClicks: 9999,   // Maximum "Mehr Likes laden" clicks per modal (from working scraper)
        maxAccountsPerModal: 9999,   // Maximum accounts to extract per modal
        navigationTimeout: 30000,   // Page navigation timeout
        maxRetries: 2              // Maximum retries per account
    },

    selectors: {
        hostButton: '.clsy-profile__likes-dialog-i-them',
        targetButton: '.clsy-profile__likes-dialog-they-me',
        modal: '.clsy-c-dialog__body',
        loadMoreButton: '.clsy-c-endlessScrolling--hasMore',
        accountBox: '.clsy-c-userbox',
        closeButton: '.clsy-c-dialog__close, [aria-label="Close"]'
    },

    csv: {
        hostFilename: './marktde/host_accounts.csv',
        targetFilename: './marktde/target_accounts.csv',
        processedFilename: './marktde/processed_accounts.csv',
        queueFilename: './marktde/queue_accounts.csv',
        batchSize: 20  // Save every 20 accounts (from working scraper)
    },

    browser: {
        headless: true,        // Set to true to run without GUI
        slowMo: 500,           // From working scraper
        viewport: { width: 1280, height: 720 }
    }
};

// Utility functions
class Utils {
    static log(message, type = 'info', tabId = null) {
        const timestamp = new Date().toLocaleTimeString();
        const tabPrefix = tabId ? `[Tab${tabId}] ` : '';
        const typeEmoji = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌',
            'network': '🌐'
        };
        
        console.log(`[${timestamp}] ${tabPrefix}Scraper: ${typeEmoji[type] || 'ℹ️'} ${message}`);
    }

    static async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static buildProfileUrl(name, userId) {
        const cleanName = name.replace(/\s+/g, '+').toLowerCase();
        return `https://www.markt.de/${cleanName}/userId,${userId}/profile.htm`;
    }

    static sanitizeForCSV(text) {
        if (!text) return '';
        
        // Remove any existing quotes and escape special characters
        let sanitized = text.replace(/"/g, '""');
        
        // Wrap in quotes if contains comma, newline, or quote
        if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')) {
            sanitized = `"${sanitized}"`;
        }
        
        return sanitized;
    }
}

// CSV Manager Class
class CSVManager {
    constructor() {
        this.processedIds = new Set(); // Only accounts that have been scraped
        this.queuedIds = new Set();
        this.foundIds = new Set(); // Accounts found as host/target to avoid CSV duplicates
        this.pendingAccounts = {
            host: [],
            target: [],
            processed: [],
            queue: []
        };

        this.initializeCSVFiles();
        this.loadExistingData();
    }

    initializeCSVFiles() {
        const files = [
            { path: CONFIG.csv.hostFilename, header: 'name,ID,link\n' },
            { path: CONFIG.csv.targetFilename, header: 'name,ID,link\n' },
            { path: CONFIG.csv.processedFilename, header: 'name,ID,link,depth,timestamp,status\n' },
            { path: CONFIG.csv.queueFilename, header: 'name,ID,link,depth,added_timestamp\n' }
        ];

        files.forEach(file => {
            if (!fs.existsSync(file.path)) {
                fs.writeFileSync(file.path, file.header);
                Utils.log(`Created ${path.basename(file.path)}`);
            }
        });
    }

    loadExistingData() {
        try {
            // Load processed accounts
            if (fs.existsSync(CONFIG.csv.processedFilename)) {
                const content = fs.readFileSync(CONFIG.csv.processedFilename, 'utf8');
                const lines = content.split('\n').slice(1);
                lines.forEach(line => {
                    const match = line.match(/,(\d+),/);
                    if (match) this.processedIds.add(match[1]);
                });
            }

            // Load queued accounts
            if (fs.existsSync(CONFIG.csv.queueFilename)) {
                const content = fs.readFileSync(CONFIG.csv.queueFilename, 'utf8');
                const lines = content.split('\n').slice(1);
                lines.forEach(line => {
                    const match = line.match(/,(\d+),/);
                    if (match) this.queuedIds.add(match[1]);
                });
            }

            // Load existing host/target accounts to avoid duplicates in CSV files
            [CONFIG.csv.hostFilename, CONFIG.csv.targetFilename].forEach(filename => {
                if (fs.existsSync(filename)) {
                    const content = fs.readFileSync(filename, 'utf8');
                    const lines = content.split('\n').slice(1);
                    lines.forEach(line => {
                        const match = line.match(/,(\d+),/);
                        if (match) this.foundIds.add(match[1]);
                    });
                }
            });

            Utils.log(`Loaded ${this.processedIds.size} processed accounts, ${this.queuedIds.size} queued accounts, and ${this.foundIds.size} found accounts`);
        } catch (error) {
            Utils.log(`Error loading existing data: ${error.message}`, 'warning');
        }
    }

    addAccountsToBatch(accounts, type) {
        if (accounts.length === 0) return 0;

        const newAccounts = accounts.filter(account => {
            if (this.foundIds.has(account.userId)) {
                return false;
            }
            this.foundIds.add(account.userId);
            return true;
        });

        if (newAccounts.length === 0) return 0;

        this.pendingAccounts[type].push(...newAccounts);

        if (this.pendingAccounts[type].length >= CONFIG.csv.batchSize) {
            this.saveBatch(type);
        }

        return newAccounts.length;
    }

    addToQueue(accounts, depth) {
        const newQueueAccounts = accounts.filter(account => {
            if (this.processedIds.has(account.userId) || this.queuedIds.has(account.userId)) {
                return false;
            }
            this.queuedIds.add(account.userId);
            return true;
        });

        if (newQueueAccounts.length === 0) return 0;

        const queueEntries = newQueueAccounts.map(account => ({
            ...account,
            depth: depth,
            added_timestamp: new Date().toISOString()
        }));

        this.pendingAccounts.queue.push(...queueEntries);

        if (this.pendingAccounts.queue.length >= CONFIG.csv.batchSize) {
            this.saveBatch('queue');
        }

        return newQueueAccounts.length;
    }

    markAsProcessed(account, depth, status = 'completed') {
        this.processedIds.add(account.userId);
        
        const processedEntry = {
            ...account,
            depth: depth,
            timestamp: new Date().toISOString(),
            status: status
        };

        this.pendingAccounts.processed.push(processedEntry);

        if (this.pendingAccounts.processed.length >= CONFIG.csv.batchSize) {
            this.saveBatch('processed');
        }
    }

    saveBatch(type) {
        const accounts = this.pendingAccounts[type];
        if (accounts.length === 0) return 0;

        let filename, csvRows;

        switch (type) {
            case 'host':
                filename = CONFIG.csv.hostFilename;
                csvRows = accounts.map(account =>
                    `${Utils.sanitizeForCSV(account.name)},${account.userId},"${account.link}"`
                ).join('\n') + '\n';
                break;

            case 'target':
                filename = CONFIG.csv.targetFilename;
                csvRows = accounts.map(account =>
                    `${Utils.sanitizeForCSV(account.name)},${account.userId},"${account.link}"`
                ).join('\n') + '\n';
                break;

            case 'processed':
                filename = CONFIG.csv.processedFilename;
                csvRows = accounts.map(account =>
                    `${Utils.sanitizeForCSV(account.name)},${account.userId},"${account.link}",${account.depth},${account.timestamp},${account.status}`
                ).join('\n') + '\n';
                break;

            case 'queue':
                filename = CONFIG.csv.queueFilename;
                csvRows = accounts.map(account =>
                    `${Utils.sanitizeForCSV(account.name)},${account.userId},"${account.link}",${account.depth},${account.added_timestamp}`
                ).join('\n') + '\n';
                break;

            default:
                return 0;
        }

        fs.appendFileSync(filename, csvRows);
        Utils.log(`💾 Batch saved: ${accounts.length} ${type} accounts to ${path.basename(filename)}`, 'success');

        const savedCount = accounts.length;
        this.pendingAccounts[type] = [];

        return savedCount;
    }

    saveAllPendingBatches() {
        let totalSaved = 0;
        ['host', 'target', 'processed', 'queue'].forEach(type => {
            totalSaved += this.saveBatch(type);
        });

        if (totalSaved > 0) {
            Utils.log(`💾 Final batch save: ${totalSaved} accounts saved`, 'success');
        }
        return totalSaved;
    }

    getNextAccountsFromQueue(limit = 10, targetDepth = null) {
        try {
            // First save any pending queue items
            this.saveBatch('queue');

            if (!fs.existsSync(CONFIG.csv.queueFilename)) {
                Utils.log('Queue file does not exist');
                return [];
            }

            const content = fs.readFileSync(CONFIG.csv.queueFilename, 'utf8');
            const lines = content.split('\n').slice(1).filter(line => line.trim());

            Utils.log(`📋 Found ${lines.length} lines in queue file`);

            const accounts = [];
            for (let i = 0; i < Math.min(limit, lines.length); i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Handle CSV parsing more carefully
                const parts = this.parseCSVLine(line);
                if (parts.length >= 5) {
                    const name = parts[0];
                    const userId = parts[1];
                    const link = parts[2];
                    const depth = parseInt(parts[3]) || 0;

                    Utils.log(`📥 Queued account: ${name} (${userId}) at depth ${depth}`);

                    // Only process accounts that haven't been processed and match target depth (if specified)
                    if (!this.processedIds.has(userId) && (targetDepth === null || depth === targetDepth)) {
                        accounts.push({
                            name: name,
                            userId: userId,
                            link: link,
                            depth: depth
                        });
                    } else if (this.processedIds.has(userId)) {
                        Utils.log(`⏭️ Skipping already processed: ${name} (${userId})`);
                    } else if (targetDepth !== null && depth !== targetDepth) {
                        Utils.log(`⏭️ Skipping depth ${depth} account (looking for depth ${targetDepth}): ${name}`);
                    }
                }
            }

            Utils.log(`📤 Returning ${accounts.length} accounts from queue`);
            return accounts;
        } catch (error) {
            Utils.log(`Error reading queue: ${error.message}`, 'error');
            return [];
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
                result.push(current.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
        return result;
    }
}

// Data Extractor Class - Using proven logic from working scraper
class DataExtractor {
    static parseProfileUrl(href) {
        try {
            const match = href.match(/userId,(\d+)/);
            return match ? match[1] : null;
        } catch (error) {
            return null;
        }
    }

    // Using the proven extraction logic from the working automated scraper
    static async extractAccountsFromPage(page) {
        return await page.evaluate((selectors) => {
            const accounts = [];
            const accountBoxes = document.querySelectorAll(selectors.accountBox);
            
            accountBoxes.forEach((box, index) => {
                try {
                    const link = box.getAttribute('href');
                    
                    // Skip anonymous accounts
                    if (!link || link === '#') {
                        return;
                    }
                    
                    const nameElement = box.querySelector('.clsy-c-userbox__profile-name');
                    if (!nameElement) {
                        return;
                    }
                    
                    const name = nameElement.textContent.trim();
                    const userIdMatch = link.match(/userId,(\d+)/);
                    const userId = userIdMatch ? userIdMatch[1] : null;
                    
                    if (userId && name) {
                        // Sanitize name for CSV
                        let sanitizedName = name.replace(/"/g, '""');
                        if (sanitizedName.includes(',') || sanitizedName.includes('\n') || sanitizedName.includes('"')) {
                            sanitizedName = `"${sanitizedName}"`;
                        }
                        
                        const fullUrl = link.startsWith('http') ? link : `https://www.markt.de${link}`;
                        
                        accounts.push({
                            name: sanitizedName,
                            userId: userId,
                            link: fullUrl
                        });
                    }
                } catch (error) {
                    console.log(`Error extracting account at index ${index}:`, error);
                }
            });
            
            return accounts;
        }, CONFIG.selectors);
    }
}

// Modal Handler Class - Enhanced with working scraper logic
class ModalHandler {
    static async openModal(page, buttonSelector, modalType, tabId) {
        try {
            Utils.log(`Opening ${modalType} modal...`, 'info', tabId);
            
            // Wait for button to be visible and click it
            await page.waitForSelector(buttonSelector, { timeout: 10000 });
            await page.click(buttonSelector);
            
            // Wait for modal to appear
            await page.waitForSelector(CONFIG.selectors.modal, { timeout: 10000 });
            await Utils.sleep(CONFIG.delays.modalLoad);
            
            Utils.log(`${modalType} modal opened successfully`, 'info', tabId);
            
        } catch (error) {
            throw new Error(`Failed to open ${modalType} modal: ${error.message}`);
        }
    }

    // Using the proven pagination logic from the working automated scraper
    static async loadAllAccounts(page, csvManager, filename, modalType, tabId) {
        let allAccounts = [];
        let loadMoreClicks = 0;
        let consecutiveNoNewAccounts = 0;
        let consecutiveFailedClicks = 0;
        const type = modalType.toLowerCase();

        Utils.log(`Starting ${modalType} account extraction...`, 'info', tabId);

        while (true) {
            // Extract current accounts using proven logic
            const currentAccounts = await DataExtractor.extractAccountsFromPage(page);
            
            // Filter out accounts we already have in this session
            const newAccounts = currentAccounts.filter(account => 
                !allAccounts.some(existing => existing.userId === account.userId)
            );
            
            allAccounts.push(...newAccounts);
            
            Utils.log(`📊 Extracted ${newAccounts.length} new accounts (session total: ${allAccounts.length})`, 'info', tabId);
            
            // Add to batch for saving
            if (newAccounts.length > 0) {
                csvManager.addAccountsToBatch(newAccounts, type);
                consecutiveNoNewAccounts = 0;
            } else {
                consecutiveNoNewAccounts++;
            }
            
            // Look for "Mehr Likes laden" button with multiple selectors (from working scraper)
            let loadMoreButton = await page.$(CONFIG.selectors.loadMoreButton);
            
            // Try alternative selectors if primary doesn't work
            if (!loadMoreButton) {
                loadMoreButton = await page.$('.clsy-c-endlessScrolling span');
            }
            if (!loadMoreButton) {
                loadMoreButton = await page.$('[class*="endlessScrolling"] span');
            }
            if (!loadMoreButton) {
                loadMoreButton = await page.$('span:has-text("Mehr Likes laden")');
            }
            
            if (!loadMoreButton) {
                Utils.log('✅ No "Mehr Likes laden" button found - pagination complete', 'info', tabId);
                break;
            }
            
            // Check if button is visible and clickable
            const isVisible = await loadMoreButton.isVisible().catch(() => false);
            const isEnabled = await loadMoreButton.isEnabled().catch(() => false);
            
            if (!isVisible || !isEnabled) {
                Utils.log('✅ "Mehr Likes laden" button not clickable - pagination complete', 'info', tabId);
                break;
            }
            
            // Stop if we haven't found new accounts in many attempts
            if (consecutiveNoNewAccounts >= 5) {
                Utils.log('⚠️ No new accounts found in 5 consecutive attempts, stopping pagination', 'warning', tabId);
                break;
            }
            
            // Click load more button with retry logic
            Utils.log(`🔄 Clicking "Mehr Likes laden" button (click #${loadMoreClicks + 1})...`, 'info', tabId);
            
            try {
                await loadMoreButton.click();
                consecutiveFailedClicks = 0;
                loadMoreClicks++;
                
                // Wait for new content to load
                await Utils.sleep(CONFIG.delays.loadMore);
                
                // Additional wait if we've clicked many times
                if (loadMoreClicks > 20) {
                    await Utils.sleep(1000);
                }
                
            } catch (error) {
                consecutiveFailedClicks++;
                Utils.log(`❌ Failed to click "Mehr Likes laden" button (attempt ${consecutiveFailedClicks}): ${error.message}`, 'warning', tabId);
                
                if (consecutiveFailedClicks >= 3) {
                    Utils.log('❌ Failed to click button 3 times in a row, stopping pagination', 'warning', tabId);
                    break;
                }
                
                // Wait longer before retry
                await Utils.sleep(2000);
            }
            
            // Use the higher limit from working scraper
            if (loadMoreClicks >= CONFIG.limits.maxPaginationClicks) {
                Utils.log(`⚠️ Reached maximum pagination clicks (${CONFIG.limits.maxPaginationClicks}), stopping`, 'warning', tabId);
                break;
            }
            
            // Progress update every 10 clicks
            if (loadMoreClicks % 10 === 0) {
                Utils.log(`📈 Progress: ${loadMoreClicks} clicks, ${allAccounts.length} accounts extracted so far`, 'info', tabId);
            }
        }

        // Save any remaining accounts
        csvManager.saveBatch(type);
        
        Utils.log(`✅ ${modalType} complete: ${allAccounts.length} accounts after ${loadMoreClicks} clicks`, 'success', tabId);
        return allAccounts;
    }

    static async closeModal(page, tabId) {
        try {
            // Check if page is still valid
            if (page.isClosed()) {
                Utils.log('Page is closed, cannot close modal', 'warning', tabId);
                return;
            }

            // Try to find and click close button
            const closeButton = await page.$(CONFIG.selectors.closeButton);
            if (closeButton) {
                await closeButton.click();
                Utils.log('Modal closed with close button', 'info', tabId);
            } else {
                // Try pressing Escape key
                await page.keyboard.press('Escape');
                Utils.log('Modal closed with Escape key', 'info', tabId);
            }
            
            await Utils.sleep(1000);
        } catch (error) {
            Utils.log(`Error closing modal: ${error.message}`, 'warning', tabId);
        }
    }
}

// Single Tab Scraper
class TabScraper {
    constructor(tabId, csvManager) {
        this.tabId = tabId;
        this.csvManager = csvManager;
        this.stats = {
            accountsProcessed: 0,
            hostAccountsFound: 0,
            targetAccountsFound: 0,
            errors: 0
        };
    }

    async scrapeAccount(page, account, depth) {
        let hostAccounts = [];
        let targetAccounts = [];
        let retryCount = 0;

        while (retryCount <= CONFIG.limits.maxRetries) {
            try {
                const startTime = Date.now();
                
                // No timeout - let it run as long as needed
                await this.scrapeAccountCore(page, account, depth, hostAccounts, targetAccounts);
                
                // Success - break out of retry loop
                break;
                
            } catch (error) {
                retryCount++;
                const elapsed = ((Date.now() - Date.now()) / 1000).toFixed(1);
                
                if (retryCount <= CONFIG.limits.maxRetries) {
                    Utils.log(`❌ Attempt ${retryCount} failed for ${account.name}: ${error.message}. Retrying...`, 'warning', this.tabId);
                    await Utils.sleep(5000); // Wait before retry
                } else {
                    Utils.log(`❌ Failed to scrape ${account.name} after ${CONFIG.limits.maxRetries} retries: ${error.message}`, 'error', this.tabId);
                    this.csvManager.markAsProcessed(account, depth, 'failed');
                    this.stats.errors++;
                    return;
                }
            }
        }

        // Add host accounts to queue for recursive scraping (if within depth limit)
        if (depth < CONFIG.maxDepth && hostAccounts.length > 0) {
            const queuedCount = this.csvManager.addToQueue(hostAccounts.slice(0, CONFIG.maxAccountsPerLevel), depth + 1);
            Utils.log(`🔄 Queued ${queuedCount} host accounts for depth ${depth + 1}`, 'network', this.tabId);
        }

        // Mark this account as processed
        this.csvManager.markAsProcessed(account, depth, 'completed');

        this.stats.accountsProcessed++;
        this.stats.hostAccountsFound += hostAccounts.length;
        this.stats.targetAccountsFound += targetAccounts.length;

        const elapsed = ((Date.now() - Date.now()) / 1000).toFixed(1);
        Utils.log(`✅ Completed: ${account.name} | H:${hostAccounts.length} T:${targetAccounts.length}`, 'success', this.tabId);
    }

    async scrapeAccountCore(page, account, depth, hostAccounts, targetAccounts) {
        const profileUrl = Utils.buildProfileUrl(account.name.replace(/"/g, ''), account.userId);
        Utils.log(`🎯 Scraping: ${account.name} (depth: ${depth})`, 'network', this.tabId);

        // Navigate with timeout and retry logic
        let navigationSuccess = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await page.goto(profileUrl, { 
                    waitUntil: 'networkidle', 
                    timeout: CONFIG.limits.navigationTimeout 
                });
                navigationSuccess = true;
                break;
            } catch (navError) {
                Utils.log(`Navigation attempt ${attempt} failed: ${navError.message}`, 'warning', this.tabId);
                if (attempt === 3) throw navError;
                await Utils.sleep(2000);
            }
        }

        if (!navigationSuccess) {
            throw new Error('Failed to navigate after 3 attempts');
        }

        await Utils.sleep(CONFIG.delays.pageLoad);

        // Handle cookie consent with comprehensive logic from working scraper
        await this.handleCookieConsent(page);

        // Scrape host accounts with robust error handling
        try {
            await ModalHandler.openModal(page, CONFIG.selectors.hostButton, 'Host', this.tabId);
            const hosts = await ModalHandler.loadAllAccounts(
                page, this.csvManager, CONFIG.csv.hostFilename, 'Host', this.tabId
            );
            hostAccounts.push(...hosts);
            await ModalHandler.closeModal(page, this.tabId);
        } catch (hostError) {
            Utils.log(`⚠️ Host extraction failed: ${hostError.message}`, 'warning', this.tabId);
        }

        await Utils.sleep(CONFIG.delays.betweenModals);

        // Scrape target accounts with robust error handling
        try {
            await ModalHandler.openModal(page, CONFIG.selectors.targetButton, 'Target', this.tabId);
            const targets = await ModalHandler.loadAllAccounts(
                page, this.csvManager, CONFIG.csv.targetFilename, 'Target', this.tabId
            );
            targetAccounts.push(...targets);
            await ModalHandler.closeModal(page, this.tabId);
        } catch (targetError) {
            Utils.log(`⚠️ Target extraction failed: ${targetError.message}`, 'warning', this.tabId);
        }
    }

    // Comprehensive cookie consent handling from working automated scraper
    async handleCookieConsent(page) {
        Utils.log('🍪 Checking for cookie consent dialog...', 'info', this.tabId);
        
        try {
            // Common cookie consent selectors for German websites (from working scraper)
            const cookieSelectors = [
                // Markt.de specific cookie button (exact match - priority)
                'div[role="button"].cmp_button.cmp_button_bg.cmp_button_font_color.cmp-button-accept-all',
                'div.cmp-button-accept-all[role="button"]',
                '.cmp-button-accept-all',
                'div[role="button"]:has-text("AKZEPTIEREN UND WEITER")',
                '[class*="cmp-button-accept-all"]',
                
                // Alternative markt.de patterns
                'div[role="button"].cmp_button_bg',
                '.cmp_button.cmp-button-accept-all',
                'div:has-text("AKZEPTIEREN UND WEITER")',
                
                // Generic accept buttons
                'button:has-text("Akzeptieren")',
                'button:has-text("AKZEPTIEREN UND WEITER")',
                'button:has-text("Alle akzeptieren")',
                'button:has-text("Accept")',
                'button:has-text("Zustimmen")',
                'button:has-text("Einverstanden")',
                'button:has-text("OK")',
                
                // Common CSS classes
                '.cookie-accept',
                '.cookie-consent-accept',
                '.accept-cookies',
                '[data-accept="cookies"]',
                '[id*="cookie"][id*="accept"]',
                '[class*="cookie"][class*="accept"]'
            ];
            
            // Wait a bit for cookie dialog to appear
            await Utils.sleep(CONFIG.delays.cookieConsent);
            
            // Try each selector
            for (const selector of cookieSelectors) {
                try {
                    const cookieButton = await page.$(selector);
                    if (cookieButton) {
                        const isVisible = await cookieButton.isVisible().catch(() => false);
                        if (isVisible) {
                            Utils.log(`🍪 Found cookie consent button: ${selector}`, 'info', this.tabId);
                            await cookieButton.click();
                            Utils.log('✅ Cookie consent accepted', 'success', this.tabId);
                            await Utils.sleep(1000);
                            return;
                        }
                    }
                } catch (error) {
                    // Continue to next selector
                    continue;
                }
            }
            
            // Try to find any dialog/modal and look for accept buttons inside
            const dialogs = await page.$$('div[role="dialog"], .modal, .popup, [class*="dialog"], [class*="consent"], [class*="cookie"]');
            
            for (const dialog of dialogs) {
                try {
                    const isVisible = await dialog.isVisible().catch(() => false);
                    if (isVisible) {
                        // Look for accept button inside this dialog
                        const acceptButton = await dialog.$('button:has-text("Akzeptieren"), button:has-text("Accept"), button:has-text("OK"), button:has-text("Zustimmen")');
                        if (acceptButton) {
                            Utils.log('🍪 Found cookie consent in dialog', 'info', this.tabId);
                            await acceptButton.click();
                            Utils.log('✅ Cookie consent accepted from dialog', 'success', this.tabId);
                            await Utils.sleep(1000);
                            return;
                        }
                    }
                } catch (error) {
                    continue;
                }
            }
            
            Utils.log('ℹ️ No cookie consent dialog found or already accepted', 'info', this.tabId);
            
        } catch (error) {
            Utils.log(`⚠️ Error handling cookie consent: ${error.message}`, 'warning', this.tabId);
            // Continue anyway - not critical for scraping
        }
    }
}

// Main Recursive Scraper Class
class RecursiveNetworkScraper {
    constructor() {
        this.csvManager = new CSVManager();
        this.browser = null;
        this.context = null;
        this.tabScrapers = [];
        this.globalStats = {
            totalAccountsProcessed: 0,
            totalHostAccountsFound: 0,
            totalTargetAccountsFound: 0,
            totalErrors: 0
        };
    }

    async initialize() {
        Utils.log('🚀 Initializing Recursive Network Scraper...', 'network');
        Utils.log(`📊 Configuration: ${CONFIG.concurrentTabs} tabs, max depth: ${CONFIG.maxDepth}`, 'network');

        // Launch browser
        this.browser = await chromium.launch({
            headless: CONFIG.browser.headless,
            slowMo: CONFIG.browser.slowMo
        });

        this.context = await this.browser.newContext({
            viewport: CONFIG.browser.viewport
        });

        // Initialize tab scrapers
        for (let i = 1; i <= CONFIG.concurrentTabs; i++) {
            this.tabScrapers.push(new TabScraper(i, this.csvManager));
        }

        Utils.log(`✅ Initialized ${CONFIG.concurrentTabs} tab scrapers`, 'network');
    }

    async seedInitialAccount() {
        // Check if we need to seed the initial account
        const existingQueue = this.csvManager.getNextAccountsFromQueue(1, 0);
        if (existingQueue.length > 0) {
            Utils.log('🌱 Initial account already in queue, skipping seed', 'network');
            return;
        }

        // Add the starting account to the queue only if dinademona hasn't been processed yet
        if (!this.csvManager.processedIds.has('19354400')) {
            const startingAccount = {
                name: 'dinademona',
                userId: '19354400',
                link: CONFIG.startingProfileUrl
            };

            const addedCount = this.csvManager.addToQueue([startingAccount], 0);
            Utils.log(`🌱 Seeded initial account to queue: ${addedCount} accounts added`, 'network');

            // Force save the queue to ensure it's written
            this.csvManager.saveBatch('queue');
            Utils.log('💾 Forced save of initial queue', 'network');
        } else {
            Utils.log('🌱 Initial account already processed, checking for host accounts to queue', 'network');
            
            // If dinademona was processed but no host accounts were queued, we need to queue them
            // Read the host accounts and add unprocessed ones to queue for depth 1
            if (fs.existsSync(CONFIG.csv.hostFilename)) {
                const hostContent = fs.readFileSync(CONFIG.csv.hostFilename, 'utf8');
                const hostLines = hostContent.split('\n').slice(1).filter(line => line.trim());
                
                const hostAccountsToQueue = [];
                hostLines.forEach(line => {
                    const parts = this.csvManager.parseCSVLine(line);
                    if (parts.length >= 3) {
                        const name = parts[0];
                        const userId = parts[1];
                        const link = parts[2];
                        
                        if (!this.csvManager.processedIds.has(userId) && !this.csvManager.queuedIds.has(userId)) {
                            hostAccountsToQueue.push({ name, userId, link });
                        }
                    }
                });
                
                if (hostAccountsToQueue.length > 0) {
                    const queuedCount = this.csvManager.addToQueue(hostAccountsToQueue, 1);
                    Utils.log(`🔄 Queued ${queuedCount} existing host accounts for depth 1`, 'network');
                    this.csvManager.saveBatch('queue');
                }
            }
        }
    }

    async runRecursiveScraping() {
        let currentDepth = 0;

        while (currentDepth <= CONFIG.maxDepth) {
            Utils.log(`\n🌐 === STARTING DEPTH LEVEL ${currentDepth} ===`, 'network');

            // Get accounts specifically for this depth level
            const accountsToProcess = this.csvManager.getNextAccountsFromQueue(CONFIG.maxAccountsPerLevel, currentDepth);

            if (accountsToProcess.length === 0) {
                Utils.log(`No accounts found for depth ${currentDepth}, moving to next depth`, 'warning');
                currentDepth++;
                continue;
            }

            Utils.log(`📋 Processing ${accountsToProcess.length} accounts at depth ${currentDepth}`, 'network');

            // Distribute accounts across tabs
            const accountChunks = this.distributeAccountsAcrossTabs(accountsToProcess);

            // Run all tabs concurrently - NO PREMATURE CLOSURES
            const tabPromises = accountChunks.map(async (chunk, index) => {
                if (chunk.length === 0) {
                    Utils.log(`Tab ${index + 1}: No accounts assigned`, 'info', index + 1);
                    return;
                }

                Utils.log(`Tab ${index + 1}: Starting with ${chunk.length} accounts`, 'info', index + 1);
                const page = await this.context.newPage();
                const tabScraper = this.tabScrapers[index];

                try {
                    for (const account of chunk) {
                        await tabScraper.scrapeAccount(page, account, currentDepth);
                        await Utils.sleep(CONFIG.delays.tabDelay);
                    }
                } catch (error) {
                    Utils.log(`Tab ${index + 1} error: ${error.message}`, 'error', index + 1);
                } finally {
                    // Only close page when all work is complete
                    await page.close();
                    Utils.log(`Tab ${index + 1}: Completed`, 'success', index + 1);
                }
            });

            Utils.log(`🚀 Starting ${tabPromises.length} concurrent tabs...`, 'network');
            await Promise.all(tabPromises);
            Utils.log(`✅ All tabs completed for depth ${currentDepth}`, 'network');

            // Print depth summary
            this.printDepthSummary(currentDepth);

            currentDepth++;
        }
    }

    distributeAccountsAcrossTabs(accounts) {
        const chunks = Array(CONFIG.concurrentTabs).fill().map(() => []);
        accounts.forEach((account, index) => {
            chunks[index % CONFIG.concurrentTabs].push(account);
        });
        return chunks;
    }

    printDepthSummary(depth) {
        Utils.log(`\n📊 === DEPTH ${depth} SUMMARY ===`, 'network');

        let totalProcessed = 0;
        let totalHostFound = 0;
        let totalTargetFound = 0;
        let totalErrors = 0;

        this.tabScrapers.forEach((scraper, index) => {
            totalProcessed += scraper.stats.accountsProcessed;
            totalHostFound += scraper.stats.hostAccountsFound;
            totalTargetFound += scraper.stats.targetAccountsFound;
            totalErrors += scraper.stats.errors;

            Utils.log(`Tab ${index + 1}: ${scraper.stats.accountsProcessed} processed, ${scraper.stats.hostAccountsFound}H/${scraper.stats.targetAccountsFound}T found`);

            // Reset stats for next depth
            scraper.stats = {
                accountsProcessed: 0,
                hostAccountsFound: 0,
                targetAccountsFound: 0,
                errors: 0
            };
        });

        Utils.log(`Accounts processed: ${totalProcessed}`);
        Utils.log(`Host accounts found: ${totalHostFound}`);
        Utils.log(`Target accounts found: ${totalTargetFound}`);
        Utils.log(`Errors: ${totalErrors}`);
        Utils.log(`Total unique accounts in database: ${this.csvManager.processedIds.size}`);

        // Update global stats
        this.globalStats.totalAccountsProcessed += totalProcessed;
        this.globalStats.totalHostAccountsFound += totalHostFound;
        this.globalStats.totalTargetAccountsFound += totalTargetFound;
        this.globalStats.totalErrors += totalErrors;
    }

    async cleanup() {
        // Save any remaining pending accounts
        this.csvManager.saveAllPendingBatches();

        if (this.browser) {
            await this.browser.close();
            Utils.log('Browser closed');
        }
    }

    async run() {
        try {
            await this.initialize();
            await this.seedInitialAccount();
            await this.runRecursiveScraping();

            Utils.log('\n🎉 === RECURSIVE SCRAPING COMPLETE ===', 'success');
            Utils.log('🏆 FINAL STATS:');
            Utils.log(`Total accounts processed: ${this.globalStats.totalAccountsProcessed}`);
            Utils.log(`Total host accounts found: ${this.globalStats.totalHostAccountsFound}`);
            Utils.log(`Total target accounts found: ${this.globalStats.totalTargetAccountsFound}`);
            Utils.log(`Total unique accounts in database: ${this.csvManager.processedIds.size}`);
            Utils.log(`Total errors: ${this.globalStats.totalErrors}`);
            Utils.log(`CSV files saved in: ${path.resolve('./marktde/')}`);

        } catch (error) {
            Utils.log(`Fatal error: ${error.message}`, 'error');
        } finally {
            await this.cleanup();
        }
    }
}

// Run the scraper
if (require.main === module) {
    const scraper = new RecursiveNetworkScraper();
    scraper.run().catch(console.error);
}

module.exports = RecursiveNetworkScraper;
