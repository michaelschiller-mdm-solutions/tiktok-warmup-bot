import { db } from '../database';
import {
  EmergencyContent,
  QueueAdjustment,
  ConflictStrategy,
  EmergencyPriority
} from '../types/emergencyContent';
import { QueueItemDetailed } from '../types/queue';
import { QueueManagementService } from './QueueManagementService';
import { SprintAssignmentService } from './SprintAssignmentService';

export class EmergencyQueueService {
  private queueManagementService: QueueManagementService;
  private sprintAssignmentService: SprintAssignmentService;

  constructor() {
    this.queueManagementService = new QueueManagementService();
    this.sprintAssignmentService = new SprintAssignmentService();
  }

  async insertEmergencyContent(
    accountId: number,
    emergencyContent: EmergencyContent,
    strategy: ConflictStrategy
  ): Promise<QueueAdjustment[]> {
    const adjustments: QueueAdjustment[] = [];
    
    try {
      // 1. Get current queue for account
      const currentQueue = await this.queueManagementService.getAccountQueue(accountId);
      
      // 2. Determine insertion point
      const insertionTime = emergencyContent.post_immediately 
        ? new Date() 
        : this.calculateInsertionTime(currentQueue, emergencyContent.priority);
      
      // 3. Handle strategy-specific adjustments
      switch (strategy) {
        case 'pause_sprints':
          adjustments.push(...await this.pauseActiveSprints(accountId, insertionTime));
          break;
          
        case 'post_alongside':
          // Insert without affecting existing content
          break;
          
        case 'override_conflicts':
          adjustments.push(...await this.overrideConflicts(accountId, insertionTime));
          break;
          
        case 'skip_conflicted':
          // No adjustments needed - conflicts were already detected
          break;
      }
      
      // 4. Insert emergency content into queue
      await this.insertIntoQueue(accountId, emergencyContent, insertionTime);
      
      // 5. Adjust subsequent queue items if necessary
      if (strategy === 'pause_sprints') {
        adjustments.push(...await this.adjustSubsequentItems(accountId, insertionTime));
      }
      
      return adjustments;
      
    } catch (error) {
      console.error('Emergency queue insertion failed:', error);
      throw new Error(`Failed to insert emergency content: ${error.message}`);
    }
  }

  private async pauseActiveSprints(
    accountId: number, 
    pauseTime: Date
  ): Promise<QueueAdjustment[]> {
    const adjustments: QueueAdjustment[] = [];
    
    try {
      // Get active sprint assignments for this account
      const query = `
        SELECT id, sprint_id, status, next_content_due
        FROM account_sprint_assignments 
        WHERE account_id = $1 AND status = 'active'
      `;
      
      const result = await db.query(query, [accountId]);
      
      for (const assignment of result.rows) {
        // Pause the sprint assignment
        await this.sprintAssignmentService.pauseAssignment(assignment.id);
        
        adjustments.push({
          type: 'sprint_paused',
          assignment_id: assignment.id,
          original_status: assignment.status,
          new_status: 'paused',
          pause_time: pauseTime,
          reason: 'Emergency content injection - sprints paused'
        });
      }
      
      // Update account content state
      await this.updateAccountState(accountId, 'emergency_active');
      
      return adjustments;
      
    } catch (error) {
      console.error('Failed to pause active sprints:', error);
      throw error;
    }
  }

  private async overrideConflicts(
    accountId: number, 
    overrideTime: Date
  ): Promise<QueueAdjustment[]> {
    const adjustments: QueueAdjustment[] = [];
    
    try {
      // Cancel any conflicting queue items around the override time
      const conflictWindow = 2 * 60 * 60 * 1000; // 2 hours
      const startTime = new Date(overrideTime.getTime() - conflictWindow);
      const endTime = new Date(overrideTime.getTime() + conflictWindow);
      
      const query = `
        UPDATE content_queue 
        SET status = 'cancelled'
        WHERE account_id = $1 
          AND scheduled_time BETWEEN $2 AND $3
          AND status = 'queued'
          AND emergency_content = false
        RETURNING id, scheduled_time, content_type
      `;
      
      const result = await db.query(query, [accountId, startTime, endTime]);
      
      for (const item of result.rows) {
        adjustments.push({
          type: 'item_cancelled',
          queue_item_id: item.id,
          original_time: item.scheduled_time,
          original_status: 'queued',
          new_status: 'cancelled',
          reason: 'Cancelled due to emergency content override'
        });
      }
      
      return adjustments;
      
    } catch (error) {
      console.error('Failed to override conflicts:', error);
      throw error;
    }
  }

  private calculateInsertionTime(
    currentQueue: QueueItemDetailed[],
    priority: EmergencyPriority
  ): Date {
    const now = new Date();
    
    switch (priority) {
      case 'critical':
        return now; // Post immediately
        
      case 'high':
        // Post as next item - find next queued item and insert before it
        const nextItem = currentQueue.find(item => 
          item.scheduled_time > now && item.status === 'queued'
        );
        if (nextItem) {
          // Insert 1 minute before next item
          return new Date(nextItem.scheduled_time.getTime() - 60000);
        }
        return new Date(now.getTime() + 300000); // 5 minutes from now if no items
        
      case 'standard':
        // Insert with minimal delay but don't interrupt immediate items
        return new Date(now.getTime() + 3600000); // 1 hour from now
        
      default:
        return now;
    }
  }

  private async insertIntoQueue(
    accountId: number,
    emergencyContent: EmergencyContent,
    scheduledTime: Date
  ): Promise<void> {
    const query = `
      INSERT INTO content_queue (
        account_id, 
        scheduled_time, 
        content_type, 
        status, 
        emergency_content, 
        queue_priority,
        created_at
      ) VALUES ($1, $2, $3, 'queued', true, 1, CURRENT_TIMESTAMP)
    `;
    
    await db.query(query, [
      accountId,
      scheduledTime,
      emergencyContent.content_type
    ]);
  }

  private async adjustSubsequentItems(
    accountId: number, 
    emergencyTime: Date
  ): Promise<QueueAdjustment[]> {
    const adjustments: QueueAdjustment[] = [];
    
    try {
      // Find items scheduled after emergency content that might need adjustment
      const query = `
        SELECT id, scheduled_time, content_type
        FROM content_queue
        WHERE account_id = $1 
          AND scheduled_time > $2
          AND status = 'queued'
          AND emergency_content = false
        ORDER BY scheduled_time
      `;
      
      const result = await db.query(query, [accountId, emergencyTime]);
      
      // Add minimum gap after emergency content (e.g., 4 hours)
      const minGapMs = 4 * 60 * 60 * 1000; // 4 hours
      let nextAllowedTime = new Date(emergencyTime.getTime() + minGapMs);
      
      for (const item of result.rows) {
        const originalTime = new Date(item.scheduled_time);
        
        // If item is too close to emergency content, reschedule it
        if (originalTime < nextAllowedTime) {
          const updateQuery = `
            UPDATE content_queue 
            SET scheduled_time = $1
            WHERE id = $2
          `;
          
          await db.query(updateQuery, [nextAllowedTime, item.id]);
          
          adjustments.push({
            type: 'item_rescheduled',
            queue_item_id: item.id,
            original_time: originalTime,
            new_time: nextAllowedTime,
            reason: 'Rescheduled to maintain gap after emergency content'
          });
          
          // Update next allowed time for subsequent items
          nextAllowedTime = new Date(nextAllowedTime.getTime() + minGapMs);
        } else {
          // Item is far enough, use its time as base for next items
          nextAllowedTime = new Date(originalTime.getTime() + minGapMs);
        }
      }
      
      return adjustments;
      
    } catch (error) {
      console.error('Failed to adjust subsequent items:', error);
      throw error;
    }
  }

  private async updateAccountState(accountId: number, state: string): Promise<void> {
    const query = `
      UPDATE account_content_state 
      SET 
        last_emergency_content = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = $1
    `;
    
    await db.query(query, [accountId]);
  }

  async resumeSprintsAfterEmergency(
    accountId: number,
    emergencyCompletedTime: Date
  ): Promise<QueueAdjustment[]> {
    const adjustments: QueueAdjustment[] = [];
    
    try {
      // Find paused sprint assignments for this account
      const query = `
        SELECT id, sprint_id, status
        FROM account_sprint_assignments 
        WHERE account_id = $1 AND status = 'paused'
      `;
      
      const result = await db.query(query, [accountId]);
      
      for (const assignment of result.rows) {
        // Resume the sprint assignment
        await this.sprintAssignmentService.resumeAssignment(assignment.id);
        
        adjustments.push({
          type: 'sprint_resumed',
          assignment_id: assignment.id,
          original_status: 'paused',
          new_status: 'active',
          resume_time: emergencyCompletedTime,
          reason: 'Emergency content completed - sprints resumed'
        });
      }
      
      return adjustments;
      
    } catch (error) {
      console.error('Failed to resume sprints after emergency:', error);
      throw error;
    }
  }

  async cleanupExpiredEmergencyContent(accountId?: number): Promise<number> {
    try {
      // Remove emergency content that was posted more than 7 days ago
      const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const query = `
        DELETE FROM content_queue
        WHERE emergency_content = true 
          AND status IN ('posted', 'failed')
          AND (posted_at < $1 OR created_at < $1)
          ${accountId ? 'AND account_id = $2' : ''}
      `;
      
      const params = accountId ? [cutoffDate, accountId] : [cutoffDate];
      const result = await db.query(query, params);
      
      return result.rowCount || 0;
      
    } catch (error) {
      console.error('Failed to cleanup emergency content:', error);
      throw error;
    }
  }
} 