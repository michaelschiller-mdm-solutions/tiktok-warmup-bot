import { db } from '../database';
import { QueueUpdate, BulkUpdateResult } from '../types/queue';

export class QueueControlService {
  
  /**
   * Reschedule a content item to a new time
   */
  async rescheduleItem(itemId: number, newTime: Date): Promise<void> {
    await db.query('BEGIN');

    try {
      // Update the scheduled time
      const updateResult = await db.query(`
        UPDATE content_queue 
        SET 
          scheduled_time = $1,
          retry_count = 0,
          error_message = NULL
        WHERE id = $2 AND status IN ('queued', 'failed')
        RETURNING account_id, sprint_assignment_id
      `, [newTime, itemId]);

      if (updateResult.rows.length === 0) {
        throw new Error(`Queue item ${itemId} not found or cannot be rescheduled`);
      }

      const { account_id, sprint_assignment_id } = updateResult.rows[0];

      // Update assignment's next content due if this is the earliest item
      if (sprint_assignment_id) {
        await db.query(`
          UPDATE account_sprint_assignments 
          SET 
            next_content_due = (
              SELECT MIN(scheduled_time) 
              FROM content_queue 
              WHERE sprint_assignment_id = $1 AND status = 'queued'
            ),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [sprint_assignment_id]);
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Retry a failed content item
   */
  async retryFailedItem(itemId: number): Promise<void> {
    await db.query('BEGIN');

    try {
      // Reset the item to queued status and increment retry count
      const updateResult = await db.query(`
        UPDATE content_queue 
        SET 
          status = 'queued',
          retry_count = retry_count + 1,
          error_message = NULL,
          scheduled_time = CURRENT_TIMESTAMP + INTERVAL '10 minutes'
        WHERE id = $1 AND status = 'failed'
        RETURNING account_id, sprint_assignment_id, retry_count
      `, [itemId]);

      if (updateResult.rows.length === 0) {
        throw new Error(`Queue item ${itemId} not found or not in failed status`);
      }

      const { account_id, sprint_assignment_id, retry_count } = updateResult.rows[0];

      // Limit retry attempts
      if (retry_count > 3) {
        await db.query(`
          UPDATE content_queue 
          SET 
            status = 'cancelled',
            error_message = 'Maximum retry attempts exceeded'
          WHERE id = $1
        `, [itemId]);
      }

      // Update assignment's next content due
      if (sprint_assignment_id) {
        await db.query(`
          UPDATE account_sprint_assignments 
          SET 
            next_content_due = (
              SELECT MIN(scheduled_time) 
              FROM content_queue 
              WHERE sprint_assignment_id = $1 AND status = 'queued'
            ),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [sprint_assignment_id]);
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Remove an item from the queue
   */
  async removeFromQueue(itemId: number): Promise<void> {
    await db.query('BEGIN');

    try {
      // Get item details before deletion
      const itemResult = await db.query(`
        SELECT account_id, sprint_assignment_id, status, emergency_content
        FROM content_queue 
        WHERE id = $1
      `, [itemId]);

      if (itemResult.rows.length === 0) {
        throw new Error(`Queue item ${itemId} not found`);
      }

      const { account_id, sprint_assignment_id, status, emergency_content } = itemResult.rows[0];

      // Prevent removing posted items
      if (status === 'posted') {
        throw new Error(`Cannot remove item ${itemId} - already posted`);
      }

      // Delete the queue item
      await db.query(`
        DELETE FROM content_queue WHERE id = $1
      `, [itemId]);

      // Update assignment's next content due if this was a queued item
      if (sprint_assignment_id && status === 'queued') {
        await db.query(`
          UPDATE account_sprint_assignments 
          SET 
            next_content_due = (
              SELECT MIN(scheduled_time) 
              FROM content_queue 
              WHERE sprint_assignment_id = $1 AND status = 'queued'
            ),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [sprint_assignment_id]);
      }

      // If this was emergency content, update account state
      if (emergency_content) {
        await db.query(`
          UPDATE account_content_state 
          SET 
            last_emergency_content = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE account_id = $1
        `, [account_id]);
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Bulk update multiple queue items
   */
  async bulkUpdateQueue(updates: QueueUpdate[]): Promise<BulkUpdateResult> {
    const result: BulkUpdateResult = {
      updated_count: 0,
      failed_count: 0,
      errors: []
    };

    await db.query('BEGIN');

    try {
      for (const update of updates) {
        try {
          // Build update clauses dynamically
          const setClauses: string[] = [];
          const params: any[] = [];
          let paramIndex = 1;

          if (update.scheduled_time) {
            setClauses.push(`scheduled_time = $${paramIndex}`);
            params.push(update.scheduled_time);
            paramIndex++;
          }

          if (update.content_type) {
            setClauses.push(`content_type = $${paramIndex}`);
            params.push(update.content_type);
            paramIndex++;
          }

          if (update.queue_priority !== undefined) {
            setClauses.push(`queue_priority = $${paramIndex}`);
            params.push(update.queue_priority);
            paramIndex++;
          }

          if (update.status) {
            setClauses.push(`status = $${paramIndex}`);
            params.push(update.status);
            paramIndex++;
          }

          if (setClauses.length === 0) {
            result.errors.push({
              item_id: update.item_id,
              error_message: 'No valid update fields provided'
            });
            result.failed_count++;
            continue;
          }

          // Add updated timestamp
          setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

          // Execute update
          const updateQuery = `
            UPDATE content_queue 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND status IN ('queued', 'failed', 'retrying')
          `;
          params.push(update.item_id);

          const updateResult = await db.query(updateQuery, params);

          if (updateResult.rowCount > 0) {
            result.updated_count++;
          } else {
            result.errors.push({
              item_id: update.item_id,
              error_message: 'Item not found or cannot be updated'
            });
            result.failed_count++;
          }

        } catch (error) {
          result.errors.push({
            item_id: update.item_id,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          });
          result.failed_count++;
        }
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    return result;
  }

  /**
   * Cancel all queued items for an account
   */
  async cancelAccountQueue(accountId: number, reason?: string): Promise<number> {
    const updateResult = await db.query(`
      UPDATE content_queue 
      SET 
        status = 'cancelled',
        error_message = $2
      WHERE account_id = $1 AND status = 'queued'
    `, [accountId, reason || 'Cancelled by user']);

    return updateResult.rowCount;
  }

  /**
   * Pause all queued items for a sprint assignment
   */
  async pauseSprintQueue(assignmentId: number): Promise<number> {
    const updateResult = await db.query(`
      UPDATE content_queue 
      SET status = 'cancelled'
      WHERE sprint_assignment_id = $1 AND status = 'queued'
    `, [assignmentId]);

    return updateResult.rowCount;
  }

  /**
   * Resume paused sprint queue by regenerating queue items
   */
  async resumeSprintQueue(assignmentId: number): Promise<void> {
    // This would typically call the ContentQueueService to regenerate the queue
    // For now, we'll just update any cancelled items back to queued
    await db.query(`
      UPDATE content_queue 
      SET 
        status = 'queued',
        scheduled_time = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
      WHERE sprint_assignment_id = $1 AND status = 'cancelled'
    `, [assignmentId]);
  }

  /**
   * Clean up old completed/failed queue items
   */
  async cleanupOldQueueItems(daysOld: number = 30): Promise<number> {
    const deleteResult = await db.query(`
      DELETE FROM content_queue 
      WHERE status IN ('posted', 'failed', 'cancelled') 
        AND created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `);

    return deleteResult.rowCount;
  }

  /**
   * Get queue item details for control operations
   */
  async getQueueItemDetails(itemId: number): Promise<{
    id: number;
    account_id: number;
    sprint_assignment_id: number | null;
    content_type: string;
    status: string;
    scheduled_time: Date;
    emergency_content: boolean;
    retry_count: number;
  } | null> {
    const result = await db.query(`
      SELECT 
        id, account_id, sprint_assignment_id, content_type,
        status, scheduled_time, emergency_content, retry_count
      FROM content_queue 
      WHERE id = $1
    `, [itemId]);

    return result.rows[0] || null;
  }

  /**
   * Validate queue item can be modified
   */
  async validateQueueItemModification(itemId: number): Promise<{
    can_modify: boolean;
    reason?: string;
  }> {
    const item = await this.getQueueItemDetails(itemId);

    if (!item) {
      return { can_modify: false, reason: 'Item not found' };
    }

    if (item.status === 'posted') {
      return { can_modify: false, reason: 'Cannot modify posted content' };
    }

    if (item.emergency_content && item.status === 'queued') {
      return { can_modify: false, reason: 'Cannot modify queued emergency content' };
    }

    return { can_modify: true };
  }
} 