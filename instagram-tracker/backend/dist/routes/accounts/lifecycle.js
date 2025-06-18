"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AccountLifecycleService_1 = require("../../services/AccountLifecycleService");
const router = express_1.default.Router();
router.get('/summary', async (req, res) => {
    try {
        const summary = await AccountLifecycleService_1.AccountLifecycleService.getLifecycleSummary();
        res.json({
            success: true,
            data: summary
        });
    }
    catch (error) {
        console.error('Error getting lifecycle summary:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get lifecycle summary'
        });
    }
});
router.get('/states/:state', async (req, res) => {
    try {
        const { state } = req.params;
        const { limit = 100, offset = 0 } = req.query;
        if (!Object.values(AccountLifecycleService_1.AccountLifecycleState).includes(state)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid State',
                message: 'Invalid lifecycle state provided'
            });
        }
        const accounts = await AccountLifecycleService_1.AccountLifecycleService.getAccountsByState(state, parseInt(limit), parseInt(offset));
        res.json({
            success: true,
            data: accounts,
            metadata: {
                state,
                limit: parseInt(limit),
                offset: parseInt(offset),
                count: accounts.length
            }
        });
    }
    catch (error) {
        console.error('Error getting accounts by state:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get accounts by state'
        });
    }
});
router.get('/:accountId/history', async (req, res) => {
    try {
        const { accountId } = req.params;
        if (!accountId || isNaN(parseInt(accountId))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Account ID',
                message: 'Valid account ID is required'
            });
        }
        const history = await AccountLifecycleService_1.AccountLifecycleService.getAccountStateHistory(parseInt(accountId));
        res.json({
            success: true,
            data: history,
            metadata: {
                account_id: parseInt(accountId),
                transition_count: history.length
            }
        });
    }
    catch (error) {
        console.error('Error getting account state history:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get account state history'
        });
    }
});
router.get('/:accountId/available-transitions', async (req, res) => {
    try {
        const { accountId } = req.params;
        if (!accountId || isNaN(parseInt(accountId))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Account ID',
                message: 'Valid account ID is required'
            });
        }
        const { db } = require('../../database');
        const accountQuery = `SELECT lifecycle_state FROM accounts WHERE id = $1`;
        const accountResult = await db.query(accountQuery, [parseInt(accountId)]);
        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Account Not Found',
                message: 'Account not found'
            });
        }
        const currentState = accountResult.rows[0].lifecycle_state;
        const availableTransitions = AccountLifecycleService_1.AccountLifecycleService.getAvailableTransitions(currentState);
        res.json({
            success: true,
            data: {
                current_state: currentState,
                available_transitions: availableTransitions
            }
        });
    }
    catch (error) {
        console.error('Error getting available transitions:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get available transitions'
        });
    }
});
router.post('/:accountId/validate', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { target_state } = req.body;
        if (!accountId || isNaN(parseInt(accountId))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Account ID',
                message: 'Valid account ID is required'
            });
        }
        if (!target_state || !Object.values(AccountLifecycleService_1.AccountLifecycleState).includes(target_state)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Target State',
                message: 'Valid target state is required'
            });
        }
        const validation = await AccountLifecycleService_1.AccountLifecycleService.validateAccountForState(parseInt(accountId), target_state);
        res.json({
            success: true,
            data: validation
        });
    }
    catch (error) {
        console.error('Error validating account state:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to validate account state'
        });
    }
});
router.post('/:accountId/transition', async (req, res) => {
    try {
        const { accountId } = req.params;
        const { to_state, reason, notes, force = false } = req.body;
        if (!accountId || isNaN(parseInt(accountId))) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Account ID',
                message: 'Valid account ID is required'
            });
        }
        if (!to_state || !Object.values(AccountLifecycleService_1.AccountLifecycleState).includes(to_state)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Target State',
                message: 'Valid target state is required'
            });
        }
        const result = await AccountLifecycleService_1.AccountLifecycleService.transitionAccountState({
            account_id: parseInt(accountId),
            to_state: to_state,
            reason,
            notes,
            force: Boolean(force),
            changed_by: 'api_user'
        });
        if (result.success) {
            res.json({
                success: true,
                message: 'Account state transitioned successfully'
            });
        }
        else {
            res.status(400).json({
                success: false,
                error: 'Transition Failed',
                message: result.error,
                validation_errors: result.validation_errors
            });
        }
    }
    catch (error) {
        console.error('Error transitioning account state:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to transition account state'
        });
    }
});
router.post('/bulk-transition', async (req, res) => {
    try {
        const { account_ids, to_state, reason, notes, force = false } = req.body;
        if (!account_ids || !Array.isArray(account_ids) || account_ids.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Account IDs',
                message: 'Array of account IDs is required'
            });
        }
        if (!to_state || !Object.values(AccountLifecycleService_1.AccountLifecycleState).includes(to_state)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Target State',
                message: 'Valid target state is required'
            });
        }
        const validAccountIds = account_ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
        if (validAccountIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid Account IDs',
                message: 'Valid numeric account IDs are required'
            });
        }
        const result = await AccountLifecycleService_1.AccountLifecycleService.bulkTransitionAccountStates({
            account_ids: validAccountIds,
            to_state: to_state,
            reason,
            notes,
            force: Boolean(force),
            changed_by: 'api_user'
        });
        res.json({
            success: true,
            data: result,
            message: `Bulk transition completed: ${result.success_count} successful, ${result.failure_count} failed`
        });
    }
    catch (error) {
        console.error('Error bulk transitioning account states:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to bulk transition account states'
        });
    }
});
router.get('/states', async (req, res) => {
    try {
        const states = Object.values(AccountLifecycleService_1.AccountLifecycleState).map(state => ({
            value: state,
            label: state.charAt(0).toUpperCase() + state.slice(1),
            available_transitions: AccountLifecycleService_1.AccountLifecycleService.getAvailableTransitions(state)
        }));
        res.json({
            success: true,
            data: states
        });
    }
    catch (error) {
        console.error('Error getting lifecycle states:', error);
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Failed to get lifecycle states'
        });
    }
});
exports.default = router;
//# sourceMappingURL=lifecycle.js.map