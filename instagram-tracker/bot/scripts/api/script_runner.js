/**
 * XXTouch Elite Script Runner
 * 
 * This script executes Lua automation scripts on the iPhone via XXTouch Elite API.
 * Use this to run your recorded Instagram automation scripts.
 * 
 * USAGE:
 * node scripts/api/script_runner.js "script_name.lua" [iPhone_IP:PORT]
 * 
 * EXAMPLES:
 * node scripts/api/script_runner.js "change_pfp_to_newest_picture.lua"
 * node scripts/api/script_runner.js "upload_post_newest_media_clipboard_caption.lua" http://192.168.1.100:46952
 * 
 * WORKFLOW:
 * 1. Prepare data (clipboard text, upload images)
 * 2. Run this script to execute Lua automation
 * 3. Script will perform Instagram actions automatically
 * 4. Check result and handle any errors
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ScriptRunner {
    constructor(baseUrl = 'http://127.0.0.1:46952') {
        this.baseUrl = baseUrl;
    }

    /**
     * Execute a Lua script on iPhone
     * @param {string} scriptPath - Path to Lua script file
     * @returns {Promise<Object>} Execution result
     */
    async runScript(scriptPath) {
        try {
            const scriptName = path.basename(scriptPath);
            console.log(`🚀 Executing Lua script: ${scriptName}`);
            console.log(`Path: ${scriptPath}`);
            
            // Check if script file exists
            if (!fs.existsSync(scriptPath)) {
                throw new Error(`Script file not found: ${scriptPath}`);
            }

            // Read script content
            const scriptContent = fs.readFileSync(scriptPath, 'utf8');
            console.log(`📄 Script size: ${scriptContent.length} characters`);
            
            // Execute script via API
            const response = await axios.post(
                `${this.baseUrl}/run`,
                {
                    script: scriptContent
                },
                {
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    timeout: 60000 // 1 minute timeout for script execution
                }
            );
            
            console.log('✅ Script executed successfully!');
            console.log(`Response: ${JSON.stringify(response.data)}`);
            
            return {
                success: true,
                data: response.data,
                scriptName: scriptName,
                scriptPath: scriptPath
            };
            
        } catch (error) {
            console.error('❌ Script execution failed:', error.message);
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error(`Response: ${JSON.stringify(error.response.data)}`);
            }
            
            return {
                success: false,
                error: error.message,
                scriptName: path.basename(scriptPath),
                scriptPath: scriptPath
            };
        }
    }

    /**
     * List available Lua scripts
     */
    listAvailableScripts() {
        const scriptsDir = path.join(__dirname, '..', 'iphone_lua');
        
        if (!fs.existsSync(scriptsDir)) {
            console.log('⚠️ iphone_lua directory not found');
            return [];
        }
        
        const scripts = fs.readdirSync(scriptsDir)
            .filter(file => file.endsWith('.lua'))
            .sort();
            
        return scripts;
    }

    /**
     * Get script categories for organization
     */
    categorizeScripts(scripts) {
        const categories = {
            profile: [],
            posting: [],
            stories: [],
            highlights: [],
            other: []
        };
        
        scripts.forEach(script => {
            const name = script.toLowerCase();
            
            if (name.includes('bio') || name.includes('name') || name.includes('pfp') || name.includes('gender') || name.includes('username')) {
                categories.profile.push(script);
            } else if (name.includes('post')) {
                categories.posting.push(script);
            } else if (name.includes('story')) {
                categories.stories.push(script);
            } else if (name.includes('highlight')) {
                categories.highlights.push(script);
            } else {
                categories.other.push(script);
            }
        });
        
        return categories;
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('❌ Error: No script specified');
        console.log('\n📖 USAGE:');
        console.log('node scripts/api/script_runner.js "script_name.lua" [iPhone_IP:PORT]');
        
        // Show available scripts
        const runner = new ScriptRunner();
        const scripts = runner.listAvailableScripts();
        
        if (scripts.length > 0) {
            console.log('\n📜 Available Scripts:');
            console.log('='.repeat(50));
            
            const categories = runner.categorizeScripts(scripts);
            
            Object.entries(categories).forEach(([category, categoryScripts]) => {
                if (categoryScripts.length > 0) {
                    console.log(`\n${category.toUpperCase()}:`);
                    categoryScripts.forEach(script => {
                        console.log(`  • ${script}`);
                    });
                }
            });
        }
        
        process.exit(1);
    }
    
    const scriptName = args[0];
    const baseUrl = args[1] || 'http://127.0.0.1:46952';
    
    // Resolve script path
    const scriptPath = path.resolve(
        path.join(__dirname, '..', 'iphone_lua', scriptName)
    );
    
    console.log('🤖 XXTouch Elite Script Runner');
    console.log('=============================');
    console.log(`📱 iPhone: ${baseUrl}`);
    console.log(`📜 Script: ${scriptName}`);
    console.log('');
    
    const runner = new ScriptRunner(baseUrl);
    const result = await runner.runScript(scriptPath);
    
    if (result.success) {
        console.log('\n🎉 SUCCESS!');
        console.log(`📜 Script "${result.scriptName}" executed successfully`);
        console.log('\n📱 Check your iPhone to see the automation results');
    } else {
        console.log('\n💥 FAILED!');
        console.log(`Error: ${result.error}`);
        console.log(`Script: ${result.scriptName}`);
        process.exit(1);
    }
}

// Export for use as module
module.exports = ScriptRunner;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 