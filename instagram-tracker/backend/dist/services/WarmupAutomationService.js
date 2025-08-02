"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarmupAutomationService = void 0;
const events_1 = require("events");
const database_1 = require("../database");
const WarmupProcessService_1 = require("./WarmupProcessService");
class WarmupAutomationService extends events_1.EventEmitter {
    constructor() {
        super();
        this.warmupService = new WarmupProcessService_1.WarmupProcessService();
    }
    async executePhase(accountId, phase, containerNumber, username) {
        const startTime = Date.now();
        const botId = 'warmup-automation-service';
        const sessionId = `session-${Date.now()}`;
        try {
            console.log(`🤖 Starting phase ${phase} for ${username} on container ${containerNumber}`);
            const startResult = await this.warmupService.startPhase(accountId, phase, botId, sessionId);
            if (!startResult.success) {
                throw new Error(`Failed to start phase: ${startResult.message}`);
            }
            const automationResult = await this.executeAutomationPipeline(accountId, phase, containerNumber, username);
            if (automationResult.success) {
                await this.warmupService.completePhase(accountId, phase, botId, automationResult.executionTimeMs);
                console.log(`✅ Completed ${phase} for ${username}`);
                return {
                    success: true,
                    phase,
                    accountId,
                    executionTimeMs: automationResult.executionTimeMs,
                    message: `Phase ${phase} completed successfully`
                };
            }
            else {
                await this.warmupService.failPhase(accountId, phase, botId, automationResult.error || 'Automation failed');
                console.log(`❌ Failed ${phase} for ${username}: ${automationResult.error}`);
                return {
                    success: false,
                    phase,
                    accountId,
                    error: automationResult.error,
                    executionTimeMs: automationResult.executionTimeMs
                };
            }
        }
        catch (error) {
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
    async executeAutomationPipeline(accountId, phase, containerNumber, username) {
        const startTime = Date.now();
        try {
            const path = require('path');
            const { spawn } = require('child_process');
            const needsSkipOnboarding = await this.checkFirstAutomation(accountId);
            console.log(`🎯 First automation check for ${username}: ${needsSkipOnboarding ? 'NEEDS skip_onboarding.lua' : 'Already completed'}`);
            const sendContentScript = path.join(process.cwd(), 'src/scripts/send-to-iphone.js');
            console.log(`📱 Sending content to iPhone for ${phase}...`);
            const contentResult = await this.executeNodeScript(sendContentScript, [
                accountId.toString(),
                phase
            ]);
            if (!contentResult.success) {
                throw new Error(`Failed to send content to iPhone: ${contentResult.error}`);
            }
            const warmupExecutorScript = path.join(process.cwd(), '../bot/scripts/api/warmup_executor.js');
            console.log(`🎯 Executing phase automation for ${phase}...`);
            const automationArgs = [
                '--account-id', accountId.toString(),
                '--container-number', containerNumber.toString(),
                '--phase', phase,
                '--username', username
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
}
exports.WarmupAutomationService = WarmupAutomationService;
//# sourceMappingURL=WarmupAutomationService.js.map