import { db } from '../database';
import { 
  CampaignPool, 
  CreatePoolRequest, 
  UpdatePoolRequest,
  CompatibilityReport,
  PoolStats
} from '../types/campaignPools';

export class CampaignPoolService {
  
  /**
   * Create a new campaign pool
   */
  async createPool(poolData: CreatePoolRequest): Promise<CampaignPool> {
    await db.query('BEGIN');

    try {
      // Validate sprint compatibility
      const compatibility = await this.validateSprintCompatibility(poolData.sprint_ids);
      if (!compatibility.is_compatible) {
        throw new Error(`Pool contains incompatible sprints: ${compatibility.blocking_conflicts.map(c => c.description).join(', ')}`);
      }

      // Calculate total duration
      const totalDuration = await this.calculatePoolDuration(poolData.sprint_ids);

      // Count compatible accounts
      const compatibleAccounts = await this.countCompatibleAccounts(poolData.sprint_ids);

      // Insert pool record
      const insertQuery = `
        INSERT INTO campaign_pools (
          name, description, sprint_ids, total_duration_hours, 
          compatible_accounts, assignment_strategy, time_horizon_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const result = await db.query(insertQuery, [
        poolData.name,
        poolData.description || null,
        poolData.sprint_ids,
        totalDuration,
        compatibleAccounts,
        poolData.assignment_strategy || 'random',
        poolData.time_horizon_days || 30
      ]);

      await db.query('COMMIT');

      return this.transformPoolRow(result.rows[0]);

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get campaign pool by ID
   */
  async getPool(poolId: number): Promise<CampaignPool | null> {
    const query = `
      SELECT cp.*, 
             array_agg(cs.name) as sprint_names
      FROM campaign_pools cp
      LEFT JOIN content_sprints cs ON cs.id = ANY(cp.sprint_ids)
      WHERE cp.id = $1
      GROUP BY cp.id
    `;

    const result = await db.query(query, [poolId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.transformPoolRow(result.rows[0]);
  }

  /**
   * List campaign pools with filtering
   */
  async listPools(filters: {
    strategy?: string;
    is_template?: boolean;
    template_category?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{
    pools: CampaignPool[];
    total_count: number;
  }> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramIndex = 1;

    if (filters.strategy) {
      whereConditions.push(`assignment_strategy = $${paramIndex}`);
      params.push(filters.strategy);
      paramIndex++;
    }

    if (filters.is_template !== undefined) {
      whereConditions.push(`is_template = $${paramIndex}`);
      params.push(filters.is_template);
      paramIndex++;
    }

    if (filters.template_category) {
      whereConditions.push(`template_category = $${paramIndex}`);
      params.push(filters.template_category);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM campaign_pools ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const totalCount = parseInt(countResult.rows[0].total);

    // Get pools with pagination
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    
    const mainQuery = `
      SELECT cp.*,
             array_agg(cs.name) as sprint_names
      FROM campaign_pools cp
      LEFT JOIN content_sprints cs ON cs.id = ANY(cp.sprint_ids)
      ${whereClause}
      GROUP BY cp.id
      ORDER BY cp.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await db.query(mainQuery, params);

    return {
      pools: result.rows.map(row => this.transformPoolRow(row)),
      total_count: totalCount
    };
  }

  /**
   * Update campaign pool
   */
  async updatePool(poolId: number, updates: UpdatePoolRequest): Promise<CampaignPool> {
    await db.query('BEGIN');

    try {
      // If sprint_ids are being updated, validate compatibility
      if (updates.sprint_ids) {
        const compatibility = await this.validateSprintCompatibility(updates.sprint_ids);
        if (!compatibility.is_compatible) {
          throw new Error(`Updated pool contains incompatible sprints: ${compatibility.blocking_conflicts.map(c => c.description).join(', ')}`);
        }

        // Recalculate duration and compatible accounts
        updates.total_duration_hours = await this.calculatePoolDuration(updates.sprint_ids);
        updates.compatible_accounts = await this.countCompatibleAccounts(updates.sprint_ids);
      }

      // Build update query dynamically
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          setClauses.push(`${key} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      });

      setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

      const updateQuery = `
        UPDATE campaign_pools 
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      params.push(poolId);

      const result = await db.query(updateQuery, params);

      if (result.rows.length === 0) {
        throw new Error(`Campaign pool ${poolId} not found`);
      }

      await db.query('COMMIT');

      return this.transformPoolRow(result.rows[0]);

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Delete campaign pool
   */
  async deletePool(poolId: number): Promise<void> {
    await db.query('BEGIN');

    try {
      // Check if pool has active assignments
      const assignmentCheck = await db.query(`
        SELECT COUNT(*) as active_assignments
        FROM account_sprint_assignments asa
        JOIN content_sprints cs ON asa.sprint_id = cs.id
        WHERE cs.id = ANY(
          SELECT unnest(sprint_ids) FROM campaign_pools WHERE id = $1
        ) AND asa.status IN ('scheduled', 'active')
      `, [poolId]);

      const activeAssignments = parseInt(assignmentCheck.rows[0].active_assignments);
      if (activeAssignments > 0) {
        throw new Error(`Cannot delete pool with ${activeAssignments} active assignments`);
      }

      // Delete the pool
      const deleteResult = await db.query(`
        DELETE FROM campaign_pools WHERE id = $1
      `, [poolId]);

      if (deleteResult.rowCount === 0) {
        throw new Error(`Campaign pool ${poolId} not found`);
      }

      await db.query('COMMIT');

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Validate sprint compatibility
   */
  async validateSprintCompatibility(sprintIds: number[]): Promise<CompatibilityReport> {
    if (sprintIds.length === 0) {
      return {
        is_compatible: false,
        blocking_conflicts: [],
        seasonal_issues: [],
        duration_warnings: [],
        account_eligibility_count: 0,
        message: 'Pool must contain at least one sprint',
        compatible_accounts: 0,
        total_conflicts: 0,
        location_conflicts: [],
        seasonal_restrictions: [],
        estimated_success_rate: 0
      };
    }

    // Get sprint details
    const sprintQuery = `
      SELECT id, name, sprint_type, location, available_months, 
             blocks_sprints, blocks_highlight_groups, calculated_duration_hours
      FROM content_sprints 
      WHERE id = ANY($1)
    `;
    const sprintResult = await db.query(sprintQuery, [sprintIds]);
    const sprints = sprintResult.rows;

    if (sprints.length !== sprintIds.length) {
      const foundIds = sprints.map(s => s.id);
      const missingIds = sprintIds.filter(id => !foundIds.includes(id));
      return {
        is_compatible: false,
        blocking_conflicts: [],
        seasonal_issues: [],
        duration_warnings: [],
        account_eligibility_count: 0,
        message: `Sprint(s) not found: ${missingIds.join(', ')}`,
        compatible_accounts: 0,
        total_conflicts: 0,
        location_conflicts: [],
        seasonal_restrictions: [],
        estimated_success_rate: 0
      };
    }

    // Check blocking conflicts
    const blockingConflicts = this.detectBlockingConflicts(sprints);

    // Check seasonal compatibility
    const seasonalIssues = this.checkSeasonalCompatibility(sprints);

    // Check duration constraints
    const durationWarnings = this.analyzeDurationConstraints(sprints);

    // Count eligible accounts
    const eligibleAccounts = await this.countCompatibleAccounts(sprintIds);

    const isCompatible = blockingConflicts.length === 0 && seasonalIssues.length === 0;

    if (blockingConflicts.length > 0) {
      return {
        is_compatible: false,
        blocking_conflicts: blockingConflicts,
        seasonal_issues: [],
        duration_warnings: [],
        account_eligibility_count: 0,
        message: `Blocking conflicts found: ${blockingConflicts.map(c => c.sprint_name).join(', ')}`,
        compatible_accounts: 0,
        total_conflicts: blockingConflicts.length,
        location_conflicts: [],
        seasonal_restrictions: [],
        estimated_success_rate: 0
      };
    }

    return {
      is_compatible: isCompatible,
      blocking_conflicts: blockingConflicts,
      seasonal_issues: seasonalIssues,
      duration_warnings: durationWarnings,
      account_eligibility_count: eligibleAccounts,
      message: isCompatible ? 'Sprints are compatible' : 'Compatibility issues found',
      compatible_accounts: 0,
      total_conflicts: blockingConflicts.length + seasonalIssues.length,
      location_conflicts: [],
      seasonal_restrictions: [],
      estimated_success_rate: 0
    };
  }

  /**
   * Calculate total pool duration
   */
  async calculatePoolDuration(sprintIds: number[]): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(calculated_duration_hours), 0) as total_duration
      FROM content_sprints 
      WHERE id = ANY($1)
    `;

    const result = await db.query(query, [sprintIds]);
    return parseInt(result.rows[0].total_duration);
  }

  /**
   * Count accounts compatible with all sprints in pool
   */
  async countCompatibleAccounts(sprintIds: number[]): Promise<number> {
    // For now, return all post-warmup accounts
    // This can be enhanced with more sophisticated compatibility logic
    const query = `
      SELECT COUNT(*) as compatible_count
      FROM accounts a
      WHERE a.status = 'active' 
        AND is_warmup_complete(a.id) = true
        AND NOT EXISTS (
          SELECT 1 FROM account_content_state acs 
          WHERE acs.account_id = a.id 
            AND acs.cooldown_until > CURRENT_TIMESTAMP
        )
    `;

    const result = await db.query(query);
    return parseInt(result.rows[0].compatible_count);
  }

  /**
   * Get pool statistics
   */
  async getPoolStats(poolId: number): Promise<PoolStats> {
    const statsQuery = `
      SELECT 
        cp.usage_count,
        cp.last_assigned,
        COUNT(DISTINCT asa.account_id) as accounts_assigned,
        COUNT(DISTINCT asa.id) as total_assignments,
        COUNT(DISTINCT asa.id) FILTER (WHERE asa.status = 'completed') as completed_assignments
      FROM campaign_pools cp
      LEFT JOIN account_sprint_assignments asa ON asa.sprint_id = ANY(cp.sprint_ids)
      WHERE cp.id = $1
      GROUP BY cp.id, cp.usage_count, cp.last_assigned
    `;

    const result = await db.query(statsQuery, [poolId]);
    const stats = result.rows[0];

    return {
      total_pools: parseInt(stats.total_pools) || 0,
      total_content_items: parseInt(stats.total_content_items) || 0,
      pools_by_type: { story: 0, post: 0, highlight: 0 }, // Simplified
      average_items_per_pool: parseFloat(stats.average_items_per_pool) || 0,
      most_used_pool_type: 'story', // Simplified
      usage_count: parseInt(stats.usage_count) || 0,
      accounts_assigned: parseInt(stats.accounts_assigned) || 0,
      total_assignments: parseInt(stats.total_assignments) || 0,
      completed_assignments: parseInt(stats.completed_assignments) || 0,
      last_assigned: stats.last_assigned
    };
  }

  /**
   * Detect blocking conflicts between sprints
   */
  private detectBlockingConflicts(sprints: any[]): any[] {
    const conflicts: any[] = [];

    for (let i = 0; i < sprints.length; i++) {
      for (let j = i + 1; j < sprints.length; j++) {
        const sprintA = sprints[i];
        const sprintB = sprints[j];

        // Check if A blocks B
        if (sprintA.blocks_sprints && sprintA.blocks_sprints.includes(sprintB.id)) {
          conflicts.push({
            type: 'blocking_conflict',
            sprint_a_id: sprintA.id,
            sprint_a_name: sprintA.name,
            sprint_b_id: sprintB.id,
            sprint_b_name: sprintB.name,
            description: `${sprintA.name} blocks ${sprintB.name}`
          });
        }

        // Check if B blocks A
        if (sprintB.blocks_sprints && sprintB.blocks_sprints.includes(sprintA.id)) {
          conflicts.push({
            type: 'blocking_conflict',
            sprint_a_id: sprintB.id,
            sprint_a_name: sprintB.name,
            sprint_b_id: sprintA.id,
            sprint_b_name: sprintA.name,
            description: `${sprintB.name} blocks ${sprintA.name}`
          });
        }
      }
    }

    return conflicts;
  }

  /**
   * Check seasonal compatibility between sprints
   */
  private checkSeasonalCompatibility(sprints: any[]): any[] {
    const issues: any[] = [];

    // Find common available months across all sprints
    let commonMonths: number[] = [];

    if (sprints.length > 0) {
      commonMonths = sprints[0].available_months || [1,2,3,4,5,6,7,8,9,10,11,12];

      for (let i = 1; i < sprints.length; i++) {
        const sprintMonths = sprints[i].available_months || [1,2,3,4,5,6,7,8,9,10,11,12];
        commonMonths = commonMonths.filter(month => sprintMonths.includes(month));
      }
    }

    if (commonMonths.length === 0) {
      issues.push({
        type: 'seasonal_incompatibility',
        description: 'No common months available across all sprints',
        affected_sprints: sprints.map(s => ({ id: s.id, name: s.name }))
      });
    } else if (commonMonths.length < 3) {
      issues.push({
        type: 'seasonal_warning',
        description: `Limited seasonal availability: only ${commonMonths.length} common months`,
        available_months: commonMonths,
        affected_sprints: sprints.map(s => ({ id: s.id, name: s.name }))
      });
    }

    return issues;
  }

  /**
   * Analyze duration constraints
   */
  private analyzeDurationConstraints(sprints: any[]): any[] {
    // Placeholder for more complex duration analysis
    return [];
  }

  /**
   * Transform database row to CampaignPool object
   */
  public transformPoolRow(row: any): CampaignPool {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      sprint_ids: row.sprint_ids || [],
      total_duration_hours: row.total_duration_hours || 0,
      compatible_accounts: row.compatible_accounts || 0,
      assignment_strategy: row.assignment_strategy || 'random',
      time_horizon_days: row.time_horizon_days || 30,
      is_template: row.is_template || false,
      template_category: row.template_category,
      pool_type: row.pool_type || 'post', // sensible default
      sprint_names: row.sprint_names || [],
      usage_count: row.usage_count || 0,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
} 