"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueManagementService = void 0;
const database_1 = require("../database");
class QueueManagementService {
    async getQueueItems(filters = {}) {
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;
        if (filters.account_id) {
            whereConditions.push(`cq.account_id = $${paramIndex}`);
            params.push(filters.account_id);
            paramIndex++;
        }
        if (filters.sprint_assignment_id) {
            whereConditions.push(`cq.sprint_assignment_id = $${paramIndex}`);
            params.push(filters.sprint_assignment_id);
            paramIndex++;
        }
        if (filters.content_type) {
            whereConditions.push(`cq.content_type = $${paramIndex}`);
            params.push(filters.content_type);
            paramIndex++;
        }
        if (filters.status) {
            whereConditions.push(`cq.status = $${paramIndex}`);
            params.push(filters.status);
            paramIndex++;
        }
        if (filters.emergency_content !== undefined) {
            whereConditions.push(`cq.emergency_content = $${paramIndex}`);
            params.push(filters.emergency_content);
            paramIndex++;
        }
        if (filters.scheduled_from) {
            whereConditions.push(`cq.scheduled_time >= $${paramIndex}`);
            params.push(filters.scheduled_from);
            paramIndex++;
        }
        if (filters.scheduled_to) {
            whereConditions.push(`cq.scheduled_time <= $${paramIndex}`);
            params.push(filters.scheduled_to);
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';
        const countQuery = `
      SELECT COUNT(*) as total
      FROM content_queue cq
      LEFT JOIN accounts a ON cq.account_id = a.id
      LEFT JOIN account_sprint_assignments asa ON cq.sprint_assignment_id = asa.id
      LEFT JOIN content_sprints cs ON asa.sprint_id = cs.id
      ${whereClause}
    `;
        const countResult = await database_1.db.query(countQuery, params);
        const totalCount = parseInt(countResult.rows[0].total);
        const sortBy = filters.sort_by || 'scheduled_time';
        const sortOrder = filters.sort_order || 'ASC';
        const orderClause = `ORDER BY cq.${sortBy} ${sortOrder}`;
        const limit = filters.limit || 50;
        const offset = filters.offset || 0;
        const limitClause = `LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);
        const mainQuery = `
      SELECT 
        cq.id,
        cq.account_id,
        a.username as account_username,
        cq.sprint_assignment_id,
        cs.name as sprint_name,
        cq.content_item_id,
        cq.central_content_id,
        cq.central_text_id,
        cq.scheduled_time,
        cq.content_type,
        cq.status,
        cq.posted_at,
        cq.emergency_content,
        cq.emergency_strategy,
        cq.queue_priority,
        cq.error_message,
        cq.retry_count,
        cq.created_at,
        (cq.scheduled_time < CURRENT_TIMESTAMP AND cq.status = 'queued') as is_overdue,
        EXTRACT(EPOCH FROM (cq.scheduled_time - CURRENT_TIMESTAMP)) / 60 as time_until_due
      FROM content_queue cq
      LEFT JOIN accounts a ON cq.account_id = a.id
      LEFT JOIN account_sprint_assignments asa ON cq.sprint_assignment_id = asa.id
      LEFT JOIN content_sprints cs ON asa.sprint_id = cs.id
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `;
        const result = await database_1.db.query(mainQuery, params);
        return {
            items: result.rows.map(row => ({
                id: row.id,
                account_id: row.account_id,
                account_username: row.account_username,
                sprint_assignment_id: row.sprint_assignment_id,
                sprint_name: row.sprint_name,
                content_item_id: row.content_item_id,
                central_content_id: row.central_content_id,
                central_text_id: row.central_text_id,
                scheduled_time: row.scheduled_time,
                content_type: row.content_type,
                status: row.status,
                posted_at: row.posted_at,
                emergency_content: row.emergency_content,
                emergency_strategy: row.emergency_strategy,
                queue_priority: row.queue_priority,
                error_message: row.error_message,
                retry_count: row.retry_count,
                created_at: row.created_at,
                is_overdue: row.is_overdue,
                time_until_due: Math.round(row.time_until_due || 0)
            })),
            total_count: totalCount,
            page_info: {
                limit,
                offset,
                has_more: offset + limit < totalCount
            }
        };
    }
    async getAccountQueue(accountId) {
        const filters = {
            account_id: accountId,
            sort_by: 'scheduled_time',
            sort_order: 'ASC'
        };
        const result = await this.getQueueItems(filters);
        return result.items;
    }
    async getUpcomingContent(hours = 24) {
        const filters = {
            status: 'queued',
            scheduled_from: new Date(),
            scheduled_to: new Date(Date.now() + (hours * 60 * 60 * 1000)),
            sort_by: 'scheduled_time',
            sort_order: 'ASC',
            limit: 1000
        };
        const result = await this.getQueueItems(filters);
        return result.items;
    }
    async getOverdueContent() {
        const filters = {
            status: 'queued',
            scheduled_to: new Date(),
            sort_by: 'scheduled_time',
            sort_order: 'ASC',
            limit: 500
        };
        const result = await this.getQueueItems(filters);
        return result.items.filter(item => item.is_overdue);
    }
    async getQueueStats() {
        const statsQuery = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(*) FILTER (WHERE status = 'queued') as queued_count,
        COUNT(*) FILTER (WHERE status = 'posted') as posted_count,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE status = 'queued' AND scheduled_time < CURRENT_TIMESTAMP) as overdue_count,
        COUNT(*) FILTER (WHERE status = 'queued' AND scheduled_time BETWEEN CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP + INTERVAL '24 hours') as upcoming_24h,
        COUNT(*) FILTER (WHERE emergency_content = true) as emergency_count,
        COUNT(DISTINCT account_id) as accounts_with_queue,
        ROUND(COUNT(*)::decimal / NULLIF(COUNT(DISTINCT account_id), 0), 1) as avg_queue_size
      FROM content_queue
      WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
    `;
        const result = await database_1.db.query(statsQuery);
        const stats = result.rows[0];
        return {
            total_items: parseInt(stats.total_items),
            queued_count: parseInt(stats.queued_count),
            posted_count: parseInt(stats.posted_count),
            failed_count: parseInt(stats.failed_count),
            overdue_count: parseInt(stats.overdue_count),
            upcoming_24h: parseInt(stats.upcoming_24h),
            emergency_count: parseInt(stats.emergency_count),
            accounts_with_queue: parseInt(stats.accounts_with_queue),
            avg_queue_size: parseFloat(stats.avg_queue_size) || 0
        };
    }
    async checkQueueHealth() {
        const stats = await this.getQueueStats();
        const metrics = await this.getProcessingMetrics();
        const bottlenecks = await this.detectBottlenecks();
        const alerts = await this.generateHealthAlerts();
        let overallStatus = 'healthy';
        if (stats.overdue_count > 10 || stats.failed_count > 20 || metrics.success_rate < 0.8) {
            overallStatus = 'critical';
        }
        else if (stats.overdue_count > 5 || stats.failed_count > 10 || metrics.success_rate < 0.9) {
            overallStatus = 'warning';
        }
        return {
            overall_status: overallStatus,
            queue_size: stats.total_items,
            processing_rate: metrics.items_processed_last_hour,
            error_rate: 1 - metrics.success_rate,
            bottlenecks,
            alerts,
            last_checked: new Date()
        };
    }
    async detectBottlenecks() {
        const bottlenecks = [];
        const stats = await this.getQueueStats();
        if (stats.queued_count > 100) {
            bottlenecks.push({
                type: 'high_queue_size',
                severity: stats.queued_count > 200 ? 'high' : 'medium',
                affected_accounts: stats.accounts_with_queue,
                description: `Queue has ${stats.queued_count} pending items`,
                suggested_action: 'Review posting schedules and consider increasing processing capacity'
            });
        }
        if (stats.failed_count > 10) {
            bottlenecks.push({
                type: 'failed_items',
                severity: stats.failed_count > 30 ? 'high' : 'medium',
                affected_accounts: 0,
                description: `${stats.failed_count} items have failed posting`,
                suggested_action: 'Review failed items and retry or remove problematic content'
            });
        }
        if (stats.overdue_count > 5) {
            bottlenecks.push({
                type: 'overdue_content',
                severity: stats.overdue_count > 15 ? 'high' : 'medium',
                affected_accounts: 0,
                description: `${stats.overdue_count} items are overdue for posting`,
                suggested_action: 'Process overdue items immediately or reschedule'
            });
        }
        return bottlenecks;
    }
    async generateHealthAlerts() {
        const alerts = [];
        const overdueItems = await this.getOverdueContent();
        const overdueEmergency = overdueItems.filter(item => item.emergency_content);
        if (overdueEmergency.length > 0) {
            alerts.push({
                id: `overdue_emergency_${Date.now()}`,
                type: 'error',
                title: 'Overdue Emergency Content',
                message: `${overdueEmergency.length} emergency content items are overdue`,
                created_at: new Date(),
                requires_action: true
            });
        }
        const metrics = await this.getProcessingMetrics();
        if (metrics.success_rate < 0.85) {
            alerts.push({
                id: `low_success_rate_${Date.now()}`,
                type: 'warning',
                title: 'Low Success Rate',
                message: `Success rate is ${Math.round(metrics.success_rate * 100)}%`,
                created_at: new Date(),
                requires_action: true
            });
        }
        return alerts;
    }
    async getProcessingMetrics() {
        const metricsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'posted' AND posted_at > CURRENT_TIMESTAMP - INTERVAL '1 hour') as items_processed_last_hour,
        COUNT(*) FILTER (WHERE status = 'posted' AND posted_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as items_processed_last_24h,
        COUNT(*) FILTER (WHERE status IN ('posted', 'failed') AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as total_attempted_24h,
        COUNT(*) FILTER (WHERE status = 'posted' AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as successful_24h,
        COUNT(*) FILTER (WHERE retry_count > 0 AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as retry_count_24h,
        COUNT(DISTINCT account_id) FILTER (WHERE status = 'posted' AND posted_at > CURRENT_TIMESTAMP - INTERVAL '24 hours') as accounts_processed_24h
      FROM content_queue
    `;
        const queueSizeQuery = `
      SELECT 
        MAX(queue_count) as peak_queue_size_24h
      FROM (
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as queue_count
        FROM content_queue 
        WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
        GROUP BY DATE_TRUNC('hour', created_at)
      ) hourly_counts
    `;
        const [metricsResult, queueSizeResult] = await Promise.all([
            database_1.db.query(metricsQuery),
            database_1.db.query(queueSizeQuery)
        ]);
        const metrics = metricsResult.rows[0];
        const queueSize = queueSizeResult.rows[0];
        const totalAttempted = parseInt(metrics.total_attempted_24h) || 1;
        const successful = parseInt(metrics.successful_24h);
        const successRate = totalAttempted > 0 ? successful / totalAttempted : 1;
        return {
            items_processed_last_hour: parseInt(metrics.items_processed_last_hour),
            items_processed_last_24h: parseInt(metrics.items_processed_last_24h),
            avg_processing_time_ms: 5000,
            success_rate: successRate,
            retry_rate: parseInt(metrics.retry_count_24h) / totalAttempted,
            peak_queue_size_24h: parseInt(queueSize.peak_queue_size_24h) || 0,
            accounts_processed_24h: parseInt(metrics.accounts_processed_24h)
        };
    }
    async getQueueSummary() {
        const [stats, upcoming, overdue] = await Promise.all([
            this.getQueueStats(),
            this.getUpcomingContent(6),
            this.getOverdueContent()
        ]);
        const recentActivity = await this.getQueueItems({
            status: 'posted',
            sort_by: 'posted_at',
            sort_order: 'DESC',
            limit: 10
        });
        return {
            stats,
            upcoming: upcoming.slice(0, 20),
            overdue: overdue.slice(0, 20),
            recent_activity: recentActivity.items
        };
    }
}
exports.QueueManagementService = QueueManagementService;
//# sourceMappingURL=QueueManagementService.js.map