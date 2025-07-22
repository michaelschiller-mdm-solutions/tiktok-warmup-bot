/**
 * Gallery Diagnostic Tool
 * 
 * Investigates what files are actually in the iPhone gallery
 * to understand why simple cleaning might not be sufficient.
 */

const { exec } = require('child_process');

class GalleryDiagnostic {
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
                
                const output = stdout.trim();
                console.log(`✅ Result: ${output || '(empty)'}`);
                resolve(output);
            });
        });
    }

    async investigateGallery() {
        console.log('🔍 Gallery Investigation');
        console.log('========================');
        
        try {
            // 1. Check all files in DCIM
            console.log('\n📁 All files in DCIM:');
            const allFiles = await this.executeSSH('find /var/mobile/Media/DCIM -type f | head -20');
            if (allFiles) {
                console.log(allFiles);
            } else {
                console.log('No files found');
            }
            
            // 2. Check directory structure
            console.log('\n📂 DCIM directory structure:');
            const dirs = await this.executeSSH('find /var/mobile/Media/DCIM -type d');
            console.log(dirs);
            
            // 3. Check for hidden files
            console.log('\n👻 Hidden files in DCIM:');
            const hiddenFiles = await this.executeSSH('find /var/mobile/Media/DCIM -name ".*" -type f | head -10');
            if (hiddenFiles) {
                console.log(hiddenFiles);
            } else {
                console.log('No hidden files found');
            }
            
            // 4. Check file extensions
            console.log('\n📄 File extensions in DCIM:');
            const extensions = await this.executeSSH('find /var/mobile/Media/DCIM -type f -name "*.*" | sed "s/.*\\.//" | sort | uniq -c | head -10');
            if (extensions) {
                console.log(extensions);
            } else {
                console.log('No files with extensions found');
            }
            
            // 5. Check Recently Deleted album location
            console.log('\n🗑️ Recently Deleted album:');
            try {
                const recentlyDeleted = await this.executeSSH('find /var/mobile/Media -name "*Recently*" -o -name "*Deleted*" -o -name "*Trash*" 2>/dev/null | head -5');
                if (recentlyDeleted) {
                    console.log(recentlyDeleted);
                } else {
                    console.log('No Recently Deleted album found');
                }
            } catch (error) {
                console.log('Could not check Recently Deleted album');
            }
            
            // 6. Check PhotoData directory
            console.log('\n🗄️ PhotoData directory size:');
            const photoDataSize = await this.executeSSH('du -sh /var/mobile/Media/PhotoData 2>/dev/null || echo "Not found"');
            console.log(photoDataSize);
            
            // 7. Check for database files
            console.log('\n💾 Photos database files:');
            const dbFiles = await this.executeSSH('find /var/mobile/Media/PhotoData -name "*.sqlite*" 2>/dev/null | head -5');
            if (dbFiles) {
                console.log(dbFiles);
            } else {
                console.log('No database files found');
            }
            
            // 8. Check total Media directory size breakdown
            console.log('\n📊 Media directory breakdown:');
            const mediaBreakdown = await this.executeSSH('du -sh /var/mobile/Media/* 2>/dev/null | sort -hr | head -10');
            console.log(mediaBreakdown);
            
            // 9. Check if Photos app is running
            console.log('\n📱 Photos app status:');
            const photosProcess = await this.executeSSH('ps aux | grep -i photos | grep -v grep || echo "Photos app not running"');
            console.log(photosProcess);
            
        } catch (error) {
            console.error('Investigation failed:', error.message);
        }
    }
}

// Main execution
async function main() {
    const diagnostic = new GalleryDiagnostic();
    await diagnostic.investigateGallery();
}

// Export for use as module
module.exports = GalleryDiagnostic;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
}