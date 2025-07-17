"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolAssignmentService = void 0;
const database_1 = require("../database");
const CampaignPoolService_1 = require("./CampaignPoolService");
const SprintAssignmentService_1 = require("./SprintAssignmentService");
class PoolAssignmentService {
    constructor() {
        this.campaignPoolService = new CampaignPoolService_1.CampaignPoolService();
        this.sprintAssignmentService = new SprintAssignmentService_1.SprintAssignmentService();
    }
    async assignPoolToAccounts(poolId, accountIds, options) {
        await database_1.db.query('BEGIN');
        try {
            const poolQuery = `
        SELECT cp.*, array_agg(cs.name) as sprint_names
        FROM campaign_pools cp
        LEFT JOIN content_sprints cs ON cs.id = ANY(cp.sprint_ids)
        WHERE cp.id = $1
        GROUP BY cp.id
      `;
            const poolResult = await database_1.db.query(poolQuery, [poolId]);
            if (poolResult.rows.length === 0) {
                throw new Error(`Campaign pool ${poolId} not found`);
            }
            const pool = poolResult.rows[0];
            const compatibility = await this.campaignPoolService.validateSprintCompatibility(pool.sprint_ids);
            if (!compatibility.is_compatible) {
                throw new Error(`Pool ${poolId} has compatibility issues: ${compatibility.message}`);
            }
            const targetAccounts = await this.getTargetAccounts(poolId, options);
            const assignments = await this.executeAssignmentStrategy(pool, targetAccounts, options);
            const result = await this.processPoolAssignments(assignments);
            await this.updatePoolUsageStats(poolId, result);
            await database_1.db.query('COMMIT');
            return result;
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async bulkAssignPools(request) {
        const results = [];
        const overallWarnings = [];
        let successfulPools = 0;
        let failedPools = 0;
        let totalAccountsAssigned = 0;
        for (const poolAssignment of request.pool_assignments) {
            try {
                const result = await this.assignPoolToAccounts(poolAssignment.pool_id, poolAssignment.account_ids, {
                    strategy: request.assignment_strategy,
                    start_date: request.start_date,
                    priority: request.priority
                });
                results.push(result);
                successfulPools++;
                totalAccountsAssigned += result.total_accounts_assigned;
            }
            catch (error) {
                failedPools++;
                overallWarnings.push({
                    type: 'compatibility',
                    message: `Failed to assign pool ${poolAssignment.pool_id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    severity: 'high'
                });
            }
        }
        return {
            successful_pools: successfulPools,
            failed_pools: failedPools,
            failed_assignments: failedPools,
            assignment_details: results,
            summary: {
                total_pools: request.pool_assignments.length,
                total_accounts: request.pool_assignments.reduce((sum, p) => sum + p.account_ids.length, 0),
                success_rate: results.length / request.pool_assignments.length,
                warnings: overallWarnings
            }
        };
    }
    async previewAssignment(poolId, options) {
        const poolQuery = `
      SELECT cp.*, array_agg(cs.name) as sprint_names
      FROM campaign_pools cp
      LEFT JOIN content_sprints cs ON cs.id = ANY(cp.sprint_ids)
      WHERE cp.id = $1
      GROUP BY cp.id
    `;
        const poolResult = await database_1.db.query(poolQuery, [poolId]);
        if (poolResult.rows.length === 0) {
            throw new Error(`Campaign pool ${poolId} not found`);
        }
        const pool = poolResult.rows[0];
        const targetAccounts = await this.getTargetAccounts(poolId, options);
        const assignmentPreviews = targetAccounts.map(account => ({
            account_id: account.id,
            pool_id: poolId,
            status: 'scheduled',
            progress_percentage: 0,
            current_content_index: 0,
            id: 0,
            assignment_date: new Date().toISOString(),
            created_at: new Date().toISOString()
        }));
        const potentialConflicts = await this.analyzeAssignmentConflicts(assignmentPreviews);
        return {
            eligible_accounts: targetAccounts.length,
            assignment_preview: assignmentPreviews,
            potential_conflicts: potentialConflicts
        };
    }
    async getTargetAccounts(poolId, options) {
        if (options.strategy === 'manual' && options.account_ids) {
            const accountQuery = `
        SELECT a.id, a.username, a.status, acs.current_location, acs.cooldown_until
        FROM accounts a
        LEFT JOIN account_content_state acs ON acs.account_id = a.id
        WHERE a.id = ANY($1) AND a.status = 'active'
      `;
            const result = await database_1.db.query(accountQuery, [options.account_ids]);
            return result.rows;
        }
        const eligibilityQuery = `
      SELECT a.id, a.username, a.status, acs.current_location, acs.cooldown_until,
             COUNT(asa.id) as current_assignments
      FROM accounts a
      LEFT JOIN account_content_state acs ON acs.account_id = a.id
      LEFT JOIN account_sprint_assignments asa ON asa.account_id = a.id 
        AND asa.status IN ('scheduled', 'active')
      WHERE a.status = 'active' 
        AND is_warmup_complete(a.id) = true
        AND (NOT options.respect_cooldowns OR acs.cooldown_until IS NULL OR acs.cooldown_until <= CURRENT_TIMESTAMP)
      GROUP BY a.id, a.username, a.status, acs.current_location, acs.cooldown_until
      ORDER BY current_assignments ASC, a.id ASC
    `;
        const result = await database_1.db.query(eligibilityQuery);
        return result.rows;
    }
    async executeAssignmentStrategy(pool, accounts, options) {
        const startDate = options.start_date || new Date();
        let selectedAccounts;
        switch (options.strategy) {
            case 'random':
                selectedAccounts = this.randomSelection(accounts, options.max_assignments);
                break;
            case 'balanced':
                selectedAccounts = this.balancedSelection(accounts, options.max_assignments);
                break;
            case 'manual':
                selectedAccounts = accounts;
                break;
            default:
                throw new Error(`Unknown assignment strategy: ${options.strategy}`);
        }
        return selectedAccounts.map(account => ({
            account_id: account.id,
            pool_id: pool.id,
            sprint_ids: pool.sprint_ids,
            start_date: startDate,
            strategy_used: options.strategy
        }));
    }
    randomSelection(accounts, maxAssignments) {
        const shuffled = [...accounts].sort(() => Math.random() - 0.5);
        return maxAssignments ? shuffled.slice(0, maxAssignments) : shuffled;
    }
    balancedSelection(accounts, maxAssignments) {
        const sorted = accounts.sort((a, b) => (a.current_assignments || 0) - (b.current_assignments || 0));
        return maxAssignments ? sorted.slice(0, maxAssignments) : sorted;
    }
    async processPoolAssignments(assignments) {
        const successfulAssignments = [];
        const failedAssignments = [];
        const warnings = [];
        let conflictsResolved = 0;
        for (const assignment of assignments) {
            try {
                for (const sprintId of assignment.sprint_ids) {
                    await this.sprintAssignmentService.createAssignment(assignment.account_id, sprintId, {
                        start_date: assignment.start_date,
                        assignment_strategy: assignment.strategy_used
                    });
                }
                successfulAssignments.push({
                    account_id: assignment.account_id,
                    pool_id: assignment.pool_id,
                    sprint_ids: assignment.sprint_ids,
                    assignment_date: new Date().toISOString(),
                    start_date: assignment.start_date,
                    strategy_used: assignment.strategy_used
                });
            }
            catch (error) {
                failedAssignments.push({
                    account_id: assignment.account_id,
                    pool_id: assignment.pool_id,
                    reason: error instanceof Error ? error.message : 'Unknown error',
                    conflict_type: this.categorizeError(error)
                });
            }
        }
        return {
            successful_assignments: successfulAssignments,
            failed_assignments: failedAssignments,
            total_accounts_assigned: successfulAssignments.length,
            conflicts_resolved: conflictsResolved,
            warnings: warnings
        };
    }
    async analyzeAssignmentConflicts(assignments) {
        const warnings = [];
        const cooldownConflicts = await this.checkCooldownConflicts(assignments);
        warnings.push(...cooldownConflicts);
        const locationConflicts = await this.checkLocationConflicts(assignments);
        warnings.push(...locationConflicts);
        const seasonalConflicts = await this.checkSeasonalConflicts(assignments);
        warnings.push(...seasonalConflicts);
        return warnings;
    }
    async checkCooldownConflicts(assignments) {
        const warnings = [];
        const accountIds = assignments.map(a => a.account_id);
        if (accountIds.length === 0)
            return warnings;
        const cooldownQuery = `
      SELECT account_id, cooldown_until
      FROM account_content_state
      WHERE account_id = ANY($1) 
        AND cooldown_until > CURRENT_TIMESTAMP
    `;
        const result = await database_1.db.query(cooldownQuery, [accountIds]);
        if (result.rows.length > 0) {
            warnings.push({
                type: 'timing',
                message: `Pool schedule conflicts with ${result.rows.length} existing assignments`,
                severity: 'medium',
                affected_accounts: result.rows.map(r => r.account_id)
            });
        }
        return warnings;
    }
    async checkLocationConflicts(assignments) {
        const warnings = [];
        return warnings;
    }
    async checkSeasonalConflicts(assignments) {
        const warnings = [];
        const currentMonth = new Date().getMonth() + 1;
        const poolIds = [...new Set(assignments.map(a => a.pool_id))];
        for (const poolId of poolIds) {
            const pool = await this.campaignPoolService.getPool(poolId);
            if (pool) {
                const compatibility = await this.campaignPoolService.validateSprintCompatibility(pool.sprint_ids);
                if (compatibility.seasonal_issues.length > 0) {
                    warnings.push({
                        type: 'compatibility',
                        message: `Pool ${poolId} has seasonal restrictions for current month (${currentMonth})`,
                        severity: 'low'
                    });
                }
            }
        }
        return warnings;
    }
    async updatePoolUsageStats(poolId, result) {
        const updateQuery = `
      UPDATE campaign_pools 
      SET usage_count = usage_count + 1,
          last_assigned = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
        await database_1.db.query(updateQuery, [poolId]);
    }
    categorizeError(error) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        if (message.includes('cooldown'))
            return 'cooldown';
        if (message.includes('location'))
            return 'location';
        if (message.includes('seasonal') || message.includes('month'))
            return 'seasonal';
        if (message.includes('block'))
            return 'blocking';
        return 'other';
    }
}
exports.PoolAssignmentService = PoolAssignmentService;
//# sourceMappingURL=PoolAssignmentService.js.map