/**
 * Enhanced iPhone Lua Script Runner with State Monitoring
 * 
 * This script uses the /is_running endpoint to monitor execution state
 * and attempts to find the missing execution trigger.
 * 
 * USAGE:
 * node scripts/api/enhanced_script_runner.js <script_name>
 * node scripts/api/enhanced_script_runner.js monitor
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class EnhancedScriptRunner {
    constructor() {
        this.apiBase = "http://192.168.178.65:46952";
    }

    async checkState() {
        try {
            const response = await axios.get(`${this.apiBase}/is_running`);
            
            // Handle different response formats
            if (typeof response.data === 'string') {
                return response.data.trim().toLowerCase();
            } else if (response.data && response.data.message) {
                // The current API returns success format, not state
                return 'unknown';
            }
            
            return 'unknown';
        } catch (error) {
            return 'error';
        }
    }

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
            return false;
        }
    }

    async tryExecutionEndpoints() {
        console.log('\n🔍 Testing execution endpoints...');
        
        const executionEndpoints = [
            // Common execution patterns
            { path: '/start', method: 'POST', body: {} },
            { path: '/run', method: 'POST', body: {} },
            { path: '/execute', method: 'POST', body: {} },
            { path: '/play', method: 'POST', body: {} },
            { path: '/trigger', method: 'POST', body: {} },
            
            // Script-specific patterns
            { path: '/start', method: 'GET' },
            { path: '/run', method: 'GET' },
            { path: '/execute', method: 'GET' },
            
            // State change triggers
            { path: '/is_running', method: 'POST', body: { action: 'start' } },
            { path: '/is_running', method: 'POST', body: { state: 'running' } },
            
            // Alternative patterns
            { path: '/script/start', method: 'POST', body: {} },
            { path: '/script/run', method: 'POST', body: {} },
            { path: '/api/start', method: 'POST', body: {} },
            { path: '/api/run', method: 'POST', body: {} }
        ];

        const results = [];
        
        for (const endpoint of executionEndpoints) {
            try {
                let response;
                
                if (endpoint.method === 'GET') {
                    response = await axios.get(`${this.apiBase}${endpoint.path}`);
                } else {
                    response = await axios.post(`${this.apiBase}${endpoint.path}`, endpoint.body || {});
                }
                
                console.log(`✅ ${endpoint.method} ${endpoint.path}: ${response.status} - ${JSON.stringify(response.data)}`);
                results.push({ endpoint, response: response.data, status: response.status });
                
            } catch (error) {
                if (error.response?.status !== 403) {
                    console.log(`🔍 ${endpoint.method} ${endpoint.path}: ${error.response?.status || error.code} - ${error.response?.data || error.message}`);
                    if (error.response?.status && error.response?.status !== 404) {
                        results.push({ endpoint, error: error.response.data, status: error.response.status });
                    }
                }
            }
        }
        
        return results;
    }

    async monitorStateChanges(duration = 30000) {
        console.log(`\n🔍 Monitoring state changes for ${duration/1000} seconds...`);
        console.log('📱 Manually interact with the iPhone automation app if possible');
        
        let lastState = await this.checkState();
        console.log(`📊 Initial state: ${lastState}`);
        
        const startTime = Date.now();
        const interval = 1000; // Check every second
        
        return new Promise((resolve) => {
            const monitor = setInterval(async () => {
                const currentState = await this.checkState();
                
                if (currentState !== lastState) {
                    console.log(`🔄 State changed: ${lastState} → ${currentState}`);
                    lastState = currentState;
                }
                
                if (Date.now() - startTime >= duration) {
                    clearInterval(monitor);
                    console.log(`📊 Final state: ${currentState}`);
                    resolve(currentState);
                }
            }, interval);
        });
    }

    async analyzeWebInterface() {
        console.log('\n🌐 Analyzing web interface...');
        
        try {
            const response = await axios.get(`${this.apiBase}/`);
            const html = response.data;
            
            console.log('📄 Web interface HTML:');
            console.log(html);
            
            // Look for script control endpoints in HTML
            const endpoints = html.match(/\/[a-zA-Z_][a-zA-Z0-9_]*(?:\.html|\.js)?/g) || [];
            console.log('\n🔗 Found potential endpoints:');
            endpoints.forEach(ep => console.log(`  ${ep}`));
            
            // Look for JavaScript files
            const jsFiles = html.match(/src="[^"]*\.js"/g) || [];
            console.log('\n📜 Found JavaScript files:');
            jsFiles.forEach(js => console.log(`  ${js}`));
            
            return { html, endpoints, jsFiles };
            
        } catch (error) {
            console.log('❌ Web interface analysis failed:', error.message);
            return null;
        }
    }

    async testScriptWithMonitoring(scriptName) {
        console.log(`\n🎯 Testing script execution with state monitoring: ${scriptName}`);
        
        // Step 1: Check initial state
        const initialState = await this.checkState();
        console.log(`📊 Initial state: ${initialState}`);
        
        // Step 2: Select script
        const selected = await this.selectScript(scriptName);
        if (!selected) {
            return false;
        }
        
        // Step 3: Check state after selection
        const selectedState = await this.checkState();
        console.log(`📊 State after selection: ${selectedState}`);
        
        // Step 4: Try execution endpoints
        const executionResults = await this.tryExecutionEndpoints();
        
        // Step 5: Monitor for state changes
        await this.monitorStateChanges(10000);
        
        // Step 6: Analyze results
        console.log('\n📋 Execution attempt summary:');
        console.log(`   Initial state: ${initialState}`);
        console.log(`   After selection: ${selectedState}`);
        console.log(`   Execution endpoints tested: ${executionResults.length}`);
        console.log(`   Successful responses: ${executionResults.filter(r => r.response).length}`);
        
        return executionResults;
    }
}

// CLI Interface
async function main() {
    const runner = new EnhancedScriptRunner();
    const command = process.argv[2];
    
    if (!command) {
        console.log('📱 Enhanced iPhone Lua Script Runner');
        console.log('===================================');
        console.log('');
        console.log('🔧 Usage:');
        console.log('  node scripts/api/enhanced_script_runner.js <script_name>');
        console.log('  node scripts/api/enhanced_script_runner.js monitor');
        console.log('  node scripts/api/enhanced_script_runner.js analyze');
        console.log('  node scripts/api/enhanced_script_runner.js test');
        console.log('');
        console.log('📝 Examples:');
        console.log('  node scripts/api/enhanced_script_runner.js open_container6.lua');
        console.log('  node scripts/api/enhanced_script_runner.js monitor');
        return;
    }

    try {
        switch (command) {
            case 'monitor':
                console.log('🔍 Starting state monitoring...');
                await runner.monitorStateChanges(60000); // Monitor for 1 minute
                break;
                
            case 'analyze':
                console.log('🌐 Analyzing web interface...');
                await runner.analyzeWebInterface();
                break;
                
            case 'test':
                console.log('🧪 Testing execution endpoints...');
                await runner.tryExecutionEndpoints();
                break;
                
            default:
                // Assume it's a script name
                console.log(`🎯 Running enhanced script test: ${command}`);
                await runner.testScriptWithMonitoring(command);
                break;
        }
    } catch (error) {
        console.error('💥 Enhanced script runner failed:', error.message);
    }
}

// Export for use as module
module.exports = EnhancedScriptRunner;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 