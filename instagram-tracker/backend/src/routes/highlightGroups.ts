import express from 'express';
import Joi from 'joi';
import { HighlightGroupService } from '../services/HighlightGroupService';

const router = express.Router();
const highlightGroupService = new HighlightGroupService();

// Validation schemas
const createHighlightGroupSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  sprint_type: Joi.string().min(1).max(100).required(),
  location: Joi.string().max(255).optional(),
  max_content_items: Joi.number().integer().min(1).max(100).default(100),
  available_months: Joi.array().items(Joi.number().integer().min(1).max(12)).default([1,2,3,4,5,6,7,8,9,10,11,12]),
  cooldown_hours: Joi.number().integer().min(1).default(504),
  blocks_sprints: Joi.array().items(Joi.number().integer()).default([]),
  blocks_highlight_groups: Joi.array().items(Joi.number().integer()).default([]),
  maintenance_images_min: Joi.number().integer().min(1).default(1),
  maintenance_images_max: Joi.number().integer().min(1).default(2),
  maintenance_frequency_weeks_min: Joi.number().integer().min(1).default(2),
  maintenance_frequency_weeks_max: Joi.number().integer().min(1).default(4)
});

const updateHighlightGroupSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  sprint_type: Joi.string().min(1).max(100).optional(),
  location: Joi.string().max(255).optional(),
  max_content_items: Joi.number().integer().min(1).max(100).optional(),
  available_months: Joi.array().items(Joi.number().integer().min(1).max(12)).optional(),
  cooldown_hours: Joi.number().integer().min(1).optional(),
  blocks_sprints: Joi.array().items(Joi.number().integer()).optional(),
  blocks_highlight_groups: Joi.array().items(Joi.number().integer()).optional(),
  maintenance_images_min: Joi.number().integer().min(1).optional(),
  maintenance_images_max: Joi.number().integer().min(1).optional(),
  maintenance_frequency_weeks_min: Joi.number().integer().min(1).optional(),
  maintenance_frequency_weeks_max: Joi.number().integer().min(1).optional()
});

const assignHighlightGroupSchema = Joi.object({
  account_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
  highlight_name: Joi.string().min(1).max(255).required(),
  maintenance_frequency_hours: Joi.number().integer().min(1).default(504),
  is_active: Joi.boolean().default(true)
});

const maintenanceScheduleSchema = Joi.object({
  account_ids: Joi.array().items(Joi.number().integer()).optional(),
  maintenance_frequency_hours: Joi.number().integer().min(1).default(504),
  immediate_execution: Joi.boolean().default(false)
});

const positionUpdateSchema = Joi.object({
  highlight_assignments: Joi.array().items(
    Joi.object({
      assignment_id: Joi.number().integer().required(),
      new_position: Joi.number().integer().min(1).required()
    })
  ).min(1).required()
});

const contentBatchSchema = Joi.object({
  batch_name: Joi.string().min(1).max(255).required(),
  available_months: Joi.array().items(Joi.number().integer().min(1).max(12)).min(1).required(),
  content_item_ids: Joi.array().items(Joi.number().integer()).min(1).required(),
  is_active: Joi.boolean().default(true)
});

/**
 * GET /api/highlight-groups
 * Get all highlight groups with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { 
      sprint_type, 
      location, 
      search,
      page = 1, 
      limit = 50
    } = req.query;

    const filters = {
      sprint_type: sprint_type as string,
      location: location as string,
      search: search as string
    };

    // Remove undefined values
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof typeof filters] === undefined) {
        delete filters[key as keyof typeof filters];
      }
    });

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    const result = await highlightGroupService.getHighlightGroups(filters, pageNum, limitNum);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error fetching highlight groups:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch highlight groups',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/highlight-groups
 * Create a new highlight group
 */
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

  } catch (error) {
    console.error('Error creating highlight group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create highlight group',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/highlight-groups/:id
 * Get a specific highlight group
 */
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

  } catch (error) {
    console.error('Error fetching highlight group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch highlight group',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/highlight-groups/:id
 * Update a highlight group
 */
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

  } catch (error) {
    console.error('Error updating highlight group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update highlight group',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/highlight-groups/:id
 * Delete a highlight group
 */
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

  } catch (error) {
    console.error('Error deleting highlight group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete highlight group',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/highlight-groups/:id/assign-accounts
 * Assign highlight group to accounts
 */
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

  } catch (error) {
    console.error('Error assigning highlight group:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign highlight group',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/highlight-groups/:id/assignments
 * Get assignments for a highlight group
 */
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

  } catch (error) {
    console.error('Error fetching assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch assignments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/highlight-groups/assignments/:assignmentId
 * Remove a highlight group assignment
 */
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

  } catch (error) {
    console.error('Error removing assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove assignment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/highlight-groups/:id/schedule-maintenance
 * Schedule maintenance for highlight group
 */
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

  } catch (error) {
    console.error('Error scheduling maintenance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to schedule maintenance',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/accounts/:accountId/highlight-positions
 * Update highlight positions for an account
 */
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

  } catch (error) {
    console.error('Error updating positions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update positions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/highlight-groups/:id/analytics
 * Get analytics for a highlight group
 */
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

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/highlight-groups/maintenance-status
 * Get system-wide maintenance status
 */
router.get('/maintenance-status', async (req, res) => {
  try {
    const status = await highlightGroupService.getSystemMaintenanceOverview();

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch maintenance status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/highlight-groups/:id/content-batches
 * Create content batch for highlight group
 */
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

  } catch (error) {
    console.error('Error creating content batch:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create content batch',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/highlight-groups/:id/content-batches
 * Get content batches for highlight group
 */
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

  } catch (error) {
    console.error('Error fetching content batches:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content batches',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 