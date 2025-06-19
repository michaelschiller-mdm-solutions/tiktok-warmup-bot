"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const QueueManagementService_1 = require("../services/QueueManagementService");
const QueueControlService_1 = require("../services/QueueControlService");
const router = express_1.default.Router();
const queueManager = new QueueManagementService_1.QueueManagementService();
const queueController = new QueueControlService_1.QueueControlService();
router.get('/', async (req, res) => {
    try {
        const filters = {
            account_id: req.query.account_id ? parseInt(req.query.account_id) : undefined,
            sprint_assignment_id: req.query.sprint_assignment_id ? parseInt(req.query.sprint_assignment_id) : undefined,
            content_type: req.query.content_type,
            status: req.query.status,
            emergency_content: req.query.emergency_content === 'true' ? true : req.query.emergency_content === 'false' ? false : undefined,
            scheduled_from: req.query.scheduled_from ? new Date(req.query.scheduled_from) : undefined,
            scheduled_to: req.query.scheduled_to ? new Date(req.query.scheduled_to) : undefined,
            limit: req.query.limit ? parseInt(req.query.limit) : undefined,
            offset: req.query.offset ? parseInt(req.query.offset) : undefined,
            sort_by: req.query.sort_by,
            sort_order: req.query.sort_order
        };
        const result = await queueManager.getQueueItems(filters);
        res.json({
            success: true,
            data: result.items,
            metadata: {
                total_count: result.total_count,
                page_info: result.page_info,
                filters_applied: filters
            }
        });
    }
    catch (error) {
        console.error('Get queue items error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to retrieve queue items'
        });
    }
});
router.get('/account/:id', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid account ID'
            });
        }
        const queueItems = await queueManager.getAccountQueue(accountId);
        res.json({
            success: true,
            data: queueItems,
            metadata: {
                account_id: accountId,
                total_items: queueItems.length
            }
        });
    }
    catch (error) {
        console.error('Get account queue error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to retrieve account queue'
        });
    }
});
router.get('/upcoming', async (req, res) => {
    try {
        const hours = req.query.hours ? parseInt(req.query.hours) : 24;
        const upcomingContent = await queueManager.getUpcomingContent(hours);
        res.json({
            success: true,
            data: upcomingContent,
            metadata: {
                time_window_hours: hours,
                total_items: upcomingContent.length
            }
        });
    }
    catch (error) {
        console.error('Get upcoming content error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to retrieve upcoming content'
        });
    }
});
router.get('/overdue', async (req, res) => {
    try {
        const overdueContent = await queueManager.getOverdueContent();
        res.json({
            success: true,
            data: overdueContent,
            metadata: {
                total_overdue: overdueContent.length
            }
        });
    }
    catch (error) {
        console.error('Get overdue content error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to retrieve overdue content'
        });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const stats = await queueManager.getQueueStats();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Get queue stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to retrieve queue statistics'
        });
    }
});
router.get('/health', async (req, res) => {
    try {
        const healthReport = await queueManager.checkQueueHealth();
        res.json({
            success: true,
            data: healthReport
        });
    }
    catch (error) {
        console.error('Get queue health error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to check queue health'
        });
    }
});
router.get('/summary', async (req, res) => {
    try {
        const summary = await queueManager.getQueueSummary();
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error('Get queue summary error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to retrieve queue summary'
        });
    }
});
router.put('/:id/reschedule', async (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        const { new_time } = req.body;
        if (isNaN(itemId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid item ID'
            });
        }
        if (!new_time) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'new_time is required'
            });
        }
        const newTime = new Date(new_time);
        if (isNaN(newTime.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid date format for new_time'
            });
        }
        const validation = await queueController.validateQueueItemModification(itemId);
        if (!validation.can_modify) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: validation.reason
            });
        }
        await queueController.rescheduleItem(itemId, newTime);
        res.json({
            success: true,
            message: 'Item rescheduled successfully',
            data: {
                item_id: itemId,
                new_scheduled_time: newTime
            }
        });
    }
    catch (error) {
        console.error('Reschedule item error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Failed to reschedule item'
        });
    }
});
router.post('/:id/retry', async (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        if (isNaN(itemId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid item ID'
            });
        }
        await queueController.retryFailedItem(itemId);
        res.json({
            success: true,
            message: 'Item retry initiated successfully',
            data: {
                item_id: itemId
            }
        });
    }
    catch (error) {
        console.error('Retry item error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Failed to retry item'
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const itemId = parseInt(req.params.id);
        if (isNaN(itemId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid item ID'
            });
        }
        const validation = await queueController.validateQueueItemModification(itemId);
        if (!validation.can_modify) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: validation.reason
            });
        }
        await queueController.removeFromQueue(itemId);
        res.json({
            success: true,
            message: 'Item removed from queue successfully',
            data: {
                item_id: itemId
            }
        });
    }
    catch (error) {
        console.error('Remove item error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Failed to remove item'
        });
    }
});
router.put('/bulk-update', async (req, res) => {
    try {
        const { updates } = req.body;
        if (!Array.isArray(updates) || updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'updates array is required and must not be empty'
            });
        }
        for (const update of updates) {
            if (!update.item_id || typeof update.item_id !== 'number') {
                return res.status(400).json({
                    success: false,
                    error: 'Validation Error',
                    message: 'Each update must have a valid item_id'
                });
            }
        }
        const result = await queueController.bulkUpdateQueue(updates);
        res.json({
            success: true,
            message: 'Bulk update completed',
            data: result
        });
    }
    catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to perform bulk update'
        });
    }
});
router.post('/emergency-insert', async (req, res) => {
    try {
        const emergencyRequest = req.body;
        if (!emergencyRequest.account_id || !emergencyRequest.content_type || !emergencyRequest.strategy) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'account_id, content_type, and strategy are required'
            });
        }
        if (!['story', 'post', 'highlight'].includes(emergencyRequest.content_type)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'content_type must be story, post, or highlight'
            });
        }
        if (!['pause_sprints', 'post_alongside', 'override_conflicts'].includes(emergencyRequest.strategy)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'strategy must be pause_sprints, post_alongside, or override_conflicts'
            });
        }
        res.json({
            success: true,
            message: 'Emergency content insertion request received',
            data: {
                account_id: emergencyRequest.account_id,
                content_type: emergencyRequest.content_type,
                strategy: emergencyRequest.strategy,
                priority: emergencyRequest.priority || 1,
                status: 'pending_implementation'
            }
        });
    }
    catch (error) {
        console.error('Emergency insert error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to insert emergency content'
        });
    }
});
router.post('/cleanup', async (req, res) => {
    try {
        const { days_old = 30 } = req.body;
        if (days_old < 1 || days_old > 365) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'days_old must be between 1 and 365'
            });
        }
        const deletedCount = await queueController.cleanupOldQueueItems(days_old);
        res.json({
            success: true,
            message: 'Cleanup completed successfully',
            data: {
                deleted_items: deletedCount,
                days_old: days_old
            }
        });
    }
    catch (error) {
        console.error('Cleanup error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to cleanup old items'
        });
    }
});
exports.default = router;
//# sourceMappingURL=contentQueue.js.map