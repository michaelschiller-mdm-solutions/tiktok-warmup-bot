"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyQueueService = void 0;
const database_1 = require("../database");
const QueueManagementService_1 = require("./QueueManagementService");
const SprintAssignmentService_1 = require("./SprintAssignmentService");
class EmergencyQueueService {
    constructor() {
        this.queueManagementService = new QueueManagementService_1.QueueManagementService();
        this.sprintAssignmentService = new SprintAssignmentService_1.SprintAssignmentService();
    }
    async insertEmergencyContent(accountId, emergencyContent, strategy) {
        const adjustments = [];
        try {
            const currentQueue = await this.queueManagementService.getAccountQueue(accountId);
            const insertionTime = emergencyContent.post_immediately
                ? new Date()
                : this.calculateInsertionTime(currentQueue, emergencyContent.priority);
            switch (strategy) {
                case 'pause_sprints':
                    adjustments.push(...await this.pauseActiveSprints(accountId, insertionTime));
                    break;
                case 'post_alongside':
                    break;
                case 'override_conflicts':
                    adjustments.push(...await this.overrideConflicts(accountId, insertionTime));
                    break;
                case 'skip_conflicted':
                    break;
            }
            await this.insertIntoQueue(accountId, emergencyContent, insertionTime);
            if (strategy === 'pause_sprints') {
                adjustments.push(...await this.adjustSubsequentItems(accountId, insertionTime));
            }
            return adjustments;
        }
        catch (error) {
            console.error('Emergency queue insertion failed:', error);
            throw new Error(`Failed to insert emergency content: ${error.message}`);
        }
    }
    async pauseActiveSprints(accountId, pauseTime) {
        const adjustments = [];
        try {
            const query = `
        SELECT id, sprint_id, status, next_content_due
        FROM account_sprint_assignments 
        WHERE account_id = $1 AND status = 'active'
      `;
            const result = await database_1.db.query(query, [accountId]);
            for (const assignment of result.rows) {
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
            await this.updateAccountState(accountId, 'emergency_active');
            return adjustments;
        }
        catch (error) {
            console.error('Failed to pause active sprints:', error);
            throw error;
        }
    }
    async overrideConflicts(accountId, overrideTime) {
        const adjustments = [];
        try {
            const conflictWindow = 2 * 60 * 60 * 1000;
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
            const result = await database_1.db.query(query, [accountId, startTime, endTime]);
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
        }
        catch (error) {
            console.error('Failed to override conflicts:', error);
            throw error;
        }
    }
    calculateInsertionTime(currentQueue, priority) {
        const now = new Date();
        switch (priority) {
            case 'critical':
                return now;
            case 'high':
                const nextItem = currentQueue.find(item => item.scheduled_time > now && item.status === 'queued');
                if (nextItem) {
                    return new Date(nextItem.scheduled_time.getTime() - 60000);
                }
                return new Date(now.getTime() + 300000);
            case 'standard':
                return new Date(now.getTime() + 3600000);
            default:
                return now;
        }
    }
    async insertIntoQueue(accountId, emergencyContent, scheduledTime) {
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
        await database_1.db.query(query, [
            accountId,
            scheduledTime,
            emergencyContent.content_type
        ]);
    }
    async adjustSubsequentItems(accountId, emergencyTime) {
        const adjustments = [];
        try {
            const query = `
        SELECT id, scheduled_time, content_type
        FROM content_queue
        WHERE account_id = $1 
          AND scheduled_time > $2
          AND status = 'queued'
          AND emergency_content = false
        ORDER BY scheduled_time
      `;
            const result = await database_1.db.query(query, [accountId, emergencyTime]);
            const minGapMs = 4 * 60 * 60 * 1000;
            let nextAllowedTime = new Date(emergencyTime.getTime() + minGapMs);
            for (const item of result.rows) {
                const originalTime = new Date(item.scheduled_time);
                if (originalTime < nextAllowedTime) {
                    const updateQuery = `
            UPDATE content_queue 
            SET scheduled_time = $1
            WHERE id = $2
          `;
                    await database_1.db.query(updateQuery, [nextAllowedTime, item.id]);
                    adjustments.push({
                        type: 'item_rescheduled',
                        queue_item_id: item.id,
                        original_time: originalTime,
                        new_time: nextAllowedTime,
                        reason: 'Rescheduled to maintain gap after emergency content'
                    });
                    nextAllowedTime = new Date(nextAllowedTime.getTime() + minGapMs);
                }
                else {
                    nextAllowedTime = new Date(originalTime.getTime() + minGapMs);
                }
            }
            return adjustments;
        }
        catch (error) {
            console.error('Failed to adjust subsequent items:', error);
            throw error;
        }
    }
    async updateAccountState(accountId, state) {
        const query = `
      UPDATE account_content_state 
      SET 
        last_emergency_content = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = $1
    `;
        await database_1.db.query(query, [accountId]);
    }
    async resumeSprintsAfterEmergency(accountId, emergencyCompletedTime) {
        const adjustments = [];
        try {
            const query = `
        SELECT id, sprint_id, status
        FROM account_sprint_assignments 
        WHERE account_id = $1 AND status = 'paused'
      `;
            const result = await database_1.db.query(query, [accountId]);
            for (const assignment of result.rows) {
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
        }
        catch (error) {
            console.error('Failed to resume sprints after emergency:', error);
            throw error;
        }
    }
    async cleanupExpiredEmergencyContent(accountId) {
        try {
            const cutoffDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const query = `
        DELETE FROM content_queue
        WHERE emergency_content = true 
          AND status IN ('posted', 'failed')
          AND (posted_at < $1 OR created_at < $1)
          ${accountId ? 'AND account_id = $2' : ''}
      `;
            const params = accountId ? [cutoffDate, accountId] : [cutoffDate];
            const result = await database_1.db.query(query, params);
            return result.rowCount || 0;
        }
        catch (error) {
            console.error('Failed to cleanup emergency content:', error);
            throw error;
        }
    }
}
exports.EmergencyQueueService = EmergencyQueueService;
//# sourceMappingURL=EmergencyQueueService.js.map