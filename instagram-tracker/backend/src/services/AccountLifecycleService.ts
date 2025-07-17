import { db } from '../database';
import { PoolClient } from 'pg';

export enum AccountLifecycleState {
  IMPORTED = 'imported',
  READY = 'ready',
  READY_FOR_BOT_ASSIGNMENT = 'ready_for_bot_assignment',
  WARMUP = 'warmup',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLEANUP = 'cleanup',
  MAINTENANCE = 'maintenance',
  ARCHIVED = 'archived'
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface StateValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  missingRequirements: string[];
  canTransition: boolean;
}

export interface StateTransitionRequest {
  account_id: number;
  to_state: AccountLifecycleState;
  reason?: string;
  notes?: string;
  force?: boolean;
  changed_by?: string;
}

export interface BulkStateTransitionRequest {
  account_ids: number[];
  to_state: AccountLifecycleState;
  reason?: string;
  notes?: string;
  force?: boolean;
  changed_by?: string;
}

export interface BulkStateTransitionResult {
  successful: number[];
  failed: Array<{
    account_id: number;
    error: string;
    validation_errors?: ValidationError[];
  }>;
  total_processed: number;
  success_count: number;
  failure_count: number;
}

// Valid state transitions matrix
const VALID_TRANSITIONS: Record<AccountLifecycleState, AccountLifecycleState[]> = {
  [AccountLifecycleState.IMPORTED]: [AccountLifecycleState.READY, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.READY]: [AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT, AccountLifecycleState.WARMUP, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT]: [AccountLifecycleState.WARMUP, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.WARMUP]: [AccountLifecycleState.MAINTENANCE, AccountLifecycleState.PAUSED, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.ACTIVE]: [AccountLifecycleState.PAUSED, AccountLifecycleState.CLEANUP, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.PAUSED]: [AccountLifecycleState.ACTIVE, AccountLifecycleState.CLEANUP, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.CLEANUP]: [AccountLifecycleState.READY, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.MAINTENANCE]: [AccountLifecycleState.PAUSED, AccountLifecycleState.CLEANUP, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.ARCHIVED]: [] // Terminal state
};

export class AccountLifecycleService {
  
  /**
   * Validate if a state transition is allowed
   */
  static isValidTransition(fromState: AccountLifecycleState, toState: AccountLifecycleState): boolean {
    return VALID_TRANSITIONS[fromState]?.includes(toState) || false;
  }

  /**
   * Get available transitions for a given state
   */
  static getAvailableTransitions(currentState: AccountLifecycleState): AccountLifecycleState[] {
    return VALID_TRANSITIONS[currentState] || [];
  }

  /**
   * Validate account meets requirements for a specific state
   */
  static async validateAccountForState(accountId: number, targetState: AccountLifecycleState): Promise<StateValidationResult> {
    try {
      // Get account details
      const accountQuery = `
        SELECT a.*, m.id as model_exists
        FROM accounts a
        LEFT JOIN models m ON a.model_id = m.id
        WHERE a.id = $1
      `;
      const accountResult = await db.query(accountQuery, [accountId]);
      
      if (accountResult.rows.length === 0) {
        return {
          isValid: false,
          errors: [{ field: 'account', message: 'Account not found', code: 'ACCOUNT_NOT_FOUND' }],
          missingRequirements: ['Account must exist'],
          canTransition: false
        };
      }

      const account = accountResult.rows[0];

      // Get validation rules for target state
      const rulesQuery = `
        SELECT * FROM state_validation_rules WHERE state = $1
      `;
      const rulesResult = await db.query(rulesQuery, [targetState]);
      
      if (rulesResult.rows.length === 0) {
        // No specific rules, allow transition
        return {
          isValid: true,
          errors: [],
          missingRequirements: [],
          canTransition: true
        };
      }

      const rules = rulesResult.rows[0];
      const errors: ValidationError[] = [];
      const missingRequirements: string[] = [];

      // Check proxy requirement
      if (rules.requires_proxy && (!account.proxy_host || !account.proxy_port)) {
        errors.push({
          field: 'proxy',
          message: 'Account must have proxy configuration',
          code: 'PROXY_REQUIRED'
        });
        missingRequirements.push('Proxy configuration');
      }

      // Check model assignment requirement
      if (rules.requires_model_assignment && !account.model_exists) {
        errors.push({
          field: 'model',
          message: 'Account must be assigned to a valid model',
          code: 'MODEL_ASSIGNMENT_REQUIRED'
        });
        missingRequirements.push('Model assignment');
      }

      // Check warmup completion requirement
      if (rules.requires_warmup_completion) {
        // TODO: Check warmup steps completion when warmup system is implemented
        // For now, assume warmup is complete if account was in warmup state
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

      // Check profile configuration requirement
      if (rules.requires_profile_configuration) {
        // Basic profile check - ensure username exists and is valid
        if (!account.username || account.username.length < 3) {
          errors.push({
            field: 'profile',
            message: 'Account must have valid profile configuration',
            code: 'PROFILE_INCOMPLETE'
          });
          missingRequirements.push('Profile configuration');
        }
      }

      // Check no active errors requirement
      if (rules.requires_no_active_errors) {
        // TODO: Check for active errors when error tracking is implemented
        // For now, assume no errors if account status is not 'error'
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

    } catch (error) {
      console.error('Error validating account for state:', error);
      return {
        isValid: false,
        errors: [{ field: 'system', message: 'Validation failed', code: 'VALIDATION_ERROR' }],
        missingRequirements: ['System validation'],
        canTransition: false
      };
    }
  }

  /**
   * Transition account to new state
   */
  static async transitionAccountState(request: StateTransitionRequest): Promise<{ success: boolean; error?: string; validation_errors?: ValidationError[] }> {
    const client: PoolClient = await db.connect();
    
    try {
      await client.query('BEGIN');

      // Get current account state
      const currentStateQuery = `
        SELECT lifecycle_state FROM accounts WHERE id = $1
      `;
      const currentStateResult = await client.query(currentStateQuery, [request.account_id]);
      
      if (currentStateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Account not found' };
      }

      const currentState = currentStateResult.rows[0].lifecycle_state as AccountLifecycleState;

      // Check if transition is valid
      if (!request.force && !this.isValidTransition(currentState, request.to_state)) {
        await client.query('ROLLBACK');
        return { 
          success: false, 
          error: `Invalid transition from ${currentState} to ${request.to_state}` 
        };
      }

      // Validate account meets requirements for target state
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

      // Update account state
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

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error transitioning account state:', error);
      return { success: false, error: 'Failed to transition account state' };
    } finally {
      client.release();
    }
  }

  /**
   * Bulk transition multiple accounts
   */
  static async bulkTransitionAccountStates(request: BulkStateTransitionRequest): Promise<BulkStateTransitionResult> {
    const result: BulkStateTransitionResult = {
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
        } else {
          result.failed.push({
            account_id: accountId,
            error: transitionResult.error || 'Unknown error',
            validation_errors: transitionResult.validation_errors
          });
          result.failure_count++;
        }
      } catch (error) {
        result.failed.push({
          account_id: accountId,
          error: 'Unexpected error during transition'
        });
        result.failure_count++;
      }
    }

    return result;
  }

  /**
   * Get lifecycle summary statistics
   */
  static async getLifecycleSummary(): Promise<any[]> {
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
      
      const result = await db.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting lifecycle summary:', error);
      return [];
    }
  }

  /**
   * Get state transition history for an account
   */
  static async getAccountStateHistory(accountId: number): Promise<any[]> {
    try {
      const query = `
        SELECT * FROM account_state_transitions
        WHERE account_id = $1
        ORDER BY changed_at DESC
      `;
      
      const result = await db.query(query, [accountId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting account state history:', error);
      return [];
    }
  }

  /**
   * Get accounts by lifecycle state
   */
  static async getAccountsByState(state: AccountLifecycleState, limit: number = 100, offset: number = 0): Promise<any[]> {
    try {
      const query = `
        SELECT a.*, m.name as model_name
        FROM accounts a
        LEFT JOIN models m ON a.model_id = m.id
        WHERE a.lifecycle_state = $1
        ORDER BY a.state_changed_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await db.query(query, [state, limit, offset]);
      return result.rows;
    } catch (error) {
      console.error('Error getting accounts by state:', error);
      return [];
    }
  }

  /**
   * Invalidate an account, releasing its resources and archiving it.
   */
  static async invalidateAccount(accountId: number, changed_by: string = 'system'): Promise<{ success: boolean; error?: string }> {
    const client: PoolClient = await db.connect();
    try {
      await client.query('BEGIN');

      // Get current state for audit logging
      const currentStateQuery = `SELECT lifecycle_state FROM accounts WHERE id = $1`;
      const currentStateResult = await client.query(currentStateQuery, [accountId]);
      if (currentStateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Account not found' };
      }
      const currentState = currentStateResult.rows[0].lifecycle_state;

      // The trigger 'trigger_release_container_on_archive' will automatically handle container release.
      // We just need to transition the state to ARCHIVED and release the proxy.
      
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

      // Release any iPhone container (new device-level system)
      await client.query('SELECT release_account_from_iphone_container($1)', [accountId]);

      // Log the transition in the audit table
      const logTransitionQuery = `
          INSERT INTO account_state_transitions
              (account_id, from_state, to_state, transition_reason, changed_by, notes)
          VALUES ($1, $2, $3, 'invalidation', $4, $5)
      `;
      await client.query(logTransitionQuery, [accountId, currentState, AccountLifecycleState.ARCHIVED, changed_by, notes]);

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error invalidating account ${accountId}:`, error);
      return { success: false, error: 'Failed to invalidate account' };
    } finally {
      client.release();
    }
  }
} 