import express from 'express';
import { WarmupProcessService } from '../../services/WarmupProcessService';
import { ContentAssignmentService } from '../../services/ContentAssignmentService';
import { botAuthMiddleware } from '../../middleware/botAuth';
import { WarmupPhase, ContentType } from '../../types/warmupProcess';

const router = express.Router();
const warmupService = new WarmupProcessService();
const contentService = new ContentAssignmentService();

// Apply bot authentication middleware to all routes
router.use(botAuthMiddleware);

/**
 * GET /api/bot/accounts/ready
 * Get accounts ready for warmup processing
 */
router.get('/ready', async (req: any, res: any) => {
  try {
    const { model_id, limit = 50 } = req.query;
    const modelId = model_id ? parseInt(model_id) : undefined;
    const limitNum = parseInt(limit);

    if (limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Limit cannot exceed 100 accounts'
      });
    }

    const accounts = await warmupService.getReadyAccounts(modelId, limitNum);

    res.json({
      success: true,
      data: {
        accounts,
        count: accounts.length,
        bot_id: req.botId,
        session_id: req.sessionId
      }
    });

  } catch (error) {
    console.error('Error fetching ready accounts for bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ready accounts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot/accounts/:id/start-warmup
 * Initiate warmup process for an account
 */
router.post('/:id/start-warmup', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const botId = req.botId;
    const sessionId = req.sessionId;

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    const result = await warmupService.startWarmupProcess(accountId, botId, sessionId);

    res.json({
      success: result.success,
      data: result,
      bot_id: botId,
      session_id: sessionId
    });

  } catch (error) {
    console.error('Error starting warmup process:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start warmup process',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bot/accounts/:id/warmup-status
 * Get current warmup status for an account
 */
router.get('/:id/warmup-status', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    const status = await warmupService.getWarmupStatus(accountId);

    res.json({
      success: true,
      data: status,
      bot_id: req.botId,
      session_id: req.sessionId
    });

  } catch (error) {
    console.error('Error fetching warmup status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch warmup status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bot/accounts/:id/available-phases
 * Get available warmup phases for an account
 */
router.get('/:id/available-phases', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    const phases = await warmupService.getAvailablePhases(accountId);

    res.json({
      success: true,
      data: {
        account_id: accountId,
        available_phases: phases,
        count: phases.length
      },
      bot_id: req.botId,
      session_id: req.sessionId
    });

  } catch (error) {
    console.error('Error fetching available phases:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available phases',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bot/accounts/:id/content/:phase
 * Get assigned content for a specific warmup phase
 */
router.get('/:id/content/:phase', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const phase = req.params.phase as WarmupPhase;

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    if (!Object.values(WarmupPhase).includes(phase)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid warmup phase'
      });
    }

    // Get the warmup phase record
    const phaseResult = await warmupService.getAvailablePhases(accountId);
    const phaseRecord = phaseResult.find(p => p.phase === phase);

    if (!phaseRecord) {
      return res.status(404).json({
        success: false,
        error: 'Phase not found or not available'
      });
    }

    // Check if content is already assigned
    let assignedContent = null;
    
    if (phaseRecord.assigned_content_id || phaseRecord.assigned_text_id) {
      assignedContent = await contentService.getAssignedContent(phaseRecord.id);
    } else {
      // Auto-assign content if not already assigned
      const account = await warmupService.getWarmupStatus(accountId);
      
      // Get model ID from account
      const modelId = account.model_id || 1; // Fallback to model 1
      
      // Map phase to content type
      const contentType = phase as unknown as ContentType;
      
      assignedContent = await contentService.assignContentToPhase(
        accountId,
        phaseRecord.id,
        contentType,
        modelId
      );
    }

    res.json({
      success: true,
      data: {
        account_id: accountId,
        phase: phase,
        phase_id: phaseRecord.id,
        content: assignedContent,
        instructions: getPhaseInstructions(phase)
      },
      bot_id: req.botId,
      session_id: req.sessionId
    });

  } catch (error) {
    console.error('Error fetching phase content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch phase content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot/accounts/:id/start-phase/:phase
 * Mark a warmup phase as started
 */
router.post('/:id/start-phase/:phase', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const phase = req.params.phase as WarmupPhase;
    const botId = req.botId;
    const sessionId = req.sessionId;

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    if (!Object.values(WarmupPhase).includes(phase)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid warmup phase'
      });
    }

    const result = await warmupService.startPhase(accountId, phase, botId, sessionId);

    res.json({
      success: result.success,
      data: result,
      bot_id: botId,
      session_id: sessionId
    });

  } catch (error) {
    console.error('Error starting warmup phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start warmup phase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot/accounts/:id/complete-phase/:phase
 * Mark a warmup phase as completed
 */
router.post('/:id/complete-phase/:phase', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const phase = req.params.phase as WarmupPhase;
    const botId = req.botId;
    const { execution_time_ms, instagram_response, performance_score, engagement_metrics } = req.body;

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    if (!Object.values(WarmupPhase).includes(phase)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid warmup phase'
      });
    }

    const result = await warmupService.completePhase(
      accountId, 
      phase, 
      botId,
      execution_time_ms,
      instagram_response
    );

    // If phase completed successfully, mark content as used
    if (result.success && result.phaseId) {
      try {
        const assignedContent = await contentService.getAssignedContent(result.phaseId);
        if (assignedContent) {
          await contentService.markContentAsUsed(
            assignedContent.id,
            true,
            performance_score,
            engagement_metrics
          );
        }
      } catch (contentError) {
        console.warn('Failed to mark content as used:', contentError);
        // Don't fail the phase completion for content tracking errors
      }
    }

    res.json({
      success: result.success,
      data: result,
      bot_id: botId,
      session_id: req.sessionId
    });

  } catch (error) {
    console.error('Error completing warmup phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete warmup phase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot/accounts/:id/fail-phase/:phase
 * Mark a warmup phase as failed with review system integration
 */
router.post('/:id/fail-phase/:phase', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const phase = req.params.phase as WarmupPhase;
    const botId = req.botId;
    const { 
      error_message, 
      error_details, 
      failure_type = 'bot_error',
      instagram_response,
      should_escalate_to_review = false 
    } = req.body;

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    if (!Object.values(WarmupPhase).includes(phase)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid warmup phase'
      });
    }

    if (!error_message) {
      return res.status(400).json({
        success: false,
        error: 'Error message is required'
      });
    }

    // Validate failure type
    const validFailureTypes = [
      'bot_error', 'instagram_challenge', 'content_rejection', 'captcha',
      'rate_limit', 'account_suspended', 'network_error', 'timeout', 'other'
    ];
    if (!validFailureTypes.includes(failure_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid failure type',
        validFailureTypes
      });
    }

    const result = await warmupService.failPhase(
      accountId, 
      phase, 
      botId,
      error_message,
      error_details,
      failure_type,
      should_escalate_to_review
    );

    // Mark content as failed if assigned
    if (result.phaseId) {
      try {
        const assignedContent = await contentService.getAssignedContent(result.phaseId);
        if (assignedContent) {
          await contentService.markContentAsUsed(
            assignedContent.id,
            false,
            0,
            { error_message, error_details }
          );
        }
      } catch (contentError) {
        console.warn('Failed to mark content as failed:', contentError);
      }
    }

    res.json({
      success: result.success,
      data: result,
      bot_id: botId,
      session_id: req.sessionId
    });

  } catch (error) {
    console.error('Error failing warmup phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fail warmup phase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot/accounts/:id/complete-warmup
 * Mark entire warmup process as completed
 */
router.post('/:id/complete-warmup', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const botId = req.botId;

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    // Check if warmup is actually complete
    const isComplete = await warmupService.isWarmupComplete(accountId);

    if (!isComplete) {
      return res.status(400).json({
        success: false,
        error: 'Warmup process is not complete yet'
      });
    }

    // Update account to active state (this should already be done by completePhase)
    // But we can double-check here
    const status = await warmupService.getWarmupStatus(accountId);

    res.json({
      success: true,
      data: {
        account_id: accountId,
        warmup_complete: true,
        lifecycle_state: status.lifecycle_state,
        message: 'Warmup process completed successfully'
      },
      bot_id: botId,
      session_id: req.sessionId
    });

  } catch (error) {
    console.error('Error completing warmup process:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete warmup process',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper function to get phase-specific instructions
 */
function getPhaseInstructions(phase: WarmupPhase): string {
  const instructions = {
    [WarmupPhase.PFP]: 'Update profile picture using the assigned image. Ensure image is properly sized and follows Instagram guidelines.',
    [WarmupPhase.BIO]: 'Update bio using the assigned text. Keep it natural and avoid spam-like content.',
    [WarmupPhase.POST]: 'Create first post using assigned image and text. Wait for engagement before proceeding.',
    [WarmupPhase.HIGHLIGHT]: 'Create story highlight using assigned content. Organize highlights logically.',
    [WarmupPhase.STORY]: 'Post story using assigned content. Stories disappear after 24 hours.'
  };

  return instructions[phase] || 'Follow standard Instagram content guidelines.';
}

export default router; 