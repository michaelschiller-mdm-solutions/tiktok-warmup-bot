import express from 'express';
import { db } from '../database';

const router = express.Router();

router.get('/', async (req: any, res: any) => {
  try {
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM models) as total_models,
        (SELECT COUNT(*) FROM accounts) as total_accounts,
        (SELECT COUNT(*) FROM accounts WHERE status = 'active') as active_accounts,
        (SELECT COUNT(*) FROM target_users) as total_targets
    `);
    
    res.json(stats.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

export default router; 