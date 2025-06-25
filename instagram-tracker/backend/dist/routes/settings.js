"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../database");
const GeminiService_1 = require("../services/GeminiService");
const router = express_1.default.Router();
router.get('/', async (req, res) => {
    try {
        const result = await database_1.db.query('SELECT key, value FROM application_settings');
        const settings = result.rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json(settings);
    }
    catch (error) {
        console.error('Failed to fetch settings:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});
router.put('/', async (req, res) => {
    const settings = req.body;
    const client = await database_1.db.connect();
    try {
        await client.query('BEGIN');
        for (const key in settings) {
            const value = JSON.stringify(settings[key]);
            await client.query('INSERT INTO application_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP', [key, value]);
        }
        if (settings.gemini_api_key) {
            const model = settings.gemini_model_name || 'gemini-1.5-flash';
            const tempGeminiService = new GeminiService_1.GeminiService({
                apiKey: settings.gemini_api_key,
                modelName: model,
            });
            await tempGeminiService.validateApiKey();
        }
        await client.query('COMMIT');
        await GeminiService_1.GeminiService.refreshInstance();
        res.json({ success: true, message: 'Settings updated successfully' });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to update settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update settings',
            details: error instanceof Error ? error.message : String(error)
        });
    }
    finally {
        client.release();
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map