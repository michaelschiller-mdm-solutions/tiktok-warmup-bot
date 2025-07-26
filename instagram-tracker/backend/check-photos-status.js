/**
 * Simple Photos Status Check using iOS-compatible commands
 */

const { exec } = require('child_process');

class PhotosStatusChecker {
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

    async checkStatus() {
        console.log('📱 Photos App Status Check');
        console.log('=========================\n');
        
        // Check if Photos.sqlite exists and its size
        console.log('🗄️ Database Status:');
        const dbStatus = await this.executeSSH('ls -l /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "NOT_FOUND"');
        if (dbStatus.includes('NOT_FOUND')) {
            console.log('   ❌ Photos.sqlite: Missing');
        } else {
            console.log(`   ✅ Photos.sqlite: ${dbStatus}`);
            
            // Check if it's empty
            if (dbStatus.includes(' 0 ')) {
                console.log('   ⚠️  WARNING: Database is empty (0 bytes)');
            }
        }
        
        // Check WAL/SHM files
        console.log('\n🔄 Database Helper Files:');
        const walStatus = await this.executeSSH('ls -l /var/mobile/Media/PhotoData/Photos.sqlite-wal 2>/dev/null || echo "NOT_FOUND"');
        const shmStatus = await this.executeSSH('ls -l /var/mobile/Media/PhotoData/Photos.sqlite-shm 2>/dev/null || echo "NOT_FOUND"');
        
        console.log(`   WAL file: ${walStatus.includes('NOT_FOUND') ? '❌ Missing' : '✅ Present'}`);
        console.log(`   SHM file: ${shmStatus.includes('NOT_FOUND') ? '❌ Missing' : '✅ Present'}`);
        
        // Check directories
        console.log('\n📁 Directory Structure:');
        const dirCount = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/ | grep "^d" | wc -l');
        console.log(`   PhotoData subdirectories: ${dirCount.trim()}`);
        
        // Check processes (simple version)
        console.log('\n🔍 Photo Processes:');
        const processes = await this.executeSSH('ps aux | grep photo | grep -v grep | wc -l');
        console.log(`   Running photo processes: ${processes.trim()}`);
        
        // Check recent crash logs
        console.log('\n💥 Recent Crash Logs:');
        const crashes = await this.executeSSH('ls -t /var/mobile/Library/Logs/CrashReporter/*Photos* 2>/dev/null | head -3 || echo "NO_CRASHES"');
        if (crashes.includes('NO_CRASHES')) {
            console.log('   ✅ No recent Photos crashes');
        } else {
            console.log('   ⚠️  Recent crashes found:');
            console.log(`   ${crashes}`);
        }
        
        console.log('\n📱 Manual Test:');
        console.log('   Try opening Photos app on your iPhone now');
        console.log('   Expected result: Shows "No Photos or Videos" or "Preparing..."');
    }
}

async function main() {
    const checker = new PhotosStatusChecker();
    await checker.checkStatus();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = PhotosStatusChecker;