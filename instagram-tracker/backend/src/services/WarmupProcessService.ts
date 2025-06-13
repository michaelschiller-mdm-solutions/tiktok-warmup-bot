import { db } from '../database';
import { WarmupPhase, WarmupPhaseStatus, WarmupProcessResult } from '../types/warmupProcess';

export class WarmupProcessService {
  
  /**
   * Initialize warmup phases for an account
   */
  async initializeWarmupPhases(accountId: number): Promise<void> {
    try {
      await db.query('SELECT initialize_warmup_phases($1)', [accountId]);
    } catch (error) {
      console.error(`Error initializing warmup phases for account ${accountId}:`, error);
      throw new Error('Failed to initialize warmup phases');
    }
  }

  /**
   * Get accounts ready for warmup processing
   */
  async getReadyAccounts(modelId?: number, limit: number = 50): Promise<any[]> {
    try {
      let query = `
        SELECT 
          id, username, model_id, lifecycle_state, model_name,
          total_phases, completed_phases, ready_phases
        FROM bot_ready_accounts
      `;
      const params: any[] = [];
      
      if (modelId) {
        query += ` WHERE model_id = $1`;
        params.push(modelId);
      }
      
      query += ` ORDER BY ready_phases DESC, completed_phases ASC LIMIT $${params.length + 1}`;
      params.push(limit);
      
      const result = await db.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching ready accounts:', error);
      throw new Error('Failed to fetch ready accounts');
    }
  }

  /**
   * Start warmup process for an account
   */
  async startWarmupProcess(accountId: number, botId: string, sessionId: string): Promise<WarmupProcessResult> {
    try {
      // Update account lifecycle state to warmup
      await db.query(`
        UPDATE accounts 
        SET lifecycle_state = 'warmup',
            state_changed_at = CURRENT_TIMESTAMP,
            state_changed_by = $2,
            last_bot_action_by = $2,
            last_bot_action_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [accountId, botId]);

      // Initialize warmup phases if they don't exist
      await this.initializeWarmupPhases(accountId);

      // Make first phase available
      await db.query(`
        UPDATE account_warmup_phases 
        SET status = 'available',
            available_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1 AND phase = 'pfp' AND status = 'pending'
      `, [accountId]);

      return {
        success: true,
        accountId,
        message: 'Warmup process started successfully',
        nextPhase: WarmupPhase.PFP
      };
    } catch (error) {
      console.error(`Error starting warmup for account ${accountId}:`, error);
      return {
        success: false,
        accountId,
        message: 'Failed to start warmup process',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get available warmup phases for an account
   */
  async getAvailablePhases(accountId: number): Promise<any[]> {
    try {
      const result = await db.query(`
        SELECT 
          id, phase, status, available_at, started_at, 
          assigned_content_id, assigned_text_id, content_assigned_at,
          error_message, retry_count, max_retries
        FROM account_warmup_phases
        WHERE account_id = $1 
          AND status = 'available' 
          AND available_at <= CURRENT_TIMESTAMP
        ORDER BY 
          CASE phase 
            WHEN 'pfp' THEN 1 
            WHEN 'bio' THEN 2 
            WHEN 'post' THEN 3 
            WHEN 'highlight' THEN 4 
            WHEN 'story' THEN 5 
          END
      `, [accountId]);

      return result.rows;
    } catch (error) {
      console.error(`Error fetching available phases for account ${accountId}:`, error);
      throw new Error('Failed to fetch available phases');
    }
  }

  /**
   * Get warmup status for an account
   */
  async getWarmupStatus(accountId: number): Promise<any> {
    try {
      const result = await db.query(`
        SELECT 
          a.id as account_id,
          a.username,
          a.lifecycle_state,
          a.last_bot_action_by,
          a.last_bot_action_at,
          
          -- Phase summary
          COUNT(awp.id) as total_phases,
          COUNT(CASE WHEN awp.status = 'completed' THEN 1 END) as completed_phases,
          COUNT(CASE WHEN awp.status = 'available' THEN 1 END) as available_phases,
          COUNT(CASE WHEN awp.status = 'failed' THEN 1 END) as failed_phases,
          
          -- Progress calculation
          CASE 
            WHEN COUNT(awp.id) > 0 THEN 
              ROUND((COUNT(CASE WHEN awp.status = 'completed' THEN 1 END)::decimal / COUNT(awp.id)) * 100, 2)
            ELSE 0 
          END as progress_percent,
          
          -- Check if warmup is complete
          is_warmup_complete(a.id) as is_complete,
          
          -- Phase details
          json_agg(
            json_build_object(
              'phase', awp.phase,
              'status', awp.status,
              'available_at', awp.available_at,
              'started_at', awp.started_at,
              'completed_at', awp.completed_at,
              'error_message', awp.error_message,
              'retry_count', awp.retry_count,
              'bot_id', awp.bot_id
            ) ORDER BY 
              CASE awp.phase 
                WHEN 'pfp' THEN 1 
                WHEN 'bio' THEN 2 
                WHEN 'post' THEN 3 
                WHEN 'highlight' THEN 4 
                WHEN 'story' THEN 5 
              END
          ) as phases
          
        FROM accounts a
        LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
        WHERE a.id = $1
        GROUP BY a.id, a.username, a.lifecycle_state, a.last_bot_action_by, a.last_bot_action_at
      `, [accountId]);

      if (result.rows.length === 0) {
        throw new Error('Account not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error(`Error fetching warmup status for account ${accountId}:`, error);
      throw new Error('Failed to fetch warmup status');
    }
  }

  /**
   * Mark a warmup phase as in progress
   */
  async startPhase(accountId: number, phase: WarmupPhase, botId: string, sessionId: string): Promise<WarmupProcessResult> {
    try {
      const result = await db.query(`
        UPDATE account_warmup_phases 
        SET 
          status = 'in_progress',
          started_at = CURRENT_TIMESTAMP,
          bot_id = $3,
          bot_session_id = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1 AND phase = $2 AND status = 'available'
        RETURNING id
      `, [accountId, phase, botId, sessionId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          accountId,
          message: `Phase ${phase} is not available for account ${accountId}`,
          error: 'Phase not available'
        };
      }

      return {
        success: true,
        accountId,
        message: `Phase ${phase} started successfully`,
        phase,
        phaseId: result.rows[0].id
      };
    } catch (error) {
      console.error(`Error starting phase ${phase} for account ${accountId}:`, error);
      return {
        success: false,
        accountId,
        message: `Failed to start phase ${phase}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Mark a warmup phase as completed
   */
  async completePhase(
    accountId: number, 
    phase: WarmupPhase, 
    botId: string,
    executionTimeMs?: number,
    instagramResponse?: any
  ): Promise<WarmupProcessResult> {
    try {
      const result = await db.query(`
        UPDATE account_warmup_phases 
        SET 
          status = 'completed',
          completed_at = CURRENT_TIMESTAMP,
          execution_time_ms = $3,
          instagram_response = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1 AND phase = $2 AND bot_id = $5 AND status = 'in_progress'
        RETURNING id
      `, [accountId, phase, executionTimeMs, JSON.stringify(instagramResponse), botId]);

      if (result.rows.length === 0) {
        return {
          success: false,
          accountId,
          message: `Phase ${phase} could not be completed - not in progress by this bot`,
          error: 'Phase not in progress'
        };
      }

      // Check if all phases are complete
      const isComplete = await this.isWarmupComplete(accountId);
      
      if (isComplete) {
        // Move account to active state
        await db.query(`
          UPDATE accounts 
          SET lifecycle_state = 'active',
              state_changed_at = CURRENT_TIMESTAMP,
              state_changed_by = $2,
              last_bot_action_by = $2,
              last_bot_action_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [accountId, botId]);
      }

      return {
        success: true,
        accountId,
        message: `Phase ${phase} completed successfully`,
        phase,
        phaseId: result.rows[0].id,
        warmupComplete: isComplete
      };
    } catch (error) {
      console.error(`Error completing phase ${phase} for account ${accountId}:`, error);
      return {
        success: false,
        accountId,
        message: `Failed to complete phase ${phase}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Mark a warmup phase as failed with review system integration
   */
  async failPhase(
    accountId: number, 
    phase: WarmupPhase, 
    botId: string,
    errorMessage: string,
    errorDetails?: any,
    failureCategory?: string,
    forceEscalateToReview?: boolean
  ): Promise<WarmupProcessResult> {
    try {
      // Determine if should escalate to review
      const shouldEscalateToReview = forceEscalateToReview || 
        failureCategory === 'instagram_challenge' || 
        failureCategory === 'account_suspended' ||
        failureCategory === 'captcha';

      // Increment retry count and check if max retries exceeded or should escalate
      const result = await db.query(`
        UPDATE account_warmup_phases 
        SET 
          status = CASE 
            WHEN $6::boolean = true THEN 'requires_review'
            WHEN retry_count + 1 >= max_retries THEN 'requires_review'
            ELSE 'failed'
          END,
          retry_count = retry_count + 1,
          error_message = $3,
          error_details = $4,
          failure_category = $7,
          review_required_at = CASE 
            WHEN $6::boolean = true OR retry_count + 1 >= max_retries THEN CURRENT_TIMESTAMP
            ELSE review_required_at
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1 AND phase = $2 AND bot_id = $5 AND status = 'in_progress'
        RETURNING id, status, retry_count, max_retries
      `, [accountId, phase, errorMessage, JSON.stringify(errorDetails), botId, shouldEscalateToReview, failureCategory]);

      if (result.rows.length === 0) {
        return {
          success: false,
          accountId,
          message: `Phase ${phase} could not be failed - not in progress by this bot`,
          error: 'Phase not in progress'
        };
      }

      const phaseData = result.rows[0];
      const needsReview = phaseData.status === 'requires_review';

      // If needs review, mark account for human review
      if (needsReview) {
        await db.query(`
          UPDATE accounts 
          SET requires_human_review = true,
              last_error_message = $2,
              last_error_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [accountId, errorMessage]);
      }

      return {
        success: true,
        accountId,
        message: needsReview 
          ? `Phase ${phase} marked for human review after ${phaseData.retry_count} retries`
          : `Phase ${phase} marked as failed (retry ${phaseData.retry_count}/${phaseData.max_retries})`,
        phase,
        phaseId: phaseData.id,
        needsHumanReview: needsReview,
        retryCount: phaseData.retry_count
      };
    } catch (error) {
      console.error(`Error failing phase ${phase} for account ${accountId}:`, error);
      return {
        success: false,
        accountId,
        message: `Failed to mark phase ${phase} as failed`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if warmup is complete for an account
   */
  async isWarmupComplete(accountId: number): Promise<boolean> {
    try {
      const result = await db.query('SELECT is_warmup_complete($1) as is_complete', [accountId]);
      return result.rows[0].is_complete;
    } catch (error) {
      console.error(`Error checking warmup completion for account ${accountId}:`, error);
      return false;
    }
  }

  /**
   * Get warmup performance statistics
   */
  async getWarmupStatistics(modelId?: number, days: number = 30): Promise<any> {
    try {
      let query = `
        SELECT 
          COUNT(DISTINCT a.id) as total_accounts,
          COUNT(DISTINCT CASE WHEN a.lifecycle_state = 'warmup' THEN a.id END) as accounts_in_warmup,
          COUNT(DISTINCT CASE WHEN awp.status = 'completed' AND awp.completed_at > CURRENT_TIMESTAMP - INTERVAL '${days} days' THEN a.id END) as completed_warmups,
          
          -- Phase statistics
          COUNT(awp.id) as total_phases,
          COUNT(CASE WHEN awp.status = 'completed' THEN 1 END) as completed_phases,
          COUNT(CASE WHEN awp.status = 'failed' THEN 1 END) as failed_phases,
          COUNT(CASE WHEN awp.status = 'requires_review' THEN 1 END) as phases_needing_review,
          
          -- Success rate
          CASE 
            WHEN COUNT(awp.id) > 0 THEN 
              ROUND((COUNT(CASE WHEN awp.status = 'completed' THEN 1 END)::decimal / COUNT(awp.id)) * 100, 2)
            ELSE 0 
          END as success_rate_percent,
          
          -- Average execution time
          ROUND(AVG(awp.execution_time_ms), 0) as avg_execution_time_ms,
          
          -- Phase breakdown
          json_object_agg(
            awp.phase,
            json_build_object(
              'total', COUNT(CASE WHEN awp.phase IS NOT NULL THEN 1 END),
              'completed', COUNT(CASE WHEN awp.status = 'completed' THEN 1 END),
              'failed', COUNT(CASE WHEN awp.status = 'failed' THEN 1 END),
              'avg_time_ms', ROUND(AVG(awp.execution_time_ms), 0)
            )
          ) FILTER (WHERE awp.phase IS NOT NULL) as phase_breakdown
          
        FROM accounts a
        LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
        WHERE ($1::INTEGER IS NULL OR a.model_id = $1)
          AND a.created_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
      `;

      const result = await db.query(query, [modelId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching warmup statistics:', error);
      throw new Error('Failed to fetch warmup statistics');
    }
  }
} 