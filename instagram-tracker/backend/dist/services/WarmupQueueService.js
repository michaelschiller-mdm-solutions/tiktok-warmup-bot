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
        this.warmupService = new WarmupProcessService_1.WarmupProcessService();
    }
    async start() {
        if (this.isRunning)
            return;
        console.log('🚀 Starting WarmupQueueService...');
        this.isRunning = true;
        await this.processQueue();
        this.pollingTimer = setInterval(async () => {
            try {
                await this.processQueue();
            }
            catch (error) {
                console.error('❌ Error in queue processing:', error);
            }
        }, 30000);
        console.log('✅ WarmupQueueService started');
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
        try {
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
                await this.warmupService.completePhase(account.id, warmupPhase, botId, automationResult.executionTimeMs);
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
        console.log(`🤖 [PLACEHOLDER] Executing ${phase} for container ${account.container_number}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return {
            success: true,
            executionTimeMs: 2000,
            message: 'Automation completed successfully'
        };
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasTimer: this.pollingTimer !== null
        };
    }
}
exports.WarmupQueueService = WarmupQueueService;
//# sourceMappingURL=WarmupQueueService.js.map