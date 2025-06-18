"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const accountImportService_1 = require("../../services/accountImportService");
const database_1 = require("../../database");
const router = (0, express_1.Router)();
const importService = new accountImportService_1.AccountImportService(database_1.db);
router.post('/check-existing', async (req, res) => {
    try {
        const { usernames } = req.body;
        if (!usernames || !Array.isArray(usernames)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'usernames array is required'
            });
        }
        if (usernames.length === 0) {
            return res.json({
                success: true,
                data: { existing: [], available: usernames }
            });
        }
        if (usernames.length > 10000) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Maximum 10,000 usernames per request'
            });
        }
        const existingUsernames = await importService.checkExistingAccounts(usernames);
        const availableUsernames = usernames.filter(username => !existingUsernames.includes(username.toLowerCase().trim().replace(/^@/, '')));
        res.json({
            success: true,
            data: {
                existing: existingUsernames,
                available: availableUsernames
            },
            metadata: {
                total_checked: usernames.length,
                existing_count: existingUsernames.length,
                available_count: availableUsernames.length
            }
        });
    }
    catch (error) {
        console.error('Check existing accounts error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to check existing accounts'
        });
    }
});
router.post('/import', async (req, res) => {
    try {
        const { usernames, accounts_data, model_id, batch_index, total_batches } = req.body;
        const accountsInput = accounts_data || usernames;
        if (!accountsInput || !Array.isArray(accountsInput)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'usernames or accounts_data array is required'
            });
        }
        if (!model_id || typeof model_id !== 'number') {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'model_id is required and must be a number'
            });
        }
        if (accountsInput.length === 0) {
            return res.json({
                success: true,
                data: {
                    successful: 0,
                    failed: 0,
                    total: 0,
                    errors: []
                }
            });
        }
        if (accountsInput.length > 1000) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Maximum 1,000 accounts per batch'
            });
        }
        const modelCheck = await database_1.db.query('SELECT id FROM models WHERE id = $1', [model_id]);
        if (modelCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: `Model with ID ${model_id} does not exist`
            });
        }
        console.log(`Starting import batch ${batch_index + 1}/${total_batches || 1} for model ${model_id} with ${accountsInput.length} accounts`);
        const result = await importService.importAccountsBatch(accountsInput, model_id);
        console.log(`Import batch completed:`, {
            successful: result.successful,
            failed: result.failed,
            total: result.total,
            errorCount: result.errors.length
        });
        res.json({
            success: true,
            data: result,
            metadata: {
                batch_index: batch_index || 0,
                total_batches: total_batches || 1,
                model_id: model_id
            }
        });
    }
    catch (error) {
        console.error('Import accounts error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: error.message || 'Failed to import accounts'
        });
    }
});
router.get('/stats/:modelId', async (req, res) => {
    try {
        const modelId = parseInt(req.params.modelId);
        if (isNaN(modelId)) {
            return res.status(400).json({
                success: false,
                error: 'Validation Error',
                message: 'Invalid model ID'
            });
        }
        const modelCheck = await database_1.db.query('SELECT id, name FROM models WHERE id = $1', [modelId]);
        if (modelCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Not Found',
                message: `Model with ID ${modelId} does not exist`
            });
        }
        const query = `
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN lifecycle_state = 'imported' THEN 1 END) as imported_accounts,
        COUNT(CASE WHEN lifecycle_state = 'active' THEN 1 END) as active_accounts,
        COUNT(CASE WHEN lifecycle_state = 'warmup' THEN 1 END) as warmup_accounts,
        MAX(created_at) as last_import_date
      FROM accounts 
      WHERE model_id = $1
    `;
        const result = await database_1.db.query(query, [modelId]);
        const stats = result.rows[0];
        res.json({
            success: true,
            data: {
                model_id: modelId,
                model_name: modelCheck.rows[0].name,
                total_accounts: parseInt(stats.total_accounts) || 0,
                imported_accounts: parseInt(stats.imported_accounts) || 0,
                active_accounts: parseInt(stats.active_accounts) || 0,
                warmup_accounts: parseInt(stats.warmup_accounts) || 0,
                last_import_date: stats.last_import_date || null
            }
        });
    }
    catch (error) {
        console.error('Get import statistics error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get import statistics'
        });
    }
});
exports.default = router;
//# sourceMappingURL=import.js.map