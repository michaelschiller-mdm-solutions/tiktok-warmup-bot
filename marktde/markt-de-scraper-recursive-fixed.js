/*
 * Markt.de Recursive Network Scraper - Multi-Tab Version with Timeouts
 * 
 * This advanced scraper runs 5 browser tabs simultaneously and recursively
 * scrapes through host accounts to build a massive network of accounts.
 * 
 * Features:
 * - 5 concurrent browser tabs
 * - Recursive scraping (each host account gets scraped)
 * - Account timeouts to prevent long-running accounts
 * - Pagination limits to control scraping time
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
    startingProfileUrl: 'https://www.markt.de/dinademona/userId,19354400/profile.htm',

    // Multi-tab configuration
    concurrentTabs: 5,          // Number of simultaneous browser tabs
    maxDepth: 3,                // Maximum recursion depth (0 = starting profile, 1 = first level hosts, etc.)
    maxAccountsPerLevel: 50,    // Maximum accounts to process per recursion level

    delays: {
        pageLoad: 3000,         // Wait for page to load
        modalLoad: 2000,        // Wait for modal to open
        loadMore: 1000,         // Wait between "Mehr Likes laden" clicks (faster for bulk)
        extraction: 200,        // Wait between account extractions (faster)
        betweenModals: 1500,    // Wait between host and target scraping
        tabDelay: 500          // Delay between starting new tabs
    },

    limits: {
        maxPaginationClicks: 30,    // Maximum "Mehr Likes laden" clicks per modal
        maxAccountsPerModal: 300,   // Maximum accounts to extract per modal
        accountTimeout: 120000,     // Maximum time per account (2 minutes)
        navigationTimeout: 30000    // Page navigation timeout
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
        batchSize: 15  // Save every 15 accounts for faster processing
    },

    browser: {
        headless: false,        // Set to true to run without GUI
        slowMo: 100,           // Faster for bulk processing
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
                    `${this.escapeCSVField(account.name)},${account.userId},"${account.link}"`
                ).join('\n') + '\n';
                break;

            case 'target':
                filename = CONFIG.csv.targetFilename;
                csvRows = accounts.map(account =>
                    `${this.escapeCSVField(account.name)},${account.userId},"${account.link}"`
                ).join('\n') + '\n';
                break;

            case 'processed':
                filename = CONFIG.csv.processedFilename;
                csvRows = accounts.map(account =>
                    `${this.escapeCSVField(account.name)},${account.userId},"${account.link}",${account.depth},${account.timestamp},${account.status}`
                ).join('\n') + '\n';
                break;

            case 'queue':
                filename = CONFIG.csv.queueFilename;
                csvRows = accounts.map(account =>
                    `${this.escapeCSVField(account.name)},${account.userId},"${account.link}",${account.depth},${account.added_timestamp}`
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

    escapeCSVField(field) {
        if (field && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }
}

// Data Extractor Class
class DataExtractor {
    static parseProfileUrl(href) {
        try {
            const match = href.match(/userId,(\d+)/);
            return match ? match[1] : null;
        } catch (error) {
            return null;
        }
    }

    static async extractAccountsFromModal(page, tabId) {
        try {
            const accountBoxes = await page.$$(CONFIG.selectors.accountBox);
            const accounts = [];

            for (const box of accountBoxes) {
                try {
                    const nameElement = await box.$('.clsy-c-userbox__name a');
                    const linkElement = await box.$('.clsy-c-userbox__name a');

                    if (nameElement && linkElement) {
                        const name = await nameElement.textContent();
                        const href = await linkElement.getAttribute('href');
                        const userId = DataExtractor.parseProfileUrl(href);

                        if (name && userId && href) {
                            const fullUrl = href.startsWith('http') ? href : `https://www.markt.de${href}`;
                            accounts.push({
                                name: name.trim(),
                                userId: userId,
                                link: fullUrl
                            });
                        }
                    }
                } catch (error) {
                    // Skip individual account extraction errors
                    continue;
                }
            }

            return accounts;
        } catch (error) {
            Utils.log(`Account extraction error: ${error.message}`, 'error', tabId);
            return [];
        }
    }
}

// Modal Handler Class
class ModalHandler {
    static async openModal(page, buttonSelector, modalType, tabId) {
        try {
            Utils.log(`Opening ${modalType} modal...`, 'info', tabId);
            
            const button = await page.$(buttonSelector);
            if (!button) {
                throw new Error(`${modalType} button not found`);
            }

            await button.click();
            await Utils.sleep(CONFIG.delays.modalLoad);

            // Wait for modal to be visible
            await page.waitForSelector(CONFIG.selectors.modal, { timeout: 10000 });
            Utils.log(`${modalType} modal opened successfully`, 'info', tabId);
            
        } catch (error) {
            throw new Error(`Failed to open ${modalType} modal: ${error.message}`);
        }
    }

    static async loadAllAccounts(page, csvManager, filename, modalType, tabId) {
        const allAccounts = [];
        let loadMoreClicks = 0;
        let consecutiveNoNewAccounts = 0;
        let consecutiveClickFailures = 0;
        const type = modalType.toLowerCase();

        Utils.log(`Starting ${modalType} account extraction...`, 'info', tabId);

        while (loadMoreClicks < CONFIG.limits.maxPaginationClicks && allAccounts.length < CONFIG.limits.maxAccountsPerModal) {
            try {
                // Extract accounts from current page
                const newAccounts = await DataExtractor.extractAccountsFromModal(page, tabId);
                const addedCount = csvManager.addAccountsToBatch(newAccounts, type);
                
                if (addedCount > 0) {
                    allAccounts.push(...newAccounts.slice(0, addedCount));
                    consecutiveNoNewAccounts = 0;
                    Utils.log(`📊 Extracted ${addedCount} new accounts (total: ${allAccounts.length})`, 'info', tabId);
                } else {
                    consecutiveNoNewAccounts++;
                }

                // Check for load more button
                const loadMoreButton = await page.$(CONFIG.selectors.loadMoreButton);
                if (!loadMoreButton) {
                    Utils.log('✅ Pagination complete - no more button', 'info', tabId);
                    break;
                }

                // Stop if no new accounts for too long
                if (consecutiveNoNewAccounts >= 5) {
                    Utils.log('⚠️ No new accounts in 5 attempts, stopping pagination', 'warning', tabId);
                    break;
                }

                // Stop if too many click failures
                if (consecutiveClickFailures >= 3) {
                    Utils.log('⚠️ Too many consecutive click failures, stopping pagination', 'warning', tabId);
                    break;
                }

                try {
                    Utils.log(`🔄 Clicking "Mehr Likes laden" button (click #${loadMoreClicks + 1})...`, 'info', tabId);
                    await loadMoreButton.click();
                    loadMoreClicks++;
                    consecutiveClickFailures = 0;
                    await Utils.sleep(CONFIG.delays.loadMore);

                    if (loadMoreClicks % 10 === 0) {
                        Utils.log(`📈 Progress: ${loadMoreClicks} clicks, ${allAccounts.length} accounts`, 'info', tabId);
                    }

                } catch (error) {
                    consecutiveClickFailures++;
                    Utils.log(`❌ Click failed (attempt ${consecutiveClickFailures}): ${error.message}`, 'warning', tabId);
                    
                    if (consecutiveClickFailures >= 3) {
                        Utils.log('⚠️ Too many click failures, stopping pagination', 'warning', tabId);
                        break;
                    }
                    
                    // Wait a bit longer before retrying
                    await Utils.sleep(CONFIG.delays.loadMore * 2);
                }

            } catch (extractionError) {
                Utils.log(`Extraction error in ${modalType}: ${extractionError.message}`, 'error', tabId);
                break;
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

            // Try multiple methods to close modal
            let modalClosed = false;

            // Method 1: Close button
            try {
                const closeButton = await page.$(CONFIG.selectors.closeButton);
                if (closeButton) {
                    const isVisible = await closeButton.isVisible().catch(() => false);
                    if (isVisible) {
                        await closeButton.click();
                        modalClosed = true;
                        Utils.log('Modal closed using close button', 'info', tabId);
                    }
                }
            } catch (error) {
                Utils.log(`Close button method failed: ${error.message}`, 'warning', tabId);
            }

            // Method 2: Escape key
            if (!modalClosed) {
                try {
                    await page.keyboard.press('Escape');
                    modalClosed = true;
                    Utils.log('Modal closed using Escape key', 'info', tabId);
                } catch (error) {
                    Utils.log(`Escape key method failed: ${error.message}`, 'warning', tabId);
                }
            }

            // Method 3: Click outside modal
            if (!modalClosed) {
                try {
                    await page.click('body', { position: { x: 10, y: 10 } });
                    Utils.log('Modal closed by clicking outside', 'info', tabId);
                } catch (error) {
                    Utils.log(`Click outside method failed: ${error.message}`, 'warning', tabId);
                }
            }

            await Utils.sleep(1500); // Give time for modal to close

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
        let accountCompleted = false;
        const startTime = Date.now();

        try {
            // Set up timeout for the entire account scraping
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Account timeout after 2 minutes')), CONFIG.limits.accountTimeout);
            });

            // Wrap the scraping logic in a timeout
            await Promise.race([
                this.scrapeAccountCore(page, account, depth, hostAccounts, targetAccounts),
                timeoutPromise
            ]);

            accountCompleted = true;

        } catch (error) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            Utils.log(`❌ Failed to scrape ${account.name} after ${elapsed}s: ${error.message}`, 'error', this.tabId);
            this.csvManager.markAsProcessed(account, depth, 'failed');
            this.stats.errors++;
            return;
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

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        Utils.log(`✅ Completed: ${account.name} | H:${hostAccounts.length} T:${targetAccounts.length} (${elapsed}s)`, 'success', this.tabId);
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

        // Handle cookie consent
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

    async handleCookieConsent(page) {
        try {
            const cookieButton = await page.$('button[data-testid="uc-accept-all-button"]');
            if (cookieButton) {
                await cookieButton.click();
                await Utils.sleep(1000);
                Utils.log('Cookie consent accepted', 'info', this.tabId);
            }
        } catch (error) {
            // Cookie consent is optional, don't fail if it's not found
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
        // Add the starting account to the queue
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

            // Run all tabs concurrently
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