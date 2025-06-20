import express from 'express';
import { BotActivityMonitor } from '../services/botActivityMonitor';
import { MaintenanceTrackingService } from '../services/maintenanceTracking';

const router = express.Router();
const botMonitor = new BotActivityMonitor();
const maintenanceTracker = new MaintenanceTrackingService();

/**
 * POST /api/bot-integration/activity/start
 * Bot reports start of an activity
 */
router.post('/activity/start', async (req, res) => {
  try {
    const { bot_id, account_id, activity_type, metadata } = req.body;

    if (!bot_id || !activity_type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bot_id, activity_type'
      });
    }

    const activityId = await botMonitor.recordActivityStart(
      bot_id,
      account_id || null,
      activity_type,
      metadata || {}
    );

    res.json({
      success: true,
      data: {
        activity_id: activityId,
        bot_id,
        account_id,
        activity_type,
        started_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error recording activity start:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record activity start',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot-integration/activity/complete
 * Bot reports completion of an activity
 */
router.post('/activity/complete', async (req, res) => {
  try {
    const { activity_id, status, error_message, metadata } = req.body;

    if (!activity_id || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: activity_id, status'
      });
    }

    if (!['completed', 'failed'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Status must be either "completed" or "failed"'
      });
    }

    await botMonitor.recordActivityCompletion(
      activity_id,
      status,
      error_message || null,
      metadata || {}
    );

    res.json({
      success: true,
      data: {
        activity_id,
        status,
        completed_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error recording activity completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record activity completion',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot-integration/content/uploaded
 * Bot reports successful content upload
 */
router.post('/content/uploaded', async (req, res) => {
  try {
    const { queue_item_id, instagram_post_id, bot_id, posted_at, metadata } = req.body;

    if (!queue_item_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: queue_item_id'
      });
    }

    const postedAtDate = posted_at ? new Date(posted_at) : new Date();
    
    await maintenanceTracker.markContentPosted(queue_item_id, postedAtDate);

    // Record bot activity if activity details provided
    if (bot_id) {
      const activityId = await botMonitor.recordActivityStart(
        bot_id,
        null, // Will be filled from queue item
        'upload_content',
        { queue_item_id, instagram_post_id, ...metadata }
      );
      
      await botMonitor.recordActivityCompletion(
        activityId,
        'completed',
        null,
        { instagram_post_id, posted_at: postedAtDate }
      );
    }

    res.json({
      success: true,
      data: {
        queue_item_id,
        instagram_post_id,
        posted_at: postedAtDate,
        status: 'uploaded'
      }
    });
  } catch (error) {
    console.error('Error recording content upload:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record content upload',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot-integration/content/failed
 * Bot reports failed content upload
 */
router.post('/content/failed', async (req, res) => {
  try {
    const { queue_item_id, error_message, error_code, bot_id, retry_delay_minutes, metadata } = req.body;

    if (!queue_item_id || !error_message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: queue_item_id, error_message'
      });
    }

    await maintenanceTracker.markContentFailed(queue_item_id, error_message);

    // Auto-retry if delay specified
    if (retry_delay_minutes && retry_delay_minutes > 0) {
      await maintenanceTracker.retryFailedContent(queue_item_id, retry_delay_minutes);
    }

    // Record bot activity if bot_id provided
    if (bot_id) {
      const activityId = await botMonitor.recordActivityStart(
        bot_id,
        null,
        'upload_content',
        { queue_item_id, ...metadata }
      );
      
      await botMonitor.recordActivityCompletion(
        activityId,
        'failed',
        error_message,
        { error_code, retry_delay_minutes }
      );
    }

    res.json({
      success: true,
      data: {
        queue_item_id,
        error_message,
        error_code,
        status: 'failed',
        will_retry: !!retry_delay_minutes,
        retry_delay_minutes: retry_delay_minutes || null
      }
    });
  } catch (error) {
    console.error('Error recording content failure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record content failure',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bot-integration/content/pending/:bot_id
 * Get pending content for specific bot
 */
router.get('/content/pending/:bot_id', async (req, res) => {
  try {
    const botId = req.params.bot_id;
    const limit = parseInt(req.query.limit as string) || 10;

    // Get pending content queue items
    const pendingContent = await maintenanceTracker.getPendingContentQueue(limit);

    // Filter for this bot (simplified - in real app you'd have bot-to-account mapping)
    // For now, return all pending content
    const botContent = pendingContent.slice(0, limit);

    res.json({
      success: true,
      data: botContent.map(item => ({
        queue_item_id: item.id,
        account_id: item.account_id,
        account_username: item.account_username,
        content_type: item.content_type,
        scheduled_time: item.scheduled_time,
        emergency_content: item.emergency_content,
        is_overdue: item.is_overdue,
        time_until_due_minutes: item.time_until_due_minutes,
        sprint_name: item.sprint_name
      })),
      summary: {
        total_pending: botContent.length,
        emergency_items: botContent.filter(item => item.emergency_content).length,
        overdue_items: botContent.filter(item => item.is_overdue).length
      }
    });
  } catch (error) {
    console.error('Error fetching pending content for bot:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot-integration/status/heartbeat
 * Bot sends periodic heartbeat with status
 */
router.post('/status/heartbeat', async (req, res) => {
  try {
    const { bot_id, status, current_script, accounts_processing, metadata } = req.body;

    if (!bot_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: bot_id'
      });
    }

    // Record heartbeat as health check activity
    const activityId = await botMonitor.recordActivityStart(
      bot_id,
      null,
      'health_check',
      {
        heartbeat: true,
        status,
        current_script,
        accounts_processing,
        ...metadata
      }
    );

    await botMonitor.recordActivityCompletion(
      activityId,
      'completed',
      null,
      { heartbeat_received: new Date() }
    );

    res.json({
      success: true,
      data: {
        bot_id,
        heartbeat_received: new Date(),
        status: 'acknowledged'
      }
    });
  } catch (error) {
    console.error('Error processing bot heartbeat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process heartbeat',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bot-integration/status/:bot_id
 * Get current status for specific bot
 */
router.get('/status/:bot_id', async (req, res) => {
  try {
    const botId = req.params.bot_id;
    const botStatus = await botMonitor.getBotStatus(botId);

    if (!botStatus) {
      return res.status(404).json({
        success: false,
        error: 'Bot not found'
      });
    }

    res.json({
      success: true,
      data: botStatus
    });
  } catch (error) {
    console.error('Error fetching bot status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot-integration/script/started
 * Bot reports script execution start
 */
router.post('/script/started', async (req, res) => {
  try {
    const { bot_id, script_name, account_id, metadata } = req.body;

    if (!bot_id || !script_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: bot_id, script_name'
      });
    }

    const activityId = await botMonitor.recordActivityStart(
      bot_id,
      account_id || null,
      'script_execution',
      { script_name, ...metadata }
    );

    res.json({
      success: true,
      data: {
        activity_id: activityId,
        bot_id,
        script_name,
        account_id,
        started_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error recording script start:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record script start',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/bot-integration/script/completed
 * Bot reports script execution completion
 */
router.post('/script/completed', async (req, res) => {
  try {
    const { activity_id, success, error_message, results, metadata } = req.body;

    if (!activity_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: activity_id'
      });
    }

    const status = success ? 'completed' : 'failed';
    
    await botMonitor.recordActivityCompletion(
      activity_id,
      status,
      error_message || null,
      { results, ...metadata }
    );

    res.json({
      success: true,
      data: {
        activity_id,
        status,
        completed_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error recording script completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record script completion',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/bot-integration/performance/:bot_id
 * Get performance metrics for specific bot
 */
router.get('/performance/:bot_id', async (req, res) => {
  try {
    const botId = req.params.bot_id;
    const days = parseInt(req.query.days as string) || 7;
    
    const metrics = await botMonitor.getBotPerformanceMetrics(days);
    const botMetrics = metrics.filter(metric => metric.bot_id === botId);

    res.json({
      success: true,
      data: botMetrics,
      summary: {
        days_analyzed: days,
        total_activity_types: new Set(botMetrics.map(m => m.activity_type)).size,
        overall_success_rate: botMetrics.length > 0 ? 
          (botMetrics.reduce((sum, m) => sum + parseInt(m.successful_activities), 0) / 
           botMetrics.reduce((sum, m) => sum + parseInt(m.total_activities), 0) * 100).toFixed(2) + '%' : 'N/A'
      }
    });
  } catch (error) {
    console.error('Error fetching bot performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 