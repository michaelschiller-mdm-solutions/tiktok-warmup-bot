"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CampaignPoolService = void 0;
const database_1 = require("../database");
class CampaignPoolService {
    async createPool(poolData) {
        await database_1.db.query('BEGIN');
        try {
            const compatibility = await this.validateSprintCompatibility(poolData.sprint_ids);
            if (!compatibility.is_compatible) {
                throw new Error(`Pool contains incompatible sprints: ${compatibility.blocking_conflicts.map(c => c.description).join(', ')}`);
            }
            const totalDuration = await this.calculatePoolDuration(poolData.sprint_ids);
            const compatibleAccounts = await this.countCompatibleAccounts(poolData.sprint_ids);
            const insertQuery = `
        INSERT INTO campaign_pools (
          name, description, sprint_ids, total_duration_hours, 
          compatible_accounts, assignment_strategy, time_horizon_days
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
            const result = await database_1.db.query(insertQuery, [
                poolData.name,
                poolData.description || null,
                poolData.sprint_ids,
                totalDuration,
                compatibleAccounts,
                poolData.assignment_strategy || 'random',
                poolData.time_horizon_days || 30
            ]);
            await database_1.db.query('COMMIT');
            return this.transformPoolRow(result.rows[0]);
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async getPool(poolId) {
        const query = `
      SELECT cp.*, 
             array_agg(cs.name) as sprint_names
      FROM campaign_pools cp
      LEFT JOIN content_sprints cs ON cs.id = ANY(cp.sprint_ids)
      WHERE cp.id = $1
      GROUP BY cp.id
    `;
        const result = await database_1.db.query(query, [poolId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.transformPoolRow(result.rows[0]);
    }
    async listPools(filters = {}) {
        let whereConditions = [];
        let params = [];
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
        const countQuery = `SELECT COUNT(*) as total FROM campaign_pools ${whereClause}`;
        const countResult = await database_1.db.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].total);
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
        const result = await database_1.db.query(mainQuery, params);
        return {
            pools: result.rows.map(row => this.transformPoolRow(row)),
            total_count: totalCount
        };
    }
    async updatePool(poolId, updates) {
        await database_1.db.query('BEGIN');
        try {
            if (updates.sprint_ids) {
                const compatibility = await this.validateSprintCompatibility(updates.sprint_ids);
                if (!compatibility.is_compatible) {
                    throw new Error(`Updated pool contains incompatible sprints: ${compatibility.blocking_conflicts.map(c => c.description).join(', ')}`);
                }
                updates.total_duration_hours = await this.calculatePoolDuration(updates.sprint_ids);
                updates.compatible_accounts = await this.countCompatibleAccounts(updates.sprint_ids);
            }
            const setClauses = [];
            const params = [];
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
            const result = await database_1.db.query(updateQuery, params);
            if (result.rows.length === 0) {
                throw new Error(`Campaign pool ${poolId} not found`);
            }
            await database_1.db.query('COMMIT');
            return this.transformPoolRow(result.rows[0]);
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async deletePool(poolId) {
        await database_1.db.query('BEGIN');
        try {
            const assignmentCheck = await database_1.db.query(`
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
            const deleteResult = await database_1.db.query(`
        DELETE FROM campaign_pools WHERE id = $1
      `, [poolId]);
            if (deleteResult.rowCount === 0) {
                throw new Error(`Campaign pool ${poolId} not found`);
            }
            await database_1.db.query('COMMIT');
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async validateSprintCompatibility(sprintIds) {
        if (sprintIds.length === 0) {
            return {
                is_compatible: false,
                blocking_conflicts: [],
                seasonal_issues: [],
                duration_warnings: [],
                account_eligibility_count: 0,
                message: 'Pool must contain at least one sprint'
            };
        }
        const sprintQuery = `
      SELECT id, name, sprint_type, location, available_months, 
             blocks_sprints, blocks_highlight_groups, calculated_duration_hours
      FROM content_sprints 
      WHERE id = ANY($1)
    `;
        const sprintResult = await database_1.db.query(sprintQuery, [sprintIds]);
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
                message: `Sprint(s) not found: ${missingIds.join(', ')}`
            };
        }
        const blockingConflicts = this.detectBlockingConflicts(sprints);
        const seasonalIssues = this.checkSeasonalCompatibility(sprints);
        const durationWarnings = this.analyzeDurationConstraints(sprints);
        const eligibleAccounts = await this.countCompatibleAccounts(sprintIds);
        const isCompatible = blockingConflicts.length === 0 && seasonalIssues.length === 0;
        return {
            is_compatible: isCompatible,
            blocking_conflicts: blockingConflicts,
            seasonal_issues: seasonalIssues,
            duration_warnings: durationWarnings,
            account_eligibility_count: eligibleAccounts,
            message: isCompatible ? 'Pool is compatible' : 'Pool has compatibility issues'
        };
    }
    async calculatePoolDuration(sprintIds) {
        const query = `
      SELECT COALESCE(SUM(calculated_duration_hours), 0) as total_duration
      FROM content_sprints 
      WHERE id = ANY($1)
    `;
        const result = await database_1.db.query(query, [sprintIds]);
        return parseInt(result.rows[0].total_duration);
    }
    async countCompatibleAccounts(sprintIds) {
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
        const result = await database_1.db.query(query);
        return parseInt(result.rows[0].compatible_count);
    }
    async getPoolStats(poolId) {
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
        const result = await database_1.db.query(statsQuery, [poolId]);
        const stats = result.rows[0] || {};
        return {
            usage_count: parseInt(stats.usage_count) || 0,
            last_assigned: stats.last_assigned,
            accounts_assigned: parseInt(stats.accounts_assigned) || 0,
            total_assignments: parseInt(stats.total_assignments) || 0,
            completed_assignments: parseInt(stats.completed_assignments) || 0,
            completion_rate: stats.total_assignments > 0
                ? (parseInt(stats.completed_assignments) || 0) / parseInt(stats.total_assignments)
                : 0
        };
    }
    detectBlockingConflicts(sprints) {
        const conflicts = [];
        for (let i = 0; i < sprints.length; i++) {
            for (let j = i + 1; j < sprints.length; j++) {
                const sprintA = sprints[i];
                const sprintB = sprints[j];
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
    checkSeasonalCompatibility(sprints) {
        const issues = [];
        let commonMonths = [];
        if (sprints.length > 0) {
            commonMonths = sprints[0].available_months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
            for (let i = 1; i < sprints.length; i++) {
                const sprintMonths = sprints[i].available_months || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                commonMonths = commonMonths.filter(month => sprintMonths.includes(month));
            }
        }
        if (commonMonths.length === 0) {
            issues.push({
                type: 'seasonal_incompatibility',
                description: 'No common months available across all sprints',
                affected_sprints: sprints.map(s => ({ id: s.id, name: s.name }))
            });
        }
        else if (commonMonths.length < 3) {
            issues.push({
                type: 'seasonal_warning',
                description: `Limited seasonal availability: only ${commonMonths.length} common months`,
                available_months: commonMonths,
                affected_sprints: sprints.map(s => ({ id: s.id, name: s.name }))
            });
        }
        return issues;
    }
    analyzeDurationConstraints(sprints) {
        const warnings = [];
        const totalDuration = sprints.reduce((sum, sprint) => sum + (sprint.calculated_duration_hours || 0), 0);
        const totalDays = Math.round(totalDuration / 24);
        if (totalDays > 90) {
            warnings.push({
                type: 'long_duration',
                description: `Campaign duration is very long: ${totalDays} days`,
                total_duration_days: totalDays
            });
        }
        if (totalDays < 7) {
            warnings.push({
                type: 'short_duration',
                description: `Campaign duration is very short: ${totalDays} days`,
                total_duration_days: totalDays
            });
        }
        return warnings;
    }
    transformPoolRow(row) {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            sprint_ids: row.sprint_ids,
            sprint_names: row.sprint_names || [],
            total_duration_hours: row.total_duration_hours,
            compatible_accounts: row.compatible_accounts,
            assignment_strategy: row.assignment_strategy,
            time_horizon_days: row.time_horizon_days,
            is_template: row.is_template || false,
            template_category: row.template_category,
            usage_count: row.usage_count || 0,
            last_assigned: row.last_assigned,
            created_at: row.created_at,
            updated_at: row.updated_at
        };
    }
}
exports.CampaignPoolService = CampaignPoolService;
//# sourceMappingURL=CampaignPoolService.js.map