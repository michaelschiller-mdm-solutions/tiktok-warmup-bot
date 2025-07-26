/**
 * Warmup Automation Service
 * 
 * Complete automation system for warmup phases with proper queuing,
 * content delivery, and iPhone automation integration.
 */

import { EventEmitter } from 'events';
import { db } from '../database';
import { WarmupProcessService } from './WarmupProcessService';
import { WarmupPhase } from '../types/warmupProcess';

export class WarmupAutomationService extends EventEmitter {
  private warmupService: WarmupProcessService;

  constructor() {
    super();
    this.warmupService = new WarmupProcessService();
  }

  /**
   * Execute a complete warmup phase for an account
   */
  async executePhase(accountId: number, phase: WarmupPhase, containerNumber: number, username: string): Promise<any> {
    const startTime = Date.now();
    const botId = 'warmup-automation-service';
    const sessionId = `session-${Date.now()}`;

    try {
      console.log(`🤖 Starting phase ${phase} for ${username} on container ${containerNumber}`);

      // Start the phase
      const startResult = await this.warmupService.startPhase(
        accountId, 
        phase, 
        botId, 
        sessionId
      );

      if (!startResult.success) {
        throw new Error(`Failed to start phase: ${startResult.message}`);
      }

      // Execute the automation pipeline
      const automationResult = await this.executeAutomationPipeline(
        accountId, 
        phase, 
        containerNumber, 
        username
      );

      if (automationResult.success) {
        // Complete the phase
        await this.warmupService.completePhase(
          accountId,
          phase,
          botId,
          automationResult.executionTimeMs
        );

        console.log(`✅ Completed ${phase} for ${username}`);
        
        return {
          success: true,
          phase,
          accountId,
          executionTimeMs: automationResult.executionTimeMs,
          message: `Phase ${phase} completed successfully`
        };
      } else {
        // Fail the phase
        await this.warmupService.failPhase(
          accountId,
          phase,
          botId,
          automationResult.error || 'Automation failed'
        );

        console.log(`❌ Failed ${phase} for ${username}: ${automationResult.error}`);
        
        return {
          success: false,
          phase,
          accountId,
          error: automationResult.error,
          executionTimeMs: automationResult.executionTimeMs
        };
      }

    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      console.error(`💥 Error executing ${phase} for ${username}:`, error);
      
      return {
        success: false,
        phase,
        accountId,
        error: error.message,
        executionTimeMs
      };
    }
  }

  /**
   * Execute the complete automation pipeline for a phase
   */
  private async executeAutomationPipeline(
    accountId: number, 
    phase: WarmupPhase, 
    containerNumber: number, 
    username: string
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const path = require('path');
      const { spawn } = require('child_process');
      
      // Step 1: Check if this is the first automation (needs skip_onboarding.lua)
      const needsSkipOnboarding = await this.checkFirstAutomation(accountId);
      console.log(`🎯 First automation check for ${username}: ${needsSkipOnboarding ? 'NEEDS skip_onboarding.lua' : 'Already completed'}`);
      
      // Step 2: Send content to iPhone
      const sendContentScript = path.join(process.cwd(), 'src/scripts/send-to-iphone.js');
      console.log(`📱 Sending content to iPhone for ${phase}...`);
      
      const contentResult = await this.executeNodeScript(sendContentScript, [
        accountId.toString(),
        phase
      ]);
      
      if (!contentResult.success) {
        throw new Error(`Failed to send content to iPhone: ${contentResult.error}`);
      }
      
      // Step 3: Execute warmup automation
      const warmupExecutorScript = path.join(process.cwd(), '../bot/scripts/api/warmup_executor.js');
      console.log(`🎯 Executing phase automation for ${phase}...`);
      
      const automationArgs = [
        '--account-id', accountId.toString(),
        '--container-number', containerNumber.toString(),
        '--phase', phase,
        '--username', username
      ];
      
      // Add skip onboarding flag if needed
      if (needsSkipOnboarding) {
        automationArgs.push('--skip-onboarding', 'true');
      }
      
      const automationResult = await this.executeNodeScript(warmupExecutorScript, automationArgs);
      
      if (!automationResult.success) {
        throw new Error(`Phase automation failed: ${automationResult.error}`);
      }
      
      // Step 4: Skip onboarding tracking (no longer needed - we check phases directly)
      
      const executionTimeMs = Date.now() - startTime;
      
      return {
        success: true,
        executionTimeMs,
        message: `Phase ${phase} completed successfully`,
        contentDelivered: true,
        automationCompleted: true,
        skipOnboardingExecuted: needsSkipOnboarding
      };
      
    } catch (error: any) {
      const executionTimeMs = Date.now() - startTime;
      console.error(`❌ Phase automation failed:`, error.message);
      
      return {
        success: false,
        executionTimeMs,
        error: error.message,
        phase,
        accountId
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
}