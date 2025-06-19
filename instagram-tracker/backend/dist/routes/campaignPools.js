"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CampaignPoolService_1 = require("../services/CampaignPoolService");
const PoolAssignmentService_1 = require("../services/PoolAssignmentService");
const router = express_1.default.Router();
const campaignPoolService = new CampaignPoolService_1.CampaignPoolService();
const poolAssignmentService = new PoolAssignmentService_1.PoolAssignmentService();
router.get('/', async (req, res) => {
    try {
        const { strategy, is_template, template_category, limit = 50, offset = 0 } = req.query;
        const filters = {
            strategy,
            is_template: is_template !== undefined ? is_template === 'true' : undefined,
            template_category,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
        const result = await campaignPoolService.listPools(filters);
        res.json({
            success: true,
            data: result.pools,
            metadata: {
                total_records: result.total_count,
                limit: filters.limit,
                offset: filters.offset,
                has_next: (filters.offset + filters.limit) < result.total_count,
                has_previous: filters.offset > 0
            }
        });
    }
    catch (error) {
        console.error('Error listing campaign pools:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to list campaign pools'
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const { name, description, sprint_ids, assignment_strategy, time_horizon_days } = req.body;
        if (!name || !sprint_ids || !Array.isArray(sprint_ids) || sprint_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Name and sprint_ids are required, sprint_ids must be a non-empty array'
            });
        }
        const poolData = {
            name,
            description,
            sprint_ids,
            assignment_strategy: assignment_strategy || 'random',
            time_horizon_days: time_horizon_days || 30
        };
        const pool = await campaignPoolService.createPool(poolData);
        res.status(201).json({
            success: true,
            data: pool,
            message: 'Campaign pool created successfully'
        });
    }
    catch (error) {
        console.error('Error creating campaign pool:', error);
        if (error instanceof Error && error.message.includes('incompatible sprints')) {
            return res.status(400).json({
                success: false,
                error: 'Compatibility Error',
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to create campaign pool'
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const poolId = parseInt(req.params.id);
        if (isNaN(poolId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid pool ID'
            });
        }
        const pool = await campaignPoolService.getPool(poolId);
        if (!pool) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: `Campaign pool ${poolId} not found`
            });
        }
        res.json({
            success: true,
            data: pool
        });
    }
    catch (error) {
        console.error('Error getting campaign pool:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get campaign pool'
        });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const poolId = parseInt(req.params.id);
        if (isNaN(poolId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid pool ID'
            });
        }
        const updates = req.body;
        const pool = await campaignPoolService.updatePool(poolId, updates);
        res.json({
            success: true,
            data: pool,
            message: 'Campaign pool updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating campaign pool:', error);
        if (error instanceof Error && error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error instanceof Error && error.message.includes('incompatible sprints')) {
            return res.status(400).json({
                success: false,
                error: 'Compatibility Error',
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to update campaign pool'
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const poolId = parseInt(req.params.id);
        if (isNaN(poolId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid pool ID'
            });
        }
        await campaignPoolService.deletePool(poolId);
        res.json({
            success: true,
            message: 'Campaign pool deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting campaign pool:', error);
        if (error instanceof Error && error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error instanceof Error && error.message.includes('active assignments')) {
            return res.status(400).json({
                success: false,
                error: 'Conflict Error',
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to delete campaign pool'
        });
    }
});
router.post('/:id/validate', async (req, res) => {
    try {
        const poolId = parseInt(req.params.id);
        if (isNaN(poolId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid pool ID'
            });
        }
        const pool = await campaignPoolService.getPool(poolId);
        if (!pool) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: `Campaign pool ${poolId} not found`
            });
        }
        const compatibility = await campaignPoolService.validateSprintCompatibility(pool.sprint_ids);
        res.json({
            success: true,
            data: compatibility
        });
    }
    catch (error) {
        console.error('Error validating campaign pool:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to validate campaign pool'
        });
    }
});
router.post('/:id/assign', async (req, res) => {
    try {
        const poolId = parseInt(req.params.id);
        if (isNaN(poolId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid pool ID'
            });
        }
        const { strategy = 'random', account_ids, max_assignments, start_date, respect_cooldowns = true } = req.body;
        const options = {
            strategy,
            account_ids,
            max_assignments,
            start_date: start_date ? new Date(start_date) : undefined,
            respect_cooldowns
        };
        const result = await poolAssignmentService.assignPoolToAccounts(poolId, options);
        res.json({
            success: true,
            data: result,
            message: `Successfully assigned pool to ${result.total_accounts_assigned} accounts`
        });
    }
    catch (error) {
        console.error('Error assigning campaign pool:', error);
        if (error instanceof Error && error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: error.message
            });
        }
        if (error instanceof Error && error.message.includes('compatibility')) {
            return res.status(400).json({
                success: false,
                error: 'Compatibility Error',
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to assign campaign pool'
        });
    }
});
router.post('/:id/assign/preview', async (req, res) => {
    try {
        const poolId = parseInt(req.params.id);
        if (isNaN(poolId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid pool ID'
            });
        }
        const { strategy = 'random', account_ids, max_assignments, start_date, respect_cooldowns = true } = req.body;
        const options = {
            strategy,
            account_ids,
            max_assignments,
            start_date: start_date ? new Date(start_date) : undefined,
            respect_cooldowns
        };
        const preview = await poolAssignmentService.previewAssignment(poolId, options);
        res.json({
            success: true,
            data: preview
        });
    }
    catch (error) {
        console.error('Error previewing assignment:', error);
        if (error instanceof Error && error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: error.message
            });
        }
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to preview assignment'
        });
    }
});
router.get('/:id/stats', async (req, res) => {
    try {
        const poolId = parseInt(req.params.id);
        if (isNaN(poolId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid pool ID'
            });
        }
        const stats = await campaignPoolService.getPoolStats(poolId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error getting pool stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get pool statistics'
        });
    }
});
router.post('/bulk-assign', async (req, res) => {
    try {
        const { pool_assignments } = req.body;
        if (!pool_assignments || !Array.isArray(pool_assignments)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'pool_assignments must be an array'
            });
        }
        const result = await poolAssignmentService.bulkAssignPools({ pool_assignments });
        res.json({
            success: true,
            data: result,
            message: `Bulk assignment completed: ${result.successful_pools} successful, ${result.failed_pools} failed`
        });
    }
    catch (error) {
        console.error('Error in bulk assignment:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to perform bulk assignment'
        });
    }
});
exports.default = router;
//# sourceMappingURL=campaignPools.js.map