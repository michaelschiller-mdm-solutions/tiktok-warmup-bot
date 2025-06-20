"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotActivityMonitor = void 0;
const database_1 = require("../database");
const axios_1 = __importDefault(require("axios"));
class BotActivityMonitor {
    constructor() {
        this.healthCheckInterval = null;
        this.HEALTH_CHECK_INTERVAL = 60000;
        this.REQUEST_TIMEOUT = 10000;
        this.startHealthCheckMonitoring();
    }
    async getAllBotStatuses() {
        const query = `
      SELECT 
        i.assigned_bot_id as bot_id,
        i.ip_address as iphone_ip,
        i.xxtouch_port as iphone_port,
        i.automation_enabled,
        i.last_health_check,
        i.connection_test_success,
        COUNT(a.id) as accounts_assigned
      FROM iphones i
      LEFT JOIN accounts a ON a.assigned_iphone_id = i.id
      WHERE i.assigned_bot_id IS NOT NULL
        AND i.automation_enabled = true
      GROUP BY i.id, i.assigned_bot_id, i.ip_address, i.xxtouch_port, 
               i.automation_enabled, i.last_health_check, i.connection_test_success
    `;
        const result = await database_1.db.query(query);
        const botStatuses = [];
        for (const row of result.rows) {
            const botStatus = {
                bot_id: row.bot_id,
                iphone_ip: row.iphone_ip,
                iphone_port: row.iphone_port,
                status: 'disconnected',
                last_seen: row.last_health_check ? new Date(row.last_health_check) : null,
                last_activity: null,
                current_script: null,
                accounts_assigned: parseInt(row.accounts_assigned),
                active_operations: [],
                health_check_success: row.connection_test_success || false,
                error_message: null
            };
            botStatus.active_operations = await this.getActiveBotOperations(row.bot_id);
            botStatus.status = await this.determineBotStatus(row.bot_id, row.iphone_ip, row.iphone_port);
            botStatus.last_activity = await this.getLastBotActivity(row.bot_id);
            botStatuses.push(botStatus);
        }
        return botStatuses;
    }
    async getBotStatus(botId) {
        const allStatuses = await this.getAllBotStatuses();
        return allStatuses.find(status => status.bot_id === botId) || null;
    }
    async recordActivityStart(botId, accountId, activityType, metadata = {}) {
        const query = `
      INSERT INTO bot_activity_log (
        bot_id, account_id, activity_type, status, started_at, metadata
      ) VALUES ($1, $2, $3, 'started', CURRENT_TIMESTAMP, $4)
      RETURNING id
    `;
        const result = await database_1.db.query(query, [
            botId,
            accountId,
            activityType,
            JSON.stringify(metadata)
        ]);
        return result.rows[0].id;
    }
    async recordActivityCompletion(activityId, status, errorMessage = null, metadata = {}) {
        const query = `
      UPDATE bot_activity_log 
      SET 
        status = $1,
        completed_at = CURRENT_TIMESTAMP,
        duration_seconds = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)),
        error_message = $2,
        metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
      WHERE id = $4
    `;
        await database_1.db.query(query, [
            status,
            errorMessage,
            JSON.stringify(metadata),
            activityId
        ]);
    }
    async getBotActivity(botId, accountId, limit = 100) {
        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;
        if (botId) {
            whereClause += ` AND bal.bot_id = $${paramIndex}`;
            params.push(botId);
            paramIndex++;
        }
        if (accountId) {
            whereClause += ` AND bal.account_id = $${paramIndex}`;
            params.push(accountId);
            paramIndex++;
        }
        const query = `
      SELECT 
        bal.id,
        bal.bot_id,
        bal.account_id,
        a.username as account_username,
        bal.activity_type,
        bal.status,
        bal.started_at,
        bal.completed_at,
        bal.duration_seconds,
        bal.error_message,
        bal.metadata
      FROM bot_activity_log bal
      LEFT JOIN accounts a ON bal.account_id = a.id
      ${whereClause}
      ORDER BY bal.started_at DESC
      LIMIT $${paramIndex}
    `;
        params.push(limit);
        const result = await database_1.db.query(query, params);
        return result.rows.map(row => ({
            id: row.id,
            bot_id: row.bot_id,
            account_id: row.account_id,
            account_username: row.account_username,
            activity_type: row.activity_type,
            status: row.status,
            started_at: new Date(row.started_at),
            completed_at: row.completed_at ? new Date(row.completed_at) : null,
            duration_seconds: row.duration_seconds ? parseFloat(row.duration_seconds) : null,
            error_message: row.error_message,
            metadata: row.metadata || {}
        }));
    }
    async performHealthCheck(botId) {
        const botStatus = await this.getBotStatus(botId);
        if (!botStatus) {
            console.warn(`Bot ${botId} not found for health check`);
            return false;
        }
        const activityId = await this.recordActivityStart(botId, null, 'health_check', {
            iphone_ip: botStatus.iphone_ip,
            iphone_port: botStatus.iphone_port
        });
        try {
            const response = await axios_1.default.get(`http://${botStatus.iphone_ip}:${botStatus.iphone_port}/status`, { timeout: this.REQUEST_TIMEOUT });
            await database_1.db.query(`
        UPDATE iphones 
        SET 
          last_health_check = CURRENT_TIMESTAMP,
          connection_test_success = true
        WHERE assigned_bot_id = $1
      `, [botId]);
            await this.recordActivityCompletion(activityId, 'completed', null, {
                response_status: response.status,
                response_data: response.data
            });
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            await database_1.db.query(`
        UPDATE iphones 
        SET 
          last_health_check = CURRENT_TIMESTAMP,
          connection_test_success = false
        WHERE assigned_bot_id = $1
      `, [botId]);
            await this.recordActivityCompletion(activityId, 'failed', errorMessage, {
                error_type: error.constructor.name,
                iphone_ip: botStatus.iphone_ip,
                iphone_port: botStatus.iphone_port
            });
            console.error(`Health check failed for bot ${botId}:`, errorMessage);
            return false;
        }
    }
    async isBotRunningScript(botId) {
        const botStatus = await this.getBotStatus(botId);
        if (!botStatus)
            return false;
        try {
            const response = await axios_1.default.get(`http://${botStatus.iphone_ip}:${botStatus.iphone_port}/is_running`, { timeout: this.REQUEST_TIMEOUT });
            return String(response.data).trim().toLowerCase() === 'true';
        }
        catch (error) {
            console.warn(`Could not check script status for bot ${botId}:`, error);
            return false;
        }
    }
    async getBotPerformanceMetrics(days = 7) {
        const query = `
      SELECT 
        bal.bot_id,
        bal.activity_type,
        COUNT(*) as total_activities,
        COUNT(*) FILTER (WHERE bal.status = 'completed') as successful_activities,
        COUNT(*) FILTER (WHERE bal.status = 'failed') as failed_activities,
        AVG(bal.duration_seconds) FILTER (WHERE bal.status = 'completed') as avg_duration_seconds,
        MIN(bal.started_at) as first_activity,
        MAX(bal.completed_at) as last_activity
      FROM bot_activity_log bal
      WHERE bal.started_at >= CURRENT_DATE - INTERVAL '${days} days'
      GROUP BY bal.bot_id, bal.activity_type
      ORDER BY bal.bot_id, bal.activity_type
    `;
        const result = await database_1.db.query(query);
        return result.rows;
    }
    startHealthCheckMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.healthCheckInterval = setInterval(async () => {
            try {
                const botStatuses = await this.getAllBotStatuses();
                for (const botStatus of botStatuses) {
                    await this.performHealthCheck(botStatus.bot_id);
                }
            }
            catch (error) {
                console.error('Error during automated health check:', error);
            }
        }, this.HEALTH_CHECK_INTERVAL);
        console.log('Bot health check monitoring started');
    }
    stopHealthCheckMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            console.log('Bot health check monitoring stopped');
        }
    }
    async getActiveBotOperations(botId) {
        const query = `
      SELECT 
        bal.account_id,
        a.username as account_username,
        bal.activity_type as operation_type,
        bal.started_at
      FROM bot_activity_log bal
      LEFT JOIN accounts a ON bal.account_id = a.id
      WHERE bal.bot_id = $1 
        AND bal.status = 'started'
        AND bal.started_at > CURRENT_TIMESTAMP - INTERVAL '1 hour'
      ORDER BY bal.started_at DESC
    `;
        const result = await database_1.db.query(query, [botId]);
        return result.rows.map(row => ({
            account_id: row.account_id,
            account_username: row.account_username,
            operation_type: row.operation_type,
            started_at: new Date(row.started_at)
        }));
    }
    async determineBotStatus(botId, iphoneIp, iphonePort) {
        const isRunning = await this.isBotRunningScript(botId);
        if (isRunning) {
            return 'running';
        }
        const recentActivity = await this.getLastBotActivity(botId);
        const lastHealthCheck = await this.getLastHealthCheck(botId);
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        if (lastHealthCheck && lastHealthCheck > fiveMinutesAgo) {
            return 'idle';
        }
        return 'disconnected';
    }
    async getLastBotActivity(botId) {
        const query = `
      SELECT MAX(COALESCE(completed_at, started_at)) as last_activity
      FROM bot_activity_log
      WHERE bot_id = $1
    `;
        const result = await database_1.db.query(query, [botId]);
        return result.rows[0]?.last_activity ? new Date(result.rows[0].last_activity) : null;
    }
    async getLastHealthCheck(botId) {
        const query = `
      SELECT last_health_check
      FROM iphones
      WHERE assigned_bot_id = $1 AND connection_test_success = true
    `;
        const result = await database_1.db.query(query, [botId]);
        return result.rows[0]?.last_health_check ? new Date(result.rows[0].last_health_check) : null;
    }
}
exports.BotActivityMonitor = BotActivityMonitor;
//# sourceMappingURL=botActivityMonitor.js.map