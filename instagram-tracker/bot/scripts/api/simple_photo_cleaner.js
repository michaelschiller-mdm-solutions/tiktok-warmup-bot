/**
 * Simple Photo Cleaner
 * 
 * A lightweight alternative to the nuclear iOS16 photo cleaner.
 * This just removes photo files from DCIM without database manipulation
 * or system restarts.
 * 
 * USAGE:
 * node scripts/api/simple_photo_cleaner.js
 */

const { exec } = require('child_process');

class SimplePhotoCleaner {
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
     * Simple DCIM cleanup - just remove photo files
     */
    async cleanDCIMFiles() {
        console.log('📁 Cleaning DCIM photo files...\n');
        
        try {
            // Count existing files first (case-insensitive)
            const fileCount = await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.heic" -o -iname "*.heif" -o -iname "*.mov" -o -iname "*.mp4" -o -iname "*.m4v" | wc -l');
            console.log(`📊 Found ${fileCount.trim()} media files to remove`);
            
            if (parseInt(fileCount.trim()) === 0) {
                console.log('✅ DCIM is already clean - no files to remove');
                return true;
            }
            
            // Remove image and video files from DCIM (case-insensitive)
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.jpg" -delete 2>/dev/null || true');
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.jpeg" -delete 2>/dev/null || true');
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.png" -delete 2>/dev/null || true');
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.heic" -delete 2>/dev/null || true');
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.heif" -delete 2>/dev/null || true');
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.mov" -delete 2>/dev/null || true');
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.mp4" -delete 2>/dev/null || true');
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.m4v" -delete 2>/dev/null || true');
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.avi" -delete 2>/dev/null || true');
            
            // Remove any thumbnail and metadata files
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.thm" -delete 2>/dev/null || true');
            await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.aae" -delete 2>/dev/null || true');
            
            // Alternative approach: remove all files from 100APPLE directory
            await this.executeSSH('rm -f /var/mobile/Media/DCIM/100APPLE/* 2>/dev/null || true');
            
            console.log('✅ DCIM photo files removed');
            
        } catch (error) {
            console.log('⚠️ DCIM cleanup had issues:', error.message);
            throw error;
        }
    }

    /**
     * Optional: Kill Photos app to refresh its view
     */
    async refreshPhotosApp() {
        console.log('📱 Refreshing Photos app...\n');
        
        try {
            // Just kill the Photos app (not SpringBoard)
            await this.executeSSH('killall -9 Photos 2>/dev/null || true');
            console.log('✅ Photos app refreshed');
            
            // Small delay to let the app close
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.log('⚠️ Photos app refresh had issues (this is usually fine)');
        }
    }

    /**
     * Verify cleanup
     */
    async verifyCleanup() {
        console.log('🔍 Verifying cleanup...\n');
        
        try {
            // Count remaining files (case-insensitive to match our cleaning)
            const remainingFiles = await this.executeSSH('find /var/mobile/Media/DCIM -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.heic" -o -iname "*.heif" -o -iname "*.mov" -o -iname "*.mp4" -o -iname "*.m4v" | wc -l');
            const count = parseInt(remainingFiles.trim()) || 0;
            
            // Check total DCIM size
            const dcimSize = await this.executeSSH('du -sh /var/mobile/Media/DCIM 2>/dev/null || echo "Unknown"');
            
            console.log(`📁 Remaining media files: ${count}`);
            console.log(`💾 DCIM size: ${dcimSize}`);
            
            if (count === 0) {
                console.log('\n🎉 SUCCESS: Gallery is clean!');
                console.log('📱 Photos app should now show "No Photos or Videos"');
                return true;
            } else {
                console.log(`\n⚠️ Still found ${count} files - may need manual cleanup`);
                return false;
            }
            
        } catch (error) {
            console.log('⚠️ Verification had issues:', error.message);
            return false;
        }
    }

    /**
     * Perform simple photo cleanup
     */
    async performSimpleCleanup() {
        console.log('🧹 Simple Photo Gallery Cleanup');
        console.log('===============================');
        console.log('📱 This will remove photo files from DCIM');
        console.log('   • No database manipulation');
        console.log('   • No system restart required');
        console.log('   • Just removes actual photo files');
        console.log('');
        
        try {
            await this.cleanDCIMFiles();
            await this.refreshPhotosApp();
            const success = await this.verifyCleanup();
            
            if (success) {
                console.log('\n🎯 Simple cleanup completed successfully!');
                console.log('📱 Gallery is now clean and ready for new content');
            } else {
                console.log('\n⚠️ Cleanup completed but some files may remain');
                console.log('💡 You may need to use the nuclear cleaner for stubborn files');
            }
            
            return success;
            
        } catch (error) {
            console.error('💥 Simple cleanup failed:', error.message);
            console.log('💡 You may need to use the nuclear iOS16 cleaner instead');
            throw error;
        }
    }
}

// Main execution
async function main() {
    const cleaner = new SimplePhotoCleaner();
    await cleaner.performSimpleCleanup();
}

// Export for use as module
module.exports = SimplePhotoCleaner;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
}