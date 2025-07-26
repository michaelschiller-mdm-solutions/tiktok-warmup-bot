/**
 * Debug script to understand why nuclear cleaner keeps breaking Photos app
 */

const { exec } = require('child_process');

class NuclearCleanerDebugger {
    constructor() {
        this.phoneIP = "192.168.178.65";
        this.mobileUser = "mobile";
        this.mobilePassword = "qwertzuio";
    }

    async executeSSH(command) {
        return new Promise((resolve, reject) => {
            const plinkCommand = `plink -ssh -batch -l ${this.mobileUser} -pw ${this.mobilePassword} ${this.phoneIP} "${command}"`;
            
            exec(plinkCommand, { timeout: 10000 }, (error, stdout, stderr) => {
                if (error) {
                    resolve(`ERROR: ${error.message}`);
                    return;
                }
                resolve(stdout.trim());
            });
        });
    }

    async debugNuclearCleanerIssue() {
        console.log('🔍 Debugging Nuclear Cleaner Issue');
        console.log('==================================\n');
        
        // 1. Check current database state
        console.log('1. Current Database State:');
        const dbInfo = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite*');
        console.log(dbInfo);
        console.log('');
        
        // 2. Check backup files
        console.log('2. Available Backup Files:');
        const backups = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite.backup.* 2>/dev/null || echo "NO_BACKUPS"');
        console.log(backups);
        console.log('');
        
        // 3. Check if there's a default template
        console.log('3. Default Template Check:');
        const defaultTemplate = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite.default 2>/dev/null || echo "NO_DEFAULT"');
        console.log(defaultTemplate);
        console.log('');
        
        // 4. Check database content (first few bytes to see if it's valid SQLite)
        console.log('4. Database Content Check:');
        const dbContent = await this.executeSSH('head -c 20 /var/mobile/Media/PhotoData/Photos.sqlite | xxd || echo "CANNOT_READ"');
        console.log('First 20 bytes of database:');
        console.log(dbContent);
        console.log('');
        
        // 5. Check if database is actually SQLite
        console.log('5. SQLite Validation:');
        const sqliteCheck = await this.executeSSH('file /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "FILE_COMMAND_NOT_AVAILABLE"');
        console.log(sqliteCheck);
        console.log('');
        
        // 6. Check recent crash logs
        console.log('6. Recent Photos Crash Logs:');
        const crashes = await this.executeSSH('ls -t /var/mobile/Library/Logs/CrashReporter/*Photos* 2>/dev/null | head -3 || echo "NO_CRASHES"');
        if (!crashes.includes('NO_CRASHES')) {
            console.log('Recent crash files:');
            console.log(crashes);
            
            // Get the most recent crash log content
            const crashFiles = crashes.split('\n').filter(f => f.trim());
            if (crashFiles.length > 0) {
                console.log('\nMost recent crash log content:');
                const crashContent = await this.executeSSH(`head -20 "${crashFiles[0]}" 2>/dev/null || echo "CANNOT_READ_CRASH"`);
                console.log(crashContent);
            }
        } else {
            console.log('No recent crash logs found');
        }
        console.log('');
        
        // 7. Check photo processes
        console.log('7. Photo Processes Status:');
        const processes = await this.executeSSH('ps aux | grep -E "(photo|Photos)" | grep -v grep');
        if (processes.trim()) {
            console.log('Running processes:');
            console.log(processes);
        } else {
            console.log('No photo processes running');
        }
        console.log('');
        
        // 8. Test if we can create a backup right now
        console.log('8. Testing Backup Creation:');
        const timestamp = Math.floor(Date.now() / 1000);
        const backupResult = await this.executeSSH(`cp /var/mobile/Media/PhotoData/Photos.sqlite /var/mobile/Media/PhotoData/Photos.sqlite.test.${timestamp} 2>/dev/null && echo "BACKUP_SUCCESS" || echo "BACKUP_FAILED"`);
        console.log(`Backup test: ${backupResult}`);
        
        if (backupResult.includes('BACKUP_SUCCESS')) {
            const backupInfo = await this.executeSSH(`ls -la /var/mobile/Media/PhotoData/Photos.sqlite.test.${timestamp}`);
            console.log(`Test backup info: ${backupInfo}`);
            
            // Clean up test backup
            await this.executeSSH(`rm -f /var/mobile/Media/PhotoData/Photos.sqlite.test.${timestamp}`);
        }
        console.log('');
        
        console.log('🎯 Analysis:');
        console.log('===========');
        
        // Analyze the findings
        if (dbContent.includes('SQLite format 3')) {
            console.log('✅ Database appears to be valid SQLite format');
        } else if (dbContent.includes('CANNOT_READ')) {
            console.log('❌ Cannot read database file - permission issue?');
        } else {
            console.log('⚠️ Database may not be valid SQLite format');
        }
        
        if (backups.includes('NO_BACKUPS')) {
            console.log('❌ No backup files available - this is the problem!');
            console.log('💡 Nuclear cleaner creates backups but they might be getting deleted');
        } else {
            console.log('✅ Backup files are available');
        }
        
        if (!crashes.includes('NO_CRASHES')) {
            console.log('⚠️ Recent crashes detected - Photos app is crashing on startup');
        }
        
        console.log('\n💡 Recommendations:');
        if (backups.includes('NO_BACKUPS')) {
            console.log('1. The nuclear cleaner backup system is not working properly');
            console.log('2. We need to ensure backups are created and preserved');
            console.log('3. Consider using a different restoration approach');
        }
        
        if (!crashes.includes('NO_CRASHES')) {
            console.log('1. Photos app is crashing - database schema might be wrong');
            console.log('2. Need to get the real iOS 16 template, not just backups');
        }
    }
}

async function main() {
    const debugger = new NuclearCleanerDebugger();
    await debugger.debugNuclearCleanerIssue();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = NuclearCleanerDebugger;