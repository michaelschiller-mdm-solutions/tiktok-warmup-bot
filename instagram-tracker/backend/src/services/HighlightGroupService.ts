import { db } from '../database';
import {
  HighlightGroup,
  CreateHighlightGroupRequest,
  UpdateHighlightGroupRequest,
  HighlightGroupAssignment,
  AssignHighlightGroupRequest,
  AssignmentResult,
  HighlightGroupFilters,
  HighlightGroupListResponse,
  HighlightGroupAnalytics,
  MaintenanceScheduleRequest,
  PositionUpdateRequest,
  ContentBatch,
  CreateContentBatchRequest,
  MaintenanceStatus,
  SystemMaintenanceOverview
} from '../types/highlightGroups';

export class HighlightGroupService {
  /**
   * Create a new highlight group
   */
  async createHighlightGroup(data: CreateHighlightGroupRequest): Promise<HighlightGroup> {
    // Validate highlight group specific constraints
    if (data.max_content_items && data.max_content_items > 100) {
      throw new Error('Highlight groups cannot have more than 100 content items');
    }

    if (data.maintenance_images_min && data.maintenance_images_max && 
        data.maintenance_images_min > data.maintenance_images_max) {
      throw new Error('Minimum maintenance images cannot be greater than maximum');
    }

    if (data.maintenance_frequency_weeks_min && data.maintenance_frequency_weeks_max && 
        data.maintenance_frequency_weeks_min > data.maintenance_frequency_weeks_max) {
      throw new Error('Minimum maintenance frequency cannot be greater than maximum');
    }

    const result = await db.query(`
      INSERT INTO content_sprints (
        name, description, sprint_type, location, is_highlight_group,
        max_content_items, available_months, cooldown_hours, 
        blocks_sprints, blocks_highlight_groups,
        maintenance_images_min, maintenance_images_max,
        maintenance_frequency_weeks_min, maintenance_frequency_weeks_max
      ) VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      data.name, 
      data.description, 
      data.sprint_type, 
      data.location,
      data.max_content_items || 100, 
      data.available_months || [1,2,3,4,5,6,7,8,9,10,11,12],
      data.cooldown_hours || 504, // 3 weeks default
      data.blocks_sprints || [], 
      data.blocks_highlight_groups || [],
      data.maintenance_images_min || 1, 
      data.maintenance_images_max || 2,
      data.maintenance_frequency_weeks_min || 2, 
      data.maintenance_frequency_weeks_max || 4
    ]);

    return result.rows[0];
  }

  /**
   * Get highlight groups with filtering and pagination
   */
  async getHighlightGroups(
    filters: HighlightGroupFilters = {}, 
    page: number = 1, 
    limit: number = 50
  ): Promise<HighlightGroupListResponse> {
    let query = `
      SELECT 
        cs.*,
        COUNT(sci.id) as content_count,
        COUNT(ahg.id) as assignment_count,
        COUNT(CASE WHEN ahg.is_active = true THEN 1 END) as active_assignments
      FROM content_sprints cs
      LEFT JOIN sprint_content_items sci ON cs.id = sci.sprint_id
      LEFT JOIN account_highlight_groups ahg ON cs.id = ahg.highlight_group_id
      WHERE cs.is_highlight_group = true
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
    if (filters.sprint_type) {
      query += ` AND cs.sprint_type = $${paramIndex}`;
      params.push(filters.sprint_type);
      paramIndex++;
    }

    if (filters.location) {
      query += ` AND cs.location = $${paramIndex}`;
      params.push(filters.location);
      paramIndex++;
    }

    if (filters.search) {
      query += ` AND (cs.name ILIKE $${paramIndex} OR cs.description ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    query += ` GROUP BY cs.id ORDER BY cs.created_at DESC`;

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(DISTINCT cs.id) as total
      FROM content_sprints cs
      WHERE cs.is_highlight_group = true
    `;
    
    const countParams: any[] = [];
    let countParamIndex = 1;

    if (filters.sprint_type) {
      countQuery += ` AND cs.sprint_type = $${countParamIndex}`;
      countParams.push(filters.sprint_type);
      countParamIndex++;
    }

    if (filters.location) {
      countQuery += ` AND cs.location = $${countParamIndex}`;
      countParams.push(filters.location);
      countParamIndex++;
    }

    if (filters.search) {
      countQuery += ` AND (cs.name ILIKE $${countParamIndex} OR cs.description ILIKE $${countParamIndex})`;
      countParams.push(`%${filters.search}%`);
      countParamIndex++;
    }

    // Apply pagination
    const pageNum = Math.max(1, page);
    const limitNum = Math.min(100, Math.max(1, limit));
    const offset = (pageNum - 1) * limitNum;

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);

    const total = parseInt(countResult.rows[0].total);

    return {
      highlight_groups: result.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get a specific highlight group by ID
   */
  async getHighlightGroupById(id: number): Promise<HighlightGroup | null> {
    const result = await db.query(`
      SELECT 
        cs.*,
        COUNT(sci.id) as content_count,
        COUNT(ahg.id) as assignment_count,
        COUNT(CASE WHEN ahg.is_active = true THEN 1 END) as active_assignments
      FROM content_sprints cs
      LEFT JOIN sprint_content_items sci ON cs.id = sci.sprint_id
      LEFT JOIN account_highlight_groups ahg ON cs.id = ahg.highlight_group_id
      WHERE cs.id = $1 AND cs.is_highlight_group = true
      GROUP BY cs.id
    `, [id]);

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Update a highlight group
   */
  async updateHighlightGroup(id: number, data: UpdateHighlightGroupRequest): Promise<HighlightGroup | null> {
    // Build dynamic update query
    const setClause: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      setClause.push(`name = $${paramIndex}`);
      params.push(data.name);
      paramIndex++;
    }

    if (data.description !== undefined) {
      setClause.push(`description = $${paramIndex}`);
      params.push(data.description);
      paramIndex++;
    }

    if (data.sprint_type !== undefined) {
      setClause.push(`sprint_type = $${paramIndex}`);
      params.push(data.sprint_type);
      paramIndex++;
    }

    if (data.location !== undefined) {
      setClause.push(`location = $${paramIndex}`);
      params.push(data.location);
      paramIndex++;
    }

    if (data.max_content_items !== undefined) {
      if (data.max_content_items > 100) {
        throw new Error('Highlight groups cannot have more than 100 content items');
      }
      setClause.push(`max_content_items = $${paramIndex}`);
      params.push(data.max_content_items);
      paramIndex++;
    }

    if (data.available_months !== undefined) {
      setClause.push(`available_months = $${paramIndex}`);
      params.push(data.available_months);
      paramIndex++;
    }

    if (data.cooldown_hours !== undefined) {
      setClause.push(`cooldown_hours = $${paramIndex}`);
      params.push(data.cooldown_hours);
      paramIndex++;
    }

    if (data.blocks_sprints !== undefined) {
      setClause.push(`blocks_sprints = $${paramIndex}`);
      params.push(data.blocks_sprints);
      paramIndex++;
    }

    if (data.blocks_highlight_groups !== undefined) {
      setClause.push(`blocks_highlight_groups = $${paramIndex}`);
      params.push(data.blocks_highlight_groups);
      paramIndex++;
    }

    if (data.maintenance_images_min !== undefined) {
      setClause.push(`maintenance_images_min = $${paramIndex}`);
      params.push(data.maintenance_images_min);
      paramIndex++;
    }

    if (data.maintenance_images_max !== undefined) {
      setClause.push(`maintenance_images_max = $${paramIndex}`);
      params.push(data.maintenance_images_max);
      paramIndex++;
    }

    if (data.maintenance_frequency_weeks_min !== undefined) {
      setClause.push(`maintenance_frequency_weeks_min = $${paramIndex}`);
      params.push(data.maintenance_frequency_weeks_min);
      paramIndex++;
    }

    if (data.maintenance_frequency_weeks_max !== undefined) {
      setClause.push(`maintenance_frequency_weeks_max = $${paramIndex}`);
      params.push(data.maintenance_frequency_weeks_max);
      paramIndex++;
    }

    if (setClause.length === 0) {
      throw new Error('No fields to update');
    }

    setClause.push(`updated_at = CURRENT_TIMESTAMP`);

    // Add WHERE clause
    params.push(id);
    const whereIndex = paramIndex;

    const query = `
      UPDATE content_sprints 
      SET ${setClause.join(', ')}
      WHERE id = $${whereIndex} AND is_highlight_group = true
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Delete a highlight group
   */
  async deleteHighlightGroup(id: number): Promise<boolean> {
    // Check if highlight group has any active assignments
    const assignmentCheck = await db.query(`
      SELECT COUNT(*) as count 
      FROM account_highlight_groups 
      WHERE highlight_group_id = $1 AND is_active = true
    `, [id]);

    if (parseInt(assignmentCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete highlight group with active assignments');
    }

    const result = await db.query(`
      DELETE FROM content_sprints 
      WHERE id = $1 AND is_highlight_group = true
    `, [id]);

    return result.rowCount > 0;
  }

  /**
   * Assign highlight group to accounts
   */
  async assignToAccounts(
    highlightGroupId: number, 
    request: AssignHighlightGroupRequest
  ): Promise<AssignmentResult> {
    const successfulAssignments: HighlightGroupAssignment[] = [];
    const failedAssignments: Array<{ account_id: number; error: string }> = [];

    // Verify highlight group exists
    const groupResult = await db.query(`
      SELECT id FROM content_sprints 
      WHERE id = $1 AND is_highlight_group = true
    `, [highlightGroupId]);

    if (groupResult.rows.length === 0) {
      throw new Error('Highlight group not found');
    }

    for (const accountId of request.account_ids) {
      try {
        // Check if account already has this highlight group
        const existingResult = await db.query(`
          SELECT id FROM account_highlight_groups 
          WHERE account_id = $1 AND highlight_group_id = $2
        `, [accountId, highlightGroupId]);

        if (existingResult.rows.length > 0) {
          failedAssignments.push({
            account_id: accountId,
            error: 'Highlight group already assigned to this account'
          });
          continue;
        }

        // Verify account exists
        const accountCheck = await db.query(`
          SELECT id FROM accounts WHERE id = $1
        `, [accountId]);

        if (accountCheck.rows.length === 0) {
          failedAssignments.push({
            account_id: accountId,
            error: 'Account not found'
          });
          continue;
        }

        // Insert new assignment (trigger will handle position)
        const assignmentResult = await db.query(`
          INSERT INTO account_highlight_groups (
            account_id, highlight_group_id, highlight_name,
            maintenance_frequency_hours, is_active
          ) VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [
          accountId, 
          highlightGroupId, 
          request.highlight_name,
          request.maintenance_frequency_hours || 504, 
          request.is_active !== false
        ]);

        successfulAssignments.push(assignmentResult.rows[0]);

      } catch (error) {
        failedAssignments.push({
          account_id: accountId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      successful_assignments: successfulAssignments,
      failed_assignments: failedAssignments,
      total_assigned: successfulAssignments.length
    };
  }

  /**
   * Get all assignments for a highlight group
   */
  async getAssignments(highlightGroupId: number): Promise<HighlightGroupAssignment[]> {
    const result = await db.query(`
      SELECT 
        ahg.*,
        a.username as account_username,
        a.full_name as account_full_name
      FROM account_highlight_groups ahg
      LEFT JOIN accounts a ON ahg.account_id = a.id
      WHERE ahg.highlight_group_id = $1
      ORDER BY ahg.position ASC
    `, [highlightGroupId]);

    return result.rows;
  }

  /**
   * Remove assignment
   */
  async removeAssignment(assignmentId: number): Promise<boolean> {
    const result = await db.query(`
      DELETE FROM account_highlight_groups 
      WHERE id = $1
    `, [assignmentId]);

    return result.rowCount > 0;
  }

  /**
   * Schedule maintenance for highlight group
   */
  async scheduleMaintenanceForGroup(
    highlightGroupId: number, 
    request: MaintenanceScheduleRequest
  ): Promise<{ updated_assignments: number }> {
    let query = `
      UPDATE account_highlight_groups 
      SET maintenance_next_due = $1,
          maintenance_frequency_hours = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE highlight_group_id = $3
    `;

    const nextDue = request.immediate_execution 
      ? new Date() 
      : new Date(Date.now() + (request.maintenance_frequency_hours || 504) * 60 * 60 * 1000);

    const params: any[] = [
      nextDue,
      request.maintenance_frequency_hours || 504,
      highlightGroupId
    ];

    if (request.account_ids && request.account_ids.length > 0) {
      query += ` AND account_id = ANY($4)`;
      params.push(request.account_ids);
    }

    const result = await db.query(query, params);
    return { updated_assignments: result.rowCount };
  }

  /**
   * Update highlight positions for an account
   */
  async updatePositions(accountId: number, request: PositionUpdateRequest): Promise<boolean> {
    await db.query('BEGIN');

    try {
      for (const assignment of request.highlight_assignments) {
        await db.query(`
          UPDATE account_highlight_groups 
          SET position = $1, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2 AND account_id = $3
        `, [assignment.new_position, assignment.assignment_id, accountId]);
      }

      await db.query('COMMIT');
      return true;

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get highlight group analytics
   */
  async getGroupAnalytics(highlightGroupId: number): Promise<HighlightGroupAnalytics> {
    // Get basic statistics
    const statsResult = await db.query(`
      SELECT 
        COUNT(ahg.id) as total_assignments,
        COUNT(CASE WHEN ahg.is_active = true THEN 1 END) as active_assignments,
        AVG(ahg.maintenance_frequency_hours) as avg_maintenance_frequency,
        COUNT(DISTINCT sci.id) as content_items_available
      FROM account_highlight_groups ahg
      LEFT JOIN content_sprints cs ON ahg.highlight_group_id = cs.id
      LEFT JOIN sprint_content_items sci ON cs.id = sci.sprint_id
      WHERE ahg.highlight_group_id = $1
      GROUP BY ahg.highlight_group_id
    `, [highlightGroupId]);

    // Get maintenance execution count for last 30 days
    const maintenanceResult = await db.query(`
      SELECT COUNT(*) as maintenance_count
      FROM content_queue cq
      JOIN account_highlight_groups ahg ON cq.account_id = ahg.account_id
      WHERE ahg.highlight_group_id = $1
        AND cq.content_type = 'highlight'
        AND cq.created_at > CURRENT_TIMESTAMP - INTERVAL '30 days'
    `, [highlightGroupId]);

    // Get position distribution
    const positionResult = await db.query(`
      SELECT position, COUNT(*) as count
      FROM account_highlight_groups
      WHERE highlight_group_id = $1
      GROUP BY position
      ORDER BY position
    `, [highlightGroupId]);

    const stats = statsResult.rows[0] || {};
    const positionDistribution: Record<number, number> = {};
    positionResult.rows.forEach(row => {
      positionDistribution[row.position] = parseInt(row.count);
    });

    return {
      highlight_group_id: highlightGroupId,
      total_assignments: parseInt(stats.total_assignments) || 0,
      active_assignments: parseInt(stats.active_assignments) || 0,
      maintenance_executions_30d: parseInt(maintenanceResult.rows[0]?.maintenance_count) || 0,
      avg_maintenance_frequency: parseFloat(stats.avg_maintenance_frequency) || 504,
      content_items_used: parseInt(stats.content_items_available) || 0,
      position_distribution: positionDistribution,
      monthly_activity: [] // Would require more complex query for historical data
    };
  }

  /**
   * Get system-wide maintenance status
   */
  async getSystemMaintenanceOverview(): Promise<SystemMaintenanceOverview> {
    const overviewResult = await db.query(`
      SELECT 
        COUNT(DISTINCT cs.id) as total_highlight_groups,
        COUNT(DISTINCT CASE 
          WHEN ahg.maintenance_next_due <= CURRENT_TIMESTAMP THEN cs.id 
        END) as groups_requiring_maintenance,
        COUNT(CASE 
          WHEN ahg.maintenance_next_due <= CURRENT_TIMESTAMP THEN 1 
        END) as accounts_with_overdue_maintenance,
        AVG(ahg.maintenance_frequency_hours) as avg_maintenance_frequency
      FROM content_sprints cs
      LEFT JOIN account_highlight_groups ahg ON cs.id = ahg.highlight_group_id AND ahg.is_active = true
      WHERE cs.is_highlight_group = true
    `);

    const todayMaintenanceResult = await db.query(`
      SELECT COUNT(*) as maintenance_today
      FROM content_queue cq
      WHERE cq.content_type = 'highlight'
        AND cq.created_at >= CURRENT_DATE
    `);

    const weekMaintenanceResult = await db.query(`
      SELECT COUNT(*) as maintenance_this_week
      FROM content_queue cq
      WHERE cq.content_type = 'highlight'
        AND cq.created_at >= DATE_TRUNC('week', CURRENT_DATE)
    `);

    const stats = overviewResult.rows[0];

    return {
      total_highlight_groups: parseInt(stats.total_highlight_groups) || 0,
      groups_requiring_maintenance: parseInt(stats.groups_requiring_maintenance) || 0,
      accounts_with_overdue_maintenance: parseInt(stats.accounts_with_overdue_maintenance) || 0,
      maintenance_executions_today: parseInt(todayMaintenanceResult.rows[0].maintenance_today) || 0,
      maintenance_executions_this_week: parseInt(weekMaintenanceResult.rows[0].maintenance_this_week) || 0,
      average_maintenance_frequency_hours: parseFloat(stats.avg_maintenance_frequency) || 504
    };
  }

  /**
   * Create content batch for seasonal content
   */
  async createContentBatch(
    highlightGroupId: number, 
    request: CreateContentBatchRequest
  ): Promise<ContentBatch> {
    const result = await db.query(`
      INSERT INTO highlight_content_batches (
        highlight_group_id, batch_name, available_months, content_item_ids, is_active
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      highlightGroupId,
      request.batch_name,
      request.available_months,
      request.content_item_ids,
      request.is_active !== false
    ]);

    return result.rows[0];
  }

  /**
   * Get content batches for a highlight group
   */
  async getContentBatches(highlightGroupId: number): Promise<ContentBatch[]> {
    const result = await db.query(`
      SELECT * FROM highlight_content_batches
      WHERE highlight_group_id = $1
      ORDER BY created_at DESC
    `, [highlightGroupId]);

    return result.rows;
  }
} 