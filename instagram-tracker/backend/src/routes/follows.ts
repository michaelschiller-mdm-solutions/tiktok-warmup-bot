import express from 'express';
import { db } from '../database';

const router = express.Router();

router.get('/', async (req: any, res: any) => {
  try {
    const result = await db.query('SELECT * FROM model_target_follows ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch follows' });
  }
});

export default router; 