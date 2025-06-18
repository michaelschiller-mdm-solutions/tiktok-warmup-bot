"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const WarmupProcessService_1 = require("../../services/WarmupProcessService");
const ContentAssignmentService_1 = require("../../services/ContentAssignmentService");
const botAuth_1 = require("../../middleware/botAuth");
const warmupProcess_1 = require("../../types/warmupProcess");
const database_1 = require("../../database");
const router = express_1.default.Router();
const warmupService = new WarmupProcessService_1.WarmupProcessService();
const contentService = new ContentAssignmentService_1.ContentAssignmentService();
router.use(botAuth_1.botAuthMiddleware);
router.get('/ready', async (req, res) => {
    try {
        const { model_id, limit = 50 } = req.query;
        const modelId = model_id ? parseInt(model_id) : undefined;
        const limitNum = parseInt(limit);
        if (limitNum > 100) {
            return res.status(400).json({
                success: false,
                error: 'Limit cannot exceed 100 accounts'
            });
        }
        const accounts = await warmupService.getReadyAccounts(modelId, limitNum);
        res.json({
            success: true,
            data: {
                accounts,
                count: accounts.length,
                bot_id: req.botId,
                session_id: req.sessionId
            }
        });
    }
    catch (error) {
        console.error('Error fetching ready accounts for bot:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ready accounts',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/start-warmup', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const botId = req.botId;
        const sessionId = req.sessionId;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const result = await warmupService.startWarmupProcess(accountId, botId, sessionId);
        res.json({
            success: result.success,
            data: result,
            bot_id: botId,
            session_id: sessionId
        });
    }
    catch (error) {
        console.error('Error starting warmup process:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start warmup process',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id/warmup-status', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const status = await warmupService.getWarmupStatus(accountId);
        res.json({
            success: true,
            data: status,
            bot_id: req.botId,
            session_id: req.sessionId
        });
    }
    catch (error) {
        console.error('Error fetching warmup status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch warmup status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id/available-phases', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const phases = await warmupService.getAvailablePhases(accountId);
        res.json({
            success: true,
            data: {
                account_id: accountId,
                available_phases: phases,
                count: phases.length
            },
            bot_id: req.botId,
            session_id: req.sessionId
        });
    }
    catch (error) {
        console.error('Error fetching available phases:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch available phases',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id/next-phase', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const botId = req.botId;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const nextPhase = await warmupService.getNextAvailablePhaseForBot(accountId, botId);
        if (!nextPhase) {
            return res.json({
                success: true,
                data: null,
                message: 'No phases available or bot constraint violation',
                bot_id: botId,
                session_id: req.sessionId
            });
        }
        res.json({
            success: true,
            data: nextPhase,
            bot_id: botId,
            session_id: req.sessionId
        });
    }
    catch (error) {
        console.error('Error fetching next available phase:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch next available phase',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/complete-manual-setup', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const userId = req.botId;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const result = await warmupService.completeManualSetup(accountId, userId);
        res.json({
            success: result.success,
            data: result,
            bot_id: req.botId,
            session_id: req.sessionId
        });
    }
    catch (error) {
        console.error('Error completing manual setup:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete manual setup',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/execute-phase/:phase', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const phase = req.params.phase;
        const botId = req.botId;
        const sessionId = req.sessionId;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        if (!Object.values(warmupProcess_1.WarmupPhase).includes(phase)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid warmup phase'
            });
        }
        const phaseInfo = await warmupService.getNextAvailablePhaseForBot(accountId, botId);
        if (!phaseInfo || phaseInfo.phase !== phase) {
            return res.status(400).json({
                success: false,
                error: `Phase ${phase} is not available for execution`,
                available_phase: phaseInfo?.phase || null
            });
        }
        const startResult = await warmupService.startPhase(accountId, phase, botId, sessionId);
        if (!startResult.success) {
            return res.status(400).json({
                success: false,
                error: startResult.message,
                details: startResult.error
            });
        }
        res.json({
            success: true,
            data: {
                phase_id: startResult.phaseId,
                account_id: accountId,
                phase: phase,
                execution_info: {
                    ...phaseInfo,
                    phase_started: true,
                    execution_instructions: {
                        step1: 'Execute API scripts in sequence',
                        step2: 'Execute Lua scripts in sequence',
                        step3: 'Report completion with results',
                        step4: phaseInfo.script_sequence?.post_execution_action ?
                            `Special action required: ${phaseInfo.script_sequence.post_execution_action}` :
                            'No special action required'
                    }
                }
            },
            bot_id: botId,
            session_id: sessionId
        });
    }
    catch (error) {
        console.error('Error executing warmup phase:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to execute warmup phase',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id/phase-script-sequence/:phase', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const phase = req.params.phase;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        if (!Object.values(warmupProcess_1.WarmupPhase).includes(phase)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid warmup phase'
            });
        }
        const accountResult = await database_1.db.query(`
      SELECT container_number FROM accounts WHERE id = $1
    `, [accountId]);
        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }
        const containerNumber = accountResult.rows[0].container_number;
        const scriptSequence = warmupService.getPhaseScriptSequence(phase, containerNumber);
        res.json({
            success: true,
            data: {
                account_id: accountId,
                container_number: containerNumber,
                phase: phase,
                script_sequence: scriptSequence
            },
            bot_id: req.botId,
            session_id: req.sessionId
        });
    }
    catch (error) {
        console.error('Error fetching phase script sequence:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch phase script sequence',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id/content/:phase', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const phase = req.params.phase;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        if (!Object.values(warmupProcess_1.WarmupPhase).includes(phase)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid warmup phase'
            });
        }
        const phaseResult = await warmupService.getAvailablePhases(accountId);
        const phaseRecord = phaseResult.find(p => p.phase === phase);
        if (!phaseRecord) {
            return res.status(404).json({
                success: false,
                error: 'Phase not found or not available'
            });
        }
        let assignedContent = null;
        if (phaseRecord.assigned_content_id || phaseRecord.assigned_text_id) {
            assignedContent = await contentService.getAssignedContent(phaseRecord.id);
        }
        else {
            const account = await warmupService.getWarmupStatus(accountId);
            const modelId = account.model_id || 1;
            const contentType = phase;
            assignedContent = await contentService.assignContentToPhase(accountId, phaseRecord.id, contentType, modelId);
        }
        res.json({
            success: true,
            data: {
                account_id: accountId,
                phase: phase,
                phase_id: phaseRecord.id,
                content: assignedContent,
                instructions: getPhaseInstructions(phase)
            },
            bot_id: req.botId,
            session_id: req.sessionId
        });
    }
    catch (error) {
        console.error('Error fetching phase content:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch phase content',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/start-phase/:phase', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const phase = req.params.phase;
        const botId = req.botId;
        const sessionId = req.sessionId;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        if (!Object.values(warmupProcess_1.WarmupPhase).includes(phase)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid warmup phase'
            });
        }
        const result = await warmupService.startPhase(accountId, phase, botId, sessionId);
        res.json({
            success: result.success,
            data: result,
            bot_id: botId,
            session_id: sessionId
        });
    }
    catch (error) {
        console.error('Error starting warmup phase:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start warmup phase',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/complete-phase/:phase', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const phase = req.params.phase;
        const botId = req.botId;
        const { execution_time_ms, instagram_response, performance_score, engagement_metrics } = req.body;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        if (!Object.values(warmupProcess_1.WarmupPhase).includes(phase)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid warmup phase'
            });
        }
        const result = await warmupService.completePhase(accountId, phase, botId, execution_time_ms, instagram_response);
        if (result.success && result.phaseId) {
            try {
                const assignedContent = await contentService.getAssignedContent(result.phaseId);
                if (assignedContent) {
                    await contentService.markContentAsUsed(assignedContent.id, true, performance_score, engagement_metrics);
                }
            }
            catch (contentError) {
                console.warn('Failed to mark content as used:', contentError);
            }
        }
        res.json({
            success: result.success,
            data: result,
            bot_id: botId,
            session_id: req.sessionId
        });
    }
    catch (error) {
        console.error('Error completing warmup phase:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete warmup phase',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/fail-phase/:phase', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const phase = req.params.phase;
        const botId = req.botId;
        const { error_message, error_details, failure_type = 'bot_error', instagram_response, should_escalate_to_review = false } = req.body;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        if (!Object.values(warmupProcess_1.WarmupPhase).includes(phase)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid warmup phase'
            });
        }
        if (!error_message) {
            return res.status(400).json({
                success: false,
                error: 'Error message is required'
            });
        }
        const validFailureTypes = [
            'bot_error', 'instagram_challenge', 'content_rejection', 'captcha',
            'rate_limit', 'account_suspended', 'network_error', 'timeout', 'other'
        ];
        if (!validFailureTypes.includes(failure_type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid failure type',
                validFailureTypes
            });
        }
        const result = await warmupService.failPhase(accountId, phase, botId, error_message, error_details, failure_type, should_escalate_to_review);
        if (result.phaseId) {
            try {
                const assignedContent = await contentService.getAssignedContent(result.phaseId);
                if (assignedContent) {
                    await contentService.markContentAsUsed(assignedContent.id, false, 0, { error_message, error_details });
                }
            }
            catch (contentError) {
                console.warn('Failed to mark content as failed:', contentError);
            }
        }
        res.json({
            success: result.success,
            data: result,
            bot_id: botId,
            session_id: req.sessionId
        });
    }
    catch (error) {
        console.error('Error failing warmup phase:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fail warmup phase',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/complete-warmup', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const botId = req.botId;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const isComplete = await warmupService.isWarmupComplete(accountId);
        if (!isComplete) {
            return res.status(400).json({
                success: false,
                error: 'Warmup process is not complete yet'
            });
        }
        const status = await warmupService.getWarmupStatus(accountId);
        res.json({
            success: true,
            data: {
                account_id: accountId,
                warmup_complete: true,
                lifecycle_state: status.lifecycle_state,
                message: 'Warmup process completed successfully'
            },
            bot_id: botId,
            session_id: req.sessionId
        });
    }
    catch (error) {
        console.error('Error completing warmup process:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete warmup process',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/create-containers', async (req, res) => {
    try {
        const { count, startNumber, iphoneUrl } = req.body;
        if (!count || !startNumber || count < 1 || startNumber < 1) {
            return res.status(400).json({
                success: false,
                error: 'Invalid parameters',
                message: 'Count and startNumber must be positive integers'
            });
        }
        if (count > 50) {
            return res.status(400).json({
                success: false,
                error: 'Count too large',
                message: 'Cannot create more than 50 containers at once'
            });
        }
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });
        const sendEvent = (data) => {
            res.write(`data: ${JSON.stringify(data)}\n\n`);
        };
        sendEvent({
            type: 'start',
            message: 'Container creation process initiated',
            count,
            startNumber,
            iphoneUrl: iphoneUrl || 'default',
            botId: req.botId,
            sessionId: req.sessionId
        });
        try {
            const BatchContainerCreator = require('../../../../bot/scripts/container_creation/batch_create_containers.js');
            const creator = new BatchContainerCreator(iphoneUrl || 'http://192.168.178.65:46952', (update) => {
                sendEvent({
                    ...update,
                    timestamp: new Date().toISOString()
                });
            });
            const connectionTest = await creator.testConnection();
            if (!connectionTest) {
                sendEvent({
                    type: 'error',
                    message: 'iPhone connection test failed',
                    status: 'connection_failed',
                    final: true
                });
                res.end();
                return;
            }
            const results = await creator.createContainers(count, startNumber);
            sendEvent({
                type: 'final_results',
                message: 'Container creation process completed',
                results,
                status: results.successful === results.total ? 'success' : 'partial_success',
                final: true
            });
        }
        catch (error) {
            console.error('Container creation error:', error);
            sendEvent({
                type: 'error',
                message: `Container creation failed: ${error.message}`,
                error: error.message,
                status: 'failed',
                final: true
            });
        }
        res.end();
    }
    catch (error) {
        console.error('Container creation endpoint error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
function getPhaseInstructions(phase) {
    const instructions = {
        [warmupProcess_1.WarmupPhase.MANUAL_SETUP]: 'Complete manual account setup. Set up proxy, verify login, and prepare for automated warmup.',
        [warmupProcess_1.WarmupPhase.BIO]: 'Update bio using the assigned text. Keep it natural and avoid spam-like content.',
        [warmupProcess_1.WarmupPhase.GENDER]: 'Update gender to female in account settings. No content assignment needed.',
        [warmupProcess_1.WarmupPhase.NAME]: 'Update display name using the assigned text. Choose a natural-sounding name.',
        [warmupProcess_1.WarmupPhase.USERNAME]: 'Update username. IMPORTANT: Update database after successful change.',
        [warmupProcess_1.WarmupPhase.FIRST_HIGHLIGHT]: 'Create first story highlight using assigned image and group name. This enables future highlights.',
        [warmupProcess_1.WarmupPhase.NEW_HIGHLIGHT]: 'Create additional story highlight. Requires first highlight to be completed.',
        [warmupProcess_1.WarmupPhase.POST_CAPTION]: 'Create post using assigned image and caption text. Wait for engagement.',
        [warmupProcess_1.WarmupPhase.POST_NO_CAPTION]: 'Create post using assigned image only. No caption text.',
        [warmupProcess_1.WarmupPhase.STORY_CAPTION]: 'Post story using assigned image and caption text. Stories disappear after 24 hours.',
        [warmupProcess_1.WarmupPhase.STORY_NO_CAPTION]: 'Post story using assigned image only. No caption text.'
    };
    return instructions[phase] || 'Follow standard Instagram content guidelines.';
}
exports.default = router;
//# sourceMappingURL=accounts.js.map