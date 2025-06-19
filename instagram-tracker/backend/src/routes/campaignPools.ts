import express from 'express';
import { CampaignPoolService } from '../services/CampaignPoolService';
import { PoolAssignmentService } from '../services/PoolAssignmentService';

const router = express.Router();
const campaignPoolService = new CampaignPoolService();
const poolAssignmentService = new PoolAssignmentService();

// GET /api/campaign-pools - List campaign pools
router.get('/', async (req: any, res: any) => {
  try {
    const {
      strategy,
      is_template,
      template_category,
      limit = 50,
      offset = 0
    } = req.query;

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

  } catch (error) {
    console.error('Error listing campaign pools:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to list campaign pools'
    });
  }
});

// POST /api/campaign-pools - Create new campaign pool
router.post('/', async (req: any, res: any) => {
  try {
    const { name, description, sprint_ids, assignment_strategy, time_horizon_days } = req.body;

    // Validate required fields
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

  } catch (error) {
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

// GET /api/campaign-pools/:id - Get campaign pool details
router.get('/:id', async (req: any, res: any) => {
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

  } catch (error) {
    console.error('Error getting campaign pool:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get campaign pool'
    });
  }
});

// PUT /api/campaign-pools/:id - Update campaign pool
router.put('/:id', async (req: any, res: any) => {
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

  } catch (error) {
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

// DELETE /api/campaign-pools/:id - Delete campaign pool
router.delete('/:id', async (req: any, res: any) => {
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

  } catch (error) {
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

// POST /api/campaign-pools/:id/validate - Validate pool compatibility
router.post('/:id/validate', async (req: any, res: any) => {
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

  } catch (error) {
    console.error('Error validating campaign pool:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to validate campaign pool'
    });
  }
});

// POST /api/campaign-pools/:id/assign - Assign pool to accounts
router.post('/:id/assign', async (req: any, res: any) => {
  try {
    const poolId = parseInt(req.params.id);

    if (isNaN(poolId)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid pool ID'
      });
    }

    const {
      strategy = 'random',
      account_ids,
      max_assignments,
      start_date,
      respect_cooldowns = true
    } = req.body;

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

  } catch (error) {
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

// POST /api/campaign-pools/:id/assign/preview - Preview assignment
router.post('/:id/assign/preview', async (req: any, res: any) => {
  try {
    const poolId = parseInt(req.params.id);

    if (isNaN(poolId)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid pool ID'
      });
    }

    const {
      strategy = 'random',
      account_ids,
      max_assignments,
      start_date,
      respect_cooldowns = true
    } = req.body;

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

  } catch (error) {
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

// GET /api/campaign-pools/:id/stats - Get pool statistics
router.get('/:id/stats', async (req: any, res: any) => {
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

  } catch (error) {
    console.error('Error getting pool stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get pool statistics'
    });
  }
});

// POST /api/campaign-pools/bulk-assign - Bulk assign multiple pools
router.post('/bulk-assign', async (req: any, res: any) => {
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

  } catch (error) {
    console.error('Error in bulk assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to perform bulk assignment'
    });
  }
});

// POST /api/campaign-pools/check-compatibility - Check sprint compatibility
router.post('/check-compatibility', async (req: any, res: any) => {
  try {
    const { sprint_ids } = req.body;

    if (!sprint_ids || !Array.isArray(sprint_ids) || sprint_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'sprint_ids must be a non-empty array'
      });
    }

    const compatibility = await campaignPoolService.validateSprintCompatibility(sprint_ids);

    res.json({
      success: true,
      data: compatibility
    });

  } catch (error) {
    console.error('Error checking sprint compatibility:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to check sprint compatibility'
    });
  }
});

// GET /api/campaign-pools/templates - List pool templates
router.get('/templates', async (req: any, res: any) => {
  try {
    const { category } = req.query;

    const filters = {
      is_template: true,
      template_category: category,
      limit: 100,
      offset: 0
    };

    const result = await campaignPoolService.listPools(filters);

    // Transform pools to template format
    const templates = result.pools.map(pool => ({
      id: pool.id,
      name: pool.name,
      description: pool.description,
      template_category: pool.template_category || 'general',
      sprint_types: [], // This would need to be populated from sprints data
      usage_count: pool.usage_count || 0,
      created_at: pool.created_at
    }));

    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error listing pool templates:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to list pool templates'
    });
  }
});

// POST /api/campaign-pools/templates/:id/create - Create pool from template
router.post('/templates/:id/create', async (req: any, res: any) => {
  try {
    const templateId = parseInt(req.params.id);

    if (isNaN(templateId)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid template ID'
      });
    }

    // Get the template pool
    const template = await campaignPoolService.getPool(templateId);
    
    if (!template || !template.is_template) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Template not found'
      });
    }

    // Create new pool from template with customizations
    const { name, description, ...customizations } = req.body;
    
    const poolData = {
      name: name || `${template.name} (Copy)`,
      description: description || template.description,
      sprint_ids: template.sprint_ids,
      assignment_strategy: customizations.assignment_strategy || template.assignment_strategy,
      time_horizon_days: customizations.time_horizon_days || template.time_horizon_days,
      is_template: false // New pool is not a template by default
    };

    const newPool = await campaignPoolService.createPool(poolData);

    // Update template usage count
    await campaignPoolService.updatePool(templateId, {
      usage_count: (template.usage_count || 0) + 1
    });

    res.status(201).json({
      success: true,
      data: newPool,
      message: 'Pool created from template successfully'
    });

  } catch (error) {
    console.error('Error creating pool from template:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to create pool from template'
    });
  }
});

// POST /api/campaign-pools/:id/save-as-template - Save pool as template
router.post('/:id/save-as-template', async (req: any, res: any) => {
  try {
    const poolId = parseInt(req.params.id);

    if (isNaN(poolId)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid pool ID'
      });
    }

    const { name, category, description } = req.body;

    if (!name || !category) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Template name and category are required'
      });
    }

    // Get the original pool
    const originalPool = await campaignPoolService.getPool(poolId);
    
    if (!originalPool) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Pool not found'
      });
    }

    // Create template pool
    const templateData = {
      name,
      description: description || originalPool.description,
      sprint_ids: originalPool.sprint_ids,
      assignment_strategy: originalPool.assignment_strategy,
      time_horizon_days: originalPool.time_horizon_days,
      is_template: true,
      template_category: category
    };

    const template = await campaignPoolService.createPool(templateData);

    res.status(201).json({
      success: true,
      data: {
        id: template.id,
        name: template.name,
        description: template.description,
        template_category: template.template_category,
        usage_count: 0,
        created_at: template.created_at
      },
      message: 'Pool saved as template successfully'
    });

  } catch (error) {
    console.error('Error saving pool as template:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to save pool as template'
    });
  }
});

export default router; 