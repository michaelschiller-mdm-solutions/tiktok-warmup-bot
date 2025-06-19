import { db } from '../database';
import { QueueItem, Schedule, ScheduledContentItem } from '../types/assignments';

export class ContentQueueService {
  /**
   * Generate content queue for a sprint assignment
   */
  async generateQueueForAssignment(assignmentId: number): Promise<QueueItem[]> {
    // Get assignment and sprint details
    const assignmentResult = await db.query(`
      SELECT 
        asa.id, asa.account_id, asa.sprint_id, asa.start_date,
        cs.name as sprint_name, cs.calculated_duration_hours
      FROM account_sprint_assignments asa
      JOIN content_sprints cs ON asa.sprint_id = cs.id
      WHERE asa.id = $1
    `, [assignmentId]);

    if (assignmentResult.rows.length === 0) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    const assignment = assignmentResult.rows[0];
    const startDate = assignment.start_date || new Date();

    // Generate posting schedule
    const schedule = await this.calculatePostingSchedule(assignment.sprint_id, startDate);
    
    // Create queue items
    const queueItems: QueueItem[] = [];
    
    for (const item of schedule.content_items) {
      // Get central content for this sprint content item
      const centralContentResult = await db.query(`
        SELECT id FROM central_content 
        WHERE categories @> '["sprint"]'::jsonb 
        ORDER BY RANDOM() 
        LIMIT 1
      `);

      const centralContentId = centralContentResult.rows[0]?.id || null;

      queueItems.push({
        account_id: assignment.account_id,
        sprint_assignment_id: assignmentId,
        content_item_id: item.content_item_id,
        central_content_id: centralContentId,
        central_text_id: null, // Will be set based on content type
        scheduled_time: item.scheduled_time,
        content_type: item.content_type,
        queue_priority: 100, // Normal priority
        emergency_content: false
      });
    }

    // Insert queue items into database
    await this.insertQueueItems(queueItems);

    return queueItems;
  }

  /**
   * Calculate posting schedule for a sprint
   */
  async calculatePostingSchedule(sprintId: number, startDate: Date): Promise<Schedule> {
    // Get sprint content items
    const contentItemsResult = await db.query(`
      SELECT 
        id, content_order, content_categories, 
        delay_hours_min, delay_hours_max, is_after_sprint_content
      FROM sprint_content_items
      WHERE sprint_id = $1
      ORDER BY content_order ASC
    `, [sprintId]);

    const contentItems = contentItemsResult.rows;
    const scheduledItems: ScheduledContentItem[] = [];
    
    let currentTime = new Date(startDate);
    let totalDurationHours = 0;

    for (const item of contentItems) {
      // Calculate delay from previous content
      const delayHours = this.calculateRandomDelay(
        item.delay_hours_min, 
        item.delay_hours_max
      );

      // Schedule this content item
      const scheduledTime = new Date(currentTime.getTime() + (delayHours * 60 * 60 * 1000));
      
      // Determine content type (prioritize in order: post, story, highlight)
      const contentType = this.determineContentType(item.content_categories);

      scheduledItems.push({
        content_item_id: item.id,
        content_order: item.content_order,
        scheduled_time: scheduledTime,
        content_type: contentType,
        delay_from_previous_hours: delayHours,
        is_after_sprint_content: item.is_after_sprint_content
      });

      // Update current time and total duration
      currentTime = scheduledTime;
      totalDurationHours += delayHours;
    }

    const endDate = new Date(currentTime);

    return {
      start_date: startDate,
      end_date: endDate,
      content_items: scheduledItems,
      total_duration_hours: totalDurationHours
    };
  }

  /**
   * Insert queue items into database
   */
  async insertQueueItems(queueItems: QueueItem[]): Promise<void> {
    if (queueItems.length === 0) return;

    const values = queueItems.map((item, index) => {
      const baseIndex = index * 9;
      return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9})`;
    }).join(', ');

    const params = queueItems.flatMap(item => [
      item.account_id,
      item.sprint_assignment_id,
      item.content_item_id,
      item.scheduled_time,
      item.content_type,
      'queued', // status
      item.emergency_content,
      item.queue_priority,
      0 // retry_count
    ]);

    const query = `
      INSERT INTO content_queue (
        account_id, sprint_assignment_id, content_item_id, 
        scheduled_time, content_type, status, 
        emergency_content, queue_priority, retry_count
      ) VALUES ${values}
    `;

    await db.query(query, params);
  }

  /**
   * Update assignment progress when content is posted
   */
  async updateAssignmentProgress(assignmentId: number, contentItemId: number): Promise<void> {
    await db.query(`
      UPDATE account_sprint_assignments 
      SET 
        current_content_index = current_content_index + 1,
        updated_at = CURRENT_TIMESTAMP,
        next_content_due = (
          SELECT MIN(scheduled_time) 
          FROM content_queue 
          WHERE sprint_assignment_id = $1 AND status = 'queued'
        )
      WHERE id = $1
    `, [assignmentId]);
  }

  /**
   * Calculate random delay within min/max range
   */
  private calculateRandomDelay(minHours: number, maxHours: number): number {
    if (minHours === maxHours) return minHours;
    return Math.floor(Math.random() * (maxHours - minHours + 1)) + minHours;
  }

  /**
   * Determine primary content type from categories array
   */
  private determineContentType(categories: string[]): 'story' | 'post' | 'highlight' {
    // Priority order: post > story > highlight
    if (categories.includes('post')) return 'post';
    if (categories.includes('story')) return 'story';
    if (categories.includes('highlight')) return 'highlight';
    
    // Default to story if no specific type
    return 'story';
  }

  /**
   * Pause all queued content for an assignment
   */
  async pauseAssignmentQueue(assignmentId: number): Promise<void> {
    await db.query(`
      UPDATE content_queue 
      SET status = 'cancelled'
      WHERE sprint_assignment_id = $1 AND status = 'queued'
    `, [assignmentId]);
  }

  /**
   * Resume paused assignment by regenerating queue
   */
  async resumeAssignmentQueue(assignmentId: number): Promise<void> {
    // Get current assignment state
    const assignmentResult = await db.query(`
      SELECT current_content_index, sprint_id
      FROM account_sprint_assignments
      WHERE id = $1
    `, [assignmentId]);

    if (assignmentResult.rows.length === 0) {
      throw new Error(`Assignment ${assignmentId} not found`);
    }

    const assignment = assignmentResult.rows[0];
    
    // Generate new queue for remaining content
    await this.generateQueueForRemainingContent(assignmentId, assignment.current_content_index);
  }

  /**
   * Generate queue for remaining content items
   */
  private async generateQueueForRemainingContent(assignmentId: number, currentIndex: number): Promise<void> {
    // Get remaining content items
    const remainingItemsResult = await db.query(`
      SELECT sci.*, asa.account_id, asa.sprint_id
      FROM sprint_content_items sci
      JOIN account_sprint_assignments asa ON sci.sprint_id = asa.sprint_id
      WHERE asa.id = $1 AND sci.content_order > $2
      ORDER BY sci.content_order ASC
    `, [assignmentId, currentIndex]);

    if (remainingItemsResult.rows.length === 0) return;

    const startTime = new Date();
    const queueItems: QueueItem[] = [];

    for (const item of remainingItemsResult.rows) {
      const delayHours = this.calculateRandomDelay(item.delay_hours_min, item.delay_hours_max);
      const scheduledTime = new Date(startTime.getTime() + (delayHours * 60 * 60 * 1000));

      queueItems.push({
        account_id: item.account_id,
        sprint_assignment_id: assignmentId,
        content_item_id: item.id,
        central_content_id: null,
        central_text_id: null,
        scheduled_time: scheduledTime,
        content_type: this.determineContentType(item.content_categories),
        queue_priority: 100,
        emergency_content: false
      });
    }

    await this.insertQueueItems(queueItems);
  }
} 