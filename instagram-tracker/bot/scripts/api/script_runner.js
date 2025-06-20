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

const LOCK_FILE_PATH = path.join(__dirname, '.iphone_global.lock');

class iPhoneScriptRunner {
    constructor(iphoneUrl = "http://192.168.178.65:46952") {
        this.apiBase = iphoneUrl;
        const SCRIPT_ROOT = path.join(__dirname, '..'); // Resolves to /bot/scripts
        this.localScriptDirs = {
            iphone_lua: path.join(SCRIPT_ROOT, 'iphone_lua'),
            open_container: path.join(SCRIPT_ROOT, 'open_container'),  
            instagram: path.join(SCRIPT_ROOT, 'instagram'),
            container_creation: path.join(SCRIPT_ROOT, 'container_creation')
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
     * Stop the currently running script on iPhone
     */
    async stopScript() {
        try {
            console.log('🛑 Stopping any currently running script...');
            await axios.post(`${this.apiBase}/stop_script_file`, '');
            console.log('✅ Script stopped.');
            return true;
        } catch (error) {
            console.log('⚠️  Could not stop script (might not be running):', error.message);
            return false;
        }
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
     * Execute script (select + launch) with locking mechanism
     */
    async executeScript(scriptName) {
        // --- Self-healing Lock Mechanism ---
        if (fs.existsSync(LOCK_FILE_PATH)) {
            const lockData = fs.readFileSync(LOCK_FILE_PATH, 'utf8');
            const [pid] = (lockData || '').split('|');

            if (pid) {
                let isStale = false;
                try {
                    // Check if process is still running. process.kill with signal 0 doesn't kill
                    // the process, but throws an error if it doesn't exist.
                    process.kill(parseInt(pid), 0);
                } catch (e) {
                    // ESRCH means the process doesn't exist, so the lock is stale.
                    if (e.code === 'ESRCH') {
                        console.log('⚠️  Found stale lock file from a non-existent process. Removing it.');
                        isStale = true;
                        fs.unlinkSync(LOCK_FILE_PATH); // Clean up stale lock
                    }
                }

                if (!isStale) {
                    console.error(`❌ Error: A script (PID: ${pid}) is already running. Please wait.`);
                    return false;
                }
            }
        }

        try {
            // Create lock file with current process's PID
            const pid = process.pid;
            fs.writeFileSync(LOCK_FILE_PATH, `${pid}|${new Date().toISOString()}`);

            console.log(`🎯 Executing script: ${scriptName}`);
            console.log('================================\\n');

            // Stop any orphaned script before starting a new one.
            await this.stopScript();

            // Step 1: Find script locally
            const scriptInfo = this.findScript(scriptName);
            
            if (!scriptInfo.found) {
                console.log(`❌ Script "${scriptName}" not found in local directories`);
                console.log('📁 Available directories:', Object.keys(this.localScriptDirs).join(', '));
                return false;
            }

            console.log(`📂 Found in directory: ${scriptInfo.directory}`);

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

            console.log(`\n🎉 Script execution completed successfully!`);
            console.log('📱 Check your iPhone for the results');
            return true;

        } catch (error) {
            console.error(`💥 An unexpected error occurred during execution of ${scriptName}:`, error.message);
            return false;
        } finally {
            // --- Unlock Mechanism ---
            // Only remove the lock if it was created by *this* process
            if (fs.existsSync(LOCK_FILE_PATH)) {
                const lockData = fs.readFileSync(LOCK_FILE_PATH, 'utf8');
                const [pidFromFile] = (lockData || '').split('|');
                
                if (pidFromFile == process.pid.toString()) {
                    fs.unlinkSync(LOCK_FILE_PATH);
                }
            }
        }
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
    const args = process.argv.slice(2);
    const scriptName = args[0];
    const iphoneUrl = args[1]; // Optional iPhone URL

    if (!scriptName) {
        console.log('❌ Missing script name');
        console.log('💡 Usage: node scripts/api/script_runner.js <script_name> [iphone_url]');
        const runner = new iPhoneScriptRunner();
        runner.listScripts();
        return;
    }

    if (scriptName === 'list') {
        const runner = new iPhoneScriptRunner();
        runner.listScripts();
        return;
    }

    const runner = new iPhoneScriptRunner(iphoneUrl);
    
    // Execute the script
    const success = await runner.executeScript(scriptName);

    if (success) {
        // Monitor for a few seconds to see if it completes
        await runner.monitorExecution(5000);
    }
}

main();

// Export for use as module
module.exports = iPhoneScriptRunner;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 