/**
 * Fix Open Container Scripts - Correct Sleep Placement
 * 
 * This script fixes the mistake where sys.msleep(2048) was placed BEFORE touch.off
 * instead of AFTER. It will:
 * 1. Remove sys.msleep(2048) that appears BEFORE touch.off
 * 2. Add sys.msleep(2048) AFTER the last touch.off
 * 3. Upload all corrected scripts to iPhone
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ContainerScriptFixer {
    constructor() {
        this.apiBase = "http://192.168.178.65:46952";
        this.containerDir = './scripts/open_container/';
        
        // The sleep that needs to be moved
        this.sleepLine = 'sys.msleep(2048)';
        
        // List of all container files
        this.containerFiles = [
            'open_container1.lua',
            'open_container2.lua', 
            'open_container3.lua',
            'open_container4.lua',
            'open_container5.lua',
            'open_container6.lua',
            'open_container7.lua',
            'open_container8.lua',
            'open_container9.lua',
            'open_container10.lua',
            'open_container11.lua',
            'open_container12.lua',
            'open_container13.lua',
            'open_container14.lua',
            'open_container17.lua',
            'open_container18.lua',
            'open_container19.lua',
            'open_container20.lua',
            'open_container21.lua',
            'open_container22.lua',
            'open_container23.lua',
            'open_container24.lua',
            'open_container25.lua',
            'open_container26.lua',
            'open_container27.lua',
            'open_container28.lua',
            'open_container29.lua',
            'open_container30.lua'
        ];
    }

    /**
     * Fix a single container script
     */
    fixScript(filePath) {
        try {
            console.log(`🔧 Fixing: ${path.basename(filePath)}`);
            
            // Read the file
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            // Find and remove sys.msleep(2048) that appears BEFORE touch.off
            let removedCount = 0;
            let lastTouchOffIndex = -1;
            
            // First pass: find the last touch.off
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].includes('touch.off(')) {
                    lastTouchOffIndex = i;
                    break;
                }
            }
            
            if (lastTouchOffIndex === -1) {
                console.log(`   ⚠️ No touch.off found in ${path.basename(filePath)}`);
                return false;
            }
            
            // Second pass: remove any sys.msleep(2048) that appears BEFORE the last touch.off
            for (let i = lastTouchOffIndex - 1; i >= 0; i--) {
                if (lines[i].trim() === this.sleepLine) {
                    console.log(`   🗑️ Removing incorrect sleep at line ${i + 1} (before touch.off)`);
                    lines.splice(i, 1);
                    lastTouchOffIndex--; // Adjust index since we removed a line
                    removedCount++;
                }
            }
            
            // Third pass: check if sys.msleep(2048) already exists AFTER touch.off
            let hasCorrectSleep = false;
            for (let i = lastTouchOffIndex + 1; i < lines.length; i++) {
                if (lines[i].trim() === this.sleepLine) {
                    hasCorrectSleep = true;
                    console.log(`   ✅ Correct sleep already exists after touch.off`);
                    break;
                }
                // Stop checking if we hit the end of the actions function
                if (lines[i].includes('end') && i > lastTouchOffIndex + 5) {
                    break;
                }
            }
            
            // Add sys.msleep(2048) AFTER the last touch.off if it doesn't exist
            if (!hasCorrectSleep) {
                lines.splice(lastTouchOffIndex + 1, 0, '', this.sleepLine);
                console.log(`   ✅ Added sleep AFTER last touch.off`);
            }
            
            // Write the corrected content back
            const correctedContent = lines.join('\n');
            fs.writeFileSync(filePath, correctedContent, 'utf8');
            
            console.log(`   ✅ Successfully fixed ${path.basename(filePath)} (removed ${removedCount} incorrect sleeps)\n`);
            return true;
            
        } catch (error) {
            console.log(`   ❌ Error fixing ${path.basename(filePath)}:`, error.message);
            return false;
        }
    }

    /**
     * Upload a script to iPhone
     */
    async uploadScript(filePath) {
        try {
            const fileName = path.basename(filePath);
            console.log(`📤 Uploading: ${fileName}`);
            
            // Read and encode file (XXTouch uses base64)
            const fileContent = fs.readFileSync(filePath, 'utf8');
            const base64Content = Buffer.from(fileContent).toString('base64');

            const response = await axios.post(`${this.apiBase}/write_file`, {
                filename: `lua/scripts/${fileName}`,
                data: base64Content
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code === 0) {
                console.log(`   ✅ Upload successful: ${fileName}`);
                return true;
            } else {
                console.log(`   ❌ Upload failed: ${fileName} -`, response.data.message);
                return false;
            }

        } catch (error) {
            console.log(`   ❌ Upload error: ${path.basename(filePath)} -`, error.message);
            return false;
        }
    }

    /**
     * Fix all container scripts
     */
    async fixAllScripts() {
        console.log('🔧 Container Script Sleep Position Fixer');
        console.log('========================================\n');
        console.log('🎯 Goal: Move sys.msleep(2048) from BEFORE touch.off to AFTER touch.off\n');
        
        let fixedCount = 0;
        let uploadedCount = 0;
        
        console.log('🔧 Step 1: Fixing all scripts...\n');
        
        // First, fix all scripts
        for (const fileName of this.containerFiles) {
            const filePath = path.join(this.containerDir, fileName);
            
            if (fs.existsSync(filePath)) {
                const success = this.fixScript(filePath);
                if (success) fixedCount++;
            } else {
                console.log(`⚠️ File not found: ${fileName}\n`);
            }
        }
        
        console.log(`📊 Fixed ${fixedCount}/${this.containerFiles.length} scripts\n`);
        
        // Then upload all scripts
        console.log('📤 Step 2: Uploading all corrected scripts to iPhone...\n');
        
        for (const fileName of this.containerFiles) {
            const filePath = path.join(this.containerDir, fileName);
            
            if (fs.existsSync(filePath)) {
                const success = await this.uploadScript(filePath);
                if (success) uploadedCount++;
                
                // Small delay between uploads
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        console.log(`\n📊 Final Results:`);
        console.log(`   Fixed: ${fixedCount}/${this.containerFiles.length} scripts`);
        console.log(`   Uploaded: ${uploadedCount}/${this.containerFiles.length} scripts`);
        
        if (fixedCount === this.containerFiles.length && uploadedCount === this.containerFiles.length) {
            console.log('\n🎉 All scripts successfully fixed and uploaded!');
            console.log('📱 Sleep positioning corrected: sys.msleep(2048) now comes AFTER touch.off');
        } else {
            console.log('\n⚠️ Some scripts had issues. Check the log above for details.');
        }
    }

    /**
     * Preview what will be fixed
     */
    previewFixes() {
        console.log('👀 Preview of fixes to be made:\n');
        
        console.log('🔧 Fix: Remove sys.msleep(2048) that appears BEFORE touch.off');
        console.log('🔧 Fix: Add sys.msleep(2048) AFTER the last touch.off');
        console.log('');
        console.log('📝 Correct structure should be:');
        console.log('   touch.off(...)');
        console.log('   ');
        console.log('   sys.msleep(2048)');
        console.log('');
        
        console.log(`📁 Files to be fixed (${this.containerFiles.length} total):`);
        this.containerFiles.forEach((file, index) => {
            const filePath = path.join(this.containerDir, file);
            const exists = fs.existsSync(filePath) ? '✅' : '❌';
            console.log(`   ${index + 1}. ${exists} ${file}`);
        });
    }
}

// CLI Interface
async function main() {
    const fixer = new ContainerScriptFixer();
    const command = process.argv[2];

    if (!command) {
        console.log('🔧 Container Script Sleep Position Fixer');
        console.log('========================================\n');
        console.log('🔧 Usage:');
        console.log('  node scripts/api/fix_container_scripts.js preview');
        console.log('  node scripts/api/fix_container_scripts.js fix');
        console.log('');
        console.log('📝 Commands:');
        console.log('  preview  - Show what fixes will be made');
        console.log('  fix      - Fix all scripts and upload to iPhone');
        return;
    }

    try {
        switch (command) {
            case 'preview':
                fixer.previewFixes();
                break;

            case 'fix':
                await fixer.fixAllScripts();
                break;

            default:
                console.log('❌ Unknown command:', command);
                console.log('💡 Use: preview or fix');
                break;
        }
    } catch (error) {
        console.error('💥 Script fixing failed:', error.message);
    }
}

// Export for use as module
module.exports = ContainerScriptFixer;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 