"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const EmergencyContentService_1 = require("../services/EmergencyContentService");
const router = express_1.default.Router();
const emergencyContentService = new EmergencyContentService_1.EmergencyContentService();
router.post('/inject', async (req, res) => {
    try {
        const request = req.body;
        if (!request.emergency_content || !request.conflict_strategy) {
            return res.status(400).json({
                error: 'Missing required fields: emergency_content and conflict_strategy are required'
            });
        }
        if (!request.emergency_content.file_path ||
            !request.emergency_content.file_name ||
            !request.emergency_content.content_type) {
            return res.status(400).json({
                error: 'Invalid emergency content: file_path, file_name, and content_type are required'
            });
        }
        const result = await emergencyContentService.injectEmergencyContent(request);
        res.status(200).json({
            success: true,
            data: result,
            message: result.summary
        });
    }
    catch (error) {
        console.error('Emergency content injection failed:', error);
        res.status(500).json({
            error: 'Failed to inject emergency content',
            details: error.message
        });
    }
});
router.post('/preview', async (req, res) => {
    try {
        const request = req.body;
        if (!request.emergency_content || !request.conflict_strategy) {
            return res.status(400).json({
                error: 'Missing required fields: emergency_content and conflict_strategy are required'
            });
        }
        const preview = await emergencyContentService.previewEmergencyInjection(request);
        res.status(200).json({
            success: true,
            data: preview,
            message: `Preview generated for ${preview.total_target_accounts} accounts`
        });
    }
    catch (error) {
        console.error('Emergency content preview failed:', error);
        res.status(500).json({
            error: 'Failed to generate emergency content preview',
            details: error.message
        });
    }
});
router.post('/inject-immediate', async (req, res) => {
    try {
        const { emergency_content, target_account_ids } = req.body;
        if (!emergency_content) {
            return res.status(400).json({
                error: 'emergency_content is required'
            });
        }
        const request = {
            emergency_content: {
                ...emergency_content,
                priority: 'critical',
                post_immediately: true
            },
            target_account_ids,
            target_all_accounts: !target_account_ids,
            conflict_strategy: 'override_conflicts'
        };
        const result = await emergencyContentService.injectEmergencyContent(request);
        res.status(200).json({
            success: true,
            data: result,
            message: `Critical emergency content injected to ${result.total_accounts_affected} accounts`
        });
    }
    catch (error) {
        console.error('Immediate emergency injection failed:', error);
        res.status(500).json({
            error: 'Failed to inject immediate emergency content',
            details: error.message
        });
    }
});
router.post('/batch-inject', async (req, res) => {
    try {
        const { batch_requests } = req.body;
        if (!Array.isArray(batch_requests) || batch_requests.length === 0) {
            return res.status(400).json({
                error: 'batch_requests must be a non-empty array'
            });
        }
        const results = [];
        let totalSuccessful = 0;
        let totalFailed = 0;
        for (let i = 0; i < batch_requests.length; i++) {
            try {
                const request = batch_requests[i];
                const result = await emergencyContentService.injectEmergencyContent(request);
                results.push({
                    index: i,
                    success: true,
                    result: result,
                    accounts_affected: result.total_accounts_affected
                });
                totalSuccessful += result.total_accounts_affected;
            }
            catch (error) {
                results.push({
                    index: i,
                    success: false,
                    error: error.message,
                    accounts_affected: 0
                });
                totalFailed++;
            }
        }
        res.status(200).json({
            success: true,
            data: {
                batch_results: results,
                summary: {
                    total_requests: batch_requests.length,
                    successful_requests: results.filter(r => r.success).length,
                    failed_requests: results.filter(r => !r.success).length,
                    total_accounts_affected: totalSuccessful
                }
            },
            message: `Batch emergency injection completed: ${results.filter(r => r.success).length}/${batch_requests.length} requests successful`
        });
    }
    catch (error) {
        console.error('Batch emergency injection failed:', error);
        res.status(500).json({
            error: 'Failed to process batch emergency injection',
            details: error.message
        });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        const stats = {
            period: {
                start_date: startDate,
                end_date: endDate,
                days: parseInt(days)
            },
            injections: {
                total: 0,
                successful: 0,
                failed: 0,
                success_rate: 0
            },
            strategies: {
                pause_sprints: 0,
                post_alongside: 0,
                override_conflicts: 0,
                skip_conflicted: 0
            },
            priorities: {
                critical: 0,
                high: 0,
                standard: 0
            },
            conflicts: {
                total_detected: 0,
                total_resolved: 0,
                resolution_rate: 0
            },
            performance: {
                avg_execution_time_ms: 0,
                accounts_per_injection: 0
            }
        };
        res.status(200).json({
            success: true,
            data: stats,
            message: `Emergency content statistics for the last ${days} days`
        });
    }
    catch (error) {
        console.error('Failed to get emergency content stats:', error);
        res.status(500).json({
            error: 'Failed to retrieve emergency content statistics',
            details: error.message
        });
    }
});
router.post('/validate', async (req, res) => {
    try {
        const { emergency_content } = req.body;
        if (!emergency_content) {
            return res.status(400).json({
                error: 'emergency_content is required'
            });
        }
        const validation = {
            valid: true,
            errors: [],
            warnings: []
        };
        if (!emergency_content.file_path) {
            validation.errors.push('file_path is required');
            validation.valid = false;
        }
        if (!emergency_content.file_name) {
            validation.errors.push('file_name is required');
            validation.valid = false;
        }
        if (!emergency_content.content_type) {
            validation.errors.push('content_type is required');
            validation.valid = false;
        }
        if (!['story', 'post', 'highlight'].includes(emergency_content.content_type)) {
            validation.errors.push('content_type must be story, post, or highlight');
            validation.valid = false;
        }
        if (!['critical', 'high', 'standard'].includes(emergency_content.priority)) {
            validation.errors.push('priority must be critical, high, or standard');
            validation.valid = false;
        }
        if (emergency_content.location_context && emergency_content.theme_context) {
            const incompatiblePairs = [
                ['vacation', 'work'],
                ['vacation', 'university']
            ];
            const hasIncompatibleTheme = incompatiblePairs.some(([loc, theme]) => emergency_content.location_context.includes(loc) &&
                emergency_content.theme_context.includes(theme));
            if (hasIncompatibleTheme) {
                validation.warnings.push('Location and theme combination may cause conflicts');
            }
        }
        if (emergency_content.post_immediately && emergency_content.priority === 'standard') {
            validation.warnings.push('Consider using higher priority for immediate posting');
        }
        res.status(200).json({
            success: true,
            data: validation,
            message: validation.valid ? 'Emergency content is valid' : 'Emergency content has validation errors'
        });
    }
    catch (error) {
        console.error('Emergency content validation failed:', error);
        res.status(500).json({
            error: 'Failed to validate emergency content',
            details: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=emergencyContent.js.map