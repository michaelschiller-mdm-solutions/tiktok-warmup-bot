/*
 * Parallel Markt.de Premium Followed Accounts Scraper
 * 
 * This script uses one browser with multiple tabs to scrape premium accounts efficiently.
 * Each tab processes different target accounts simultaneously.
 * 
 * Features:
 * - Single browser with 10 parallel tabs
 * - Automatic workload distribution
 * - Shared progress tracking
 * - Crash recovery and resume capability
 * - Real-time progress monitoring
 * - Headless mode for background operation
 * 
 * Installation:
 * npm install playwright
 * npx playwright install chromium
 * 
 * Usage:
 * node parallel-premium-scraper.js
 */

const { chromium } = require('playwright');
const fs = require('fs');

// Configuration
const CONFIG = {
    parallel: {
        tabs: 10,               // Number of parallel tabs in single browser
        maxRetries: 3           // Max retries per account
    },

    delays: {
        pageLoad: 1500,         // Reduced for parallel processing
        modalLoad: 1000,
        loadMore: 600,
        extraction: 150,
        betweenProfiles: 1000,
        tabStart: 500           // Stagger tab startup
    },

    selectors: {
        hostButton: '.clsy-profile__likes-dialog-i-them',
        modal: '.clsy-c-dialog__body',
        loadMoreButton: '.clsy-c-endlessScrolling--hasMore',
        accountBox: '.clsy-c-userbox',
        premiumIndicator: '.clsy-profile-image--premium',
        profileImage: '.clsy-profile-image',
        profileName: '.clsy-c-userbox__profile-name',
        profileLink: '.clsy-c-userbox__profile-name a',
        closeButton: '.clsy-c-dialog__close, [aria-label="Close"]'
    },

    csv: {
        inputFilename: './target_accounts.csv',
        outputFilename: './premium_followed_by.csv',
        processedFilename: './premium_processed_targets.csv',
        progressFilename: './parallel_progress.json'
    },

    browser: {
        headless: false,        // Set to true for background mode
        timeout: 30000
    }
};

// Shared state management
class SharedState {
    constructor() {
        this.progressFile = CONFIG.csv.progressFilename;
        this.outputFile = CONFIG.csv.outputFilename;
        this.processedFile = CONFIG.csv.processedFilename;

        this.initializeFiles();
    }

    initializeFiles() {
        // Initialize progress file
        if (!fs.existsSync(this.progressFile)) {
            const initialProgress = {
                totalAccounts: 0,
                processedAccounts: 0,
                failedAccounts: 0,
                tabs: {},
                startTime: new Date().toISOString(),
                lastUpdate: new Date().toISOString()
            };
            fs.writeFileSync(this.progressFile, JSON.stringify(initialProgress, null, 2));
        }

        // Ensure tabs object exists in existing progress file
        const progress = this.getProgress();
        if (progress && !progress.tabs) {
            progress.tabs = {};
            fs.writeFileSync(this.progressFile, JSON.stringify(progress, null, 2));
        }

        // Initialize output CSV with headers
        if (!fs.existsSync(this.outputFile)) {
            const headers = 'target_account,target_account_id,followed_account,followed_account_id,is_premium,profile_image_url,profile_link\n';
            fs.writeFileSync(this.outputFile, headers);
        }

        // Initialize processed CSV with headers
        if (!fs.existsSync(this.processedFile)) {
            const headers = 'target_account,target_account_id,status,timestamp,premium_found,total_followed\n';
            fs.writeFileSync(this.processedFile, headers);
        }
    }

    getProgress() {
        try {
            return JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
        } catch (error) {
            console.error('Error reading progress file:', error);
            return null;
        }
    }

    updateProgress(tabId, update) {
        try {
            const progress = this.getProgress();
            if (!progress) return;

            // Initialize tabs object if it doesn't exist
            if (!progress.tabs) {
                progress.tabs = {};
            }

            // Initialize this tab's progress if it doesn't exist
            if (!progress.tabs[tabId]) {
                progress.tabs[tabId] = {};
            }

            progress.tabs[tabId] = {
                ...progress.tabs[tabId],
                ...update,
                lastUpdate: new Date().toISOString()
            };

            progress.lastUpdate = new Date().toISOString();
            fs.writeFileSync(this.progressFile, JSON.stringify(progress, null, 2));
        } catch (error) {
            console.error('Error updating progress:', error);
        }
    }

    appendResults(results) {
        try {
            if (results.length === 0) return;

            const csvLines = results.map(result =>
                `${result.target_account},${result.target_account_id},${result.followed_account},${result.followed_account_id},${result.is_premium},${result.profile_image_url},"${result.profile_link}"`
            ).join('\n') + '\n';

            fs.appendFileSync(this.outputFile, csvLines);
        } catch (error) {
            console.error('Error appending results:', error);
        }
    }

    markProcessed(targetAccount, targetAccountId, status, premiumFound, totalFollowed) {
        try {
            const line = `${targetAccount},${targetAccountId},${status},${new Date().toISOString()},${premiumFound},${totalFollowed}\n`;
            fs.appendFileSync(this.processedFile, line);
        } catch (error) {
            console.error('Error marking processed:', error);
        }
    }
}

// Tab worker for individual scraper tab
class ScraperTab {
    constructor(tabId, page, targetAccounts, sharedState) {
        this.tabId = tabId;
        this.page = page;
        this.targetAccounts = targetAccounts;
        this.sharedState = sharedState;
        this.processed = 0;
        this.failed = 0;
    }

    async initialize() {
        console.log(`� Tnab ${this.tabId}: Initializing...`);

        // Set viewport and user agent
        await this.page.setViewportSize({ width: 1280, height: 720 });
        await this.page.setExtraHTTPHeaders({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        });

        this.sharedState.updateProgress(this.tabId, {
            status: 'initialized',
            accountsToProcess: this.targetAccounts.length,
            processed: 0,
            failed: 0
        });

        console.log(`📱 Tab ${this.tabId}: Ready (${this.targetAccounts.length} accounts assigned)`);
    }

    async run() {
        try {
            await this.initialize();

            for (const account of this.targetAccounts) {
                await this.processAccount(account);
                await this.page.waitForTimeout(CONFIG.delays.betweenProfiles);
            }

            console.log(`✅ Tab ${this.tabId}: Completed all accounts`);
        } catch (error) {
            console.error(`❌ Tab ${this.tabId}: Fatal error:`, error.message);
        }
    }

    async processAccount(account) {
        const { name, ID: targetAccountId, link } = account;
        const maxRetries = CONFIG.parallel.maxRetries;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📋 Tab ${this.tabId}: Processing ${name} (attempt ${attempt}/${maxRetries})`);

                // Navigate to target profile
                console.log(`🌐 Tab ${this.tabId}: Navigating to ${link}`);
                await this.page.goto(link, {
                    waitUntil: 'networkidle',
                    timeout: CONFIG.browser.timeout
                });
                await this.page.waitForTimeout(CONFIG.delays.pageLoad);

                // Debug: Check page title and URL
                const pageTitle = await this.page.title();
                const currentUrl = this.page.url();
                console.log(`📄 Tab ${this.tabId}: Page loaded - Title: "${pageTitle}", URL: ${currentUrl}`);

                // Look for "mir gefallen" button
                console.log(`🔍 Tab ${this.tabId}: Looking for "mir gefallen" button on ${name}`);

                // Wait a bit more for the page to fully load
                await this.page.waitForTimeout(1000);

                let hostButton = await this.page.$(CONFIG.selectors.hostButton);

                if (!hostButton) {
                    // Try alternative selectors that might work
                    const altSelectors = [
                        '.clsy-profile__likes-dialog-i-them',
                        'a[href*="likes"]',
                        'button[title*="gefallen"]',
                        '.clsy-profile__likes-dialog',
                        '[data-testid*="likes"]'
                    ];

                    console.log(`🔍 Tab ${this.tabId}: Primary selector failed, trying alternatives...`);

                    for (const selector of altSelectors) {
                        hostButton = await this.page.$(selector);
                        if (hostButton) {
                            console.log(`✅ Tab ${this.tabId}: Found button with selector: ${selector}`);
                            break;
                        }
                    }

                    // If still not found, check what elements are actually on the page
                    if (!hostButton) {
                        console.log(`🔍 Tab ${this.tabId}: Checking what elements are available...`);
                        const availableElements = await this.page.evaluate(() => {
                            const elements = [];
                            // Look for any elements containing "gefallen" or "likes"
                            const allElements = document.querySelectorAll('*');
                            for (const el of allElements) {
                                const text = el.textContent?.toLowerCase() || '';
                                const className = el.className || '';
                                const href = el.getAttribute('href') || '';

                                if (text.includes('gefallen') || text.includes('likes') ||
                                    className.includes('likes') || href.includes('likes')) {
                                    elements.push({
                                        tag: el.tagName,
                                        class: className,
                                        text: text.substring(0, 50),
                                        href: href
                                    });
                                }
                            }
                            return elements.slice(0, 5); // First 5 matches
                        });

                        console.log(`🔍 Tab ${this.tabId}: Available elements:`, availableElements);

                        console.log(`⚠️ Tab ${this.tabId}: No "mir gefallen" button found for ${name}`);
                        this.sharedState.markProcessed(name, targetAccountId, 'no_button', 0, 0);
                        this.processed++;
                        this.updateProgress();
                        return;
                    }
                }

                // Click the button and wait for modal
                console.log(`🖱️ Tab ${this.tabId}: Clicking "mir gefallen" button for ${name}`);
                await hostButton.click();
                await this.page.waitForTimeout(CONFIG.delays.modalLoad);

                // Check if modal opened
                let modal = await this.page.$(CONFIG.selectors.modal);

                if (!modal) {
                    // Try alternative modal selectors
                    const modalSelectors = [
                        '.clsy-c-dialog__body',
                        '.clsy-c-dialog',
                        '[role="dialog"]',
                        '.modal-body',
                        '.dialog-content'
                    ];

                    for (const selector of modalSelectors) {
                        modal = await this.page.$(selector);
                        if (modal) {
                            console.log(`✅ Tab ${this.tabId}: Found modal with selector: ${selector}`);
                            break;
                        }
                    }

                    if (!modal) {
                        console.log(`⚠️ Tab ${this.tabId}: Modal did not open for ${name}`);
                        this.sharedState.markProcessed(name, targetAccountId, 'no_modal', 0, 0);
                        this.processed++;
                        this.updateProgress();
                        return;
                    }
                }

                // Extract followed accounts
                const followedAccounts = await this.extractFollowedAccounts(name, targetAccountId);

                // Save results
                if (followedAccounts.length > 0) {
                    this.sharedState.appendResults(followedAccounts);
                    const premiumCount = followedAccounts.filter(acc => acc.is_premium).length;
                    console.log(`✅ Tab ${this.tabId}: Found ${followedAccounts.length} accounts for ${name} (${premiumCount} premium)`);
                    this.sharedState.markProcessed(name, targetAccountId, 'completed', premiumCount, followedAccounts.length);
                } else {
                    console.log(`⚠️ Tab ${this.tabId}: No followed accounts found for ${name}`);
                    this.sharedState.markProcessed(name, targetAccountId, 'no_follows', 0, 0);
                }

                this.processed++;
                this.updateProgress();
                return; // Success, exit retry loop

            } catch (error) {
                console.error(`❌ Tab ${this.tabId}: Error processing ${name} (attempt ${attempt}):`, error.message);

                if (attempt === maxRetries) {
                    this.sharedState.markProcessed(name, targetAccountId, 'failed', 0, 0);
                    this.failed++;
                    this.processed++;
                    this.updateProgress();
                } else {
                    await this.page.waitForTimeout(2000); // Wait before retry
                }
            }
        }
    }

    async extractFollowedAccounts(targetName, targetAccountId) {
        const followedAccounts = [];
        let loadMoreAttempts = 0;
        const maxLoadMore = 50;

        try {
            while (loadMoreAttempts < maxLoadMore) {
                // Extract current accounts
                const accountBoxes = await this.page.$$(CONFIG.selectors.accountBox);

                for (const box of accountBoxes) {
                    try {
                        // Get profile name
                        const nameElement = await box.$(CONFIG.selectors.profileName);
                        if (!nameElement) continue;

                        const followedAccountName = await nameElement.textContent();
                        if (!followedAccountName) continue;

                        // Check if already extracted
                        if (followedAccounts.some(acc => acc.followed_account === followedAccountName)) {
                            continue;
                        }

                        // Get profile link
                        const linkElement = await box.$(CONFIG.selectors.profileLink);
                        const profileLink = linkElement ? await linkElement.getAttribute('href') : '';
                        const fullProfileLink = profileLink ? `https://www.markt.de${profileLink}` : '';

                        // Extract user ID from link
                        const userIdMatch = profileLink ? profileLink.match(/userId[,\/](\d+)/) : null;
                        const followedAccountId = userIdMatch ? userIdMatch[1] : '';

                        // Check if premium
                        const premiumIndicator = await box.$(CONFIG.selectors.premiumIndicator);
                        const isPremium = !!premiumIndicator;

                        // Get profile image
                        const imageElement = await box.$(CONFIG.selectors.profileImage);
                        const profileImageUrl = imageElement ? await imageElement.getAttribute('src') : '';

                        followedAccounts.push({
                            target_account: targetName,
                            target_account_id: targetAccountId,
                            followed_account: followedAccountName,
                            followed_account_id: followedAccountId,
                            is_premium: isPremium,
                            profile_image_url: profileImageUrl || '',
                            profile_link: fullProfileLink
                        });

                    } catch (error) {
                        console.error(`⚠️ Tab ${this.tabId}: Error extracting account data:`, error.message);
                    }
                }

                // Try to load more
                const loadMoreButton = await this.page.$(CONFIG.selectors.loadMoreButton);
                if (!loadMoreButton) {
                    break; // No more accounts to load
                }

                await loadMoreButton.click();
                await this.page.waitForTimeout(CONFIG.delays.loadMore);
                loadMoreAttempts++;
            }

        } catch (error) {
            console.error(`⚠️ Tab ${this.tabId}: Error during extraction:`, error.message);
        }

        return followedAccounts;
    }

    updateProgress() {
        this.sharedState.updateProgress(this.tabId, {
            processed: this.processed,
            failed: this.failed,
            status: 'running'
        });
    }
}

// Main orchestrator
class ParallelScraper {
    constructor() {
        this.sharedState = new SharedState();
        this.targetAccounts = [];
        this.browser = null;
        this.tabs = [];
        this.startTime = Date.now();
    }

    // Enhanced CSV parsing that handles quoted fields properly
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
        return fields.map(field => {
            if (field.startsWith('"') && field.endsWith('"')) {
                return field.slice(1, -1);
            }
            return field;
        });
    }

    loadTargetAccounts() {
        try {
            const csvContent = fs.readFileSync(CONFIG.csv.inputFilename, 'utf8');
            const lines = csvContent.split('\n').filter(line => line.trim());

            // Skip header and parse accounts
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const fields = this.parseCSVLine(line);
                if (fields.length >= 3) {
                    const name = fields[0];
                    const ID = fields[1];
                    const link = fields[2];

                    if (name && ID && link && link.includes('markt.de')) {
                        this.targetAccounts.push({
                            name: name.trim(),
                            ID: ID.trim(),
                            link: link.trim()
                        });
                    }
                }
            }

            console.log(`📋 Loaded ${this.targetAccounts.length} target accounts`);
            return this.targetAccounts.length > 0;

        } catch (error) {
            console.error('❌ Error loading target accounts:', error.message);
            return false;
        }
    }

    distributeWorkload() {
        const accountsPerTab = Math.ceil(this.targetAccounts.length / CONFIG.parallel.tabs);
        const workloads = [];

        for (let i = 0; i < CONFIG.parallel.tabs; i++) {
            const start = i * accountsPerTab;
            const end = Math.min(start + accountsPerTab, this.targetAccounts.length);
            const accounts = this.targetAccounts.slice(start, end);

            if (accounts.length > 0) {
                workloads.push(accounts);
                console.log(`📱 Tab ${i + 1}: ${accounts.length} accounts`);
            }
        }

        return workloads;
    }

    async initializeBrowser() {
        console.log('🚀 Starting browser...');

        this.browser = await chromium.launch({
            headless: CONFIG.browser.headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        });

        console.log(`✅ Browser initialized in ${CONFIG.browser.headless ? 'headless' : 'visible'} mode`);
    }

    startProgressMonitor() {
        setInterval(() => {
            try {
                const progress = this.sharedState.getProgress();
                if (!progress || !progress.tabs) return;

                let totalProcessed = 0;
                let totalFailed = 0;

                Object.values(progress.tabs).forEach(data => {
                    totalProcessed += data.processed || 0;
                    totalFailed += data.failed || 0;
                });

                const elapsed = Math.round((Date.now() - this.startTime) / 1000);
                const rate = elapsed > 0 ? totalProcessed / (elapsed / 60) : 0; // accounts per minute
                const remaining = this.targetAccounts.length - totalProcessed;
                const eta = remaining > 0 && rate > 0 ? Math.round(remaining / rate) : 0;

                console.log(`📊 Progress: ${totalProcessed}/${this.targetAccounts.length} (${Math.round((totalProcessed / this.targetAccounts.length) * 100)}%) | Rate: ${rate.toFixed(1)}/min | ETA: ${eta}min | Failed: ${totalFailed}`);
            } catch (error) {
                console.error('Error in progress monitor:', error.message);
            }
        }, 30000); // Update every 30 seconds
    }

    async run() {
        console.log('🚀 Starting Parallel Premium Scraper...');

        // Load target accounts
        if (!this.loadTargetAccounts()) {
            console.error('❌ Failed to load target accounts');
            return;
        }

        // Initialize browser
        await this.initializeBrowser();

        // Distribute workload
        const workloads = this.distributeWorkload();
        console.log(`📊 Distributed ${this.targetAccounts.length} accounts across ${workloads.length} tabs`);

        // Start progress monitor
        this.startProgressMonitor();

        // Create tabs and start workers
        const tabPromises = [];

        for (let i = 0; i < workloads.length; i++) {
            const accounts = workloads[i];
            const tabId = i + 1;

            // Stagger tab creation
            await new Promise(resolve => setTimeout(resolve, CONFIG.delays.tabStart));

            const page = await this.browser.newPage();
            const tab = new ScraperTab(tabId, page, accounts, this.sharedState);

            this.tabs.push(tab);
            tabPromises.push(tab.run());
        }

        // Wait for all tabs to complete
        try {
            await Promise.all(tabPromises);
            console.log('🎉 All scraping tabs completed successfully!');
        } catch (error) {
            console.error('❌ Some tabs failed:', error.message);
        }

        // Final summary
        const finalProgress = this.sharedState.getProgress();
        if (finalProgress && finalProgress.tabs) {
            let totalProcessed = 0;
            let totalFailed = 0;

            Object.values(finalProgress.tabs).forEach(data => {
                totalProcessed += data.processed || 0;
                totalFailed += data.failed || 0;
            });

            console.log('\n🎯 FINAL SUMMARY:');
            console.log('=================');
            console.log(`Total accounts processed: ${totalProcessed}`);
            console.log(`Total accounts failed: ${totalFailed}`);
            if (totalProcessed + totalFailed > 0) {
                console.log(`Success rate: ${Math.round((totalProcessed / (totalProcessed + totalFailed)) * 100)}%`);
            }
            console.log(`Output file: ${CONFIG.csv.outputFilename}`);
            console.log(`Processed file: ${CONFIG.csv.processedFilename}`);
        }

        // Close browser
        if (this.browser) {
            await this.browser.close();
            console.log('🔒 Browser closed');
        }
    }
}

// Run the scraper
if (require.main === module) {
    const scraper = new ParallelScraper();
    scraper.run().catch(console.error);
}

module.exports = ParallelScraper;