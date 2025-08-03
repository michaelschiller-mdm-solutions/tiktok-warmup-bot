/*
 * Markt.de Profile Scraper - Automated Browser Version
 * 
 * This script uses Playwright to automatically open a browser, navigate to markt.de profiles,
 * and scrape user data from both "mir gefallen" and "ich gefalle" modals.
 * 
 * Installation:
 * npm install playwright
 * npx playwright install chromium
 * 
 * Usage:
 * node markt-de-scraper-automated.js
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    // Target profile URL - change this to scrape different profiles
    profileUrl: 'https://www.markt.de/dinademona/userId,19354400/profile.htm',
    
    delays: {
        pageLoad: 3000,         // Wait for page to load
        modalLoad: 2000,        // Wait for modal to open
        loadMore: 1200,         // Wait between "Mehr Likes laden" clicks (faster)
        extraction: 300,        // Wait between account extractions (faster)
        betweenModals: 2000     // Wait between host and target scraping
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
        batchSize: 20  // Save every 20 accounts
    },
    
    browser: {
        headless: false,        // Set to true to run without GUI
        slowMo: 500,           // Slow down actions for visibility
        viewport: { width: 1280, height: 720 }
    }
};

// Utility functions
class Utils {
    static log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[${timestamp}] Markt.de Scraper:`;
        
        switch(type) {
            case 'error':
                console.error(`${prefix} ❌ ${message}`);
                break;
            case 'success':
                console.log(`${prefix} ✅ ${message}`);
                break;
            case 'warning':
                console.warn(`${prefix} ⚠️ ${message}`);
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
        this.processedIds = new Set();
        this.pendingAccounts = {
            host: [],
            target: []
        };
        this.ensureCSVHeaders();
    }
    
    ensureCSVHeaders() {
        const header = 'name,ID,link\n';
        
        // Ensure marktde directory exists
        if (!fs.existsSync('./marktde')) {
            fs.mkdirSync('./marktde', { recursive: true });
            Utils.log('Created marktde directory');
        }
        
        // Create host CSV if it doesn't exist
        if (!fs.existsSync(CONFIG.csv.hostFilename)) {
            fs.writeFileSync(CONFIG.csv.hostFilename, header);
            Utils.log(`Created ${CONFIG.csv.hostFilename}`);
        }
        
        // Create target CSV if it doesn't exist
        if (!fs.existsSync(CONFIG.csv.targetFilename)) {
            fs.writeFileSync(CONFIG.csv.targetFilename, header);
            Utils.log(`Created ${CONFIG.csv.targetFilename}`);
        }
        
        // Load existing IDs to prevent duplicates
        this.loadExistingIds();
    }
    
    loadExistingIds() {
        try {
            // Load from host file
            if (fs.existsSync(CONFIG.csv.hostFilename)) {
                const hostContent = fs.readFileSync(CONFIG.csv.hostFilename, 'utf8');
                const hostLines = hostContent.split('\n').slice(1); // Skip header
                hostLines.forEach(line => {
                    const match = line.match(/,(\d+),/);
                    if (match) this.processedIds.add(match[1]);
                });
            }
            
            // Load from target file
            if (fs.existsSync(CONFIG.csv.targetFilename)) {
                const targetContent = fs.readFileSync(CONFIG.csv.targetFilename, 'utf8');
                const targetLines = targetContent.split('\n').slice(1); // Skip header
                targetLines.forEach(line => {
                    const match = line.match(/,(\d+),/);
                    if (match) this.processedIds.add(match[1]);
                });
            }
            
            Utils.log(`Loaded ${this.processedIds.size} existing account IDs`);
        } catch (error) {
            Utils.log(`Error loading existing IDs: ${error.message}`, 'warning');
        }
    }
    
    addAccountsToBatch(accounts, type) {
        if (accounts.length === 0) {
            return 0;
        }
        
        const newAccounts = accounts.filter(account => {
            if (this.processedIds.has(account.userId)) {
                return false;
            }
            this.processedIds.add(account.userId);
            return true;
        });
        
        if (newAccounts.length === 0) {
            return 0;
        }
        
        // Add to pending batch
        this.pendingAccounts[type].push(...newAccounts);
        
        // Save batch if it reaches the limit
        if (this.pendingAccounts[type].length >= CONFIG.csv.batchSize) {
            this.saveBatch(type);
        }
        
        return newAccounts.length;
    }
    
    saveBatch(type) {
        const filename = type === 'host' ? CONFIG.csv.hostFilename : CONFIG.csv.targetFilename;
        const accounts = this.pendingAccounts[type];
        
        if (accounts.length === 0) {
            return 0;
        }
        
        // Append to CSV file
        const csvRows = accounts.map(account => 
            `${account.name},${account.userId},${account.link}`
        ).join('\n') + '\n';
        
        fs.appendFileSync(filename, csvRows);
        Utils.log(`💾 Batch saved: ${accounts.length} ${type} accounts to ${path.basename(filename)}`, 'success');
        
        // Clear the batch
        const savedCount = accounts.length;
        this.pendingAccounts[type] = [];
        
        return savedCount;
    }
    
    saveAllPendingBatches() {
        let totalSaved = 0;
        totalSaved += this.saveBatch('host');
        totalSaved += this.saveBatch('target');
        
        if (totalSaved > 0) {
            Utils.log(`💾 Final batch save: ${totalSaved} accounts saved`, 'success');
        }
        
        return totalSaved;
    }
    
    saveAccounts(accounts, filename) {
        // Legacy method for compatibility - determine type from filename
        const type = filename.includes('host') ? 'host' : 'target';
        return this.addAccountsToBatch(accounts, type);
    }
}

// Data Extractor Class
class DataExtractor {
    static parseProfileUrl(href) {
        try {
            const match = href.match(/userId,(\d+)/);
            return match ? match[1] : null;
        } catch (error) {
            Utils.log(`Error parsing profile URL ${href}: ${error.message}`, 'error');
            return null;
        }
    }
    
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
                        
                        accounts.push({
                            name: sanitizedName,
                            userId: userId,
                            link: link
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

// Modal Handler Class
class ModalHandler {
    static async openModal(page, buttonSelector, modalType) {
        Utils.log(`Opening ${modalType} modal...`);
        
        // Wait for button to be visible and click it
        await page.waitForSelector(buttonSelector, { timeout: 10000 });
        await page.click(buttonSelector);
        
        // Wait for modal to appear
        await page.waitForSelector(CONFIG.selectors.modal, { timeout: 10000 });
        await Utils.sleep(CONFIG.delays.modalLoad);
        
        Utils.log(`${modalType} modal opened successfully`);
    }
    
    static async loadAllAccounts(page, csvManager, filename, modalType) {
        let allAccounts = [];
        let loadMoreClicks = 0;
        let consecutiveNoNewAccounts = 0;
        let consecutiveFailedClicks = 0;
        const type = filename.includes('host') ? 'host' : 'target';
        
        Utils.log(`Starting ${modalType} account extraction...`);
        
        while (true) {
            // Extract current accounts
            const currentAccounts = await DataExtractor.extractAccountsFromPage(page);
            
            // Filter out accounts we already have in this session
            const newAccounts = currentAccounts.filter(account => 
                !allAccounts.some(existing => existing.userId === account.userId)
            );
            
            allAccounts.push(...newAccounts);
            
            Utils.log(`📊 Extracted ${newAccounts.length} new accounts (session total: ${allAccounts.length})`);
            
            // Add to batch for saving
            if (newAccounts.length > 0) {
                csvManager.addAccountsToBatch(newAccounts, type);
                consecutiveNoNewAccounts = 0;
            } else {
                consecutiveNoNewAccounts++;
            }
            
            // Look for "Mehr Likes laden" button with multiple selectors
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
                Utils.log('✅ No "Mehr Likes laden" button found - pagination complete');
                break;
            }
            
            // Check if button is visible and clickable
            const isVisible = await loadMoreButton.isVisible().catch(() => false);
            const isEnabled = await loadMoreButton.isEnabled().catch(() => false);
            
            if (!isVisible || !isEnabled) {
                Utils.log('✅ "Mehr Likes laden" button not clickable - pagination complete');
                break;
            }
            
            // Stop if we haven't found new accounts in many attempts
            if (consecutiveNoNewAccounts >= 5) {
                Utils.log('⚠️ No new accounts found in 5 consecutive attempts, stopping pagination');
                break;
            }
            
            // Click load more button with retry logic
            Utils.log(`🔄 Clicking "Mehr Likes laden" button (click #${loadMoreClicks + 1})...`);
            
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
                Utils.log(`❌ Failed to click "Mehr Likes laden" button (attempt ${consecutiveFailedClicks}): ${error.message}`, 'warning');
                
                if (consecutiveFailedClicks >= 3) {
                    Utils.log('❌ Failed to click button 3 times in a row, stopping pagination');
                    break;
                }
                
                // Wait longer before retry
                await Utils.sleep(2000);
            }
            
            // Much higher safety limit for extensive scraping
            if (loadMoreClicks >= 200) {
                Utils.log('⚠️ Reached maximum pagination clicks (200), stopping', 'warning');
                break;
            }
            
            // Progress update every 10 clicks
            if (loadMoreClicks % 10 === 0) {
                Utils.log(`📈 Progress: ${loadMoreClicks} clicks, ${allAccounts.length} accounts extracted so far`);
            }
        }
        
        // Save any remaining accounts in batch
        csvManager.saveBatch(type);
        
        Utils.log(`✅ ${modalType} extraction complete: ${allAccounts.length} total accounts after ${loadMoreClicks} pagination clicks`, 'success');
        return allAccounts;
    }
    
    static async closeModal(page) {
        try {
            // Try to find and click close button
            const closeButton = await page.$(CONFIG.selectors.closeButton);
            if (closeButton) {
                await closeButton.click();
                Utils.log('Modal closed with close button');
            } else {
                // Try pressing Escape key
                await page.keyboard.press('Escape');
                Utils.log('Modal closed with Escape key');
            }
            
            await Utils.sleep(1000);
        } catch (error) {
            Utils.log(`Error closing modal: ${error.message}`, 'warning');
        }
    }
}

// Main Scraper Class
class MarktDeScraper {
    constructor() {
        this.csvManager = new CSVManager();
        this.stats = {
            hostAccounts: 0,
            targetAccounts: 0,
            errors: []
        };
    }
    
    async scrapeProfile() {
        let browser;
        
        try {
            Utils.log('Starting automated markt.de profile scraping...');
            Utils.log(`Target URL: ${CONFIG.profileUrl}`);
            
            // Launch browser
            browser = await chromium.launch({
                headless: CONFIG.browser.headless,
                slowMo: CONFIG.browser.slowMo
            });
            
            const context = await browser.newContext({
                viewport: CONFIG.browser.viewport
            });
            
            const page = await context.newPage();
            
            // Navigate to profile page
            Utils.log('Navigating to profile page...');
            await page.goto(CONFIG.profileUrl, { waitUntil: 'networkidle' });
            await Utils.sleep(CONFIG.delays.pageLoad);
            
            // Handle cookie consent
            await this.handleCookieConsent(page);
            
            // Scrape host accounts ("mir gefallen")
            await this.scrapeHostAccounts(page);
            
            // Wait between modals
            await Utils.sleep(CONFIG.delays.betweenModals);
            
            // Scrape target accounts ("ich gefalle")
            await this.scrapeTargetAccounts(page);
            
            // Save any remaining batches
            this.csvManager.saveAllPendingBatches();
            
            // Display summary
            this.displaySummary();
            
        } catch (error) {
            Utils.log(`Fatal error: ${error.message}`, 'error');
            throw error;
        } finally {
            if (browser) {
                await browser.close();
                Utils.log('Browser closed');
            }
        }
    }
    
    async scrapeHostAccounts(page) {
        try {
            await ModalHandler.openModal(page, CONFIG.selectors.hostButton, 'Host');
            const accounts = await ModalHandler.loadAllAccounts(
                page, 
                this.csvManager, 
                CONFIG.csv.hostFilename, 
                'Host'
            );
            this.stats.hostAccounts = accounts.length;
            await ModalHandler.closeModal(page);
            
        } catch (error) {
            Utils.log(`Error extracting host accounts: ${error.message}`, 'error');
            this.stats.errors.push({ type: 'host', error: error.message });
        }
    }
    
    async scrapeTargetAccounts(page) {
        try {
            await ModalHandler.openModal(page, CONFIG.selectors.targetButton, 'Target');
            const accounts = await ModalHandler.loadAllAccounts(
                page, 
                this.csvManager, 
                CONFIG.csv.targetFilename, 
                'Target'
            );
            this.stats.targetAccounts = accounts.length;
            await ModalHandler.closeModal(page);
            
        } catch (error) {
            Utils.log(`Error extracting target accounts: ${error.message}`, 'error');
            this.stats.errors.push({ type: 'target', error: error.message });
        }
    }
    
    async handleCookieConsent(page) {
        Utils.log('🍪 Checking for cookie consent dialog...');
        
        try {
            // Common cookie consent selectors for German websites
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
            await Utils.sleep(1500);
            
            // Try each selector
            for (const selector of cookieSelectors) {
                try {
                    const cookieButton = await page.$(selector);
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
                            Utils.log('🍪 Found cookie consent in dialog');
                            await acceptButton.click();
                            Utils.log('✅ Cookie consent accepted from dialog', 'success');
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
            // Continue anyway - not critical for scraping
        }
    }
    
    displaySummary() {
        Utils.log('=== SCRAPING SUMMARY ===');
        Utils.log(`Host accounts extracted: ${this.stats.hostAccounts}`);
        Utils.log(`Target accounts extracted: ${this.stats.targetAccounts}`);
        Utils.log(`Total accounts processed: ${this.stats.hostAccounts + this.stats.targetAccounts}`);
        Utils.log(`Total unique accounts in database: ${this.csvManager.processedIds.size}`);
        
        if (this.stats.errors.length > 0) {
            Utils.log(`Errors encountered: ${this.stats.errors.length}`, 'warning');
            this.stats.errors.forEach(error => {
                Utils.log(`${error.type}: ${error.error}`, 'error');
            });
        }
        
        Utils.log(`CSV files saved in: ${path.dirname(CONFIG.csv.hostFilename)}/`);
        Utils.log('=== SCRAPING COMPLETE ===', 'success');
    }
}

// Main execution
async function main() {
    try {
        const scraper = new MarktDeScraper();
        await scraper.scrapeProfile();
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

module.exports = { MarktDeScraper, CONFIG };