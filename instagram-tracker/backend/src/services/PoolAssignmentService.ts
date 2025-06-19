import { db } from '../database';
import { CampaignPoolService } from './CampaignPoolService';
import { SprintAssignmentService } from './SprintAssignmentService';
import { 
  AssignmentOptions, 
  AssignmentResult, 
  PoolAssignment,
  FailedAssignment,
  AssignmentWarning,
  BulkAssignmentRequest,
  BulkAssignmentResult
} from '../types/campaignPools';

export class PoolAssignmentService {
  private campaignPoolService: CampaignPoolService;
  private sprintAssignmentService: SprintAssignmentService;

  constructor() {
    this.campaignPoolService = new CampaignPoolService();
    this.sprintAssignmentService = new SprintAssignmentService();
  }

  /**
   * Assign a campaign pool to accounts
   */
  async assignPoolToAccounts(poolId: number, options: AssignmentOptions): Promise<AssignmentResult> {
    await db.query('BEGIN');

    try {
      // Get pool details
      const poolQuery = `
        SELECT cp.*, array_agg(cs.name) as sprint_names
        FROM campaign_pools cp
        LEFT JOIN content_sprints cs ON cs.id = ANY(cp.sprint_ids)
        WHERE cp.id = $1
        GROUP BY cp.id
      `;
      
      const poolResult = await db.query(poolQuery, [poolId]);
      
      if (poolResult.rows.length === 0) {
        throw new Error(`Campaign pool ${poolId} not found`);
      }
      
      const pool = poolResult.rows[0];

      // Validate pool compatibility
      const compatibility = await this.campaignPoolService.validateSprintCompatibility(pool.sprint_ids);
      if (!compatibility.is_compatible) {
        throw new Error(`Pool ${poolId} has compatibility issues: ${compatibility.message}`);
      }

      // Determine target accounts
      const targetAccounts = await this.getTargetAccounts(poolId, options);

      // Execute assignment strategy
      const assignments = await this.executeAssignmentStrategy(pool, targetAccounts, options);

      // Process assignments with conflict resolution
      const result = await this.processPoolAssignments(assignments);

      // Update pool usage statistics
      await this.updatePoolUsageStats(poolId, result);

      await db.query('COMMIT');

      return result;

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Bulk assign multiple pools to accounts
   */
  async bulkAssignPools(request: BulkAssignmentRequest): Promise<BulkAssignmentResult> {
    const results: AssignmentResult[] = [];
    const overallWarnings: AssignmentWarning[] = [];
    let successfulPools = 0;
    let failedPools = 0;
    let totalAccountsAssigned = 0;

    // Process each pool assignment
    for (const poolAssignment of request.pool_assignments) {
      try {
        const result = await this.assignPoolToAccounts(
          poolAssignment.pool_id, 
          poolAssignment.options
        );
        
        results.push(result);
        successfulPools++;
        totalAccountsAssigned += result.total_accounts_assigned;

      } catch (error) {
        failedPools++;
        overallWarnings.push({
          type: 'compatibility',
          message: `Failed to assign pool ${poolAssignment.pool_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return {
      successful_pools: successfulPools,
      failed_pools: failedPools,
      total_accounts_assigned: totalAccountsAssigned,
      assignment_results: results,
      overall_warnings: overallWarnings
    };
  }

  /**
   * Preview assignment without actually creating it
   */
  async previewAssignment(poolId: number, options: AssignmentOptions): Promise<{
    eligible_accounts: number;
    assignment_preview: PoolAssignment[];
    potential_conflicts: AssignmentWarning[];
  }> {
    // Get pool details
    const poolQuery = `
      SELECT cp.*, array_agg(cs.name) as sprint_names
      FROM campaign_pools cp
      LEFT JOIN content_sprints cs ON cs.id = ANY(cp.sprint_ids)
      WHERE cp.id = $1
      GROUP BY cp.id
    `;
    
    const poolResult = await db.query(poolQuery, [poolId]);
    
    if (poolResult.rows.length === 0) {
      throw new Error(`Campaign pool ${poolId} not found`);
    }
    
    const pool = poolResult.rows[0];

    // Get target accounts
    const targetAccounts = await this.getTargetAccounts(poolId, options);

    // Generate assignment preview without committing
    const assignmentPreviews = await this.executeAssignmentStrategy(pool, targetAccounts, options);

    // Check for potential conflicts
    const potentialConflicts = await this.analyzeAssignmentConflicts(assignmentPreviews);

    return {
      eligible_accounts: targetAccounts.length,
      assignment_preview: assignmentPreviews.map(a => ({
        account_id: a.account_id,
        pool_id: a.pool_id,
        sprint_ids: a.sprint_ids,
        assignment_date: new Date(),
        start_date: a.start_date,
        strategy_used: a.strategy_used
      })),
      potential_conflicts: potentialConflicts
    };
  }

  /**
   * Get eligible accounts for pool assignment
   */
  private async getTargetAccounts(poolId: number, options: AssignmentOptions): Promise<any[]> {
    if (options.strategy === 'manual' && options.account_ids) {
      // Manual selection - get specific accounts
      const accountQuery = `
        SELECT a.id, a.username, a.status, acs.current_location, acs.cooldown_until
        FROM accounts a
        LEFT JOIN account_content_state acs ON acs.account_id = a.id
        WHERE a.id = ANY($1) AND a.status = 'active'
      `;
      
      const result = await db.query(accountQuery, [options.account_ids]);
      return result.rows;
    }

    // Automatic selection - get all eligible accounts
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

    const result = await db.query(eligibilityQuery);
    return result.rows;
  }

  /**
   * Execute assignment strategy
   */
  private async executeAssignmentStrategy(
    pool: any,
    accounts: any[],
    options: AssignmentOptions
  ): Promise<any[]> {
    const startDate = options.start_date || new Date();
    
    let selectedAccounts: any[];

    switch (options.strategy) {
      case 'random':
        selectedAccounts = this.randomSelection(accounts, options.max_assignments);
        break;
      case 'balanced':
        selectedAccounts = this.balancedSelection(accounts, options.max_assignments);
        break;
      case 'manual':
        selectedAccounts = accounts; // Already filtered in getTargetAccounts
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

  /**
   * Random selection strategy
   */
  private randomSelection(accounts: any[], maxAssignments?: number): any[] {
    const shuffled = [...accounts].sort(() => Math.random() - 0.5);
    return maxAssignments ? shuffled.slice(0, maxAssignments) : shuffled;
  }

  /**
   * Balanced selection strategy
   */
  private balancedSelection(accounts: any[], maxAssignments?: number): any[] {
    // Sort by current assignment count (ascending) for balanced distribution
    const sorted = accounts.sort((a, b) => 
      (a.current_assignments || 0) - (b.current_assignments || 0)
    );
    return maxAssignments ? sorted.slice(0, maxAssignments) : sorted;
  }

  /**
   * Process pool assignments by creating individual sprint assignments
   */
  private async processPoolAssignments(assignments: any[]): Promise<AssignmentResult> {
    const successfulAssignments: PoolAssignment[] = [];
    const failedAssignments: FailedAssignment[] = [];
    const warnings: AssignmentWarning[] = [];
    let conflictsResolved = 0;

    for (const assignment of assignments) {
      try {
        // Create assignments for each sprint in the pool
        for (const sprintId of assignment.sprint_ids) {
          await this.sprintAssignmentService.createAssignment(
            assignment.account_id,
            sprintId,
            {
              start_date: assignment.start_date,
              assignment_strategy: assignment.strategy_used
            }
          );
        }

        successfulAssignments.push({
          account_id: assignment.account_id,
          pool_id: assignment.pool_id,
          sprint_ids: assignment.sprint_ids,
          assignment_date: new Date(),
          start_date: assignment.start_date,
          strategy_used: assignment.strategy_used
        });

      } catch (error) {
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

  /**
   * Analyze potential assignment conflicts
   */
  private async analyzeAssignmentConflicts(assignments: any[]): Promise<AssignmentWarning[]> {
    const warnings: AssignmentWarning[] = [];

    // Check for cooldown conflicts
    const cooldownConflicts = await this.checkCooldownConflicts(assignments);
    warnings.push(...cooldownConflicts);

    // Check for location conflicts
    const locationConflicts = await this.checkLocationConflicts(assignments);
    warnings.push(...locationConflicts);

    // Check for seasonal conflicts
    const seasonalConflicts = await this.checkSeasonalConflicts(assignments);
    warnings.push(...seasonalConflicts);

    return warnings;
  }

  /**
   * Check for cooldown conflicts
   */
  private async checkCooldownConflicts(assignments: any[]): Promise<AssignmentWarning[]> {
    const warnings: AssignmentWarning[] = [];
    const accountIds = assignments.map(a => a.account_id);

    if (accountIds.length === 0) return warnings;

    const cooldownQuery = `
      SELECT account_id, cooldown_until
      FROM account_content_state
      WHERE account_id = ANY($1) 
        AND cooldown_until > CURRENT_TIMESTAMP
    `;

    const result = await db.query(cooldownQuery, [accountIds]);
    
    if (result.rows.length > 0) {
      warnings.push({
        type: 'timing',
        message: `${result.rows.length} accounts are currently in cooldown period`,
        affected_accounts: result.rows.map(r => r.account_id)
      });
    }

    return warnings;
  }

  /**
   * Check for location conflicts
   */
  private async checkLocationConflicts(assignments: any[]): Promise<AssignmentWarning[]> {
    const warnings: AssignmentWarning[] = [];
    // Implementation would check if accounts are in conflicting locations
    // For now, return empty array as this requires more complex location logic
    return warnings;
  }

  /**
   * Check for seasonal conflicts
   */
  private async checkSeasonalConflicts(assignments: any[]): Promise<AssignmentWarning[]> {
    const warnings: AssignmentWarning[] = [];
    const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-indexed

    // Check if any pools have seasonal restrictions that conflict with current month
    const poolIds = [...new Set(assignments.map(a => a.pool_id))];
    
    for (const poolId of poolIds) {
      const pool = await this.campaignPoolService.getPool(poolId);
      if (pool) {
        const compatibility = await this.campaignPoolService.validateSprintCompatibility(pool.sprint_ids);
        if (compatibility.seasonal_issues.length > 0) {
          warnings.push({
            type: 'compatibility',
            message: `Pool ${poolId} has seasonal restrictions for current month (${currentMonth})`
          });
        }
      }
    }

    return warnings;
  }

  /**
   * Update pool usage statistics
   */
  private async updatePoolUsageStats(poolId: number, result: AssignmentResult): Promise<void> {
    const updateQuery = `
      UPDATE campaign_pools 
      SET usage_count = usage_count + 1,
          last_assigned = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await db.query(updateQuery, [poolId]);
  }

  /**
   * Categorize error type for failed assignments
   */
  private categorizeError(error: any): 'cooldown' | 'location' | 'seasonal' | 'blocking' | 'other' {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    
    if (message.includes('cooldown')) return 'cooldown';
    if (message.includes('location')) return 'location';
    if (message.includes('seasonal') || message.includes('month')) return 'seasonal';
    if (message.includes('block')) return 'blocking';
    
    return 'other';
  }
} 