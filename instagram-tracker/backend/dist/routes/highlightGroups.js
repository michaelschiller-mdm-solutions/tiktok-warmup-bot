"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const joi_1 = __importDefault(require("joi"));
const HighlightGroupService_1 = require("../services/HighlightGroupService");
const router = express_1.default.Router();
const highlightGroupService = new HighlightGroupService_1.HighlightGroupService();
const createHighlightGroupSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(255).required(),
    description: joi_1.default.string().max(1000).optional(),
    sprint_type: joi_1.default.string().min(1).max(100).required(),
    location: joi_1.default.string().max(255).optional(),
    max_content_items: joi_1.default.number().integer().min(1).max(100).default(100),
    available_months: joi_1.default.array().items(joi_1.default.number().integer().min(1).max(12)).default([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    cooldown_hours: joi_1.default.number().integer().min(1).default(504),
    blocks_sprints: joi_1.default.array().items(joi_1.default.number().integer()).default([]),
    blocks_highlight_groups: joi_1.default.array().items(joi_1.default.number().integer()).default([]),
    maintenance_images_min: joi_1.default.number().integer().min(1).default(1),
    maintenance_images_max: joi_1.default.number().integer().min(1).default(2),
    maintenance_frequency_weeks_min: joi_1.default.number().integer().min(1).default(2),
    maintenance_frequency_weeks_max: joi_1.default.number().integer().min(1).default(4)
});
const updateHighlightGroupSchema = joi_1.default.object({
    name: joi_1.default.string().min(1).max(255).optional(),
    description: joi_1.default.string().max(1000).optional(),
    sprint_type: joi_1.default.string().min(1).max(100).optional(),
    location: joi_1.default.string().max(255).optional(),
    max_content_items: joi_1.default.number().integer().min(1).max(100).optional(),
    available_months: joi_1.default.array().items(joi_1.default.number().integer().min(1).max(12)).optional(),
    cooldown_hours: joi_1.default.number().integer().min(1).optional(),
    blocks_sprints: joi_1.default.array().items(joi_1.default.number().integer()).optional(),
    blocks_highlight_groups: joi_1.default.array().items(joi_1.default.number().integer()).optional(),
    maintenance_images_min: joi_1.default.number().integer().min(1).optional(),
    maintenance_images_max: joi_1.default.number().integer().min(1).optional(),
    maintenance_frequency_weeks_min: joi_1.default.number().integer().min(1).optional(),
    maintenance_frequency_weeks_max: joi_1.default.number().integer().min(1).optional()
});
const assignHighlightGroupSchema = joi_1.default.object({
    account_ids: joi_1.default.array().items(joi_1.default.number().integer()).min(1).required(),
    highlight_name: joi_1.default.string().min(1).max(255).required(),
    maintenance_frequency_hours: joi_1.default.number().integer().min(1).default(504),
    is_active: joi_1.default.boolean().default(true)
});
const maintenanceScheduleSchema = joi_1.default.object({
    account_ids: joi_1.default.array().items(joi_1.default.number().integer()).optional(),
    maintenance_frequency_hours: joi_1.default.number().integer().min(1).default(504),
    immediate_execution: joi_1.default.boolean().default(false)
});
const positionUpdateSchema = joi_1.default.object({
    highlight_assignments: joi_1.default.array().items(joi_1.default.object({
        assignment_id: joi_1.default.number().integer().required(),
        new_position: joi_1.default.number().integer().min(1).required()
    })).min(1).required()
});
const contentBatchSchema = joi_1.default.object({
    batch_name: joi_1.default.string().min(1).max(255).required(),
    available_months: joi_1.default.array().items(joi_1.default.number().integer().min(1).max(12)).min(1).required(),
    content_item_ids: joi_1.default.array().items(joi_1.default.number().integer()).min(1).required(),
    is_active: joi_1.default.boolean().default(true)
});
router.get('/', async (req, res) => {
    try {
        const { sprint_type, location, search, page = 1, limit = 50 } = req.query;
        const filters = {
            sprint_type: sprint_type,
            location: location,
            search: search
        };
        Object.keys(filters).forEach(key => {
            if (filters[key] === undefined) {
                delete filters[key];
            }
        });
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const result = await highlightGroupService.getHighlightGroups(filters, pageNum, limitNum);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error fetching highlight groups:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch highlight groups',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const { error, value } = createHighlightGroupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        const highlightGroup = await highlightGroupService.createHighlightGroup(value);
        res.status(201).json({
            success: true,
            data: highlightGroup
        });
    }
    catch (error) {
        console.error('Error creating highlight group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create highlight group',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid highlight group ID'
            });
        }
        const highlightGroup = await highlightGroupService.getHighlightGroupById(id);
        if (!highlightGroup) {
            return res.status(404).json({
                success: false,
                error: 'Highlight group not found'
            });
        }
        res.json({
            success: true,
            data: highlightGroup
        });
    }
    catch (error) {
        console.error('Error fetching highlight group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch highlight group',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid highlight group ID'
            });
        }
        const { error, value } = updateHighlightGroupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        const highlightGroup = await highlightGroupService.updateHighlightGroup(id, value);
        if (!highlightGroup) {
            return res.status(404).json({
                success: false,
                error: 'Highlight group not found'
            });
        }
        res.json({
            success: true,
            data: highlightGroup
        });
    }
    catch (error) {
        console.error('Error updating highlight group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update highlight group',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid highlight group ID'
            });
        }
        const success = await highlightGroupService.deleteHighlightGroup(id);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Highlight group not found'
            });
        }
        res.json({
            success: true,
            message: 'Highlight group deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting highlight group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete highlight group',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/assign-accounts', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid highlight group ID'
            });
        }
        const { error, value } = assignHighlightGroupSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        const result = await highlightGroupService.assignToAccounts(id, value);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error assigning highlight group:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign highlight group',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id/assignments', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid highlight group ID'
            });
        }
        const assignments = await highlightGroupService.getAssignments(id);
        res.json({
            success: true,
            data: assignments
        });
    }
    catch (error) {
        console.error('Error fetching assignments:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch assignments',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.delete('/assignments/:assignmentId', async (req, res) => {
    try {
        const assignmentId = parseInt(req.params.assignmentId);
        if (isNaN(assignmentId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid assignment ID'
            });
        }
        const success = await highlightGroupService.removeAssignment(assignmentId);
        if (!success) {
            return res.status(404).json({
                success: false,
                error: 'Assignment not found'
            });
        }
        res.json({
            success: true,
            message: 'Assignment removed successfully'
        });
    }
    catch (error) {
        console.error('Error removing assignment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to remove assignment',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/schedule-maintenance', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid highlight group ID'
            });
        }
        const { error, value } = maintenanceScheduleSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        const result = await highlightGroupService.scheduleMaintenanceForGroup(id, value);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error scheduling maintenance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to schedule maintenance',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.put('/accounts/:accountId/positions', async (req, res) => {
    try {
        const accountId = parseInt(req.params.accountId);
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const { error, value } = positionUpdateSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        const success = await highlightGroupService.updatePositions(accountId, value);
        res.json({
            success: true,
            data: { updated: success }
        });
    }
    catch (error) {
        console.error('Error updating positions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update positions',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id/analytics', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid highlight group ID'
            });
        }
        const analytics = await highlightGroupService.getGroupAnalytics(id);
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch analytics',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/maintenance-status', async (req, res) => {
    try {
        const status = await highlightGroupService.getSystemMaintenanceOverview();
        res.json({
            success: true,
            data: status
        });
    }
    catch (error) {
        console.error('Error fetching maintenance status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch maintenance status',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.post('/:id/content-batches', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid highlight group ID'
            });
        }
        const { error, value } = contentBatchSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Validation error',
                details: error.details.map(d => d.message)
            });
        }
        const batch = await highlightGroupService.createContentBatch(id, value);
        res.status(201).json({
            success: true,
            data: batch
        });
    }
    catch (error) {
        console.error('Error creating content batch:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create content batch',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
router.get('/:id/content-batches', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid highlight group ID'
            });
        }
        const batches = await highlightGroupService.getContentBatches(id);
        res.json({
            success: true,
            data: batches
        });
    }
    catch (error) {
        console.error('Error fetching content batches:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch content batches',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
//# sourceMappingURL=highlightGroups.js.map