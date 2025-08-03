/*
 * Markt.de Recursive Network Scraper - Multi-Tab Version
 * 
 * This advanced scraper runs 5 browser tabs simultaneously and recursively
 * scrapes through host accounts to build a massive network of accounts.
 * 
 * Features:
 * - 5 concurrent browser tabs
 * - Recursive scraping (each host account gets scraped)
 * - Tracks processed accounts to avoid duplicates
 * - Progressive CSV saving with batch processing
 * - Network effect: exponential account discovery
 * 
 * Installation:
 * npm install playwright
 * npx playwright install chromium
 * 
 * Usage:
 * node markt-de-scraper-recursive.js
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
        maxPaginationClicks: 999,    // Maximum "Mehr Likes laden" clicks per modal
        maxAccountsPerModal: 9999,   // Maximum accounts to extract per modal
        accountTimeout: 1800000,     // Maximum time per account (30 minutes)
        navigationTimeout: 300000    // Page navigation timeout
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
        slowMo: 200,           // Faster for bulk processing
        viewport: { width: 1280, height: 720 }
    }
};

// Utility functions
class Utils {
    static log(message, type = 'info', tabId = null) {
        const timestamp = new Date().toLocaleTimeString();
        const tabPrefix = tabId ? `[Tab${tabId}]` : '';
        const prefix = `[${timestamp}] ${tabPrefix} Scraper:`;

        switch (type) {
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            case 'success':
                console.log(`${prefix} ✅ ${message}`);
                break;
            case 'warning':
                console.warn(`${prefix} ⚠️ ${message}`);
                break;
            case 'network':
                console.log(`${prefix} 🌐 ${message}`);
                break;
            default:
                console.log(`${prefix} ℹ️ ${message}`);
        }
    }

    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    static sanitizeForCSV(text) {
        if (!text) return '';

        let sanitized = text.replace(/"/g, '""');

        if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')) {
            sanitized = `"${sanitized}"`;
        }

        return sanitized;
    }

    static buildProfileUrl(userId, username) {
        return `https://www.markt.de/${username}/userId,${userId}/profile.htm`;
    }
}

// Global CSV Manager for thread-safe operations
class GlobalCSVManager {
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
        this.ensureCSVHeaders();
        this.loadExistingData();
    }

    ensureCSVHeaders() {
        const accountHeader = 'name,ID,link\n';
        const processedHeader = 'name,ID,link,depth,timestamp,status\n';
        const queueHeader = 'name,ID,link,depth,added_timestamp\n';

        // Ensure marktde directory exists
        if (!fs.existsSync('./marktde')) {
            fs.mkdirSync('./marktde', { recursive: true });
            Utils.log('Created marktde directory');
        }

        // Create CSV files if they don't exist
        const files = [
            { path: CONFIG.csv.hostFilename, header: accountHeader },
            { path: CONFIG.csv.targetFilename, header: accountHeader },
            { path: CONFIG.csv.processedFilename, header: processedHeader },
            { path: CONFIG.csv.queueFilename, header: queueHeader }
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

// Data Extractor Class (same as before but with tab logging)
class DataExtractor {
    static parseProfileUrl(href) {
        try {
            const match = href.match(/userId,(\d+)/);
            return match ? match[1] : null;
        } catch (error) {
            return null;
        }
    }

    static async extractAccountsFromPage(page, tabId) {
        return await page.evaluate((selectors) => {
            const accounts = [];
            const accountBoxes = document.querySelectorAll(selectors.accountBox);

            accountBoxes.forEach((box, index) => {
                try {
                    const link = box.getAttribute('href');

                    if (!link || link === '#') return;

                    const nameElement = box.querySelector('.clsy-c-userbox__profile-name');
                    if (!nameElement) return;

                    const name = nameElement.textContent.trim();
                    const userIdMatch = link.match(/userId,(\d+)/);
                    const userId = userIdMatch ? userIdMatch[1] : null;

                    if (userId && name) {
                        let sanitizedName = name.replace(/"/g, '""');
                        if (sanitizedName.includes(',') || sanitizedName.includes('\n') || sanitizedName.includes('"')) {
                            sanitizedName = `"${sanitizedName}"`;
                        }

                        accounts.push({
                            name: sanitizedName,
                            userId: userId,
                            link: link
                        });
                    }
                } catch (error) {
                    // Skip problematic accounts
                }
            });

            return accounts;
        }, CONFIG.selectors);
    }
}

// Enhanced Modal Handler with tab support
class ModalHandler {
    static async openModal(page, buttonSelector, modalType, tabId) {
        Utils.log(`Opening ${modalType} modal...`, 'info', tabId);

        // Check if page is still valid
        if (page.isClosed()) {
            throw new Error('Page is closed, cannot open modal');
        }

        // Wait for button with retry logic
        let button = null;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await page.waitForSelector(buttonSelector, { timeout: 15000 });
                button = await page.$(buttonSelector);
                if (button) {
                    const isVisible = await button.isVisible().catch(() => false);
                    if (isVisible) break;
                }
            } catch (error) {
                Utils.log(`Button wait attempt ${attempt} failed: ${error.message}`, 'warning', tabId);
                if (attempt === 3) throw new Error(`Button ${buttonSelector} not found after 3 attempts`);
                await Utils.sleep(2000);
            }
        }

        if (!button) {
         throw new Error(`Button ${buttonSelector} not found or not visible`);
        }

        // Click button with retry logic
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await button.click();
                break;
            } catch (error) {
                Utils.log(`Button click attempt ${attempt} failed: ${error.message}`, 'warning', tabId);
                if (attempt === 3) throw error;
                await Utils.sleep(1000);
            }
        }

        // Wait for modal to appear
        await page.waitForSelector(CONFIG.selectors.modal, { timeout: 15000 });
        await Utils.sleep(CONFIG.delays.modalLoad);

        Utils.log(`${modalType} modal opened successfully`, 'info', tabId);
    }

    static async loadAllAccounts(page, csvManager, filename, modalType, tabId) {
        let allAccounts = [];
        let loadMoreClicks = 0;
        let consecutiveNoNewAccounts = 0;
        let consecutiveClickFailures = 0;
        const type = filename.includes('host') ? 'host' : 'target';

        Utils.log(`Starting ${modalType} account extraction...`, 'info', tabId);

        while (true) {
            try {
                // Check if page is still ountd
                if (page.isClosme(existing => existing.userId === account.userId)
                    Uage clo${modalType} extra`, 'er, tabId);
              break;
            allAc

                const cunts.tAccounts = {ait DataExtractomPage(pa);

                consecutiveNounts = currentAccoun.filter(acco =>
                U   !allAccounts.somed ${neing => existing.userId ccountcount.userId)
            }   );

            }counts.pushounts);

                iok fowAccounts.length > 0)
                    csveButtor.adawait pagToBatch(newAccounts, type);
                    consecutiveNoNewAccounts = 0;
                    consecutiveClickFailures = 0; // Reset click failures on success
                    Utils.log(`📊 Extracted ${newAccounts.length} new accounts (total: ${allAccounts.length})`, 'info', tabId);
                } else {
                    consecutiveNoNewAccounts++;
                }

                // Look for load more button with multiple selectors
                let loadMoreButton = null;
                const buttonSelectors = [
                    CONFIG.selectors.loadMoreButton,
                    '.clsy-c-endlessScrolling span',
                    '[class*="endlessScrolling"] span',
                    '.clsy-c-endlessScrolling--hasMore',
                    'button:has-text("Mehr Likes laden")',
                    'span:has-text("Mehr Likes laden")'
                ];

                for (const selector of buttonSelectors) {
                    try {
                        loadMoreButton = await page.$(selector);
                        if (loadMoreButton) {
                            const isVisible = await loadMoreButton.isVisible().catch(() => false);
                            if (isVisible) break;
                        }
                    } catch (error) {
                        continue;
                    }
                }

                if (!loadMoreButton) {
                    Utils.log('✅ Pagination complete - no more button found', 'info', tabId);
                    break;
                }

                const isVisible = await loadMoreButton.isVisible().catch(() => false);
                const isEnabled = await loadMoreButton.isEnabled().catch(() => false);

                if (!isble || !isEnabled) {
                    Utils.log('✅ Pagination complete - button not clickable', 'info', tabId);
                    break;
                }

                // Stop if no new accounts for too lon
                if (consecutiveNoNewAccounts >= 8) {
                    Utils.log('⚠️ No new accounts in 8 attempts, stopping pagination', 'warning', tabId);
                    break;
                }

                // Stop if too many click failures
                if (consecutiveClickFailures >= 3) {
                    Utils.log('⚠️ Too many consecutive click failures, stopping pagination', 'warning', tabId);
                    break;
                }

                try {
                    await loadMoreButton.click();
                    loadMoreClicks++;
                    consecutiveClickFailures = 0;
                    await Utils.sleep(CONFIG.delays.loadMore);

                    if (loadMoreClicks % 20 === 0) {
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

                if (loadMoreClicks >= 200) {
                    Utils.log('⚠️ Reachmit (200), stopping pagination', 'warning', tabId);
                    break;
                }

            } catch (extractionError) {
              tils.log(`Extraction error in ${modalType}: ${extractionError.message}`, 'error', tabId);
               
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
        constTime = Date.

        try {
      Set up time entire accou
            conromise = new, reject) => {
                setTimeout(() =>  conct(new Error('st profilemeout afterUrl = Utes')), COtils.buiits.accountTimeout);
            });

ldProfileUrl// Wrap (ac scraping logic icou timeout
  nt.us     awaerId, aise.race([
      ccount    this.scrapeAccount.nameimeout(page, .repunt, depth, hostAcclacts, targetAccounte(/"/g, ''));
                ti           U
            tils.log(`🎯 Scraping: ${account.name} (depth: ${depth})`, 'network', this.tabId);

               ountCom  eted = true    // Navigate with longer timeout and retry logic
            let navigationSuccess = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await page.goto(profileUrl, { waitUntil: 'networkidle', timeout: 45000 });
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
                Utils.log(`Starting host modal extraction for ${account.name}`, 'info', this.tabId);
                await ModalHandler.openModal(page, CONFIG.selectors.hostButton, 'Host', this.tabId);
                hostAccounts = await ModalHandler.loadAllAccounts(
                    page, this.csvManager, CONFIG.csv.hostFilename, 'Host', this.tabId
                );
                await ModalHandler.closeModal(page, this.tabId);
                await Utils.sleep(CONFIG.delays.betweenModals);
                Utils.log(`Host extraction completed: ${hostAccounts.length} accounts`, 'success', this.tabId);
            } catch (error) {
                Utils.log(`Host extraction failed for ${account.name}: ${error.message}`, 'warning', this.tabId);
                // Try to close any open modals
                try {
                    await ModalHandler.closeModal(page, this.tabId);
                } catch (closeError) {
                    Utils.log(`Failed to close host modal: ${closeError.message}`, 'warning', this.tabId);
                }
            }

            // Scrape target accounts with robust error handling
            try {
                Utils.log(`Starting target modal extraction for ${account.name}`, 'info', this.tabId);
                await ModalHandler.openModal(page, CONFIG.selectors.targetButton, 'Target', this.tabId);
                targetAccounts = await ModalHandler.loadAllAccounts(
                    page, this.csvManager, CONFIG.csv.targetFilename, 'Target', this.tabId
                );
                await ModalHandler.closeModal(page, this.tabId);
                Utils.log(`Target extraction completed: ${targetAccounts.length} accounts`, 'success', this.tabId);
            } catch (error) {
                Utils.log(`Target extraction failed for ${account.name}: ${error.message}`, 'warning', this.tabId);
                // Try to close any open modals
                try {
                    await ModalHandler.closeModal(page, this.tabId);
                } catch (closeError) {
                    Utils.log(`Failed to close target modal: ${closeError.message}`, 'warning', this.tabId);
                }
            }

            // Add host accounts to queue for recursive scraping (if within depth limit)
            if (depth < CONFIG.maxDepth && hostAccounts.length > 0) {
                const queuedCount = this.csvManager.addToQueue(hostAccounts.slice(0, CONFIG.maxAccountsPerLevel), depth + 1);
                Utils.log(`🔄 Queued ${queuedCount} host accounts for depth ${depth + 1}`, 'network', this.tabId);
            }

            // Mark this account as processed
            this.csvManager.markAsProcessed(account, depth, 'completed');
            accountCompleted = true;

            this.stats.accountsProcessed++;
            this.stats.hostAccountsFound += hostAccounts.length;
            this.stats.targetAccountsFound += targetAccounts.length;

            Utils.log(`✅ Completed: ${account.name} | H:${hostAccounts.length} T:${targetAccounts.length}`, 'success', this.tabId);

        } catch (error) {
            Utils.log(`❌ Failed to scrape ${account.name}: ${error.message}`, 'error', this.tabId);
            
            if (!accountCompleted) {
                this.csvManager.markAsProcessed(account, depth, 'failed');
            }
            
            this.stats.errors++;
            
            // Don't throw the error - let the tab continue with next account
            // throw error;
        }
    }

    async handleCookieConsent(page) {
        try {
            const cookieSelectors = [
                'div[role="button"].cmp_button.cmp_button_bg.cmp_button_font_color.cmp-button-accept-all',
                'div.cmp-button-accept-all[role="button"]',
                '.cmp-button-accept-all',
                'div[role="button"]:has-text("AKZEPTIEREN UND WEITER")'
            ];

            await Utils.sleep(1000);

            for (const selector of cookieSelectors) {
                try {
                    const cookieButton = await page.$(selector);
                    if (cookieButton) {
                        const isVisible = await cookieButton.isVisible().catch(() => false);
                        if (isVisible) {
                            await cookieButton.click();
                            await Utils.sleep(1000);
                            return;
                        }
                    }
                } catch (error) {
                    continue;
                }
            }
        } catch (error) {
            // Cookie consent not critical
        }
    }
}

// Main Recursive Scraper
class RecursiveMarktDeScraper {
    constructor() {
        this.csvManager = new GlobalCSVManager();
        this.browser = null;
        this.context = null;
        this.tabScrapers = [];
        this.globalStats = {
            totalAccountsProcessed: 0,
            totalHostAccountsFound: 0,
            totalTargetAccountsFound: 0,
            totalErrors: 0,
            currentDepth: 0
        };
    }

    async initialize() {
        Utils.log('🚀 Initializing Recursive Network Scraper...');
        Utils.log(`📊 Configuration: ${CONFIG.concurrentTabs} tabs, max depth: ${CONFIG.maxDepth}`);

        this.browser = await chromium.launch({
            headless: CONFIG.browser.headless,
            slowMo: CONFIG.browser.slowMo
        });

        this.context = await this.browser.newContext({
            viewport: CONFIG.browser.viewport
        });

        // Initialize tab scrapers
        for (let i = 0; i < CONFIG.concurrentTabs; i++) {
            this.tabScrapers.push(new TabScraper(i + 1, this.csvManager));
        }

        Utils.log(`✅ Initialized ${CONFIG.concurrentTabs} tab scrapers`);
    }

    async seedInitialAccount() {
        // Add the starting account to the queue
        const startingAccount = {
            name: 'dinademona',
            userId: '19354400',
            link: CONFIG.startingProfileUrl
        };

        const queuedCount = this.csvManager.addToQueue([startingAccount], 0);
        Utils.log(`🌱 Seeded initial account to queue: ${queuedCount} accounts added`, 'network');

        // Force save the queue
        this.csvManager.saveBatch('queue');
        Utils.log('💾 Forced save of initial queue', 'network');
    }

    async runRecursiveScraping() {
        await this.initialize();
        await this.seedInitialAccount();

        let currentDepth = 0;
        let totalProcessedAccounts = 0;

        while (currentDepth <= CONFIG.maxDepth) {
            Utils.log(`\n🌐 === STARTING DEPTH LEVEL ${currentDepth} ===`, 'network');

            // Get accounts specifically for this depth level
            const accountsToProcess = this.csvManager.getNextAccountsFromQueue(CONFIG.maxAccountsPerLevel, currentDepth);

            if (accountsToProcess.length === 0) {
                Utils.log(`No more accounts to process at depth ${currentDepth}`, 'warning');

                // Check if we have any accounts in the queue for future depths
                const allQueuedAccounts = this.csvManager.getNextAccountsFromQueue(1000);
                if (allQueuedAccounts.length === 0) {
                    Utils.log('No more accounts in queue at any depth, stopping', 'warning');
                    break;
                } else {
                    Utils.log(`Found ${allQueuedAccounts.length} accounts for future depths, continuing...`);
                    currentDepth++;
                    continue;
                }
            }

            // Filter accounts for current depth
            const currentDepthAccounts = accountsToProcess.filter(acc => acc.depth === currentDepth);

            if (currentDepthAccounts.length === 0) {
                Utils.log(`No accounts found for depth ${currentDepth}, moving to next depth`);
                currentDepth++;
                continue;
            }

            Utils.log(`📋 Processing ${currentDepthAccounts.length} accounts at depth ${currentDepth}`, 'network');

            // Distribute accounts across tabs
            const accountChunks = this.distributeAccounts(currentDepthAccounts);

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
                        try {
                            await tabScraper.scrapeAccount(page, account, account.depth);
                            await Utils.sleep(CONFIG.delays.tabDelay);
                            totalProcessedAccounts++;
                        } catch (accountError) {
                            Utils.log(`Tab ${index + 1} account error: ${accountError.message}`, 'error', index + 1);
                            // Mark account as failed but continue with next account
                            this.csvManager.markAsProcessed(account, account.depth, 'failed');
                        }
                    }
                    
                    // Only close page after ALL accounts in chunk are processed successfully
                    Utils.log(`Tab ${index + 1}: All accounts completed, closing page`, 'success', index + 1);
                    await page.close();
                    Utils.log(`Tab ${index + 1}: Page closed successfully`, 'success', index + 1);
                    
                } catch (tabError) {
                    Utils.log(`Tab ${index + 1} critical error: ${tabError.message}`, 'error', index + 1);
                    try {
                        if (!page.isClosed()) {
                            await page.close();
                        }
                    } catch (closeError) {
                        Utils.log(`Tab ${index + 1} close error: ${closeError.message}`, 'error', index + 1);
                    }
                }
            });

            Utils.log(`🚀 Starting ${tabPromises.length} concurrent tabs...`, 'network');
            await Promise.all(tabPromises);
            Utils.log(`✅ All tabs completed for depth ${currentDepth}`, 'network');

            // Update global stats
            this.updateGlobalStats();
            this.displayDepthSummary(currentDepth);

            // Move to next depth
            currentDepth++;
        }

        await this.finalize();
    }

    distributeAccounts(accounts) {
        const chunks = Array(CONFIG.concurrentTabs).fill().map(() => []);

        accounts.forEach((account, index) => {
            chunks[index % CONFIG.concurrentTabs].push(account);
        });

        return chunks;
    }

    updateGlobalStats() {
        this.globalStats.totalAccountsProcessed = 0;
        this.globalStats.totalHostAccountsFound = 0;
        this.globalStats.totalTargetAccountsFound = 0;
        this.globalStats.totalErrors = 0;

        this.tabScrapers.forEach(scraper => {
            this.globalStats.totalAccountsProcessed += scraper.stats.accountsProcessed;
            this.globalStats.totalHostAccountsFound += scraper.stats.hostAccountsFound;
            this.globalStats.totalTargetAccountsFound += scraper.stats.targetAccountsFound;
            this.globalStats.totalErrors += scraper.stats.errors;
        });
    }

    displayDepthSummary(depth) {
        Utils.log(`\n📊 === DEPTH ${depth} SUMMARY ===`, 'network');
        Utils.log(`Accounts processed: ${this.globalStats.totalAccountsProcessed}`);
        Utils.log(`Host accounts found: ${this.globalStats.totalHostAccountsFound}`);
        Utils.log(`Target accounts found: ${this.globalStats.totalTargetAccountsFound}`);
        Utils.log(`Errors: ${this.globalStats.totalErrors}`);
        Utils.log(`Total unique accounts in database: ${this.csvManager.processedIds.size}`);

        // Tab-specific stats
        this.tabScrapers.forEach((scraper, index) => {
            Utils.log(`Tab ${index + 1}: ${scraper.stats.accountsProcessed} processed, ${scraper.stats.hostAccountsFound}H/${scraper.stats.targetAccountsFound}T found`);
        });
    }

    async finalize() {
        Utils.log('🏁 Starting finalization process...', 'network');
        
        // Save any remaining batches
        const savedCount = this.csvManager.saveAllPendingBatches();
        if (savedCount > 0) {
            Utils.log(`💾 Saved ${savedCount} remaining accounts during finalization`, 'success');
        }

        Utils.log('\n🎉 === RECURSIVE SCRAPING COMPLETE ===', 'success');
        Utils.log(`🏆 FINAL STATS:`);
        Utils.log(`Total accounts processed: ${this.globalStats.totalAccountsProcessed}`);
        Utils.log(`Total host accounts found: ${this.globalStats.totalHostAccountsFound}`);
        Utils.log(`Total target accounts found: ${this.globalStats.totalTargetAccountsFound}`);
        Utils.log(`Total unique accounts in database: ${this.csvManager.processedIds.size}`);
        Utils.log(`Total errors: ${this.globalStats.totalErrors}`);
        Utils.log(`CSV files saved in: ${path.dirname(CONFIG.csv.hostFilename)}/`);

        // Close browser safely
        if (this.browser) {
            try {
                // Give a moment for any remaining operations
                await Utils.sleep(2000);
                await this.browser.close();
                Utils.log('✅ Browser closed successfully', 'success');
            } catch (error) {
                Utils.log(`Warning: Browser close error: ${error.message}`, 'w
    }
}

// Main execution
async function main() {
    try {
        const scraper = new RecursiveMarktDeScraper();
        await scraper.runRecursiveScraping();
    } catch (error) {
        Utils.log(`Script failed: ${error.message}`, 'error');
        console.error('Full error details:', error);
        process.exit(1);
    }
}

// Run the scraper
if (require.main === module) {
    main();
}

module.exports = { RecursiveMarktDeScraper, CONFIG };