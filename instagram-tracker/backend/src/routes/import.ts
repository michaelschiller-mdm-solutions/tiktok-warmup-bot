import express, { Router } from 'express';
import { db } from '../database';
import accountImportRouter from './accounts/import';

const router: Router = express.Router();

// Mount account import routes
router.use('/accounts', accountImportRouter);

// Import accounts from text format
// Format: username:password:email:account_code
router.post('/accounts/:modelId', async (req: any, res: any) => {
  try {
    const { modelId } = req.params;
    const { data } = req.body; // Raw text data
    
    if (!data || typeof data !== 'string') {
      return res.status(400).json({ error: 'Data is required' });
    }
    
    const lines = data.trim().split('\n');
    const accounts = [];
    const errors = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(':');
      if (parts.length !== 4) {
        errors.push({ line: i + 1, error: 'Invalid format, expected username:password:email:account_code' });
        continue;
      }
      
      const [username, password, email, account_code] = parts;
      accounts.push({ username, password, email, account_code });
    }
    
    if (accounts.length === 0) {
      return res.status(400).json({ error: 'No valid accounts found', errors });
    }
    
    // Insert accounts into database
    const inserted = [];
    for (const account of accounts) {
      try {
        const result = await db.query(`
          INSERT INTO accounts (model_id, username, password, email, account_code)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id, username
        `, [modelId, account.username, account.password, account.email, account.account_code]);
        
        inserted.push(result.rows[0]);
      } catch (dbError: any) {
        errors.push({ username: account.username, error: 'Database insert failed' });
      }
    }
    
    res.json({
      success: true,
      imported: inserted.length,
      total: accounts.length,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import accounts' });
  }
});

export default router; 