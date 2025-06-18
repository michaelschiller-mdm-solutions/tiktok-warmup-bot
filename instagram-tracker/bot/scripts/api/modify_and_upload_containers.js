/**
 * Modify and Upload Open Container Scripts
 * 
 * This script modifies all open_container*.lua files to:
 * 1. Add HOME button sequence at line 24
 * 2. Add sys.msleep(2048) at the end of each script
 * 3. Upload all modified scripts to iPhone
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class ContainerScriptModifier {
    constructor() {
        this.apiBase = "http://192.168.178.65:46952";
        this.containerDir = './scripts/open_container/';
        
        // The HOME button sequence to add at line 24
        this.homeButtonSequence = `
sys.msleep(670)
key.down(12,64)
  -- HOMEBUTTON
key.up(12,64)
  -- HOMEBUTTON
`;

        // Final sleep to add before the last touch.off
        this.finalSleep = 'sys.msleep(2048)';
        
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
     * Modify a single container script
     */
    modifyScript(filePath) {
        try {
            console.log(`📝 Modifying: ${path.basename(filePath)}`);
            
            // Read the file
            const content = fs.readFileSync(filePath, 'utf8');
            const lines = content.split('\n');
            
            // Find line 24 (index 23) and insert HOME button sequence
            if (lines.length > 23) {
                // Insert the HOME button sequence after line 23 (which should be after existing HOME button code)
                lines.splice(24, 0, this.homeButtonSequence);
                console.log(`   ✅ Added HOME button sequence at line 24`);
            } else {
                console.log(`   ⚠️ File too short, cannot add at line 24`);
            }
            
            // Find the last touch.off and add sleep before it
            let lastTouchOffIndex = -1;
            for (let i = lines.length - 1; i >= 0; i--) {
                if (lines[i].includes('touch.off(')) {
                    lastTouchOffIndex = i;
                    break;
                }
            }
            
            if (lastTouchOffIndex !== -1) {
                // Insert the final sleep before the last touch.off
                lines.splice(lastTouchOffIndex, 0, this.finalSleep);
                console.log(`   ✅ Added final sleep before last touch.off`);
            } else {
                console.log(`   ⚠️ No touch.off found, adding sleep at end of actions function`);
                // Find the end of actions function and add there
                for (let i = lines.length - 1; i >= 0; i--) {
                    if (lines[i].includes('end') && i > 10) {
                        lines.splice(i, 0, this.finalSleep);
                        break;
                    }
                }
            }
            
            // Write the modified content back
            const modifiedContent = lines.join('\n');
            fs.writeFileSync(filePath, modifiedContent, 'utf8');
            
            console.log(`   ✅ Successfully modified ${path.basename(filePath)}\n`);
            return true;
            
        } catch (error) {
            console.log(`   ❌ Error modifying ${path.basename(filePath)}:`, error.message);
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
     * Process all container scripts
     */
    async processAllScripts() {
        console.log('🔧 Open Container Script Modifier & Uploader');
        console.log('============================================\n');
        
        let modifiedCount = 0;
        let uploadedCount = 0;
        
        console.log('📝 Step 1: Modifying all scripts...\n');
        
        // First, modify all scripts
        for (const fileName of this.containerFiles) {
            const filePath = path.join(this.containerDir, fileName);
            
            if (fs.existsSync(filePath)) {
                const success = this.modifyScript(filePath);
                if (success) modifiedCount++;
            } else {
                console.log(`⚠️ File not found: ${fileName}\n`);
            }
        }
        
        console.log(`📊 Modified ${modifiedCount}/${this.containerFiles.length} scripts\n`);
        
        // Then upload all scripts
        console.log('📤 Step 2: Uploading all scripts to iPhone...\n');
        
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
        console.log(`   Modified: ${modifiedCount}/${this.containerFiles.length} scripts`);
        console.log(`   Uploaded: ${uploadedCount}/${this.containerFiles.length} scripts`);
        
        if (modifiedCount === this.containerFiles.length && uploadedCount === this.containerFiles.length) {
            console.log('\n🎉 All scripts successfully modified and uploaded!');
            console.log('📱 All open_container scripts on iPhone have been updated');
        } else {
            console.log('\n⚠️ Some scripts had issues. Check the log above for details.');
        }
    }

    /**
     * Preview modifications without actually changing files
     */
    previewModifications() {
        console.log('👀 Preview of modifications to be made:\n');
        
        console.log('🔧 Modification 1: HOME button sequence at line 24:');
        console.log(this.homeButtonSequence);
        
        console.log('🔧 Modification 2: Final sleep before last touch.off:');
        console.log(this.finalSleep);
        
        console.log(`\n📁 Files to be modified (${this.containerFiles.length} total):`);
        this.containerFiles.forEach((file, index) => {
            const filePath = path.join(this.containerDir, file);
            const exists = fs.existsSync(filePath) ? '✅' : '❌';
            console.log(`   ${index + 1}. ${exists} ${file}`);
        });
    }
}

// CLI Interface
async function main() {
    const modifier = new ContainerScriptModifier();
    const command = process.argv[2];

    if (!command) {
        console.log('🔧 Open Container Script Modifier & Uploader');
        console.log('============================================\n');
        console.log('🔧 Usage:');
        console.log('  node scripts/api/modify_and_upload_containers.js preview');
        console.log('  node scripts/api/modify_and_upload_containers.js process');
        console.log('');
        console.log('📝 Commands:');
        console.log('  preview  - Show what modifications will be made');
        console.log('  process  - Modify all scripts and upload to iPhone');
        return;
    }

    try {
        switch (command) {
            case 'preview':
                modifier.previewModifications();
                break;

            case 'process':
                await modifier.processAllScripts();
                break;

            default:
                console.log('❌ Unknown command:', command);
                console.log('💡 Use: preview or process');
                break;
        }
    } catch (error) {
        console.error('💥 Script processing failed:', error.message);
    }
}

// Export for use as module
module.exports = ContainerScriptModifier;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 