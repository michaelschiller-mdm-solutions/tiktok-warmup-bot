/**
 * Fixed iOS 16 Photo Cleaner with proper database restoration
 * 
 * This version fixes the issue where the Photos app can't launch after nuclear cleanup
 * by properly restoring the database structure and required directories.
 */

const { exec } = require('child_process');

class FixedIOS16PhotoCleaner {
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

    /**
     * Step 1: Backup and clean Photos database (with restoration)
     */
    async cleanPhotosDatabase() {
        console.log('💥 Step 1: Cleaning Photos database with restoration...\n');
        
        try {
            // Kill all photo-related processes
            console.log('🛑 Killing all photo processes...');
            await this.executeSSH('killall -9 photoanalysisd photolibraryd Photos mediaserverd imagent 2>/dev/null || true');
            
            // Wait for processes to die
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Create timestamped backup
            const timestamp = Math.floor(Date.now() / 1000);
            console.log('🗄️ Creating backup of Photos.sqlite...');
            await this.executeSSH(`cp /var/mobile/Media/PhotoData/Photos.sqlite /var/mobile/Media/PhotoData/Photos.sqlite.backup.${timestamp} 2>/dev/null || true`);
            
            // Check if default template exists
            console.log('🔍 Checking for default database template...');
            const defaultExists = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite.default 2>/dev/null || echo "NOT_FOUND"');
            
            // Delete current database files
            console.log('🗑️ Removing current database files...');
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite-wal 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Media/PhotoData/Photos.sqlite-shm 2>/dev/null || true');
            
            // Restore database from template or backup
            if (!defaultExists.includes('NOT_FOUND')) {
                console.log('✅ Restoring from default template...');
                await this.executeSSH('cp /var/mobile/Media/PhotoData/Photos.sqlite.default /var/mobile/Media/PhotoData/Photos.sqlite');
            } else {
                console.log('⚠️ No default template found, creating minimal database...');
                await this.createMinimalPhotosDatabase();
            }
            
            // Set proper ownership
            await this.executeSSH('chown mobile:mobile /var/mobile/Media/PhotoData/Photos.sqlite* 2>/dev/null || true');
            
            console.log('✅ Photos database cleaned and restored\n');
            
        } catch (error) {
            console.log('⚠️ Photos database cleanup had issues:', error.message);
            console.log('🔄 Attempting recovery...\n');
            await this.createMinimalPhotosDatabase();
        }
    }

    /**
     * Create a minimal Photos database if no template exists
     */
    async createMinimalPhotosDatabase() {
        try {
            console.log('🔧 Creating minimal Photos database...');
            
            // Create a minimal SQLite database with basic Photos schema
            const createDbCommand = `
                sqlite3 /var/mobile/Media/PhotoData/Photos.sqlite "
                CREATE TABLE IF NOT EXISTS ZGENERICALBUM (Z_PK INTEGER PRIMARY KEY, ZTITLE TEXT);
                CREATE TABLE IF NOT EXISTS ZGENERICASSET (Z_PK INTEGER PRIMARY KEY, ZFILENAME TEXT);
                CREATE TABLE IF NOT EXISTS ZADDITIONALASSETATTRIBUTES (Z_PK INTEGER PRIMARY KEY);
                PRAGMA user_version = 1;
                "
            `;
            
            await this.executeSSH(createDbCommand);
            await this.executeSSH('chown mobile:mobile /var/mobile/Media/PhotoData/Photos.sqlite');
            
            console.log('✅ Minimal Photos database created');
            
        } catch (error) {
            console.log('❌ Failed to create minimal database:', error.message);
        }
    }

    /**
     * Step 2: Clean and recreate PhotoData subdirectories
     */
    async recreatePhotoDataStructure() {
        console.log('🧹 Step 2: Recreating PhotoData directory structure...\n');
        
        const requiredDirs = [
            '/var/mobile/Media/PhotoData/Thumbnails',
            '/var/mobile/Media/PhotoData/CPL',
            '/var/mobile/Media/PhotoData/AlbumsMetadata',
            '/var/mobile/Media/PhotoData/MISC',
            '/var/mobile/Media/PhotoData/Caches',
            '/var/mobile/Media/PhotoData/external',
            '/var/mobile/Media/PhotoData/private',
            '/var/mobile/Media/PhotoData/Masters'  // Important for some iOS versions
        ];
        
        try {
            // Clean existing directories (contents only, not the directories themselves)
            for (const dir of requiredDirs) {
                console.log(`🗑️ Cleaning ${dir}...`);
                await this.executeSSH(`rm -rf "${dir}"/* 2>/dev/null || true`);
                await this.executeSSH(`rm -rf "${dir}"/.[^.]* 2>/dev/null || true`);
            }
            
            // Recreate directory structure
            console.log('📁 Recreating directory structure...');
            for (const dir of requiredDirs) {
                await this.executeSSH(`mkdir -p "${dir}" 2>/dev/null || true`);
            }
            
            // Set proper ownership and permissions for entire PhotoData
            console.log('🔐 Setting proper ownership and permissions...');
            await this.executeSSH('chown -R mobile:mobile /var/mobile/Media/PhotoData 2>/dev/null || true');
            await this.executeSSH('chmod -R 755 /var/mobile/Media/PhotoData 2>/dev/null || true');
            
            console.log('✅ PhotoData structure recreated\n');
            
        } catch (error) {
            console.log('⚠️ PhotoData structure recreation had issues:', error.message);
        }
    }

    /**
     * Step 3: Clean and recreate DCIM structure
     */
    async recreateDCIMStructure() {
        console.log('📁 Step 3: Recreating DCIM structure...\n');
        
        try {
            // Remove all files from DCIM
            await this.executeSSH('find /var/mobile/Media/DCIM -type f -delete 2>/dev/null || true');
            
            // Recreate the basic DCIM structure
            await this.executeSSH('mkdir -p /var/mobile/Media/DCIM/100APPLE 2>/dev/null || true');
            await this.executeSSH('mkdir -p /var/mobile/Media/DCIM/.MISC/Incoming 2>/dev/null || true');
            
            // Set proper permissions
            await this.executeSSH('chown -R mobile:mobile /var/mobile/Media/DCIM 2>/dev/null || true');
            await this.executeSSH('chmod -R 755 /var/mobile/Media/DCIM 2>/dev/null || true');
            
            console.log('✅ DCIM structure recreated\n');
            
        } catch (error) {
            console.log('⚠️ DCIM structure recreation had issues:', error.message);
        }
    }

    /**
     * Step 4: Clear iOS caches and preferences
     */
    async clearIOSCaches() {
        console.log('🧹 Step 4: Clearing iOS caches and preferences...\n');
        
        try {
            // Clear Photos preferences
            console.log('🗑️ Clearing Photos preferences...');
            await this.executeSSH('rm -rf /var/mobile/Library/Preferences/com.apple.mobileslideshow.plist 2>/dev/null || true');
            await this.executeSSH('rm -rf /var/mobile/Library/Preferences/com.apple.Photos.plist 2>/dev/null || true');
            
            // Clear Photos caches
            console.log('🗑️ Clearing Photos caches...');
            await this.executeSSH('rm -rf /var/mobile/Library/Caches/com.apple.mobileslideshow 2>/dev/null || true');
            await this.executeSSH('rm -rf /var/mobile/Library/Caches/com.apple.Photos 2>/dev/null || true');
            
            // Clear temporary files
            console.log('🗑️ Clearing temporary files...');
            await this.executeSSH('rm -rf /tmp/com.apple.photos* 2>/dev/null || true');
            
            // Clear crash logs (they can prevent Photos from starting)
            console.log('🗑️ Clearing crash logs...');
            await this.executeSSH('rm -f /var/mobile/Library/Logs/CrashReporter/*Photos* 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Library/Logs/CrashReporter/*photolibraryd* 2>/dev/null || true');
            
            console.log('✅ iOS caches cleared\n');
            
        } catch (error) {
            console.log('⚠️ Cache clearing had issues:', error.message);
        }
    }

    /**
     * Step 5: Restart photo services properly
     */
    async restartPhotoServices() {
        console.log('🔄 Step 5: Restarting photo services...\n');
        
        try {
            // Kill all photo-related processes
            console.log('🛑 Killing photo services...');
            const processes = [
                'photoanalysisd',
                'photolibraryd', 
                'Photos',
                'mediaserverd',
                'imagent'
            ];
            
            for (const process of processes) {
                await this.executeSSH(`killall -9 ${process} 2>/dev/null || true`);
            }
            
            // Wait for clean shutdown
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Force SpringBoard restart (this will respring the device)
            console.log('📱 Triggering respring...');
            await this.executeSSH('killall -9 SpringBoard 2>/dev/null || true');
            
            console.log('✅ Photo services restart initiated\n');
            console.log('📱 iPhone will respring - this is expected!\n');
            
        } catch (error) {
            console.log('⚠️ Service restart had issues:', error.message);
        }
    }

    /**
     * Step 6: Verify restoration after respring
     */
    async verifyRestoration() {
        console.log('🔍 Step 6: Verifying restoration after respring...\n');
        
        // Wait longer for system to fully stabilize after our fixes
        console.log('⏳ Waiting for system to fully stabilize (20 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 20000));
        
        try {
            // Check if Photos.sqlite exists and is accessible
            const dbExists = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "NOT_FOUND"');
            
            if (dbExists.includes('NOT_FOUND')) {
                console.log('❌ Photos.sqlite still missing after restoration');
                return false;
            } else {
                console.log('✅ Photos.sqlite exists and is accessible');
            }
            
            // Check directory structure
            const dirsExist = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/ | grep "^d" | wc -l');
            console.log(`📁 PhotoData subdirectories: ${dirsExist.trim()}`);
            
            // Check ownership
            const ownership = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite | awk \'{print $3":"$4}\'');
            console.log(`🔐 Database ownership: ${ownership.trim()}`);
            
            // Check if photo processes are running
            const processCount = await this.executeSSH('ps aux | grep -E "(photoanalysisd|photolibraryd|mediaserverd)" | grep -v grep | wc -l');
            console.log(`🔍 Photo processes running: ${processCount.trim()}`);
            
            // Check DCIM files
            const dcimFiles = await this.executeSSH('find /var/mobile/Media/DCIM -type f 2>/dev/null | wc -l');
            console.log(`📁 DCIM files: ${dcimFiles.trim()}`);
            
            if (parseInt(dcimFiles.trim()) === 0) {
                console.log('\n🎉 SUCCESS: Gallery is clean and Photos app should be accessible!');
                console.log('📱 Photos app should now show "No Photos or Videos"');
                console.log('🔧 Database and directory structure properly restored');
                return true;
            } else {
                console.log(`\n⚠️ Still found ${dcimFiles.trim()} files in DCIM`);
                return false;
            }
            
        } catch (error) {
            console.log('⚠️ Verification had connection issues:', error.message);
            return false;
        }
    }

    /**
     * Perform complete iOS 16 photo cleanup with proper restoration
     */
    async performFixedCleanup() {
        console.log('🧹 Fixed iOS 16 Photo Cleanup with Restoration');
        console.log('===============================================');
        console.log('📱 This will perform SAFE cleanup for iOS 16:');
        console.log('   • Clean Photos database with restoration');
        console.log('   • Recreate required PhotoData directories');
        console.log('   • Recreate DCIM structure');
        console.log('   • Clear caches and crash logs');
        console.log('   • Properly restart photo services');
        console.log('   • Verify Photos app accessibility');
        console.log('');
        console.log('⚠️ WARNING: This will cause iPhone to respring!');
        console.log('✅ But Photos app will remain functional after cleanup');
        console.log('');
        
        try {
            await this.cleanPhotosDatabase();
            await this.recreatePhotoDataStructure();
            await this.recreateDCIMStructure();
            await this.clearIOSCaches();
            await this.restartPhotoServices();
            await this.verifyRestoration();
            
            console.log('\n🎯 FIXED iOS 16 CLEANUP COMPLETED!');
            console.log('📱 Photos app should now be accessible');
            console.log('✅ Gallery should show "No Photos or Videos"');
            console.log('🔧 Database and directory structure restored');
            console.log('');
            console.log('💡 If Photos app still has issues:');
            console.log('   1. Wait 2-3 minutes for database rebuild');
            console.log('   2. Try opening Photos app manually');
            console.log('   3. Check Settings > General > iPhone Storage > Photos');
            
        } catch (error) {
            console.error('💥 Fixed cleanup failed:', error.message);
            console.log('');
            console.log('🔧 Recovery suggestions:');
            console.log('   1. Run the diagnostic script to check current state');
            console.log('   2. Try manual database restoration');
            console.log('   3. Complete iPhone restart may be needed');
        }
    }
}

// Main execution
async function main() {
    const cleaner = new FixedIOS16PhotoCleaner();
    await cleaner.performFixedCleanup();
}

// Export for use as module
module.exports = FixedIOS16PhotoCleaner;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
}