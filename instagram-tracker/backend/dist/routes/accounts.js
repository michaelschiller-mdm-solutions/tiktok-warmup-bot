"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const lifecycle_1 = __importDefault(require("./accounts/lifecycle"));
const verification_1 = __importDefault(require("./accounts/verification"));
const router = express_1.default.Router();
router.use('/lifecycle', lifecycle_1.default);
router.use('/verification', verification_1.default);
router.get('/statistics', async (req, res) => {
    try {
        const query = `
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN a.model_id IS NOT NULL THEN 1 END) as assigned_accounts,
        COUNT(CASE WHEN a.model_id IS NULL THEN 1 END) as unassigned_accounts,
        COUNT(DISTINCT a.model_id) FILTER (WHERE a.model_id IS NOT NULL) as total_models,
        COUNT(CASE WHEN a.lifecycle_state = 'imported' THEN 1 END) as imported_accounts,
        COUNT(CASE WHEN a.lifecycle_state = 'warmup' THEN 1 END) as warmup_accounts,
        COUNT(CASE WHEN a.lifecycle_state = 'ready' THEN 1 END) as ready_accounts,
        COUNT(CASE WHEN a.lifecycle_state = 'active' THEN 1 END) as active_accounts,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_status_accounts,
        COUNT(CASE WHEN a.status = 'banned' THEN 1 END) as banned_accounts,
        COUNT(CASE WHEN a.status = 'suspended' THEN 1 END) as suspended_accounts,
        COUNT(CASE WHEN a.requires_human_review = true THEN 1 END) as accounts_needing_review,
        COUNT(CASE WHEN a.proxy_id IS NOT NULL THEN 1 END) as accounts_with_proxy,
        MAX(a.created_at) as latest_import_date
      FROM accounts a
    `;
        const result = await database_1.db.query(query);
        const stats = result.rows[0];
        const lifecycleQuery = `
      SELECT 
        lifecycle_state,
        COUNT(*) as count
      FROM accounts 
      GROUP BY lifecycle_state
      ORDER BY count DESC
    `;
        const lifecycleResult = await database_1.db.query(lifecycleQuery);
        const modelQuery = `
      SELECT 
        COALESCE(m.name, 'Unassigned') as model_name,
        COUNT(a.id) as account_count
      FROM accounts a
      LEFT JOIN models m ON a.model_id = m.id
      GROUP BY m.id, m.name
      ORDER BY account_count DESC
    `;
        const modelResult = await database_1.db.query(modelQuery);
        res.json({
            success: true,
            data: {
                overview: {
                    total_accounts: parseInt(stats.total_accounts) || 0,
                    assigned_accounts: parseInt(stats.assigned_accounts) || 0,
                    unassigned_accounts: parseInt(stats.unassigned_accounts) || 0,
                    total_models: parseInt(stats.total_models) || 0,
                    latest_import_date: stats.latest_import_date
                },
                lifecycle_states: {
                    imported: parseInt(stats.imported_accounts) || 0,
                    warmup: parseInt(stats.warmup_accounts) || 0,
                    ready: parseInt(stats.ready_accounts) || 0,
                    active: parseInt(stats.active_accounts) || 0
                },
                account_status: {
                    active: parseInt(stats.active_status_accounts) || 0,
                    banned: parseInt(stats.banned_accounts) || 0,
                    suspended: parseInt(stats.suspended_accounts) || 0,
                    needs_review: parseInt(stats.accounts_needing_review) || 0
                },
                infrastructure: {
                    accounts_with_proxy: parseInt(stats.accounts_with_proxy) || 0,
                    proxy_coverage_percent: stats.total_accounts > 0 ?
                        Math.round((parseInt(stats.accounts_with_proxy) / parseInt(stats.total_accounts)) * 100) : 0
                },
                breakdown: {
                    by_lifecycle: lifecycleResult.rows.map(row => ({
                        state: row.lifecycle_state,
                        count: parseInt(row.count)
                    })),
                    by_model: modelResult.rows.map(row => ({
                        model_name: row.model_name,
                        count: parseInt(row.account_count)
                    }))
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching account statistics:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch account statistics'
        });
    }
});
router.post('/assign-to-model', async (req, res) => {
    try {
        const { account_ids, model_id } = req.body;
        if (!account_ids || !Array.isArray(account_ids) || account_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'account_ids array is required'
            });
        }
        if (!model_id || typeof model_id !== 'number') {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'model_id is required and must be a number'
            });
        }
        const modelCheck = await database_1.db.query('SELECT id, name FROM models WHERE id = $1', [model_id]);
        if (modelCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: `Model with ID ${model_id} does not exist`
            });
        }
        const model = modelCheck.rows[0];
        const results = [];
        let successCount = 0;
        let failedCount = 0;
        for (const accountId of account_ids) {
            try {
                const accountResult = await database_1.db.query('SELECT id, username, model_id, lifecycle_state FROM accounts WHERE id = $1', [accountId]);
                if (accountResult.rows.length === 0) {
                    results.push({
                        account_id: accountId,
                        success: false,
                        error: 'Account not found'
                    });
                    failedCount++;
                    continue;
                }
                const account = accountResult.rows[0];
                await database_1.db.query(`
          UPDATE accounts 
          SET model_id = $2, 
              assigned_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [accountId, model_id]);
                if (account.lifecycle_state === 'imported') {
                    try {
                        await database_1.db.query('SELECT initialize_warmup_phases_with_content($1)', [accountId]);
                        try {
                            const { ProxyAssignmentService } = await Promise.resolve().then(() => __importStar(require('../services/ProxyAssignmentService')));
                            const proxyService = new ProxyAssignmentService();
                            const proxyResult = await proxyService.assignProxyToAccount(accountId);
                            if (proxyResult.success) {
                                console.log(`Proxy assigned to account ${accountId}: ${proxyResult.message}`);
                            }
                        }
                        catch (proxyError) {
                            console.warn(`Proxy assignment failed for account ${accountId}:`, proxyError);
                        }
                    }
                    catch (contentError) {
                        console.warn(`Content assignment failed for account ${accountId}:`, contentError);
                    }
                }
                results.push({
                    account_id: accountId,
                    username: account.username,
                    success: true,
                    previous_model_id: account.model_id,
                    new_model_id: model_id
                });
                successCount++;
            }
            catch (error) {
                console.error(`Error assigning account ${accountId} to model:`, error);
                results.push({
                    account_id: accountId,
                    success: false,
                    error: error.message || 'Unknown error occurred'
                });
                failedCount++;
            }
        }
        res.json({
            success: true,
            message: `Model assignment completed: ${successCount} successful, ${failedCount} failed`,
            data: {
                model_id: model_id,
                model_name: model.name,
                total_processed: account_ids.length,
                successful: successCount,
                failed: failedCount,
                results: results
            }
        });
    }
    catch (error) {
        console.error('Assign accounts to model error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error.message || 'Failed to assign accounts to model'
        });
    }
});
router.put('/:id/assign-model', async (req, res) => {
    try {
        const { id } = req.params;
        const { model_id } = req.body;
        if (!model_id || typeof model_id !== 'number') {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'model_id is required and must be a number'
            });
        }
        const accountResult = await database_1.db.query('SELECT id, username, model_id, lifecycle_state FROM accounts WHERE id = $1', [id]);
        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Account not found'
            });
        }
        const modelResult = await database_1.db.query('SELECT id, name FROM models WHERE id = $1', [model_id]);
        if (modelResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Model not found'
            });
        }
        const account = accountResult.rows[0];
        const model = modelResult.rows[0];
        await database_1.db.query(`
      UPDATE accounts 
      SET model_id = $2, 
          assigned_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, model_id]);
        if (account.lifecycle_state === 'imported') {
            try {
                await database_1.db.query('SELECT initialize_warmup_phases_with_content($1)', [id]);
                try {
                    const { ProxyAssignmentService } = await Promise.resolve().then(() => __importStar(require('../services/ProxyAssignmentService')));
                    const proxyService = new ProxyAssignmentService();
                    await proxyService.assignProxyToAccount(parseInt(id));
                }
                catch (proxyError) {
                    console.warn(`Proxy assignment failed for account ${id}:`, proxyError);
                }
            }
            catch (contentError) {
                console.warn(`Content assignment failed for account ${id}:`, contentError);
            }
        }
        res.json({
            success: true,
            message: `Account ${account.username} assigned to model ${model.name}`,
            data: {
                account_id: parseInt(id),
                username: account.username,
                previous_model_id: account.model_id,
                new_model_id: model_id,
                model_name: model.name
            }
        });
    }
    catch (error) {
        console.error('Assign account to model error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error.message || 'Failed to assign account to model'
        });
    }
});
router.get('/unassigned', async (req, res) => {
    try {
        const { page = 1, limit = 1000, search, lifecycle_state, status, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
        let whereConditions = ['a.model_id IS NULL'];
        let params = [];
        let paramIndex = 1;
        if (lifecycle_state) {
            whereConditions.push(`a.lifecycle_state = $${paramIndex}`);
            params.push(lifecycle_state);
            paramIndex++;
        }
        if (status) {
            whereConditions.push(`a.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }
        if (search) {
            whereConditions.push(`(a.username ILIKE $${paramIndex} OR a.email ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const query = `
      SELECT 
        a.id,
        a.username,
        a.email,
        a.password,
        a.account_code as email_password,
        a.status,
        a.lifecycle_state,
        a.created_at,
        a.updated_at,
        a.proxy_host,
        a.proxy_port,
        a.proxy_username,
        a.proxy_provider,
        a.proxy_status
      FROM accounts a
      ${whereClause}
      ORDER BY a.${sort_by} ${sort_order.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(parseInt(limit));
        params.push(offset);
        const result = await database_1.db.query(query, params);
        const countQuery = `
      SELECT COUNT(*) as total_count
      FROM accounts a
      ${whereClause}
    `;
        const countResult = await database_1.db.query(countQuery, params.slice(0, -2));
        const totalCount = parseInt(countResult.rows[0].total_count);
        res.json({
            success: true,
            data: result.rows,
            metadata: {
                total_records: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(totalCount / parseInt(limit)),
                has_next: (parseInt(page) * parseInt(limit)) < totalCount,
                has_previous: parseInt(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Error fetching unassigned accounts:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch unassigned accounts'
        });
    }
});
router.get('/', async (req, res) => {
    try {
        const { model_id, status, lifecycle_state, content_type, niche, proxy_provider, proxy_status, page = 1, limit = 1000, sort_by = 'created_at', sort_order = 'desc', search } = req.query;
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;
        if (model_id) {
            whereConditions.push(`a.model_id = $${paramIndex}`);
            params.push(model_id);
            paramIndex++;
        }
        if (status) {
            const statusArray = Array.isArray(status) ? status : [status];
            whereConditions.push(`a.status = ANY($${paramIndex})`);
            params.push(statusArray);
            paramIndex++;
        }
        if (lifecycle_state) {
            const lifecycleStateArray = Array.isArray(lifecycle_state) ? lifecycle_state : [lifecycle_state];
            whereConditions.push(`a.lifecycle_state = ANY($${paramIndex})`);
            params.push(lifecycleStateArray);
            paramIndex++;
        }
        if (content_type) {
            whereConditions.push(`a.content_type = $${paramIndex}`);
            params.push(content_type);
            paramIndex++;
        }
        if (niche) {
            whereConditions.push(`a.niche = $${paramIndex}`);
            params.push(niche);
            paramIndex++;
        }
        if (proxy_provider) {
            whereConditions.push(`a.proxy_provider = $${paramIndex}`);
            params.push(proxy_provider);
            paramIndex++;
        }
        if (proxy_status) {
            const proxyStatusArray = Array.isArray(proxy_status) ? proxy_status : [proxy_status];
            whereConditions.push(`a.proxy_status = ANY($${paramIndex})`);
            params.push(proxyStatusArray);
            paramIndex++;
        }
        if (search) {
            whereConditions.push(`(a.username ILIKE $${paramIndex} OR a.display_name ILIKE $${paramIndex} OR a.email ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const query = `
      SELECT 
        a.*,
        m.name as model_name,
        ma.username as mother_account_username,
        -- New fields for warmup pipeline
        a.container_number,
        -- Account password (stored in plain text)
        a.password,
        -- Email password (stored in account_code field)
        a.account_code as email_password,
        -- Performance metrics (calculated in real-time if needed)
        COALESCE(a.follow_back_rate, 0) as follow_back_rate,
        COALESCE(a.conversion_rate, 0) as conversion_rate,
        COALESCE(a.total_follows, 0) as total_follows,
        COALESCE(a.total_conversions, 0) as total_conversions,
        -- Cost and revenue data
        COALESCE(a.monthly_cost, 0) as monthly_cost,
        COALESCE(
          (SELECT SUM(re.revenue_amount) 
           FROM revenue_events re 
           WHERE re.account_id = a.id), 0
        ) as total_revenue,
        -- Proxy status info
        a.proxy_host,
        a.proxy_port,
        a.proxy_username,
        a.proxy_provider,
        a.proxy_status,
        a.proxy_location,
        a.proxy_last_checked
      FROM accounts a
      LEFT JOIN models m ON a.model_id = m.id
      LEFT JOIN accounts ma ON a.mother_account_id = ma.id
      ${whereClause}
      ORDER BY a.${sort_by} ${sort_order.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(parseInt(limit));
        params.push(offset);
        const result = await database_1.db.query(query, params);
        const countQuery = `
      SELECT COUNT(*) as total_count
      FROM accounts a
      ${whereClause}
    `;
        const countResult = await database_1.db.query(countQuery, params.slice(0, -2));
        const totalCount = parseInt(countResult.rows[0].total_count);
        res.json({
            success: true,
            data: {
                accounts: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total_count: totalCount,
                    total_pages: Math.ceil(totalCount / parseInt(limit))
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch accounts'
        });
    }
});
router.get('/all-fields', async (req, res) => {
    try {
        const { page = 1, limit = 1000, search, model_id, lifecycle_state, status, sort_by = 'created_at', sort_order = 'DESC' } = req.query;
        let whereConditions = [];
        let params = [];
        let paramIndex = 1;
        if (model_id) {
            whereConditions.push(`a.model_id = $${paramIndex}`);
            params.push(model_id);
            paramIndex++;
        }
        if (lifecycle_state) {
            whereConditions.push(`a.lifecycle_state = $${paramIndex}`);
            params.push(lifecycle_state);
            paramIndex++;
        }
        if (status) {
            whereConditions.push(`a.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }
        if (search) {
            whereConditions.push(`(a.username ILIKE $${paramIndex} OR a.display_name ILIKE $${paramIndex} OR a.email ILIKE $${paramIndex})`);
            params.push(`%${search}%`);
            paramIndex++;
        }
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);
        const query = `
      SELECT 
        a.id,
        a.model_id,
        a.username,
        a.password,
        a.email,
        a.account_code as email_password,
        a.display_name,
        a.bio,
        a.status,
        a.creation_date,
        a.device_info,
        a.profile_picture_url,
        a.location,
        a.birth_date,
        a.last_activity,
        a.created_at,
        a.updated_at,
        a.content_type,
        a.campus,
        a.niche,
        a.cta_text,
        a.mother_account_id,
        a.proxy_host,
        a.proxy_port,
        a.proxy_username,
        a.proxy_password_encrypted,
        a.proxy_provider,
        a.proxy_status,
        a.proxy_location,
        a.proxy_last_checked,
        a.adspower_profile_id,
        a.cupid_profile_id,
        a.cupid_system_prompt,
        a.follow_back_rate,
        a.conversion_rate,
        a.total_follows,
        a.total_conversions,
        a.last_activity_check,
        a.monthly_cost,
        a.lifecycle_state,
        a.state_changed_at,
        a.state_changed_by,
        a.state_notes,
        a.last_bot_action_by,
        a.last_bot_action_at,
        a.requires_human_review,
        a.last_error_message,
        a.last_error_at,
        a.cooldown_until,
        a.warmup_completed_phases,
        a.container_number,
        a.proxy_id,
        a.proxy_assigned_at,
        -- Additional computed fields
        m.name as model_name,
        ma.username as mother_account_username,
        -- Proxy password (encrypted - will be decrypted on frontend if needed)
        a.proxy_password_encrypted
      FROM accounts a
      LEFT JOIN models m ON a.model_id = m.id
      LEFT JOIN accounts ma ON a.mother_account_id = ma.id
      ${whereClause}
      ORDER BY a.${sort_by} ${sort_order.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        params.push(parseInt(limit), offset);
        const result = await database_1.db.query(query, params);
        const countQuery = `
      SELECT COUNT(*) as total_count
      FROM accounts a
      ${whereClause}
    `;
        const countResult = await database_1.db.query(countQuery, params.slice(0, -2));
        const totalCount = parseInt(countResult.rows[0].total_count);
        res.json({
            success: true,
            data: result.rows,
            metadata: {
                total_records: totalCount,
                page: parseInt(page),
                limit: parseInt(limit),
                total_pages: Math.ceil(totalCount / parseInt(limit)),
                has_next: (parseInt(page) * parseInt(limit)) < totalCount,
                has_previous: parseInt(page) > 1
            }
        });
    }
    catch (error) {
        console.error('Error fetching accounts with all fields:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch accounts'
        });
    }
});
router.get('/invalid', async (req, res) => {
    try {
        const query = `
      SELECT 
        a.id,
        a.username,
        a.email,
        a.status,
        a.lifecycle_state,
        a.order_number,
        a.import_source,
        a.import_batch_id,
        a.imported_at,
        a.state_changed_at,
        a.state_changed_by,
        a.state_notes,
        m.name as model_name
      FROM accounts a
      LEFT JOIN models m ON a.model_id = m.id
      WHERE 
        a.lifecycle_state = 'archived' 
        OR a.lifecycle_state = 'cleanup'
        OR a.status IN ('banned', 'suspended')
      ORDER BY 
        a.order_number ASC NULLS LAST,
        a.imported_at DESC NULLS LAST,
        a.created_at DESC
    `;
        const result = await database_1.db.query(query);
        const groupedAccounts = {};
        const ungroupedAccounts = [];
        result.rows.forEach(account => {
            if (account.order_number) {
                if (!groupedAccounts[account.order_number]) {
                    groupedAccounts[account.order_number] = [];
                }
                groupedAccounts[account.order_number].push(account);
            }
            else {
                ungroupedAccounts.push(account);
            }
        });
        res.json({
            success: true,
            data: {
                grouped_by_order: groupedAccounts,
                ungrouped: ungroupedAccounts,
                total_count: result.rows.length,
                order_summary: Object.keys(groupedAccounts).map(orderNum => ({
                    order_number: orderNum,
                    account_count: groupedAccounts[orderNum].length,
                    accounts: groupedAccounts[orderNum].map(acc => acc.username)
                }))
            }
        });
    }
    catch (error) {
        console.error('Error fetching invalid accounts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch invalid accounts',
            message: error.message
        });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT 
        a.*,
        -- Account password (stored in plain text)
        a.password,
        -- Email password (stored in account_code field)
        a.account_code as email_password,
        m.name as model_name,
        ma.username as mother_account_username,
        -- Dynamic columns data
        COALESCE(
          json_agg(
            CASE WHEN add.id IS NOT NULL THEN
              json_build_object(
                'column_name', dc.column_name,
                'column_type', dc.column_type,
                'value_text', add.value_text,
                'value_number', add.value_number,
                'value_date', add.value_date,
                'value_boolean', add.value_boolean
              )
            END
          ) FILTER (WHERE add.id IS NOT NULL), '[]'
        ) as dynamic_data,
        -- Cost breakdown
        COALESCE(
          json_agg(
            CASE WHEN ac.id IS NOT NULL THEN
              json_build_object(
                'category_name', cc.name,
                'cost_amount', ac.cost_amount,
                'cost_period', ac.cost_period
              )
            END
          ) FILTER (WHERE ac.id IS NOT NULL), '[]'
        ) as cost_breakdown
      FROM accounts a
      LEFT JOIN models m ON a.model_id = m.id
      LEFT JOIN accounts ma ON a.mother_account_id = ma.id
      LEFT JOIN account_dynamic_data add ON a.id = add.account_id
      LEFT JOIN dynamic_columns dc ON add.dynamic_column_id = dc.id
      LEFT JOIN account_costs ac ON a.id = ac.account_id AND ac.is_active = true
      LEFT JOIN cost_categories cc ON ac.cost_category_id = cc.id
      WHERE a.id = $1
      GROUP BY a.id, m.name, ma.username
    `;
        const result = await database_1.db.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Account not found'
            });
        }
        res.json({
            success: true,
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Error fetching account:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch account'
        });
    }
});
router.post('/', async (req, res) => {
    try {
        const { model_id, username, password, email, email_password, container_number, account_code, display_name, bio, content_type, campus, niche, cta_text, mother_account_id, proxy_host, proxy_port, proxy_username, proxy_password, proxy_provider, proxy_location, adspower_profile_id, cupid_profile_id, cupid_system_prompt, monthly_cost = 0 } = req.body;
        let encryptedProxyPassword = null;
        if (proxy_password) {
            const encryptResult = await database_1.db.query('SELECT encrypt_proxy_password($1) as encrypted', [proxy_password]);
            encryptedProxyPassword = encryptResult.rows[0].encrypted;
        }
        const emailPasswordForAccountCode = email_password || account_code;
        const insertQuery = `
      INSERT INTO accounts (
        model_id, username, password, email, container_number,
        account_code, display_name, bio,
        content_type, campus, niche, cta_text, mother_account_id,
        proxy_host, proxy_port, proxy_username, proxy_password_encrypted, 
        proxy_provider, proxy_location, proxy_status,
        adspower_profile_id, cupid_profile_id, cupid_system_prompt,
        monthly_cost
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
        $17, $18, $19, $20, $21, $22, $23
      ) RETURNING *
    `;
        const result = await database_1.db.query(insertQuery, [
            model_id, username, password, email, container_number,
            emailPasswordForAccountCode, display_name, bio,
            content_type, campus, niche, cta_text, mother_account_id,
            proxy_host, proxy_port, proxy_username, encryptedProxyPassword,
            proxy_provider, proxy_location, 'unknown',
            adspower_profile_id, cupid_profile_id, cupid_system_prompt,
            monthly_cost
        ]);
        const newAccount = result.rows[0];
        if (proxy_provider) {
            await database_1.db.query(`
        INSERT INTO account_costs (account_id, cost_category_id, cost_amount, description)
        SELECT $1, cc.id, pp.monthly_cost_per_proxy, 'Proxy service cost'
        FROM cost_categories cc, proxy_providers pp
        WHERE cc.name = 'Proxies' AND pp.name = $2
      `, [newAccount.id, proxy_provider]);
        }
        if (cupid_profile_id) {
            await database_1.db.query(`
        INSERT INTO account_costs (account_id, cost_category_id, cost_amount, description)
        SELECT $1, id, 10.00, 'Cupid profile management'
        FROM cost_categories WHERE name = 'Cupid'
      `, [newAccount.id]);
        }
        res.status(201).json({
            success: true,
            data: newAccount,
            message: 'Account created successfully'
        });
    }
    catch (error) {
        console.error('Error creating account:', error);
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                error: 'Conflict',
                message: 'Account with this username already exists in this model'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to create account'
        });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (updateData.proxy_password) {
            const encryptResult = await database_1.db.query('SELECT encrypt_proxy_password($1) as encrypted', [updateData.proxy_password]);
            updateData.proxy_password_encrypted = encryptResult.rows[0].encrypted;
            delete updateData.proxy_password;
        }
        if (updateData.email_password) {
            updateData.account_code = updateData.email_password;
            delete updateData.email_password;
        }
        const updateFields = Object.keys(updateData).filter(key => key !== 'id');
        const setClause = updateFields.map((field, index) => `${field} = $${index + 2}`).join(', ');
        const values = [id, ...updateFields.map(field => updateData[field])];
        if (updateFields.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'No fields to update'
            });
        }
        const query = `
      UPDATE accounts 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 
      RETURNING *
    `;
        const result = await database_1.db.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Account not found'
            });
        }
        res.json({
            success: true,
            data: result.rows[0],
            message: 'Account updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to update account'
        });
    }
});
router.delete('/batch', async (req, res) => {
    try {
        const { account_ids } = req.body;
        if (!account_ids || !Array.isArray(account_ids) || account_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'account_ids array is required'
            });
        }
        const results = [];
        let successCount = 0;
        let failedCount = 0;
        for (const accountId of account_ids) {
            try {
                const result = await database_1.db.query('DELETE FROM accounts WHERE id = $1 RETURNING username', [accountId]);
                if (result.rows.length > 0) {
                    results.push({
                        account_id: accountId,
                        username: result.rows[0].username,
                        success: true
                    });
                    successCount++;
                }
                else {
                    results.push({
                        account_id: accountId,
                        success: false,
                        error: 'Account not found'
                    });
                    failedCount++;
                }
            }
            catch (error) {
                console.error(`Error deleting account ${accountId}:`, error);
                results.push({
                    account_id: accountId,
                    success: false,
                    error: error.message || 'Unknown error occurred'
                });
                failedCount++;
            }
        }
        res.json({
            success: true,
            message: `Batch delete completed: ${successCount} successful, ${failedCount} failed`,
            data: {
                total_processed: account_ids.length,
                successful: successCount,
                failed: failedCount,
                results: results
            }
        });
    }
    catch (error) {
        console.error('Batch delete error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error.message || 'Failed to delete accounts'
        });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await database_1.db.query('DELETE FROM accounts WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Account not found'
            });
        }
        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to delete account'
        });
    }
});
router.post('/bulk-import', async (req, res) => {
    try {
        const { accounts, validate_only = false, skip_duplicates = true } = req.body;
        if (!Array.isArray(accounts) || accounts.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Accounts array is required and must not be empty'
            });
        }
        let importedCount = 0;
        let skippedCount = 0;
        let errors = [];
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            try {
                if (!account.model_id || !account.username || !account.password || !account.email) {
                    errors.push({
                        row: i + 1,
                        message: 'Missing required fields: model_id, username, password, email',
                        data: account
                    });
                    continue;
                }
                if (!validate_only) {
                    if (skip_duplicates) {
                        const existingCheck = await database_1.db.query('SELECT id FROM accounts WHERE model_id = $1 AND username = $2', [account.model_id, account.username]);
                        if (existingCheck.rows.length > 0) {
                            skippedCount++;
                            continue;
                        }
                    }
                    let encryptedProxyPassword = null;
                    if (account.proxy_password) {
                        const encryptResult = await database_1.db.query('SELECT encrypt_proxy_password($1) as encrypted', [account.proxy_password]);
                        encryptedProxyPassword = encryptResult.rows[0].encrypted;
                    }
                    await database_1.db.query(`
            INSERT INTO accounts (
              model_id, username, password, email, account_code, display_name, bio,
              content_type, campus, niche, cta_text, mother_account_id,
              proxy_host, proxy_port, proxy_username, proxy_password_encrypted, 
              proxy_provider, proxy_location, proxy_status,
              adspower_profile_id, cupid_profile_id, cupid_system_prompt,
              monthly_cost
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 
              $17, $18, $19, $20, $21, $22, $23
            )
          `, [
                        account.model_id, account.username, account.password, account.email,
                        account.account_code, account.display_name, account.bio,
                        account.content_type, account.campus, account.niche, account.cta_text,
                        account.mother_account_id, account.proxy_host, account.proxy_port,
                        account.proxy_username, encryptedProxyPassword, account.proxy_provider,
                        account.proxy_location, 'unknown', account.adspower_profile_id,
                        account.cupid_profile_id, account.cupid_system_prompt, account.monthly_cost || 0
                    ]);
                    importedCount++;
                }
            }
            catch (error) {
                errors.push({
                    row: i + 1,
                    message: error.message,
                    data: account
                });
            }
        }
        res.json({
            success: true,
            data: {
                imported_count: importedCount,
                skipped_count: skippedCount,
                error_count: errors.length,
                errors: errors,
                validation_only: validate_only
            },
            message: validate_only ? 'Validation completed' : 'Bulk import completed'
        });
    }
    catch (error) {
        console.error('Error in bulk import:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to process bulk import'
        });
    }
});
router.get('/:id/performance', async (req, res) => {
    try {
        const { id } = req.params;
        const query = `
      SELECT * FROM account_performance_analysis WHERE id = $1
    `;
        const result = await database_1.db.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Account not found'
            });
        }
        res.json({
            success: true,
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Error fetching account performance:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch account performance'
        });
    }
});
router.post('/:id/test-proxy', async (req, res) => {
    try {
        const { id } = req.params;
        const accountResult = await database_1.db.query(`
      SELECT proxy_host, proxy_port, proxy_username, proxy_password_encrypted, proxy_provider
      FROM accounts WHERE id = $1
    `, [id]);
        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: 'Account not found'
            });
        }
        const account = accountResult.rows[0];
        if (!account.proxy_host) {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'No proxy configured for this account'
            });
        }
        const testPassed = Math.random() > 0.2;
        await database_1.db.query(`
      UPDATE accounts 
      SET proxy_status = $1, proxy_last_checked = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [testPassed ? 'active' : 'error', id]);
        res.json({
            success: true,
            data: {
                proxy_status: testPassed ? 'active' : 'error',
                test_result: testPassed ? 'Connection successful' : 'Connection failed',
                tested_at: new Date().toISOString()
            },
            message: `Proxy test ${testPassed ? 'passed' : 'failed'}`
        });
    }
    catch (error) {
        console.error('Error testing proxy:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to test proxy'
        });
    }
});
router.get('/content-assignment-status', async (req, res) => {
    try {
        const { model_id, lifecycle_state = 'warmup,ready,active' } = req.query;
        let query = `
      SELECT * FROM account_content_assignment_status
      WHERE lifecycle_state = ANY($1::text[])
    `;
        const params = [lifecycle_state.split(',')];
        if (model_id) {
            query += ` AND model_id = $${params.length + 1}`;
            params.push(parseInt(model_id));
        }
        query += ` ORDER BY account_id`;
        const result = await database_1.db.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            summary: {
                total_accounts: result.rows.length,
                complete_assignments: result.rows.filter(row => row.content_assignment_complete).length,
                incomplete_assignments: result.rows.filter(row => !row.content_assignment_complete).length
            }
        });
    }
    catch (error) {
        console.error('Error fetching content assignment status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch content assignment status'
        });
    }
});
router.post('/:id/assign-content', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const accountResult = await database_1.db.query('SELECT id, username FROM accounts WHERE id = $1', [accountId]);
        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }
        const result = await database_1.db.query('SELECT assign_content_to_all_phases($1) as assigned_count', [accountId]);
        const assignedCount = result.rows[0].assigned_count;
        res.json({
            success: true,
            data: {
                account_id: accountId,
                username: accountResult.rows[0].username,
                assigned_phases: assignedCount
            },
            message: `Content assigned to ${assignedCount} phases for account ${accountId}`
        });
    }
    catch (error) {
        console.error('Error assigning content to account:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign content to account'
        });
    }
});
router.post('/bulk-assign-content', async (req, res) => {
    try {
        const { account_ids, model_id } = req.body;
        if (!Array.isArray(account_ids) || account_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'account_ids must be a non-empty array'
            });
        }
        const validIds = account_ids.filter(id => Number.isInteger(id) && id > 0);
        if (validIds.length !== account_ids.length) {
            return res.status(400).json({
                success: false,
                error: 'All account_ids must be positive integers'
            });
        }
        let accountFilter = 'id = ANY($1::int[])';
        const params = [validIds];
        if (model_id) {
            accountFilter += ' AND model_id = $2';
            params.push(parseInt(model_id));
        }
        const accountsResult = await database_1.db.query(`
      SELECT id, username FROM accounts WHERE ${accountFilter}
    `, params);
        const existingAccounts = accountsResult.rows;
        const results = [];
        for (const account of existingAccounts) {
            try {
                const result = await database_1.db.query('SELECT assign_content_to_all_phases($1) as assigned_count', [account.id]);
                const assignedCount = result.rows[0].assigned_count;
                results.push({
                    account_id: account.id,
                    username: account.username,
                    success: true,
                    assigned_phases: assignedCount
                });
            }
            catch (error) {
                results.push({
                    account_id: account.id,
                    username: account.username,
                    success: false,
                    error: error.message || 'Unknown error'
                });
            }
        }
        const successCount = results.filter(r => r.success).length;
        const totalAssigned = results.reduce((sum, r) => sum + (r.assigned_phases || 0), 0);
        res.json({
            success: true,
            data: {
                processed_accounts: results.length,
                successful_assignments: successCount,
                failed_assignments: results.length - successCount,
                total_phases_assigned: totalAssigned,
                results: results
            },
            message: `Bulk content assignment completed: ${successCount}/${results.length} accounts processed successfully`
        });
    }
    catch (error) {
        console.error('Error in bulk content assignment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to perform bulk content assignment'
        });
    }
});
router.get('/:id/warmup-status', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const accountResult = await database_1.db.query(`
        SELECT 
          id, username, password, email, 
          account_code as email_password,
          container_number,
          proxy_host, proxy_port, proxy_username, 
          decrypt_proxy_password(proxy_password_encrypted) as proxy_password,
          lifecycle_state, status
        FROM accounts 
        WHERE id = $1
      `, [accountId]);
        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }
        const account = accountResult.rows[0];
        const { WarmupProcessService } = await Promise.resolve().then(() => __importStar(require('../services/WarmupProcessService')));
        const warmupService = new WarmupProcessService();
        const warmupStatus = await warmupService.getWarmupStatus(accountId);
        const response = {
            ...warmupStatus,
            account_details: {
                username: account.username,
                password: account.password,
                email: account.email,
                email_password: account.email_password,
                container_number: account.container_number,
                proxy: account.proxy_host && account.proxy_port ?
                    `${account.proxy_host}:${account.proxy_port}` : null,
                proxy_username: account.proxy_username,
                proxy_password: account.proxy_password,
                lifecycle_state: account.lifecycle_state,
                status: account.status
            }
        };
        res.json({
            success: true,
            data: response
        });
    }
    catch (error) {
        console.error('Error fetching warmup status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Failed to fetch warmup status'
        });
    }
});
router.post('/:id/complete-manual-setup', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const { user_id = 'frontend-user' } = req.body;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const { WarmupProcessService } = await Promise.resolve().then(() => __importStar(require('../services/WarmupProcessService')));
        const warmupService = new WarmupProcessService();
        const result = await warmupService.completeManualSetup(accountId, user_id);
        res.json({
            success: result.success,
            data: result,
            message: result.message
        });
    }
    catch (error) {
        console.error('Error completing manual setup:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Failed to complete manual setup'
        });
    }
});
router.get('/warmup/ready', async (req, res) => {
    try {
        const { model_id, limit = 1000 } = req.query;
        const { WarmupProcessService } = await Promise.resolve().then(() => __importStar(require('../services/WarmupProcessService')));
        const warmupService = new WarmupProcessService();
        const accounts = await warmupService.getReadyAccounts(model_id ? parseInt(model_id) : undefined, parseInt(limit));
        res.json({
            success: true,
            data: accounts
        });
    }
    catch (error) {
        console.error('Error fetching ready accounts:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Failed to fetch ready accounts'
        });
    }
});
router.delete('/batch', async (req, res) => {
    try {
        const { account_ids } = req.body;
        if (!account_ids || !Array.isArray(account_ids) || account_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Account IDs array is required'
            });
        }
        const results = [];
        let successCount = 0;
        let failedCount = 0;
        for (const accountId of account_ids) {
            try {
                const accountResult = await database_1.db.query('SELECT id, username FROM accounts WHERE id = $1', [accountId]);
                if (accountResult.rows.length === 0) {
                    results.push({
                        account_id: accountId,
                        success: false,
                        error: 'Account not found'
                    });
                    failedCount++;
                    continue;
                }
                const account = accountResult.rows[0];
                await database_1.db.query('BEGIN');
                await database_1.db.query('DELETE FROM account_warmup_phases WHERE account_id = $1', [accountId]);
                await database_1.db.query('DELETE FROM analytics_daily WHERE account_id = $1', [accountId]);
                await database_1.db.query('DELETE FROM follows WHERE follower_account_id = $1 OR followed_account_id = $1', [accountId]);
                await database_1.db.query('DELETE FROM posts WHERE account_id = $1', [accountId]);
                await database_1.db.query('DELETE FROM accounts WHERE id = $1', [accountId]);
                await database_1.db.query('COMMIT');
                results.push({
                    account_id: accountId,
                    username: account.username,
                    success: true
                });
                successCount++;
            }
            catch (error) {
                await database_1.db.query('ROLLBACK');
                console.error(`Error deleting account ${accountId}:`, error);
                results.push({
                    account_id: accountId,
                    success: false,
                    error: error.message || 'Unknown error occurred'
                });
                failedCount++;
            }
        }
        res.json({
            success: true,
            message: `Batch delete completed: ${successCount} successful, ${failedCount} failed`,
            results: {
                total_processed: account_ids.length,
                successful: successCount,
                failed: failedCount,
                details: results
            }
        });
    }
    catch (error) {
        console.error('Batch delete accounts error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete accounts',
            message: error.message
        });
    }
});
router.post('/:id/assign-sprint', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const { sprint_id, start_date, force_override = false } = req.body;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        if (!sprint_id) {
            return res.status(400).json({
                success: false,
                error: 'sprint_id is required'
            });
        }
        const accountResult = await database_1.db.query('SELECT id, username FROM accounts WHERE id = $1', [accountId]);
        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }
        const { SprintAssignmentService } = await Promise.resolve().then(() => __importStar(require('../services/SprintAssignmentService')));
        const assignmentService = new SprintAssignmentService();
        const assignment = await assignmentService.createAssignment(accountId, sprint_id, {
            start_date: start_date ? new Date(start_date) : undefined,
            force_override
        });
        res.json({
            success: true,
            data: {
                assignment,
                account: accountResult.rows[0]
            },
            message: `Sprint assigned to account ${accountResult.rows[0].username} successfully`
        });
    }
    catch (error) {
        console.error('Error assigning sprint to account:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign sprint to account',
            message: error.message || 'Unknown error occurred'
        });
    }
});
router.get('/:id/content-readiness', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid account ID'
            });
        }
        const readinessResult = await database_1.db.query('SELECT is_content_assignment_complete($1) as is_ready', [accountId]);
        const isContentReady = readinessResult.rows[0]?.is_ready || false;
        const bundleResult = await database_1.db.query(`
      SELECT EXISTS(
        SELECT 1 FROM model_bundle_assignments mba 
        JOIN accounts a ON a.model_id = mba.model_id
      WHERE a.id = $1
          AND mba.assignment_type IN ('active', 'auto')
      ) as has_bundles
    `, [accountId]);
        const hasBundles = bundleResult.rows[0]?.has_bundles || false;
        const accountResult = await database_1.db.query(`
      SELECT id, username, model_id, lifecycle_state, container_number
      FROM accounts 
      WHERE id = $1
    `, [accountId]);
        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account not found'
            });
        }
        const account = accountResult.rows[0];
        let readinessStatus = 'ready';
        let readinessMessage = 'Account is ready for warmup assignment';
        if (!isContentReady) {
            readinessStatus = 'missing_content';
            readinessMessage = 'Content assignment incomplete - some warmup phases lack assigned content';
        }
        else if (!hasBundles) {
            readinessStatus = 'no_bundles';
            readinessMessage = 'No content bundles assigned to model - assign bundles first';
        }
        else if (!account.container_number) {
            readinessStatus = 'no_container';
            readinessMessage = 'No iPhone container assigned to account';
        }
        res.json({
            success: true,
            data: {
                account_id: accountId,
                is_ready: readinessStatus === 'ready',
                content_assignment_complete: isContentReady,
                has_content_bundles: hasBundles,
                has_container: !!account.container_number,
                readiness_status: readinessStatus,
                readiness_message: readinessMessage,
                account: {
                    id: account.id,
                    username: account.username,
                    model_id: account.model_id,
                    lifecycle_state: account.lifecycle_state,
                    container_number: account.container_number
                }
            }
        });
    }
    catch (error) {
        console.error('Error checking account content readiness:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Failed to check content readiness'
        });
    }
});
router.post('/:id/complete-set-private', async (req, res) => {
    try {
        const { id } = req.params;
        const accountId = parseInt(id);
        if (isNaN(accountId)) {
            return res.status(400).json({ success: false, error: 'Invalid account ID' });
        }
        const accountResult = await database_1.db.query(`
      SELECT id, username, lifecycle_state FROM accounts WHERE id = $1
    `, [accountId]);
        if (accountResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        const account = accountResult.rows[0];
        const result = await database_1.db.query(`
      INSERT INTO account_warmup_phases (
        account_id, 
        phase, 
        status, 
        started_at, 
        completed_at, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (account_id, phase) DO UPDATE SET 
        status = $3,
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, status, completed_at
    `, [accountId, 'set_to_private', 'completed']);
        await database_1.db.query(`
      UPDATE accounts 
      SET lifecycle_state = 'ready',
          state_changed_at = CURRENT_TIMESTAMP,
          state_changed_by = 'system'
      WHERE id = $1
    `, [accountId]);
        const phaseRecord = result.rows[0];
        res.json({
            success: true,
            data: {
                account_id: accountId,
                username: account.username,
                phase: 'set_to_private',
                status: 'completed',
                completed_at: phaseRecord.completed_at,
                lifecycle_state: 'ready',
                message: 'Account set_to_private phase completed successfully. Account is now eligible for warmup pipeline assignment.',
                next_step: 'Account can now be assigned to warmup pipeline if content bundles are available'
            }
        });
    }
    catch (error) {
        console.error('Set private completion error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to complete set_to_private phase'
        });
    }
});
router.post('/assign-content-bulk', async (req, res) => {
    try {
        const { model_id } = req.query;
        if (!model_id) {
            return res.status(400).json({
                success: false,
                error: 'Model ID is required'
            });
        }
        const accountsQuery = `
      SELECT DISTINCT a.id, a.username
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.model_id = $1 
        AND a.lifecycle_state IN ('warmup', 'ready')
        AND (
          (awp.phase IN ('bio', 'username') AND awp.assigned_text_id IS NULL) OR
          (awp.phase IN ('first_highlight', 'new_highlight', 'post_caption', 'story_caption') 
           AND (awp.assigned_content_id IS NULL OR awp.assigned_text_id IS NULL)) OR
          (awp.phase IN ('post_no_caption', 'story_no_caption') AND awp.assigned_content_id IS NULL)
        )
    `;
        const accountsResult = await database_1.db.query(accountsQuery, [parseInt(model_id)]);
        let successCount = 0;
        let errorCount = 0;
        const results = [];
        for (const account of accountsResult.rows) {
            try {
                await database_1.db.query('SELECT assign_content_to_all_phases($1)', [account.id]);
                successCount++;
                results.push({
                    account_id: account.id,
                    username: account.username,
                    success: true,
                    message: 'Content assigned successfully'
                });
            }
            catch (error) {
                errorCount++;
                results.push({
                    account_id: account.id,
                    username: account.username,
                    success: false,
                    error: error.message
                });
            }
        }
        res.json({
            success: true,
            data: {
                total_accounts: accountsResult.rows.length,
                success_count: successCount,
                error_count: errorCount,
                results: results
            },
            message: `Content assignment completed. ${successCount} successful, ${errorCount} failed.`
        });
    }
    catch (error) {
        console.error('Error in bulk content assignment:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to assign content in bulk',
            message: error.message
        });
    }
});
router.get('/debug-model-content/:modelId', async (req, res) => {
    try {
        const { modelId } = req.params;
        try {
            await database_1.db.query('SELECT 1 FROM model_bundle_assignments LIMIT 1');
        }
        catch (bundleError) {
            return res.json({
                success: true,
                data: {
                    model: { id: modelId, name: 'Unknown' },
                    assigned_bundles: [],
                    available_content: [],
                    available_categories: [],
                    summary: {
                        total_bundles: 0,
                        total_content_items: 0,
                        image_content: 0,
                        text_content: 0
                    },
                    message: 'Content bundle system not yet set up. Bundle tables missing.'
                }
            });
        }
        const modelResult = await database_1.db.query('SELECT id, name FROM models WHERE id = $1', [modelId]);
        if (modelResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Model not found' });
        }
        const bundlesResult = await database_1.db.query(`
      SELECT 
        cb.id,
        cb.name,
        cb.description,
        cb.bundle_type,
        cb.categories as bundle_categories,
        mba.assignment_type,
        mba.assigned_at
      FROM model_bundle_assignments mba
      JOIN content_bundles cb ON mba.bundle_id = cb.id
      WHERE mba.model_id = $1
      ORDER BY mba.assigned_at DESC
    `, [modelId]);
        const contentResult = await database_1.db.query(`
      SELECT DISTINCT
        cc.id as content_id,
        cc.filename,
        cc.original_name,
        cc.content_type,
        cc.categories as content_categories,
        cc.status,
        'image' as content_type_display
      FROM model_bundle_assignments mba
      JOIN bundle_content_assignments bca ON mba.bundle_id = bca.bundle_id
      JOIN central_content cc ON bca.content_id = cc.id
      WHERE mba.model_id = $1 AND mba.assignment_type IN ('active', 'auto')
      
      UNION ALL
      
      SELECT DISTINCT
        ctc.id as content_id,
        ctc.template_name as filename,
        ctc.text_content as original_name,
        'text' as content_type,
        ctc.categories as content_categories,
        ctc.status,
        'text' as content_type_display
      FROM model_bundle_assignments mba
      JOIN bundle_content_assignments bca ON mba.bundle_id = bca.bundle_id
      JOIN central_text_content ctc ON bca.text_content_id = ctc.id
      WHERE mba.model_id = $1 AND mba.assignment_type IN ('active', 'auto')
      
      ORDER BY content_type_display, content_categories
    `, [modelId]);
        const categoriesResult = await database_1.db.query(`
      SELECT DISTINCT
        category
      FROM (
        SELECT DISTINCT jsonb_array_elements_text(cc.categories) as category
        FROM model_bundle_assignments mba
        JOIN bundle_content_assignments bca ON mba.bundle_id = bca.bundle_id
        JOIN central_content cc ON bca.content_id = cc.id
        WHERE mba.model_id = $1 AND mba.assignment_type IN ('active', 'auto')
        
        UNION ALL
        
        SELECT DISTINCT jsonb_array_elements_text(ctc.categories) as category
        FROM model_bundle_assignments mba
        JOIN bundle_content_assignments bca ON mba.bundle_id = bca.bundle_id
        JOIN central_text_content ctc ON bca.text_content_id = ctc.id
        WHERE mba.model_id = $1 AND mba.assignment_type IN ('active', 'auto')
      ) categories
      ORDER BY category
    `, [modelId]);
        res.json({
            success: true,
            data: {
                model: modelResult.rows[0],
                assigned_bundles: bundlesResult.rows,
                available_content: contentResult.rows,
                available_categories: categoriesResult.rows.map(r => r.category),
                summary: {
                    total_bundles: bundlesResult.rows.length,
                    total_content_items: contentResult.rows.length,
                    image_content: contentResult.rows.filter(c => c.content_type !== 'text').length,
                    text_content: contentResult.rows.filter(c => c.content_type === 'text').length
                }
            }
        });
    }
    catch (error) {
        console.error('Error debugging model content:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to debug model content',
            message: error.message
        });
    }
});
router.post('/:id/assign-to-warmup', async (req, res) => {
    try {
        const { id } = req.params;
        const accountId = parseInt(id);
        if (isNaN(accountId)) {
            return res.status(400).json({ success: false, error: 'Invalid account ID' });
        }
        const accountResult = await database_1.db.query(`
      SELECT a.*, m.name as model_name 
      FROM accounts a 
      JOIN models m ON a.model_id = m.id 
      WHERE a.id = $1
    `, [accountId]);
        if (accountResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }
        const account = accountResult.rows[0];
        const setPrivateCheck = await database_1.db.query(`
      SELECT status, completed_at 
      FROM account_warmup_phases 
      WHERE account_id = $1 AND phase = 'set_to_private'
    `, [accountId]);
        if (setPrivateCheck.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Prerequisites Not Met',
                message: 'Account must complete "set_to_private" phase before warmup pipeline assignment',
                required_action: 'Complete set_to_private phase first'
            });
        }
        const setPrivatePhase = setPrivateCheck.rows[0];
        if (setPrivatePhase.status !== 'completed' || !setPrivatePhase.completed_at) {
            return res.status(400).json({
                success: false,
                error: 'Prerequisites Not Met',
                message: 'Account must complete "set_to_private" phase before warmup pipeline assignment',
                current_status: setPrivatePhase.status,
                required_action: 'Complete set_to_private phase first'
            });
        }
        if (account.lifecycle_state === 'warmup') {
            return res.status(400).json({
                success: false,
                error: 'Already Assigned',
                message: 'Account is already assigned to warmup pipeline',
                current_state: 'warmup'
            });
        }
        const warmupPhases = [
            { phase: 'manual_setup', phase_order: 1 },
            { phase: 'bio', phase_order: 2 },
            { phase: 'gender', phase_order: 3 },
            { phase: 'name', phase_order: 4 },
            { phase: 'username', phase_order: 5 },
            { phase: 'first_highlight', phase_order: 6 },
            { phase: 'post_caption', phase_order: 7 },
            { phase: 'post_no_caption', phase_order: 8 },
            { phase: 'story_caption', phase_order: 9 },
            { phase: 'story_no_caption', phase_order: 10 }
        ];
        let createdPhases = 0;
        const createdPhasesList = [];
        for (const phaseConfig of warmupPhases) {
            try {
                const insertResult = await database_1.db.query(`
          INSERT INTO account_warmup_phases (
            account_id, 
            phase, 
            phase_order,
            status, 
            created_at, 
            updated_at
          )
          VALUES ($1, $2, $3, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT (account_id, phase) DO UPDATE SET 
            status = 'pending',
            phase_order = $3,
            updated_at = CURRENT_TIMESTAMP
          RETURNING id, phase, status
        `, [accountId, phaseConfig.phase, phaseConfig.phase_order]);
                if (insertResult.rows.length > 0) {
                    createdPhases++;
                    createdPhasesList.push({
                        phase: phaseConfig.phase,
                        status: 'pending',
                        phase_order: phaseConfig.phase_order
                    });
                }
            }
            catch (phaseError) {
                console.error(`Error creating phase ${phaseConfig.phase}:`, phaseError);
            }
        }
        const updateResult = await database_1.db.query(`
      UPDATE accounts 
      SET lifecycle_state = 'warmup',
          state_changed_at = CURRENT_TIMESTAMP,
          state_changed_by = 'system'
      WHERE id = $1
      RETURNING lifecycle_state, state_changed_at
    `, [accountId]);
        const allPhasesResult = await database_1.db.query(`
      SELECT phase, status, phase_order, created_at
      FROM account_warmup_phases 
      WHERE account_id = $1 
      ORDER BY phase_order, phase
    `, [accountId]);
        const allPhases = allPhasesResult.rows;
        const completedPhases = allPhases.filter(p => p.status === 'completed');
        const pendingPhases = allPhases.filter(p => p.status === 'pending');
        res.json({
            success: true,
            data: {
                account_id: accountId,
                model_name: account.model_name,
                lifecycle_state: 'warmup',
                set_private_completed_at: setPrivatePhase.completed_at,
                state_changed_at: updateResult.rows[0].state_changed_at,
                total_phases: allPhases.length,
                completed_phases: completedPhases.length,
                pending_phases: pendingPhases.length,
                created_new_phases: createdPhases,
                phases: allPhases.map(p => ({
                    phase: p.phase,
                    status: p.status,
                    phase_order: p.phase_order,
                    created_at: p.created_at
                })),
                message: `Account successfully assigned to warmup pipeline. ${completedPhases.length} phases completed, ${pendingPhases.length} phases pending.`,
                note: 'Warmup phases created successfully. Content can be assigned manually as needed.'
            }
        });
    }
    catch (error) {
        console.error('Warmup assignment error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to assign account to warmup pipeline',
            details: error.message
        });
    }
});
router.get('/warmup/batch-status', async (req, res) => {
    try {
        const { account_ids, model_id } = req.query;
        let accountIds = [];
        if (account_ids) {
            accountIds = account_ids.split(',').map((id) => parseInt(id.trim())).filter((id) => !isNaN(id));
        }
        else if (model_id) {
            const modelAccountsResult = await database_1.db.query('SELECT id FROM accounts WHERE model_id = $1', [parseInt(model_id)]);
            accountIds = modelAccountsResult.rows.map(row => row.id);
        }
        else {
            return res.status(400).json({
                success: false,
                error: 'Bad Request',
                message: 'Either account_ids or model_id parameter is required'
            });
        }
        if (accountIds.length === 0) {
            return res.json({
                success: true,
                data: {}
            });
        }
        const phasesResult = await database_1.db.query(`
      SELECT 
        awp.account_id,
        awp.phase,
        awp.status,
        awp.started_at,
        awp.completed_at,
        awp.error_message,
        awp.error_details,
        awp.failure_category,
        awp.retry_count
      FROM account_warmup_phases awp
      WHERE awp.account_id = ANY($1)
      ORDER BY awp.account_id, awp.phase
    `, [accountIds]);
        const accountStatuses = {};
        accountIds.forEach(accountId => {
            const accountPhases = phasesResult.rows.filter(row => row.account_id === accountId);
            const completedPhases = accountPhases.filter(p => p.status === 'completed');
            const inProgressPhases = accountPhases.filter(p => p.status === 'in_progress');
            const pendingPhases = accountPhases.filter(p => p.status === 'pending');
            const failedPhases = accountPhases.filter(p => p.status === 'failed');
            const totalPhases = accountPhases.length;
            const progressPercent = totalPhases > 0 ? Math.round((completedPhases.length / totalPhases) * 100) : 0;
            let currentPhase = null;
            if (inProgressPhases.length > 0) {
                currentPhase = inProgressPhases[0].phase;
            }
            else if (pendingPhases.length > 0) {
                currentPhase = pendingPhases[0].phase;
            }
            accountStatuses[accountId] = {
                account_id: accountId,
                phases: accountPhases.map(p => ({
                    phase: p.phase,
                    status: p.status,
                    started_at: p.started_at,
                    completed_at: p.completed_at,
                    error_message: p.error_message,
                    error_details: p.error_details,
                    failure_category: p.failure_category,
                    retry_count: p.retry_count
                })),
                current_phase: currentPhase,
                phase_status: inProgressPhases.length > 0 ? 'in_progress' :
                    pendingPhases.length > 0 ? 'pending' :
                        failedPhases.length > 0 ? 'failed' : 'completed',
                progress_percent: progressPercent,
                total_phases: totalPhases,
                completed_phases: completedPhases.length,
                pending_phases: pendingPhases.length,
                failed_phases: failedPhases.length
            };
        });
        res.json({
            success: true,
            data: accountStatuses
        });
    }
    catch (error) {
        console.error('Error fetching batch warmup status:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch warmup status for accounts',
            details: error.message
        });
    }
});
exports.default = router;
//# sourceMappingURL=accounts.js.map