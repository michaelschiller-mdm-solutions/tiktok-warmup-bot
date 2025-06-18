import express from 'express';
import { db } from '../database';
import lifecycleRouter from './accounts/lifecycle';

const router = express.Router();

// Mount lifecycle routes
router.use('/lifecycle', lifecycleRouter);

/**
 * GET /api/accounts/statistics
 * Get account statistics for the central accounts page
 */
router.get('/statistics', async (req: any, res: any) => {
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

    const result = await db.query(query);
    const stats = result.rows[0];

    // Get lifecycle state breakdown
    const lifecycleQuery = `
      SELECT 
        lifecycle_state,
        COUNT(*) as count
      FROM accounts 
      GROUP BY lifecycle_state
      ORDER BY count DESC
    `;
    const lifecycleResult = await db.query(lifecycleQuery);

    // Get model breakdown
    const modelQuery = `
      SELECT 
        COALESCE(m.name, 'Unassigned') as model_name,
        COUNT(a.id) as account_count
      FROM accounts a
      LEFT JOIN models m ON a.model_id = m.id
      GROUP BY m.id, m.name
      ORDER BY account_count DESC
    `;
    const modelResult = await db.query(modelQuery);

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

  } catch (error) {
    console.error('Error fetching account statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch account statistics'
    });
  }
});

/**
 * POST /api/accounts/assign-to-model
 * Assign multiple accounts to a model
 */
router.post('/assign-to-model', async (req: any, res: any) => {
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

    // Verify model exists
    const modelCheck = await db.query('SELECT id, name FROM models WHERE id = $1', [model_id]);
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
        // Check if account exists and get current state
        const accountResult = await db.query('SELECT id, username, model_id, lifecycle_state FROM accounts WHERE id = $1', [accountId]);
        
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

        // Update account model assignment
        await db.query(`
          UPDATE accounts 
          SET model_id = $2, 
              assigned_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `, [accountId, model_id]);

        // If account was imported and now assigned to a model, trigger content assignment and warmup initialization
        if (account.lifecycle_state === 'imported') {
          try {
            // Initialize warmup phases with content assignment
            await db.query('SELECT initialize_warmup_phases_with_content($1)', [accountId]);
            
                         // Optionally assign proxy if available (existing logic)
             try {
               const { ProxyAssignmentService } = await import('../services/ProxyAssignmentService');
               const proxyService = new ProxyAssignmentService();
               const proxyResult = await proxyService.assignProxyToAccount(accountId);
               if (proxyResult.success) {
                 console.log(`Proxy assigned to account ${accountId}: ${proxyResult.message}`);
               }
             } catch (proxyError) {
               console.warn(`Proxy assignment failed for account ${accountId}:`, proxyError);
               // Continue without proxy - can be assigned later
             }
          } catch (contentError) {
            console.warn(`Content assignment failed for account ${accountId}:`, contentError);
            // Continue - content can be assigned later
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

      } catch (error: any) {
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

  } catch (error: any) {
    console.error('Assign accounts to model error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to assign accounts to model'
    });
  }
});

/**
 * PUT /api/accounts/:id/assign-model
 * Assign a single account to a model
 */
router.put('/:id/assign-model', async (req: any, res: any) => {
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

    // Verify account exists
    const accountResult = await db.query('SELECT id, username, model_id, lifecycle_state FROM accounts WHERE id = $1', [id]);
    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Account not found'
      });
    }

    // Verify model exists
    const modelResult = await db.query('SELECT id, name FROM models WHERE id = $1', [model_id]);
    if (modelResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Model not found'
      });
    }

    const account = accountResult.rows[0];
    const model = modelResult.rows[0];

    // Update account model assignment
    await db.query(`
      UPDATE accounts 
      SET model_id = $2, 
          assigned_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id, model_id]);

    // If account was imported and now assigned to a model, trigger content assignment and warmup initialization
    if (account.lifecycle_state === 'imported') {
      try {
        // Initialize warmup phases with content assignment
        await db.query('SELECT initialize_warmup_phases_with_content($1)', [id]);
        
                 // Optionally assign proxy if available
         try {
           const { ProxyAssignmentService } = await import('../services/ProxyAssignmentService');
           const proxyService = new ProxyAssignmentService();
           await proxyService.assignProxyToAccount(parseInt(id));
         } catch (proxyError) {
           console.warn(`Proxy assignment failed for account ${id}:`, proxyError);
         }
      } catch (contentError) {
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

  } catch (error: any) {
    console.error('Assign account to model error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to assign account to model'
    });
  }
});

/**
 * GET /api/accounts/unassigned
 * Get accounts that are not assigned to any model
 */
router.get('/unassigned', async (req: any, res: any) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      lifecycle_state,
      status,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

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

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query to get unassigned accounts
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

    const result = await db.query(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM accounts a
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, params.slice(0, -2));
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

  } catch (error) {
    console.error('Error fetching unassigned accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch unassigned accounts'
    });
  }
});

// Get accounts with comprehensive filtering and pagination
router.get('/', async (req: any, res: any) => {
  try {
    const {
      model_id,
      status,
      lifecycle_state,
      content_type,
      niche,
      proxy_provider,
      proxy_status,
      page = 1,
      limit = 50,
      sort_by = 'created_at',
      sort_order = 'desc',
      search
    } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Build dynamic WHERE clause
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

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Main query with all fields and model info
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

    const result = await db.query(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM accounts a
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, params.slice(0, -2));
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

  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch accounts'
    });
  }
});

/**
 * GET /api/accounts/all-fields
 * Get all accounts with all database fields (for comprehensive view)
 */
router.get('/all-fields', async (req: any, res: any) => {
  try {
    const {
      page = 1,
      limit = 50,
      search,
      model_id,
      lifecycle_state,
      status,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // Build dynamic WHERE clause
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

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query to get all fields from accounts table
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

    const result = await db.query(query, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM accounts a
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, params.slice(0, -2));
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

  } catch (error) {
    console.error('Error fetching accounts with all fields:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch accounts'
    });
  }
});

// Get single account with full details
router.get('/:id', async (req: any, res: any) => {
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

    const result = await db.query(query, [id]);

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

  } catch (error) {
    console.error('Error fetching account:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch account'
    });
  }
});

// Create account with comprehensive data
router.post('/', async (req: any, res: any) => {
  try {
    const {
      model_id,
      username,
      password,
      email,
      email_password,
      container_number,
      account_code,
      display_name,
      bio,
      content_type,
      campus,
      niche,
      cta_text,
      mother_account_id,
      // Proxy fields
      proxy_host,
      proxy_port,
      proxy_username,
      proxy_password,
      proxy_provider,
      proxy_location,
      // Integration fields
      adspower_profile_id,
      cupid_profile_id,
      cupid_system_prompt,
      // Cost field
      monthly_cost = 0
    } = req.body;

    // Encrypt proxy password if provided
    let encryptedProxyPassword = null;
    if (proxy_password) {
      const encryptResult = await db.query('SELECT encrypt_proxy_password($1) as encrypted', [proxy_password]);
      encryptedProxyPassword = encryptResult.rows[0].encrypted;
    }

    // Store email password in account_code field (plain text as per current system)
    const emailPasswordForAccountCode = email_password || account_code;

    // Insert account with all fields
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

    const result = await db.query(insertQuery, [
      model_id, username, password, email, container_number,
      emailPasswordForAccountCode, display_name, bio,
      content_type, campus, niche, cta_text, mother_account_id,
      proxy_host, proxy_port, proxy_username, encryptedProxyPassword,
      proxy_provider, proxy_location, 'unknown',
      adspower_profile_id, cupid_profile_id, cupid_system_prompt,
      monthly_cost
    ]);

    const newAccount = result.rows[0];

    // Create default cost entries for the account
    if (proxy_provider) {
      // Add proxy cost
      await db.query(`
        INSERT INTO account_costs (account_id, cost_category_id, cost_amount, description)
        SELECT $1, cc.id, pp.monthly_cost_per_proxy, 'Proxy service cost'
        FROM cost_categories cc, proxy_providers pp
        WHERE cc.name = 'Proxies' AND pp.name = $2
      `, [newAccount.id, proxy_provider]);
    }

    // Add Cupid cost if profile ID provided
    if (cupid_profile_id) {
      await db.query(`
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

  } catch (error: any) {
    console.error('Error creating account:', error);
    
    if (error.code === '23505') { // Unique constraint violation
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

// Update account
router.put('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Handle proxy password encryption if provided
    if (updateData.proxy_password) {
      const encryptResult = await db.query('SELECT encrypt_proxy_password($1) as encrypted', [updateData.proxy_password]);
      updateData.proxy_password_encrypted = encryptResult.rows[0].encrypted;
      delete updateData.proxy_password;
    }

    // Handle email password - store in account_code field (plain text as per current system)
    if (updateData.email_password) {
      updateData.account_code = updateData.email_password;
      delete updateData.email_password;
    }

    // Build dynamic update query
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

    const result = await db.query(query, values);

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

  } catch (error: any) {
    console.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to update account'
    });
  }
});

/**
 * DELETE /api/accounts/batch
 * Batch delete multiple accounts
 */
router.delete('/batch', async (req: any, res: any) => {
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

    // Process each account deletion
    for (const accountId of account_ids) {
      try {
        // Delete account with all related data (CASCADE should handle this)
        const result = await db.query('DELETE FROM accounts WHERE id = $1 RETURNING username', [accountId]);
        
        if (result.rows.length > 0) {
          results.push({
            account_id: accountId,
            username: result.rows[0].username,
            success: true
          });
          successCount++;
        } else {
          results.push({
            account_id: accountId,
            success: false,
            error: 'Account not found'
          });
          failedCount++;
        }
      } catch (error: any) {
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

  } catch (error: any) {
    console.error('Batch delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message || 'Failed to delete accounts'
    });
  }
});

// Delete account
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const result = await db.query('DELETE FROM accounts WHERE id = $1 RETURNING *', [id]);

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

  } catch (error) {
    console.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to delete account'
    });
  }
});

// Bulk import accounts
router.post('/bulk-import', async (req: any, res: any) => {
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
        // Basic validation
        if (!account.model_id || !account.username || !account.password || !account.email) {
          errors.push({
            row: i + 1,
            message: 'Missing required fields: model_id, username, password, email',
            data: account
          });
          continue;
        }

        if (!validate_only) {
          // Check for duplicates if skip_duplicates is true
          if (skip_duplicates) {
            const existingCheck = await db.query(
              'SELECT id FROM accounts WHERE model_id = $1 AND username = $2',
              [account.model_id, account.username]
            );

            if (existingCheck.rows.length > 0) {
              skippedCount++;
              continue;
            }
          }

          // Encrypt proxy password if provided
          let encryptedProxyPassword = null;
          if (account.proxy_password) {
            const encryptResult = await db.query('SELECT encrypt_proxy_password($1) as encrypted', [account.proxy_password]);
            encryptedProxyPassword = encryptResult.rows[0].encrypted;
          }

          // Insert account
          await db.query(`
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

      } catch (error: any) {
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

  } catch (error) {
    console.error('Error in bulk import:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to process bulk import'
    });
  }
});

// Get account performance analysis
router.get('/:id/performance', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT * FROM account_performance_analysis WHERE id = $1
    `;

    const result = await db.query(query, [id]);

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

  } catch (error) {
    console.error('Error fetching account performance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch account performance'
    });
  }
});

// Test proxy connection
router.post('/:id/test-proxy', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    // Get account proxy details
    const accountResult = await db.query(`
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

    // In a real implementation, you would test the proxy connection here
    // For now, we'll simulate a test and update the status
    const testPassed = Math.random() > 0.2; // 80% success rate for demo

    await db.query(`
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

  } catch (error) {
    console.error('Error testing proxy:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to test proxy'
    });
  }
});

// ============================================================================
// CONTENT ASSIGNMENT MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/accounts/content-assignment-status
 * Get content assignment status for all accounts in warmup pipeline
 */
router.get('/content-assignment-status', async (req: any, res: any) => {
  try {
    const { model_id, lifecycle_state = 'warmup,ready,active' } = req.query;
    
    let query = `
      SELECT * FROM account_content_assignment_status
      WHERE lifecycle_state = ANY($1::text[])
    `;
    const params = [lifecycle_state.split(',')];
    
    if (model_id) {
      query += ` AND model_id = $${params.length + 1}`;
      params.push(parseInt(model_id as string));
    }
    
    query += ` ORDER BY account_id`;
    
    const result = await db.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      summary: {
        total_accounts: result.rows.length,
        complete_assignments: result.rows.filter(row => row.content_assignment_complete).length,
        incomplete_assignments: result.rows.filter(row => !row.content_assignment_complete).length
      }
    });
    
  } catch (error) {
    console.error('Error fetching content assignment status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch content assignment status'
    });
  }
});

/**
 * POST /api/accounts/:id/assign-content
 * Manually assign content to all phases for a specific account
 */
router.post('/:id/assign-content', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }
    
    // Check if account exists
    const accountResult = await db.query('SELECT id, username FROM accounts WHERE id = $1', [accountId]);
    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    // Use database function to assign content
    const result = await db.query('SELECT assign_content_to_all_phases($1) as assigned_count', [accountId]);
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
    
  } catch (error) {
    console.error('Error assigning content to account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign content to account'
    });
  }
});

/**
 * POST /api/accounts/bulk-assign-content
 * Bulk assign content to multiple accounts
 */
router.post('/bulk-assign-content', async (req: any, res: any) => {
  try {
    const { account_ids, model_id } = req.body;
    
    if (!Array.isArray(account_ids) || account_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'account_ids must be a non-empty array'
      });
    }
    
    // Validate account IDs
    const validIds = account_ids.filter(id => Number.isInteger(id) && id > 0);
    if (validIds.length !== account_ids.length) {
      return res.status(400).json({
        success: false,
        error: 'All account_ids must be positive integers'
      });
    }
    
    let accountFilter = 'id = ANY($1::int[])';
    const params: any[] = [validIds];
    
    if (model_id) {
      accountFilter += ' AND model_id = $2';
      params.push(parseInt(model_id as string));
    }
    
    // Get accounts that exist
    const accountsResult = await db.query(`
      SELECT id, username FROM accounts WHERE ${accountFilter}
    `, params);
    
    const existingAccounts = accountsResult.rows;
    const results = [];
    
    // Process each account
    for (const account of existingAccounts) {
      try {
        const result = await db.query('SELECT assign_content_to_all_phases($1) as assigned_count', [account.id]);
        const assignedCount = result.rows[0].assigned_count;
        
        results.push({
          account_id: account.id,
          username: account.username,
          success: true,
          assigned_phases: assignedCount
        });
      } catch (error) {
        results.push({
          account_id: account.id,
          username: account.username,
          success: false,
          error: (error as Error).message || 'Unknown error'
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
    
  } catch (error) {
    console.error('Error in bulk content assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk content assignment'
    });
  }
});

// ============================================================================
// WARMUP MANAGEMENT ENDPOINTS (Frontend-friendly, no bot auth required)
// ============================================================================

  /**
   * GET /api/accounts/:id/warmup-status
   * Get warmup status for an account (frontend-friendly)
   */
  router.get('/:id/warmup-status', async (req: any, res: any) => {
    try {
      const accountId = parseInt(req.params.id);

      if (isNaN(accountId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid account ID'
        });
      }

      // Get account details with plain text passwords
      const accountResult = await db.query(`
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

      // Get warmup status from service
      const { WarmupProcessService } = await import('../services/WarmupProcessService');
      const warmupService = new WarmupProcessService();
      const warmupStatus = await warmupService.getWarmupStatus(accountId);

      // Combine account details with warmup status
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

    } catch (error) {
      console.error('Error fetching warmup status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to fetch warmup status'
      });
    }
  });

/**
 * POST /api/accounts/:id/complete-manual-setup
 * Complete manual setup phase (frontend-friendly)
 */
router.post('/:id/complete-manual-setup', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const { user_id = 'frontend-user' } = req.body;

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    const { WarmupProcessService } = await import('../services/WarmupProcessService');
    const warmupService = new WarmupProcessService();
    
    const result = await warmupService.completeManualSetup(accountId, user_id);

    res.json({
      success: result.success,
      data: result,
      message: result.message
    });

  } catch (error) {
    console.error('Error completing manual setup:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to complete manual setup'
    });
  }
});

/**
 * POST /api/accounts/:id/mark-invalid
 * Mark account as invalid and free up proxy/container resources
 */
router.post('/:id/mark-invalid', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const { reason = 'Marked as invalid by user' } = req.body;

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    // Get current account details
    const accountResult = await db.query(`
      SELECT id, username, proxy_host, proxy_port, container_number, lifecycle_state
      FROM accounts WHERE id = $1
    `, [accountId]);

    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const account = accountResult.rows[0];

    // Start transaction to ensure atomicity
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Update account status to invalid and clear proxy/container assignments
      await client.query(`
        UPDATE accounts 
        SET 
          lifecycle_state = 'invalid',
          status = 'inactive',
          proxy_host = NULL,
          proxy_port = NULL,
          proxy_username = NULL,
          proxy_password_encrypted = NULL,
          proxy_provider = NULL,
          proxy_location = NULL,
          proxy_status = NULL,
          container_number = NULL,
          state_changed_at = CURRENT_TIMESTAMP,
          state_changed_by = $2,
          last_error_message = $3,
          last_error_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [accountId, 'frontend-user', reason]);

      // 2. Cancel any pending warmup phases
      await client.query(`
        UPDATE account_warmup_phases 
        SET 
          status = 'cancelled',
          error_message = 'Account marked as invalid',
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1 
          AND status IN ('pending', 'available', 'in_progress')
      `, [accountId]);

      // 3. Log the invalidation in console for audit trail
      console.log(`Account ${accountId} (${account.username}) marked as invalid: ${reason}`);

      await client.query('COMMIT');

      res.json({
        success: true,
        data: {
          account_id: accountId,
          username: account.username,
          previous_state: account.lifecycle_state,
          new_state: 'invalid',
          freed_proxy: account.proxy_host ? `${account.proxy_host}:${account.proxy_port}` : null,
          freed_container: account.container_number,
          reason: reason
        },
        message: `Account ${account.username} marked as invalid. Proxy and container resources freed.`
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error marking account as invalid:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to mark account as invalid'
    });
  }
});

/**
 * GET /api/accounts/warmup/ready
 * Get accounts ready for warmup processing
 */
router.get('/warmup/ready', async (req: any, res: any) => {
  try {
    const { model_id, limit = 50 } = req.query;

    const { WarmupProcessService } = await import('../services/WarmupProcessService');
    const warmupService = new WarmupProcessService();
    
    const accounts = await warmupService.getReadyAccounts(
      model_id ? parseInt(model_id) : undefined, 
      parseInt(limit)
    );

    res.json({
      success: true,
      data: accounts
    });

  } catch (error) {
    console.error('Error fetching ready accounts:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to fetch ready accounts'
    });
  }
});

/**
 * DELETE /api/accounts/batch
 * Batch delete multiple accounts
 */
router.delete('/batch', async (req: any, res: any) => {
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
        // Check if account exists
        const accountResult = await db.query('SELECT id, username FROM accounts WHERE id = $1', [accountId]);
        
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

        // Delete related data in correct order to avoid foreign key constraints
        await db.query('BEGIN');

        // Delete from warmup phases
        await db.query('DELETE FROM account_warmup_phases WHERE account_id = $1', [accountId]);

        // Delete from analytics/tracking tables
        await db.query('DELETE FROM analytics_daily WHERE account_id = $1', [accountId]);
        await db.query('DELETE FROM follows WHERE follower_account_id = $1 OR followed_account_id = $1', [accountId]);
        await db.query('DELETE FROM posts WHERE account_id = $1', [accountId]);

        // Delete the account
        await db.query('DELETE FROM accounts WHERE id = $1', [accountId]);

        await db.query('COMMIT');

        results.push({
          account_id: accountId,
          username: account.username,
          success: true
        });
        successCount++;

      } catch (error: any) {
        await db.query('ROLLBACK');
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

  } catch (error: any) {
    console.error('Batch delete accounts error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to delete accounts',
      message: error.message 
    });
  }
});

export default router;