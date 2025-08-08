/*
 * Parallel Scraper Progress Monitor
 * 
 * Real-time monitoring tool for the parallel premium scraper.
 * Shows live progress, statistics, and performance metrics.
 * 
 * Usage:
 * node monitor-parallel-progress.js
 */

const fs = require('fs');
const path = require('path');

class ProgressMonitor {
    constructor() {
        this.progressFile = './parallel_progress.json';
        this.outputFile = './premium_followed_by.csv';
        this.processedFile = './premium_processed_targets.csv';
        this.startTime = Date.now();
        this.lastStats = null;
    }
    
    clearScreen() {
        console.clear();
    }
    
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }
    
    getFileStats() {
        const stats = {};
        
        try {
            if (fs.existsSync(this.outputFile)) {
                const content = fs.readFileSync(this.outputFile, 'utf8');
                stats.outputLines = content.split('\n').length - 2; // Exclude header and empty line
            } else {
                stats.outputLines = 0;
            }
        } catch (error) {
            stats.outputLines = 0;
        }
        
        try {
            if (fs.existsSync(this.processedFile)) {
                const content = fs.readFileSync(this.processedFile, 'utf8');
                stats.processedLines = content.split('\n').length - 2; // Exclude header and empty line
            } else {
                stats.processedLines = 0;
            }
        } catch (error) {
            stats.processedLines = 0;
        }
        
        return stats;
    }
    
    calculateSpeed(currentStats) {
        if (!this.lastStats) {
            this.lastStats = { ...currentStats, timestamp: Date.now() };
            return { accountsPerMinute: 0, relationshipsPerMinute: 0 };
        }
        
        const timeDiff = Date.now() - this.lastStats.timestamp;
        const accountsDiff = currentStats.totalProcessed - this.lastStats.totalProcessed;
        const relationshipsDiff = currentStats.totalRelationships - this.lastStats.totalRelationships;
        
        const accountsPerMinute = Math.round((accountsDiff / timeDiff) * 60000);
        const relationshipsPerMinute = Math.round((relationshipsDiff / timeDiff) * 60000);
        
        this.lastStats = { ...currentStats, timestamp: Date.now() };
        
        return { accountsPerMinute, relationshipsPerMinute };
    }
    
    displayProgress() {
        try {
            if (!fs.existsSync(this.progressFile)) {
                console.log('⏳ Waiting for scraper to start...');
                return;
            }
            
            const progress = JSON.parse(fs.readFileSync(this.progressFile, 'utf8'));
            const fileStats = this.getFileStats();
            const runTime = Date.now() - this.startTime;
            
            // Calculate totals
            let totalProcessed = 0;
            let totalFailed = 0;
            let activeInstances = 0;
            let completedInstances = 0;
            let errorInstances = 0;
            
            Object.values(progress.instances).forEach(instance => {
                totalProcessed += instance.processed || 0;
                totalFailed += instance.failed || 0;
                
                switch (instance.status) {
                    case 'running':
                    case 'initialized':
                        activeInstances++;
                        break;
                    case 'completed':
                        completedInstances++;
                        break;
                    case 'error':
                        errorInstances++;
                        break;
                }
            });
            
            const totalAccounts = totalProcessed + totalFailed;
            const successRate = totalAccounts > 0 ? Math.round((totalProcessed / totalAccounts) * 100) : 0;
            
            // Calculate speed
            const currentStats = {
                totalProcessed,
                totalRelationships: fileStats.outputLines
            };
            const speed = this.calculateSpeed(currentStats);
            
            // Display header
            this.clearScreen();
            console.log('🚀 PARALLEL PREMIUM SCRAPER - LIVE MONITOR');
            console.log('==========================================');
            console.log(`Runtime: ${this.formatDuration(runTime)}`);
            console.log(`Started: ${new Date(progress.startTime).toLocaleString()}`);
            console.log('');
            
            // Display overall statistics
            console.log('📊 OVERALL STATISTICS');
            console.log('--------------------');
            console.log(`Accounts Processed: ${totalProcessed}`);
            console.log(`Accounts Failed: ${totalFailed}`);
            console.log(`Success Rate: ${successRate}%`);
            console.log(`Relationships Found: ${fileStats.outputLines}`);
            console.log(`Speed: ${speed.accountsPerMinute} accounts/min, ${speed.relationshipsPerMinute} relationships/min`);
            console.log('');
            
            // Display instance status
            console.log('🔧 INSTANCE STATUS');
            console.log('------------------');
            console.log(`Active: ${activeInstances} | Completed: ${completedInstances} | Errors: ${errorInstances}`);
            console.log('');
            
            // Display detailed instance information
            console.log('📋 INSTANCE DETAILS');
            console.log('-------------------');
            
            Object.entries(progress.instances).forEach(([instanceId, instance]) => {
                const statusIcon = {
                    'initialized': '🔄',
                    'running': '⚡',
                    'completed': '✅',
                    'error': '❌'
                }[instance.status] || '❓';
                
                const processed = instance.processed || 0;
                const failed = instance.failed || 0;
                const total = processed + failed;
                const rate = total > 0 ? Math.round((processed / total) * 100) : 0;
                
                console.log(`${statusIcon} Instance ${instanceId}: ${instance.status.toUpperCase()}`);
                console.log(`   Progress: ${processed}/${instance.accountsToProcess || 0} (${rate}% success)`);
                console.log(`   Current: ${instance.currentAccount || 'N/A'}`);
                console.log(`   Last Update: ${new Date(instance.lastUpdate).toLocaleTimeString()}`);
                
                if (instance.error) {
                    console.log(`   Error: ${instance.error}`);
                }
                console.log('');
            });
            
            // Display file information
            console.log('📁 OUTPUT FILES');
            console.log('---------------');
            console.log(`premium_followed_by.csv: ${fileStats.outputLines} relationships`);
            console.log(`premium_processed_targets.csv: ${fileStats.processedLines} processed accounts`);
            console.log('');
            
            // Display estimated completion
            if (activeInstances > 0 && speed.accountsPerMinute > 0) {
                const remainingAccounts = Object.values(progress.instances)
                    .filter(i => i.status === 'running' || i.status === 'initialized')
                    .reduce((sum, i) => sum + ((i.accountsToProcess || 0) - (i.processed || 0)), 0);
                
                const estimatedMinutes = Math.ceil(remainingAccounts / speed.accountsPerMinute);
                console.log(`⏱️  ESTIMATED COMPLETION: ${this.formatDuration(estimatedMinutes * 60000)}`);
                console.log('');
            }
            
            if (activeInstances === 0) {
                console.log('🎉 ALL INSTANCES COMPLETED!');
                console.log('');
                return false; // Stop monitoring
            }
            
        } catch (error) {
            console.error('❌ Error reading progress:', error.message);
        }
        
        return true; // Continue monitoring
    }
    
    start() {
        console.log('🔍 Starting progress monitor...');
        console.log('Press Ctrl+C to stop monitoring');
        console.log('');
        
        const interval = setInterval(() => {
            const shouldContinue = this.displayProgress();
            if (!shouldContinue) {
                clearInterval(interval);
                console.log('Monitor stopped - all instances completed');
            }
        }, 2000); // Update every 2 seconds
        
        // Handle Ctrl+C
        process.on('SIGINT', () => {
            clearInterval(interval);
            console.log('\n👋 Monitor stopped by user');
            process.exit(0);
        });
    }
}

// Run the monitor
if (require.main === module) {
    const monitor = new ProgressMonitor();
    monitor.start();
}

module.exports = ProgressMonitor;