/**
 * WarmupQueueService - Active Queue Processor for Warmup Pipeline
 * 
 * This service solves the main issue: no active monitoring of ready accounts.
 * It continuously polls for accounts ready for warmup and triggers automation.
 */

import { EventEmitter } from 'events';
import { db } from '../database';
import { WarmupProcessService } from './WarmupProcessService';
import { WarmupPhase } from '../types/warmupProcess';

export class WarmupQueueService extends EventEmitter {
  private warmupService: WarmupProcessService;
  private isRunning: boolean = false;
  private pollingTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.warmupService = new WarmupProcessService();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('🚀 Starting WarmupQueueService...');
    this.isRunning = true;

    // CRITICAL FIX: Clean up orphaned processes from previous runs
    await this.cleanupOrphanedProcesses();

    // Initial check
    await this.processQueue();

    // Schedule regular checks every 30 seconds
    this.pollingTimer = setInterval(async () => {
      try {
        await this.processQueue();
      } catch (error) {
        console.error('❌ Error in queue processing:', error);
      }
    }, 30000);

    console.log('✅ WarmupQueueService started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    console.log('🛑 Stopping WarmupQueueService...');
    this.isRunning = false;

    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }

    console.log('✅ WarmupQueueService stopped');
  }

  private async processQueue(): Promise<void> {
    if (!this.isRunning) return;

    try {
      // CRITICAL FIX: Detect and reset stuck processes first
      await this.detectAndResetStuckProcesses();

      // CRITICAL FIX: Enforce single bot constraint - skip if any account is in progress
      if (await this.isAnyAccountInProgress()) {
        return; // Skip this cycle - another account is being processed
      }

      // Get accounts that are truly ready for processing
      const readyAccounts = await this.getValidatedReadyAccounts();
      
      if (readyAccounts.length === 0) {
        return; // No accounts ready
      }

      console.log(`🎯 Found ${readyAccounts.length} accounts ready for warmup`);

      // Process one account at a time (single bot constraint)
      const account = readyAccounts[0];
      const nextPhase = account.next_phase_info?.phase;

      if (nextPhase) {
        console.log(`🔥 Processing ${account.username} - Phase: ${nextPhase}`);
        await this.processAccountPhase(account, nextPhase);
      }

    } catch (error) {
      console.error('❌ Error in processQueue:', error);
    }
  }

  /**
   * Get accounts that are truly ready (content assigned, container available)
   */
  private async getValidatedReadyAccounts(): Promise<any[]> {
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

    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Process a single account phase with automation
   */
  private async processAccountPhase(account: any, phase: string): Promise<void> {
    const warmupPhase = phase as WarmupPhase;
    const botId = 'warmup-queue-service';
    const sessionId = `session-${Date.now()}`;

    try {
      // Start the phase
      const startResult = await this.warmupService.startPhase(
        account.id, 
        warmupPhase, 
        botId, 
        sessionId
      );

      if (!startResult.success) {
        throw new Error(`Failed to start phase: ${startResult.message}`);
      }

      // Execute automation (this will be enhanced)
      const automationResult = await this.executePhaseAutomation(account, phase);

      if (automationResult.success) {
        // Special handling for username phase - update database username
        if (phase === 'username') {
          await this.updateUsernameInDatabase(account.id, account.username);
        }

        // Complete the phase with model-specific cooldown
        await this.completePhaseWithCooldown(
          account.id,
          account.model_id,
          warmupPhase,
          botId,
          automationResult.executionTimeMs
        );

        console.log(`✅ Completed ${phase} for ${account.username}`);
      } else {
        // Fail the phase
        await this.warmupService.failPhase(
          account.id,
          warmupPhase,
          botId,
          automationResult.error || 'Automation failed'
        );

        console.log(`❌ Failed ${phase} for ${account.username}`);
      }

    } catch (error) {
      console.error(`💥 Error processing ${account.username}:`, error);
    }
  }

  /**
   * Execute automation for a phase using AutomationBridge and send-to-iphone
   */
  private async executePhaseAutomation(account: any, phase: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      console.log(`🤖 Executing ${phase} for ${account.username} on container ${account.container_number}`);
      
      // Import required modules
      const path = require('path');
      const { spawn } = require('child_process');
      
      // Step 1: Check if this account needs skip_onboarding.lua (first automation)
      const needsSkipOnboarding = await this.checkFirstAutomation(account.id);
      console.log(`🎯 First automation check for ${account.username}: ${needsSkipOnboarding ? 'NEEDS skip_onboarding.lua' : 'Already completed'}`);
      
      // Step 2: Send content to iPhone
      const sendContentScript = path.join(process.cwd(), 'src/scripts/send-to-iphone.js');
      console.log(`📱 Sending content to iPhone for ${phase}...`);
      
      const contentResult = await this.executeNodeScript(sendContentScript, [
        account.id.toString(),
        phase
      ]);
      
      if (!contentResult.success) {
        throw new Error(`Failed to send content to iPhone: ${contentResult.error}`);
      }
      
      // Step 3: Execute warmup automation
      const warmupExecutorScript = path.join(process.cwd(), '../bot/scripts/api/warmup_executor.js');
      console.log(`🎯 Executing phase automation for ${phase}...`);
      
      const automationArgs = [
        '--account-id', account.id.toString(),
        '--container-number', account.container_number.toString(),
        '--phase', phase,
        '--username', account.username
      ];
      
      // Add skip onboarding flag if needed
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
      
    } catch (error) {
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

  /**
   * Check if this account needs skip_onboarding.lua (first automation)
   * Always run skip_onboarding.lua if this is the first actual automation phase
   * (i.e., no automation phases completed except manual_setup)
   */
  private async checkFirstAutomation(accountId: number): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as completed_automation_phases
        FROM account_warmup_phases 
        WHERE account_id = $1 
        AND status = 'completed'
        AND phase != 'manual_setup'
      `;
      
      const result = await db.query(query, [accountId]);
      const completedAutomationPhases = parseInt(result.rows[0].completed_automation_phases);
      
      // Return true if this is the first automation phase (no automation phases completed)
      return completedAutomationPhases === 0;
      
    } catch (error: any) {
      console.error(`Error checking first automation for account ${accountId}:`, error);
      // Default to false to avoid running skip_onboarding on error
      return false;
    }
  }

  /**
   * Execute a Node.js script and return the result
   */
  private async executeNodeScript(scriptPath: string, args: string[]): Promise<any> {
    const { spawn } = require('child_process');
    
    return new Promise((resolve) => {
      const child = spawn('node', [scriptPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });
      
      child.on('close', (code: number) => {
        if (code === 0) {
          try {
            // Try to parse JSON output from script
            const result = JSON.parse(stdout.trim());
            resolve(result);
          } catch (parseError) {
            resolve({
              success: true,
              message: stdout.trim() || 'Script completed successfully'
            });
          }
        } else {
          resolve({
            success: false,
            error: stderr.trim() || `Script exited with code ${code}`,
            stdout: stdout.trim()
          });
        }
      });
      
      child.on('error', (error: Error) => {
        resolve({
          success: false,
          error: error.message
        });
      });
    });
  }

  /**
   * Complete phase with model-specific cooldown configuration
   */
  private async completePhaseWithCooldown(
    accountId: number, 
    modelId: number, 
    phase: WarmupPhase, 
    botId: string, 
    executionTimeMs: number
  ): Promise<void> {
    try {
      // Get model-specific cooldown configuration
      const cooldownConfig = await this.getWarmupConfiguration(modelId);
      
      // Use configured cooldown or defaults
      const minHours = cooldownConfig?.min_cooldown_hours || 15;
      const maxHours = cooldownConfig?.max_cooldown_hours || 24;
      
      // Generate random cooldown within range
      const cooldownHours = minHours + Math.random() * (maxHours - minHours);
      const cooldownUntil = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);
      
      console.log(`⏰ Applying cooldown: ${Math.round(cooldownHours * 100) / 100}h (config: ${minHours}-${maxHours}h)`);
      
      // Complete the phase with custom cooldown
      await this.warmupService.completePhase(
        accountId,
        phase,
        botId,
        executionTimeMs
      );
      
      // Update the available_at with our calculated value
      await this.updatePhaseCooldown(accountId, phase, cooldownUntil);
      
    } catch (error) {
      console.error('❌ Error completing phase with cooldown:', error);
      // Fallback to default completion
      await this.warmupService.completePhase(
        accountId,
        phase,
        botId,
        executionTimeMs
      );
    }
  }

  /**
   * Get warmup configuration for a model
   */
  private async getWarmupConfiguration(modelId: number): Promise<any> {
    try {
      const configQuery = `
        SELECT 
          min_cooldown_hours,
          max_cooldown_hours,
          single_bot_constraint
        FROM warmup_configuration 
        WHERE model_id = $1
      `;
      
      const result = await db.query(configQuery, [modelId]);
      
      if (result.rows.length > 0) {
        return result.rows[0];
      }
      
      return null; // Use defaults
      
    } catch (error) {
      console.error('❌ Error getting warmup configuration:', error);
      return null;
    }
  }

  /**
   * Update phase cooldown with custom value
   */
  private async updatePhaseCooldown(accountId: number, phase: WarmupPhase, cooldownUntil: Date): Promise<void> {
    try {
      const updateQuery = `
        UPDATE account_warmup_phases 
        SET available_at = $3
        WHERE account_id = $1 AND phase = $2
      `;
      
      await db.query(updateQuery, [accountId, phase, cooldownUntil]);
      
    } catch (error) {
      console.error('❌ Error updating phase cooldown:', error);
    }
  }

  /**
   * Update username in database after username phase completion
   */
  private async updateUsernameInDatabase(accountId: number, oldUsername: string): Promise<void> {
    try {
      console.log(`🔄 Updating username in database for account ${accountId}...`);
      
      // Get the assigned username text
      const getNewUsernameQuery = `
        SELECT ctc.text_content as new_username
        FROM account_warmup_phases awp
        JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE awp.account_id = $1 AND awp.phase = 'username'
      `;
      
      const result = await db.query(getNewUsernameQuery, [accountId]);
      
      if (result.rows.length === 0) {
        console.log(`⚠️  No username text found for account ${accountId}`);
        return;
      }
      
      let newUsername = result.rows[0].new_username;
      
      // Apply username modification: append last letter twice
      if (newUsername && newUsername.length > 0) {
        const lastLetter = newUsername.slice(-1).toLowerCase();
        newUsername = newUsername + lastLetter + lastLetter;
        console.log(`🔤 Modified username: ${result.rows[0].new_username} → ${newUsername} (appended "${lastLetter}" twice)`);
      }
      
      // Update the username in accounts table
      const updateQuery = `
        UPDATE accounts 
        SET username = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      await db.query(updateQuery, [newUsername, accountId]);
      
      console.log(`✅ Username updated in database: ${oldUsername} → ${newUsername}`);
      
    } catch (error) {
      console.error(`❌ Failed to update username in database:`, error);
    }
  }

  /**
   * Clean up orphaned processes from previous runs
   */
  private async cleanupOrphanedProcesses(): Promise<void> {
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
      
      const result = await db.query(cleanupQuery);
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`✅ Cleaned up ${result.rowCount} orphaned processes`);
      } else {
        console.log('✅ No orphaned processes found');
      }
      
    } catch (error) {
      console.error('❌ Error cleaning up orphaned processes:', error);
    }
  }

  /**
   * Check if any account is currently in progress
   */
  private async isAnyAccountInProgress(): Promise<boolean> {
    try {
      const checkQuery = `
        SELECT COUNT(*) as count
        FROM account_warmup_phases awp
        JOIN accounts a ON awp.account_id = a.id
        WHERE awp.status = 'in_progress'
        AND a.lifecycle_state = 'warmup'
      `;
      
      const result = await db.query(checkQuery);
      const count = parseInt(result.rows[0].count);
      
      if (count > 0) {
        console.log(`🔒 Single bot constraint: ${count} account(s) currently in progress`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('❌ Error checking in-progress accounts:', error);
      return true; // Err on the side of caution
    }
  }

  /**
   * Detect and reset stuck processes (running > 10 minutes)
   */
  private async detectAndResetStuckProcesses(): Promise<void> {
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
      
      const stuckResult = await db.query(stuckQuery);
      
      if (stuckResult.rows.length > 0) {
        console.log(`🚨 Found ${stuckResult.rows.length} stuck processes:`);
        
        for (const stuck of stuckResult.rows) {
          const minutesStuck = Math.round(stuck.minutes_running * 100) / 100;
          console.log(`   - ${stuck.username}: ${stuck.phase} stuck for ${minutesStuck} minutes`);
          
          // Reset the stuck process
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
          
          await db.query(resetQuery, [stuck.id, minutesStuck]);
          console.log(`   ✅ Reset stuck process for ${stuck.username}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Error detecting stuck processes:', error);
    }
  }

  getStatus(): any {
    return {
      isRunning: this.isRunning,
      hasTimer: this.pollingTimer !== null
    };
  }
} 