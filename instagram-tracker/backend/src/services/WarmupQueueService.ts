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
import { any } from 'joi';
import { query } from 'express';
import { query } from 'express';
import { any } from 'joi';
import { any } from 'joi';
import { query } from 'express';

export class WarmupQueueService extends EventEmitter {
  private warmupService: WarmupProcessService;
  private isRunning: boolean = false;
  private pollingTimer: NodeJS.Timeout | null = null;
  private isProcessing: boolean = false; // Process-level lock to prevent race conditions

  constructor() {
    super();
    this.warmupService = new WarmupProcessService();
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    console.log('🚀 Starting WarmupQueueService...');
    this.isRunning = true;

    try {
      // CRITICAL FIX: Clean up orphaned processes from previous runs
      await this.cleanupOrphanedProcesses();

      // Schedule regular checks every 30 seconds
      this.pollingTimer = setInterval(async () => {
        try {
          await this.processQueue();
        } catch (error) {
          console.error('❌ Error in queue processing:', error);
        }
      }, 30000);

      // Start first check after 5 seconds (single timer approach)
      setTimeout(() => {
        this.processQueue().catch(error => {
          console.error('❌ Error in initial queue processing:', error);
        });
      }, 5000); // 5 second delay to ensure server is fully started

      console.log('✅ WarmupQueueService started');
    } catch (error) {
      console.error('❌ Error starting WarmupQueueService:', error);
      this.isRunning = false;
      throw error;
    }
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

    // CRITICAL FIX: Process-level lock to prevent race conditions
    if (this.isProcessing) {
      console.log('🔒 Queue processing already in progress, skipping cycle');
      return;
    }

    this.isProcessing = true;
    
    try {
      // CRITICAL FIX: Detect and reset stuck processes first
      await this.detectAndResetStuckProcesses();

      // CRITICAL FIX: Enforce single bot constraint - skip if any account is in progress
      if (await this.isAnyAccountInProgress()) {
        console.log('🔒 Single bot constraint: 1 account(s) currently in progress');
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
    } finally {
      // CRITICAL FIX: Always release the process lock
      this.isProcessing = false;
    }
  }



  /**
   * Clean up orphaned processes from previous runs
   * Uses the exact same logic as fix-stuck-account.js which works perfectly
   */
  private async cleanupOrphanedProcesses(): Promise<void> {
    try {
      console.log('🧹 Cleaning up orphaned processes...');
      
      // Check for stuck accounts (same as fix-stuck-account.js)
      const stuck = await db.query(`
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
        
        // Reset stuck accounts (exact same logic as fix-stuck-account.js)
        const resetResult = await db.query(`
          UPDATE account_warmup_phases 
          SET status = 'available',
              bot_id = NULL,
              started_at = NULL,
              updated_at = NOW()
          WHERE status = 'in_progress'
          RETURNING account_id, phase
        `);
        
        console.log(`✅ Reset ${resetResult.rowCount} stuck phases`);
      } else {
        console.log('✅ No orphaned processes found');
      }
      
    } catch (error) {
      console.error('❌ Error cleaning up orphaned processes:', error);
      // Don't throw - this shouldn't prevent startup
    }
  }

  /**
   * Detect and reset stuck processes
   */
  private async detectAndResetStuckProcesses(): Promise<void> {
    try {
      // Reset processes that have been running too long (over 15 minutes)
      const result = await db.query(`
        UPDATE account_warmup_phases 
        SET status = 'available',
            updated_at = NOW()
        WHERE status = 'in_progress' 
        AND updated_at < NOW() - INTERVAL '15 minutes'
      `);
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`⚠️ Reset ${result.rowCount} stuck processes`);
      }
      
    } catch (error) {
      console.error('❌ Error detecting stuck processes:', error);
    }
  }

  /**
   * Check if any account is currently in progress
   */
  private async isAnyAccountInProgress(): Promise<boolean> {
    try {
      const result = await db.query(`
        SELECT COUNT(*) as count 
        FROM account_warmup_phases 
        WHERE status = 'in_progress'
      `);
      
      return parseInt(result.rows[0].count) > 0;
    } catch (error) {
      console.error('❌ Error checking in-progress accounts:', error);
      return false; // Assume no accounts in progress on error
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
        console.log(`✅ Automation successful for ${account.username} - ${phase}`);
        
        // CRITICAL: Special handling for username phase - update database username
        if (phase === 'username') {
          console.log(`🔤 Username phase completed - updating database for ${account.username}`);
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
   * CRITICAL: This ensures the database username matches what was changed on Instagram
   */
  private async updateUsernameInDatabase(accountId: number, oldUsername: string): Promise<void> {
    try {
      console.log(`🔄 [USERNAME UPDATE] Starting database update for account ${accountId} (${oldUsername})`);
      
      // Get the assigned username text
      const getNewUsernameQuery = `
        SELECT ctc.text_content as new_username
        FROM account_warmup_phases awp
        JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE awp.account_id = $1 AND awp.phase = 'username'
      `;
      
      console.log(`🔍 [USERNAME UPDATE] Querying assigned username text for account ${accountId}`);
      const result = await db.query(getNewUsernameQuery, [accountId]);
      
      if (result.rows.length === 0) {
        console.error(`❌ [USERNAME UPDATE] No username text found for account ${accountId} - this should not happen!`);
        return;
      }
      
      let newUsername = result.rows[0].new_username;
      console.log(`📝 [USERNAME UPDATE] Original assigned text: "${newUsername}"`);
      
      // Apply username modification: append last letter twice (same logic as clipboard)
      if (newUsername && newUsername.length > 0) {
        const lastLetter = newUsername.slice(-1).toLowerCase();
        newUsername = newUsername + lastLetter + lastLetter;
        console.log(`🔤 [USERNAME UPDATE] Modified username: ${result.rows[0].new_username} → ${newUsername} (appended "${lastLetter}" twice)`);
      } else {
        console.error(`❌ [USERNAME UPDATE] Invalid username text: "${newUsername}"`);
        return;
      }
      
      // Update the username in accounts table
      const updateQuery = `
        UPDATE accounts 
        SET username = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING username
      `;
      
      console.log(`💾 [USERNAME UPDATE] Executing database update: ${oldUsername} → ${newUsername}`);
      const updateResult = await db.query(updateQuery, [newUsername, accountId]);
      
      if (updateResult.rowCount === 1) {
        console.log(`✅ [USERNAME UPDATE] SUCCESS: Database updated for account ${accountId}`);
        console.log(`   Old username: ${oldUsername}`);
        console.log(`   New username: ${updateResult.rows[0].username}`);
        console.log(`   Instagram username should now match database username`);
      } else {
        console.error(`❌ [USERNAME UPDATE] Database update failed - no rows affected for account ${accountId}`);
      }
      
    } catch (error) {
      console.error(`❌ [USERNAME UPDATE] CRITICAL ERROR updating username for account ${accountId}:`, error);
      console.error(`   This means the database username will NOT match the Instagram username!`);
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

  /**
   * Get accounts that are validated and ready for processing
   */
  private async getValidatedReadyAccounts(): Promise<any[]> {
    try {
      const query = `
        SELECT a.*, awp.phase, awp.id as phase_id, awp.phase_order
        FROM accounts a
        JOIN account_warmup_phases awp ON a.id = awp.account_id
        WHERE awp.status = 'available'
        AND awp.available_at <= NOW()
        AND (a.cooldown_until IS NULL OR a.cooldown_until <= NOW())
        AND a.container_number IS NOT NULL
        AND a.lifecycle_state = 'warmup'
        ORDER BY awp.phase_order ASC, awp.created_at ASC
        LIMIT 5
      `;
      
      const result = await db.query(query);
      return result.rows.map(row => ({
        ...row,
        next_phase_info: { phase: row.phase }
      }));
      
    } catch (error) {
      console.error('❌ Error getting validated ready accounts:', error);
      return [];
    }
  }

  /**
   * Process a specific account phase
   */
  private async processAccountPhase(account: any, phase: WarmupPhase): Promise<void> {
    try {
      console.log(`🔄 Processing ${account.username} - ${phase}`);
      
      // SAFEGUARD: Validate account state before processing
      if (!account.container_number) {
        console.error(`❌ Account ${account.username} has null container - skipping phase ${phase}`);
        
        // Skip this phase and mark account as needing attention
        await db.query(`
          UPDATE account_warmup_phases 
          SET status = 'skipped', 
              error_message = 'Account has null container - phase skipped for safety',
              completed_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `, [account.phase_id]);
        
        return;
      }
      
      if (account.lifecycle_state === 'archived') {
        console.error(`❌ Account ${account.username} is archived - skipping phase ${phase}`);
        
        // Skip this phase for archived accounts
        await db.query(`
          UPDATE account_warmup_phases 
          SET status = 'skipped', 
              error_message = 'Account is archived - phase skipped',
              completed_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `, [account.phase_id]);
        
        return;
      }
      
      // Mark phase as in progress
      await db.query(`
        UPDATE account_warmup_phases 
        SET status = 'in_progress', 
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `, [account.phase_id]);

      // Use the warmup service to process the phase (this triggers iPhone automation)
      const result = await this.warmupService.processPhase(account.id, phase);
      
      if (!result.success) {
        throw new Error(result.error || result.message);
      }
      
    } catch (error) {
      console.error(`❌ Error processing ${account.username} - ${phase}:`, error);
      
      // Reset the phase status on error
      try {
        await db.query(`
          UPDATE account_warmup_phases 
          SET status = 'available', 
              error_message = $2,
              updated_at = NOW()
          WHERE id = $1
        `, [account.phase_id, error.message]);
      } catch (resetError) {
        console.error('❌ Error resetting phase status:', resetError);
      }
    }
  }
}