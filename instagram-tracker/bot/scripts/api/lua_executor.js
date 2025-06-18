/**
 * iPhone Lua Script Executor via SSH
 * 
 * Executes Lua scripts directly on the iPhone using SSH and the lua interpreter
 * This bypasses any API limitations and runs scripts in interpreter mode
 * 
 * Script Execution Methods:
 * 1. Direct execution: lua /path/to/script.lua
 * 2. Executable script: /path/to/script.lua (with shebang)
 * 3. System script: script.lua (if in /usr/local/bin)
 * 
 * USAGE:
 * node scripts/api/lua_executor.js [script_name]
 * 
 * Examples:
 * node scripts/api/lua_executor.js open_container6.lua
 * node scripts/api/lua_executor.js upload_story_newest_media_no_caption.lua
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class LuaScriptExecutor {
    constructor() {
        this.phoneIP = "192.168.178.65";
        this.mobileUser = "mobile";
        this.mobilePassword = "qwertzuio";
        this.remoteScriptPath = "/var/mobile/Media/1ferver/lua/scripts";
        
        this.scriptDirectories = {
            'iphone_lua': path.join(__dirname, '..', 'iphone_lua'),
            'open_container': path.join(__dirname, '..', 'open_container'),
            'instagram': path.join(__dirname, '..', 'instagram')
        };
    }

    /**
     * Execute SSH command on iPhone
     */
    async executeSSH(command) {
        return new Promise((resolve, reject) => {
            console.log(`🔗 SSH Command: ${command}`);
            
            const plinkCommand = `plink -ssh -batch -l ${this.mobileUser} -pw ${this.mobilePassword} ${this.phoneIP} "${command}"`;
            
            exec(plinkCommand, (error, stdout, stderr) => {
                if (error) {
                    console.log(`❌ SSH Error: ${error.message}`);
                    reject(error);
                    return;
                }
                
                if (stderr && !stderr.includes('Keyboard-interactive')) {
                    console.log(`⚠️ SSH stderr: ${stderr}`);
                }
                
                const output = stdout.trim();
                console.log(`✅ SSH Output: ${output || '(no output)'}`);
                resolve(output);
            });
        });
    }

    /**
     * Get list of available scripts from all directories
     */
    getAvailableScripts() {
        const allScripts = [];
        
        Object.entries(this.scriptDirectories).forEach(([dirName, dirPath]) => {
            try {
                if (fs.existsSync(dirPath)) {
                    const files = fs.readdirSync(dirPath);
                    const luaFiles = files.filter(file => 
                        file.endsWith('.lua') || file.endsWith('.xxt')
                    );
                    
                    luaFiles.forEach(file => {
                        allScripts.push({
                            filename: file,
                            directory: dirName,
                            fullPath: path.join(dirPath, file)
                        });
                    });
                }
            } catch (error) {
                console.error(`❌ Error reading ${dirName} directory:`, error.message);
            }
        });
        
        return allScripts.sort((a, b) => a.filename.localeCompare(b.filename));
    }

    /**
     * Display available scripts
     */
    displayAvailableScripts() {
        const scripts = this.getAvailableScripts();
        
        if (scripts.length === 0) {
            console.log('❌ No Lua scripts found');
            return;
        }

        console.log('🔧 Available Lua Scripts for Direct Execution:');
        console.log('==============================================');
        
        // Group by directory
        const scriptsByDir = {};
        scripts.forEach(script => {
            if (!scriptsByDir[script.directory]) {
                scriptsByDir[script.directory] = [];
            }
            scriptsByDir[script.directory].push(script);
        });

        Object.entries(scriptsByDir).forEach(([dirName, dirScripts]) => {
            console.log(`\n📁 ${dirName.toUpperCase()} (${dirScripts.length} scripts):`);
            dirScripts.forEach((script, index) => {
                console.log(`   ${index + 1}. ${script.filename}`);
            });
        });

        console.log(`\n📊 Total scripts: ${scripts.length}`);
        console.log('💡 Usage: node scripts/api/lua_executor.js <script_name>');
        console.log('🔧 Executes using: lua /var/mobile/Media/1ferver/lua/scripts/<script_name>');
    }

    /**
     * Check if script exists on iPhone
     */
    async checkScriptExists(scriptName) {
        try {
            const remotePath = `${this.remoteScriptPath}/${scriptName}`;
            const checkCommand = `test -f "${remotePath}" && echo "EXISTS" || echo "NOT_FOUND"`;
            const result = await this.executeSSH(checkCommand);
            return result.includes('EXISTS');
        } catch (error) {
            console.log(`⚠️ Could not check if script exists: ${error.message}`);
            return false;
        }
    }

    /**
     * Execute Lua script directly using lua interpreter
     */
    async executeLuaScript(scriptName) {
        try {
            // Find script locally first
            const scripts = this.getAvailableScripts();
            const targetScript = scripts.find(script => script.filename === scriptName);
            
            if (!targetScript) {
                console.error(`❌ Script not found locally: ${scriptName}`);
                console.log('\n📝 Available scripts:');
                this.displayAvailableScripts();
                return false;
            }

            console.log(`📂 Found locally in: ${targetScript.directory}`);
            console.log(`🚀 Executing Lua script: ${scriptName}`);

            // Check if script exists on iPhone
            const remotePath = `${this.remoteScriptPath}/${scriptName}`;
            console.log(`📱 Remote path: ${remotePath}`);

            const scriptExists = await this.checkScriptExists(scriptName);
            if (!scriptExists) {
                console.error(`❌ Script not found on iPhone: ${remotePath}`);
                console.log('💡 Make sure the script is uploaded to the iPhone first');
                return false;
            }

            console.log('✅ Script found on iPhone');

            // Method 1: Try direct lua execution
            console.log('🔧 Method 1: Direct lua interpreter execution...');
            try {
                const luaCommand = `cd "${this.remoteScriptPath}" && lua "${scriptName}"`;
                const result = await this.executeSSH(luaCommand);
                
                console.log('✅ Script executed successfully with lua interpreter');
                console.log('📝 Script output:', result || '(no output)');
                return true;
                
            } catch (error) {
                console.log('⚠️ Direct lua execution failed, trying alternative method...');
            }

            // Method 2: Try making script executable and running directly
            console.log('🔧 Method 2: Making script executable...');
            try {
                // Make script executable
                await this.executeSSH(`chmod +x "${remotePath}"`);
                
                // Try running directly
                const directCommand = `cd "${this.remoteScriptPath}" && "./${scriptName}"`;
                const result = await this.executeSSH(directCommand);
                
                console.log('✅ Script executed successfully as executable');
                console.log('📝 Script output:', result || '(no output)');
                return true;
                
            } catch (error) {
                console.log('⚠️ Executable method failed');
            }

            // Method 3: Try with full path
            console.log('🔧 Method 3: Full path execution...');
            try {
                const fullPathCommand = `lua "${remotePath}"`;
                const result = await this.executeSSH(fullPathCommand);
                
                console.log('✅ Script executed successfully with full path');
                console.log('📝 Script output:', result || '(no output)');
                return true;
                
            } catch (error) {
                console.log('❌ All execution methods failed');
                console.error('💥 Final error:', error.message);
                return false;
            }

        } catch (error) {
            console.error('💥 Lua script execution error:', error.message);
            return false;
        }
    }

    /**
     * Test SSH connectivity
     */
    async testConnection() {
        console.log('🔍 Testing SSH connection to iPhone...');
        
        try {
            const result = await this.executeSSH('echo "SSH Connection Test"');
            console.log('✅ SSH connection successful');
            return true;
        } catch (error) {
            console.error('❌ SSH connection failed:', error.message);
            console.log('\n🔧 Troubleshooting:');
            console.log('1. Check iPhone IP address');
            console.log('2. Ensure SSH is enabled on iPhone');
            console.log('3. Verify credentials are correct');
            console.log('4. Make sure plink is installed (part of PuTTY)');
            return false;
        }
    }

    /**
     * List scripts on iPhone
     */
    async listRemoteScripts() {
        console.log('📱 Checking scripts on iPhone...');
        
        try {
            const listCommand = `ls -la "${this.remoteScriptPath}/"`;
            const result = await this.executeSSH(listCommand);
            
            console.log('📁 Scripts on iPhone:');
            console.log('=====================');
            console.log(result);
            
            return true;
        } catch (error) {
            console.error('❌ Could not list remote scripts:', error.message);
            return false;
        }
    }
}

// Main execution
async function main() {
    const executor = new LuaScriptExecutor();
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // No arguments - show available scripts
        executor.displayAvailableScripts();
        return;
    }

    const command = args[0];
    
    // Special commands
    switch (command) {
        case 'test':
        case '--test':
        case '-t':
            await executor.testConnection();
            break;
            
        case 'list-remote':
        case '--list-remote':
        case '-r':
            await executor.listRemoteScripts();
            break;
            
        case 'list':
        case '--list':
        case '-l':
            executor.displayAvailableScripts();
            break;
            
        default:
            // Execute the specified script
            if (command.endsWith('.lua') || command.endsWith('.xxt')) {
                console.log('🔧 Direct Lua Script Execution');
                console.log('==============================');
                
                const success = await executor.executeLuaScript(command);
                
                if (success) {
                    console.log('\n🎉 Lua script execution completed!');
                    console.log('📱 Check your iPhone for the results');
                } else {
                    console.log('\n💥 Lua script execution failed');
                    process.exit(1);
                }
            } else {
                console.log('❌ Invalid script name. Must end with .lua or .xxt');
                executor.displayAvailableScripts();
                process.exit(1);
            }
            break;
    }
}

// Export for use as module
module.exports = LuaScriptExecutor;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 