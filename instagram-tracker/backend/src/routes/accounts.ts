import express from 'express';
import { db } from '../database';
import lifecycleRouter from './accounts/lifecycle';

const router = express.Router();

// Mount lifecycle routes
router.use('/lifecycle', lifecycleRouter);

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
      whereConditions.push(`a.proxy_status = $${paramIndex}`);
      params.push(proxy_status);
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

// Get single account with full details
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        a.*,
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

    // Insert account with all fields
    const insertQuery = `
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
      ) RETURNING *
    `;

    const result = await db.query(insertQuery, [
      model_id, username, password, email, account_code, display_name, bio,
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

export default router;