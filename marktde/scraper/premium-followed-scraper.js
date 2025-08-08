/*
 * Markt.de Premium Followed Accounts Scraper
 * 
 * Parallel-safe version: Adds file-based locks to allow running up to 10+ instances concurrently
 * - Per-target lock to ensure only one instance processes a target at a time
 * - Serialized CSV writes via file locks to prevent interleaved appends
 * - Optional --instance-id flag to tag logs per instance
 * 
 * Installation:
 * npm install playwright
 * npx playwright install chromium
 * 
 * Usage:
 * node premium-followed-scraper.js [--instance-id=N] [--visible] [--max=N] [--session-size=N]
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Ensure consistent directories
const SCRAPER_DIR = __dirname;
const LOCKS_DIR = path.join(SCRAPER_DIR, 'locks');
if (!fs.existsSync(LOCKS_DIR)) {
    fs.mkdirSync(LOCKS_DIR, { recursive: true });
}

// Configuration
const CONFIG = {
    delays: {
        pageLoad: 2000,         // Wait for page to load
        modalLoad: 1500,        // Wait for modal to open
        loadMore: 800,          // Wait between "Mehr Likes laden" clicks
        extraction: 200,        // Wait between account extractions
        betweenProfiles: 1500,  // Wait between different target profiles
        sessionBreak: 300000    // 5 minutes between sessions
    },
    
    selectors: {
        hostButton: '.clsy-profile__likes-dialog-i-them', // "mir gefallen" button
        modal: '.clsy-c-dialog__body',
        loadMoreButton: '.clsy-c-endlessScrolling--hasMore',
        accountBox: '.clsy-c-userbox',
        premiumIndicator: '.clsy-profile-image--premium',
        profileImage: '.clsy-profile-image',
        profileName: '.clsy-c-userbox__profile-name',
        closeButton: '.clsy-c-dialog__close, [aria-label="Close"]'
    },
    
    csv: {
        inputFilename: './target_accounts.csv',
        outputFilename: './premium_followed_by.csv',
        processedFilename: './premium_processed_targets.csv',
        batchSize: 5  // Save every 5 accounts for more frequent saves
    },
    
    session: {
        maxAccountsPerSession: 50,  // Process 50 target accounts per session
        sessionBreakMinutes: 5,     // Break between sessions
        maxRetries: 3,              // Retry failed accounts
        resumeFromLast: true        // Resume from last processed account
    },
    
    browser: {
        headless: true,         // Run in background by default
        slowMo: 100,           // Faster execution for background mode
        viewport: { width: 1280, height: 720 }
    },
    
    limits: {
        maxPremiumAccounts: 50,  // Max premium accounts to extract per target
        fallbackNormalAccounts: 5, // Number of normal accounts if no premium found
        maxLoadMoreClicks: 100   // Safety limit for pagination
    },

    concurrency: {
        enableParallel: true,
        writeLockRetryDelayMs: 100,
        writeLockTimeoutMs: 30000,
        targetLockRetryDelayMs: 50,
        targetLockTimeoutMs: 0 // immediate skip if already claimed
    },

    instanceId: null
};

// Simple file-based locking utility
class FileLock {
    static getLockPath(lockName) {
        return path.join(LOCKS_DIR, lockName);
    }

    static tryAcquireLock(lockName, timeoutMs = 0, retryDelayMs = 100) {
        const lockPath = FileLock.getLockPath(lockName);
        const start = Date.now();
        // Always attempt at least once
        // Use 'wx' to fail if file exists (atomic across processes)
        while (true) {
            try {
                fs.writeFileSync(lockPath, String(process.pid), { flag: 'wx' });
                return true;
            } catch (err) {
                if (err && err.code === 'EEXIST') {
                    if (timeoutMs === 0) return false;
                    if (Date.now() - start >= timeoutMs) return false;
                    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, retryDelayMs); // non-blocking-ish sleep
                } else {
                    // For other errors, try a brief wait and retry until timeout
                    if (timeoutMs === 0) return false;
                    if (Date.now() - start >= timeoutMs) return false;
                    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, retryDelayMs);
                }
            }
        }
    }

    static releaseLock(lockName) {
        const lockPath = FileLock.getLockPath(lockName);
        try {
            if (fs.existsSync(lockPath)) {
                fs.unlinkSync(lockPath);
            }
        } catch (_) { /* ignore */ }
    }
}

// Utility functions
class Utils {
    static log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const inst = CONFIG.instanceId != null ? `#${CONFIG.instanceId}` : '';
        const prefix = `[${timestamp}] Premium Scraper${inst}:`;
        
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
        
        let sanitized = text.replace(/\"/g, '""');
        
        if (sanitized.includes(',') || sanitized.includes('\n') || sanitized.includes('"')) {
            sanitized = `"${sanitized}"`;
        }
        
        return sanitized;
    }

    static sanitizeUrl(url) {
        if (!url) return url;
        let out = String(url).trim();
        // Remove any surrounding quotes (one or many)
        out = out.replace(/^"+|"+$/g, '');
        // Remove stray quotes inside common prefix/suffix
        if (out.startsWith('"')) out = out.slice(1);
        if (out.endsWith('"')) out = out.slice(0, -1);
        return out;
    }

    static buildProfileUrl(name, userId) {
        if (!name || !userId) return null;
        const cleanName = String(name).replace(/"/g, '').trim().replace(/\s+/g, '+').toLowerCase();
        return `https://www.markt.de/${cleanName}/userId,${userId}/profile.htm`;
    }

    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        return result.map(f => f.replace(/^"|"$/g, ''));
    }
}

// CSV Manager Class
class PremiumCSVManager {
    constructor() {
        this.processedPairs = new Set(); // Track target_account + followed_account pairs
        this.processedTargets = new Set(); // Track processed target accounts
        this.pendingAccounts = [];
        this.ensureCSVHeaders();
        this.loadProcessedTargets();
    }
    
    ensureCSVHeaders() {
        const header = 'target_account,target_account_id,followed_account,followed_account_id,is_premium,profile_image_url,profile_link\n';
        const processedHeader = 'target_account,target_account_id,status,timestamp,premium_found,total_followed\n';
        
        // Create output CSV if it doesn't exist (use exclusive flag to avoid races)
        try {
            if (!fs.existsSync(CONFIG.csv.outputFilename)) {
                fs.writeFileSync(CONFIG.csv.outputFilename, header, { flag: 'wx' });
                Utils.log(`Created ${CONFIG.csv.outputFilename}`);
            }
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
        
        // Create processed targets CSV if it doesn't exist
        try {
            if (!fs.existsSync(CONFIG.csv.processedFilename)) {
                fs.writeFileSync(CONFIG.csv.processedFilename, processedHeader, { flag: 'wx' });
                Utils.log(`Created ${CONFIG.csv.processedFilename}`);
            }
        } catch (err) {
            if (err.code !== 'EEXIST') throw err;
        }
        
        // Load existing pairs to prevent duplicates
        this.loadExistingPairs();
    }
    
    loadExistingPairs() {
        try {
            if (fs.existsSync(CONFIG.csv.outputFilename)) {
                const content = fs.readFileSync(CONFIG.csv.outputFilename, 'utf8');
                const lines = content.split('\n').slice(1); // Skip header
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return;
                    const parts = Utils.parseCSVLine(trimmed);
                    // Expected columns: target_account, target_account_id, followed_account, followed_account_id, ...
                    if (parts.length >= 4) {
                        const targetId = parts[1];
                        const followedId = parts[3];
                        if (targetId && followedId) {
                            const pairKey = `${targetId}_${followedId}`;
                            this.processedPairs.add(pairKey);
                        }
                    }
                });
            }
            
            Utils.log(`Loaded ${this.processedPairs.size} existing account pairs`);
        } catch (error) {
            Utils.log(`Error loading existing pairs: ${error.message}`, 'warning');
        }
    }
    
    addAccountsToBatch(targetAccount, followedAccounts) {
        if (!followedAccounts || followedAccounts.length === 0) {
            return 0;
        }
        
        const newAccounts = followedAccounts.filter(account => {
            const pairKey = `${targetAccount.userId}_${account.userId}`;
            if (this.processedPairs.has(pairKey)) {
                return false;
            }
            this.processedPairs.add(pairKey);
            return true;
        });
        
        if (newAccounts.length === 0) {
            return 0;
        }
        
        // Add target account info to each followed account
        const enrichedAccounts = newAccounts.map(account => ({
            target_account: targetAccount.name,
            target_account_id: targetAccount.userId,
            followed_account: account.name,
            followed_account_id: account.userId,
            is_premium: account.isPremium,
            profile_image_url: account.profileImageUrl || '',
            profile_link: account.link
        }));
        
        // Add to pending batch
        this.pendingAccounts.push(...enrichedAccounts);
        
        // Save batch if it reaches the limit
        if (this.pendingAccounts.length >= CONFIG.csv.batchSize) {
            this.saveBatch();
        }
        
        return newAccounts.length;
    }
    
    saveBatch() {
        if (this.pendingAccounts.length === 0) {
            return 0;
        }
        
        // Append to CSV file (protected by write lock)
        const csvRows = this.pendingAccounts.map(account => 
            `${Utils.sanitizeForCSV(account.target_account)},${account.target_account_id},${Utils.sanitizeForCSV(account.followed_account)},${account.followed_account_id},${account.is_premium},${Utils.sanitizeForCSV(account.profile_image_url)},${Utils.sanitizeForCSV(account.profile_link)}`
        ).join('\n') + '\n';
        
        const lockName = 'premium_followed_by.csv.lock';
        const acquired = FileLock.tryAcquireLock(
            lockName,
            CONFIG.concurrency.writeLockTimeoutMs,
            CONFIG.concurrency.writeLockRetryDelayMs
        );
        if (!acquired) {
            Utils.log('Failed to acquire write lock for premium_followed_by.csv; skipping batch save to avoid corruption', 'warning');
            return 0;
        }
        try {
            fs.appendFileSync(CONFIG.csv.outputFilename, csvRows);
            Utils.log(`💾 Batch saved: ${this.pendingAccounts.length} premium followed accounts`, 'success');
        } finally {
            FileLock.releaseLock(lockName);
        }
        
        // Clear the batch
        const savedCount = this.pendingAccounts.length;
        this.pendingAccounts = [];
        
        return savedCount;
    }
    
    saveAllPendingBatches() {
        const totalSaved = this.saveBatch();
        
        if (totalSaved > 0) {
            Utils.log(`💾 Final batch save: ${totalSaved} accounts saved`, 'success');
        }
        
        return totalSaved;
    }
    
    loadProcessedTargets() {
        try {
            if (fs.existsSync(CONFIG.csv.processedFilename)) {
                const content = fs.readFileSync(CONFIG.csv.processedFilename, 'utf8');
                const lines = content.split('\n').slice(1); // Skip header
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (!trimmed) return;
                    const parts = Utils.parseCSVLine(trimmed);
                    if (parts.length >= 2) {
                        this.processedTargets.add(parts[1]); // target_account_id
                    }
                });
            }
            
            Utils.log(`Loaded ${this.processedTargets.size} processed target accounts`);
        } catch (error) {
            Utils.log(`Error loading processed targets: ${error.message}`, 'warning');
        }
    }
    
    markTargetAsProcessed(targetAccount, premiumFound, totalFollowed, status = 'completed') {
        const timestamp = new Date().toISOString();
        const csvRow = `${Utils.sanitizeForCSV(targetAccount.name)},${targetAccount.userId},${status},${timestamp},${premiumFound},${totalFollowed}\n`;
        
        const lockName = 'premium_processed_targets.csv.lock';
        const acquired = FileLock.tryAcquireLock(
            lockName,
            CONFIG.concurrency.writeLockTimeoutMs,
            CONFIG.concurrency.writeLockRetryDelayMs
        );
        if (!acquired) {
            Utils.log('Failed to acquire write lock for premium_processed_targets.csv; skipping processed mark to avoid corruption', 'warning');
            return;
        }
        try {
            fs.appendFileSync(CONFIG.csv.processedFilename, csvRow);
            this.processedTargets.add(targetAccount.userId);
        } finally {
            FileLock.releaseLock(lockName);
        }
        
        Utils.log(`📝 Marked ${targetAccount.name} as ${status} (${premiumFound} premium, ${totalFollowed} total)`);
    }
    
    isTargetProcessed(targetAccount) {
        return this.processedTargets.has(targetAccount.userId);
    }
}

// Target Account Loader
class TargetAccountLoader {
    static parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                // Toggle quote state; support doubled quotes inside quoted field
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++; // skip escaped quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.trim());
        // Strip wrapping quotes from each field
        return result.map(f => f.replace(/^"|"$/g, ''));
    }

    static loadTargetAccounts() {
        try {
            if (!fs.existsSync(CONFIG.csv.inputFilename)) {
                throw new Error(`Target accounts file not found: ${CONFIG.csv.inputFilename}`);
            }
            
            const content = fs.readFileSync(CONFIG.csv.inputFilename, 'utf8');
            const lines = content.split('\n').slice(1); // Skip header
            
            const accounts = [];
            for (const line of lines) {
                if (!line || !line.trim()) continue;
                const parts = TargetAccountLoader.parseCSVLine(line.trim());
                if (parts.length < 3) continue;

                const name = parts[0];
                const userId = parts[1];
                let profileUrl = Utils.sanitizeUrl(parts[2]);

                // If link still looks invalid, rebuild from name + id
                if (!profileUrl || profileUrl.includes('"') || !/^https?:\/\//i.test(profileUrl)) {
                    const rebuilt = Utils.buildProfileUrl(name, userId);
                    if (rebuilt) {
                        profileUrl = rebuilt;
                    }
                }

                accounts.push({
                    name,
                    userId,
                    link: profileUrl,
                    profileUrl
                });

                if (accounts.length <= 3) {
                    const rawUrl = parts[2];
                    Utils.log(`Debug - Account ${accounts.length}: ${name} -> raw:${rawUrl} | url:${profileUrl}`);
                }
            }
            
            Utils.log(`Loaded ${accounts.length} target accounts from ${CONFIG.csv.inputFilename}`);
            return accounts;
            
        } catch (error) {
            Utils.log(`Error loading target accounts: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Premium Account Extractor
class PremiumAccountExtractor {
    static async extractPremiumAccountsFromPage(page) {
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
                    
                    const nameElement = box.querySelector(selectors.profileName);
                    if (!nameElement) {
                        return;
                    }
                    
                    const name = nameElement.textContent.trim();
                    const userIdMatch = link.match(/userId,(\d+)/);
                    const userId = userIdMatch ? userIdMatch[1] : null;
                    
                    if (!userId || !name) {
                        return;
                    }
                    
                    // Check if account is premium - look for the specific premium class
                    const profileImageContainer = box.querySelector(selectors.profileImage);
                    const isPremium = profileImageContainer && profileImageContainer.classList.contains('clsy-profile-image--premium');
                    
                    // Get profile image URL
                    let profileImageUrl = '';
                    if (profileImageContainer) {
                        const imgElement = profileImageContainer.querySelector('img');
                        if (imgElement) {
                            profileImageUrl = imgElement.src || '';
                        }
                    }
                    
                    accounts.push({
                        name: name,
                        userId: userId,
                        link: link,
                        isPremium: isPremium,
                        profileImageUrl: profileImageUrl
                    });
                    
                } catch (error) {
                    console.log(`Error extracting account at index ${index}:`, error);
                }
            });
            
            return accounts;
        }, CONFIG.selectors);
    }
    
    static filterPremiumAccounts(accounts) {
        return accounts.filter(account => account.isPremium);
    }
    
    static getFallbackAccounts(accounts, count = CONFIG.limits.fallbackNormalAccounts) {
        const normalAccounts = accounts.filter(account => !account.isPremium);
        return normalAccounts.slice(0, count).map(account => ({
            ...account,
            isPremium: false // Explicitly mark as non-premium
        }));
    }
}

// Modal Handler Class
class PremiumModalHandler {
    static async openMirGefallenModal(page) {
        Utils.log('Opening "mir gefallen" modal...');
        
        // Try to ensure relevant section is visible
        try { await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.25)); } catch (_) {}
        await Utils.sleep(500);
        
        const candidates = [
            CONFIG.selectors.hostButton,                          // known class
            'a.clsy-profile__likes-dialog-i-them',               // explicit anchor
            '[class*="likes-dialog-i-them"]',                   // class contains
            'span:has-text("mir gefallen")',                    // text-based
            'a:has-text("mir gefallen")'                        // text-based link
        ];
        
        let foundHandle = null;
        let usedSelector = null;
        
        for (const sel of candidates) {
            try {
                // Prefer locator for text selectors
                if (sel.includes(':has-text') || sel.startsWith('text=')) {
                    const loc = page.locator(sel);
                    await loc.first().waitFor({ timeout: 3000 }).catch(() => null);
                    const handle = await loc.first().elementHandle();
                    if (handle) {
                        const visible = await loc.first().isVisible().catch(() => false);
                        if (visible) { foundHandle = handle; usedSelector = sel; break; }
                    }
                } else {
                    await page.waitForSelector(sel, { timeout: 3000 }).catch(() => null);
                    const el = await page.$(sel);
                    if (el) {
                        const visible = await el.isVisible().catch(() => false);
                        if (visible) { foundHandle = el; usedSelector = sel; break; }
                    }
                }
            } catch (_) { /* continue */ }
        }
        
        if (!foundHandle) {
            throw new Error('"mir gefallen" button not found');
        }
        
        Utils.log(`Found "mir gefallen" button via ${usedSelector || 'element handle'}`);
        await foundHandle.click();
        
        // Wait for modal to appear
        await page.waitForSelector(CONFIG.selectors.modal, { timeout: 10000 });
        await Utils.sleep(CONFIG.delays.modalLoad);
        
        Utils.log('"mir gefallen" modal opened successfully');
    }

    static async scrollModalToBottom(page) {
        try {
            await page.evaluate((modalSelector) => {
                const modal = document.querySelector(modalSelector);
                if (modal) {
                    modal.scrollTop = modal.scrollHeight;
                } else {
                    window.scrollTo(0, document.body.scrollHeight);
                }
            }, CONFIG.selectors.modal);
        } catch (_) { /* ignore */ }
    }
    
    static async loadAllFollowedAccounts(page, targetAccount, csvManager) {
        let allAccounts = [];
        let premiumAccounts = [];
        let loadMoreClicks = 0;
        let consecutiveNoNewAccounts = 0;
        let consecutiveFailedClicks = 0;
        
        Utils.log(`Extracting followed accounts for ${targetAccount.name}...`);
        
        while (loadMoreClicks < CONFIG.limits.maxLoadMoreClicks) {
            // Extract current accounts
            const currentAccounts = await PremiumAccountExtractor.extractPremiumAccountsFromPage(page);
            
            // Filter out accounts we already have in this session
            const newAccounts = currentAccounts.filter(account => 
                !allAccounts.some(existing => existing.userId === account.userId)
            );
            
            allAccounts.push(...newAccounts);
            
            // Separate premium accounts
            const newPremiumAccounts = PremiumAccountExtractor.filterPremiumAccounts(newAccounts);
            premiumAccounts.push(...newPremiumAccounts);
            
            // IMMEDIATE WRITE: Save new premium accounts to CSV as we find them
            if (newPremiumAccounts.length > 0) {
                csvManager.addAccountsToBatch(targetAccount, newPremiumAccounts);
                Utils.log(`💾 Immediately saved ${newPremiumAccounts.length} premium accounts to CSV`);
            }
            
            Utils.log(`📊 Extracted ${newAccounts.length} new accounts (${newPremiumAccounts.length} premium) - Total: ${allAccounts.length} (${premiumAccounts.length} premium)`);
            
            if (newAccounts.length > 0) {
                consecutiveNoNewAccounts = 0;
            } else {
                consecutiveNoNewAccounts++;
            }
            
            // Stop if we have enough premium accounts
            if (premiumAccounts.length >= CONFIG.limits.maxPremiumAccounts) {
                Utils.log(`✅ Reached premium account limit (${CONFIG.limits.maxPremiumAccounts})`);
                break;
            }
            
            // Try to find a visible load more button using locators
            const candidateLocators = [
                page.locator(CONFIG.selectors.loadMoreButton),
                page.locator('.clsy-c-endlessScrolling span'),
                page.locator('[class*="endlessScrolling"] span'),
                page.locator('span:has-text("Mehr Likes laden")')
            ];
            let loadMoreLocator = null;
            for (const loc of candidateLocators) {
                try {
                    const visible = await loc.first().isVisible().catch(() => false);
                    if (visible) { loadMoreLocator = loc.first(); break; }
                } catch (_) { /* continue */ }
            }
            
            // If none found, attempt to scroll the modal to bottom and re-check once
            if (!loadMoreLocator) {
                await this.scrollModalToBottom(page);
                for (const loc of candidateLocators) {
                    try {
                        const visible = await loc.first().isVisible().catch(() => false);
                        if (visible) { loadMoreLocator = loc.first(); break; }
                    } catch (_) { /* continue */ }
                }
            }
            
            if (!loadMoreLocator) {
                Utils.log('✅ No "Mehr Likes laden" button found - pagination complete');
                break;
            }
            
            // Stop if we haven't found new accounts in many attempts
            if (consecutiveNoNewAccounts >= 5) {
                Utils.log('⚠️ No new accounts found in 5 consecutive attempts, stopping pagination');
                break;
            }
            
            // Attempt to click with re-query/retry to handle detached elements
            Utils.log(`🔄 Clicking "Mehr Likes laden" button (click #${loadMoreClicks + 1})...`);
            const prevCount = allAccounts.length;
            let clicked = false;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await loadMoreLocator.scrollIntoViewIfNeeded().catch(() => {});
                    await loadMoreLocator.click();
                    clicked = true;
                    consecutiveFailedClicks = 0;
                    break;
                } catch (err) {
                    consecutiveFailedClicks++;
                    Utils.log(`⚠️ Click attempt ${attempt} failed: ${err.message}`, 'warning');
                    // Re-query the button and try again
                    loadMoreLocator = null;
                    for (const loc of candidateLocators) {
                        const visible = await loc.first().isVisible().catch(() => false);
                        if (visible) { loadMoreLocator = loc.first(); break; }
                    }
                    if (!loadMoreLocator) {
                        // Try scrolling and break if still not found
                        await this.scrollModalToBottom(page);
                        for (const loc of candidateLocators) {
                            const visible = await loc.first().isVisible().catch(() => false);
                            if (visible) { loadMoreLocator = loc.first(); break; }
                        }
                        if (!loadMoreLocator) break;
                    }
                }
            }
            
            if (!clicked) {
                Utils.log('❌ Failed to click "Mehr Likes laden" after retries, stopping pagination', 'warning');
                break;
            }
            
            loadMoreClicks++;
            
            // Wait for new content to load: prefer observing account count increase
            try {
                await page.waitForFunction((sel, before) => {
                    const boxes = document.querySelectorAll(sel);
                    return boxes.length > before;
                }, CONFIG.selectors.accountBox, prevCount, { timeout: 5000 });
            } catch (_) {
                // Fallback: brief sleep
                await Utils.sleep(CONFIG.delays.loadMore);
            }
        }
        
        // Determine which accounts to save
        let accountsToSave = [];
        
        if (premiumAccounts.length > 0) {
            accountsToSave = premiumAccounts;
            Utils.log(`✅ Found ${premiumAccounts.length} premium accounts for ${targetAccount.name}`, 'success');
        } else {
            // No premium accounts found, get fallback normal accounts
            accountsToSave = PremiumAccountExtractor.getFallbackAccounts(allAccounts);
            Utils.log(`⚠️ No premium accounts found for ${targetAccount.name}, using ${accountsToSave.length} normal accounts as fallback`, 'warning');
        }
        
        // Save accounts to CSV
        if (accountsToSave.length > 0) {
            csvManager.addAccountsToBatch(targetAccount, accountsToSave);
        } else {
            Utils.log(`❌ No accounts found for ${targetAccount.name}`, 'error');
            // Save a record indicating no accounts found
            csvManager.addAccountsToBatch(targetAccount, [{
                name: 'NO_ACCOUNTS_FOUND',
                userId: 'N/A',
                link: 'N/A',
                isPremium: false,
                profileImageUrl: ''
            }]);
        }
        
        Utils.log(`✅ Processing complete for ${targetAccount.name}: ${accountsToSave.length} accounts saved after ${loadMoreClicks} pagination clicks`, 'success');
        return accountsToSave;
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

// Main Premium Scraper Class
class PremiumFollowedScraper {
    constructor() {
        this.csvManager = new PremiumCSVManager();
        this.stats = {
            targetAccountsProcessed: 0,
            totalPremiumAccountsFound: 0,
            totalFallbackAccountsUsed: 0,
            errors: []
        };
        this.tabs = 0; // when >0, use tab workers
    }
    
    async scrapeAllTargetAccounts() {
        try {
            Utils.log('Starting premium followed accounts scraping...');
            
            const allTargetAccounts = TargetAccountLoader.loadTargetAccounts();
            if (allTargetAccounts.length === 0) {
                throw new Error('No target accounts found to process');
            }
            
            let unprocessedAccounts = allTargetAccounts.filter(account => 
                !this.csvManager.isTargetProcessed(account)
            );
            if (this.maxAccounts && unprocessedAccounts.length > this.maxAccounts) {
                unprocessedAccounts = unprocessedAccounts.slice(0, this.maxAccounts);
                Utils.log(`Limited to first ${this.maxAccounts} unprocessed accounts`);
            }
            
            Utils.log(`Total accounts: ${allTargetAccounts.length}, Already processed: ${allTargetAccounts.length - unprocessedAccounts.length}, To process: ${unprocessedAccounts.length}`);
            if (unprocessedAccounts.length === 0) {
                Utils.log('All target accounts have already been processed!', 'success');
                return;
            }
            
            // Always use multi-tab mode; default to 10 if not provided
            const tabsToUse = this.tabs && this.tabs > 0 ? this.tabs : 10;
            await this.processWithTabs(unprocessedAccounts, tabsToUse);
            
            this.displaySummary();
            
        } catch (error) {
            Utils.log(`Fatal error: ${error.message}`, 'error');
            throw error;
        }
    }

    tryClaimTarget(targetAccount) {
        const lockName = `target-${targetAccount.userId}.lock`;
        const acquired = FileLock.tryAcquireLock(
            lockName,
            CONFIG.concurrency.targetLockTimeoutMs,
            CONFIG.concurrency.targetLockRetryDelayMs
        );
        return { acquired, lockName };
    }
    
    async processWithTabs(targetAccounts, numTabs) {
        let browser;
        let flushTimer = null;
        try {
            browser = await chromium.launch({
                headless: CONFIG.browser.headless,
                slowMo: CONFIG.browser.slowMo
            });
            const context = await browser.newContext({ viewport: CONFIG.browser.viewport });

            // Progressive auto-flush of CSV batches during run
            if (CONFIG.csv.flushIntervalMs && CONFIG.csv.flushIntervalMs > 0) {
                flushTimer = setInterval(() => {
                    try { this.csvManager.saveBatch(); } catch (_) {}
                }, CONFIG.csv.flushIntervalMs);
            }

            let nextIndex = 0;
            const total = targetAccounts.length;

            const worker = async (tabId) => {
                const page = await context.newPage();
                try {
                    while (true) {
                        // Get next account index atomically
                        let idx;
                        if (nextIndex >= total) return;
                        idx = nextIndex++;

                        const targetAccount = targetAccounts[idx];
                        if (!targetAccount) return;

                        Utils.log(`\n[Tab ${tabId}] -> Processing: ${targetAccount.name} (${idx + 1}/${total})`);

                        // Per-target inter-process claim (safe even if only single process)
                        const { acquired, lockName } = this.tryClaimTarget(targetAccount);
                        if (!acquired) {
                            Utils.log(`[Tab ${tabId}] Skipping ${targetAccount.name} - claimed by another instance`);
                            continue;
                        }
                        try {
                            const result = await this.scrapeTargetAccount(page, targetAccount);
                            this.stats.targetAccountsProcessed++;
                            this.csvManager.markTargetAsProcessed(
                                targetAccount,
                                result.premiumCount,
                                result.totalCount,
                                'completed'
                            );
                        } catch (error) {
                            Utils.log(`[Tab ${tabId}] Error processing ${targetAccount.name}: ${error.message}`, 'error');
                            this.stats.errors.push({ targetAccount: targetAccount.name, error: error.message });
                            this.csvManager.markTargetAsProcessed(targetAccount, 0, 0, 'failed');
                        } finally {
                            FileLock.releaseLock(lockName);
                        }
                    }
                } finally {
                    await page.close();
                }
            };

            const workers = Array.from({ length: numTabs }, (_, i) => worker(i + 1));
            Utils.log(`🚀 Launching ${numTabs} tabs...`);
            await Promise.all(workers);

            // Save remaining batches
            this.csvManager.saveAllPendingBatches();
            Utils.log(`✅ All tabs completed.`);
        } finally {
            if (flushTimer) {
                clearInterval(flushTimer);
                flushTimer = null;
            }
            if (browser) {
                await browser.close();
                Utils.log(`Browser closed for multi-tab run`);
            }
        }
    }
    
    async scrapeTargetAccount(page, targetAccount) {
        let url = Utils.sanitizeUrl(targetAccount.profileUrl);
        if (!url || url.includes('"') || !/^https?:\/\//i.test(url)) {
            const rebuilt = Utils.buildProfileUrl(targetAccount.name, targetAccount.userId);
            if (rebuilt) {
                Utils.log(`Rebuilt malformed URL from CSV to ${rebuilt}`, 'warning');
                url = rebuilt;
            }
        }
        Utils.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle' });
        await Utils.sleep(CONFIG.delays.pageLoad);
        
        await this.handleCookieConsent(page);
        
        // Open modal (robust search inside)
        try {
            await PremiumModalHandler.openMirGefallenModal(page);
        } catch (e) {
            Utils.log(`⚠️ Could not find/open "mir gefallen" for ${targetAccount.name}: ${e.message}`, 'warning');
            this.csvManager.addAccountsToBatch(targetAccount, [{
                name: 'NO_FOLLOWS',
                userId: 'N/A',
                link: 'N/A',
                isPremium: false,
                profileImageUrl: ''
            }]);
            return { premiumCount: 0, totalCount: 0 };
        }
        
        const followedAccounts = await PremiumModalHandler.loadAllFollowedAccounts(page, targetAccount, this.csvManager);
        await PremiumModalHandler.closeModal(page);
        
        const premiumCount = followedAccounts.filter(acc => acc.isPremium).length;
        const fallbackCount = followedAccounts.filter(acc => !acc.isPremium).length;
        const totalCount = followedAccounts.length;
        
        this.stats.totalPremiumAccountsFound += premiumCount;
        this.stats.totalFallbackAccountsUsed += fallbackCount;
        
        return { premiumCount, totalCount };
    }
    
    async handleCookieConsent(page) {
        Utils.log('🍪 Checking for cookie consent dialog...');
        
        try {
            const cookieSelectors = [
                'div[role="button"].cmp_button.cmp_button_bg.cmp_button_font_color.cmp-button-accept-all',
                'div.cmp-button-accept-all[role="button"]',
                '.cmp-button-accept-all',
                'div[role="button"]:has-text("AKZEPTIEREN UND WEITER")',
                '[class*="cmp-button-accept-all"]'
            ];
            
            await Utils.sleep(1500);
            
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
                    continue;
                }
            }
            
            Utils.log('ℹ️ No cookie consent dialog found or already accepted');
            
        } catch (error) {
            Utils.log(`⚠️ Error handling cookie consent: ${error.message}`, 'warning');
        }
    }
    
    displaySummary() {
        const totalProcessed = this.csvManager.processedTargets.size;
        const totalPairs = this.csvManager.processedPairs.size;
        
        Utils.log('\n=== PREMIUM FOLLOWED SCRAPING SUMMARY ===');
        Utils.log(`Target accounts processed this session: ${this.stats.targetAccountsProcessed}`);
        Utils.log(`Total target accounts processed (all time): ${totalProcessed}`);
        Utils.log(`Premium accounts found this session: ${this.stats.totalPremiumAccountsFound}`);
        Utils.log(`Fallback accounts used this session: ${this.stats.totalFallbackAccountsUsed}`);
        Utils.log(`Total followed accounts extracted this session: ${this.stats.totalPremiumAccountsFound + this.stats.totalFallbackAccountsUsed}`);
        Utils.log(`Total account pairs in database: ${totalPairs}`);
        
        if (this.stats.errors.length > 0) {
            Utils.log(`Errors encountered: ${this.stats.errors.length}`, 'warning');
            this.stats.errors.slice(0, 5).forEach(error => {
                Utils.log(`${error.targetAccount}: ${error.error}`, 'error');
            });
            if (this.stats.errors.length > 5) {
                Utils.log(`... and ${this.stats.errors.length - 5} more errors`, 'warning');
            }
        }
        
        Utils.log(`Output files:`);
        Utils.log(`  - Premium followed accounts: ${CONFIG.csv.outputFilename}`);
        Utils.log(`  - Processed targets log: ${CONFIG.csv.processedFilename}`);
        Utils.log('=== SCRAPING COMPLETE ===', 'success');
    }
}

// Command line argument parsing
function parseArguments() {
    const args = process.argv.slice(2);
    const options = {
        headless: true,
        maxAccounts: null,
        sessionSize: CONFIG.session.maxAccountsPerSession,
        instanceId: null,
        tabs: null
    };
    
    args.forEach(arg => {
        if (arg === '--visible' || arg === '--gui') {
            options.headless = false;
        } else if (arg.startsWith('--max=')) {
            options.maxAccounts = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--session-size=')) {
            options.sessionSize = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--instance-id=')) {
            options.instanceId = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--tabs=')) {
            options.tabs = parseInt(arg.split('=')[1]);
        } else if (arg === '--help' || arg === '-h') {
            console.log(`
Premium Followed Scraper Usage:
  node premium-followed-scraper.js [options]

Options:
  --visible, --gui          Run with visible browser (default: headless)
  --max=N                   Process only N target accounts
  --instance-id=N           Tag logs and locks with an instance id (0..9)
  --tabs=N                  Run N tabs concurrently in a single browser (default: 10)
  --help, -h                Show this help message

Examples:
  node premium-followed-scraper.js --tabs=10          # 10-tab concurrent scraping
  node premium-followed-scraper.js --visible          # Run with visible browser
  node premium-followed-scraper.js --max=10           # Process only 10 accounts
  node premium-followed-scraper.js --instance-id=3    # Mark this instance as #3
            `);
            process.exit(0);
        }
    });
    
    return options;
}

// Main execution
async function main() {
    try {
        const options = parseArguments();
        
        CONFIG.browser.headless = options.headless;
        if (Number.isInteger(options.instanceId)) {
            CONFIG.instanceId = options.instanceId;
        }
        
        const tabsToUse = Number.isInteger(options.tabs) ? options.tabs : 10;
        const tabsStr = `, tabs=${tabsToUse}`;
        Utils.log(`Starting scraper with options: headless=${options.headless}${options.maxAccounts ? `, maxAccounts=${options.maxAccounts}` : ''}${Number.isInteger(options.instanceId) ? `, instanceId=${options.instanceId}` : ''}${tabsStr}`);
        
        const scraper = new PremiumFollowedScraper();
        scraper.maxAccounts = options.maxAccounts;
        scraper.tabs = tabsToUse;
        await scraper.scrapeAllTargetAccounts();
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

module.exports = { PremiumFollowedScraper, CONFIG };