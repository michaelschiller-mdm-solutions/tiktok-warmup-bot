import express, { Request, Response, NextFunction } from 'express';
import { db } from '../database';
import { createModelSchema, updateModelSchema, modelIdSchema } from '../validation/models';

const router = express.Router();

// Middleware for validation
const validateBody = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    req.body = value; // Use validated/sanitized values
    next();
  };
};

const validateParams = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.params);
    if (error) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }
    next();
  };
};

// Get all models with statistics
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        m.*,
        COUNT(a.id) as account_count,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_accounts,
        COUNT(CASE WHEN a.status = 'banned' THEN 1 END) as banned_accounts,
        COUNT(CASE WHEN a.status = 'suspended' THEN 1 END) as suspended_accounts,
        MAX(a.last_activity) as last_account_activity
      FROM models m
      LEFT JOIN accounts a ON m.id = a.model_id
      GROUP BY m.id
      ORDER BY m.created_at DESC
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ 
      error: 'Failed to fetch models',
      message: 'An internal server error occurred'
    });
  }
});

// Get single model with detailed statistics
router.get('/:id', validateParams(modelIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get model with statistics
    const modelResult = await db.query(`
      SELECT 
        m.*,
        COUNT(a.id) as account_count,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_accounts,
        COUNT(CASE WHEN a.status = 'banned' THEN 1 END) as banned_accounts,
        COUNT(CASE WHEN a.status = 'suspended' THEN 1 END) as suspended_accounts,
        COUNT(mtf.id) as total_follows,
        COUNT(CASE WHEN mtf.status = 'following' THEN 1 END) as active_follows,
        MAX(a.last_activity) as last_account_activity
      FROM models m
      LEFT JOIN accounts a ON m.id = a.model_id
      LEFT JOIN model_target_follows mtf ON m.id = mtf.model_id
      WHERE m.id = $1
      GROUP BY m.id
    `, [id]);
    
    if (modelResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }
    
    res.json({
      success: true,
      data: modelResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching model:', error);
    res.status(500).json({ 
      error: 'Failed to fetch model',
      message: 'An internal server error occurred'
    });
  }
});

// Create new model
router.post('/', validateBody(createModelSchema), async (req: Request, res: Response) => {
  try {
    const { name, description, unfollow_ratio, daily_follow_limit, posting_schedule, settings } = req.body;
    
    const result = await db.query(`
      INSERT INTO models (name, description, unfollow_ratio, daily_follow_limit, posting_schedule, settings)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [name, description, unfollow_ratio, daily_follow_limit, posting_schedule, settings]);
    
    // Log the creation
    await db.query(`
      INSERT INTO activity_logs (model_id, action_type, details, success)
      VALUES ($1, 'model_created', $2, true)
    `, [result.rows[0].id, JSON.stringify({ model_name: name })]);
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Model created successfully'
    });
  } catch (error: any) {
    console.error('Error creating model:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ 
        error: 'Model name already exists',
        message: 'A model with this name already exists. Please choose a different name.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to create model',
        message: 'An internal server error occurred'
      });
    }
  }
});

// Update model
router.put('/:id', validateParams(modelIdSchema), validateBody(updateModelSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;
    
    // Build dynamic update query
    const setClause = Object.keys(updateFields)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(updateFields)];
    
    const result = await db.query(`
      UPDATE models 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }
    
    // Log the update
    await db.query(`
      INSERT INTO activity_logs (model_id, action_type, details, success)
      VALUES ($1, 'model_updated', $2, true)
    `, [id, JSON.stringify({ updated_fields: Object.keys(updateFields) })]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Model updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating model:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ 
        error: 'Model name already exists',
        message: 'A model with this name already exists. Please choose a different name.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to update model',
        message: 'An internal server error occurred'
      });
    }
  }
});

// Delete model
router.delete('/:id', validateParams(modelIdSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Check if model exists and get account count
    const checkResult = await db.query(`
      SELECT m.name, COUNT(a.id) as account_count 
      FROM models m 
      LEFT JOIN accounts a ON m.id = a.model_id 
      WHERE m.id = $1 
      GROUP BY m.id, m.name
    `, [id]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Model not found',
        message: `No model exists with ID ${id}`
      });
    }
    
    const { name, account_count } = checkResult.rows[0];
    
    // Delete the model (cascade will handle related records)
    const deleteResult = await db.query('DELETE FROM models WHERE id = $1 RETURNING *', [id]);
    
    // Log the deletion
    await db.query(`
      INSERT INTO activity_logs (action_type, details, success)
      VALUES ('model_deleted', $1, true)
    `, [JSON.stringify({ model_name: name, account_count: parseInt(account_count) })]);
    
    res.json({
      success: true,
      message: `Model "${name}" deleted successfully`,
      details: {
        deleted_accounts: parseInt(account_count),
        model_name: name
      }
    });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ 
      error: 'Failed to delete model',
      message: 'An internal server error occurred'
    });
  }
});

export default router; 