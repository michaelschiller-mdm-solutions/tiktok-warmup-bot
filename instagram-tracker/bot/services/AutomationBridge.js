/**
 * Automation Bridge Service
 * 
 * Connects the main Instagram tracker app with the iPhone automation bot
 * for automated account warmup when accounts enter the pipeline.
 */

const axios = require('axios');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const AutomationConfig = require('./AutomationConfig');

const LOCK_FILE_PATH = path.join(__dirname, '..', 'scripts', 'api', '.iphone_global.lock');

class AutomationBridge extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            iphoneIP: config.iphoneIP || '192.168.178.65',
            iphonePort: config.iphonePort || 46952,
            maxContainers: config.maxContainers || 30,
            scriptRetryAttempts: config.scriptRetryAttempts || 8, // Default to 8 retries for scripts
            actionDelay: config.actionDelay || 30000, // 30s between actions
            healthCheckInterval: config.healthCheckInterval || 60000, // 1min
            maxFailuresPerHour: config.maxFailuresPerHour || 5,
            pauseDuration: config.pauseDuration || 300000, // 5min
            ...config
        };
        
        this.containerStatus = new Map(); // Track container usage
        this.activeWarmups = new Map(); // Track active warmup sessions
        this.failureCount = 0;
        this.lastFailureReset = Date.now();
        this.isPaused = false;
        
        this.initializeContainers();
        this.startHealthCheck();
    }

    /**
     * Initialize container status tracking
     */
    initializeContainers() {
        for (let i = 1; i <= this.config.maxContainers; i++) {
            this.containerStatus.set(i, {
                available: true,
                accountId: null,
                lastUsed: null,
                status: 'idle',
                failureCount: 0
            });
        }
        
        console.log(`📦 Initialized ${this.config.maxContainers} containers`);
    }

    /**
     * Start health check monitoring
     */
    startHealthCheck() {
        setInterval(async () => {
            await this.performHealthCheck();
        }, this.config.healthCheckInterval);
    }

    /**
     * Perform iPhone connectivity health check
     */
    async performHealthCheck() {
        try {
            const response = await axios.get(
                `http://${this.config.iphoneIP}:${this.config.iphonePort}/status`,
                { timeout: 5000 }
            );
            
            if (this.isPaused) {
                console.log('📱 iPhone connectivity restored, resuming operations');
                this.isPaused = false;
                this.emit('connectivity_restored');
            }
            
        } catch (error) {
            if (!this.isPaused) {
                console.error('📱 iPhone health check failed, pausing operations');
                this.isPaused = true;
                this.emit('connectivity_lost', error.message);
            }
        }
    }

    /**
     * Check if system is operational
     */
    isOperational() {
        return !this.isPaused && this.failureCount < this.config.maxFailuresPerHour;
    }

    /**
     * Record a failure and check if we should pause
     */
    recordFailure() {
        const now = Date.now();
        
        // Reset failure count if an hour has passed
        if (now - this.lastFailureReset > 3600000) {
            this.failureCount = 0;
            this.lastFailureReset = now;
        }
        
        this.failureCount++;
        
        if (this.failureCount >= this.config.maxFailuresPerHour) {
            console.warn(`⚠️ Max failures reached (${this.failureCount}), pausing for ${this.config.pauseDuration}ms`);
            this.isPaused = true;
            
            setTimeout(() => {
                this.isPaused = false;
                this.failureCount = 0;
                console.log('🔄 Resuming operations after pause');
                this.emit('operations_resumed');
            }, this.config.pauseDuration);
        }
    }

    /**
     * Find an available container for warmup
     */
    async findAvailableContainer() {
        if (!this.isOperational()) {
            return null;
        }
        
        for (const [containerNumber, status] of this.containerStatus) {
            if (status.available && status.status === 'idle' && status.failureCount < 3) {
                return {
                    number: containerNumber,
                    status: status
                };
            }
        }
        return null;
    }

    /**
     * Reserve a container for an account
     */
    async reserveContainer(accountId, containerNumber) {
        const container = this.containerStatus.get(containerNumber);
        
        if (!container || !container.available) {
            throw new Error(`Container ${containerNumber} not available`);
        }
        
        container.available = false;
        container.accountId = accountId;
        container.status = 'reserved';
        container.lastUsed = new Date();
        
        this.containerStatus.set(containerNumber, container);
        
        this.emit('container_reserved', { accountId, containerNumber });
        
        return container;
    }

    /**
     * Release a container after warmup completion
     */
    async releaseContainer(containerNumber, success = true) {
        const container = this.containerStatus.get(containerNumber);
        
        if (container) {
            container.available = true;
            container.accountId = null;
            container.status = 'idle';
            
            if (!success) {
                container.failureCount++;
            } else {
                container.failureCount = 0; // Reset on success
            }
            
            this.containerStatus.set(containerNumber, container);
            
            this.emit('container_released', { containerNumber, success });
        }
    }

    /**
     * Stops any currently running script on the iPhone.
     * This is a crucial cleanup and safety step before executing a new script.
     */
    async stopScript() {
        try {
            const url = `http://${this.config.iphoneIP}:${this.config.iphonePort}/stop_script_file`;
            console.log(`[AutomationBridge] 🛑 Stopping any currently running script via ${url}...`);
            await axios.post(url, '', { timeout: 5000 });
            console.log('[AutomationBridge] ✅ Script stop command sent successfully.');
            return true;
        } catch (error) {
            // It's common for this to fail if no script is running, so we don't treat it as a critical error.
            console.warn('[AutomationBridge] ⚠️  Could not stop script (this is often okay and means no script was running):', error.message);
            return false;
        }
    }

    /**
     * Maps a container number to a precise sequence of script files.
     * Always starts with open_settings.lua, then scroll_to_top_container.lua.
     * This is a pure function with no side-effects.
     * @param {number} containerNumber The 1-based container number.
     * @returns {string[]} An ordered array of script names to execute.
     */
    getScriptSequence(containerNumber) {
        if (containerNumber <= 0) {
            throw new Error(`Invalid container number: ${containerNumber}. Must be 1 or greater.`);
        }

        const sequence = ['open_settings.lua', 'scroll_to_top_container.lua'];

        if (containerNumber <= 12) {
            // Page 1
            sequence.push(`select_container_page1_${containerNumber}.lua`);
            console.log(`📝 Mapped sequence for container ${containerNumber}:`, sequence);
            return sequence;
        }

        // Page 2 or higher.
        // This is a brute-force, systematic mapping based on the corrected model
        // (Page 1: 12 items, Page 2: 14 items, Page 3+: 14 items).
        let pageNumber;
        let positionOnPage;

        if (containerNumber >= 13 && containerNumber <= 26) {           // Page 2 (14 items)
            pageNumber = 2;
            positionOnPage = containerNumber - 13 + 1;                  // 13 -> 1, 26 -> 14
        } else if (containerNumber >= 27 && containerNumber <= 40) {    // Page 3
            pageNumber = 3;
            positionOnPage = containerNumber - 27 + 1;
        } else if (containerNumber >= 41 && containerNumber <= 54) {    // Page 4
            pageNumber = 4;
            positionOnPage = containerNumber - 41 + 1;
        } else if (containerNumber >= 55 && containerNumber <= 68) {    // Page 5
            pageNumber = 5;
            positionOnPage = containerNumber - 55 + 1;
        } else if (containerNumber >= 69 && containerNumber <= 82) {    // Page 6
            pageNumber = 6;
            positionOnPage = containerNumber - 69 + 1;
        } else if (containerNumber >= 83 && containerNumber <= 96) {    // Page 7
            pageNumber = 7;
            positionOnPage = containerNumber - 83 + 1;
        } else if (containerNumber >= 97 && containerNumber <= 110) {   // Page 8
            pageNumber = 8;
            positionOnPage = containerNumber - 97 + 1;
        } else if (containerNumber >= 111 && containerNumber <= 124) {  // Page 9
            pageNumber = 9;
            positionOnPage = containerNumber - 111 + 1;
        } else if (containerNumber >= 125 && containerNumber <= 138) {  // Page 10
            pageNumber = 10;
            positionOnPage = containerNumber - 125 + 1;
        } else if (containerNumber >= 139 && containerNumber <= 152) {  // Page 11
            pageNumber = 11;
            positionOnPage = containerNumber - 139 + 1;
        } else if (containerNumber >= 153 && containerNumber <= 166) {  // Page 12
            pageNumber = 12;
            positionOnPage = containerNumber - 153 + 1;
        } else if (containerNumber >= 167 && containerNumber <= 180) {  // Page 13
            pageNumber = 13;
            positionOnPage = containerNumber - 167 + 1;
        } else if (containerNumber >= 181 && containerNumber <= 194) {  // Page 14
            pageNumber = 14;
            positionOnPage = containerNumber - 181 + 1;
        } else if (containerNumber >= 195 && containerNumber <= 208) {  // Page 15
            pageNumber = 15;
            positionOnPage = containerNumber - 195 + 1;
        } else if (containerNumber >= 209 && containerNumber <= 222) {  // Page 16
            pageNumber = 16;
            positionOnPage = containerNumber - 209 + 1;
        } else if (containerNumber >= 223 && containerNumber <= 236) {  // Page 17
            pageNumber = 17;
            positionOnPage = containerNumber - 223 + 1;
        } else if (containerNumber >= 237 && containerNumber <= 250) {  // Page 18
            pageNumber = 18;
            positionOnPage = containerNumber - 237 + 1;
        } else if (containerNumber >= 251 && containerNumber <= 264) {  // Page 19
            pageNumber = 19;
            positionOnPage = containerNumber - 251 + 1;
        } else if (containerNumber >= 265 && containerNumber <= 278) {  // Page 20
            pageNumber = 20;
            positionOnPage = containerNumber - 265 + 1;
        } else if (containerNumber >= 279 && containerNumber <= 292) {  // Page 21
            pageNumber = 21;
            positionOnPage = containerNumber - 279 + 1;
        } else if (containerNumber >= 293 && containerNumber <= 306) {  // Page 22
            pageNumber = 22;
            positionOnPage = containerNumber - 293 + 1;
        } else if (containerNumber >= 307 && containerNumber <= 320) {  // Page 23
            pageNumber = 23;
            positionOnPage = containerNumber - 307 + 1;
        } else if (containerNumber >= 321 && containerNumber <= 334) {  // Page 24
            pageNumber = 24;
            positionOnPage = containerNumber - 321 + 1;
        } else if (containerNumber >= 335 && containerNumber <= 348) {  // Page 25
            pageNumber = 25;
            positionOnPage = containerNumber - 335 + 1;
        } else if (containerNumber >= 349 && containerNumber <= 362) {  // Page 26
            pageNumber = 26;
            positionOnPage = containerNumber - 349 + 1;
        } else if (containerNumber >= 363 && containerNumber <= 376) {  // Page 27
            pageNumber = 27;
            positionOnPage = containerNumber - 363 + 1;
        } else if (containerNumber >= 377 && containerNumber <= 390) {
            pageNumber = 28;
            positionOnPage = containerNumber - 377 + 1;
        } else if (containerNumber >= 391 && containerNumber <= 404) {
            pageNumber = 29;
            positionOnPage = containerNumber - 391 + 1;
        } else if (containerNumber >= 405 && containerNumber <= 418) {
            pageNumber = 30;    
            positionOnPage = containerNumber - 405 + 1;
        } else if (containerNumber >= 419 && containerNumber <= 432) {
            pageNumber = 31;
            positionOnPage = containerNumber - 419 + 1;
        } else if (containerNumber >= 433 && containerNumber <= 446) {
            pageNumber = 32;
            positionOnPage = containerNumber - 433 + 1;
        } else if (containerNumber >= 447 && containerNumber <= 460) {
            pageNumber = 33;
            positionOnPage = containerNumber - 447 + 1;
        } else if (containerNumber >= 461 && containerNumber <= 474) {  // Page 34
            pageNumber = 34;
            positionOnPage = containerNumber - 461 + 1;
        } else if (containerNumber >= 475 && containerNumber <= 488) {  // Page 35
            pageNumber = 35;
            positionOnPage = containerNumber - 475 + 1;
        } else if (containerNumber >= 489 && containerNumber <= 502) {  // Page 36
            pageNumber = 36;
            positionOnPage = containerNumber - 489 + 1;
        } else if (containerNumber >= 503 && containerNumber <= 516) {  // Page 37
            pageNumber = 37;
            positionOnPage = containerNumber - 503 + 1;
        } else if (containerNumber >= 517 && containerNumber <= 530) {  // Page 38
            pageNumber = 38;
            positionOnPage = containerNumber - 517 + 1;
        } else if (containerNumber >= 531 && containerNumber <= 544) {  // Page 39
            pageNumber = 39;
            positionOnPage = containerNumber - 531 + 1;
        } else if (containerNumber >= 545 && containerNumber <= 558) {  // Page 40
            pageNumber = 40;
            positionOnPage = containerNumber - 545 + 1;
        } else if (containerNumber >= 559 && containerNumber <= 572) {  // Page 41
            pageNumber = 41;
            positionOnPage = containerNumber - 559 + 1;
        } else if (containerNumber >= 573 && containerNumber <= 586) {  // Page 42
            pageNumber = 42;
            positionOnPage = containerNumber - 573 + 1;
        } else if (containerNumber >= 587 && containerNumber <= 600) {  // Page 43
            pageNumber = 43;
            positionOnPage = containerNumber - 587 + 1;
        } else if (containerNumber >= 601 && containerNumber <= 614) {  // Page 44
            pageNumber = 44;
            positionOnPage = containerNumber - 601 + 1;
        } else if (containerNumber >= 615 && containerNumber <= 628) {  // Page 45
            pageNumber = 45;
            positionOnPage = containerNumber - 615 + 1;
        } else if (containerNumber >= 629 && containerNumber <= 642) {  // Page 46
            pageNumber = 46;
            positionOnPage = containerNumber - 629 + 1;
        } else if (containerNumber >= 643 && containerNumber <= 656) {  // Page 47
            pageNumber = 47;
            positionOnPage = containerNumber - 643 + 1;
        } else if (containerNumber >= 657 && containerNumber <= 670) {  // Page 48
            pageNumber = 48;
            positionOnPage = containerNumber - 657 + 1;
        } else if (containerNumber >= 671 && containerNumber <= 684) {  // Page 49
            pageNumber = 49;
            positionOnPage = containerNumber - 671 + 1;
        } else if (containerNumber >= 685 && containerNumber <= 698) {  // Page 50
            pageNumber = 50;
            positionOnPage = containerNumber - 685 + 1;
        } else if (containerNumber >= 699 && containerNumber <= 712) {  // Page 51
            pageNumber = 51;
            positionOnPage = containerNumber - 699 + 1;
        } else if (containerNumber >= 713 && containerNumber <= 726) {  // Page 52
            pageNumber = 52;
            positionOnPage = containerNumber - 713 + 1;
        } else if (containerNumber >= 727 && containerNumber <= 740) {  // Page 53
            pageNumber = 53;
            positionOnPage = containerNumber - 727 + 1;
        } else if (containerNumber >= 741 && containerNumber <= 754) {  // Page 54
            pageNumber = 54;
            positionOnPage = containerNumber - 741 + 1;
        } else if (containerNumber >= 755 && containerNumber <= 768) {  // Page 55
            pageNumber = 55;
            positionOnPage = containerNumber - 755 + 1;
        } else if (containerNumber >= 769 && containerNumber <= 782) {  // Page 56
            pageNumber = 56;
            positionOnPage = containerNumber - 769 + 1;
        } else if (containerNumber >= 783 && containerNumber <= 796) {  // Page 57
            pageNumber = 57;
            positionOnPage = containerNumber - 783 + 1;
        } else if (containerNumber >= 797 && containerNumber <= 810) {  // Page 58
            pageNumber = 58;
            positionOnPage = containerNumber - 797 + 1;
        } else if (containerNumber >= 811 && containerNumber <= 824) {  // Page 59
            pageNumber = 59;
            positionOnPage = containerNumber - 811 + 1;
        } else if (containerNumber >= 825 && containerNumber <= 838) {  // Page 60
            pageNumber = 60;
            positionOnPage = containerNumber - 825 + 1;
        } else if (containerNumber >= 839 && containerNumber <= 852) {  // Page 61
            pageNumber = 61;
            positionOnPage = containerNumber - 839 + 1;
        } else if (containerNumber >= 853 && containerNumber <= 866) {  // Page 62
            pageNumber = 62;
            positionOnPage = containerNumber - 853 + 1;
        } else if (containerNumber >= 867 && containerNumber <= 880) {  // Page 63
            pageNumber = 63;
            positionOnPage = containerNumber - 867 + 1;
        } else if (containerNumber >= 881 && containerNumber <= 894) {  // Page 64
            pageNumber = 64;
            positionOnPage = containerNumber - 881 + 1;
        } else if (containerNumber >= 895 && containerNumber <= 908) {  // Page 65
            pageNumber = 65;
            positionOnPage = containerNumber - 895 + 1;
        } else if (containerNumber >= 909 && containerNumber <= 922) {  // Page 66
            pageNumber = 66;
            positionOnPage = containerNumber - 909 + 1;
        } else if (containerNumber >= 923 && containerNumber <= 936) {  // Page 67
            pageNumber = 67;
            positionOnPage = containerNumber - 923 + 1;
        } else if (containerNumber >= 937 && containerNumber <= 950) {  // Page 68
            pageNumber = 68;
            positionOnPage = containerNumber - 937 + 1;
        } else if (containerNumber >= 951 && containerNumber <= 964) {  // Page 69
            pageNumber = 69;
            positionOnPage = containerNumber - 951 + 1;
        } else if (containerNumber >= 965 && containerNumber <= 978) {  // Page 70
            pageNumber = 70;
            positionOnPage = containerNumber - 965 + 1;
        } else if (containerNumber >= 979 && containerNumber <= 992) {  // Page 71
            pageNumber = 71;
            positionOnPage = containerNumber - 979 + 1;
        } else if (containerNumber >= 993 && containerNumber <= 1006) {  // Page 72
            pageNumber = 72;
            positionOnPage = containerNumber - 993 + 1;
        } else {
             // For numbers beyond this explicit map, use the now-corrected formula.
            let containersLeft = containerNumber - 27; // Containers after page 2
            let pageIndex = Math.floor((containersLeft - 1) / 14);
            pageNumber = pageIndex + 3;
            positionOnPage = (containersLeft - 1) % 14 + 1;
        }
        
        console.log(`🔎 Mapping: Container ${containerNumber} is on Page ${pageNumber}, Position ${positionOnPage}.`);

        // Build the sequence of scripts to run
        sequence.push('container_page_2.lua');
        
        const pagesToFlipFromTwo = pageNumber - 2;
        for (let i = 0; i < pagesToFlipFromTwo; i++) {
            sequence.push('next_container_page.lua');
        }
        
        sequence.push(`select_container_page_n_position_${positionOnPage}.lua`);
    
        console.log(`📝 Mapped sequence for container ${containerNumber}:`, sequence);
        return sequence;
    }

    /**
     * Select a specific container on the iPhone by executing a mapped sequence of scripts.
     * @param {number} containerNumber - The 1-based index of the container to select
     * @returns {Promise<boolean>} True if the sequence completed, false otherwise.
     */
    async selectContainer(containerNumber) {
        console.log(`🚀 Starting selection for container: ${containerNumber}`);
        this.emit('container_selection_start', { containerNumber });

        try {
            // First, ensure a clean state by stopping any potentially orphaned script.
            await this.stopScript();
            
            const sequence = this.getScriptSequence(containerNumber);
            
            console.log(`▶️ Executing mapped sequence of ${sequence.length} scripts...`);
            
            // Use a for...of loop to ensure sequential execution.
            for (const scriptName of sequence) {
                const success = await this.executeScript(scriptName);
                if (!success) {
                    // If any script in the sequence fails, abort the entire selection.
                    throw new Error(`Critical script "${scriptName}" in sequence failed. Aborting container selection.`);
                }
                // Hardcoded delay to allow the XXTouch server to reset its state.
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            console.log(`✅ Successfully executed sequence for container ${containerNumber}.`);

            // Now, open Instagram as the final step.
            console.log(`[selectContainer] 📱 Opening Instagram app after container switch...`);
            const openInstaSuccess = await this.executeScript('open_instagram.lua');
            if (!openInstaSuccess) {
                // This is not a critical failure of the container switch itself, so we just log a warning.
                console.warn(`[selectContainer] ⚠️  Could not open Instagram after switching to container ${containerNumber}.`);
            } else {
                console.log(`[selectContainer] ✅ Instagram opened successfully.`);
            }

            this.emit('container_selection_success', { containerNumber });
            return true;
        } catch (error) {
            console.error(`❌ Container selection failed for ${containerNumber}:`, error.message);
            this.emit('container_selection_failed', { containerNumber, error: error.message });
            this.recordFailure(); // Record failure for the bridge
            return false;
        }
    }

    /**
     * Check if a script is currently running on the iPhone
     */
    async isScriptRunning() {
        try {
            const response = await axios.get(
                `http://${this.config.iphoneIP}:${this.config.iphonePort}/is_running`,
                { timeout: 2000 }
            );
            // The API returns 'true' or 'false' as a string, handle it carefully
            return String(response.data).trim().toLowerCase() === 'true';
        } catch (error) {
            console.warn(`⚠️  Could not get script status from iPhone. Assuming not running. Error: ${error.message}`);
            return false;
        }
    }

    /**
     * Wait for the currently executing script to complete by polling the status.
     * @param {string} scriptName - The name of the script we are waiting for, used for logging.
     * @param {number} timeout - How long to wait before failing.
     */
    async waitForScriptCompletion(scriptName, timeout = 45000) {
        console.log(`⏳ Waiting for script "${scriptName}" to complete...`);
        const startTime = Date.now();

        // Give the script a moment to actually start on the device before we begin polling.
        await new Promise(resolve => setTimeout(resolve, 1500));

        while (Date.now() - startTime < timeout) {
            if (!await this.isScriptRunning()) {
                console.log(`✅ Script "${scriptName}" finished.`);
                // Add a brief pause after completion for UI to settle.
                await new Promise(resolve => setTimeout(resolve, 500));
                return true;
            }
            // Poll every second
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.error(`❌ Timed out after ${timeout / 1000}s waiting for script "${scriptName}" to complete.`);
        this.recordFailure();
        return false;
    }

    /**
     * Enhanced script execution with better synchronization and state management
     * @param {string} scriptName - The name of the script to execute.
     * @param {Object} options - Execution options
     * @returns {Promise<boolean>} True on success, false on failure.
     */
    async executeScript(scriptName, options = {}) {
        const {
            maxRetries = this.config.scriptRetryAttempts,
            preExecutionDelay = 0,
            postExecutionDelay = 500,
            verifyCompletion = true,
            timeout = 45000
        } = options;

        if (!this.isOperational()) {
            this.emit('automation_error', { scriptName, message: 'Automation is paused or has reached max failures.' });
            return false;
        }

        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                // Acquire lock with better error handling
                const lockAcquired = await this.acquireLockWithTimeout(5000);
                if (!lockAcquired) {
                    const delay = Math.min(2000 * attempt, 10000); // Exponential backoff, max 10s
                    console.warn(`[AutomationBridge] Could not acquire lock for ${scriptName}, attempt ${attempt}. Waiting ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                // Pre-execution delay if specified
                if (preExecutionDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, preExecutionDelay));
                }

                console.log(`[AutomationBridge] 🎯 Executing script: ${scriptName} (Attempt ${attempt})`);
                
                // Ensure no script is running before starting
                await this.ensureNoScriptRunning();
                
                // Select and launch script with better error handling
                const success = await this.selectAndLaunchScript(scriptName, timeout);
                if (!success) {
                    throw new Error('Failed to select and launch script');
                }

                // Wait for completion with enhanced monitoring
                if (verifyCompletion) {
                    const completed = await this.waitForScriptCompletionEnhanced(scriptName, timeout);
                    if (!completed) {
                        throw new Error('Script execution did not complete within timeout');
                    }
                }

                // Post-execution delay for UI stability
                if (postExecutionDelay > 0) {
                    await new Promise(resolve => setTimeout(resolve, postExecutionDelay));
                }
                
                console.log(`[AutomationBridge] 🎉 Script execution completed: ${scriptName}`);
                this.releaseLock();
                return true;

            } catch (error) {
                this.releaseLock();
                lastError = error;
                console.error(`[AutomationBridge] 💥 Attempt ${attempt} for ${scriptName} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    this.recordFailure();
                    this.emit('automation_error', { scriptName, message: error.message });
                    break;
                }
                
                // Intelligent retry delay based on error type
                const retryDelay = this.calculateRetryDelay(error, attempt);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
        
        return false;
    }

    /**
     * Enhanced lock acquisition with timeout
     */
    async acquireLockWithTimeout(timeoutMs = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            if (this.acquireLock()) {
                return true;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return false;
    }

    /**
     * Ensure no script is running before starting a new one
     */
    async ensureNoScriptRunning(maxWaitMs = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitMs) {
            if (!await this.isScriptRunning()) {
                return true;
            }
            
            console.log('[AutomationBridge] ⏳ Waiting for current script to finish...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Force stop if still running
        console.warn('[AutomationBridge] ⚠️ Force stopping script due to timeout');
        await this.stopScript();
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return !await this.isScriptRunning();
    }

    /**
     * Select and launch script with better error handling
     */
    async selectAndLaunchScript(scriptName, timeout = 10000) {
        try {
            // Select the script on the device
            const selectUrl = `http://${this.config.iphoneIP}:${this.config.iphonePort}/select_script_file`;
            const selectResponse = await axios.post(selectUrl, { filename: scriptName }, { timeout });
            
            if (selectResponse.data.code !== 0) {
                throw new Error(`Failed to select script: ${selectResponse.data.message}`);
            }
            
            // Small delay between select and launch
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Launch the script
            const launchUrl = `http://${this.config.iphoneIP}:${this.config.iphonePort}/launch_script_file`;
            const launchResponse = await axios.post(launchUrl, '', { timeout });
            
            if (launchResponse.data.code !== 0) {
                throw new Error(`Failed to launch script: ${launchResponse.data.message}`);
            }
            
            return true;
            
        } catch (error) {
            console.error(`[AutomationBridge] Failed to select and launch ${scriptName}:`, error.message);
            return false;
        }
    }

    /**
     * Enhanced script completion waiting with better monitoring
     */
    async waitForScriptCompletionEnhanced(scriptName, timeout = 45000) {
        console.log(`⏳ Waiting for script "${scriptName}" to complete...`);
        const startTime = Date.now();
        
        // Give the script time to start
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        let consecutiveNotRunning = 0;
        const requiredConsecutive = 2; // Require 2 consecutive "not running" checks
        
        while (Date.now() - startTime < timeout) {
            const isRunning = await this.isScriptRunning();
            
            if (!isRunning) {
                consecutiveNotRunning++;
                if (consecutiveNotRunning >= requiredConsecutive) {
                    console.log(`✅ Script "${scriptName}" finished (confirmed ${requiredConsecutive} times).`);
                    await new Promise(resolve => setTimeout(resolve, 500)); // UI settle time
                    return true;
                }
            } else {
                consecutiveNotRunning = 0;
            }
            
            await new Promise(resolve => setTimeout(resolve, 800)); // Slightly faster polling
        }

        console.error(`❌ Timed out after ${timeout / 1000}s waiting for script "${scriptName}" to complete.`);
        return false;
    }

    /**
     * Calculate intelligent retry delay based on error type and attempt number
     */
    calculateRetryDelay(error, attempt) {
        return AutomationConfig.calculateRetryDelay(error, attempt);
    }

    /**
     * Acquires a lock for script execution.
     * @private
     */
    acquireLock() {
        if (fs.existsSync(LOCK_FILE_PATH)) {
            try {
                const lockData = fs.readFileSync(LOCK_FILE_PATH,'utf8');
                const [pid] = (lockData||'').split('|');
                if (pid) {
                    try {
                        process.kill(parseInt(pid,10),0); // will throw if not running
                        return false; // lock held by live process
                    } catch(e){
                        if (e.code === 'ESRCH') {
                            console.warn('[AutomationBridge] ⚠️  Found stale lock file – cleaning up');
                            fs.unlinkSync(LOCK_FILE_PATH);
                        } else {
                            return false;
                        }
                    }
                }
            } catch(err){
                console.error('[AutomationBridge] Error reading lock file:',err.message);
                return false;
            }
        }
        fs.writeFileSync(LOCK_FILE_PATH, `${process.pid}|${new Date().toISOString()}`);
        return true;
    }

    /**
     * Releases the script execution lock.
     * @private
     */
    releaseLock() {
        if (fs.existsSync(LOCK_FILE_PATH)) {
            const lockData = fs.readFileSync(LOCK_FILE_PATH, 'utf8');
            const [pidFromFile] = (lockData || '').split('|');
            if (pidFromFile == process.pid.toString()) {
                fs.unlinkSync(LOCK_FILE_PATH);
            }
        }
    }

    /**
     * Set clipboard using the dedicated clipboard.js script
     * This is the only reliable method for clipboard operations
     */
    async setClipboard(text) {
        try {
            console.log(`[AutomationBridge] 📋 Setting clipboard via clipboard.js: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            
            // Use spawn to run the clipboard script
            const { spawn } = require('child_process');
            const path = require('path');
            
            const clipboardScriptPath = path.join(__dirname, '..', 'scripts', 'api', 'clipboard.js');
            const baseUrl = `http://${this.config.iphoneIP}:${this.config.iphonePort}`;
            
            return new Promise((resolve, reject) => {
                const process = spawn('node', [clipboardScriptPath, text, baseUrl], {
                    stdio: ['pipe', 'pipe', 'pipe']
                });
                
                let stdout = '';
                let stderr = '';
                
                process.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                
                process.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                
                process.on('close', (code) => {
                    if (code === 0) {
                        console.log(`[AutomationBridge] ✅ Clipboard set successfully`);
                        resolve(true);
                    } else {
                        console.error(`[AutomationBridge] ❌ Clipboard script failed with code ${code}`);
                        console.error(`stderr: ${stderr}`);
                        resolve(false);
                    }
                });
                
                // Timeout after 15 seconds
                setTimeout(() => {
                    process.kill('SIGTERM');
                    console.error(`[AutomationBridge] ⏱️ Clipboard operation timed out`);
                    resolve(false);
                }, 15000);
            });
            
        } catch (error) {
            console.error(`[AutomationBridge] ❌ Failed to set clipboard:`, error.message);
            return false;
        }
    }

    /**
     * Enhanced clipboard operation with timing safeguards
     * Ensures proper timing between clipboard operations to prevent conflicts
     */
    async setClipboardSafe(text, operationType = 'general') {
        // Use the enhanced timing configuration
        const timingConfig = AutomationConfig.clipboard.operationTiming;
        const minimumTimeBetween = AutomationConfig.clipboard.minimumTimeBetweenOperations;
        
        const requiredDelay = timingConfig[operationType] || timingConfig.general;
        const safetyDelay = Math.max(requiredDelay, minimumTimeBetween);
        
        console.log(`[AutomationBridge] 📋 Setting clipboard for ${operationType} operation with ${safetyDelay}ms safety delay`);
        
        // Check if enough time has passed since last clipboard operation
        const now = Date.now();
        if (this.lastClipboardOperation) {
            const timeSinceLastOp = now - this.lastClipboardOperation;
            if (timeSinceLastOp < safetyDelay) {
                const additionalWait = safetyDelay - timeSinceLastOp;
                console.log(`[AutomationBridge] ⏰ SAFETY WAIT: ${additionalWait}ms additional delay for clipboard safety (${operationType})`);
                console.log(`[AutomationBridge] 🛡️ This prevents clipboard conflicts while previous script may still be running`);
                await new Promise(resolve => setTimeout(resolve, additionalWait));
            } else {
                console.log(`[AutomationBridge] ✅ Sufficient time has passed since last clipboard operation (${timeSinceLastOp}ms)`);
            }
        } else {
            console.log(`[AutomationBridge] 🆕 First clipboard operation of this session`);
        }
        
        // Set the clipboard
        const success = await this.setClipboard(text);
        
        if (success) {
            this.lastClipboardOperation = Date.now();
            console.log(`[AutomationBridge] 📋 Clipboard operation completed safely for: ${operationType}`);
            console.log(`[AutomationBridge] ⏱️ Next clipboard operation will wait minimum ${safetyDelay}ms`);
        } else {
            console.error(`[AutomationBridge] ❌ Clipboard operation failed for: ${operationType}`);
        }
        
        return success;
    }

    /**
     * Upload media to iPhone photos
     */
    async uploadMedia(mediaPath, mediaData) {
        try {
            const response = await axios.post(
                `http://${this.config.iphoneIP}:${this.config.iphonePort}/upload_media`,
                {
                    filename: mediaPath,
                    data: mediaData // base64 encoded
                },
                { timeout: 30000 }
            );
            
            return response.data.code === 0;
            
        } catch (error) {
            console.error('❌ Failed to upload media:', error.message);
            return false;
        }
    }

    /**
     * Start warmup process for an account
     */
    async startWarmup(accountId, warmupPlan) {
        try {
            console.log(`🔥 Starting warmup for account: ${accountId}`);
            
            if (!this.isOperational()) {
                throw new Error('System is not operational');
            }
            
            // Find available container
            const availableContainer = await this.findAvailableContainer();
            if (!availableContainer) {
                throw new Error('No available containers for warmup');
            }
            
            // Reserve container
            await this.reserveContainer(accountId, availableContainer.number);
            
            // Switch to container
            const switchSuccess = await this.executeScript(
                `open_container${availableContainer.number}.lua`
            );
            
            if (!switchSuccess) {
                await this.releaseContainer(availableContainer.number, false);
                throw new Error(`Failed to switch to container ${availableContainer.number}`);
            }
            
            // Track active warmup
            this.activeWarmups.set(accountId, {
                containerNumber: availableContainer.number,
                startTime: new Date(),
                currentAction: 0,
                plan: warmupPlan,
                status: 'in_progress'
            });
            
            this.emit('warmup_started', { accountId, containerNumber: availableContainer.number });
            
            // Execute warmup actions asynchronously
            this.executeWarmupPlan(accountId, warmupPlan).catch(error => {
                console.error(`❌ Warmup execution failed for ${accountId}:`, error.message);
            });
            
            return {
                success: true,
                containerNumber: availableContainer.number,
                message: 'Warmup started successfully'
            };
            
        } catch (error) {
            console.error(`❌ Warmup start failed for account ${accountId}:`, error.message);
            
            this.emit('warmup_failed', { accountId, error: error.message });
            
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Execute warmup plan actions
     */
    async executeWarmupPlan(accountId, warmupPlan) {
        const warmupSession = this.activeWarmups.get(accountId);
        
        if (!warmupSession) {
            throw new Error('No active warmup session found');
        }
        
        try {
            for (let i = 0; i < warmupPlan.actions.length; i++) {
                const action = warmupPlan.actions[i];
                
                // Update current action
                warmupSession.currentAction = i;
                this.activeWarmups.set(accountId, warmupSession);
                
                console.log(`🎯 Executing action ${i + 1}/${warmupPlan.actions.length}: ${action.type}`);
                
                // Execute action based on type
                await this.executeWarmupAction(action, accountId);
                
                // Emit progress
                this.emit('warmup_progress', {
                    accountId,
                    action: i + 1,
                    total: warmupPlan.actions.length,
                    actionType: action.type
                });
                
                // Wait before next action
                if (i < warmupPlan.actions.length - 1) {
                    const delay = action.delay || this.config.actionDelay;
                    console.log(`⏱️ Waiting ${delay}ms before next action...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
            
            // Complete warmup
            await this.completeWarmup(accountId);
            
        } catch (error) {
            await this.failWarmup(accountId, error.message);
            throw error;
        }
    }

    /**
     * Execute individual warmup action
     */
    async executeWarmupAction(action, accountId) {
        const scriptMap = {
            'change_bio': 'change_bio_to_clipboard.lua',
            'change_username': 'change_username_to_clipboard.lua',
            'change_name': 'change_name_to_clipboard.lua',
            'change_profile_pic': 'change_pfp_to_newest_picture.lua',
            'upload_story': 'upload_story_newest_media_no_caption.lua',
            'upload_post': 'upload_post_newest_media_no_caption.lua'
        };
        
        const scriptName = scriptMap[action.type];
        
        if (!scriptName) {
            throw new Error(`Unknown action type: ${action.type}`);
        }
        
        // Prepare action data (copy to clipboard, prepare media, etc.)
        await this.prepareActionData(action, accountId);
        
        // Execute script
        const success = await this.executeScript(scriptName);
        
        if (!success) {
            throw new Error(`Failed to execute action: ${action.type}`);
        }
        
        console.log(`✅ Action completed: ${action.type}`);
    }

    /**
     * Prepare data for warmup action
     */
    async prepareActionData(action, accountId) {
        switch (action.type) {
            case 'change_bio':
                if (action.data) {
                    await this.setClipboard(action.data);
                    console.log(`📋 Bio text set to clipboard for account ${accountId}`);
                }
                break;
                
            case 'change_username':
                if (action.data) {
                    await this.setClipboard(action.data);
                    console.log(`📋 Username set to clipboard for account ${accountId}`);
                }
                break;
                
            case 'change_name':
                if (action.data) {
                    await this.setClipboard(action.data);
                    console.log(`📋 Display name set to clipboard for account ${accountId}`);
                }
                break;
                
            case 'change_profile_pic':
                if (action.mediaData) {
                    await this.uploadMedia('profile_pic.jpg', action.mediaData);
                    console.log(`🖼️ Profile picture uploaded for account ${accountId}`);
                }
                break;
                
            case 'upload_story':
            case 'upload_post':
                if (action.mediaData) {
                    const filename = action.type === 'upload_story' ? 'story_media.jpg' : 'post_media.jpg';
                    await this.uploadMedia(filename, action.mediaData);
                    console.log(`📸 Media uploaded for ${action.type} - account ${accountId}`);
                }
                break;
        }
    }

    /**
     * Complete warmup process
     */
    async completeWarmup(accountId) {
        const warmupSession = this.activeWarmups.get(accountId);
        
        if (warmupSession) {
            // Release container
            await this.releaseContainer(warmupSession.containerNumber, true);
            
            // Remove from active warmups
            this.activeWarmups.delete(accountId);
            
            this.emit('warmup_completed', {
                accountId,
                containerNumber: warmupSession.containerNumber,
                duration: Date.now() - warmupSession.startTime.getTime(),
                actionsCompleted: warmupSession.plan.actions.length
            });
            
            console.log(`🎉 Warmup completed for account: ${accountId}`);
        }
    }

    /**
     * Handle warmup failure
     */
    async failWarmup(accountId, error) {
        const warmupSession = this.activeWarmups.get(accountId);
        
        if (warmupSession) {
            // Release container
            await this.releaseContainer(warmupSession.containerNumber, false);
            
            // Remove from active warmups
            this.activeWarmups.delete(accountId);
            
            this.emit('warmup_failed', {
                accountId,
                containerNumber: warmupSession.containerNumber,
                error,
                actionsCompleted: warmupSession.currentAction
            });
            
            console.error(`💥 Warmup failed for account: ${accountId} - ${error}`);
        }
    }

    /**
     * Stop warmup for an account
     */
    async stopWarmup(accountId) {
        const warmupSession = this.activeWarmups.get(accountId);
        
        if (warmupSession) {
            await this.releaseContainer(warmupSession.containerNumber, false);
            this.activeWarmups.delete(accountId);
            
            this.emit('warmup_stopped', { accountId });
            console.log(`🛑 Warmup stopped for account: ${accountId}`);
            
            return true;
        }
        
        return false;
    }

    /**
     * Get system status
     */
    getStatus() {
        const availableContainers = Array.from(this.containerStatus.values())
            .filter(container => container.available && container.failureCount < 3).length;
        
        const activeWarmups = this.activeWarmups.size;
        
        return {
            operational: this.isOperational(),
            paused: this.isPaused,
            totalContainers: this.config.maxContainers,
            availableContainers,
            activeWarmups,
            failureCount: this.failureCount,
            containerStatus: Object.fromEntries(this.containerStatus),
            activeWarmupSessions: Object.fromEntries(this.activeWarmups)
        };
    }

    /**
     * Get detailed metrics
     */
    getMetrics() {
        const containers = Array.from(this.containerStatus.values());
        const healthyContainers = containers.filter(c => c.failureCount < 3).length;
        const utilizationRate = (this.config.maxContainers - this.getStatus().availableContainers) / this.config.maxContainers;
        
        return {
            containers: {
                total: this.config.maxContainers,
                healthy: healthyContainers,
                available: this.getStatus().availableContainers,
                utilizationRate: utilizationRate
            },
            warmups: {
                active: this.activeWarmups.size,
                completed: 0, // Would track this with persistent storage
                failed: 0     // Would track this with persistent storage
            },
            system: {
                operational: this.isOperational(),
                failureCount: this.failureCount,
                lastHealthCheck: new Date()
            }
        };
    }
}

module.exports = AutomationBridge; 