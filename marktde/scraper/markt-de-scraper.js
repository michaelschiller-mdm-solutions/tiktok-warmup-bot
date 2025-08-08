/*
 * Markt.de Profile Scraper - Console Script
 * 
 * Note:
 * - This in-page console script runs in the current browser tab only.
 *   A "max tabs" setting is not applicable here.
 * 
 * Usage:
 * 1. Navigate to a markt.de profile page (e.g., https://www.markt.de/dinademona/userId,19354400/profile.htm)
 * 2. Open browser developer console (F12)
 * 3. Copy and paste this entire script
 * 4. Press Enter to execute
 * 
 * The script will:
 * - Extract host accounts from "mir gefallen" modal
 * - Extract target accounts from "ich gefalle" modal
 * - Save data progressively to CSV files (host_accounts.csv and target_accounts.csv)
 * - Handle pagination automatically with "Mehr Likes laden" button
 * - Skip duplicate accounts
 */

(async function() {
    'use strict';

    // Configuration
    const CONFIG = {
        delays: {
            modalLoad: 2000,        // Wait time for modal loading
            loadMore: 1500,         // Wait between "Mehr Likes laden" clicks
            extraction: 500,        // Wait between account extractions
            duplicateCheck: 200     // Wait during duplicate checking
        },
        selectors: {
            hostButton: '.clsy-profile__likes-dialog-i-them',
            targetButton: '.clsy-profile__likes-dialog-they-me',
            modal: '.clsy-c-dialog__body',
            loadMoreButton: '.clsy-c-endlessScrolling--hasMore',
            accountBox: '.clsy-c-userbox',
            closeButton: '.clsy-c-dialog__close, .clsy-c-btn--close'
        },
        csv: {
            hostFilename: 'host_accounts.csv',
            targetFilename: 'target_accounts.csv'
        }
    };

    // Utility functions
    const Utils = {
        sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
        
        log: (message, type = 'info') => {
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
        },

        validatePage: () => {
            if (!window.location.hostname.includes('markt.de')) {
                throw new Error('This script must be run on a markt.de page');
            }
            
            if (!window.location.pathname.includes('/profile.htm')) {
                throw new Error('This script must be run on a markt.de profile page');
            }
            
            Utils.log('Page validation successful');
        }
    };

    // Data Extractor Class
    class DataExtractor {
        static extractAccountsFromModal(modalElement) {
            const accounts = [];
            const accountBoxes = modalElement.querySelectorAll(CONFIG.selectors.accountBox);
            
            Utils.log(`Found ${accountBoxes.length} account boxes in modal`);
            
            accountBoxes.forEach((box, index) => {
                try {
                    const link = box.getAttribute('href');
                    
                    // Skip anonymous accounts
                    if (!link || link === '#') {
                        Utils.log(`Skipping anonymous account at index ${index}`, 'warning');
                        return;
                    }
                    
                    const nameElement = box.querySelector('.clsy-c-userbox__profile-name');
                    if (!nameElement) {
                        Utils.log(`No name element found for account at index ${index}`, 'warning');
                        return;
                    }
                    
                    const name = nameElement.textContent.trim();
                    const userId = this.parseProfileUrl(link);
                    
                    if (userId && name) {
                        accounts.push({
                            name: this.sanitizeForCSV(name),
                            userId: userId,
                            link: link
                        });
                    }
                } catch (error) {
                    Utils.log(`Error extracting account at index ${index}: ${error.message}`, 'error');
                }
            });
            
            return accounts;
        }
        
        static parseProfileUrl(href) {
            try {
                const match = href.match(/userId,(\d+)/);
                return match ? match[1] : null;
            } catch (error) {
                Utils.log(`Error parsing profile URL ${href}: ${error.message}`, 'error');
                return null;
            }
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

    // CSV Generator Class
    class CSVGenerator {
        constructor() {
            this.processedIds = new Set();
        }
        
        generateCSVContent(accounts) {
            const header = 'name,ID,link\n';
            const rows = accounts.map(account => 
                `${account.name},${account.userId},${account.link}`
            ).join('\n');
            
            return header + rows;
        }
        
        downloadCSV(content, filename) {
            const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', filename);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
        }
        
        filterDuplicates(accounts) {
            const newAccounts = [];
            let duplicateCount = 0;
            
            accounts.forEach(account => {
                if (!this.processedIds.has(account.userId)) {
                    this.processedIds.add(account.userId);
                    newAccounts.push(account);
                } else {
                    duplicateCount++;
                }
            });
            
            if (duplicateCount > 0) {
                Utils.log(`Filtered out ${duplicateCount} duplicate accounts`);
            }
            
            return newAccounts;
        }
        
        saveAccounts(accounts, filename) {
            if (accounts.length === 0) {
                Utils.log('No new accounts to save');
                return;
            }
            
            const uniqueAccounts = this.filterDuplicates(accounts);
            
            if (uniqueAccounts.length > 0) {
                const csvContent = this.generateCSVContent(uniqueAccounts);
                this.downloadCSV(csvContent, filename);
                Utils.log(`Downloaded ${uniqueAccounts.length} accounts to ${filename}`, 'success');
            }
        }
    }

    // Modal Handler Class
    class ModalHandler {
        static async openModal(buttonSelector) {
            const button = document.querySelector(buttonSelector);
            if (!button) {
                throw new Error(`Button not found: ${buttonSelector}`);
            }
            
            Utils.log(`Clicking button: ${buttonSelector}`);
            button.click();
            
            // Wait for modal to load
            await Utils.sleep(CONFIG.delays.modalLoad);
            
            const modal = document.querySelector(CONFIG.selectors.modal);
            if (!modal) {
                throw new Error('Modal did not open or was not found');
            }
            
            Utils.log('Modal opened successfully');
            return modal;
        }
        
        static async loadAllAccounts(modal) {
            let allAccounts = [];
            let loadMoreClicks = 0;
            let previousAccountCount = 0;
            
            while (true) {
                // Extract current accounts
                const currentAccounts = DataExtractor.extractAccountsFromModal(modal);
                
                // Add new accounts (filter duplicates within this batch)
                const newAccounts = currentAccounts.filter(account => 
                    !allAccounts.some(existing => existing.userId === account.userId)
                );
                
                allAccounts.push(...newAccounts);
                
                Utils.log(`Extracted ${newAccounts.length} new accounts (total: ${allAccounts.length})`);
                
                // Look for "Mehr Likes laden" button
                const loadMoreButton = modal.querySelector(CONFIG.selectors.loadMoreButton);
                
                if (!loadMoreButton) {
                    Utils.log('No more "Mehr Likes laden" button found - pagination complete');
                    break;
                }
                
                // Check if we're getting new accounts
                if (currentAccounts.length === previousAccountCount && loadMoreClicks > 0) {
                    Utils.log('No new accounts loaded, stopping pagination');
                    break;
                }
                
                previousAccountCount = currentAccounts.length;
                
                // Click load more button
                Utils.log('Clicking "Mehr Likes laden" button...');
                loadMoreButton.click();
                loadMoreClicks++;
                
                // Wait for new content to load
                await Utils.sleep(CONFIG.delays.loadMore);
            }
            
            Utils.log(`Pagination complete after ${loadMoreClicks} clicks. Total accounts: ${allAccounts.length}`, 'success');
            return allAccounts;
        }
        
        static closeModal() {
            const closeButton = document.querySelector(CONFIG.selectors.closeButton);
            if (closeButton) {
                closeButton.click();
                Utils.log('Modal closed');
            } else {
                // Try pressing Escape key
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
                Utils.log('Attempted to close modal with Escape key');
            }
        }
    }

    // Main Scraper Class
    class MarktDeScraper {
        constructor() {
            this.csvGenerator = new CSVGenerator();
            this.stats = {
                hostAccounts: 0,
                targetAccounts: 0,
                totalProcessed: 0,
                duplicatesSkipped: 0,
                errors: []
            };
        }
        
        async scrapeHostAccounts() {
            Utils.log('Starting host accounts extraction ("mir gefallen")...');
            
            try {
                const modal = await ModalHandler.openModal(CONFIG.selectors.hostButton);
                const accounts = await ModalHandler.loadAllAccounts(modal);
                
                this.csvGenerator.saveAccounts(accounts, CONFIG.csv.hostFilename);
                this.stats.hostAccounts = accounts.length;
                
                ModalHandler.closeModal();
                await Utils.sleep(CONFIG.delays.extraction);
                
                Utils.log(`Host accounts extraction complete: ${accounts.length} accounts`, 'success');
                
            } catch (error) {
                Utils.log(`Error extracting host accounts: ${error.message}`, 'error');
                this.stats.errors.push({ type: 'host', error: error.message });
            }
        }
        
        async scrapeTargetAccounts() {
            Utils.log('Starting target accounts extraction ("ich gefalle")...');
            
            try {
                const modal = await ModalHandler.openModal(CONFIG.selectors.targetButton);
                const accounts = await ModalHandler.loadAllAccounts(modal);
                
                this.csvGenerator.saveAccounts(accounts, CONFIG.csv.targetFilename);
                this.stats.targetAccounts = accounts.length;
                
                ModalHandler.closeModal();
                await Utils.sleep(CONFIG.delays.extraction);
                
                Utils.log(`Target accounts extraction complete: ${accounts.length} accounts`, 'success');
                
            } catch (error) {
                Utils.log(`Error extracting target accounts: ${error.message}`, 'error');
                this.stats.errors.push({ type: 'target', error: error.message });
            }
        }
        
        displaySummary() {
            Utils.log('=== SCRAPING SUMMARY ===');
            Utils.log(`Host accounts extracted: ${this.stats.hostAccounts}`);
            Utils.log(`Target accounts extracted: ${this.stats.targetAccounts}`);
            Utils.log(`Total accounts processed: ${this.stats.hostAccounts + this.stats.targetAccounts}`);
            Utils.log(`Duplicates filtered: ${this.csvGenerator.processedIds.size - (this.stats.hostAccounts + this.stats.targetAccounts)}`);
            
            if (this.stats.errors.length > 0) {
                Utils.log(`Errors encountered: ${this.stats.errors.length}`, 'warning');
                this.stats.errors.forEach(error => {
                    Utils.log(`${error.type}: ${error.error}`, 'error');
                });
            }
            
            Utils.log('=== SCRAPING COMPLETE ===', 'success');
        }
        
        async scrapeProfile() {
            try {
                Utils.log('Starting Markt.de profile scraping...');
                Utils.validatePage();
                
                // Extract host accounts
                await this.scrapeHostAccounts();
                
                // Extract target accounts
                await this.scrapeTargetAccounts();
                
                // Display summary
                this.displaySummary();
                
            } catch (error) {
                Utils.log(`Fatal error: ${error.message}`, 'error');
                throw error;
            }
        }
    }

    // Initialize and run scraper
    try {
        const scraper = new MarktDeScraper();
        await scraper.scrapeProfile();
    } catch (error) {
        Utils.log(`Script failed: ${error.message}`, 'error');
        console.error('Full error details:', error);
    }

})();