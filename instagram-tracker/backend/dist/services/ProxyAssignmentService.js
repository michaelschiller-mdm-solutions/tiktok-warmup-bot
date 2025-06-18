"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProxyAssignmentService = void 0;
const database_1 = require("../database");
class ProxyAssignmentService {
    async assignProxyToAccount(accountId) {
        try {
            const existingProxy = await database_1.db.query('SELECT proxy_id FROM accounts WHERE id = $1 AND proxy_id IS NOT NULL', [accountId]);
            if (existingProxy.rows.length > 0) {
                return {
                    success: true,
                    accountId,
                    proxyId: existingProxy.rows[0].proxy_id,
                    message: 'Account already has proxy assigned'
                };
            }
            const availableProxy = await database_1.db.query(`
        SELECT 
          p.id,
          p.ip,
          p.port,
          p.username,
          p.provider,
          p.location,
          COALESCE(p.account_count, 0) as current_count,
          p.max_accounts
        FROM proxies p
        WHERE p.status = 'active' 
          AND COALESCE(p.account_count, 0) < COALESCE(p.max_accounts, 3)
        ORDER BY p.account_count ASC, p.id ASC
        LIMIT 1
      `);
            if (availableProxy.rows.length === 0) {
                return {
                    success: false,
                    accountId,
                    message: 'No available proxies with capacity',
                    error: 'NO_AVAILABLE_PROXIES'
                };
            }
            const proxy = availableProxy.rows[0];
            await database_1.db.query('BEGIN');
            try {
                await database_1.db.query(`
          UPDATE accounts 
          SET 
            proxy_id = $1,
            proxy_assigned_at = CURRENT_TIMESTAMP,
            proxy_host = $2,
            proxy_port = $3,
            proxy_username = $4,
            proxy_provider = $5,
            proxy_location = $6,
            proxy_status = 'assigned'
          WHERE id = $7
        `, [
                    proxy.id,
                    proxy.ip,
                    proxy.port,
                    proxy.username,
                    proxy.provider,
                    proxy.location,
                    accountId
                ]);
                await database_1.db.query(`
          UPDATE proxies 
          SET 
            account_count = COALESCE(account_count, 0) + 1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [proxy.id]);
                await database_1.db.query('COMMIT');
                return {
                    success: true,
                    accountId,
                    proxyId: proxy.id,
                    message: `Proxy ${proxy.ip}:${proxy.port} assigned successfully`
                };
            }
            catch (error) {
                await database_1.db.query('ROLLBACK');
                throw error;
            }
        }
        catch (error) {
            console.error(`Error assigning proxy to account ${accountId}:`, error);
            return {
                success: false,
                accountId,
                message: 'Failed to assign proxy',
                error: error.message
            };
        }
    }
    async assignProxiesToAccounts(accountIds) {
        const results = [];
        for (const accountId of accountIds) {
            const result = await this.assignProxyToAccount(accountId);
            results.push(result);
        }
        return results;
    }
    async getAvailableProxies() {
        try {
            const result = await database_1.db.query(`
        SELECT 
          id,
          ip,
          port,
          provider,
          location,
          COALESCE(account_count, 0) as current_count,
          COALESCE(max_accounts, 3) as max_accounts,
          COALESCE(max_accounts, 3) - COALESCE(account_count, 0) as available_slots
        FROM proxies
        WHERE status = 'active'
          AND COALESCE(account_count, 0) < COALESCE(max_accounts, 3)
        ORDER BY account_count ASC, id ASC
      `);
            return result.rows;
        }
        catch (error) {
            console.error('Error getting available proxies:', error);
            throw new Error('Failed to get available proxies');
        }
    }
    async getProxyAssignmentStats() {
        try {
            const result = await database_1.db.query(`
        SELECT 
          COUNT(*) as total_proxies,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_proxies,
          COUNT(CASE WHEN COALESCE(account_count, 0) >= COALESCE(max_accounts, 3) THEN 1 END) as fully_utilized,
          SUM(COALESCE(max_accounts, 3) - COALESCE(account_count, 0)) as available_slots,
          SUM(COALESCE(account_count, 0)) as total_assigned
        FROM proxies
        WHERE status = 'active'
      `);
            const row = result.rows[0];
            return {
                totalProxies: parseInt(row.total_proxies) || 0,
                activeProxies: parseInt(row.active_proxies) || 0,
                fullyUtilizedProxies: parseInt(row.fully_utilized) || 0,
                availableSlots: parseInt(row.available_slots) || 0,
                totalAssignedAccounts: parseInt(row.total_assigned) || 0
            };
        }
        catch (error) {
            console.error('Error getting proxy assignment stats:', error);
            throw new Error('Failed to get proxy assignment statistics');
        }
    }
    async unassignProxyFromAccount(accountId) {
        try {
            await database_1.db.query('BEGIN');
            const currentAssignment = await database_1.db.query('SELECT proxy_id FROM accounts WHERE id = $1 AND proxy_id IS NOT NULL', [accountId]);
            if (currentAssignment.rows.length === 0) {
                await database_1.db.query('ROLLBACK');
                return {
                    success: true,
                    accountId,
                    message: 'Account has no proxy assignment'
                };
            }
            const proxyId = currentAssignment.rows[0].proxy_id;
            await database_1.db.query(`
        UPDATE accounts 
        SET 
          proxy_id = NULL,
          proxy_assigned_at = NULL,
          proxy_host = NULL,
          proxy_port = NULL,
          proxy_username = NULL,
          proxy_provider = NULL,
          proxy_location = NULL,
          proxy_status = NULL
        WHERE id = $1
      `, [accountId]);
            await database_1.db.query(`
        UPDATE proxies 
        SET 
          account_count = GREATEST(COALESCE(account_count, 0) - 1, 0),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [proxyId]);
            await database_1.db.query('COMMIT');
            return {
                success: true,
                accountId,
                proxyId,
                message: 'Proxy unassigned successfully'
            };
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            console.error(`Error unassigning proxy from account ${accountId}:`, error);
            return {
                success: false,
                accountId,
                message: 'Failed to unassign proxy',
                error: error.message
            };
        }
    }
}
exports.ProxyAssignmentService = ProxyAssignmentService;
//# sourceMappingURL=ProxyAssignmentService.js.map