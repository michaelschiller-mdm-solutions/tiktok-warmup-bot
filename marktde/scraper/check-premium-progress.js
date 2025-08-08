/*
 * Premium Scraper Progress Checker
 * 
 * This script checks the progress of the premium followed scraper
 * by analyzing the processed targets and output files.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    targetAccountsFile: './target_accounts.csv',
    processedTargetsFile: './premium_processed_targets.csv',
    outputFile: './premium_followed_by.csv'
};

class ProgressChecker {
    static checkProgress() {
        console.log('=== Premium Scraper Progress Report ===\n');
        
        try {
            // Count total target accounts
            const totalTargets = this.countTargetAccounts();
            console.log(`📊 Total target accounts: ${totalTargets}`);
            
            // Count processed targets
            const processedStats = this.countProcessedTargets();
            console.log(`✅ Processed accounts: ${processedStats.total}`);
            console.log(`   - Completed: ${processedStats.completed}`);
            console.log(`   - Failed: ${processedStats.failed}`);
            
            // Calculate remaining
            const remaining = totalTargets - processedStats.total;
            console.log(`⏳ Remaining accounts: ${remaining}`);
            
            // Calculate progress percentage
            const progressPercent = totalTargets > 0 ? ((processedStats.total / totalTargets) * 100).toFixed(1) : 0;
            console.log(`📈 Progress: ${progressPercent}%`);
            
            // Count output records
            const outputStats = this.countOutputRecords();
            console.log(`\n📝 Output Statistics:`);
            console.log(`   - Total followed accounts extracted: ${outputStats.total}`);
            console.log(`   - Premium accounts: ${outputStats.premium}`);
            console.log(`   - Normal accounts (fallback): ${outputStats.normal}`);
            console.log(`   - Special records (NO_FOLLOWS, etc.): ${outputStats.special}`);
            
            // Show recent activity
            this.showRecentActivity();
            
            // Estimate completion time
            if (remaining > 0 && processedStats.total > 0) {
                this.estimateCompletion(remaining, processedStats.total);
            }
            
        } catch (error) {
            console.error(`Error checking progress: ${error.message}`);
        }
        
        console.log('\n=== End of Report ===');
    }
    
    static countTargetAccounts() {
        if (!fs.existsSync(CONFIG.targetAccountsFile)) {
            return 0;
        }
        
        const content = fs.readFileSync(CONFIG.targetAccountsFile, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        return Math.max(0, lines.length - 1); // Subtract header
    }
    
    static countProcessedTargets() {
        const stats = { total: 0, completed: 0, failed: 0 };
        
        if (!fs.existsSync(CONFIG.processedTargetsFile)) {
            return stats;
        }
        
        const content = fs.readFileSync(CONFIG.processedTargetsFile, 'utf8');
        const lines = content.split('\n').slice(1).filter(line => line.trim()); // Skip header
        
        lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 3) {
                stats.total++;
                const status = parts[2];
                if (status === 'completed') {
                    stats.completed++;
                } else if (status === 'failed') {
                    stats.failed++;
                }
            }
        });
        
        return stats;
    }
    
    static countOutputRecords() {
        const stats = { total: 0, premium: 0, normal: 0, special: 0 };
        
        if (!fs.existsSync(CONFIG.outputFile)) {
            return stats;
        }
        
        const content = fs.readFileSync(CONFIG.outputFile, 'utf8');
        const lines = content.split('\n').slice(1).filter(line => line.trim()); // Skip header
        
        lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 5) {
                stats.total++;
                const isPremium = parts[4] === 'true';
                const followedAccount = parts[2];
                
                if (followedAccount === 'NO_FOLLOWS' || followedAccount === 'NO_ACCOUNTS_FOUND') {
                    stats.special++;
                } else if (isPremium) {
                    stats.premium++;
                } else {
                    stats.normal++;
                }
            }
        });
        
        return stats;
    }
    
    static showRecentActivity() {
        if (!fs.existsSync(CONFIG.processedTargetsFile)) {
            return;
        }
        
        const content = fs.readFileSync(CONFIG.processedTargetsFile, 'utf8');
        const lines = content.split('\n').slice(1).filter(line => line.trim()); // Skip header
        
        // Get last 5 processed accounts
        const recentLines = lines.slice(-5);
        
        if (recentLines.length > 0) {
            console.log(`\n🕒 Recent Activity (last ${recentLines.length} accounts):`);
            recentLines.forEach(line => {
                const parts = line.split(',');
                if (parts.length >= 6) {
                    const name = parts[0].replace(/"/g, '');
                    const status = parts[2];
                    const timestamp = new Date(parts[3]).toLocaleString();
                    const premium = parts[4];
                    const total = parts[5];
                    
                    const statusIcon = status === 'completed' ? '✅' : '❌';
                    console.log(`   ${statusIcon} ${name} - ${premium} premium, ${total} total (${timestamp})`);
                }
            });
        }
    }
    
    static estimateCompletion(remaining, processed) {
        // Very rough estimate based on average processing time
        const avgTimePerAccount = 30; // seconds (rough estimate)
        const estimatedSeconds = remaining * avgTimePerAccount;
        
        const hours = Math.floor(estimatedSeconds / 3600);
        const minutes = Math.floor((estimatedSeconds % 3600) / 60);
        
        console.log(`\n⏰ Rough time estimate for remaining accounts:`);
        if (hours > 0) {
            console.log(`   Approximately ${hours}h ${minutes}m remaining`);
        } else {
            console.log(`   Approximately ${minutes} minutes remaining`);
        }
        console.log(`   (Based on ~${avgTimePerAccount}s per account average)`);
    }
}

// Run the progress check
if (require.main === module) {
    ProgressChecker.checkProgress();
}

module.exports = ProgressChecker;