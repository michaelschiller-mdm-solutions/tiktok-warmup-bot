"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../../database");
const router = (0, express_1.Router)();
router.get('/pending', async (req, res) => {
    try {
        const { model_id, limit = 50 } = req.query;
        let query = `
            SELECT 
                a.id,
                a.username,
                a.model_id,
                m.name as model_name,
                a.lifecycle_state,
                a.verification_screenshot_path,
                a.verification_screenshot_timestamp,
                a.verification_status,
                a.verification_required,
                a.created_at,
                a.updated_at
            FROM accounts a
            LEFT JOIN models m ON a.model_id = m.id
            WHERE a.verification_required = true 
            AND a.verification_status IN ('pending_verification', 'manual_completion_required')
        `;
        const params = [];
        if (model_id) {
            query += ` AND a.model_id = $${params.length + 1}`;
            params.push(model_id);
        }
        query += ` ORDER BY a.verification_screenshot_timestamp DESC LIMIT $${params.length + 1}`;
        params.push(limit);
        const result = await database_1.db.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            metadata: {
                total_records: result.rows.length,
                pending_verification: result.rows.length
            }
        });
    }
    catch (error) {
        console.error('Error fetching pending verification accounts:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch pending verification accounts'
        });
    }
});
router.post('/:id/approve', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const { verified_by, verification_notes } = req.body;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Account ID',
                message: 'Account ID must be a valid number'
            });
        }
        const updateQuery = `
            UPDATE accounts 
            SET verification_status = 'verified_valid',
                verification_required = false,
                verified_by = $2,
                verified_at = CURRENT_TIMESTAMP,
                verification_notes = $3,
                lifecycle_state = 'ready_for_bot_assignment',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, username, verification_status, lifecycle_state
        `;
        const result = await database_1.db.query(updateQuery, [
            accountId,
            verified_by || 'system',
            verification_notes || 'Account verified as valid'
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account Not Found',
                message: 'Account not found'
            });
        }
        const account = result.rows[0];
        console.log(`[Verification] Account ${account.username} (${accountId}) approved and moved to ready_for_bot_assignment`);
        res.json({
            success: true,
            message: `Account ${account.username} approved successfully`,
            data: {
                account_id: accountId,
                username: account.username,
                verification_status: account.verification_status,
                lifecycle_state: account.lifecycle_state
            }
        });
    }
    catch (error) {
        console.error('Error approving account verification:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to approve account verification'
        });
    }
});
router.post('/:id/reject', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const { verified_by, verification_notes } = req.body;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Account ID',
                message: 'Account ID must be a valid number'
            });
        }
        const updateQuery = `
            UPDATE accounts 
            SET verification_status = 'verified_invalid',
                verification_required = false,
                verified_by = $2,
                verified_at = CURRENT_TIMESTAMP,
                verification_notes = $3,
                lifecycle_state = 'invalid',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, username, verification_status, lifecycle_state
        `;
        const result = await database_1.db.query(updateQuery, [
            accountId,
            verified_by || 'system',
            verification_notes || 'Account rejected - appears to be shadow-banned'
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account Not Found',
                message: 'Account not found'
            });
        }
        const account = result.rows[0];
        console.log(`[Verification] Account ${account.username} (${accountId}) rejected and marked as invalid`);
        res.json({
            success: true,
            message: `Account ${account.username} rejected successfully`,
            data: {
                account_id: accountId,
                username: account.username,
                verification_status: account.verification_status,
                lifecycle_state: account.lifecycle_state
            }
        });
    }
    catch (error) {
        console.error('Error rejecting account verification:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to reject account verification'
        });
    }
});
router.get('/:id/screenshot', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Account ID',
                message: 'Account ID must be a valid number'
            });
        }
        const query = `
            SELECT verification_screenshot_path, username
            FROM accounts 
            WHERE id = $1
        `;
        const result = await database_1.db.query(query, [accountId]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account Not Found',
                message: 'Account not found'
            });
        }
        const account = result.rows[0];
        const screenshotPath = account.verification_screenshot_path;
        if (!screenshotPath) {
            return res.status(404).json({
                success: false,
                error: 'Screenshot Not Found',
                message: 'No screenshot available for this account'
            });
        }
        const path = require('path');
        const fs = require('fs');
        const fullPath = path.resolve(__dirname, '../../../bot/screenshots', path.basename(screenshotPath));
        if (!fs.existsSync(fullPath)) {
            return res.status(404).json({
                success: false,
                error: 'Screenshot File Not Found',
                message: 'Screenshot file does not exist on disk'
            });
        }
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', `inline; filename="${account.username}_verification.jpg"`);
        res.sendFile(fullPath);
    }
    catch (error) {
        console.error('Error serving verification screenshot:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to serve verification screenshot'
        });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const accountId = parseInt(req.params.id);
        const { verification_screenshot_path, verification_screenshot_timestamp, verification_required, verification_status } = req.body;
        if (isNaN(accountId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Account ID',
                message: 'Account ID must be a valid number'
            });
        }
        const updateQuery = `
            UPDATE accounts 
            SET verification_screenshot_path = $2,
                verification_screenshot_timestamp = $3,
                verification_required = $4,
                verification_status = $5,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING id, username, verification_status, verification_required
        `;
        const result = await database_1.db.query(updateQuery, [
            accountId,
            verification_screenshot_path || null,
            verification_screenshot_timestamp || null,
            verification_required || false,
            verification_status || 'not_required'
        ]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account Not Found',
                message: 'Account not found'
            });
        }
        const account = result.rows[0];
        console.log(`[Verification] Updated verification data for account ${account.username} (${accountId})`);
        res.json({
            success: true,
            message: 'Verification data updated successfully',
            data: {
                account_id: accountId,
                username: account.username,
                verification_status: account.verification_status,
                verification_required: account.verification_required
            }
        });
    }
    catch (error) {
        console.error('Error updating account verification data:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to update account verification data'
        });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const { model_id } = req.query;
        let baseQuery = 'FROM accounts a';
        let whereClause = 'WHERE a.verification_required = true';
        const params = [];
        if (model_id) {
            whereClause += ` AND a.model_id = $${params.length + 1}`;
            params.push(model_id);
        }
        const statsQuery = `
            SELECT 
                COUNT(*) as total_requiring_verification,
                COUNT(CASE WHEN verification_status = 'pending_verification' THEN 1 END) as pending_verification,
                COUNT(CASE WHEN verification_status = 'verified_valid' THEN 1 END) as verified_valid,
                COUNT(CASE WHEN verification_status = 'verified_invalid' THEN 1 END) as verified_invalid,
                COUNT(CASE WHEN verification_screenshot_path IS NOT NULL THEN 1 END) as with_screenshots
            ${baseQuery} ${whereClause}
        `;
        const result = await database_1.db.query(statsQuery, params);
        const stats = result.rows[0];
        res.json({
            success: true,
            data: {
                total_requiring_verification: parseInt(stats.total_requiring_verification),
                pending_verification: parseInt(stats.pending_verification),
                verified_valid: parseInt(stats.verified_valid),
                verified_invalid: parseInt(stats.verified_invalid),
                with_screenshots: parseInt(stats.with_screenshots),
                completion_rate: stats.total_requiring_verification > 0
                    ? Math.round(((stats.verified_valid + stats.verified_invalid) / stats.total_requiring_verification) * 100)
                    : 0
            }
        });
    }
    catch (error) {
        console.error('Error fetching verification stats:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to fetch verification statistics'
        });
    }
});
exports.default = router;
//# sourceMappingURL=verification.js.map