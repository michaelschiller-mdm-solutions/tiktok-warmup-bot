"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SprintAssignmentService = void 0;
const database_1 = require("../database");
const AssignmentValidationService_1 = require("./AssignmentValidationService");
const ContentQueueService_1 = require("./ContentQueueService");
class SprintAssignmentService {
    constructor() {
        this.validationService = new AssignmentValidationService_1.AssignmentValidationService();
        this.queueService = new ContentQueueService_1.ContentQueueService();
    }
    async createAssignment(accountId, sprintId, options = {}) {
        if (!options.skip_validation) {
            const validation = await this.validationService.validateAssignment(accountId, sprintId);
            if (!validation.isValid && !options.force_override) {
                const errors = validation.conflicts.filter(c => c.severity === 'error');
                throw new Error(`Assignment validation failed: ${errors.map(e => e.message).join(', ')}`);
            }
        }
        await database_1.db.query('BEGIN');
        try {
            const assignmentResult = await database_1.db.query(`
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
            await this.initializeAccountContentState(accountId);
            await this.queueService.generateQueueForAssignment(assignment.id);
            if (!options.start_date || options.start_date <= new Date()) {
                await this.activateAssignment(assignment.id);
            }
            await database_1.db.query('COMMIT');
            return assignment;
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async processBulkAssignments(request) {
        const result = {
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
                const assignment = await this.createAssignment(assignmentRequest.account_id, assignmentRequest.sprint_id, {
                    start_date: assignmentRequest.start_date,
                    assignment_strategy: request.assignment_strategy,
                    force_override: request.force_override
                });
                result.successful_assignments.push(assignment);
                result.summary.successful++;
            }
            catch (error) {
                const validation = await this.validationService.validateAssignment(assignmentRequest.account_id, assignmentRequest.sprint_id);
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
    async assignSprintToAccounts(sprintId, accountIds, options = {}) {
        const bulkRequest = {
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
    async pauseAssignment(assignmentId) {
        await database_1.db.query('BEGIN');
        try {
            await database_1.db.query(`
        UPDATE account_sprint_assignments 
        SET status = 'paused', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [assignmentId]);
            await this.queueService.pauseAssignmentQueue(assignmentId);
            await database_1.db.query('COMMIT');
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async resumeAssignment(assignmentId) {
        await database_1.db.query('BEGIN');
        try {
            await database_1.db.query(`
        UPDATE account_sprint_assignments 
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [assignmentId]);
            await this.queueService.resumeAssignmentQueue(assignmentId);
            await database_1.db.query('COMMIT');
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async completeAssignment(assignmentId) {
        await database_1.db.query('BEGIN');
        try {
            const assignmentResult = await database_1.db.query(`
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
            await database_1.db.query(`
        UPDATE account_content_state
        SET 
          active_sprint_ids = array_remove(active_sprint_ids, $2),
          updated_at = CURRENT_TIMESTAMP
        WHERE account_id = $1
      `, [assignment.account_id, assignment.sprint_id]);
            const cooldownResult = await database_1.db.query(`
        SELECT cooldown_hours FROM content_sprints WHERE id = $1
      `, [assignment.sprint_id]);
            const cooldownHours = cooldownResult.rows[0]?.cooldown_hours || 336;
            const cooldownUntil = new Date(Date.now() + (cooldownHours * 60 * 60 * 1000));
            await database_1.db.query(`
        UPDATE account_content_state
        SET cooldown_until = $2
        WHERE account_id = $1
      `, [assignment.account_id, cooldownUntil]);
            await database_1.db.query('COMMIT');
        }
        catch (error) {
            await database_1.db.query('ROLLBACK');
            throw error;
        }
    }
    async getAssignments(filters = {}) {
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
        const params = [];
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
        const result = await database_1.db.query(query, params);
        return result.rows;
    }
    async initializeAccountContentState(accountId) {
        await database_1.db.query(`
      INSERT INTO account_content_state (account_id, current_location, active_sprint_ids)
      VALUES ($1, 'home', ARRAY[]::integer[])
      ON CONFLICT (account_id) DO NOTHING
    `, [accountId]);
    }
    async activateAssignment(assignmentId) {
        const assignmentResult = await database_1.db.query(`
      UPDATE account_sprint_assignments 
      SET 
        status = 'active',
        start_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING account_id, sprint_id
    `, [assignmentId]);
        if (assignmentResult.rows.length === 0)
            return;
        const assignment = assignmentResult.rows[0];
        await database_1.db.query(`
      UPDATE account_content_state
      SET 
        active_sprint_ids = array_append(active_sprint_ids, $2),
        updated_at = CURRENT_TIMESTAMP
      WHERE account_id = $1
    `, [assignment.account_id, assignment.sprint_id]);
        const sprintResult = await database_1.db.query(`
      SELECT location FROM content_sprints WHERE id = $1
    `, [assignment.sprint_id]);
        if (sprintResult.rows[0]?.location) {
            await database_1.db.query(`
        UPDATE account_content_state
        SET current_location = $2
        WHERE account_id = $1
      `, [assignment.account_id, sprintResult.rows[0].location]);
        }
    }
}
exports.SprintAssignmentService = SprintAssignmentService;
//# sourceMappingURL=SprintAssignmentService.js.map