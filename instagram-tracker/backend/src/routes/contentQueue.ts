import express from 'express';
import { QueueManagementService } from '../services/QueueManagementService';
import { QueueControlService } from '../services/QueueControlService';
import { QueueFilters, QueueUpdate, EmergencyContentRequest } from '../types/queue';

const router = express.Router();
const queueManager = new QueueManagementService();
const queueController = new QueueControlService();

/**
 * GET /api/content-queue
 * List all queue items with filtering and pagination
 */
router.get('/', async (req: any, res: any) => {
  try {
    const filters: QueueFilters = {
      account_id: req.query.account_id ? parseInt(req.query.account_id) : undefined,
      sprint_assignment_id: req.query.sprint_assignment_id ? parseInt(req.query.sprint_assignment_id) : undefined,
      content_type: req.query.content_type,
      status: req.query.status,
      emergency_content: req.query.emergency_content === 'true' ? true : req.query.emergency_content === 'false' ? false : undefined,
      scheduled_from: req.query.scheduled_from ? new Date(req.query.scheduled_from) : undefined,
      scheduled_to: req.query.scheduled_to ? new Date(req.query.scheduled_to) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined,
      sort_by: req.query.sort_by,
      sort_order: req.query.sort_order
    };

    const result = await queueManager.getQueueItems(filters);

    res.json({
      success: true,
      data: result.items,
      metadata: {
        total_count: result.total_count,
        page_info: result.page_info,
        filters_applied: filters
      }
    });

  } catch (error) {
    console.error('Get queue items error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve queue items'
    });
  }
});

/**
 * GET /api/content-queue/account/:id
 * Get queue for specific account
 */
router.get('/account/:id', async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id);
    
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid account ID'
      });
    }

    const queueItems = await queueManager.getAccountQueue(accountId);

    res.json({
      success: true,
      data: queueItems,
      metadata: {
        account_id: accountId,
        total_items: queueItems.length
      }
    });

  } catch (error) {
    console.error('Get account queue error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve account queue'
    });
  }
});

/**
 * GET /api/content-queue/upcoming
 * Get upcoming content across all accounts
 */
router.get('/upcoming', async (req: any, res: any) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours) : 24;
    
    const upcomingContent = await queueManager.getUpcomingContent(hours);

    res.json({
      success: true,
      data: upcomingContent,
      metadata: {
        time_window_hours: hours,
        total_items: upcomingContent.length
      }
    });

  } catch (error) {
    console.error('Get upcoming content error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve upcoming content'
    });
  }
});

/**
 * GET /api/content-queue/overdue
 * Get overdue content items requiring attention
 */
router.get('/overdue', async (req: any, res: any) => {
  try {
    const overdueContent = await queueManager.getOverdueContent();

    res.json({
      success: true,
      data: overdueContent,
      metadata: {
        total_overdue: overdueContent.length
      }
    });

  } catch (error) {
    console.error('Get overdue content error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve overdue content'
    });
  }
});

/**
 * GET /api/content-queue/stats
 * Queue statistics and health metrics
 */
router.get('/stats', async (req: any, res: any) => {
  try {
    const stats = await queueManager.getQueueStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Get queue stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve queue statistics'
    });
  }
});

/**
 * GET /api/content-queue/health
 * Queue health report
 */
router.get('/health', async (req: any, res: any) => {
  try {
    const healthReport = await queueManager.checkQueueHealth();

    res.json({
      success: true,
      data: healthReport
    });

  } catch (error) {
    console.error('Get queue health error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to check queue health'
    });
  }
});

/**
 * GET /api/content-queue/summary
 * Queue summary for dashboard
 */
router.get('/summary', async (req: any, res: any) => {
  try {
    const summary = await queueManager.getQueueSummary();

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('Get queue summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to retrieve queue summary'
    });
  }
});

/**
 * PUT /api/content-queue/:id/reschedule
 * Change posting time for specific item
 */
router.put('/:id/reschedule', async (req: any, res: any) => {
  try {
    const itemId = parseInt(req.params.id);
    const { new_time } = req.body;

    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid item ID'
      });
    }

    if (!new_time) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'new_time is required'
      });
    }

    const newTime = new Date(new_time);
    if (isNaN(newTime.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid date format for new_time'
      });
    }

    // Validate item can be rescheduled
    const validation = await queueController.validateQueueItemModification(itemId);
    if (!validation.can_modify) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: validation.reason
      });
    }

    await queueController.rescheduleItem(itemId, newTime);

    res.json({
      success: true,
      message: 'Item rescheduled successfully',
      data: {
        item_id: itemId,
        new_scheduled_time: newTime
      }
    });

  } catch (error) {
    console.error('Reschedule item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to reschedule item'
    });
  }
});

/**
 * POST /api/content-queue/:id/retry
 * Retry failed content item
 */
router.post('/:id/retry', async (req: any, res: any) => {
  try {
    const itemId = parseInt(req.params.id);

    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid item ID'
      });
    }

    await queueController.retryFailedItem(itemId);

    res.json({
      success: true,
      message: 'Item retry initiated successfully',
      data: {
        item_id: itemId
      }
    });

  } catch (error) {
    console.error('Retry item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to retry item'
    });
  }
});

/**
 * DELETE /api/content-queue/:id
 * Remove item from queue
 */
router.delete('/:id', async (req: any, res: any) => {
  try {
    const itemId = parseInt(req.params.id);

    if (isNaN(itemId)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid item ID'
      });
    }

    // Validate item can be removed
    const validation = await queueController.validateQueueItemModification(itemId);
    if (!validation.can_modify) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: validation.reason
      });
    }

    await queueController.removeFromQueue(itemId);

    res.json({
      success: true,
      message: 'Item removed from queue successfully',
      data: {
        item_id: itemId
      }
    });

  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to remove item'
    });
  }
});

/**
 * PUT /api/content-queue/bulk-update
 * Bulk operations on multiple items
 */
router.put('/bulk-update', async (req: any, res: any) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'updates array is required and must not be empty'
      });
    }

    // Validate each update
    for (const update of updates) {
      if (!update.item_id || typeof update.item_id !== 'number') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Each update must have a valid item_id'
        });
      }
    }

    const result = await queueController.bulkUpdateQueue(updates);

    res.json({
      success: true,
      message: 'Bulk update completed',
      data: result
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to perform bulk update'
    });
  }
});

/**
 * POST /api/content-queue/emergency-insert
 * Insert emergency content with priority
 */
router.post('/emergency-insert', async (req: any, res: any) => {
  try {
    const emergencyRequest: EmergencyContentRequest = req.body;

    // Validate required fields
    if (!emergencyRequest.account_id || !emergencyRequest.content_type || !emergencyRequest.strategy) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'account_id, content_type, and strategy are required'
      });
    }

    // Validate content_type
    if (!['story', 'post', 'highlight'].includes(emergencyRequest.content_type)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'content_type must be story, post, or highlight'
      });
    }

    // Validate strategy
    if (!['pause_sprints', 'post_alongside', 'override_conflicts'].includes(emergencyRequest.strategy)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'strategy must be pause_sprints, post_alongside, or override_conflicts'
      });
    }

    // This would typically be handled by EmergencyContentHandler
    // For now, we'll create a placeholder response
    res.json({
      success: true,
      message: 'Emergency content insertion request received',
      data: {
        account_id: emergencyRequest.account_id,
        content_type: emergencyRequest.content_type,
        strategy: emergencyRequest.strategy,
        priority: emergencyRequest.priority || 1,
        status: 'pending_implementation'
      }
    });

  } catch (error) {
    console.error('Emergency insert error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to insert emergency content'
    });
  }
});

/**
 * POST /api/content-queue/cleanup
 * Clean up old completed/failed queue items
 */
router.post('/cleanup', async (req: any, res: any) => {
  try {
    const { days_old = 30 } = req.body;

    if (days_old < 1 || days_old > 365) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'days_old must be between 1 and 365'
      });
    }

    const deletedCount = await queueController.cleanupOldQueueItems(days_old);

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: {
        deleted_items: deletedCount,
        days_old: days_old
      }
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to cleanup old items'
    });
  }
});

export default router; 