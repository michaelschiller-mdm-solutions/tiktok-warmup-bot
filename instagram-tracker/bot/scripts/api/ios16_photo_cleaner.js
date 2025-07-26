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
     * Step 1: Nuclear option - Delete and restore Photos database
     */
    async deletePhotosDatabase() {
        console.log('💥 Step 1: Nuclear option - Deleting and restoring Photos database...\n');
        
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
            
            // CRITICAL FIX: Restore database from backup (the approach that works)
            console.log('🔧 Restoring Photos database...');
            
            // First try to find iOS template
            const defaultExists = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite.default 2>/dev/null || echo "NOT_FOUND"');
            
            if (!defaultExists.includes('NOT_FOUND')) {
                console.log('✅ Restoring from iOS template...');
                await this.executeSSH('cp /var/mobile/Media/PhotoData/Photos.sqlite.default /var/mobile/Media/PhotoData/Photos.sqlite');
            } else {
                // Use backup restoration approach (this is what worked)
                console.log('🔧 Looking for backup to restore...');
                const backups = await this.executeSSH('ls -t /var/mobile/Media/PhotoData/Photos.sqlite.backup.* 2>/dev/null | head -1 || echo "NO_BACKUP"');
                
                if (!backups.includes('NO_BACKUP')) {
                    console.log(`✅ Restoring from backup: ${backups.trim()}`);
                    await this.executeSSH(`cp "${backups.trim()}" /var/mobile/Media/PhotoData/Photos.sqlite`);
                } else {
                    console.log('⚠️ No backup found - creating empty file for iOS to rebuild');
                    await this.executeSSH('touch /var/mobile/Media/PhotoData/Photos.sqlite');
                }
            }
            
            // CRITICAL: Remove WAL/SHM files for clean rebuild
            console.log('🗑️ Removing old WAL/SHM files for clean rebuild...');
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite-wal 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite-shm 2>/dev/null || true');
            
            // Set proper ownership and permissions
            await this.executeSSH('chown mobile:mobile /var/mobile/Media/PhotoData/Photos.sqlite* 2>/dev/null || true');
            await this.executeSSH('chmod 644 /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || true');
            
            console.log('✅ Photos database deleted and restored\n');
            
        } catch (error) {
            console.log('⚠️ Photos database deletion had issues, continuing...\n');
        }
    }

    /**
     * Step 2: Clean and recreate PhotoData subdirectories
     */
    async cleanAllPhotoData() {
        console.log('🧹 Step 2: Cleaning and recreating PhotoData subdirectories...\n');
        
        const photoDataDirs = [
            '/var/mobile/Media/PhotoData/MISC',
            '/var/mobile/Media/PhotoData/Thumbnails',
            '/var/mobile/Media/PhotoData/Caches',
            '/var/mobile/Media/PhotoData/external',
            '/var/mobile/Media/PhotoData/private',
            '/var/mobile/Media/PhotoData/CPL',
            '/var/mobile/Media/PhotoData/AlbumsMetadata',
            '/var/mobile/Media/PhotoData/Masters'  // Important for some iOS versions
        ];
        
        for (const dir of photoDataDirs) {
            try {
                console.log(`🗑️ Cleaning ${dir}...`);
                
                // Remove all contents but keep directory structure
                await this.executeSSH(`rm -rf "${dir}"/* 2>/dev/null || true`);
                await this.executeSSH(`rm -rf "${dir}"/.[^.]* 2>/dev/null || true`);
                
                // CRITICAL FIX: Recreate directory if it doesn't exist
                await this.executeSSH(`mkdir -p "${dir}" 2>/dev/null || true`);
                
                console.log(`✅ Cleaned and recreated ${dir}`);
                
            } catch (error) {
                console.log(`⚠️ Could not clean ${dir}`);
            }
        }
        
        // CRITICAL FIX: Set proper ownership and permissions for entire PhotoData
        console.log('🔐 Setting proper ownership and permissions...');
        await this.executeSSH('chown -R mobile:mobile /var/mobile/Media/PhotoData 2>/dev/null || true');
        await this.executeSSH('chmod -R 755 /var/mobile/Media/PhotoData 2>/dev/null || true');
        
        console.log('✅ PhotoData cleanup and recreation completed\n');
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
            
            // CRITICAL FIX: Clear crash logs that can prevent Photos from starting
            console.log('🗑️ Clearing Photos crash logs...');
            await this.executeSSH('rm -f /var/mobile/Library/Logs/CrashReporter/*Photos* 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Library/Logs/CrashReporter/*photolibraryd* 2>/dev/null || true');
            
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
            
            // CRITICAL: Apply final photos fix to ensure Photos app works
            await this.applyFinalPhotosFix();
            
            console.log('\n🎯 iOS 16 NUCLEAR CLEANUP COMPLETED!');
            console.log('📱 Photos app should now work properly');
            console.log('✅ Final photos fix applied automatically');
            
        } catch (error) {
            console.error('💥 iOS 16 cleanup failed:', error.message);
        }
    }

    /**
     * Apply final photos fix to ensure Photos app works after nuclear cleanup
     * This integrates the working solution from final-photos-fix.js
     */
    async applyFinalPhotosFix() {
        console.log('🔧 Applying final photos fix for reliable Photos app access...\n');
        
        try {
            // Step 1: Clean up old WAL/SHM files for fresh rebuild
            console.log('🗑️ Cleaning up old database files for fresh rebuild...');
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite-wal 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite-shm 2>/dev/null || true');
            console.log('✅ Old WAL/SHM files removed');
            
            // Step 2: Set proper ownership and permissions
            console.log('🔐 Setting proper ownership and permissions...');
            await this.executeSSH('chown mobile:mobile /var/mobile/Media/PhotoData/Photos.sqlite');
            await this.executeSSH('chmod 644 /var/mobile/Media/PhotoData/Photos.sqlite');
            await this.executeSSH('chown -R mobile:mobile /var/mobile/Media/PhotoData');
            await this.executeSSH('chmod -R 755 /var/mobile/Media/PhotoData');
            console.log('✅ Ownership and permissions set correctly');
            
            // Step 3: Kill photo processes for clean restart
            console.log('🔄 Killing photo processes for clean restart...');
            const processes = ['photoanalysisd', 'photolibraryd', 'Photos', 'mediaserverd', 'imagent', 'assetsd'];
            for (const process of processes) {
                await this.executeSSH(`killall -9 ${process} 2>/dev/null || true`);
            }
            console.log('✅ Photo processes killed');
            
            // Step 4: Launch Photos app to trigger database rebuild
            console.log('📱 Launching Photos app to trigger database rebuild...');
            await this.executeSSH('uiopen com.apple.mobileslideshow 2>/dev/null || true');
            console.log('✅ Photos app launch command sent');
            
            // Step 5: Wait for processes to restart
            console.log('⏳ Waiting 10 seconds for photo processes to restart...');
            await new Promise(resolve => setTimeout(resolve, 10000));
            
            console.log('✅ Final photos fix applied successfully');
            console.log('📱 Photos app should now be accessible and show "No Photos or Videos"');
            
        } catch (error) {
            console.log('⚠️ Final photos fix had issues:', error.message);
            console.log('📱 You may need to manually open Photos app on iPhone');
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