import { Router } from 'express';
import { db } from '../database';
import axios from 'axios';

const router = Router();

/**
 * GET /api/iphones
 * Get all registered iPhones with statistics
 */
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id,
        name,
        model,
        ip_address,
        port,
        status,
        last_seen,
        assigned_bot_id,
        total_containers,
        available_containers,
        assigned_containers,
        in_use_containers,
        avg_success_rate,
        total_actions_performed,
        total_error_count,
        connection_status,
        created_at,
        updated_at
      FROM iphone_management_dashboard
      ORDER BY name
    `);

    res.json({
      success: true,
      iphones: result.rows
    });
  } catch (error) {
    console.error('Error fetching iPhones:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch iPhones',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/iphones
 * Register a new iPhone device
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      model,
      ip_address,
      port = 46952,
      ssh_user = 'mobile',
      ssh_password,
      xxtouch_port = 46952,

      notes
    } = req.body;

    // Validate required fields
    if (!name || !model || !ip_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name, model, and IP address are required'
      });
    }

    // Validate model
    if (!['iphone_8', 'iphone_x'].includes(model)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model',
        message: 'Model must be either iphone_8 or iphone_x'
      });
    }

    // Encrypt SSH password if provided
    let encryptedPassword = null;
    if (ssh_password) {
      const passwordResult = await db.query(
        'SELECT encrypt_iphone_ssh_password($1) as encrypted',
        [ssh_password]
      );
      encryptedPassword = passwordResult.rows[0].encrypted;
    }

    // Insert iPhone record
    const result = await db.query(`
      INSERT INTO iphones (
        name, model, ip_address, port, ssh_user, ssh_password_encrypted,
        xxtouch_port, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, name, model, ip_address, port, status
    `, [
      name, model, ip_address, port, ssh_user, encryptedPassword,
      xxtouch_port, notes
    ]);

    const iphone = result.rows[0];

    // Note: Containers will be created later via the container creation API
    // No containers are created automatically during iPhone registration

    res.status(201).json({
      success: true,
      message: 'iPhone registered successfully - use container creation to add containers',
      iphone: {
        ...iphone,
        containers_created: 0
      }
    });
  } catch (error) {
    console.error('Error registering iPhone:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({
        success: false,
        error: 'iPhone already exists',
        message: 'An iPhone with this name or IP address already exists'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to register iPhone',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/iphones/:id
 * Get detailed information about a specific iPhone
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const iphoneResult = await db.query(`
      SELECT * FROM iphone_management_dashboard WHERE id = $1
    `, [id]);

    if (iphoneResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'iPhone not found'
      });
    }

    // Get container details
    const containersResult = await db.query(`
      SELECT 
        ic.*,
        a.username as assigned_account_username,
        a.lifecycle_state as account_lifecycle_state
      FROM iphone_containers ic
      LEFT JOIN accounts a ON ic.assigned_account_id = a.id
      WHERE ic.iphone_id = $1
      ORDER BY ic.container_number
    `, [id]);

    // Get recent action logs
    const logsResult = await db.query(`
      SELECT 
        ial.*,
        a.username as account_username
      FROM iphone_action_logs ial
      LEFT JOIN accounts a ON ial.account_id = a.id
      WHERE ial.iphone_id = $1
      ORDER BY ial.started_at DESC
      LIMIT 50
    `, [id]);

    res.json({
      success: true,
      iphone: iphoneResult.rows[0],
      containers: containersResult.rows,
      recent_logs: logsResult.rows
    });
  } catch (error) {
    console.error('Error fetching iPhone details:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch iPhone details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/iphones/:id
 * Update iPhone configuration
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      model,
      ip_address,
      port,
      ssh_user,
      ssh_password,
      xxtouch_port,
      status,
      assigned_bot_id,
      container_creation_enabled,
      automation_enabled,
      notes
    } = req.body;

    // Check if iPhone exists
    const existingResult = await db.query('SELECT id FROM iphones WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'iPhone not found'
      });
    }

    // Handle password encryption if provided
    let encryptedPassword = undefined;
    if (ssh_password !== undefined) {
      if (ssh_password) {
        const passwordResult = await db.query(
          'SELECT encrypt_iphone_ssh_password($1) as encrypted',
          [ssh_password]
        );
        encryptedPassword = passwordResult.rows[0].encrypted;
      } else {
        encryptedPassword = null;
      }
    }

    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    const fieldsToUpdate = {
      name,
      model,
      ip_address,
      port,
      ssh_user,
      xxtouch_port,
      status,
      assigned_bot_id,
      container_creation_enabled,
      automation_enabled,
      notes
    };

    Object.entries(fieldsToUpdate).forEach(([field, value]) => {
      if (value !== undefined) {
        updateFields.push(`${field} = $${paramCount + 1}`);
        updateValues.push(value);
        paramCount++;
      }
    });

    if (encryptedPassword !== undefined) {
      updateFields.push(`ssh_password_encrypted = $${paramCount + 1}`);
      updateValues.push(encryptedPassword);
      paramCount++;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length === 1) { // Only timestamp update
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    const updateQuery = `
      UPDATE iphones 
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id, name, model, ip_address, port, status
    `;

    const result = await db.query(updateQuery, [id, ...updateValues]);

    res.json({
      success: true,
      message: 'iPhone updated successfully',
      iphone: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating iPhone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update iPhone',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/iphones/:id
 * Delete an iPhone and all its containers
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if iPhone exists
    const existingResult = await db.query('SELECT name FROM iphones WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'iPhone not found'
      });
    }

    const iphoneName = existingResult.rows[0].name;

    // Check if any containers are currently assigned
    const assignedContainers = await db.query(`
      SELECT COUNT(*) as count 
      FROM iphone_containers 
      WHERE iphone_id = $1 AND assigned_account_id IS NOT NULL
    `, [id]);

    if (parseInt(assignedContainers.rows[0].count) > 0) {
      return res.status(409).json({
        success: false,
        error: 'Cannot delete iPhone with assigned containers',
        message: 'Release all account assignments before deleting this iPhone'
      });
    }

    // Delete iPhone (cascades to containers and logs)
    await db.query('DELETE FROM iphones WHERE id = $1', [id]);

    res.json({
      success: true,
      message: `iPhone "${iphoneName}" deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting iPhone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete iPhone',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/iphones/:id/test-connection
 * Test connection to iPhone XXTouch Elite
 */
router.post('/:id/test-connection', async (req, res) => {
  try {
    const { id } = req.params;

    // Get iPhone details
    const iphoneResult = await db.query(`
      SELECT ip_address, xxtouch_port FROM iphones WHERE id = $1
    `, [id]);

    if (iphoneResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'iPhone not found'
      });
    }

    const { ip_address, xxtouch_port } = iphoneResult.rows[0];
    const url = `http://${ip_address}:${xxtouch_port}/status`;

    try {
      const response = await axios.get(url, { timeout: 5000 });
      
      // Update iPhone status
      await db.query(`
        UPDATE iphones 
        SET 
          connection_test_success = true,
          last_seen = CURRENT_TIMESTAMP,
          last_health_check = CURRENT_TIMESTAMP,
          status = CASE WHEN status = 'offline' THEN 'active' ELSE status END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);

      res.json({
        success: true,
        message: 'Connection test successful',
        connection_status: 'connected',
        response_data: response.data
      });
    } catch (connectionError) {
      // Update iPhone status
      await db.query(`
        UPDATE iphones 
        SET 
          connection_test_success = false,
          last_health_check = CURRENT_TIMESTAMP,
          status = 'offline',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [id]);

      res.status(503).json({
        success: false,
        error: 'Connection test failed',
        message: connectionError instanceof Error ? connectionError.message : 'Unknown connection error',
        connection_status: 'failed'
      });
    }
  } catch (error) {
    console.error('Error testing iPhone connection:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test connection',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/iphones/:id/assign-bot
 * Assign a bot to an iPhone
 */
router.post('/:id/assign-bot', async (req, res) => {
  try {
    const { id } = req.params;
    const { bot_id } = req.body;

    if (!bot_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing bot_id'
      });
    }

    // Check if bot is already assigned to another iPhone
    const existingAssignment = await db.query(`
      SELECT name FROM iphones WHERE assigned_bot_id = $1 AND id != $2
    `, [bot_id, id]);

    if (existingAssignment.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Bot already assigned',
        message: `Bot "${bot_id}" is already assigned to iPhone "${existingAssignment.rows[0].name}"`
      });
    }

    // Assign bot to iPhone
    const result = await db.query(`
      UPDATE iphones 
      SET 
        assigned_bot_id = $2,
        bot_assigned_at = CURRENT_TIMESTAMP,
        automation_enabled = true,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING name
    `, [id, bot_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'iPhone not found'
      });
    }

    res.json({
      success: true,
      message: `Bot "${bot_id}" assigned to iPhone "${result.rows[0].name}" successfully`
    });
  } catch (error) {
    console.error('Error assigning bot to iPhone:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign bot',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/iphones/:id/assign-bot
 * Remove bot assignment from iPhone
 */
router.delete('/:id/assign-bot', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      UPDATE iphones 
      SET 
        assigned_bot_id = NULL,
        bot_assigned_at = NULL,
        automation_enabled = false,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING name, assigned_bot_id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'iPhone not found'
      });
    }

    res.json({
      success: true,
      message: `Bot assignment removed from iPhone "${result.rows[0].name}"`
    });
  } catch (error) {
    console.error('Error removing bot assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove bot assignment',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/iphones/:id/containers
 * Get detailed container information for an iPhone
 */
router.get('/:id/containers', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      SELECT 
        ic.*,
        a.username as assigned_account_username,
        a.lifecycle_state as account_lifecycle_state,
        a.email as assigned_account_email,
        m.name as model_name
      FROM iphone_containers ic
      LEFT JOIN accounts a ON ic.assigned_account_id = a.id
      LEFT JOIN models m ON a.model_id = m.id
      WHERE ic.iphone_id = $1
      ORDER BY ic.container_number
    `, [id]);

    res.json({
      success: true,
      containers: result.rows
    });
  } catch (error) {
    console.error('Error fetching iPhone containers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch containers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/iphones/assign-account
 * Assign an account to an iPhone container
 */
router.post('/assign-account', async (req, res) => {
  try {
    const { accountId, iphoneId, containerNumber } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }

    // Check if account exists and is not already assigned
    const accountResult = await db.query(`
      SELECT id, username, iphone_container_id 
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
    if (account.iphone_container_id) {
      return res.status(409).json({
        success: false,
        error: 'Account is already assigned to a container'
      });
    }

    // Assign account to iPhone container using database function
    const result = await db.query(`
      SELECT assign_account_to_iphone_container($1, $2, $3) as container_id
    `, [accountId, iphoneId, containerNumber]);

    const containerId = result.rows[0].container_id;

    // Get the assigned container details
    const containerResult = await db.query(`
      SELECT 
        ic.*,
        i.name as iphone_name,
        i.ip_address as iphone_ip
      FROM iphone_containers ic
      JOIN iphones i ON ic.iphone_id = i.id
      WHERE ic.id = $1
    `, [containerId]);

    res.json({
      success: true,
      message: `Account "${account.username}" assigned to container ${containerResult.rows[0].container_number} on iPhone "${containerResult.rows[0].iphone_name}"`,
      assignment: {
        container_id: containerId,
        container_number: containerResult.rows[0].container_number,
        iphone_name: containerResult.rows[0].iphone_name,
        iphone_ip: containerResult.rows[0].iphone_ip
      }
    });
  } catch (error) {
    console.error('Error assigning account to iPhone container:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign account to container',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/iphones/release-account
 * Release an account from its iPhone container
 */
router.post('/release-account', async (req, res) => {
  try {
    const { accountId } = req.body;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: 'Account ID is required'
      });
    }

    // Check if account exists and is assigned
    const accountResult = await db.query(`
      SELECT 
        a.id, 
        a.username, 
        a.iphone_container_id,
        ic.container_number,
        i.name as iphone_name
      FROM accounts a
      LEFT JOIN iphone_containers ic ON a.iphone_container_id = ic.id
      LEFT JOIN iphones i ON ic.iphone_id = i.id
      WHERE a.id = $1
    `, [accountId]);

    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const account = accountResult.rows[0];
    if (!account.iphone_container_id) {
      return res.status(409).json({
        success: false,
        error: 'Account is not assigned to any container'
      });
    }

    // Release account from iPhone container using database function
    const result = await db.query(`
      SELECT release_account_from_iphone_container($1) as released
    `, [accountId]);

    const released = result.rows[0].released;

    if (!released) {
      return res.status(500).json({
        success: false,
        error: 'Failed to release account from container'
      });
    }

    res.json({
      success: true,
      message: `Account "${account.username}" released from container ${account.container_number} on iPhone "${account.iphone_name}"`,
      released_from: {
        container_number: account.container_number,
        iphone_name: account.iphone_name
      }
    });
  } catch (error) {
    console.error('Error releasing account from iPhone container:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to release account from container',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/iphones/available-for-account/:accountId
 * Get available iPhone containers for a specific account
 */
router.get('/available-for-account/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Check if account exists
    const accountResult = await db.query(`
      SELECT id, username, model_id, iphone_container_id 
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

    // Get available containers on active iPhones
    const result = await db.query(`
      SELECT 
        i.id as iphone_id,
        i.name as iphone_name,
        i.model as iphone_model,
        i.ip_address,
        i.status as iphone_status,
        ic.id as container_id,
        ic.container_number,
        ic.status as container_status,
        (SELECT COUNT(*) FROM iphone_containers ic2 WHERE ic2.iphone_id = i.id AND ic2.status = 'available') as available_containers_count
      FROM iphones i
      JOIN iphone_containers ic ON i.id = ic.iphone_id
      WHERE i.status = 'active' 
        AND i.automation_enabled = true
        AND ic.status = 'available'
      ORDER BY i.name, ic.container_number
    `);

    // Group by iPhone
    const iphoneMap = new Map();
    result.rows.forEach(row => {
      if (!iphoneMap.has(row.iphone_id)) {
        iphoneMap.set(row.iphone_id, {
          iphone_id: row.iphone_id,
          iphone_name: row.iphone_name,
          iphone_model: row.iphone_model,
          ip_address: row.ip_address,
          iphone_status: row.iphone_status,
          available_containers_count: row.available_containers_count,
          containers: []
        });
      }
      iphoneMap.get(row.iphone_id).containers.push({
        container_id: row.container_id,
        container_number: row.container_number,
        container_status: row.container_status
      });
    });

    const availableIphones = Array.from(iphoneMap.values());

    res.json({
      success: true,
      account: {
        id: account.id,
        username: account.username,
        model_id: account.model_id,
        is_assigned: !!account.iphone_container_id
      },
      available_iphones: availableIphones,
      total_available_containers: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching available containers for account:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available containers',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 