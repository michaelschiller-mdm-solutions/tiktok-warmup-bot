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
        // Complete the phase
        await this.warmupService.completePhase(
          account.id,
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
   * Execute automation for a phase (placeholder for now)
   */
  private async executePhaseAutomation(account: any, phase: string): Promise<any> {
    // TODO: This will be enhanced to call AutomationBridge
    console.log(`🤖 [PLACEHOLDER] Executing ${phase} for container ${account.container_number}`);
    
    // Simulate automation execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: true,
      executionTimeMs: 2000,
      message: 'Automation completed successfully'
    };
  }

  getStatus(): any {
    return {
      isRunning: this.isRunning,
      hasTimer: this.pollingTimer !== null
    };
  }
} 