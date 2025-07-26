/**
 * Proper iOS 16 Photos Database Fix
 * 
 * This version looks for the real iOS 16 default Photos.sqlite template
 * from the system partition and uses proper iOS-compatible commands.
 */

const { exec } = require('child_process');

class ProperIOS16PhotosFix {
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

    async findDefaultPhotosTemplate() {
        console.log('🔍 Looking for iOS 16 default Photos.sqlite template...\n');
        
        const possibleLocations = [
            '/System/Library/PhotoLibrary/DefaultPhotos.sqlite',
            '/System/Library/PrivateFrameworks/PhotoLibraryServices.framework/DefaultPhotos.sqlite',
            '/System/Library/PrivateFrameworks/Photos.framework/DefaultPhotos.sqlite',
            '/usr/lib/Photos/DefaultPhotos.sqlite',
            '/var/mobile/Media/PhotoData/Photos.sqlite.default'
        ];
        
        for (const location of possibleLocations) {
            try {
                console.log(`🔍 Checking: ${location}`);
                const result = await this.executeSSH(`ls -la "${location}" 2>/dev/null || echo "NOT_FOUND"`);
                
                if (!result.includes('NOT_FOUND')) {
                    console.log(`✅ Found default template at: ${location}`);
                    return location;
                }
            } catch (error) {
                console.log(`⚠️ Could not check ${location}`);
            }
        }
        
        console.log('❌ No default Photos.sqlite template found');
        return null;
    }

    async restoreFromTemplate(templatePath) {
        console.log(`🔧 Restoring Photos.sqlite from template: ${templatePath}\n`);
        
        try {
            // Copy the template to the correct location
            await this.executeSSH(`cp "${templatePath}" /var/mobile/Media/PhotoData/Photos.sqlite`);
            
            // Set proper ownership
            await this.executeSSH('chown mobile:mobile /var/mobile/Media/PhotoData/Photos.sqlite');
            await this.executeSSH('chmod 644 /var/mobile/Media/PhotoData/Photos.sqlite');
            
            console.log('✅ Photos.sqlite restored from iOS template');
            return true;
            
        } catch (error) {
            console.log('❌ Failed to restore from template:', error.message);
            return false;
        }
    }

    async createFromBackup() {
        console.log('🔧 Looking for Photos.sqlite backup files...\n');
        
        try {
            // Find the most recent backup
            const backups = await this.executeSSH('ls -t /var/mobile/Media/PhotoData/Photos.sqlite.backup.* 2>/dev/null | head -1 || echo "NO_BACKUP"');
            
            if (!backups.includes('NO_BACKUP')) {
                console.log(`📁 Found backup: ${backups}`);
                
                // Copy backup to restore location
                await this.executeSSH(`cp "${backups.trim()}" /var/mobile/Media/PhotoData/Photos.sqlite`);
                await this.executeSSH('chown mobile:mobile /var/mobile/Media/PhotoData/Photos.sqlite');
                await this.executeSSH('chmod 644 /var/mobile/Media/PhotoData/Photos.sqlite');
                
                console.log('✅ Photos.sqlite restored from backup');
                return true;
            } else {
                console.log('❌ No backup files found');
                return false;
            }
            
        } catch (error) {
            console.log('❌ Failed to restore from backup:', error.message);
            return false;
        }
    }

    async recreateDirectoryStructure() {
        console.log('📁 Recreating complete PhotoData directory structure...\n');
        
        // Complete list of directories that iOS 16 Photos expects
        const requiredDirs = [
            '/var/mobile/Media/PhotoData/Thumbnails',
            '/var/mobile/Media/PhotoData/CPL',
            '/var/mobile/Media/PhotoData/AlbumsMetadata',
            '/var/mobile/Media/PhotoData/Masters',
            '/var/mobile/Media/PhotoData/MISC',
            '/var/mobile/Media/PhotoData/Caches',
            '/var/mobile/Media/PhotoData/external',
            '/var/mobile/Media/PhotoData/private',
            '/var/mobile/Media/PhotoData/Originals',  // iOS 16 specific
            '/var/mobile/Media/PhotoData/Derivatives', // iOS 16 specific
            '/var/mobile/Media/PhotoData/Scopes'       // iOS 16 Shared Library
        ];
        
        try {
            for (const dir of requiredDirs) {
                console.log(`📁 Creating: ${dir}`);
                await this.executeSSH(`mkdir -p "${dir}"`);
            }
            
            // Set proper ownership and permissions for entire PhotoData
            console.log('🔐 Setting proper ownership and permissions...');
            await this.executeSSH('chown -R mobile:mobile /var/mobile/Media/PhotoData');
            await this.executeSSH('chmod -R 755 /var/mobile/Media/PhotoData');
            
            console.log('✅ Directory structure recreated');
            
        } catch (error) {
            console.log('❌ Failed to recreate directories:', error.message);
        }
    }

    async clearCachesAndLogs() {
        console.log('🗑️ Clearing Photos caches and crash logs...\n');
        
        try {
            // Clear Photos preferences
            await this.executeSSH('rm -f /var/mobile/Library/Preferences/com.apple.mobileslideshow.plist 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Library/Preferences/com.apple.Photos.plist 2>/dev/null || true');
            
            // Clear Photos caches
            await this.executeSSH('rm -rf /var/mobile/Library/Caches/com.apple.mobileslideshow 2>/dev/null || true');
            await this.executeSSH('rm -rf /var/mobile/Library/Caches/com.apple.Photos 2>/dev/null || true');
            
            // Clear crash logs (critical for iOS 16)
            await this.executeSSH('rm -f /var/mobile/Library/Logs/CrashReporter/*Photos* 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Library/Logs/CrashReporter/*photolibraryd* 2>/dev/null || true');
            await this.executeSSH('rm -f /var/mobile/Library/Logs/CrashReporter/*photoanalysisd* 2>/dev/null || true');
            
            // Clear temporary files
            await this.executeSSH('rm -rf /tmp/com.apple.photos* 2>/dev/null || true');
            
            console.log('✅ Caches and logs cleared');
            
        } catch (error) {
            console.log('❌ Failed to clear caches:', error.message);
        }
    }

    async restartPhotoServices() {
        console.log('🔄 Restarting iOS 16 photo services...\n');
        
        try {
            // Kill all photo-related processes
            const processes = [
                'photoanalysisd',
                'photolibraryd',
                'Photos',
                'mediaserverd',
                'imagent',
                'assetsd'  // iOS 16 specific
            ];
            
            for (const process of processes) {
                await this.executeSSH(`killall -9 ${process} 2>/dev/null || true`);
            }
            
            // Wait for clean shutdown
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            console.log('✅ Photo services killed, they will restart automatically');
            
        } catch (error) {
            console.log('❌ Failed to restart services:', error.message);
        }
    }

    async verifyFix() {
        console.log('🔍 Verifying Photos database fix...\n');
        
        try {
            // Check if database exists (using iOS-compatible stat command)
            const dbStat = await this.executeSSH('stat -f "%Su:%Sg %z bytes" /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "NOT_FOUND"');
            
            if (dbStat.includes('NOT_FOUND')) {
                console.log('❌ Photos.sqlite still missing');
                return false;
            } else {
                console.log(`✅ Photos.sqlite exists: ${dbStat}`);
            }
            
            // Check if it's not empty (empty file = 0 bytes = bad)
            if (dbStat.includes('0 bytes')) {
                console.log('⚠️ Photos.sqlite is empty - this may cause issues');
            } else {
                console.log('✅ Photos.sqlite has content');
            }
            
            // Check directory count
            const dirCount = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/ | grep "^d" | wc -l');
            console.log(`📁 PhotoData subdirectories: ${dirCount.trim()}`);
            
            // Check if photo processes are running (simple check)
            const photoProcesses = await this.executeSSH('ps aux | grep photo | grep -v grep | wc -l');
            console.log(`🔍 Photo processes running: ${photoProcesses.trim()}`);
            
            console.log('\n🎯 Fix verification completed');
            console.log('📱 Try opening Photos app now');
            
            return true;
            
        } catch (error) {
            console.log('❌ Verification failed:', error.message);
            return false;
        }
    }

    async performProperFix() {
        console.log('🔧 Proper iOS 16 Photos Database Fix');
        console.log('===================================');
        console.log('This will properly restore Photos.sqlite for iOS 16\n');
        
        try {
            // Step 1: Look for the real iOS 16 template
            const templatePath = await this.findDefaultPhotosTemplate();
            
            let databaseRestored = false;
            
            if (templatePath) {
                // Step 2a: Restore from iOS template
                databaseRestored = await this.restoreFromTemplate(templatePath);
            }
            
            if (!databaseRestored) {
                // Step 2b: Try to restore from backup
                console.log('\n🔄 Template not found, trying backup restore...');
                databaseRestored = await this.createFromBackup();
            }
            
            if (!databaseRestored) {
                console.log('\n❌ Could not restore Photos.sqlite from template or backup');
                console.log('💡 You may need to:');
                console.log('   1. Extract DefaultPhotos.sqlite from iOS 16 IPSW');
                console.log('   2. Copy it to /System/Library/PhotoLibrary/DefaultPhotos.sqlite');
                console.log('   3. Run this script again');
                return false;
            }
            
            // Step 3: Recreate directory structure
            await this.recreateDirectoryStructure();
            
            // Step 4: Clear caches and logs
            await this.clearCachesAndLogs();
            
            // Step 5: Restart services
            await this.restartPhotoServices();
            
            // Step 6: Verify fix
            await this.verifyFix();
            
            console.log('\n🎉 Proper iOS 16 Photos fix completed!');
            console.log('📱 Photos app should now work with proper iOS 16 schema');
            
            return true;
            
        } catch (error) {
            console.error('💥 Proper fix failed:', error.message);
            return false;
        }
    }
}

async function main() {
    const fixer = new ProperIOS16PhotosFix();
    await fixer.performProperFix();
}

// Export for use as module
module.exports = ProperIOS16PhotosFix;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
}