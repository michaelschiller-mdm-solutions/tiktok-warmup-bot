/**
 * Final Photos Fix for iOS 16
 * 
 * This addresses all the issues:
 * 1. Uses iOS-compatible commands (ls -l instead of stat -f)
 * 2. Removes WAL/SHM files for clean rebuild
 * 3. Provides instructions for getting the real iOS 16 template
 * 4. Actually launches Photos app to trigger rebuild
 */

const { exec } = require('child_process');

class FinalPhotosFix {
    constructor() {
        this.phoneIP = "192.168.178.65";
        this.mobileUser = "mobile";
        this.mobilePassword = "qwertzuio";
    }

    async executeSSH(command) {
        return new Promise((resolve, reject) => {
            console.log(`🔗 SSH: ${command}`);
            
            const plinkCommand = `plink -ssh -batch -l ${this.mobileUser} -pw ${this.mobilePassword} ${this.phoneIP} "${command}"`;
            
            exec(plinkCommand, { timeout: 15000 }, (error, stdout, stderr) => {
                if (error) {
                    console.log(`❌ SSH failed: ${error.message}`);
                    reject(error);
                    return;
                }
                
                const output = stdout.trim();
                console.log(`✅ SSH result: ${output || '(empty)'}`);
                resolve(output);
            });
        });
    }

    async verifyDatabaseExists() {
        console.log('🔍 Verifying Photos.sqlite exists (using iOS-compatible commands)...\n');
        
        try {
            // Use simple ls -l command that works on iOS
            const result = await this.executeSSH('ls -l /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "FILE_NOT_FOUND"');
            
            if (result.includes('FILE_NOT_FOUND')) {
                console.log('❌ Photos.sqlite does not exist');
                return false;
            } else {
                console.log('✅ Photos.sqlite exists:');
                console.log(`   ${result}`);
                
                // Check if it's empty (0 bytes = bad)
                if (result.includes(' 0 ')) {
                    console.log('⚠️ WARNING: Photos.sqlite is 0 bytes (empty file)');
                    return false;
                } else {
                    console.log('✅ Photos.sqlite has content');
                    return true;
                }
            }
        } catch (error) {
            console.log('❌ Could not verify database:', error.message);
            return false;
        }
    }

    async cleanupDatabaseFiles() {
        console.log('🗑️ Cleaning up old database files for fresh rebuild...\n');
        
        try {
            // Remove WAL and SHM files so Photos will recreate them fresh
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite-wal 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite-shm 2>/dev/null || true');
            
            console.log('✅ Old WAL/SHM files removed');
            
        } catch (error) {
            console.log('❌ Failed to cleanup database files:', error.message);
        }
    }

    async setProperPermissions() {
        console.log('🔐 Setting proper ownership and permissions...\n');
        
        try {
            // Set proper ownership for the database file
            await this.executeSSH('chown mobile:mobile /var/mobile/Media/PhotoData/Photos.sqlite');
            await this.executeSSH('chmod 644 /var/mobile/Media/PhotoData/Photos.sqlite');
            
            // Set proper ownership for entire PhotoData directory
            await this.executeSSH('chown -R mobile:mobile /var/mobile/Media/PhotoData');
            await this.executeSSH('chmod -R 755 /var/mobile/Media/PhotoData');
            
            console.log('✅ Ownership and permissions set correctly');
            
        } catch (error) {
            console.log('❌ Failed to set permissions:', error.message);
        }
    }

    async killPhotoProcesses() {
        console.log('🔄 Killing photo processes for clean restart...\n');
        
        try {
            const processes = [
                'photoanalysisd',
                'photolibraryd',
                'Photos',
                'mediaserverd',
                'imagent',
                'assetsd'
            ];
            
            for (const process of processes) {
                await this.executeSSH(`killall -9 ${process} 2>/dev/null || true`);
            }
            
            console.log('✅ Photo processes killed');
            
        } catch (error) {
            console.log('❌ Failed to kill processes:', error.message);
        }
    }

    async launchPhotosApp() {
        console.log('📱 Launching Photos app to trigger database rebuild...\n');
        
        try {
            // Use uiopen to launch Photos app (iOS equivalent of opening an app)
            await this.executeSSH('uiopen com.apple.mobileslideshow 2>/dev/null || true');
            
            console.log('✅ Photos app launch command sent');
            console.log('⏳ Wait 30-60 seconds for Photos to rebuild its database...');
            
        } catch (error) {
            console.log('⚠️ Could not launch Photos app via command');
            console.log('📱 Please manually tap the Photos icon on your iPhone');
        }
    }

    async checkPhotoProcesses() {
        console.log('🔍 Checking if photo processes are running...\n');
        
        try {
            // Simple check for photo processes
            const result = await this.executeSSH('ps aux | grep photo | grep -v grep');
            
            if (result.trim()) {
                console.log('✅ Photo processes are running:');
                console.log(result);
            } else {
                console.log('⚠️ No photo processes detected');
            }
            
        } catch (error) {
            console.log('⚠️ Could not check processes');
        }
    }

    async performFinalFix() {
        console.log('🔧 Final Photos Fix for iOS 16');
        console.log('==============================\n');
        
        // Step 1: Verify current state
        const dbExists = await this.verifyDatabaseExists();
        
        if (!dbExists) {
            console.log('\n❌ CRITICAL: Photos.sqlite is missing or empty!');
            console.log('\n💡 You need the REAL iOS 16 Photos.sqlite template:');
            console.log('   1. Download iOS 16 IPSW for your device');
            console.log('   2. Extract it and look for Photos.sqlite in:');
            console.log('      - /System/Library/PhotoLibrary/');
            console.log('      - Inside Photos app bundle');
            console.log('   3. Copy that file to /var/mobile/Media/PhotoData/Photos.sqlite');
            console.log('   4. Run this script again');
            console.log('\n🔗 Alternative: Copy from another working iOS 16 device');
            return false;
        }
        
        // Step 2: Clean up old files
        await this.cleanupDatabaseFiles();
        
        // Step 3: Set proper permissions
        await this.setProperPermissions();
        
        // Step 4: Kill photo processes
        await this.killPhotoProcesses();
        
        // Step 5: Launch Photos app
        await this.launchPhotosApp();
        
        // Step 6: Wait and check
        console.log('\n⏳ Waiting 10 seconds for processes to start...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        await this.checkPhotoProcesses();
        
        console.log('\n🎯 Final fix completed!');
        console.log('\n📱 IMPORTANT: Now manually open Photos app on your iPhone');
        console.log('   • It may show "Preparing..." for 1-2 minutes');
        console.log('   • This is normal - iOS is rebuilding the database');
        console.log('   • After rebuild, it should show "No Photos or Videos"');
        console.log('\n✅ If Photos opens successfully, the fix worked!');
        
        return true;
    }

    async quickCheck() {
        console.log('🔍 Quick Photos Status Check');
        console.log('============================\n');
        
        await this.verifyDatabaseExists();
        await this.checkPhotoProcesses();
        
        console.log('\n📱 Try opening Photos app now to test');
    }
}

async function main() {
    const args = process.argv.slice(2);
    const fixer = new FinalPhotosFix();
    
    if (args.includes('--check')) {
        await fixer.quickCheck();
    } else {
        await fixer.performFinalFix();
    }
}

// Export for use as module
module.exports = FinalPhotosFix;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
}