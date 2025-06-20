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

const LOCK_FILE_PATH = path.join(__dirname, '..', 'scripts', 'api', '.iphone_global.lock');

class AutomationBridge extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            iphoneIP: config.iphoneIP || '192.168.178.65',
            iphonePort: config.iphonePort || 46952,
            maxContainers: config.maxContainers || 30,
            retryAttempts: config.retryAttempts || 3,
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
        // (Page 1: 12 items, Page 2: 15 items, Page 3+: 14 items).
        let pageNumber;
        let positionOnPage;

        if (containerNumber >= 13 && containerNumber <= 27) { // Page 2 has 15 items
            pageNumber = 2;
            positionOnPage = containerNumber - 13 + 1;
        } else if (containerNumber >= 28 && containerNumber <= 41) { // Page 3
            pageNumber = 3;
            positionOnPage = containerNumber - 28 + 1;
        } else if (containerNumber >= 42 && containerNumber <= 55) {
            pageNumber = 4;
            positionOnPage = containerNumber - 42 + 1;
        } else if (containerNumber >= 56 && containerNumber <= 69) {
            pageNumber = 5;
            positionOnPage = containerNumber - 56 + 1;
        } else if (containerNumber >= 70 && containerNumber <= 83) {
            pageNumber = 6;
            positionOnPage = containerNumber - 70 + 1;
        } else if (containerNumber >= 84 && containerNumber <= 97) {
            pageNumber = 7;
            positionOnPage = containerNumber - 84 + 1;
        } else if (containerNumber >= 98 && containerNumber <= 111) {
            pageNumber = 8;
            positionOnPage = containerNumber - 98 + 1;
        } else if (containerNumber >= 112 && containerNumber <= 125) {
            pageNumber = 9;
            positionOnPage = containerNumber - 112 + 1;
        } else if (containerNumber >= 126 && containerNumber <= 139) {
            pageNumber = 10;
            positionOnPage = containerNumber - 126 + 1;
        } else if (containerNumber >= 140 && containerNumber <= 153) {
            pageNumber = 11;
            positionOnPage = containerNumber - 140 + 1;
        } else if (containerNumber >= 154 && containerNumber <= 167) {
            pageNumber = 12;
            positionOnPage = containerNumber - 154 + 1;
        } else if (containerNumber >= 168 && containerNumber <= 181) {
            pageNumber = 13;
            positionOnPage = containerNumber - 168 + 1;
        } else if (containerNumber >= 182 && containerNumber <= 195) {
            pageNumber = 14;
            positionOnPage = containerNumber - 182 + 1;
        } else if (containerNumber >= 196 && containerNumber <= 209) {
            pageNumber = 15;
            positionOnPage = containerNumber - 196 + 1;
        } else if (containerNumber >= 210 && containerNumber <= 223) {
            pageNumber = 16;
            positionOnPage = containerNumber - 210 + 1;
        } else if (containerNumber >= 224 && containerNumber <= 237) {
            pageNumber = 17;
            positionOnPage = containerNumber - 224 + 1;
        } else if (containerNumber >= 238 && containerNumber <= 251) {
            pageNumber = 18;
            positionOnPage = containerNumber - 238 + 1;
        } else if (containerNumber >= 252 && containerNumber <= 265) {
            pageNumber = 19;
            positionOnPage = containerNumber - 252 + 1;
        } else if (containerNumber >= 266 && containerNumber <= 279) {
            pageNumber = 20;
            positionOnPage = containerNumber - 266 + 1;
        } else if (containerNumber >= 280 && containerNumber <= 293) {
            pageNumber = 21;
            positionOnPage = containerNumber - 280 + 1;
        } else if (containerNumber >= 294 && containerNumber <= 307) {
            pageNumber = 22;
            positionOnPage = containerNumber - 294 + 1;
        } else if (containerNumber >= 308 && containerNumber <= 321) {
            pageNumber = 23;
            positionOnPage = containerNumber - 308 + 1;
        } else if (containerNumber >= 322 && containerNumber <= 335) {
            pageNumber = 24;
            positionOnPage = containerNumber - 322 + 1;
        } else if (containerNumber >= 336 && containerNumber <= 349) {
            pageNumber = 25;
            positionOnPage = containerNumber - 336 + 1;
        } else if (containerNumber >= 350 && containerNumber <= 363) {
            pageNumber = 26;
            positionOnPage = containerNumber - 350 + 1;
        } else if (containerNumber >= 364 && containerNumber <= 377) {
            pageNumber = 27;
            positionOnPage = containerNumber - 364 + 1;
        } else if (containerNumber >= 378 && containerNumber <= 391) {
            pageNumber = 28;
            positionOnPage = containerNumber - 378 + 1;
        } else if (containerNumber >= 392 && containerNumber <= 405) {
            pageNumber = 29;
            positionOnPage = containerNumber - 392 + 1;
        } else if (containerNumber >= 406 && containerNumber <= 419) {
            pageNumber = 30;
            positionOnPage = containerNumber - 406 + 1;
        } else if (containerNumber >= 420 && containerNumber <= 433) {
            pageNumber = 31;
            positionOnPage = containerNumber - 420 + 1;
        } else if (containerNumber >= 434 && containerNumber <= 447) {
            pageNumber = 32;
            positionOnPage = containerNumber - 434 + 1;
        } else if (containerNumber >= 448 && containerNumber <= 461) {
            pageNumber = 33;
            positionOnPage = containerNumber - 448 + 1;
        } else if (containerNumber >= 462 && containerNumber <= 475) {
            pageNumber = 34;
            positionOnPage = containerNumber - 462 + 1;
        } else if (containerNumber >= 476 && containerNumber <= 489) {
            pageNumber = 35;
            positionOnPage = containerNumber - 476 + 1;
        } else if (containerNumber >= 490 && containerNumber <= 503) {
            pageNumber = 36;
            positionOnPage = containerNumber - 490 + 1;
        } else if (containerNumber >= 504 && containerNumber <= 517) {
            pageNumber = 37;
            positionOnPage = containerNumber - 504 + 1;
        } else if (containerNumber >= 518 && containerNumber <= 531) {
            pageNumber = 38;
            positionOnPage = containerNumber - 518 + 1;
        } else if (containerNumber >= 532 && containerNumber <= 545) {
            pageNumber = 39;
            positionOnPage = containerNumber - 532 + 1;
        } else if (containerNumber >= 546 && containerNumber <= 559) {
            pageNumber = 40;
            positionOnPage = containerNumber - 546 + 1;
        } else if (containerNumber >= 560 && containerNumber <= 573) {
            pageNumber = 41;
            positionOnPage = containerNumber - 560 + 1;
        } else if (containerNumber >= 574 && containerNumber <= 587) {
            pageNumber = 42;
            positionOnPage = containerNumber - 574 + 1;
        } else if (containerNumber >= 588 && containerNumber <= 601) {
            pageNumber = 43;
            positionOnPage = containerNumber - 588 + 1;
        } else if (containerNumber >= 602 && containerNumber <= 615) {
            pageNumber = 44;
            positionOnPage = containerNumber - 602 + 1;
        } else if (containerNumber >= 616 && containerNumber <= 629) {
            pageNumber = 45;
            positionOnPage = containerNumber - 616 + 1;
        } else if (containerNumber >= 630 && containerNumber <= 643) {
            pageNumber = 46;
            positionOnPage = containerNumber - 630 + 1;
        } else if (containerNumber >= 644 && containerNumber <= 657) {
            pageNumber = 47;
            positionOnPage = containerNumber - 644 + 1;
        } else if (containerNumber >= 658 && containerNumber <= 671) {
            pageNumber = 48;
            positionOnPage = containerNumber - 658 + 1;
        } else if (containerNumber >= 672 && containerNumber <= 685) {
            pageNumber = 49;
            positionOnPage = containerNumber - 672 + 1;
        } else if (containerNumber >= 686 && containerNumber <= 699) {
            pageNumber = 50;
            positionOnPage = containerNumber - 686 + 1;
        } else if (containerNumber >= 700 && containerNumber <= 713) {
            pageNumber = 51;
            positionOnPage = containerNumber - 700 + 1;
        } else if (containerNumber >= 714 && containerNumber <= 727) {
            pageNumber = 52;
            positionOnPage = containerNumber - 714 + 1;
        } else if (containerNumber >= 728 && containerNumber <= 741) {
            pageNumber = 53;
            positionOnPage = containerNumber - 728 + 1;
        } else if (containerNumber >= 742 && containerNumber <= 755) {
            pageNumber = 54;
            positionOnPage = containerNumber - 742 + 1;
        } else if (containerNumber >= 756 && containerNumber <= 769) {
            pageNumber = 55;
            positionOnPage = containerNumber - 756 + 1;
        } else if (containerNumber >= 770 && containerNumber <= 783) {
            pageNumber = 56;
            positionOnPage = containerNumber - 770 + 1;
        } else if (containerNumber >= 784 && containerNumber <= 797) {
            pageNumber = 57;
            positionOnPage = containerNumber - 784 + 1;
        } else if (containerNumber >= 798 && containerNumber <= 811) {
            pageNumber = 58;
            positionOnPage = containerNumber - 798 + 1;
        } else if (containerNumber >= 812 && containerNumber <= 825) {
            pageNumber = 59;
            positionOnPage = containerNumber - 812 + 1;
        } else if (containerNumber >= 826 && containerNumber <= 839) {
            pageNumber = 60;
            positionOnPage = containerNumber - 826 + 1;
        } else if (containerNumber >= 840 && containerNumber <= 853) {
            pageNumber = 61;
            positionOnPage = containerNumber - 840 + 1;
        } else if (containerNumber >= 854 && containerNumber <= 867) {
            pageNumber = 62;
            positionOnPage = containerNumber - 854 + 1;
        } else if (containerNumber >= 868 && containerNumber <= 881) {
            pageNumber = 63;
            positionOnPage = containerNumber - 868 + 1;
        } else if (containerNumber >= 882 && containerNumber <= 895) {
            pageNumber = 64;
            positionOnPage = containerNumber - 882 + 1;
        } else if (containerNumber >= 896 && containerNumber <= 909) {
            pageNumber = 65;
            positionOnPage = containerNumber - 896 + 1;
        } else if (containerNumber >= 910 && containerNumber <= 923) {
            pageNumber = 66;
            positionOnPage = containerNumber - 910 + 1;
        } else if (containerNumber >= 924 && containerNumber <= 937) {
            pageNumber = 67;
            positionOnPage = containerNumber - 924 + 1;
        } else if (containerNumber >= 938 && containerNumber <= 951) {
            pageNumber = 68;
            positionOnPage = containerNumber - 938 + 1;
        } else if (containerNumber >= 952 && containerNumber <= 965) {
            pageNumber = 69;
            positionOnPage = containerNumber - 952 + 1;
        } else if (containerNumber >= 966 && containerNumber <= 979) {
            pageNumber = 70;
            positionOnPage = containerNumber - 966 + 1;
        } else if (containerNumber >= 980 && containerNumber <= 993) {
            pageNumber = 71;
            positionOnPage = containerNumber - 980 + 1;
        } else if (containerNumber >= 994 && containerNumber <= 1007) {
            pageNumber = 72;
            positionOnPage = containerNumber - 994 + 1;
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
     */
    async selectContainer(containerNumber) {
        console.log(`🚀 Starting selection for container: ${containerNumber}`);
        
        const scriptSequence = this.getScriptSequence(containerNumber);
        
        console.log(`▶️ Executing mapped sequence of ${scriptSequence.length} scripts...`);
        for (const scriptName of scriptSequence) {
            // The executeScript method already handles waiting and retries.
            await this.executeScript(scriptName);
        }

        console.log(`✅ Successfully executed sequence for container ${containerNumber}.`);
        return true;
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
     * Executes a single Lua script on the iPhone with a locking mechanism.
     * @param {string} scriptName The name of the script file to execute.
     * @returns {Promise<boolean>} True if successful, false otherwise.
     */
    async executeScript(scriptName) {
        // --- Self-healing Lock Mechanism ---
        if (fs.existsSync(LOCK_FILE_PATH)) {
            const lockData = fs.readFileSync(LOCK_FILE_PATH, 'utf8');
            const [pid] = (lockData || '').split('|');

            if (pid) {
                let isStale = false;
                try {
                    process.kill(parseInt(pid), 0);
                } catch (e) {
                    if (e.code === 'ESRCH') {
                        console.log('⚠️  Found stale AutomationBridge lock file. Removing it.');
                        isStale = true;
                        fs.unlinkSync(LOCK_FILE_PATH);
                    }
                }

                if (!isStale) {
                    const errorMsg = `❌ Error: An automation process (PID: ${pid}) is already running.`;
                    console.error(errorMsg);
                    this.emit('execution_error', { scriptName, error: errorMsg });
                    return false;
                }
            }
        }

        try {
            // Create lock file with current process's PID
            const pid = process.pid;
            fs.writeFileSync(LOCK_FILE_PATH, `${pid}|${scriptName}|${new Date().toISOString()}`);

            this.emit('script_execution_start', { scriptName });
            console.log(`[AutomationBridge] 🎯 Executing script: ${scriptName}`);

            // **New Step**: Stop any orphaned script before starting a new one.
            await this.stopScript();

            // 1. Select the script
            await axios.post(
                `http://${this.config.iphoneIP}:${this.config.iphonePort}/select_script_file`,
                { filename: `/var/mobile/Media/1ferver/lua/scripts/${scriptName}` },
                { timeout: 10000 }
            );

            // 2. Launch the script
            await axios.post(
                `http://${this.config.iphoneIP}:${this.config.iphonePort}/launch_script_file`,
                '',
                { timeout: 10000 }
            );

            // 3. Wait for completion
            const success = await this.waitForScriptCompletion(scriptName);

            if (success) {
                console.log(`[AutomationBridge] ✅ Successfully executed ${scriptName}`);
                this.emit('script_execution_success', { scriptName });
                return true;
            } else {
                console.error(`[AutomationBridge] ❌ Timed out waiting for ${scriptName} to complete.`);
                this.emit('script_execution_timeout', { scriptName });
                this.recordFailure();
                return false;
            }

        } catch (error) {
            const errorMsg = `[AutomationBridge] 💥 Script execution failed for ${scriptName}: ${error.message}`;
            console.error(errorMsg);
            this.recordFailure();
            this.emit('script_execution_error', { scriptName, error: error.message });
            return false;
        } finally {
            // --- Unlock Mechanism ---
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
     * Set clipboard content for iPhone
     */
    async setClipboard(text) {
        try {
            const response = await axios.post(
                `http://${this.config.iphoneIP}:${this.config.iphonePort}/set_clipboard`,
                { text: text },
                { timeout: 5000 }
            );
            
            return response.data.code === 0;
            
        } catch (error) {
            console.error('❌ Failed to set clipboard:', error.message);
            return false;
        }
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