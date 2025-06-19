"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueControlService = void 0;
const database_1 = require("../database");
class QueueControlService {
    async rescheduleItem(itemId, newTime) {
        await database_1.db.query('BEGIN');
        try {
            const updateResult = await database_1.db.query(`
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
            if (sprint_assignment_id) {
                await database_1.db.query(`
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
            await database_1.db.query('COMMIT');
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async retryFailedItem(itemId) {
        await database_1.db.query('BEGIN');
        try {
            const updateResult = await database_1.db.query(`
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
            if (retry_count > 3) {
                await database_1.db.query(`
          UPDATE content_queue 
          SET 
            status = 'cancelled',
            error_message = 'Maximum retry attempts exceeded'
          WHERE id = $1
        `, [itemId]);
            }
            if (sprint_assignment_id) {
                await database_1.db.query(`
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
            await database_1.db.query('COMMIT');
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async removeFromQueue(itemId) {
        await database_1.db.query('BEGIN');
        try {
            const itemResult = await database_1.db.query(`
        SELECT account_id, sprint_assignment_id, status, emergency_content
        FROM content_queue 
        WHERE id = $1
      `, [itemId]);
            if (itemResult.rows.length === 0) {
                throw new Error(`Queue item ${itemId} not found`);
            }
            const { account_id, sprint_assignment_id, status, emergency_content } = itemResult.rows[0];
            if (status === 'posted') {
                throw new Error(`Cannot remove item ${itemId} - already posted`);
            }
            await database_1.db.query(`
        DELETE FROM content_queue WHERE id = $1
      `, [itemId]);
            if (sprint_assignment_id && status === 'queued') {
                await database_1.db.query(`
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
            if (emergency_content) {
                await database_1.db.query(`
          UPDATE account_content_state 
          SET 
            last_emergency_content = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE account_id = $1
        `, [account_id]);
            }
            await database_1.db.query('COMMIT');
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async bulkUpdateQueue(updates) {
        const result = {
            updated_count: 0,
            failed_count: 0,
            errors: []
        };
        await database_1.db.query('BEGIN');
        try {
            for (const update of updates) {
                try {
                    const setClauses = [];
                    const params = [];
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
                    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
                    const updateQuery = `
            UPDATE content_queue 
            SET ${setClauses.join(', ')}
            WHERE id = $${paramIndex} AND status IN ('queued', 'failed', 'retrying')
          `;
                    params.push(update.item_id);
                    const updateResult = await database_1.db.query(updateQuery, params);
                    if (updateResult.rowCount > 0) {
                        result.updated_count++;
                    }
                    else {
                        result.errors.push({
                            item_id: update.item_id,
                            error_message: 'Item not found or cannot be updated'
                        });
                        result.failed_count++;
                    }
                }
                catch (error) {
                    result.errors.push({
                        item_id: update.item_id,
                        error_message: error instanceof Error ? error.message : 'Unknown error'
                    });
                    result.failed_count++;
                }
            }
            await database_1.db.query('COMMIT');
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
        return result;
    }
    async cancelAccountQueue(accountId, reason) {
        const updateResult = await database_1.db.query(`
      UPDATE content_queue 
      SET 
        status = 'cancelled',
        error_message = $2
      WHERE account_id = $1 AND status = 'queued'
    `, [accountId, reason || 'Cancelled by user']);
        return updateResult.rowCount;
    }
    async pauseSprintQueue(assignmentId) {
        const updateResult = await database_1.db.query(`
      UPDATE content_queue 
      SET status = 'cancelled'
      WHERE sprint_assignment_id = $1 AND status = 'queued'
    `, [assignmentId]);
        return updateResult.rowCount;
    }
    async resumeSprintQueue(assignmentId) {
        await database_1.db.query(`
      UPDATE content_queue 
      SET 
        status = 'queued',
        scheduled_time = CURRENT_TIMESTAMP + INTERVAL '5 minutes'
      WHERE sprint_assignment_id = $1 AND status = 'cancelled'
    `, [assignmentId]);
    }
    async cleanupOldQueueItems(daysOld = 30) {
        const deleteResult = await database_1.db.query(`
      DELETE FROM content_queue 
      WHERE status IN ('posted', 'failed', 'cancelled') 
        AND created_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
    `);
        return deleteResult.rowCount;
    }
    async getQueueItemDetails(itemId) {
        const result = await database_1.db.query(`
      SELECT 
        id, account_id, sprint_assignment_id, content_type,
        status, scheduled_time, emergency_content, retry_count
      FROM content_queue 
      WHERE id = $1
    `, [itemId]);
        return result.rows[0] || null;
    }
    async validateQueueItemModification(itemId) {
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
exports.QueueControlService = QueueControlService;
//# sourceMappingURL=QueueControlService.js.map