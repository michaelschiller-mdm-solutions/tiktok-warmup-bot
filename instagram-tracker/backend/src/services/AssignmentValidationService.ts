import { db } from '../database';
import { ValidationResult, Conflict, Warning, EligibilityCheck } from '../types/assignments';

export class AssignmentValidationService {
  /**
   * Validate if an assignment can be created
   */
  async validateAssignment(accountId: number, sprintId: number): Promise<ValidationResult> {
    const eligibilityChecks = await this.checkAccountEligibility(accountId);
    const conflicts = await this.checkConflicts(accountId, sprintId);
    const warnings = await this.checkWarnings(accountId, sprintId);

    const isValid = eligibilityChecks.every(check => check.passed) && 
                   conflicts.every(conflict => conflict.severity !== 'error');

    return {
      isValid,
      conflicts,
      warnings,
      eligibilityChecks
    };
  }

  /**
   * Check if account is eligible for sprint assignment
   */
  async checkAccountEligibility(accountId: number): Promise<EligibilityCheck[]> {
    const checks: EligibilityCheck[] = [];

    // Check 1: Account has completed warmup
    const warmupResult = await db.query(`
      SELECT is_warmup_complete($1) as is_complete
    `, [accountId]);

    checks.push({
      check: 'warmup_complete',
      passed: warmupResult.rows[0]?.is_complete || false,
      message: warmupResult.rows[0]?.is_complete 
        ? 'Account has completed warmup' 
        : 'Account must complete warmup before sprint assignment'
    });

    // Check 2: Account is active
    const accountResult = await db.query(`
      SELECT status FROM accounts WHERE id = $1
    `, [accountId]);

    const isActive = accountResult.rows[0]?.status === 'active';
    checks.push({
      check: 'account_active',
      passed: isActive,
      message: isActive 
        ? 'Account is active' 
        : 'Account must be active for sprint assignment',
      details: { current_status: accountResult.rows[0]?.status }
    });

    // Check 3: Account not in cooldown
    const cooldownResult = await db.query(`
      SELECT cooldown_until FROM account_content_state 
      WHERE account_id = $1
    `, [accountId]);

    const cooldownUntil = cooldownResult.rows[0]?.cooldown_until;
    const notInCooldown = !cooldownUntil || new Date(cooldownUntil) <= new Date();
    
    checks.push({
      check: 'not_in_cooldown',
      passed: notInCooldown,
      message: notInCooldown 
        ? 'Account not in cooldown period' 
        : 'Account in cooldown period',
      details: { cooldown_until: cooldownUntil }
    });

    // Check 4: Account not in forced idle
    const idleResult = await db.query(`
      SELECT idle_since, silence_during_idle FROM account_content_state 
      WHERE account_id = $1
    `, [accountId]);

    const idleSince = idleResult.rows[0]?.idle_since;
    const silenceDuringIdle = idleResult.rows[0]?.silence_during_idle;
    const notIdle = !idleSince || !silenceDuringIdle;

    checks.push({
      check: 'not_idle',
      passed: notIdle,
      message: notIdle 
        ? 'Account not in forced idle state' 
        : 'Account in forced idle state',
      details: { idle_since: idleSince, silence_during_idle: silenceDuringIdle }
    });

    return checks;
  }

  /**
   * Check for conflicts with existing assignments
   */
  async checkConflicts(accountId: number, sprintId: number): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Get sprint details
    const sprintResult = await db.query(`
      SELECT * FROM content_sprints WHERE id = $1
    `, [sprintId]);

    if (sprintResult.rows.length === 0) {
      conflicts.push({
        type: 'capacity',
        severity: 'error',
        message: 'Sprint not found',
        affected_sprint_id: sprintId,
        details: {}
      });
      return conflicts;
    }

    const sprint = sprintResult.rows[0];

    // Check location conflicts
    if (sprint.location) {
      const activeSprintsResult = await db.query(`
        SELECT cs.location, cs.name
        FROM account_sprint_assignments asa
        JOIN content_sprints cs ON asa.sprint_id = cs.id
        WHERE asa.account_id = $1 
          AND asa.status = 'active'
          AND cs.location IS NOT NULL
          AND cs.location != $2
      `, [accountId, sprint.location]);

      for (const activeSprint of activeSprintsResult.rows) {
        conflicts.push({
          type: 'location',
          severity: 'error',
          message: `Location conflict: Account has active sprint at ${activeSprint.location}`,
          affected_account_id: accountId,
          affected_sprint_id: sprint.id,
          details: {
            current_location: activeSprint.location,
            new_location: sprint.location
          }
        });
      }
    }

    return conflicts;
  }

  /**
   * Check for warnings (non-blocking issues)
   */
  async checkWarnings(accountId: number, sprintId: number): Promise<Warning[]> {
    const warnings: Warning[] = [];

    // Check if sprint has enough content
    const contentCountResult = await db.query(`
      SELECT COUNT(*) as content_count
      FROM sprint_content_items
      WHERE sprint_id = $1
    `, [sprintId]);

    const contentCount = parseInt(contentCountResult.rows[0].content_count);
    if (contentCount < 5) {
      warnings.push({
        type: 'content',
        message: `Sprint has only ${contentCount} content items`,
        details: { content_count: contentCount }
      });
    }

    return warnings;
  }
} 