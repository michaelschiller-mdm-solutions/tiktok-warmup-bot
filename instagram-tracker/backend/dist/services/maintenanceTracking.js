"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceTrackingService = void 0;
const database_1 = require("../database");
class MaintenanceTrackingService {
    async getAllAccountsStatus() {
        const query = `
      WITH account_queue_stats AS (
        SELECT 
          cq.account_id,
          COUNT(*) FILTER (WHERE cq.status = 'queued') as total_queued,
          COUNT(*) FILTER (WHERE cq.status = 'posted') as total_posted,
          COUNT(*) FILTER (WHERE cq.status = 'failed') as total_failed,
          MIN(cq.scheduled_time) FILTER (WHERE cq.status = 'queued') as next_due,
          COUNT(*) FILTER (WHERE cq.status = 'queued' AND cq.scheduled_time < CURRENT_TIMESTAMP) as overdue_count
        FROM content_queue cq
        GROUP BY cq.account_id
      ),
      account_highlights AS (
        SELECT 
          ahg.account_id,
          json_agg(
            json_build_object(
              'id', ahg.id,
              'name', ahg.highlight_name,
              'position', ahg.position,
              'last_maintenance', ahg.maintenance_last_run,
              'next_due', ahg.maintenance_next_due,
              'is_overdue', (ahg.maintenance_next_due < CURRENT_TIMESTAMP AND ahg.is_active = true)
            ) ORDER BY ahg.position
          ) as highlight_groups
        FROM account_highlight_groups ahg
        WHERE ahg.is_active = true
        GROUP BY ahg.account_id
      ),
      account_sprints AS (
        SELECT 
          asa.account_id,
          json_agg(
            json_build_object(
              'id', asa.id,
              'name', cs.name,
              'status', asa.status,
              'next_content_due', asa.next_content_due
            ) ORDER BY asa.next_content_due
          ) as active_sprints
        FROM account_sprint_assignments asa
        JOIN content_sprints cs ON asa.sprint_id = cs.id
        WHERE asa.status IN ('active', 'scheduled')
        GROUP BY asa.account_id
      )
      SELECT 
        a.id as account_id,
        a.username as account_username,
        COALESCE(aqs.total_queued, 0) as total_queued,
        COALESCE(aqs.total_posted, 0) as total_posted,
        COALESCE(aqs.total_failed, 0) as total_failed,
        aqs.next_due,
        COALESCE(aqs.overdue_count, 0) as overdue_count,
        COALESCE(ah.highlight_groups, '[]'::json) as highlight_groups,
        COALESCE(asp.active_sprints, '[]'::json) as active_sprints,
        COALESCE(acs.current_location, 'home') as current_location
      FROM accounts a
      LEFT JOIN account_queue_stats aqs ON a.id = aqs.account_id
      LEFT JOIN account_highlights ah ON a.id = ah.account_id
      LEFT JOIN account_sprints asp ON a.id = asp.account_id
      LEFT JOIN account_content_state acs ON a.id = acs.account_id
      WHERE a.status = 'active'
      ORDER BY a.username
    `;
        const result = await database_1.db.query(query);
        return result.rows.map(row => ({
            account_id: row.account_id,
            account_username: row.account_username,
            total_queued: parseInt(row.total_queued),
            total_posted: parseInt(row.total_posted),
            total_failed: parseInt(row.total_failed),
            next_due: row.next_due ? new Date(row.next_due) : null,
            overdue_count: parseInt(row.overdue_count),
            highlight_groups: row.highlight_groups || [],
            active_sprints: row.active_sprints || [],
            current_location: row.current_location,
            bot_status: 'idle'
        }));
    }
    async getAccountStatus(accountId) {
        const allStatuses = await this.getAllAccountsStatus();
        return allStatuses.find(status => status.account_id === accountId) || null;
    }
    async getPendingContentQueue(limit = 50) {
        const query = `
      SELECT 
        cq.id,
        cq.account_id,
        a.username as account_username,
        cq.content_type,
        cq.scheduled_time,
        cq.status,
        cq.posted_at,
        cq.emergency_content,
        (cq.scheduled_time < CURRENT_TIMESTAMP AND cq.status = 'queued') as is_overdue,
        EXTRACT(EPOCH FROM (cq.scheduled_time - CURRENT_TIMESTAMP)) / 60 as time_until_due_minutes,
        cq.error_message,
        cq.retry_count,
        cs.name as sprint_name
      FROM content_queue cq
      JOIN accounts a ON cq.account_id = a.id
      LEFT JOIN account_sprint_assignments asa ON cq.sprint_assignment_id = asa.id
      LEFT JOIN content_sprints cs ON asa.sprint_id = cs.id
      WHERE cq.status IN ('queued', 'retrying')
        AND cq.scheduled_time <= CURRENT_TIMESTAMP + INTERVAL '24 hours'
      ORDER BY 
        cq.emergency_content DESC,
        cq.queue_priority ASC,
        cq.scheduled_time ASC
      LIMIT $1
    `;
        const result = await database_1.db.query(query, [limit]);
        return result.rows.map(row => ({
            id: row.id,
            account_id: row.account_id,
            account_username: row.account_username,
            content_type: row.content_type,
            scheduled_time: new Date(row.scheduled_time),
            status: row.status,
            posted_at: row.posted_at ? new Date(row.posted_at) : null,
            emergency_content: row.emergency_content,
            is_overdue: row.is_overdue,
            time_until_due_minutes: parseFloat(row.time_until_due_minutes),
            error_message: row.error_message,
            retry_count: row.retry_count,
            sprint_name: row.sprint_name
        }));
    }
    async markContentPosted(queueItemId, postedAt = new Date()) {
        await database_1.db.query('BEGIN');
        try {
            const updateResult = await database_1.db.query(`
        UPDATE content_queue 
        SET 
          status = 'posted',
          posted_at = $1,
          error_message = NULL,
          retry_count = 0
        WHERE id = $2 AND status IN ('queued', 'retrying')
        RETURNING account_id, sprint_assignment_id, content_type
      `, [postedAt, queueItemId]);
            if (updateResult.rows.length === 0) {
                throw new Error(`Queue item ${queueItemId} not found or already processed`);
            }
            const { account_id, sprint_assignment_id, content_type } = updateResult.rows[0];
            if (sprint_assignment_id) {
                await database_1.db.query(`
          UPDATE account_sprint_assignments 
          SET 
            current_content_index = current_content_index + 1,
            next_content_due = (
              SELECT MIN(scheduled_time) 
              FROM content_queue 
              WHERE sprint_assignment_id = $1 AND status = 'queued'
            ),
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [sprint_assignment_id]);
            }
            if (content_type === 'highlight') {
                await this.updateHighlightMaintenance(account_id, postedAt);
            }
            await database_1.db.query('COMMIT');
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async markContentFailed(queueItemId, errorMessage) {
        await database_1.db.query(`
      UPDATE content_queue 
      SET 
        status = 'failed',
        error_message = $1,
        retry_count = retry_count + 1
      WHERE id = $2
    `, [errorMessage, queueItemId]);
    }
    async retryFailedContent(queueItemId, delayMinutes = 30) {
        const newScheduledTime = new Date(Date.now() + (delayMinutes * 60 * 1000));
        await database_1.db.query(`
      UPDATE content_queue 
      SET 
        status = 'queued',
        scheduled_time = $1,
        error_message = NULL
      WHERE id = $2 AND status = 'failed'
    `, [newScheduledTime, queueItemId]);
    }
    async getOverdueContent() {
        const query = `
      SELECT 
        cq.id,
        cq.account_id,
        a.username as account_username,
        cq.content_type,
        cq.scheduled_time,
        cq.status,
        cq.emergency_content,
        EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - cq.scheduled_time)) / 60 as minutes_overdue,
        cq.error_message,
        cq.retry_count,
        cs.name as sprint_name
      FROM content_queue cq
      JOIN accounts a ON cq.account_id = a.id
      LEFT JOIN account_sprint_assignments asa ON cq.sprint_assignment_id = asa.id
      LEFT JOIN content_sprints cs ON asa.sprint_id = cs.id
      WHERE cq.status = 'queued'
        AND cq.scheduled_time < CURRENT_TIMESTAMP - INTERVAL '30 minutes'
      ORDER BY cq.scheduled_time ASC
    `;
        const result = await database_1.db.query(query);
        return result.rows.map(row => ({
            id: row.id,
            account_id: row.account_id,
            account_username: row.account_username,
            content_type: row.content_type,
            scheduled_time: new Date(row.scheduled_time),
            status: row.status,
            posted_at: null,
            emergency_content: row.emergency_content,
            is_overdue: true,
            time_until_due_minutes: -parseFloat(row.minutes_overdue),
            error_message: row.error_message,
            retry_count: row.retry_count,
            sprint_name: row.sprint_name
        }));
    }
    async updateHighlightMaintenance(accountId, maintenanceTime) {
        const query = `
      UPDATE account_highlight_groups 
      SET 
        maintenance_last_run = $1,
        maintenance_next_due = $1 + (maintenance_frequency_hours || ' hours')::INTERVAL,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = $2 
        AND is_active = true
        AND (maintenance_next_due IS NULL OR maintenance_next_due <= $1)
      RETURNING id, highlight_name
    `;
        const result = await database_1.db.query(query, [maintenanceTime, accountId]);
        if (result.rows.length > 0) {
            console.log(`Updated highlight maintenance for account ${accountId}, highlight: ${result.rows[0].highlight_name}`);
        }
    }
    async getMaintenanceAnalytics(days = 7) {
        const query = `
      WITH daily_stats AS (
        SELECT 
          DATE(posted_at) as post_date,
          content_type,
          COUNT(*) as posts_count,
          COUNT(*) FILTER (WHERE emergency_content = true) as emergency_count
        FROM content_queue
        WHERE posted_at >= CURRENT_DATE - INTERVAL '${days} days'
          AND status = 'posted'
        GROUP BY DATE(posted_at), content_type
      ),
      failure_stats AS (
        SELECT 
          content_type,
          COUNT(*) as failure_count,
          AVG(retry_count) as avg_retries
        FROM content_queue
        WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
          AND status = 'failed'
        GROUP BY content_type
      )
      SELECT 
        ds.post_date,
        ds.content_type,
        ds.posts_count,
        ds.emergency_count,
        COALESCE(fs.failure_count, 0) as failure_count,
        COALESCE(fs.avg_retries, 0) as avg_retries
      FROM daily_stats ds
      LEFT JOIN failure_stats fs ON ds.content_type = fs.content_type
      ORDER BY ds.post_date DESC, ds.content_type
    `;
        const result = await database_1.db.query(query);
        return result.rows;
    }
}
exports.MaintenanceTrackingService = MaintenanceTrackingService;
//# sourceMappingURL=maintenanceTracking.js.map