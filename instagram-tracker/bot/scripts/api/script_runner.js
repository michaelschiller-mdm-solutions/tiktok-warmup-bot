/**
 * iPhone Lua Script Runner for XXTouch Framework
 * 
 * This script connects to the XXTouch automation framework running on iPhone
 * and executes Lua automation scripts for Instagram and other tasks.
 * 
 * Workflow:
 * 1. Select script with /select_script_file
 * 2. Launch script with /launch_script_file
 * 
 * USAGE:
 * node scripts/api/script_runner.js <script_name>
 * node scripts/api/script_runner.js list
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class iPhoneScriptRunner {
    constructor() {
        this.apiBase = "http://192.168.178.65:46952";
        this.localScriptDirs = {
            iphone_lua: './scripts/iphone_lua/',
            open_container: './scripts/open_container/',  
            instagram: './scripts/instagram/'
        };
    }

    /**
     * List all available scripts
     */
    listScripts() {
        console.log('📱 Available iPhone Lua Scripts:');
        console.log('================================\n');

        let totalScripts = 0;

        Object.entries(this.localScriptDirs).forEach(([dirName, dirPath]) => {
            if (fs.existsSync(dirPath)) {
                const files = fs.readdirSync(dirPath)
                    .filter(file => file.endsWith('.lua'))
                    .sort();

                if (files.length > 0) {
                    console.log(`📁 ${dirName.toUpperCase()} (${files.length} scripts):`);
                    files.forEach((file, index) => {
                        console.log(`   ${index + 1}. ${file}`);
                    });
                    console.log('');
                    totalScripts += files.length;
                }
            }
        });

        console.log(`💡 Usage: node scripts/api/script_runner.js <script_name>`);
        console.log(`   Example: node scripts/api/script_runner.js open_container6.lua`);
        console.log(`📊 Total scripts available: ${totalScripts}`);
    }

    /**
     * Find script in local directories
     */
    findScript(scriptName) {
        for (const [dirName, dirPath] of Object.entries(this.localScriptDirs)) {
            if (fs.existsSync(dirPath)) {
                const scriptPath = path.join(dirPath, scriptName);
                if (fs.existsSync(scriptPath)) {
                    return {
                        found: true,
                        directory: dirName,
                        localPath: scriptPath,
                        remotePath: `/var/mobile/Media/1ferver/lua/scripts/${scriptName}`
                    };
                }
            }
        }
        return { found: false };
    }

    /**
     * Select script on iPhone
     */
    async selectScript(scriptName) {
        try {
            console.log(`📱 Selecting script: ${scriptName}`);
            
            const response = await axios.post(`${this.apiBase}/select_script_file`, {
                filename: scriptName
            });

            if (response.data.code === 0) {
                console.log('✅ Script selected successfully');
                return true;
            } else {
                console.log('❌ Script selection failed:', response.data.message);
                return false;
            }
        } catch (error) {
            console.log('❌ Script selection error:', error.message);
            if (error.response) {
                console.log('📊 Status:', error.response.status);
                console.log('📋 Response:', error.response.data);
            }
            return false;
        }
    }

    /**
     * Launch script on iPhone
     */
    async launchScript() {
        try {
            console.log(`🚀 Launching script...`);
            
            const response = await axios.post(`${this.apiBase}/launch_script_file`, '');

            if (response.data.code === 0) {
                console.log('✅ Script launched successfully');
                console.log('📝 Response:', response.data.message);
                return true;
            } else if (response.data.code === 2) {
                console.log('❌ Script has syntax errors:', response.data.detail || response.data.message);
                return false;
            } else {
                console.log('❌ Script launch failed:', response.data.message);
                return false;
            }
        } catch (error) {
            console.log('❌ Script launch error:', error.message);
            if (error.response) {
                console.log('📊 Status:', error.response.status);
                console.log('📋 Response:', error.response.data);
            }
            return false;
        }
    }

    /**
     * Execute script (select + launch)
     */
    async executeScript(scriptName) {
        console.log(`🎯 Executing script: ${scriptName}`);
        console.log('================================\n');

        // Step 1: Find script locally
        const scriptInfo = this.findScript(scriptName);
        
        if (!scriptInfo.found) {
            console.log(`❌ Script "${scriptName}" not found in local directories`);
            console.log('📁 Available directories:', Object.keys(this.localScriptDirs).join(', '));
            return false;
        }

        console.log(`📂 Found in directory: ${scriptInfo.directory}`);
        console.log(`📂 Remote path: ${scriptInfo.remotePath}`);

        // Step 2: Select script on iPhone
        const selected = await this.selectScript(scriptName);
        if (!selected) {
            return false;
        }

        // Step 3: Launch script on iPhone  
        const launched = await this.launchScript();
        if (!launched) {
            return false;
        }

        console.log('\n🎉 Script execution completed successfully!');
        console.log('📱 Check your iPhone for the results');
        return true;
    }

    /**
     * Check script execution status
     */
    async checkStatus() {
        try {
            const response = await axios.get(`${this.apiBase}/is_running`);
            
            // Handle different response formats
            if (typeof response.data === 'string') {
                return response.data.trim().toLowerCase();
            } else if (response.data && response.data.message) {
                return 'api_response';
            }
            
            return 'unknown';
        } catch (error) {
            return 'error';
        }
    }

    /**
     * Monitor script execution
     */
    async monitorExecution(duration = 30000) {
        console.log(`\n🔍 Monitoring script execution for ${duration/1000} seconds...`);
        
        let lastStatus = await this.checkStatus();
        console.log(`📊 Initial status: ${lastStatus}`);
        
        const startTime = Date.now();
        const interval = 2000; // Check every 2 seconds
        
        return new Promise((resolve) => {
            const monitor = setInterval(async () => {
                const currentStatus = await this.checkStatus();
                
                if (currentStatus !== lastStatus) {
                    console.log(`🔄 Status changed: ${lastStatus} → ${currentStatus}`);
                    lastStatus = currentStatus;
                }
                
                if (Date.now() - startTime >= duration) {
                    clearInterval(monitor);
                    console.log(`📊 Final status: ${currentStatus}`);
                    resolve(currentStatus);
                }
            }, interval);
        });
    }

    async findLogEndpoint() {
        const endpoints = ['get_log_text', 'getlog', 'log', 'logs', 'get_log'];
        console.log('\n🔍 Finding the correct log endpoint...');
        for (const endpoint of endpoints) {
            try {
                process.stdout.write(`   Trying /${endpoint}... `);
                const response = await axios.get(`${this.apiBase}/${endpoint}`, { timeout: 3000 });
                if (response.status === 200) {
                    console.log('✅ Found!');
                    return endpoint;
                }
            } catch (error) {
                // Ignore errors (like 404), we only care about success
                console.log('❌');
            }
        }
        console.log('\n❌ Could not find a valid log endpoint.');
        return null;
    }

    async getLogs() {
        try {
            console.log(`\n📄 Fetching XXTouch logs...`);
            const response = await axios.get(`${this.apiBase}/get_log_text`);
            
            if (response.data) {
                console.log('==================== LOGS START ====================');
                console.log(response.data);
                console.log('===================== LOGS END =====================');
                return true;
            } else {
                console.log('❌ No log data returned.');
                return false;
            }
        } catch (error) {
            console.log('❌ Failed to fetch logs:', error.message);
            return false;
        }
    }
}

// CLI Interface
async function main() {
    const runner = new iPhoneScriptRunner();
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        runner.listScripts();
        return;
    }

    const command = args[0];
    
    // Handle special commands
    if (command === 'list') {
        runner.listScripts();
    } else if (command === 'logs' || command === 'log') {
        await runner.getLogs();
    } else if (command === 'find-log') {
        const endpoint = await runner.findLogEndpoint();
        if (endpoint) {
            console.log(`\n💡 The correct log endpoint is: /${endpoint}`);
            console.log(`💡 Update the 'getLogs' function in the script to use it.`);
        }
    } else if (command.endsWith('.lua')) {
        await runner.executeScript(command);
        await runner.monitorExecution(10000); // Monitor for 10 seconds
    } else {
        console.log(`❌ Invalid command or script name: ${command}`);
        console.log('💡 Try "list" to see available scripts or provide a valid .lua file.');
    }
}

// Export for use as module
module.exports = iPhoneScriptRunner;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 