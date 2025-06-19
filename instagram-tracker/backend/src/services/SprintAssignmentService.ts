import { db } from '../database';
import { Assignment, AssignmentOptions, BulkAssignmentRequest, BulkAssignmentResult } from '../types/assignments';
import { AssignmentValidationService } from './AssignmentValidationService';
import { ContentQueueService } from './ContentQueueService';

export class SprintAssignmentService {
  private validationService: AssignmentValidationService;
  private queueService: ContentQueueService;

  constructor() {
    this.validationService = new AssignmentValidationService();
    this.queueService = new ContentQueueService();
  }

  /**
   * Create a single sprint assignment
   */
  async createAssignment(
    accountId: number, 
    sprintId: number, 
    options: AssignmentOptions = {}
  ): Promise<Assignment> {
    // Validate assignment unless explicitly skipped
    if (!options.skip_validation) {
      const validation = await this.validationService.validateAssignment(accountId, sprintId);
      
      if (!validation.isValid && !options.force_override) {
        const errors = validation.conflicts.filter(c => c.severity === 'error');
        throw new Error(`Assignment validation failed: ${errors.map(e => e.message).join(', ')}`);
      }
    }

    // Begin transaction
    await db.query('BEGIN');

    try {
      // Create assignment record
      const assignmentResult = await db.query(`
        INSERT INTO account_sprint_assignments (
          account_id, sprint_id, assignment_date, start_date, status, sprint_instance_id
        ) VALUES ($1, $2, CURRENT_TIMESTAMP, $3, 'scheduled', gen_random_uuid())
        RETURNING *
      `, [
        accountId, 
        sprintId, 
        options.start_date || new Date()
      ]);

      const assignment = assignmentResult.rows[0];

      // Initialize account content state if not exists
      await this.initializeAccountContentState(accountId);

      // Generate content queue
      await this.queueService.generateQueueForAssignment(assignment.id);

      // Update assignment status to active if start date is now
      if (!options.start_date || options.start_date <= new Date()) {
        await this.activateAssignment(assignment.id);
      }

      await db.query('COMMIT');

      return assignment;

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Process bulk assignments
   */
  async processBulkAssignments(request: BulkAssignmentRequest): Promise<BulkAssignmentResult> {
    const result: BulkAssignmentResult = {
      successful_assignments: [],
      failed_assignments: [],
      summary: {
        total_requested: request.assignments.length,
        successful: 0,
        failed: 0,
        warnings: []
      }
    };

    for (const assignmentRequest of request.assignments) {
      try {
        const assignment = await this.createAssignment(
          assignmentRequest.account_id,
          assignmentRequest.sprint_id,
          {
            start_date: assignmentRequest.start_date,
            assignment_strategy: request.assignment_strategy,
            force_override: request.force_override
          }
        );

        result.successful_assignments.push(assignment);
        result.summary.successful++;

      } catch (error) {
        const validation = await this.validationService.validateAssignment(
          assignmentRequest.account_id,
          assignmentRequest.sprint_id
        );

        result.failed_assignments.push({
          account_id: assignmentRequest.account_id,
          sprint_id: assignmentRequest.sprint_id,
          errors: validation.conflicts
        });
        result.summary.failed++;
      }
    }

    return result;
  }

  /**
   * Assign sprint to multiple accounts
   */
  async assignSprintToAccounts(
    sprintId: number, 
    accountIds: number[], 
    options: AssignmentOptions = {}
  ): Promise<BulkAssignmentResult> {
    const bulkRequest: BulkAssignmentRequest = {
      assignments: accountIds.map(accountId => ({
        account_id: accountId,
        sprint_id: sprintId,
        start_date: options.start_date
      })),
      assignment_strategy: options.assignment_strategy,
      force_override: options.force_override
    };

    return this.processBulkAssignments(bulkRequest);
  }

  /**
   * Pause an assignment
   */
  async pauseAssignment(assignmentId: number): Promise<void> {
    await db.query('BEGIN');

    try {
      // Update assignment status
      await db.query(`
        UPDATE account_sprint_assignments 
        SET status = 'paused', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [assignmentId]);

      // Pause the content queue
      await this.queueService.pauseAssignmentQueue(assignmentId);

      await db.query('COMMIT');

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Resume a paused assignment
   */
  async resumeAssignment(assignmentId: number): Promise<void> {
    await db.query('BEGIN');

    try {
      // Update assignment status
      await db.query(`
        UPDATE account_sprint_assignments 
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [assignmentId]);

      // Resume the content queue
      await this.queueService.resumeAssignmentQueue(assignmentId);

      await db.query('COMMIT');

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Complete an assignment
   */
  async completeAssignment(assignmentId: number): Promise<void> {
    await db.query('BEGIN');

    try {
      // Update assignment status
      const assignmentResult = await db.query(`
        UPDATE account_sprint_assignments 
        SET 
          status = 'completed', 
          end_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING account_id, sprint_id
      `, [assignmentId]);

      if (assignmentResult.rows.length === 0) {
        throw new Error(`Assignment ${assignmentId} not found`);
      }

      const assignment = assignmentResult.rows[0];

      // Update account state - remove from active sprints
      await db.query(`
        UPDATE account_content_state
        SET 
          active_sprint_ids = array_remove(active_sprint_ids, $2),
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1
      `, [assignment.account_id, assignment.sprint_id]);

      // Start cooldown period
      const cooldownResult = await db.query(`
        SELECT cooldown_hours FROM content_sprints WHERE id = $1
      `, [assignment.sprint_id]);

      const cooldownHours = cooldownResult.rows[0]?.cooldown_hours || 336; // 2 weeks default
      const cooldownUntil = new Date(Date.now() + (cooldownHours * 60 * 60 * 1000));

      await db.query(`
        UPDATE account_content_state
        SET cooldown_until = $2
        WHERE account_id = $1
      `, [assignment.account_id, cooldownUntil]);

      await db.query('COMMIT');

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get assignments with filtering
   */
  async getAssignments(filters: any = {}): Promise<Assignment[]> {
    let query = `
      SELECT 
        asa.*,
        cs.name as sprint_name,
        cs.sprint_type,
        cs.location,
        a.username,
        m.name as model_name
      FROM account_sprint_assignments asa
      JOIN content_sprints cs ON asa.sprint_id = cs.id
      JOIN accounts a ON asa.account_id = a.id
      LEFT JOIN models m ON a.model_id = m.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters.account_id) {
      query += ` AND asa.account_id = $${paramIndex}`;
      params.push(filters.account_id);
      paramIndex++;
    }

    if (filters.sprint_id) {
      query += ` AND asa.sprint_id = $${paramIndex}`;
      params.push(filters.sprint_id);
      paramIndex++;
    }

    if (filters.status) {
      query += ` AND asa.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.model_id) {
      query += ` AND a.model_id = $${paramIndex}`;
      params.push(filters.model_id);
      paramIndex++;
    }

    query += ` ORDER BY asa.created_at DESC`;

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Initialize account content state
   */
  private async initializeAccountContentState(accountId: number): Promise<void> {
    await db.query(`
      INSERT INTO account_content_state (account_id, current_location, active_sprint_ids)
      VALUES ($1, 'home', ARRAY[]::integer[])
      ON CONFLICT (account_id) DO NOTHING
    `, [accountId]);
  }

  /**
   * Activate an assignment
   */
  private async activateAssignment(assignmentId: number): Promise<void> {
    const assignmentResult = await db.query(`
      UPDATE account_sprint_assignments 
      SET 
        status = 'active',
        start_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING account_id, sprint_id
    `, [assignmentId]);

    if (assignmentResult.rows.length === 0) return;

    const assignment = assignmentResult.rows[0];

    // Add sprint to account's active sprints
    await db.query(`
      UPDATE account_content_state
      SET 
        active_sprint_ids = array_append(active_sprint_ids, $2),
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = $1
    `, [assignment.account_id, assignment.sprint_id]);

    // Update account location if sprint has location
    const sprintResult = await db.query(`
      SELECT location FROM content_sprints WHERE id = $1
    `, [assignment.sprint_id]);

    if (sprintResult.rows[0]?.location) {
      await db.query(`
        UPDATE account_content_state
        SET current_location = $2
        WHERE account_id = $1
      `, [assignment.account_id, sprintResult.rows[0].location]);
    }
  }
} 