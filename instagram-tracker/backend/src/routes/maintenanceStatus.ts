import express from 'express';
import { MaintenanceTrackingService } from '../services/maintenanceTracking';
import { BotActivityMonitor } from '../services/botActivityMonitor';

const router = express.Router();
const maintenanceTracker = new MaintenanceTrackingService();
const botMonitor = new BotActivityMonitor();

/**
 * GET /api/maintenance-status/accounts
 * Get maintenance status for all accounts
 */
router.get('/accounts', async (req, res) => {
  try {
    const accountStatuses = await maintenanceTracker.getAllAccountsStatus();
    
    // Enhance with bot status information
    const botStatuses = await botMonitor.getAllBotStatuses();
    const botStatusMap = new Map(botStatuses.map(bot => [bot.bot_id, bot]));
    
    const enhancedStatuses = accountStatuses.map(account => {
      // Find bot handling this account (simplified - in real app you'd have account-to-bot mapping)
      const botStatus = botStatuses.find(bot => bot.accounts_assigned > 0);
      
      return {
        ...account,
        bot_status: botStatus?.status || 'unknown',
        bot_id: botStatus?.bot_id || null,
        bot_last_seen: botStatus?.last_seen || null
      };
    });

    res.json({
      success: true,
      data: enhancedStatuses,
      summary: {
        total_accounts: enhancedStatuses.length,
        accounts_with_queued_content: enhancedStatuses.filter(a => a.total_queued > 0).length,
        accounts_with_overdue_content: enhancedStatuses.filter(a => a.overdue_count > 0).length,
        total_bots_active: botStatuses.filter(b => b.status === 'idle' || b.status === 'running').length
      }
    });
  } catch (error) {
    console.error('Error fetching account maintenance status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account maintenance status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/maintenance-status/accounts/:id
 * Get maintenance status for specific account
 */
router.get('/accounts/:id', async (req, res) => {
  try {
    const accountId = parseInt(req.params.id);
    
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }

    const accountStatus = await maintenanceTracker.getAccountStatus(accountId);
    
    if (!accountStatus) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }

    res.json({
      success: true,
      data: accountStatus
    });
  } catch (error) {
    console.error('Error fetching account status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch account status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/maintenance-status/queue/pending
 * Get pending content queue items
 */
router.get('/queue/pending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const pendingContent = await maintenanceTracker.getPendingContentQueue(limit);

    res.json({
      success: true,
      data: pendingContent,
      summary: {
        total_pending: pendingContent.length,
        emergency_content: pendingContent.filter(item => item.emergency_content).length,
        overdue_content: pendingContent.filter(item => item.is_overdue).length,
        content_types: {
          story: pendingContent.filter(item => item.content_type === 'story').length,
          post: pendingContent.filter(item => item.content_type === 'post').length,
          highlight: pendingContent.filter(item => item.content_type === 'highlight').length
        }
      }
    });
  } catch (error) {
    console.error('Error fetching pending content queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending content queue',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/maintenance-status/queue/overdue
 * Get overdue content items
 */
router.get('/queue/overdue', async (req, res) => {
  try {
    const overdueContent = await maintenanceTracker.getOverdueContent();

    res.json({
      success: true,
      data: overdueContent,
      summary: {
        total_overdue: overdueContent.length,
        most_overdue_minutes: overdueContent.length > 0 ? Math.abs(Math.min(...overdueContent.map(item => item.time_until_due_minutes))) : 0,
        accounts_affected: new Set(overdueContent.map(item => item.account_id)).size
      }
    });
  } catch (error) {
    console.error('Error fetching overdue content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch overdue content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/maintenance-status/queue/:id/mark-posted
 * Mark content as posted by bot
 */
router.post('/queue/:id/mark-posted', async (req, res) => {
  try {
    const queueItemId = parseInt(req.params.id);
    const { posted_at, instagram_post_id, metadata } = req.body;

    if (isNaN(queueItemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid queue item ID'
      });
    }

    const postedAt = posted_at ? new Date(posted_at) : new Date();
    
    await maintenanceTracker.markContentPosted(queueItemId, postedAt);

    res.json({
      success: true,
      message: 'Content marked as posted successfully',
      data: {
        queue_item_id: queueItemId,
        posted_at: postedAt,
        instagram_post_id,
        metadata
      }
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
 * POST /api/maintenance-status/queue/:id/mark-failed
 * Mark content as failed by bot
 */
router.post('/queue/:id/mark-failed', async (req, res) => {
  try {
    const queueItemId = parseInt(req.params.id);
    const { error_message, error_code, retry_delay_minutes } = req.body;

    if (isNaN(queueItemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid queue item ID'
      });
    }

    if (!error_message) {
      return res.status(400).json({
        success: false,
        error: 'Error message is required'
      });
    }

    await maintenanceTracker.markContentFailed(queueItemId, error_message);

    // If retry delay specified, automatically retry
    if (retry_delay_minutes && retry_delay_minutes > 0) {
      await maintenanceTracker.retryFailedContent(queueItemId, retry_delay_minutes);
    }

    res.json({
      success: true,
      message: 'Content marked as failed successfully',
      data: {
        queue_item_id: queueItemId,
        error_message,
        error_code,
        will_retry: !!retry_delay_minutes,
        retry_delay_minutes: retry_delay_minutes || null
      }
    });
  } catch (error) {
    console.error('Error marking content as failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark content as failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/maintenance-status/queue/:id/retry
 * Retry failed content
 */
router.post('/queue/:id/retry', async (req, res) => {
  try {
    const queueItemId = parseInt(req.params.id);
    const { delay_minutes } = req.body;

    if (isNaN(queueItemId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid queue item ID'
      });
    }

    const delayMinutes = delay_minutes || 30;
    await maintenanceTracker.retryFailedContent(queueItemId, delayMinutes);

    res.json({
      success: true,
      message: 'Content retry scheduled successfully',
      data: {
        queue_item_id: queueItemId,
        delay_minutes: delayMinutes,
        retry_at: new Date(Date.now() + (delayMinutes * 60 * 1000))
      }
    });
  } catch (error) {
    console.error('Error retrying content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retry content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/maintenance-status/analytics
 * Get maintenance analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const analytics = await maintenanceTracker.getMaintenanceAnalytics(days);

    // Calculate summary statistics
    const summary = analytics.reduce((acc, day) => {
      acc.total_posts += parseInt(day.posts_count);
      acc.total_emergency += parseInt(day.emergency_count);
      acc.total_failures += parseInt(day.failure_count);
      return acc;
    }, { total_posts: 0, total_emergency: 0, total_failures: 0 });

    res.json({
      success: true,
      data: analytics,
      summary: {
        ...summary,
        days_analyzed: days,
        success_rate: summary.total_posts > 0 ? 
          ((summary.total_posts - summary.total_failures) / summary.total_posts * 100).toFixed(2) + '%' : 'N/A',
        emergency_content_percentage: summary.total_posts > 0 ? 
          (summary.total_emergency / summary.total_posts * 100).toFixed(2) + '%' : 'N/A'
      }
    });
  } catch (error) {
    console.error('Error fetching maintenance analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch maintenance analytics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/maintenance-status/bots
 * Get all bot statuses
 */
router.get('/bots', async (req, res) => {
  try {
    const botStatuses = await botMonitor.getAllBotStatuses();

    res.json({
      success: true,
      data: botStatuses,
      summary: {
        total_bots: botStatuses.length,
        connected_bots: botStatuses.filter(bot => bot.status === 'idle' || bot.status === 'running').length,
        running_bots: botStatuses.filter(bot => bot.status === 'running').length,
        disconnected_bots: botStatuses.filter(bot => bot.status === 'disconnected').length,
        total_accounts_assigned: botStatuses.reduce((sum, bot) => sum + bot.accounts_assigned, 0)
      }
    });
  } catch (error) {
    console.error('Error fetching bot statuses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot statuses',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/maintenance-status/bots/:id/activity
 * Get activity history for specific bot
 */
router.get('/bots/:id/activity', async (req, res) => {
  try {
    const botId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 100;
    
    const activity = await botMonitor.getBotActivity(botId, undefined, limit);

    res.json({
      success: true,
      data: activity,
      summary: {
        total_activities: activity.length,
        successful_activities: activity.filter(a => a.status === 'completed').length,
        failed_activities: activity.filter(a => a.status === 'failed').length,
        average_duration: activity
          .filter(a => a.duration_seconds !== null)
          .reduce((sum, a) => sum + (a.duration_seconds || 0), 0) / 
          activity.filter(a => a.duration_seconds !== null).length || 0
      }
    });
  } catch (error) {
    console.error('Error fetching bot activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bot activity',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/maintenance-status/bots/:id/health-check
 * Trigger manual health check for bot
 */
router.post('/bots/:id/health-check', async (req, res) => {
  try {
    const botId = req.params.id;
    const success = await botMonitor.performHealthCheck(botId);

    res.json({
      success: true,
      data: {
        bot_id: botId,
        health_check_success: success,
        checked_at: new Date()
      }
    });
  } catch (error) {
    console.error('Error performing health check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform health check',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 