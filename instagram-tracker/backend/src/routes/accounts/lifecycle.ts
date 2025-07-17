import express from 'express';
import { AccountLifecycleService, AccountLifecycleState } from '../../services/AccountLifecycleService';
import { WarmupProcessService } from '../../services/WarmupProcessService';

const router = express.Router();

/**
 * GET /api/accounts/lifecycle/summary
 * Get lifecycle state summary statistics
 */
router.get('/summary', async (req: any, res: any) => {
  try {
    const summary = await AccountLifecycleService.getLifecycleSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting lifecycle summary:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get lifecycle summary'
    });
  }
});

/**
 * GET /api/accounts/lifecycle/states/:state
 * Get accounts by lifecycle state
 */
router.get('/states/:state', async (req: any, res: any) => {
  try {
    const { state } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    // Validate state parameter
    if (!Object.values(AccountLifecycleState).includes(state as AccountLifecycleState)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid State',
        message: 'Invalid lifecycle state provided'
      });
    }

    const accounts = await AccountLifecycleService.getAccountsByState(
      state as AccountLifecycleState,
      parseInt(limit),
      parseInt(offset)
    );
    
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
  } catch (error) {
    console.error('Error getting accounts by state:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get accounts by state'
    });
  }
});

/**
 * GET /api/accounts/lifecycle/:accountId/history
 * Get state transition history for an account
 */
router.get('/:accountId/history', async (req: any, res: any) => {
  try {
    const { accountId } = req.params;
    
    if (!accountId || isNaN(parseInt(accountId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Account ID',
        message: 'Valid account ID is required'
      });
    }

    const history = await AccountLifecycleService.getAccountStateHistory(parseInt(accountId));
    
    res.json({
      success: true,
      data: history,
      metadata: {
        account_id: parseInt(accountId),
        transition_count: history.length
      }
    });
  } catch (error) {
    console.error('Error getting account state history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get account state history'
    });
  }
});

/**
 * GET /api/accounts/lifecycle/:accountId/available-transitions
 * Get available state transitions for an account
 */
router.get('/:accountId/available-transitions', async (req: any, res: any) => {
  try {
    const { accountId } = req.params;
    
    if (!accountId || isNaN(parseInt(accountId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Account ID',
        message: 'Valid account ID is required'
      });
    }

    // Get current account state
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

    const currentState = accountResult.rows[0].lifecycle_state as AccountLifecycleState;
    const availableTransitions = AccountLifecycleService.getAvailableTransitions(currentState);
    
    res.json({
      success: true,
      data: {
        current_state: currentState,
        available_transitions: availableTransitions
      }
    });
  } catch (error) {
    console.error('Error getting available transitions:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get available transitions'
    });
  }
});

/**
 * POST /api/accounts/lifecycle/:accountId/validate
 * Validate if account can transition to a specific state
 */
router.post('/:accountId/validate', async (req: any, res: any) => {
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

    if (!target_state || !Object.values(AccountLifecycleState).includes(target_state)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Target State',
        message: 'Valid target state is required'
      });
    }

    const validation = await AccountLifecycleService.validateAccountForState(
      parseInt(accountId),
      target_state as AccountLifecycleState
    );
    
    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('Error validating account state:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to validate account state'
    });
  }
});

/**
 * POST /api/accounts/lifecycle/:accountId/transition
 * Transition account to new state
 */
router.post('/:accountId/transition', async (req: any, res: any) => {
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

    if (!to_state || !Object.values(AccountLifecycleState).includes(to_state)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Target State',
        message: 'Valid target state is required'
      });
    }

    const result = await AccountLifecycleService.transitionAccountState({
      account_id: parseInt(accountId),
      to_state: to_state as AccountLifecycleState,
      reason,
      notes,
      force: Boolean(force),
      changed_by: 'api_user' // TODO: Get from authentication context
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Account state transitioned successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Transition Failed',
        message: result.error,
        validation_errors: result.validation_errors
      });
    }
  } catch (error) {
    console.error('Error transitioning account state:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to transition account state'
    });
  }
});

/**
 * POST /api/accounts/lifecycle/bulk-transition
 * Bulk transition multiple accounts to new state
 */
router.post('/bulk-transition', async (req: any, res: any) => {
  try {
    const { account_ids, to_state, reason, notes, force = false } = req.body;
    
    if (!account_ids || !Array.isArray(account_ids) || account_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Account IDs',
        message: 'Array of account IDs is required'
      });
    }

    if (!to_state || !Object.values(AccountLifecycleState).includes(to_state)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Target State',
        message: 'Valid target state is required'
      });
    }

    // Validate all account IDs are numbers
    const validAccountIds = account_ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    
    if (validAccountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Account IDs',
        message: 'Valid numeric account IDs are required'
      });
    }

    const result = await AccountLifecycleService.bulkTransitionAccountStates({
      account_ids: validAccountIds,
      to_state: to_state as AccountLifecycleState,
      reason,
      notes,
      force: Boolean(force),
      changed_by: 'api_user' // TODO: Get from authentication context
    });
    
    res.json({
      success: true,
      data: result,
      message: `Bulk transition completed: ${result.success_count} successful, ${result.failure_count} failed`
    });
  } catch (error) {
    console.error('Error bulk transitioning account states:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to bulk transition account states'
    });
  }
});

/**
 * GET /api/accounts/lifecycle/states
 * Get all available lifecycle states
 */
router.get('/states', async (req: any, res: any) => {
  try {
    const states = Object.values(AccountLifecycleState).map(state => ({
      value: state,
      label: state.charAt(0).toUpperCase() + state.slice(1),
      available_transitions: AccountLifecycleService.getAvailableTransitions(state)
    }));
    
    res.json({
      success: true,
      data: states
    });
  } catch (error) {
    console.error('Error getting lifecycle states:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get lifecycle states'
    });
  }
});

/**
 * POST /api/accounts/lifecycle/:accountId/invalidate
 * Mark an account as invalid, releasing its resources.
 */
router.post('/:accountId/invalidate', async (req: any, res: any) => {
  try {
    const { accountId } = req.params;
    const changed_by = 'api_user'; // TODO: Get from auth context

    if (!accountId || isNaN(parseInt(accountId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Account ID',
        message: 'Valid account ID is required'
      });
    }

    const result = await AccountLifecycleService.invalidateAccount(parseInt(accountId), changed_by);

    if (result.success) {
      res.json({
        success: true,
        message: 'Account invalidated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Invalidation Failed',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error invalidating account:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to invalidate account'
    });
  }
});

/**
 * POST /api/accounts/lifecycle/:accountId/complete-setup
 * Mark manual setup as complete and move account to 'ready' state
 */
router.post('/:accountId/complete-setup', async (req: any, res: any) => {
  try {
    const { accountId } = req.params;
    const { changed_by = 'automation_script' } = req.body;
    
    if (!accountId || isNaN(parseInt(accountId))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Account ID',
        message: 'Valid account ID is required'
      });
    }

    // Use WarmupProcessService for manual setup completion
    const warmupService = new WarmupProcessService();
    const result = await warmupService.completeManualSetup(
      parseInt(accountId),
      changed_by
    );
    
    if (result.success) {
      res.json({
        success: true,
        message: `Account ${accountId} has been moved to the 'ready' state.`
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Setup Completion Failed',
        message: result.error
      });
    }
  } catch (error) {
    console.error('Error completing manual setup:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to complete manual setup'
    });
  }
});

export default router; 