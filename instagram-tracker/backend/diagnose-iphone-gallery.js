/**
 * Diagnostic script to check iPhone Photos app state after nuclear cleanup
 */

const { exec } = require('child_process');

class iPhoneGalleryDiagnostic {
    constructor() {
        this.phoneIP = "192.168.178.65";
        this.mobileUser = "mobile";
        this.mobilePassword = "qwertzuio";
    }

    async executeSSH(command) {
        return new Promise((resolve, reject) => {
            console.log(`🔗 SSH: ${command}`);
            
            const plinkCommand = `plink -ssh -batch -l ${this.mobileUser} -pw ${this.mobilePassword} ${this.phoneIP} "${command}"`;
            
            exec(plinkCommand, (error, stdout, stderr) => {
                if (error) {
                    console.log(`❌ SSH failed: ${error.message}`);
                    reject(error);
                    return;
                }
                
                if (stderr && !stderr.includes('Keyboard-interactive')) {
                    console.log(`⚠️ SSH stderr: ${stderr}`);
                }
                
                const output = stdout.trim();
                console.log(`✅ SSH result: ${output || '(empty)'}`);
                resolve(output);
            });
        });
    }

    async checkPhotosDatabase() {
        console.log('🗄️ Checking Photos database state...\n');
        
        try {
            // Check if Photos.sqlite exists and its size
            const dbExists = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "NOT_FOUND"');
            
            if (dbExists.includes('NOT_FOUND')) {
                console.log('❌ Photos.sqlite does not exist - database needs to be rebuilt');
                return false;
            } else {
                console.log('✅ Photos.sqlite exists');
                
                // Check database size
                const dbSize = await this.executeSSH('du -sh /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "Unknown"');
                console.log(`📊 Database size: ${dbSize}`);
                
                // Check if database is locked (being rebuilt)
                const lockFiles = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite-* 2>/dev/null || echo "NO_LOCKS"');
                if (!lockFiles.includes('NO_LOCKS')) {
                    console.log('🔒 Database lock files found - database may be rebuilding');
                    console.log(lockFiles);
                }
                
                return true;
            }
        } catch (error) {
            console.log('❌ Error checking Photos database:', error.message);
            return false;
        }
    }

    async checkDCIMContents() {
        console.log('📁 Checking DCIM contents...\n');
        
        try {
            // Count files in DCIM
            const fileCount = await this.executeSSH('find /var/mobile/Media/DCIM -type f 2>/dev/null | wc -l');
            console.log(`📊 Files in DCIM: ${fileCount.trim()}`);
            
            // List recent files
            const recentFiles = await this.executeSSH('find /var/mobile/Media/DCIM -type f -newer /var/mobile/Media/DCIM/100APPLE 2>/dev/null | head -5 || echo "NO_RECENT_FILES"');
            if (!recentFiles.includes('NO_RECENT_FILES')) {
                console.log('📄 Recent files in DCIM:');
                console.log(recentFiles);
            } else {
                console.log('📄 No recent files found in DCIM');
            }
            
            // Check DCIM structure
            const dcimStructure = await this.executeSSH('ls -la /var/mobile/Media/DCIM/ 2>/dev/null || echo "DCIM_NOT_ACCESSIBLE"');
            console.log('📁 DCIM structure:');
            console.log(dcimStructure);
            
        } catch (error) {
            console.log('❌ Error checking DCIM:', error.message);
        }
    }

    async checkPhotosProcesses() {
        console.log('🔍 Checking Photos-related processes...\n');
        
        try {
            // Check if Photos processes are running
            const processes = [
                'photoanalysisd',
                'photolibraryd',
                'Photos',
                'mediaserverd',
                'imagent'
            ];
            
            for (const process of processes) {
                try {
                    const result = await this.executeSSH(`ps aux | grep ${process} | grep -v grep || echo "NOT_RUNNING"`);
                    if (result.includes('NOT_RUNNING')) {
                        console.log(`❌ ${process}: Not running`);
                    } else {
                        console.log(`✅ ${process}: Running`);
                    }
                } catch (error) {
                    console.log(`⚠️ ${process}: Could not check`);
                }
            }
        } catch (error) {
            console.log('❌ Error checking processes:', error.message);
        }
    }

    async checkPhotosAppAccessibility() {
        console.log('📱 Checking Photos app accessibility...\n');
        
        try {
            // Try to get Photos app info
            const photosInfo = await this.executeSSH('ps aux | grep Photos | grep -v grep || echo "PHOTOS_NOT_RUNNING"');
            
            if (photosInfo.includes('PHOTOS_NOT_RUNNING')) {
                console.log('📱 Photos app is not currently running');
            } else {
                console.log('📱 Photos app is running');
                console.log(photosInfo);
            }
            
            // Check system memory usage (low memory can cause Photos issues)
            const memInfo = await this.executeSSH('vm_stat | head -10 || echo "MEMORY_INFO_UNAVAILABLE"');
            console.log('💾 Memory info:');
            console.log(memInfo);
            
        } catch (error) {
            console.log('❌ Error checking Photos app:', error.message);
        }
    }

    async suggestSolutions() {
        console.log('💡 Suggested solutions for Photos app issues:\n');
        
        console.log('1. **Wait for database rebuild** (most common):');
        console.log('   - iOS may need 2-5 minutes to rebuild Photos database');
        console.log('   - Try waiting longer before accessing Photos app');
        console.log('');
        
        console.log('2. **Force Photos app restart**:');
        console.log('   - Kill Photos app: killall -9 Photos');
        console.log('   - Wait 10 seconds, then try opening Photos');
        console.log('');
        
        console.log('3. **Restart photo services**:');
        console.log('   - Kill photo processes: killall -9 photoanalysisd photolibraryd mediaserverd');
        console.log('   - Wait 15 seconds for automatic restart');
        console.log('');
        
        console.log('4. **Complete iPhone restart** (if above fails):');
        console.log('   - Reboot iPhone completely');
        console.log('   - Wait for full boot before testing Photos');
        console.log('');
        
        console.log('5. **Check timing in automation**:');
        console.log('   - Increase wait time after nuclear cleanup');
        console.log('   - Add Photos app readiness check before proceeding');
    }

    async performFullDiagnostic() {
        console.log('🔍 iPhone Photos Gallery Diagnostic');
        console.log('===================================\n');
        
        try {
            await this.checkPhotosDatabase();
            console.log('');
            
            await this.checkDCIMContents();
            console.log('');
            
            await this.checkPhotosProcesses();
            console.log('');
            
            await this.checkPhotosAppAccessibility();
            console.log('');
            
            await this.suggestSolutions();
            
        } catch (error) {
            console.error('💥 Diagnostic failed:', error.message);
        }
    }
}

// Main execution
async function main() {
    const diagnostic = new iPhoneGalleryDiagnostic();
    await diagnostic.performFullDiagnostic();
}

// Export for use as module
module.exports = iPhoneGalleryDiagnostic;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
}