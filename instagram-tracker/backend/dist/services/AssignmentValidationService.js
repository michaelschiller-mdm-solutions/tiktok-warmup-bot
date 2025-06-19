"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AssignmentValidationService = void 0;
const database_1 = require("../database");
class AssignmentValidationService {
    async validateAssignment(accountId, sprintId) {
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
    async checkAccountEligibility(accountId) {
        const checks = [];
        const warmupResult = await database_1.db.query(`
      SELECT is_warmup_complete($1) as is_complete
    `, [accountId]);
        checks.push({
            check: 'warmup_complete',
            passed: warmupResult.rows[0]?.is_complete || false,
            message: warmupResult.rows[0]?.is_complete
                ? 'Account has completed warmup'
                : 'Account must complete warmup before sprint assignment'
        });
        const accountResult = await database_1.db.query(`
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
        const cooldownResult = await database_1.db.query(`
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
        const idleResult = await database_1.db.query(`
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
    async checkConflicts(accountId, sprintId) {
        const conflicts = [];
        const sprintResult = await database_1.db.query(`
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
        if (sprint.location) {
            const activeSprintsResult = await database_1.db.query(`
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
    async checkWarnings(accountId, sprintId) {
        const warnings = [];
        const contentCountResult = await database_1.db.query(`
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
exports.AssignmentValidationService = AssignmentValidationService;
//# sourceMappingURL=AssignmentValidationService.js.map