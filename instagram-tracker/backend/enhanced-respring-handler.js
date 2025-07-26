/**
 * Enhanced respring handler with Photos app readiness check
 */

const AutomationBridge = require('../bot/services/AutomationBridge');
const { exec } = require('child_process');

class EnhancedRespringHandler {
    constructor(iphoneIP = '192.168.178.65', iphonePort = 46952) {
        this.iphoneIP = iphoneIP;
        this.iphonePort = iphonePort;
        this.mobileUser = "mobile";
        this.mobilePassword = "qwertzuio";
        
        this.bridge = new AutomationBridge({
            iphoneIP: this.iphoneIP,
            iphonePort: this.iphonePort
        });
    }

    async executeSSH(command) {
        return new Promise((resolve, reject) => {
            const plinkCommand = `plink -ssh -batch -l ${this.mobileUser} -pw ${this.mobilePassword} ${this.iphoneIP} "${command}"`;
            
            exec(plinkCommand, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(stdout.trim());
            });
        });
    }

    async checkPhotosDatabase() {
        try {
            const dbExists = await this.executeSSH('ls -la /var/mobile/Media/PhotoData/Photos.sqlite 2>/dev/null || echo "NOT_FOUND"');
            return !dbExists.includes('NOT_FOUND');
        } catch (error) {
            return false;
        }
    }

    async checkPhotosProcesses() {
        try {
            const processes = ['photoanalysisd', 'photolibraryd', 'mediaserverd'];
            let runningCount = 0;
            
            for (const process of processes) {
                try {
                    const result = await this.executeSSH(`ps aux | grep ${process} | grep -v grep || echo "NOT_RUNNING"`);
                    if (!result.includes('NOT_RUNNING')) {
                        runningCount++;
                    }
                } catch (error) {
                    // Ignore individual process check errors
                }
            }
            
            return runningCount >= 2; // At least 2 of 3 processes should be running
        } catch (error) {
            return false;
        }
    }

    async waitForPhotosReadiness(maxWaitTime = 120000) { // 2 minutes max
        console.log('📱 Waiting for Photos app to be ready...');
        const startTime = Date.now();
        const checkInterval = 10000; // Check every 10 seconds
        
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const dbReady = await this.checkPhotosDatabase();
                const processesReady = await this.checkPhotosProcesses();
                
                console.log(`   Database: ${dbReady ? '✅' : '❌'} | Processes: ${processesReady ? '✅' : '❌'}`);
                
                if (dbReady && processesReady) {
                    console.log('✅ Photos app appears to be ready');
                    return true;
                }
                
                console.log(`   Waiting ${checkInterval/1000}s before next check...`);
                await new Promise(resolve => setTimeout(resolve, checkInterval));
                
            } catch (error) {
                console.log(`   Check failed: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, checkInterval));
            }
        }
        
        console.log('⚠️ Photos app readiness check timed out, but continuing...');
        return false;
    }

    async handleRespring() {
        console.log('🔄 Starting enhanced respring handling...');
        
        try {
            // Step 1: Wait for respring to complete
            console.log('⏳ Waiting 15 seconds for iPhone respring to complete...');
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            // Step 2: Execute wake_up.lua
            console.log('📱 Executing wake_up.lua to wake up iPhone...');
            const wakeUpResult = await Promise.race([
                this.bridge.executeScript('wake_up.lua', {
                    timeout: 15000,
                    retries: 2
                }),
                new Promise(resolve => setTimeout(() => resolve(false), 20000))
            ]);
            
            if (wakeUpResult) {
                console.log('✅ iPhone wake-up completed successfully');
            } else {
                console.warn('⚠️ iPhone wake-up may have failed, but continuing...');
            }
            
            // Step 3: Wait for Photos app readiness
            const photosReady = await this.waitForPhotosReadiness(60000); // 1 minute max
            
            // Step 4: Final stabilization wait
            console.log('⏳ Final stabilization wait (5 seconds)...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            console.log('✅ Enhanced respring handling completed');
            return {
                success: true,
                wakeUpSuccessful: wakeUpResult,
                photosReady: photosReady
            };
            
        } catch (error) {
            console.error('❌ Enhanced respring handling failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async restartPhotosServices() {
        console.log('🔄 Restarting Photos services...');
        
        try {
            // Kill photo processes
            await this.executeSSH('killall -9 photoanalysisd photolibraryd Photos mediaserverd 2>/dev/null || true');
            
            // Wait for automatic restart
            console.log('⏳ Waiting 15 seconds for services to restart...');
            await new Promise(resolve => setTimeout(resolve, 15000));
            
            // Check if services restarted
            const processesReady = await this.checkPhotosProcesses();
            
            if (processesReady) {
                console.log('✅ Photos services restarted successfully');
                return true;
            } else {
                console.log('⚠️ Photos services may not have restarted properly');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Failed to restart Photos services:', error.message);
            return false;
        }
    }
}

// Test function
async function testEnhancedRespringHandler() {
    console.log('🧪 Testing Enhanced Respring Handler...\n');
    
    const handler = new EnhancedRespringHandler();
    
    // Test Photos readiness check
    console.log('1. Testing Photos readiness check...');
    const photosReady = await handler.waitForPhotosReadiness(30000); // 30 seconds max for test
    console.log(`   Result: ${photosReady ? 'Ready' : 'Not ready'}\n`);
    
    // Test service restart
    console.log('2. Testing Photos services restart...');
    const servicesRestarted = await handler.restartPhotosServices();
    console.log(`   Result: ${servicesRestarted ? 'Success' : 'Failed'}\n`);
    
    console.log('🧪 Test completed');
}

// Export for use as module
module.exports = EnhancedRespringHandler;

// Run test if called directly
if (require.main === module) {
    testEnhancedRespringHandler().catch(console.error);
}