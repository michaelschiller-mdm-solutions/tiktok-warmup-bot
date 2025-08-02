"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarmupQueueService = void 0;
const events_1 = require("events");
const database_1 = require("../database");
const WarmupProcessService_1 = require("./WarmupProcessService");
class WarmupQueueService extends events_1.EventEmitter {
    constructor() {
        super();
        this.isRunning = false;
        this.pollingTimer = null;
        this.isProcessing = false;
        this.warmupService = new WarmupProcessService_1.WarmupProcessService();
    }
    async start() {
        if (this.isRunning)
            return;
        console.log('🚀 Starting WarmupQueueService...');
        this.isRunning = true;
        try {
            await this.cleanupOrphanedProcesses();
            this.pollingTimer = setInterval(async () => {
                try {
                    await this.processQueue();
                }
                catch (error) {
                    console.error('❌ Error in queue processing:', error);
                }
            }, 30000);
            setTimeout(() => {
                this.processQueue().catch(error => {
                    console.error('❌ Error in initial queue processing:', error);
                });
            }, 5000);
            console.log('✅ WarmupQueueService started');
        }
        catch (error) {
            console.error('❌ Error starting WarmupQueueService:', error);
            this.isRunning = false;
            throw error;
        }
    }
    async stop() {
        if (!this.isRunning)
            return;
        console.log('🛑 Stopping WarmupQueueService...');
        this.isRunning = false;
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
            this.pollingTimer = null;
        }
        console.log('✅ WarmupQueueService stopped');
    }
    async processQueue() {
        if (!this.isRunning)
            return;
        if (this.isProcessing) {
            console.log('🔒 Queue processing already in progress, skipping cycle');
            return;
        }
        this.isProcessing = true;
        try {
            await this.detectAndResetStuckProcesses();
            if (await this.isAnyAccountInProgress()) {
                console.log('🔒 Single bot constraint: 1 account(s) currently in progress');
                return;
            }
            const readyAccounts = await this.getValidatedReadyAccounts();
            if (readyAccounts.length === 0) {
                return;
            }
            console.log(`🎯 Found ${readyAccounts.length} accounts ready for warmup`);
            const account = readyAccounts[0];
            const nextPhase = account.next_phase_info?.phase;
            if (nextPhase) {
                console.log(`🔥 Processing ${account.username} - Phase: ${nextPhase}`);
                await this.processAccountPhase(account, nextPhase);
            }
        }
        catch (error) {
            console.error('❌ Error in processQueue:', error);
        }
        finally {
            this.isProcessing = false;
        }
    }
    async cleanupOrphanedProcesses() {
        try {
            console.log('🧹 Cleaning up orphaned processes...');
            const stuck = await database_1.db.query(`
        SELECT 
          a.username,
          awp.phase,
          awp.status,
          awp.bot_id,
          awp.started_at,
          awp.updated_at
        FROM accounts a
        JOIN account_warmup_phases awp ON a.id = awp.account_id
        WHERE awp.status = 'in_progress'
        ORDER BY awp.started_at DESC
      `);
            if (stuck.rowCount > 0) {
                console.log('Found stuck accounts:');
                stuck.rows.forEach(row => {
                    console.log(`  - ${row.username}: ${row.phase} (started: ${row.started_at})`);
                });
                const resetResult = await database_1.db.query(`
          UPDATE account_warmup_phases 
          SET status = 'available',
              bot_id = NULL,
              started_at = NULL,
              updated_at = NOW()
          WHERE status = 'in_progress'
          RETURNING account_id, phase
        `);
                console.log(`✅ Reset ${resetResult.rowCount} stuck phases`);
            }
            else {
                console.log('✅ No orphaned processes found');
            }
        }
        catch (error) {
            console.error('❌ Error cleaning up orphaned processes:', error);
        }
    }
    async detectAndResetStuckProcesses() {
        try {
            const result = await database_1.db.query(`
        UPDATE account_warmup_phases 
        SET status = 'available',
            updated_at = NOW()
        WHERE status = 'in_progress' 
        AND updated_at < NOW() - INTERVAL '15 minutes'
      `);
            if (result.rowCount && result.rowCount > 0) {
                console.log(`⚠️ Reset ${result.rowCount} stuck processes`);
            }
        }
        catch (error) {
            console.error('❌ Error detecting stuck processes:', error);
        }
    }
    async isAnyAccountInProgress() {
        try {
            const result = await database_1.db.query(`
        SELECT COUNT(*) as count 
        FROM account_warmup_phases 
        WHERE status = 'in_progress'
      `);
            return parseInt(result.rows[0].count) > 0;
        }
        catch (error) {
            console.error('❌ Error checking in-progress accounts:', error);
            return false;
        }
    }
    async getValidatedReadyAccounts() {
        const query = `
      SELECT 
        bra.*,
        is_content_assignment_complete(bra.id) as content_ready
      FROM bot_ready_accounts bra
      WHERE bra.container_number IS NOT NULL
        AND bra.ready_phases > 0
        AND is_content_assignment_complete(bra.id) = true
      ORDER BY bra.ready_phases DESC, bra.completed_phases ASC
      LIMIT 5
    `;
        const result = await database_1.db.query(query);
        return result.rows;
    }
    async processAccountPhase(account, phase) {
        const warmupPhase = phase;
        const botId = 'warmup-queue-service';
        const sessionId = `session-${Date.now()}`;
        try {
            const startResult = await this.warmupService.startPhase(account.id, warmupPhase, botId, sessionId);
            if (!startResult.success) {
                throw new Error(`Failed to start phase: ${startResult.message}`);
            }
            const automationResult = await this.executePhaseAutomation(account, phase);
            if (automationResult.success) {
                console.log(`✅ Automation successful for ${account.username} - ${phase}`);
                if (phase === 'username') {
                    console.log(`🔤 Username phase completed - updating database for ${account.username}`);
                    await this.updateUsernameInDatabase(account.id, account.username);
                }
                await this.completePhaseWithCooldown(account.id, account.model_id, warmupPhase, botId, automationResult.executionTimeMs);
                console.log(`✅ Completed ${phase} for ${account.username}`);
            }
            else {
                await this.warmupService.failPhase(account.id, warmupPhase, botId, automationResult.error || 'Automation failed');
                console.log(`❌ Failed ${phase} for ${account.username}`);
            }
        }
        catch (error) {
            console.error(`💥 Error processing ${account.username}:`, error);
        }
    }
    async executePhaseAutomation(account, phase) {
        const startTime = Date.now();
        try {
            console.log(`🤖 Executing ${phase} for ${account.username} on container ${account.container_number}`);
            const path = require('path');
            const { spawn } = require('child_process');
            const needsSkipOnboarding = await this.checkFirstAutomation(account.id);
            console.log(`🎯 First automation check for ${account.username}: ${needsSkipOnboarding ? 'NEEDS skip_onboarding.lua' : 'Already completed'}`);
            const sendContentScript = path.join(process.cwd(), 'src/scripts/send-to-iphone.js');
            console.log(`📱 Sending content to iPhone for ${phase}...`);
            const contentResult = await this.executeNodeScript(sendContentScript, [
                account.id.toString(),
                phase
            ]);
            if (!contentResult.success) {
                throw new Error(`Failed to send content to iPhone: ${contentResult.error}`);
            }
            const warmupExecutorScript = path.join(process.cwd(), '../bot/scripts/api/warmup_executor.js');
            console.log(`🎯 Executing phase automation for ${phase}...`);
            const automationArgs = [
                '--account-id', account.id.toString(),
                '--container-number', account.container_number.toString(),
                '--phase', phase,
                '--username', account.username
            ];
            if (needsSkipOnboarding) {
                automationArgs.push('--skip-onboarding', 'true');
            }
            const automationResult = await this.executeNodeScript(warmupExecutorScript, automationArgs);
            if (!automationResult.success) {
                throw new Error(`Phase automation failed: ${automationResult.error}`);
            }
            const executionTimeMs = Date.now() - startTime;
            return {
                success: true,
                executionTimeMs,
                message: `Phase ${phase} completed successfully`,
                contentDelivered: true,
                automationCompleted: true,
                skipOnboardingExecuted: needsSkipOnboarding
            };
        }
        catch (error) {
            const executionTimeMs = Date.now() - startTime;
            console.error(`❌ Phase automation failed for ${account.username}:`, error.message);
            return {
                success: false,
                executionTimeMs,
                error: error.message,
                phase,
                accountId: account.id
            };
        }
    }
    async checkFirstAutomation(accountId) {
        try {
            const query = `
        SELECT COUNT(*) as completed_automation_phases
        FROM account_warmup_phases 
        WHERE account_id = $1 
        AND status = 'completed'
        AND phase != 'manual_setup'
      `;
            const result = await database_1.db.query(query, [accountId]);
            const completedAutomationPhases = parseInt(result.rows[0].completed_automation_phases);
            return completedAutomationPhases === 0;
        }
        catch (error) {
            console.error(`Error checking first automation for account ${accountId}:`, error);
            return false;
        }
    }
    async executeNodeScript(scriptPath, args) {
        const { spawn } = require('child_process');
        return new Promise((resolve) => {
            const child = spawn('node', [scriptPath, ...args], {
                stdio: ['pipe', 'pipe', 'pipe']
            });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            child.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout.trim());
                        resolve(result);
                    }
                    catch (parseError) {
                        resolve({
                            success: true,
                            message: stdout.trim() || 'Script completed successfully'
                        });
                    }
                }
                else {
                    resolve({
                        success: false,
                        error: stderr.trim() || `Script exited with code ${code}`,
                        stdout: stdout.trim()
                    });
                }
            });
            child.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message
                });
            });
        });
    }
    async completePhaseWithCooldown(accountId, modelId, phase, botId, executionTimeMs) {
        try {
            const cooldownConfig = await this.getWarmupConfiguration(modelId);
            const minHours = cooldownConfig?.min_cooldown_hours || 15;
            const maxHours = cooldownConfig?.max_cooldown_hours || 24;
            const cooldownHours = minHours + Math.random() * (maxHours - minHours);
            const cooldownUntil = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);
            console.log(`⏰ Applying cooldown: ${Math.round(cooldownHours * 100) / 100}h (config: ${minHours}-${maxHours}h)`);
            await this.warmupService.completePhase(accountId, phase, botId, executionTimeMs);
            await this.updatePhaseCooldown(accountId, phase, cooldownUntil);
        }
        catch (error) {
            console.error('❌ Error completing phase with cooldown:', error);
            await this.warmupService.completePhase(accountId, phase, botId, executionTimeMs);
        }
    }
    async getWarmupConfiguration(modelId) {
        try {
            const configQuery = `
        SELECT 
          min_cooldown_hours,
          max_cooldown_hours,
          single_bot_constraint
        FROM warmup_configuration 
        WHERE model_id = $1
      `;
            const result = await database_1.db.query(configQuery, [modelId]);
            if (result.rows.length > 0) {
                return result.rows[0];
            }
            return null;
        }
        catch (error) {
            console.error('❌ Error getting warmup configuration:', error);
            return null;
        }
    }
    async updatePhaseCooldown(accountId, phase, cooldownUntil) {
        try {
            const updateQuery = `
        UPDATE account_warmup_phases 
        SET available_at = $3
        WHERE account_id = $1 AND phase = $2
      `;
            await database_1.db.query(updateQuery, [accountId, phase, cooldownUntil]);
        }
        catch (error) {
            console.error('❌ Error updating phase cooldown:', error);
        }
    }
    async updateUsernameInDatabase(accountId, oldUsername) {
        try {
            console.log(`🔄 [USERNAME UPDATE] Starting database update for account ${accountId} (${oldUsername})`);
            const getNewUsernameQuery = `
        SELECT ctc.text_content as new_username
        FROM account_warmup_phases awp
        JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE awp.account_id = $1 AND awp.phase = 'username'
      `;
            console.log(`🔍 [USERNAME UPDATE] Querying assigned username text for account ${accountId}`);
            const result = await database_1.db.query(getNewUsernameQuery, [accountId]);
            if (result.rows.length === 0) {
                console.error(`❌ [USERNAME UPDATE] No username text found for account ${accountId} - this should not happen!`);
                return;
            }
            let newUsername = result.rows[0].new_username;
            console.log(`📝 [USERNAME UPDATE] Original assigned text: "${newUsername}"`);
            if (newUsername && newUsername.length > 0) {
                const lastLetter = newUsername.slice(-1).toLowerCase();
                newUsername = newUsername + lastLetter + lastLetter;
                console.log(`🔤 [USERNAME UPDATE] Modified username: ${result.rows[0].new_username} → ${newUsername} (appended "${lastLetter}" twice)`);
            }
            else {
                console.error(`❌ [USERNAME UPDATE] Invalid username text: "${newUsername}"`);
                return;
            }
            const updateQuery = `
        UPDATE accounts 
        SET username = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING username
      `;
            console.log(`💾 [USERNAME UPDATE] Executing database update: ${oldUsername} → ${newUsername}`);
            const updateResult = await database_1.db.query(updateQuery, [newUsername, accountId]);
            if (updateResult.rowCount === 1) {
                console.log(`✅ [USERNAME UPDATE] SUCCESS: Database updated for account ${accountId}`);
                console.log(`   Old username: ${oldUsername}`);
                console.log(`   New username: ${updateResult.rows[0].username}`);
                console.log(`   Instagram username should now match database username`);
            }
            else {
                console.error(`❌ [USERNAME UPDATE] Database update failed - no rows affected for account ${accountId}`);
            }
        }
        catch (error) {
            console.error(`❌ [USERNAME UPDATE] CRITICAL ERROR updating username for account ${accountId}:`, error);
            console.error(`   This means the database username will NOT match the Instagram username!`);
        }
    }
    async cleanupOrphanedProcesses() {
        try {
            console.log('🧹 Cleaning up orphaned processes...');
            const cleanupQuery = `
        UPDATE account_warmup_phases 
        SET status = 'available', 
            bot_id = NULL, 
            bot_session_id = NULL,
            started_at = NULL,
            error_message = 'Reset by startup cleanup'
        WHERE status = 'in_progress'
        AND started_at < NOW() - INTERVAL '5 minutes'
      `;
            const result = await database_1.db.query(cleanupQuery);
            if (result.rowCount && result.rowCount > 0) {
                console.log(`✅ Cleaned up ${result.rowCount} orphaned processes`);
            }
            else {
                console.log('✅ No orphaned processes found');
            }
        }
        catch (error) {
            console.error('❌ Error cleaning up orphaned processes:', error);
        }
    }
    async isAnyAccountInProgress() {
        try {
            const checkQuery = `
        SELECT COUNT(*) as count
        FROM account_warmup_phases awp
        JOIN accounts a ON awp.account_id = a.id
        WHERE awp.status = 'in_progress'
        AND a.lifecycle_state = 'warmup'
      `;
            const result = await database_1.db.query(checkQuery);
            const count = parseInt(result.rows[0].count);
            if (count > 0) {
                console.log(`🔒 Single bot constraint: ${count} account(s) currently in progress`);
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('❌ Error checking in-progress accounts:', error);
            return true;
        }
    }
    async detectAndResetStuckProcesses() {
        try {
            const stuckQuery = `
        SELECT 
          awp.id,
          a.username,
          awp.phase,
          awp.started_at,
          EXTRACT(EPOCH FROM (NOW() - awp.started_at))/60 as minutes_running
        FROM account_warmup_phases awp
        JOIN accounts a ON awp.account_id = a.id
        WHERE awp.status = 'in_progress'
        AND awp.started_at < NOW() - INTERVAL '10 minutes'
        AND a.lifecycle_state = 'warmup'
      `;
            const stuckResult = await database_1.db.query(stuckQuery);
            if (stuckResult.rows.length > 0) {
                console.log(`🚨 Found ${stuckResult.rows.length} stuck processes:`);
                for (const stuck of stuckResult.rows) {
                    const minutesStuck = Math.round(stuck.minutes_running * 100) / 100;
                    console.log(`   - ${stuck.username}: ${stuck.phase} stuck for ${minutesStuck} minutes`);
                    const resetQuery = `
            UPDATE account_warmup_phases 
            SET status = 'available',
                bot_id = NULL,
                bot_session_id = NULL,
                started_at = NULL,
                error_message = 'Reset due to timeout (stuck for ' || $2 || ' minutes)',
                updated_at = NOW()
            WHERE id = $1
          `;
                    await database_1.db.query(resetQuery, [stuck.id, minutesStuck]);
                    console.log(`   ✅ Reset stuck process for ${stuck.username}`);
                }
            }
        }
        catch (error) {
            console.error('❌ Error detecting stuck processes:', error);
        }
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasTimer: this.pollingTimer !== null
        };
    }
    async getValidatedReadyAccounts() {
        try {
            const query = `
        SELECT a.*, awp.phase, awp.id as phase_id, awp.phase_order
        FROM accounts a
        JOIN account_warmup_phases awp ON a.id = awp.account_id
        WHERE awp.status = 'available'
        AND awp.available_at <= NOW()
        AND (a.cooldown_until IS NULL OR a.cooldown_until <= NOW())
        ORDER BY awp.phase_order ASC, awp.created_at ASC
        LIMIT 5
      `;
            const result = await database_1.db.query(query);
            return result.rows.map(row => ({
                ...row,
                next_phase_info: { phase: row.phase }
            }));
        }
        catch (error) {
            console.error('❌ Error getting validated ready accounts:', error);
            return [];
        }
    }
    async processAccountPhase(account, phase) {
        try {
            console.log(`🔄 Processing ${account.username} - ${phase}`);
            await database_1.db.query(`
        UPDATE account_warmup_phases 
        SET status = 'in_progress', 
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `, [account.phase_id]);
            const result = await this.warmupService.processPhase(account.id, phase);
            if (!result.success) {
                throw new Error(result.error || result.message);
            }
        }
        catch (error) {
            console.error(`❌ Error processing ${account.username} - ${phase}:`, error);
            try {
                await database_1.db.query(`
          UPDATE account_warmup_phases 
          SET status = 'available', 
              error_message = $2,
              updated_at = NOW()
          WHERE id = $1
        `, [account.phase_id, error.message]);
            }
            catch (resetError) {
                console.error('❌ Error resetting phase status:', resetError);
            }
        }
    }
}
exports.WarmupQueueService = WarmupQueueService;
//# sourceMappingURL=WarmupQueueService.js.map