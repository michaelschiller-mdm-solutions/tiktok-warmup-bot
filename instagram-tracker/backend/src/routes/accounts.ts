import express from 'express';
import { db } from '../database';

const router = express.Router();

// Get accounts for a model
router.get('/model/:modelId', async (req: any, res: any) => {
  try {
    const { modelId } = req.params;
    const result = await db.query(`
      SELECT * FROM accounts 
      WHERE model_id = $1
      ORDER BY created_at DESC
    `, [modelId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Create account
router.post('/', async (req: any, res: any) => {
  try {
    const { model_id, username, password, email, account_code } = req.body;
    
    const result = await db.query(`
      INSERT INTO accounts (model_id, username, password, email, account_code)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [model_id, username, password, email, account_code]);
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

export default router; 