"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyContentService = void 0;
const database_1 = require("../database");
const QueueManagementService_1 = require("./QueueManagementService");
const SprintAssignmentService_1 = require("./SprintAssignmentService");
const EmergencyQueueService_1 = require("./EmergencyQueueService");
class EmergencyContentService {
    constructor() {
        this.queueManagementService = new QueueManagementService_1.QueueManagementService();
        this.sprintAssignmentService = new SprintAssignmentService_1.SprintAssignmentService();
        this.emergencyQueueService = new EmergencyQueueService_1.EmergencyQueueService();
    }
    async injectEmergencyContent(request) {
        const startTime = Date.now();
        try {
            await this.validateEmergencyContent(request.emergency_content);
            const targetAccounts = await this.getTargetAccounts(request);
            const conflictAnalyses = await this.analyzeConflicts(request.emergency_content, targetAccounts);
            const results = await this.executeInjectionStrategy(request, conflictAnalyses);
            await this.trackEmergencyInjection(request, results, Date.now() - startTime);
            return results;
        }
        catch (error) {
            console.error('Emergency content injection failed:', error);
            throw new Error(`Emergency injection failed: ${error.message}`);
        }
    }
    async previewEmergencyInjection(request) {
        const targetAccounts = await this.getTargetAccounts(request);
        const conflictAnalyses = await this.analyzeConflicts(request.emergency_content, targetAccounts);
        const conflictSummary = this.generateConflictSummary(conflictAnalyses);
        const accountsWithConflicts = conflictAnalyses.filter(a => a.has_conflicts).length;
        let accountsSkipped = 0;
        let estimatedSuccessful = 0;
        for (const analysis of conflictAnalyses) {
            if (!analysis.can_proceed && request.conflict_strategy === 'skip_conflicted') {
                accountsSkipped++;
            }
            else {
                estimatedSuccessful++;
            }
        }
        return {
            total_target_accounts: targetAccounts.length,
            accounts_with_conflicts: accountsWithConflicts,
            accounts_skipped: accountsSkipped,
            estimated_successful_injections: estimatedSuccessful,
            conflict_summary: conflictSummary,
            recommendations: this.generateRecommendations(conflictAnalyses, request)
        };
    }
    async validateEmergencyContent(content) {
        if (!content.file_path || !content.file_name) {
            throw new Error('Emergency content must have file_path and file_name');
        }
        if (!['story', 'post', 'highlight'].includes(content.content_type)) {
            throw new Error('Invalid content_type. Must be story, post, or highlight');
        }
        if (!['critical', 'high', 'standard'].includes(content.priority)) {
            throw new Error('Invalid priority. Must be critical, high, or standard');
        }
        if (!content.file_path.startsWith('/') && !content.file_path.startsWith('http')) {
            throw new Error('Invalid file_path format');
        }
    }
    async getTargetAccounts(request) {
        const query = `
      SELECT a.id, a.username, a.status, acs.current_location, acs.active_sprint_ids
      FROM accounts a
      LEFT JOIN account_content_state acs ON acs.account_id = a.id
      WHERE a.status = 'active' 
        AND is_warmup_complete(a.id) = true
        ${request.target_account_ids ? 'AND a.id = ANY($1)' : ''}
      ORDER BY a.id
    `;
        const params = request.target_account_ids ? [request.target_account_ids] : [];
        const result = await database_1.db.query(query, params);
        if (result.rows.length === 0) {
            throw new Error('No eligible accounts found for emergency content injection');
        }
        return result.rows;
    }
    async analyzeConflicts(emergencyContent, accounts) {
        const analyses = [];
        for (const account of accounts) {
            const conflicts = {
                account_id: account.id,
                has_conflicts: false,
                location_conflicts: [],
                sprint_conflicts: [],
                theme_conflicts: [],
                recommended_strategy: 'post_alongside',
                can_proceed: true
            };
            if (emergencyContent.location_context &&
                account.current_location &&
                account.current_location !== emergencyContent.location_context) {
                conflicts.location_conflicts.push({
                    type: 'location_mismatch',
                    current_location: account.current_location,
                    emergency_location: emergencyContent.location_context,
                    severity: 'warning',
                    resolution_options: ['override_location', 'skip_account', 'pause_sprints']
                });
                conflicts.has_conflicts = true;
            }
            if (account.active_sprint_ids && account.active_sprint_ids.length > 0) {
                const sprintConflicts = await this.checkSprintConflicts(account.active_sprint_ids, emergencyContent);
                conflicts.sprint_conflicts = sprintConflicts;
                if (sprintConflicts.length > 0) {
                    conflicts.has_conflicts = true;
                }
            }
            if (emergencyContent.theme_context) {
                const themeConflicts = await this.checkThemeConflicts(account.id, emergencyContent.theme_context);
                conflicts.theme_conflicts = themeConflicts;
                if (themeConflicts.length > 0) {
                    conflicts.has_conflicts = true;
                }
            }
            conflicts.recommended_strategy = this.determineRecommendedStrategy(conflicts);
            conflicts.can_proceed = this.canProceedWithInjection(conflicts, emergencyContent.priority);
            analyses.push(conflicts);
        }
        return analyses;
    }
    async checkSprintConflicts(activeSprintIds, emergencyContent) {
        const conflicts = [];
        const query = `
      SELECT id, name, location, sprint_type, blocks_sprints
      FROM content_sprints 
      WHERE id = ANY($1)
    `;
        const result = await database_1.db.query(query, [activeSprintIds]);
        for (const sprint of result.rows) {
            if (sprint.location &&
                emergencyContent.location_context &&
                sprint.location !== emergencyContent.location_context) {
                conflicts.push({
                    type: 'sprint_blocking',
                    active_sprint_id: sprint.id,
                    sprint_name: sprint.name,
                    conflict_reason: `Sprint location "${sprint.location}" conflicts with emergency content location "${emergencyContent.location_context}"`,
                    resolution_options: ['pause_sprint', 'override_conflict', 'skip_account']
                });
            }
            if (sprint.sprint_type &&
                emergencyContent.theme_context &&
                this.isThemeIncompatible(sprint.sprint_type, emergencyContent.theme_context)) {
                conflicts.push({
                    type: 'theme_mismatch',
                    active_sprint_id: sprint.id,
                    sprint_name: sprint.name,
                    conflict_reason: `Sprint theme "${sprint.sprint_type}" incompatible with emergency content theme "${emergencyContent.theme_context}"`,
                    resolution_options: ['pause_sprint', 'override_conflict', 'skip_account']
                });
            }
        }
        return conflicts;
    }
    async checkThemeConflicts(accountId, emergencyTheme) {
        const query = `
      SELECT DISTINCT cs.sprint_type
      FROM content_sprints cs
      JOIN account_sprint_assignments asa ON asa.sprint_id = cs.id
      WHERE asa.account_id = $1 AND asa.status = 'active'
    `;
        const result = await database_1.db.query(query, [accountId]);
        const conflicts = [];
        for (const row of result.rows) {
            if (this.isThemeIncompatible(row.sprint_type, emergencyTheme)) {
                conflicts.push({
                    type: 'theme_incompatible',
                    current_theme: row.sprint_type,
                    emergency_theme: emergencyTheme,
                    severity: 'warning',
                    resolution_options: ['pause_sprint', 'override_theme', 'skip_account']
                });
            }
        }
        return conflicts;
    }
    isThemeIncompatible(currentTheme, emergencyTheme) {
        const incompatiblePairs = [
            ['vacation', 'work'],
            ['vacation', 'university'],
            ['work', 'vacation'],
            ['university', 'vacation'],
            ['professional', 'party'],
            ['formal', 'casual_extreme']
        ];
        return incompatiblePairs.some(([theme1, theme2]) => (currentTheme === theme1 && emergencyTheme === theme2) ||
            (currentTheme === theme2 && emergencyTheme === theme1));
    }
    determineRecommendedStrategy(conflicts) {
        if (!conflicts.has_conflicts) {
            return 'post_alongside';
        }
        const hasHighSeverityConflicts = [
            ...conflicts.location_conflicts,
            ...conflicts.theme_conflicts
        ].some(c => c.severity === 'error');
        if (hasHighSeverityConflicts) {
            return 'skip_conflicted';
        }
        if (conflicts.sprint_conflicts.length > 0) {
            return 'pause_sprints';
        }
        return 'override_conflicts';
    }
    canProceedWithInjection(conflicts, priority) {
        if (priority === 'critical') {
            return true;
        }
        if (priority === 'high') {
            const hasErrorConflicts = [
                ...conflicts.location_conflicts,
                ...conflicts.theme_conflicts
            ].some(c => c.severity === 'error');
            return !hasErrorConflicts;
        }
        return !conflicts.has_conflicts;
    }
    async executeInjectionStrategy(request, analyses) {
        const results = {
            successful_injections: [],
            failed_injections: [],
            conflicts_resolved: [],
            queue_adjustments: [],
            total_accounts_affected: 0,
            summary: ''
        };
        for (const analysis of analyses) {
            try {
                if (!analysis.can_proceed && request.conflict_strategy === 'skip_conflicted') {
                    continue;
                }
                const injection = await this.performInjection(request, analysis);
                results.successful_injections.push(injection);
                results.total_accounts_affected++;
                if (analysis.has_conflicts) {
                    results.conflicts_resolved.push({
                        account_id: analysis.account_id,
                        conflict_type: this.getConflictTypes(analysis).join(', '),
                        resolution_strategy: request.conflict_strategy,
                        original_state: { conflicts: analysis },
                        new_state: { resolved: true },
                        timestamp: new Date()
                    });
                }
            }
            catch (error) {
                results.failed_injections.push({
                    account_id: analysis.account_id,
                    error: error.message,
                    conflicts: analysis,
                    attempted_strategy: request.conflict_strategy
                });
            }
        }
        results.summary = this.generateInjectionSummary(results);
        return results;
    }
    async performInjection(request, analysis) {
        const adjustments = await this.emergencyQueueService.insertEmergencyContent(analysis.account_id, request.emergency_content, request.conflict_strategy);
        const scheduledTime = request.scheduled_time ||
            (request.emergency_content.post_immediately ? new Date() : new Date(Date.now() + 3600000));
        const queueItemQuery = `
      INSERT INTO content_queue (
        account_id, content_type, scheduled_time, status, 
        emergency_content, queue_priority, created_at
      ) VALUES ($1, $2, $3, 'queued', true, 1, CURRENT_TIMESTAMP)
      RETURNING id
    `;
        const queueResult = await database_1.db.query(queueItemQuery, [
            analysis.account_id,
            request.emergency_content.content_type,
            scheduledTime
        ]);
        return {
            account_id: analysis.account_id,
            queue_item_id: queueResult.rows[0].id,
            scheduled_time: scheduledTime,
            strategy_used: request.conflict_strategy,
            conflicts_resolved: analysis.has_conflicts ? 1 : 0,
            adjustments_made: adjustments.length
        };
    }
    getConflictTypes(analysis) {
        const types = [];
        if (analysis.location_conflicts.length > 0)
            types.push('location');
        if (analysis.sprint_conflicts.length > 0)
            types.push('sprint');
        if (analysis.theme_conflicts.length > 0)
            types.push('theme');
        return types;
    }
    generateConflictSummary(analyses) {
        return {
            location_conflicts: analyses.reduce((sum, a) => sum + a.location_conflicts.length, 0),
            sprint_conflicts: analyses.reduce((sum, a) => sum + a.sprint_conflicts.length, 0),
            theme_conflicts: analyses.reduce((sum, a) => sum + a.theme_conflicts.length, 0),
            high_severity_conflicts: analyses.reduce((sum, a) => sum +
                [...a.location_conflicts, ...a.theme_conflicts].filter(c => c.severity === 'error').length, 0),
            low_severity_conflicts: analyses.reduce((sum, a) => sum +
                [...a.location_conflicts, ...a.theme_conflicts].filter(c => c.severity === 'warning').length, 0)
        };
    }
    generateRecommendations(analyses, request) {
        const recommendations = [];
        const conflictedAccounts = analyses.filter(a => a.has_conflicts).length;
        if (conflictedAccounts > 0) {
            recommendations.push(`${conflictedAccounts} accounts have conflicts that may affect content posting`);
        }
        if (request.conflict_strategy === 'skip_conflicted' && conflictedAccounts > 0) {
            recommendations.push('Consider using "override_conflicts" strategy to reach more accounts');
        }
        if (request.emergency_content.priority === 'standard' && conflictedAccounts > 0) {
            recommendations.push('Consider upgrading priority to "high" or "critical" for better conflict resolution');
        }
        return recommendations;
    }
    generateInjectionSummary(results) {
        const total = results.successful_injections.length + results.failed_injections.length;
        const successRate = total > 0 ? Math.round((results.successful_injections.length / total) * 100) : 0;
        return `Emergency content injection completed: ${results.successful_injections.length}/${total} successful (${successRate}%). ${results.conflicts_resolved.length} conflicts resolved.`;
    }
    async trackEmergencyInjection(request, results, executionTimeMs) {
        const logQuery = `
      INSERT INTO emergency_content_logs (
        timestamp, emergency_content, request_data, result_data, execution_time_ms
      ) VALUES (CURRENT_TIMESTAMP, $1, $2, $3, $4)
    `;
        try {
            await database_1.db.query(logQuery, [
                JSON.stringify(request.emergency_content),
                JSON.stringify(request),
                JSON.stringify(results),
                executionTimeMs
            ]);
        }
        catch (error) {
            console.error('Failed to log emergency injection:', error);
        }
    }
}
exports.EmergencyContentService = EmergencyContentService;
//# sourceMappingURL=EmergencyContentService.js.map