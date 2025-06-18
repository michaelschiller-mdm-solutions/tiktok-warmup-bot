/**
 * Batch Container Creation Script with Real-time Progress Updates
 * 
 * This script creates multiple Instagram containers by sequentially:
 * 1. Setting the iPhone clipboard to the container number (using clipboard.js)
 * 2. Running the create_container_with_clipboard.lua script
 * 
 * Features:
 * - Real-time progress updates via callback
 * - Detailed error tracking and reporting
 * - Enhanced status messages for UI integration
 * - Graceful error handling with continuation options
 * 
 * USAGE:
 * node scripts/container_creation/batch_create_containers.js <count> <startNumber> [iPhone_IP:PORT]
 * 
 * PARAMETERS:
 * - count: Number of containers to create
 * - startNumber: The container number to start with
 * - iPhone_IP:PORT: Optional iPhone IP and port (default: http://192.168.178.65:46952)
 * 
 * EXAMPLES:
 * node scripts/container_creation/batch_create_containers.js 5 1
 * node scripts/container_creation/batch_create_containers.js 3 10 http://192.168.1.100:46952
 * 
 * This will create containers numbered sequentially starting from startNumber.
 */

const { exec } = require('child_process');
const path = require('path');
const util = require('util');

// Promisify exec for async/await
const execAsync = util.promisify(exec);

class BatchContainerCreator {
    constructor(iphoneUrl = 'http://192.168.178.65:46952', progressCallback = null) {
        this.iphoneUrl = iphoneUrl;
        this.progressCallback = progressCallback;
        this.scriptRoot = path.join(__dirname, '..');
        this.clipboardScript = path.join(this.scriptRoot, 'api', 'clipboard.js');
        this.luaScript = path.join(__dirname, 'create_container_with_clipboard.lua');
    }

    /**
     * Send progress update to callback or console
     * @param {Object} update - Progress update object
     */
    sendUpdate(update) {
        if (this.progressCallback) {
            this.progressCallback(update);
        } else {
            console.log(JSON.stringify(update));
        }
    }

    /**
     * Set iPhone clipboard to specified text
     * @param {string} text - Text to set in clipboard
     * @returns {Promise<boolean>} Success status
     */
    async setClipboard(text) {
        try {
            this.sendUpdate({
                type: 'step',
                message: `Setting clipboard to: "${text}"`,
                step: 'clipboard',
                status: 'in_progress'
            });
            
            const command = `node "${this.clipboardScript}" "${text}" "${this.iphoneUrl}"`;
            const { stdout, stderr } = await execAsync(command);
            
            if (stderr && !stderr.includes('⚠️')) {
                this.sendUpdate({
                    type: 'warning',
                    message: `Clipboard warning: ${stderr}`,
                    step: 'clipboard',
                    status: 'warning'
                });
            }
            
            this.sendUpdate({
                type: 'step',
                message: 'Clipboard set successfully',
                step: 'clipboard',
                status: 'completed'
            });
            return true;
            
        } catch (error) {
            this.sendUpdate({
                type: 'error',
                message: `Failed to set clipboard: ${error.message}`,
                step: 'clipboard',
                status: 'failed',
                error: error.message
            });
            return false;
        }
    }

    /**
     * Execute the Lua script to create container
     * @returns {Promise<boolean>} Success status
     */
    async createContainer() {
        try {
            this.sendUpdate({
                type: 'step',
                message: 'Executing container creation script...',
                step: 'container_creation',
                status: 'in_progress'
            });
            
            // Use the proper script_runner.js instead of lua_executor.js
            const scriptRunnerScript = path.join(this.scriptRoot, 'api', 'script_runner.js');
            const command = `node "${scriptRunnerScript}" "create_container_with_clipboard.lua"`;
            
            const { stdout, stderr } = await execAsync(command);
            
            if (stderr && !stderr.includes('⚠️') && !stderr.includes('🔧')) {
                this.sendUpdate({
                    type: 'warning',
                    message: `Lua script warning: ${stderr}`,
                    step: 'container_creation',
                    status: 'warning'
                });
            }
            
            // Check if execution was successful by looking for success indicators in output
            if (stdout.includes('🎉') || stdout.includes('✅') || stdout.includes('completed') || stdout.includes('successfully')) {
                this.sendUpdate({
                    type: 'step',
                    message: 'Container created successfully',
                    step: 'container_creation',
                    status: 'completed'
                });
                return true;
            } else {
                this.sendUpdate({
                    type: 'error',
                    message: 'Container creation may have failed - no success indicator found',
                    step: 'container_creation',
                    status: 'failed',
                    error: 'No success indicator in script output'
                });
                return false;
            }
            
        } catch (error) {
            this.sendUpdate({
                type: 'error',
                message: `Failed to create container: ${error.message}`,
                step: 'container_creation',
                status: 'failed',
                error: error.message,
                troubleshooting: 'Make sure the iPhone is connected and XXTouch Elite is running'
            });
            return false;
        }
    }

    /**
     * Wait for specified duration with progress updates
     * @param {number} ms - Milliseconds to wait
     * @param {string} reason - Reason for waiting
     */
    async sleep(ms, reason = 'Processing') {
        this.sendUpdate({
            type: 'wait',
            message: `${reason} - waiting ${ms / 1000} seconds...`,
            step: 'wait',
            status: 'waiting',
            duration: ms
        });
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Create multiple containers in sequence with detailed progress tracking
     * @param {number} count - Number of containers to create
     * @param {number} startNumber - Starting container number
     * @returns {Promise<Object>} Creation results
     */
    async createContainers(count, startNumber) {
        this.sendUpdate({
            type: 'start',
            message: 'Batch Container Creation Started',
            total_containers: count,
            starting_number: startNumber,
            iphone_url: this.iphoneUrl,
            status: 'started'
        });

        const results = {
            total: count,
            successful: 0,
            failed: 0,
            errors: [],
            created_containers: [],
            start_time: new Date(),
            end_time: null
        };

        for (let i = 0; i < count; i++) {
            const containerNumber = startNumber + i;
            const progressPercent = Math.round(((i) / count) * 100);
            
            this.sendUpdate({
                type: 'container_start',
                message: `Creating container ${i + 1}/${count} (Number: ${containerNumber})`,
                container_number: containerNumber,
                current_index: i + 1,
                total_containers: count,
                progress_percent: progressPercent,
                status: 'starting'
            });
            
            try {
                // Step 1: Set clipboard
                const clipboardSuccess = await this.setClipboard(containerNumber.toString());
                if (!clipboardSuccess) {
                    throw new Error('Failed to set clipboard');
                }

                // Wait a moment for clipboard to be ready
                await this.sleep(1000, 'Preparing clipboard data');

                // Step 2: Create container
                const containerSuccess = await this.createContainer();
                if (!containerSuccess) {
                    throw new Error('Failed to create container');
                }

                results.successful++;
                results.created_containers.push(containerNumber);
                
                this.sendUpdate({
                    type: 'container_complete',
                    message: `Container ${containerNumber} created successfully!`,
                    container_number: containerNumber,
                    current_index: i + 1,
                    total_containers: count,
                    progress_percent: Math.round(((i + 1) / count) * 100),
                    status: 'completed',
                    successful_count: results.successful,
                    failed_count: results.failed
                });

                // Wait between containers to avoid overwhelming the system
                if (i < count - 1) {
                    await this.sleep(3000, 'Preparing for next container');
                }

            } catch (error) {
                results.failed++;
                const errorDetails = {
                    containerNumber,
                    error: error.message,
                    timestamp: new Date(),
                    step_failed: error.step || 'unknown'
                };
                results.errors.push(errorDetails);
                
                this.sendUpdate({
                    type: 'container_failed',
                    message: `Failed to create container ${containerNumber}: ${error.message}`,
                    container_number: containerNumber,
                    current_index: i + 1,
                    total_containers: count,
                    progress_percent: Math.round(((i + 1) / count) * 100),
                    status: 'failed',
                    error: error.message,
                    successful_count: results.successful,
                    failed_count: results.failed,
                    troubleshooting: 'Check iPhone connection and ensure it\'s on the home screen'
                });
                
                // Ask if user wants to continue (in non-interactive mode, continue automatically)
                this.sendUpdate({
                    type: 'warning',
                    message: 'Error occurred. Continuing with next container...',
                    status: 'continuing'
                });
                await this.sleep(2000, 'Recovering from error');
            }
        }

        results.end_time = new Date();
        results.duration_ms = results.end_time - results.start_time;

        this.sendUpdate({
            type: 'complete',
            message: 'Batch Creation Complete',
            results: results,
            status: 'completed',
            progress_percent: 100
        });

        return results;
    }

    /**
     * Print final results with enhanced formatting
     * @param {Object} results - Creation results
     */
    printResults(results) {
        const duration = Math.round(results.duration_ms / 1000);
        
        this.sendUpdate({
            type: 'summary',
            message: 'Creation Summary',
            successful: results.successful,
            failed: results.failed,
            total: results.total,
            duration_seconds: duration,
            created_containers: results.created_containers,
            errors: results.errors,
            success_rate: Math.round((results.successful / results.total) * 100),
            status: results.successful === results.total ? 'all_success' : 
                    results.successful > 0 ? 'partial_success' : 'all_failed'
        });
        
        if (!this.progressCallback) {
            // Only print to console if no callback (standalone execution)
            console.log('\n🏁 Batch Creation Complete');
            console.log('============================');
            console.log(`✅ Successful: ${results.successful}/${results.total}`);
            console.log(`❌ Failed: ${results.failed}/${results.total}`);
            console.log(`⏱️ Duration: ${duration} seconds`);
            
            if (results.created_containers.length > 0) {
                console.log(`📦 Created containers: ${results.created_containers.join(', ')}`);
            }
            
            if (results.errors.length > 0) {
                console.log('\n💥 Errors:');
                results.errors.forEach(({ containerNumber, error }) => {
                    console.log(`   Container ${containerNumber}: ${error}`);
                });
            }
            
            if (results.successful === results.total) {
                console.log('\n🎉 All containers created successfully!');
            } else if (results.successful > 0) {
                console.log('\n⚠️ Some containers created successfully, but with errors.');
            } else {
                console.log('\n💥 No containers were created successfully.');
            }
        }
    }

    /**
     * Test iPhone connectivity before starting batch creation
     * @returns {Promise<boolean>} Connection status
     */
    async testConnection() {
        try {
            this.sendUpdate({
                type: 'test',
                message: 'Testing iPhone connectivity...',
                status: 'testing'
            });

            const testCommand = `node "${path.join(this.scriptRoot, 'api', 'lua_executor.js')}" test`;
            await execAsync(testCommand);
            
            this.sendUpdate({
                type: 'test',
                message: 'iPhone connection test successful',
                status: 'connected'
            });
            return true;
        } catch (error) {
            this.sendUpdate({
                type: 'test',
                message: `iPhone connection test failed: ${error.message}`,
                status: 'connection_failed',
                error: error.message,
                troubleshooting: 'Check iPhone IP address, XXTouch Elite status, and network connectivity'
            });
            return false;
        }
    }
}

// Main execution when called directly
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log('❌ Error: Missing required parameters');
        console.log('\n📖 USAGE:');
        console.log('node scripts/container_creation/batch_create_containers.js <count> <startNumber> [iPhone_IP:PORT]');
        console.log('\n📝 EXAMPLES:');
        console.log('node scripts/container_creation/batch_create_containers.js 5 1');
        console.log('node scripts/container_creation/batch_create_containers.js 3 10 http://192.168.1.100:46952');
        console.log('\n📄 PARAMETERS:');
        console.log('  count       - Number of containers to create');
        console.log('  startNumber - The container number to start with');
        console.log('  iPhone_IP   - Optional iPhone IP and port (default: http://192.168.178.65:46952)');
        process.exit(1);
    }
    
    const count = parseInt(args[0]);
    const startNumber = parseInt(args[1]);
    const iphoneUrl = args[2] || 'http://192.168.178.65:46952';
    
    // Validate inputs
    if (isNaN(count) || count <= 0) {
        console.error('❌ Error: Count must be a positive number');
        process.exit(1);
    }
    
    if (isNaN(startNumber) || startNumber < 1) {
        console.error('❌ Error: Start number must be a positive number (1 or greater)');
        process.exit(1);
    }
    
    const creator = new BatchContainerCreator(iphoneUrl);
    
    try {
        const results = await creator.createContainers(count, startNumber);
        creator.printResults(results);
        
        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);
        
    } catch (error) {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    }
}

// Export for use as module
module.exports = BatchContainerCreator;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 