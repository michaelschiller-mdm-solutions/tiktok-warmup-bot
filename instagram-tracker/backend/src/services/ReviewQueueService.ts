import { db } from '../database';

export interface ReviewItem {
  reviewId: number;
  accountId: number;
  username: string;
  modelName: string;
  phase: string;
  failureType: string;
  failureMessage: string;
  priorityLevel: number;
  failedAt: Date;
  retryCount: number;
  daysInReview: number;
}

export interface ReviewResolution {
  reviewId: number;
  resolutionMethod: 'retry_bot' | 'manual_completion' | 'skip_phase' | 'reset_account' | 'change_content' | 'escalate_support' | 'other';
  resolutionNotes: string;
  resolvedBy: string;
}

export interface ReviewAnalytics {
  totalReviews: number;
  pendingReviews: number;
  inProgressReviews: number;
  resolvedReviews: number;
  botErrors: number;
  instagramChallenges: number;
  contentRejections: number;
  captchaFailures: number;
  urgentReviews: number;
  highPriorityReviews: number;
  normalPriorityReviews: number;
  avgResolutionTimeMinutes: number;
  avgSuccessfulResolutionTime: number;
  resolutionSuccessRatePercent: number;
}

export class ReviewQueueService {

  /**
   * Get review queue items with filtering and pagination
   */
  async getReviewQueue(
    status: string = 'pending',
    limit: number = 50,
    offset: number = 0
  ): Promise<ReviewItem[]> {
    try {
      const result = await db.query(
        'SELECT * FROM get_review_queue($1, $2, $3)',
        [status, limit, offset]
      );

      return result.rows.map(row => ({
        reviewId: row.review_id,
        accountId: row.account_id,
        username: row.username,
        modelName: row.model_name,
        phase: row.phase,
        failureType: row.failure_type,
        failureMessage: row.failure_message,
        priorityLevel: row.priority_level,
        failedAt: new Date(row.failed_at),
        retryCount: row.retry_count,
        daysInReview: row.days_in_review
      }));
    } catch (error) {
      console.error('Error fetching review queue:', error);
      throw new Error('Failed to fetch review queue');
    }
  }

  /**
   * Get detailed review item by ID
   */
  async getReviewDetails(reviewId: number): Promise<any> {
    try {
      const result = await db.query(`
        SELECT 
          rl.*,
          a.username,
          a.lifecycle_state,
          m.name as model_name,
          awp.phase,
          awp.status as phase_status,
          awp.error_message,
          awp.error_details,
          awp.retry_count,
          awp.bot_id,
          awp.started_at,
          awp.available_at
        FROM warmup_review_logs rl
        JOIN account_warmup_phases awp ON rl.warmup_phase_id = awp.id
        JOIN accounts a ON rl.account_id = a.id
        LEFT JOIN models m ON a.model_id = m.id
        WHERE rl.id = $1
      `, [reviewId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        reviewId: row.id,
        accountId: row.account_id,
        username: row.username,
        modelName: row.model_name,
        lifecycleState: row.lifecycle_state,
        phase: row.phase,
        phaseStatus: row.phase_status,
        failureType: row.failure_type,
        failureMessage: row.failure_message,
        failureDetails: row.failure_details,
        originalBotId: row.original_bot_id,
        reviewStatus: row.review_status,
        assignedTo: row.assigned_to,
        priorityLevel: row.priority_level,
        retryCountBeforeReview: row.retry_count_before_review,
        currentRetryCount: row.retry_count,
        failedAt: row.failed_at,
        reviewStartedAt: row.review_started_at,
        resolvedAt: row.resolved_at,
        resolutionMethod: row.resolution_method,
        resolutionNotes: row.resolution_notes,
        resolutionTimeMinutes: row.resolution_time_minutes,
        wasResolvedSuccessfully: row.was_resolved_successfully
      };
    } catch (error) {
      console.error('Error fetching review details:', error);
      throw new Error('Failed to fetch review details');
    }
  }

  /**
   * Claim a review for manual intervention
   */
  async claimReview(reviewId: number, assignedTo: string): Promise<boolean> {
    try {
      const result = await db.query(`
        UPDATE warmup_review_logs 
        SET 
          review_status = 'in_progress',
          assigned_to = $2,
          review_started_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND review_status = 'pending'
        RETURNING id
      `, [reviewId, assignedTo]);

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error claiming review:', error);
      throw new Error('Failed to claim review');
    }
  }

  /**
   * Release a claimed review back to pending
   */
  async releaseReview(reviewId: number): Promise<boolean> {
    try {
      const result = await db.query(`
        UPDATE warmup_review_logs 
        SET 
          review_status = 'pending',
          assigned_to = NULL,
          review_started_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND review_status = 'in_progress'
        RETURNING id
      `, [reviewId]);

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error releasing review:', error);
      throw new Error('Failed to release review');
    }
  }

  /**
   * Resolve a review with specific resolution method
   */
  async resolveReview(resolution: ReviewResolution): Promise<boolean> {
    try {
      const result = await db.query(
        'SELECT resolve_review($1, $2, $3, $4) as success',
        [
          resolution.reviewId,
          resolution.resolutionMethod,
          resolution.resolutionNotes,
          resolution.resolvedBy
        ]
      );

      return result.rows[0]?.success === true;
    } catch (error) {
      console.error('Error resolving review:', error);
      throw new Error('Failed to resolve review');
    }
  }

  /**
   * Escalate a review to higher priority or support
   */
  async escalateReview(reviewId: number, escalatedBy: string, escalationNotes: string): Promise<boolean> {
    try {
      const result = await db.query(`
        UPDATE warmup_review_logs 
        SET 
          review_status = 'escalated',
          priority_level = GREATEST(priority_level - 1, 1), -- Increase priority
          resolution_notes = COALESCE(resolution_notes, '') || $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id
      `, [reviewId, escalatedBy, `\n[ESCALATED by ${escalatedBy}]: ${escalationNotes}`]);

      // Also update the warmup phase
      if (result.rows.length > 0) {
        await db.query(`
          UPDATE account_warmup_phases
          SET 
            review_escalation_count = review_escalation_count + 1,
            last_human_action_at = CURRENT_TIMESTAMP,
            last_human_action_by = $2,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = (
            SELECT warmup_phase_id FROM warmup_review_logs WHERE id = $1
          )
        `, [reviewId, escalatedBy]);
      }

      return result.rows.length > 0;
    } catch (error) {
      console.error('Error escalating review:', error);
      throw new Error('Failed to escalate review');
    }
  }

  /**
   * Create a manual review entry (for testing or manual escalation)
   */
  async createManualReview(
    accountId: number,
    phase: string,
    failureType: string,
    failureMessage: string,
    createdBy: string
  ): Promise<number | null> {
    try {
      // First, get or create the warmup phase
      let phaseResult = await db.query(`
        SELECT id FROM account_warmup_phases 
        WHERE account_id = $1 AND phase = $2
      `, [accountId, phase]);

      let phaseId: number;

      if (phaseResult.rows.length === 0) {
        // Create the phase if it doesn't exist
        const createResult = await db.query(`
          INSERT INTO account_warmup_phases (account_id, phase, status, error_message, failure_category)
          VALUES ($1, $2, 'requires_review', $3, $4)
          RETURNING id
        `, [accountId, phase, failureMessage, failureType]);
        phaseId = createResult.rows[0].id;
      } else {
        phaseId = phaseResult.rows[0].id;
        // Update existing phase to requires_review
        await db.query(`
          UPDATE account_warmup_phases 
          SET 
            status = 'requires_review',
            error_message = $3,
            failure_category = $4,
            review_required_at = CURRENT_TIMESTAMP,
            last_human_action_by = $5,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [phaseId, accountId, failureMessage, failureType, createdBy]);
      }

      // The trigger will automatically create the review log entry
      // Get the created review log ID
      const reviewResult = await db.query(`
        SELECT id FROM warmup_review_logs 
        WHERE warmup_phase_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [phaseId]);

      return reviewResult.rows[0]?.id || null;
    } catch (error) {
      console.error('Error creating manual review:', error);
      throw new Error('Failed to create manual review');
    }
  }

  /**
   * Get review queue analytics
   */
  async getReviewAnalytics(): Promise<ReviewAnalytics> {
    try {
      const result = await db.query('SELECT * FROM review_queue_analytics');
      
      if (result.rows.length === 0) {
        // Return empty analytics if no data
        return {
          totalReviews: 0,
          pendingReviews: 0,
          inProgressReviews: 0,
          resolvedReviews: 0,
          botErrors: 0,
          instagramChallenges: 0,
          contentRejections: 0,
          captchaFailures: 0,
          urgentReviews: 0,
          highPriorityReviews: 0,
          normalPriorityReviews: 0,
          avgResolutionTimeMinutes: 0,
          avgSuccessfulResolutionTime: 0,
          resolutionSuccessRatePercent: 0
        };
      }

      const row = result.rows[0];
      return {
        totalReviews: parseInt(row.total_reviews) || 0,
        pendingReviews: parseInt(row.pending_reviews) || 0,
        inProgressReviews: parseInt(row.in_progress_reviews) || 0,
        resolvedReviews: parseInt(row.resolved_reviews) || 0,
        botErrors: parseInt(row.bot_errors) || 0,
        instagramChallenges: parseInt(row.instagram_challenges) || 0,
        contentRejections: parseInt(row.content_rejections) || 0,
        captchaFailures: parseInt(row.captcha_failures) || 0,
        urgentReviews: parseInt(row.urgent_reviews) || 0,
        highPriorityReviews: parseInt(row.high_priority_reviews) || 0,
        normalPriorityReviews: parseInt(row.normal_priority_reviews) || 0,
        avgResolutionTimeMinutes: parseFloat(row.avg_resolution_time_minutes) || 0,
        avgSuccessfulResolutionTime: parseFloat(row.avg_successful_resolution_time) || 0,
        resolutionSuccessRatePercent: parseFloat(row.resolution_success_rate_percent) || 0
      };
    } catch (error) {
      console.error('Error fetching review analytics:', error);
      throw new Error('Failed to fetch review analytics');
    }
  }

  /**
   * Get accounts needing review by model
   */
  async getReviewsByModel(modelId?: number): Promise<any[]> {
    try {
      const query = `
        SELECT 
          m.id as model_id,
          m.name as model_name,
          COUNT(rl.id) as total_reviews,
          COUNT(CASE WHEN rl.review_status = 'pending' THEN 1 END) as pending_reviews,
          COUNT(CASE WHEN rl.review_status = 'in_progress' THEN 1 END) as in_progress_reviews,
          ARRAY_AGG(
            CASE WHEN rl.review_status = 'pending' THEN
              json_build_object(
                'review_id', rl.id,
                'account_id', a.id,
                'username', a.username,
                'phase', awp.phase,
                'failure_type', rl.failure_type,
                'priority_level', rl.priority_level,
                'failed_at', rl.failed_at
              )
            END
          ) FILTER (WHERE rl.review_status = 'pending') as pending_items
        FROM models m
        LEFT JOIN accounts a ON m.id = a.model_id
        LEFT JOIN warmup_review_logs rl ON a.id = rl.account_id
        LEFT JOIN account_warmup_phases awp ON rl.warmup_phase_id = awp.id
        WHERE ($1::INTEGER IS NULL OR m.id = $1)
        GROUP BY m.id, m.name
        HAVING COUNT(rl.id) > 0
        ORDER BY COUNT(CASE WHEN rl.review_status = 'pending' THEN 1 END) DESC
      `;

      const result = await db.query(query, [modelId || null]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching reviews by model:', error);
      throw new Error('Failed to fetch reviews by model');
    }
  }
} 