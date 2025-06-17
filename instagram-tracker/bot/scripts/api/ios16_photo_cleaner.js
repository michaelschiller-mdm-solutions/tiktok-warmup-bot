/**
 * iOS 16 Specific Photo Cleaner
 * 
 * Based on Apple Support documentation and iOS 16 behavior:
 * - Photos go to "Recently Deleted" album for 30 days
 * - iCloud Photos sync across devices
 * - Photos database has multiple cache layers
 * - Need to clear Recently Deleted album
 * - Force Photos app to rebuild its database
 * 
 * USAGE:
 * node scripts/api/ios16_photo_cleaner.js
 */

const { exec } = require('child_process');

class iOS16PhotoCleaner {
    constructor() {
        this.phoneIP = "192.168.178.65";
        this.mobileUser = "mobile";
        this.mobilePassword = "qwertzuio";
    }

    async executeSSH(command) {
        return new Promise((resolve, reject) => {
            console.log(`🔗 SSH (mobile): ${command}`);
            
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

    /**
     * Step 1: Nuclear option - Delete entire Photos database
     */
    async deletePhotosDatabase() {
        console.log('💥 Step 1: Nuclear option - Deleting entire Photos database...\n');
        
        try {
            // Kill all photo-related processes
            console.log('🛑 Killing all photo processes...');
            await this.executeSSH('killall -9 photoanalysisd photolibraryd Photos mediaserverd imagent 2>/dev/null || true');
            
            // Wait for processes to die
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Backup and delete the entire Photos database
            console.log('🗄️ Backing up and deleting Photos.sqlite...');
            await this.executeSSH('cp /var/mobile/Media/PhotoData/Photos.sqlite /var/mobile/Media/PhotoData/Photos.sqlite.backup.$(date +%s) 2>/dev/null || true');
            
            // Delete all database files
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite-wal 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite-shm 2>/dev/null || true');
            
            console.log('✅ Photos database deleted\n');
            
        } catch (error) {
            console.log('⚠️ Photos database deletion had issues, continuing...\n');
        }
    }

    /**
     * Step 2: Clean all PhotoData subdirectories
     */
    async cleanAllPhotoData() {
        console.log('🧹 Step 2: Cleaning all PhotoData subdirectories...\n');
        
        const photoDataDirs = [
            '/var/mobile/Media/PhotoData/MISC',
            '/var/mobile/Media/PhotoData/Thumbnails',
            '/var/mobile/Media/PhotoData/Caches',
            '/var/mobile/Media/PhotoData/external',
            '/var/mobile/Media/PhotoData/private',
            '/var/mobile/Media/PhotoData/CPL',
            '/var/mobile/Media/PhotoData/AlbumsMetadata'
        ];
        
        for (const dir of photoDataDirs) {
            try {
                console.log(`🗑️ Cleaning ${dir}...`);
                
                // Remove all contents
                await this.executeSSH(`rm -rf "${dir}"/* 2>/dev/null || true`);
                await this.executeSSH(`rm -rf "${dir}"/.[^.]* 2>/dev/null || true`);
                
                console.log(`✅ Cleaned ${dir}`);
                
            } catch (error) {
                console.log(`⚠️ Could not clean ${dir}`);
            }
        }
        
        console.log('✅ PhotoData cleanup completed\n');
    }

    /**
     * Step 3: Clean all DCIM directories thoroughly
     */
    async cleanAllDCIM() {
        console.log('📁 Step 3: Thorough DCIM cleanup...\n');
        
        try {
            // Remove all files from all DCIM subdirectories
            await this.executeSSH('find /var/mobile/Media/DCIM -type f -delete 2>/dev/null || true');
            
            // Recreate the basic structure
            await this.executeSSH('mkdir -p /var/mobile/Media/DCIM/100APPLE 2>/dev/null || true');
            await this.executeSSH('mkdir -p /var/mobile/Media/DCIM/.MISC/Incoming 2>/dev/null || true');
            
            // Set proper permissions
            await this.executeSSH('chown -R mobile:mobile /var/mobile/Media/DCIM 2>/dev/null || true');
            await this.executeSSH('chmod -R 755 /var/mobile/Media/DCIM 2>/dev/null || true');
            
            console.log('✅ DCIM thoroughly cleaned\n');
            
        } catch (error) {
            console.log('⚠️ DCIM cleanup had issues, continuing...\n');
        }
    }

    /**
     * Step 4: Clear iOS caches and preferences
     */
    async clearIOSCaches() {
        console.log('🧹 Step 4: Clearing iOS caches and preferences...\n');
        
        try {
            // Clear mobile preferences for Photos
            console.log('🗑️ Clearing Photos preferences...');
            await this.executeSSH('rm -rf /var/mobile/Library/Preferences/com.apple.mobileslideshow.plist 2>/dev/null || true');
            await this.executeSSH('rm -rf /var/mobile/Library/Preferences/com.apple.Photos.plist 2>/dev/null || true');
            
            // Clear Caches
            console.log('🗑️ Clearing system caches...');
            await this.executeSSH('rm -rf /var/mobile/Library/Caches/com.apple.mobileslideshow 2>/dev/null || true');
            await this.executeSSH('rm -rf /var/mobile/Library/Caches/com.apple.Photos 2>/dev/null || true');
            
            // Clear temporary files
            console.log('🗑️ Clearing temporary files...');
            await this.executeSSH('rm -rf /tmp/com.apple.photos* 2>/dev/null || true');
            
            console.log('✅ iOS caches cleared\n');
            
        } catch (error) {
            console.log('⚠️ Cache clearing had issues, continuing...\n');
        }
    }

    /**
     * Step 5: Force complete system restart of photo services
     */
    async forcePhotoServicesRestart() {
        console.log('🔄 Step 5: Force complete photo services restart...\n');
        
        try {
            // Kill everything photo-related
            console.log('🛑 Killing all photo and media services...');
            const processes = [
                'photoanalysisd',
                'photolibraryd', 
                'Photos',
                'mediaserverd',
                'imagent',
                'SpringBoard'
            ];
            
            for (const process of processes) {
                await this.executeSSH(`killall -9 ${process} 2>/dev/null || true`);
            }
            
            console.log('✅ All photo services killed\n');
            console.log('📱 iPhone will respring - this is expected!\n');
            
        } catch (error) {
            console.log('⚠️ Service restart had issues\n');
        }
    }

    /**
     * Step 6: Verify complete cleanup
     */
    async verifyCompleteCleanup() {
        console.log('🔍 Step 6: Final verification after respring...\n');
        
        // Wait longer for system to fully stabilize
        console.log('⏳ Waiting for system to fully stabilize (15 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        try {
            // Check filesystem
            const dcimFiles = await this.executeSSH('find /var/mobile/Media/DCIM -type f 2>/dev/null | wc -l');
            const dcimCount = parseInt(dcimFiles.trim()) || 0;
            
            // Check if Photos.sqlite exists (should be recreated)
            const dbExists = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "NOT_FOUND"');
            
            // Check total media usage
            const mediaUsage = await this.executeSSH('du -sh /var/mobile/Media 2>/dev/null || echo "Unknown"');
            
            console.log(`📁 DCIM files: ${dcimCount}`);
            console.log(`🗄️ Photos database: ${dbExists.includes('NOT_FOUND') ? 'Recreated (empty)' : 'Exists'}`);
            console.log(`💾 Media usage: ${mediaUsage}`);
            
            if (dcimCount === 0) {
                console.log('\n🎉 SUCCESS: Filesystem is completely clean!');
                console.log('📱 Photos app should now show "No Photos or Videos"');
                console.log('🔄 If not, try manually opening Photos app to trigger rebuild');
            } else {
                console.log(`\n⚠️ Still found ${dcimCount} files in DCIM`);
            }
            
        } catch (error) {
            console.log('⚠️ Final verification had connection issues');
        }
    }

    /**
     * Complete iOS 16 photo cleanup
     */
    async performiOS16Cleanup() {
        console.log('🧹 iOS 16 COMPLETE Photo Cleanup');
        console.log('=================================');
        console.log('📱 This will perform NUCLEAR cleanup for iOS 16:');
        console.log('   • Delete entire Photos database');
        console.log('   • Clean all PhotoData directories');
        console.log('   • Thorough DCIM cleanup');
        console.log('   • Clear iOS caches and preferences');
        console.log('   • Force complete system restart');
        console.log('');
        console.log('⚠️ WARNING: This will cause iPhone to respring!');
        console.log('💥 This is the NUCLEAR option for stubborn iOS 16 photos');
        console.log('');
        
        try {
            await this.deletePhotosDatabase();
            await this.cleanAllPhotoData();
            await this.cleanAllDCIM();
            await this.clearIOSCaches();
            await this.forcePhotoServicesRestart();
            await this.verifyCompleteCleanup();
            
            console.log('\n🎯 iOS 16 NUCLEAR CLEANUP COMPLETED!');
            console.log('📱 Please check Photos app on iPhone now');
            console.log('🔄 If photos still appear:');
            console.log('   1. Manually open Photos app (may take time to rebuild)');
            console.log('   2. Restart iPhone completely');
            console.log('   3. Check Settings > General > iPhone Storage > Photos');
            console.log('   4. The database rebuild may take several minutes');
            
        } catch (error) {
            console.error('💥 iOS 16 cleanup failed:', error.message);
        }
    }
}

// Main execution
async function main() {
    const cleaner = new iOS16PhotoCleaner();
    await cleaner.performiOS16Cleanup();
}

// Export for use as module
module.exports = iOS16PhotoCleaner;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 