import express from 'express';
import { WarmupProcessService } from '../../services/WarmupProcessService';
import { ContentAssignmentService } from '../../services/ContentAssignmentService';
import { SprintProcessService } from '../../services/SprintProcessService';
import { botAuthMiddleware } from '../../middleware/botAuth';
import { WarmupPhase, ContentType } from '../../types/warmupProcess';
import { db } from '../../database';
import { spawn } from 'child_process';
import path from 'path';

const router = express.Router();
const warmupService = new WarmupProcessService();
const contentService = new ContentAssignmentService();
const sprintService = new SprintProcessService();

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
 * GET /api/bot/accounts/active
 * Get accounts ready for sprint content posting (post-warmup)
 */
router.get('/active', async (req: any, res: any) => {
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

    const accounts = await sprintService.getActiveAccounts(modelId, limitNum);

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
    console.error('Error fetching active accounts for bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch active accounts',
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
 * POST /api/bot/accounts/:id/get-sprint-content
 * Get next sprint content for posting (post-warmup accounts)
 */
router.post('/:id/get-sprint-content', async (req: any, res: any) => {
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

    const content = await sprintService.getNextSprintContent(accountId);

    if (!content) {
      return res.json({
        success: true,
        data: null,
        message: 'No sprint content available or account not ready',
        bot_id: botId,
        session_id: sessionId
      });
    }

    res.json({
      success: true,
      data: {
        content,
        account_id: accountId,
        content_type: content.content_type,
        file_path: content.file_path,
        caption: content.caption,
        sprint_info: {
          name: content.sprint_name,
          location: content.location
        },
        posting_instructions: {
          story_to_highlight: content.story_to_highlight,
          categories: content.content_categories
        }
      },
      bot_id: botId,
      session_id: sessionId
    });

  } catch (error) {
    console.error('Error fetching sprint content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sprint content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot/accounts/:id/get-emergency-content
 * Get emergency content for immediate posting
 */
router.post('/:id/get-emergency-content', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const { content_type = 'story', strategy = 'post_alongside' } = req.body;
    const botId = req.botId;
    const sessionId = req.sessionId;

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    if (!['story', 'post', 'highlight'].includes(content_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid content type. Must be story, post, or highlight'
      });
    }

    if (!['pause_sprints', 'post_alongside', 'override_conflicts'].includes(strategy)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid strategy. Must be pause_sprints, post_alongside, or override_conflicts'
      });
    }

    const content = await sprintService.getEmergencyContent(accountId, content_type, strategy);

    if (!content) {
      return res.json({
        success: true,
        data: null,
        message: 'No emergency content available',
        bot_id: botId,
        session_id: sessionId
      });
    }

    res.json({
      success: true,
      data: {
        content,
        account_id: accountId,
        emergency_info: {
          requires_conflict_resolution: content.requires_conflict_resolution,
          conflicts: content.conflicts,
          strategy: content.emergency_strategy
        },
        posting_instructions: {
          immediate: true,
          priority: 'high'
        }
      },
      bot_id: botId,
      session_id: sessionId
    });

  } catch (error) {
    console.error('Error fetching emergency content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch emergency content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot/accounts/:id/get-highlight-content
 * Get highlight maintenance content
 */
router.post('/:id/get-highlight-content', async (req: any, res: any) => {
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

    const content = await sprintService.getHighlightMaintenanceContent(accountId);

    if (!content) {
      return res.json({
        success: true,
        data: null,
        message: 'No highlight maintenance due',
        bot_id: botId,
        session_id: sessionId
      });
    }

    res.json({
      success: true,
      data: {
        content,
        account_id: accountId,
        highlight_info: {
          name: content.highlight_name,
          maintenance_type: content.maintenance_type,
          position: content.position
        },
        posting_instructions: {
          content_type: 'highlight',
          add_to_existing: true
        }
      },
      bot_id: botId,
      session_id: sessionId
    });

  } catch (error) {
    console.error('Error fetching highlight content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch highlight content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot/accounts/:id/mark-content-posted
 * Mark content as successfully posted
 */
router.post('/:id/mark-content-posted', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const { queue_id, content_type, emergency_content = false } = req.body;
    const botId = req.botId;
    const sessionId = req.sessionId;

    if (isNaN(accountId) || !queue_id) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID or queue ID'
      });
    }

    await sprintService.markContentPosted(queue_id, accountId);

    // If it was highlight maintenance, update the schedule
    if (content_type === 'highlight' && !emergency_content) {
      // Get highlight ID from the content that was posted
      const highlightResult = await db.query(`
        SELECT ahg.id 
        FROM account_highlight_groups ahg
        WHERE ahg.account_id = $1 
          AND ahg.maintenance_next_due <= CURRENT_TIMESTAMP
        ORDER BY ahg.maintenance_next_due ASC
        LIMIT 1
      `, [accountId]);

      if (highlightResult.rows.length > 0) {
        await sprintService.updateHighlightMaintenance(accountId, highlightResult.rows[0].id);
      }
    }

    res.json({
      success: true,
      data: {
        account_id: accountId,
        queue_id: queue_id,
        posted_at: new Date().toISOString(),
        message: 'Content marked as posted successfully'
      },
      bot_id: botId,
      session_id: sessionId
    });

  } catch (error) {
    console.error('Error marking content as posted:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark content as posted',
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
 * GET /api/bot/accounts/:id/next-phase
 * Get next available phase for bot with content and script info
 */
router.get('/:id/next-phase', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const botId = req.botId;

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    const nextPhase = await warmupService.getNextAvailablePhaseForBot(accountId, botId);

    if (!nextPhase) {
      return res.json({
        success: true,
        data: null,
        message: 'No phases available or bot constraint violation',
        bot_id: botId,
        session_id: req.sessionId
      });
    }

    res.json({
      success: true,
      data: nextPhase, // Now includes complete script_sequence from service
      bot_id: botId,
      session_id: req.sessionId
    });

  } catch (error) {
    console.error('Error fetching next available phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch next available phase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot/accounts/:id/complete-manual-setup
 * Complete manual setup phase and trigger first random phase assignment
 */
router.post('/:id/complete-manual-setup', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    const userId = req.botId; // Using bot ID as user ID for now

    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    const result = await warmupService.completeManualSetup(accountId, userId);

    res.json({
      success: result.success,
      data: result,
      bot_id: req.botId,
      session_id: req.sessionId
    });

  } catch (error) {
    console.error('Error completing manual setup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete manual setup',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot/accounts/:id/execute-phase/:phase
 * Execute a complete warmup phase with all required scripts
 */
router.post('/:id/execute-phase/:phase', async (req: any, res: any) => {
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

    // Get the complete phase information with script sequence
    const phaseInfo = await warmupService.getNextAvailablePhaseForBot(accountId, botId);
    
    if (!phaseInfo || phaseInfo.phase !== phase) {
      return res.status(400).json({
        success: false,
        error: `Phase ${phase} is not available for execution`,
        available_phase: phaseInfo?.phase || null
      });
    }

    // Start the phase
    const startResult = await warmupService.startPhase(accountId, phase, botId, sessionId);
    
    if (!startResult.success) {
      return res.status(400).json({
        success: false,
        error: startResult.message,
        details: startResult.error
      });
    }

    // Return complete execution information
    res.json({
      success: true,
      data: {
        phase_id: startResult.phaseId,
        account_id: accountId,
        phase: phase,
        execution_info: {
          ...phaseInfo,
          phase_started: true,
          execution_instructions: {
            step1: 'Execute API scripts in sequence',
            step2: 'Execute Lua scripts in sequence', 
            step3: 'Report completion with results',
            step4: phaseInfo.script_sequence?.post_execution_action ? 
              `Special action required: ${phaseInfo.script_sequence.post_execution_action}` : 
              'No special action required'
          }
        }
      },
      bot_id: botId,
      session_id: sessionId
    });

  } catch (error) {
    console.error('Error executing warmup phase:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute warmup phase',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bot/accounts/:id/phase-script-sequence/:phase
 * Get complete script sequence for a specific phase (for debugging/testing)
 */
router.get('/:id/phase-script-sequence/:phase', async (req: any, res: any) => {
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

    // Get account container number
    const accountResult = await db.query(`
      SELECT container_number FROM accounts WHERE id = $1
    `, [accountId]);

    if (accountResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    const containerNumber = accountResult.rows[0].container_number;
    const scriptSequence = warmupService.getPhaseScriptSequence(phase, containerNumber);

    res.json({
      success: true,
      data: {
        account_id: accountId,
        container_number: containerNumber,
        phase: phase,
        script_sequence: scriptSequence
      },
      bot_id: req.botId,
      session_id: req.sessionId
    });

  } catch (error) {
    console.error('Error fetching phase script sequence:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch phase script sequence',
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
 * POST /api/bot/accounts/create-containers
 * Create multiple iPhone containers with real-time progress updates
 */
router.post('/create-containers', async (req: any, res: any) => {
  try {
    const { count, startNumber, iphoneUrl } = req.body;

    // Validate input
    if (!count || !startNumber || count < 1 || startNumber < 1) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message: 'Count and startNumber must be positive integers'
      });
    }

    if (count > 50) {
      return res.status(400).json({
        success: false,
        error: 'Count too large',
        message: 'Cannot create more than 50 containers at once'
      });
    }

    // Set up Server-Sent Events for real-time progress
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    const sendEvent = (data: any) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    // Send initial acknowledgment
    sendEvent({
      type: 'start',
      message: 'Container creation process initiated',
      count,
      startNumber,
      iphoneUrl: iphoneUrl || 'default',
      botId: req.botId,
      sessionId: req.sessionId
    });

    try {
      // Import the BatchContainerCreator class
      const BatchContainerCreator = require('../../../../bot/scripts/container_creation/batch_create_containers.js');
      
      // Create instance with progress callback
      const creator = new BatchContainerCreator(
        iphoneUrl || 'http://192.168.178.65:46952',
        (update: any) => {
          sendEvent({
            ...update,
            timestamp: new Date().toISOString()
          });
        }
      );

      // Test connection first
      const connectionTest = await creator.testConnection();
      if (!connectionTest) {
        sendEvent({
          type: 'error',
          message: 'iPhone connection test failed',
          status: 'connection_failed',
          final: true
        });
        res.end();
        return;
      }

      // Start container creation
      const results = await creator.createContainers(count, startNumber);
      
      // Send final results
      sendEvent({
        type: 'final_results',
        message: 'Container creation process completed',
        results,
        status: results.successful === results.total ? 'success' : 'partial_success',
        final: true
      });

    } catch (error) {
      console.error('Container creation error:', error);
      sendEvent({
        type: 'error',
        message: `Container creation failed: ${error.message}`,
        error: error.message,
        status: 'failed',
        final: true
      });
    }

    res.end();

  } catch (error) {
    console.error('Container creation endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper function to get phase-specific instructions
 */
function getPhaseInstructions(phase: WarmupPhase): string {
  const instructions = {
    [WarmupPhase.MANUAL_SETUP]: 'Complete manual account setup. Set up proxy, verify login, and prepare for automated warmup.',
    [WarmupPhase.BIO]: 'Update bio using the assigned text. Keep it natural and avoid spam-like content.',
    // SET_TO_PRIVATE removed - accounts are set to private after warmup completion
    [WarmupPhase.GENDER]: 'Update gender to female in account settings. No content assignment needed.',
    [WarmupPhase.NAME]: 'Update display name using the assigned text. Choose a natural-sounding name.',
    [WarmupPhase.USERNAME]: 'Update username. IMPORTANT: Update database after successful change.',
    [WarmupPhase.FIRST_HIGHLIGHT]: 'Create first story highlight using assigned image and group name. This enables future highlights.',
    [WarmupPhase.NEW_HIGHLIGHT]: 'Create additional story highlight. Requires first highlight to be completed.',
    [WarmupPhase.POST_CAPTION]: 'Create post using assigned image and caption text. Wait for engagement.',
    [WarmupPhase.POST_NO_CAPTION]: 'Create post using assigned image only. No caption text.',
    [WarmupPhase.STORY_CAPTION]: 'Post story using assigned image and caption text. Stories disappear after 24 hours.',
    [WarmupPhase.STORY_NO_CAPTION]: 'Post story using assigned image only. No caption text.'
  };

  return instructions[phase] || 'Follow standard Instagram content guidelines.';
}

export default router; 