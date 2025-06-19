import express from 'express';
import { db } from '../database';
import Joi from 'joi';

const router = express.Router();

// Validation schemas
const createSprintSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  sprint_type: Joi.string().min(1).max(50).required(), // Allow any string for custom types
  location: Joi.string().max(255).optional().allow(null),
  is_highlight_group: Joi.boolean().default(false),
  max_content_items: Joi.number().integer().min(1).max(100).default(20),
  available_months: Joi.array().items(Joi.number().integer().min(1).max(12)).default([1,2,3,4,5,6,7,8,9,10,11,12]),
  cooldown_hours: Joi.number().integer().min(0).default(336),
  blocks_sprints: Joi.array().items(Joi.number().integer()).default([]),
  blocks_highlight_groups: Joi.array().items(Joi.number().integer()).default([]),
  idle_hours_min: Joi.number().integer().min(1).default(24),
  idle_hours_max: Joi.number().integer().min(1).default(48),
  maintenance_images_min: Joi.number().integer().min(1).default(1),
  maintenance_images_max: Joi.number().integer().min(1).default(2),
  maintenance_frequency_weeks_min: Joi.number().integer().min(0).default(2),
  maintenance_frequency_weeks_max: Joi.number().integer().min(0).default(4)
}).unknown(true); // Allow unknown fields and strip them

const updateSprintSchema = createSprintSchema.fork(['name', 'sprint_type'], (schema) => schema.optional());

// Predefined sprint types for suggestions
const PREDEFINED_SPRINT_TYPES = [
  { value: 'vacation', label: 'Vacation', color: '#10B981', icon: '🏖️' },
  { value: 'university', label: 'University', color: '#3B82F6', icon: '🎓' },
  { value: 'home', label: 'Home/Lifestyle', color: '#8B5CF6', icon: '🏠' },
  { value: 'work', label: 'Work/Professional', color: '#6B7280', icon: '💼' },
  { value: 'fitness', label: 'Fitness/Health', color: '#EF4444', icon: '💪' }
];

/**
 * GET /api/sprints/types
 * Get available sprint types (predefined + custom from existing sprints)
 */
router.get('/types', async (req, res) => {
  try {
    // Get unique custom sprint types from existing sprints
    const customTypesResult = await db.query(`
      SELECT DISTINCT sprint_type, COUNT(*) as usage_count
      FROM content_sprints 
      WHERE sprint_type NOT IN ('vacation', 'university', 'home', 'work', 'fitness')
      GROUP BY sprint_type
      ORDER BY usage_count DESC, sprint_type ASC
    `);

    const customTypes = customTypesResult.rows.map(row => ({
      value: row.sprint_type,
      label: row.sprint_type.charAt(0).toUpperCase() + row.sprint_type.slice(1),
      color: '#6B7280', // Default gray for custom types
      icon: '📱', // Default icon for custom types
      isCustom: true,
      usageCount: parseInt(row.usage_count)
    }));

    res.json({
      success: true,
      data: {
        predefined: PREDEFINED_SPRINT_TYPES,
        custom: customTypes,
        all: [...PREDEFINED_SPRINT_TYPES, ...customTypes]
      }
    });

  } catch (error) {
    console.error('Error fetching sprint types:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprint types',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/sprints
 * Get all content sprints with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { 
      type, 
      is_highlight_group, 
      status, 
      location, 
      search,
      page = 1, 
      limit = 50,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query;

    let query = `
      SELECT 
        cs.*,
        COUNT(sci.id) as content_count,
        COUNT(asa.id) as assignment_count,
        COUNT(CASE WHEN asa.status = 'active' THEN 1 END) as active_accounts
      FROM content_sprints cs
      LEFT JOIN sprint_content_items sci ON cs.id = sci.sprint_id
      LEFT JOIN account_sprint_assignments asa ON cs.id = asa.sprint_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (type) {
      query += ` AND cs.sprint_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (is_highlight_group !== undefined) {
      query += ` AND cs.is_highlight_group = $${paramIndex}`;
      params.push(is_highlight_group === 'true');
      paramIndex++;
    }

    if (location) {
      query += ` AND cs.location = $${paramIndex}`;
      params.push(location);
      paramIndex++;
    }

    if (search) {
      query += ` AND (cs.name ILIKE $${paramIndex} OR cs.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Group by for aggregation
    query += ` GROUP BY cs.id`;

    // Apply sorting
    const validSortColumns = ['name', 'sprint_type', 'created_at', 'updated_at', 'content_count', 'assignment_count'];
    const sortColumn = validSortColumns.includes(sort_by as string) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortDirection}`;

    // Apply pagination
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT cs.id) as total
      FROM content_sprints cs
      WHERE 1=1
    `;
    
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (type) {
      countQuery += ` AND cs.sprint_type = $${countParamIndex}`;
      countParams.push(type);
      countParamIndex++;
    }

    if (is_highlight_group !== undefined) {
      countQuery += ` AND cs.is_highlight_group = $${countParamIndex}`;
      countParams.push(is_highlight_group === 'true');
      countParamIndex++;
    }

    if (location) {
      countQuery += ` AND cs.location = $${countParamIndex}`;
      countParams.push(location);
      countParamIndex++;
    }

    if (search) {
      countQuery += ` AND (cs.name ILIKE $${countParamIndex} OR cs.description ILIKE $${countParamIndex})`;
      countParams.push(`%${search}%`);
      countParamIndex++;
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        sprints: result.rows,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching sprints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprints',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/sprints/:id
 * Get a specific sprint with detailed information
 */
router.get('/:id', async (req, res) => {
  try {
    const sprintId = parseInt(req.params.id);

    if (isNaN(sprintId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sprint ID'
      });
    }

    // Get sprint details
    const sprintResult = await db.query(`
      SELECT 
        cs.*,
        COUNT(sci.id) as content_count,
        COUNT(asa.id) as assignment_count,
        COUNT(CASE WHEN asa.status = 'active' THEN 1 END) as active_accounts,
        COUNT(CASE WHEN asa.status = 'completed' THEN 1 END) as completed_accounts
      FROM content_sprints cs
      LEFT JOIN sprint_content_items sci ON cs.id = sci.sprint_id
      LEFT JOIN account_sprint_assignments asa ON cs.id = asa.sprint_id
      WHERE cs.id = $1
      GROUP BY cs.id
    `, [sprintId]);

    if (sprintResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sprint not found'
      });
    }

    // Get content items
    const contentResult = await db.query(`
      SELECT * FROM sprint_content_items 
      WHERE sprint_id = $1 
      ORDER BY content_order ASC
    `, [sprintId]);

    // Get assignments
    const assignmentsResult = await db.query(`
      SELECT 
        asa.*,
        a.username,
        a.model_id,
        m.name as model_name
      FROM account_sprint_assignments asa
      JOIN accounts a ON asa.account_id = a.id
      JOIN models m ON a.model_id = m.id
      WHERE asa.sprint_id = $1
      ORDER BY asa.created_at DESC
    `, [sprintId]);

    const sprint = sprintResult.rows[0];
    
    res.json({
      success: true,
      data: {
        sprint,
        content_items: contentResult.rows,
        assignments: assignmentsResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching sprint details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprint details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/sprints
 * Create a new content sprint
 */
router.post('/', async (req, res) => {
  try {
    const { error, value } = createSprintSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    // Additional validation for highlight groups
    if (value.is_highlight_group && value.max_content_items > 100) {
      return res.status(400).json({
        success: false,
        error: 'Highlight groups cannot have more than 100 content items'
      });
    }

    if (!value.is_highlight_group && value.max_content_items > 20) {
      return res.status(400).json({
        success: false,
        error: 'Sprints cannot have more than 20 content items'
      });
    }

    if (value.idle_hours_min > value.idle_hours_max) {
      return res.status(400).json({
        success: false,
        error: 'Minimum idle hours cannot be greater than maximum idle hours'
      });
    }

    const result = await db.query(`
      INSERT INTO content_sprints (
        name, description, sprint_type, location, is_highlight_group,
        max_content_items, available_months, cooldown_hours,
        blocks_sprints, blocks_highlight_groups, idle_hours_min, idle_hours_max,
        maintenance_images_min, maintenance_images_max,
        maintenance_frequency_weeks_min, maintenance_frequency_weeks_max
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      value.name, value.description, value.sprint_type, value.location,
      value.is_highlight_group, value.max_content_items, value.available_months,
      value.cooldown_hours, value.blocks_sprints, value.blocks_highlight_groups,
      value.idle_hours_min, value.idle_hours_max, value.maintenance_images_min,
      value.maintenance_images_max, value.maintenance_frequency_weeks_min,
      value.maintenance_frequency_weeks_max
    ]);

    res.status(201).json({
      success: true,
      data: {
        sprint: result.rows[0],
        message: 'Sprint created successfully'
      }
    });

  } catch (error) {
    console.error('Error creating sprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create sprint',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/sprints/:id
 * Update an existing sprint
 */
router.put('/:id', async (req, res) => {
  try {
    const sprintId = parseInt(req.params.id);

    if (isNaN(sprintId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sprint ID'
      });
    }

    const { error, value } = updateSprintSchema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.details.map(d => d.message)
      });
    }

    // Check if sprint exists
    const existingResult = await db.query('SELECT * FROM content_sprints WHERE id = $1', [sprintId]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Sprint not found'
      });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(value).forEach(([key, val]) => {
      if (val !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        params.push(val);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(sprintId);

    const query = `
      UPDATE content_sprints 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: {
        sprint: result.rows[0],
        message: 'Sprint updated successfully'
      }
    });

  } catch (error) {
    console.error('Error updating sprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update sprint',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/sprints/:id
 * Delete a sprint and all associated data
 */
router.delete('/:id', async (req, res) => {
  try {
    const sprintId = parseInt(req.params.id);

    if (isNaN(sprintId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sprint ID'
      });
    }

    await db.query('BEGIN');

    // Check if sprint has active assignments
    const activeAssignments = await db.query(`
      SELECT COUNT(*) as count 
      FROM account_sprint_assignments 
      WHERE sprint_id = $1 AND status = 'active'
    `, [sprintId]);

    if (parseInt(activeAssignments.rows[0].count) > 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Cannot delete sprint with active assignments. Please pause or complete them first.'
      });
    }

    // Delete the sprint (CASCADE will handle related records)
    const result = await db.query('DELETE FROM content_sprints WHERE id = $1 RETURNING *', [sprintId]);

    if (result.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Sprint not found'
      });
    }

    await db.query('COMMIT');

    res.json({
      success: true,
      data: {
        message: 'Sprint deleted successfully',
        deleted_sprint: result.rows[0]
      }
    });

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Error deleting sprint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete sprint',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/sprints/analytics/overview
 * Get sprint system analytics overview
 */
router.get('/analytics/overview', async (req, res) => {
  try {
    const analyticsResult = await db.query(`
      SELECT 
        COUNT(*) as total_sprints,
        COUNT(CASE WHEN is_highlight_group = false THEN 1 END) as total_content_sprints,
        COUNT(CASE WHEN is_highlight_group = true THEN 1 END) as total_highlight_groups,
        COUNT(CASE WHEN EXISTS(
          SELECT 1 FROM account_sprint_assignments asa 
          WHERE asa.sprint_id = cs.id AND asa.status = 'active'
        ) THEN 1 END) as active_sprints,
        AVG(CASE WHEN calculated_duration_hours IS NOT NULL THEN calculated_duration_hours END) as avg_duration_hours,
        SUM(
          SELECT COUNT(*) FROM sprint_content_items sci WHERE sci.sprint_id = cs.id
        ) as total_content_items,
        COUNT(DISTINCT
          SELECT account_id FROM account_sprint_assignments asa WHERE asa.sprint_id = cs.id
        ) as total_assigned_accounts
      FROM content_sprints cs
    `);

    const typeBreakdownResult = await db.query(`
      SELECT 
        sprint_type,
        COUNT(*) as count,
        COUNT(CASE WHEN is_highlight_group = false THEN 1 END) as sprints,
        COUNT(CASE WHEN is_highlight_group = true THEN 1 END) as highlight_groups
      FROM content_sprints
      GROUP BY sprint_type
      ORDER BY count DESC
    `);

    const monthlyUsageResult = await db.query(`
      SELECT 
        month_num as month,
        COUNT(DISTINCT cs.id) as available_sprints
      FROM content_sprints cs
      CROSS JOIN generate_series(1, 12) as month_num
      WHERE month_num = ANY(cs.available_months)
      GROUP BY month_num
      ORDER BY month_num
    `);

    res.json({
      success: true,
      data: {
        overview: analyticsResult.rows[0],
        type_breakdown: typeBreakdownResult.rows,
        monthly_usage: monthlyUsageResult.rows
      }
    });

  } catch (error) {
    console.error('Error fetching sprint analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprint analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/sprints/:id/assign-accounts
 * Assign sprint to specific accounts
 */
router.post('/:id/assign-accounts', async (req, res) => {
  try {
    const sprintId = parseInt(req.params.id);
    const { account_ids, assignment_strategy = 'manual', force_override = false } = req.body;

    if (isNaN(sprintId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid sprint ID'
      });
    }

    if (!account_ids || !Array.isArray(account_ids) || account_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'account_ids must be a non-empty array'
      });
    }

    const { SprintAssignmentService } = await import('../services/SprintAssignmentService');
    const assignmentService = new SprintAssignmentService();

    const result = await assignmentService.assignSprintToAccounts(sprintId, account_ids, {
      assignment_strategy,
      force_override
    });

    res.json({
      success: true,
      data: result,
      message: `Assignment completed: ${result.summary.successful} successful, ${result.summary.failed} failed`
    });

  } catch (error) {
    console.error('Error assigning sprint to accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign sprint to accounts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/sprints/bulk-assign
 * Bulk assign multiple sprints to accounts
 */
router.post('/bulk-assign', async (req, res) => {
  try {
    const { assignments, assignment_strategy = 'manual', force_override = false } = req.body;

    if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'assignments must be a non-empty array'
      });
    }

    // Validate assignment format
    for (const assignment of assignments) {
      if (!assignment.account_id || !assignment.sprint_id) {
        return res.status(400).json({
          success: false,
          error: 'Each assignment must have account_id and sprint_id'
        });
      }
    }

    const { SprintAssignmentService } = await import('../services/SprintAssignmentService');
    const assignmentService = new SprintAssignmentService();

    const result = await assignmentService.processBulkAssignments({
      assignments,
      assignment_strategy,
      force_override
    });

    res.json({
      success: true,
      data: result,
      message: `Bulk assignment completed: ${result.summary.successful} successful, ${result.summary.failed} failed`
    });

  } catch (error) {
    console.error('Error processing bulk assignments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process bulk assignments',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/sprints/assignments
 * Get all assignments with filtering
 */
router.get('/assignments', async (req, res) => {
  try {
    const { SprintAssignmentService } = await import('../services/SprintAssignmentService');
    const assignmentService = new SprintAssignmentService();

    const assignments = await assignmentService.getAssignments(req.query);

    res.json({
      success: true,
      data: {
        assignments,
        total: assignments.length
      }
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
 * PUT /api/sprints/assignments/:id/pause
 * Pause an assignment
 */
router.put('/assignments/:id/pause', async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);

    if (isNaN(assignmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assignment ID'
      });
    }

    const { SprintAssignmentService } = await import('../services/SprintAssignmentService');
    const assignmentService = new SprintAssignmentService();

    await assignmentService.pauseAssignment(assignmentId);

    res.json({
      success: true,
      data: {
        message: 'Assignment paused successfully'
      }
    });

  } catch (error) {
    console.error('Error pausing assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause assignment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/sprints/assignments/:id/resume
 * Resume a paused assignment
 */
router.put('/assignments/:id/resume', async (req, res) => {
  try {
    const assignmentId = parseInt(req.params.id);

    if (isNaN(assignmentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid assignment ID'
      });
    }

    const { SprintAssignmentService } = await import('../services/SprintAssignmentService');
    const assignmentService = new SprintAssignmentService();

    await assignmentService.resumeAssignment(assignmentId);

    res.json({
      success: true,
      data: {
        message: 'Assignment resumed successfully'
      }
    });

  } catch (error) {
    console.error('Error resuming assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume assignment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 