import express from 'express';
import { db } from '../database';
import { GeminiService } from '../services/GeminiService';

const router = express.Router();

// Get all settings
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT key, value FROM application_settings');
    const settings = result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
    res.json(settings);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

// Update settings
router.put('/', async (req, res) => {
  const settings: Record<string, any> = req.body;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    for (const key in settings) {
      const value = JSON.stringify(settings[key]);
      await client.query(
        'INSERT INTO application_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP',
        [key, value]
      );
    }
    
    // If gemini_api_key is being updated, validate it
    if (settings.gemini_api_key) {
      const model = settings.gemini_model_name || 'gemini-1.5-flash';
      // We can't use the singleton here as we need to validate the new key
      const tempGeminiService = new GeminiService({
        apiKey: settings.gemini_api_key,
        modelName: model,
      });
      await tempGeminiService.validateApiKey();
    }

    await client.query('COMMIT');
    
    // Refresh the singleton instance with new settings
    await GeminiService.refreshInstance();

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to update settings:', error);
    res.status(500).json({ 
        success: false, 
        error: 'Failed to update settings',
        details: error instanceof Error ? error.message : String(error)
    });
  } finally {
    client.release();
  }
});

export default router; 