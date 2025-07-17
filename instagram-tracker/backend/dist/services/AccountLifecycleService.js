"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountLifecycleService = exports.AccountLifecycleState = void 0;
const database_1 = require("../database");
var AccountLifecycleState;
(function (AccountLifecycleState) {
    AccountLifecycleState["IMPORTED"] = "imported";
    AccountLifecycleState["READY"] = "ready";
    AccountLifecycleState["READY_FOR_BOT_ASSIGNMENT"] = "ready_for_bot_assignment";
    AccountLifecycleState["WARMUP"] = "warmup";
    AccountLifecycleState["ACTIVE"] = "active";
    AccountLifecycleState["PAUSED"] = "paused";
    AccountLifecycleState["CLEANUP"] = "cleanup";
    AccountLifecycleState["MAINTENANCE"] = "maintenance";
    AccountLifecycleState["ARCHIVED"] = "archived";
})(AccountLifecycleState || (exports.AccountLifecycleState = AccountLifecycleState = {}));
const VALID_TRANSITIONS = {
    [AccountLifecycleState.IMPORTED]: [AccountLifecycleState.READY, AccountLifecycleState.ARCHIVED],
    [AccountLifecycleState.READY]: [AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT, AccountLifecycleState.WARMUP, AccountLifecycleState.ARCHIVED],
    [AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT]: [AccountLifecycleState.WARMUP, AccountLifecycleState.ARCHIVED],
    [AccountLifecycleState.WARMUP]: [AccountLifecycleState.MAINTENANCE, AccountLifecycleState.PAUSED, AccountLifecycleState.ARCHIVED],
    [AccountLifecycleState.ACTIVE]: [AccountLifecycleState.PAUSED, AccountLifecycleState.CLEANUP, AccountLifecycleState.ARCHIVED],
    [AccountLifecycleState.PAUSED]: [AccountLifecycleState.ACTIVE, AccountLifecycleState.CLEANUP, AccountLifecycleState.ARCHIVED],
    [AccountLifecycleState.CLEANUP]: [AccountLifecycleState.READY, AccountLifecycleState.ARCHIVED],
    [AccountLifecycleState.MAINTENANCE]: [AccountLifecycleState.PAUSED, AccountLifecycleState.CLEANUP, AccountLifecycleState.ARCHIVED],
    [AccountLifecycleState.ARCHIVED]: []
};
class AccountLifecycleService {
    static isValidTransition(fromState, toState) {
        return VALID_TRANSITIONS[fromState]?.includes(toState) || false;
    }
    static getAvailableTransitions(currentState) {
        return VALID_TRANSITIONS[currentState] || [];
    }
    static async validateAccountForState(accountId, targetState) {
        try {
            const accountQuery = `
        SELECT a.*, m.id as model_exists
        FROM accounts a
        LEFT JOIN models m ON a.model_id = m.id
        WHERE a.id = $1
      `;
            const accountResult = await database_1.db.query(accountQuery, [accountId]);
            if (accountResult.rows.length === 0) {
                return {
                    isValid: false,
                    errors: [{ field: 'account', message: 'Account not found', code: 'ACCOUNT_NOT_FOUND' }],
                    missingRequirements: ['Account must exist'],
                    canTransition: false
                };
            }
            const account = accountResult.rows[0];
            const rulesQuery = `
        SELECT * FROM state_validation_rules WHERE state = $1
      `;
            const rulesResult = await database_1.db.query(rulesQuery, [targetState]);
            if (rulesResult.rows.length === 0) {
                return {
                    isValid: true,
                    errors: [],
                    missingRequirements: [],
                    canTransition: true
                };
            }
            const rules = rulesResult.rows[0];
            const errors = [];
            const missingRequirements = [];
            if (rules.requires_proxy && (!account.proxy_host || !account.proxy_port)) {
                errors.push({
                    field: 'proxy',
                    message: 'Account must have proxy configuration',
                    code: 'PROXY_REQUIRED'
                });
                missingRequirements.push('Proxy configuration');
            }
            if (rules.requires_model_assignment && !account.model_exists) {
                errors.push({
                    field: 'model',
                    message: 'Account must be assigned to a valid model',
                    code: 'MODEL_ASSIGNMENT_REQUIRED'
                });
                missingRequirements.push('Model assignment');
            }
            if (rules.requires_warmup_completion) {
                if (account.lifecycle_state !== AccountLifecycleState.WARMUP &&
                    account.lifecycle_state !== AccountLifecycleState.ACTIVE) {
                    errors.push({
                        field: 'warmup',
                        message: 'Account must complete warmup process',
                        code: 'WARMUP_INCOMPLETE'
                    });
                    missingRequirements.push('Warmup completion');
                }
            }
            if (rules.requires_profile_configuration) {
                if (!account.username || account.username.length < 3) {
                    errors.push({
                        field: 'profile',
                        message: 'Account must have valid profile configuration',
                        code: 'PROFILE_INCOMPLETE'
                    });
                    missingRequirements.push('Profile configuration');
                }
            }
            if (rules.requires_no_active_errors) {
                if (account.status === 'error' || account.status === 'suspended') {
                    errors.push({
                        field: 'errors',
                        message: 'Account must not have active errors',
                        code: 'ACTIVE_ERRORS_EXIST'
                    });
                    missingRequirements.push('Error resolution');
                }
            }
            return {
                isValid: errors.length === 0,
                errors,
                missingRequirements,
                canTransition: errors.length === 0
            };
        }
        catch (error) {
            console.error('Error validating account for state:', error);
            return {
                isValid: false,
                errors: [{ field: 'system', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
                missingRequirements: ['System validation'],
                canTransition: false
            };
        }
    }
    static async transitionAccountState(request) {
        const client = await database_1.db.connect();
        try {
            await client.query('BEGIN');
            const currentStateQuery = `
        SELECT lifecycle_state FROM accounts WHERE id = $1
      `;
            const currentStateResult = await client.query(currentStateQuery, [request.account_id]);
            if (currentStateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, error: 'Account not found' };
            }
            const currentState = currentStateResult.rows[0].lifecycle_state;
            if (!request.force && !this.isValidTransition(currentState, request.to_state)) {
                await client.query('ROLLBACK');
                return {
                    success: false,
                    error: `Invalid transition from ${currentState} to ${request.to_state}`
                };
            }
            if (!request.force) {
                const validation = await this.validateAccountForState(request.account_id, request.to_state);
                if (!validation.isValid) {
                    await client.query('ROLLBACK');
                    return {
                        success: false,
                        error: 'Account does not meet requirements for target state',
                        validation_errors: validation.errors
                    };
                }
            }
            const updateQuery = `
        UPDATE accounts 
        SET lifecycle_state = $1,
            state_changed_at = CURRENT_TIMESTAMP,
            state_changed_by = $2,
            state_notes = $3
        WHERE id = $4
      `;
            await client.query(updateQuery, [
                request.to_state,
                request.changed_by || 'system',
                request.notes,
                request.account_id
            ]);
            await client.query('COMMIT');
            return { success: true };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('Error transitioning account state:', error);
            return { success: false, error: 'Failed to transition account state' };
        }
        finally {
            client.release();
        }
    }
    static async bulkTransitionAccountStates(request) {
        const result = {
            successful: [],
            failed: [],
            total_processed: request.account_ids.length,
            success_count: 0,
            failure_count: 0
        };
        for (const accountId of request.account_ids) {
            try {
                const transitionResult = await this.transitionAccountState({
                    account_id: accountId,
                    to_state: request.to_state,
                    reason: request.reason,
                    notes: request.notes,
                    force: request.force,
                    changed_by: request.changed_by
                });
                if (transitionResult.success) {
                    result.successful.push(accountId);
                    result.success_count++;
                }
                else {
                    result.failed.push({
                        account_id: accountId,
                        error: transitionResult.error || 'Unknown error',
                        validation_errors: transitionResult.validation_errors
                    });
                    result.failure_count++;
                }
            }
            catch (error) {
                result.failed.push({
                    account_id: accountId,
                    error: 'Unexpected error during transition'
                });
                result.failure_count++;
            }
        }
        return result;
    }
    static async getLifecycleSummary() {
        try {
            const query = `
        SELECT * FROM account_lifecycle_summary
        ORDER BY 
          CASE lifecycle_state
            WHEN 'imported' THEN 1
            WHEN 'ready' THEN 2
            WHEN 'warmup' THEN 3
            WHEN 'active' THEN 4
            WHEN 'paused' THEN 5
            WHEN 'cleanup' THEN 6
            WHEN 'archived' THEN 7
            ELSE 8
          END
      `;
            const result = await database_1.db.query(query);
            return result.rows;
        }
        catch (error) {
            console.error('Error getting lifecycle summary:', error);
            return [];
        }
    }
    static async getAccountStateHistory(accountId) {
        try {
            const query = `
        SELECT * FROM account_state_transitions
        WHERE account_id = $1
        ORDER BY changed_at DESC
      `;
            const result = await database_1.db.query(query, [accountId]);
            return result.rows;
        }
        catch (error) {
            console.error('Error getting account state history:', error);
            return [];
        }
    }
    static async getAccountsByState(state, limit = 100, offset = 0) {
        try {
            const query = `
        SELECT a.*, m.name as model_name
        FROM accounts a
        LEFT JOIN models m ON a.model_id = m.id
        WHERE a.lifecycle_state = $1
        ORDER BY a.state_changed_at DESC
        LIMIT $2 OFFSET $3
      `;
            const result = await database_1.db.query(query, [state, limit, offset]);
            return result.rows;
        }
        catch (error) {
            console.error('Error getting accounts by state:', error);
            return [];
        }
    }
    static async invalidateAccount(accountId, changed_by = 'system') {
        const client = await database_1.db.connect();
        try {
            await client.query('BEGIN');
            const currentStateQuery = `SELECT lifecycle_state FROM accounts WHERE id = $1`;
            const currentStateResult = await client.query(currentStateQuery, [accountId]);
            if (currentStateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return { success: false, error: 'Account not found' };
            }
            const currentState = currentStateResult.rows[0].lifecycle_state;
            const notes = 'Account marked as invalid; resources released.';
            const updateStateQuery = `
          UPDATE accounts
          SET lifecycle_state = $1,
              state_changed_at = CURRENT_TIMESTAMP,
              state_changed_by = $2,
              state_notes = $3,
              proxy_id = NULL,
              proxy_assigned_at = NULL
          WHERE id = $4
      `;
            await client.query(updateStateQuery, [
                AccountLifecycleState.ARCHIVED,
                changed_by,
                notes,
                accountId
            ]);
            await client.query('SELECT release_account_from_iphone_container($1)', [accountId]);
            const logTransitionQuery = `
          INSERT INTO account_state_transitions
              (account_id, from_state, to_state, transition_reason, changed_by, notes)
          VALUES ($1, $2, $3, 'invalidation', $4, $5)
      `;
            await client.query(logTransitionQuery, [accountId, currentState, AccountLifecycleState.ARCHIVED, changed_by, notes]);
            await client.query('COMMIT');
            return { success: true };
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error(`Error invalidating account ${accountId}:`, error);
            return { success: false, error: 'Failed to invalidate account' };
        }
        finally {
            client.release();
        }
    }
}
exports.AccountLifecycleService = AccountLifecycleService;
//# sourceMappingURL=AccountLifecycleService.js.map