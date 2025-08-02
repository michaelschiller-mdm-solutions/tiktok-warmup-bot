"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentAssignmentService = void 0;
const database_1 = require("../database");
const warmupProcess_1 = require("../types/warmupProcess");
class ContentAssignmentService {
    async selectContentForPhase(criteria) {
        try {
            let query = `
        SELECT 
          id, model_id, content_type, image_url, quality_score,
          assignment_count, success_count, last_assigned_at, is_blacklisted,
          CASE 
            WHEN assignment_count = 0 THEN 0.0
            ELSE (success_count::decimal / assignment_count) * 100
          END as success_rate
        FROM available_warmup_content
        WHERE model_id = $1 
          AND content_type IN ($2, 'any')
          AND is_blacklisted = false
      `;
            const params = [criteria.modelId, criteria.contentType];
            let paramIndex = 3;
            if (criteria.minQualityScore) {
                query += ` AND quality_score >= $${paramIndex}`;
                params.push(criteria.minQualityScore);
                paramIndex++;
            }
            if (criteria.maxUsageCount) {
                query += ` AND assignment_count <= $${paramIndex}`;
                params.push(criteria.maxUsageCount);
                paramIndex++;
            }
            if (criteria.excludeUsedContent) {
                query += ` AND (last_assigned_at IS NULL OR last_assigned_at < CURRENT_TIMESTAMP - INTERVAL '7 days')`;
            }
            query += ` ORDER BY quality_score DESC, assignment_count ASC, RANDOM() LIMIT 1`;
            const result = await database_1.db.query(query, params);
            if (result.rows.length === 0) {
                if (criteria.contentType !== warmupProcess_1.ContentType.ANY) {
                    const fallbackCriteria = { ...criteria, contentType: warmupProcess_1.ContentType.ANY };
                    return await this.selectContentForPhase(fallbackCriteria);
                }
                return null;
            }
            return result.rows[0];
        }
        catch (error) {
            console.error('Error selecting content for phase:', error);
            throw new Error('Failed to select content');
        }
    }
    async selectTextForPhase(criteria) {
        try {
            let query = `
        SELECT 
          id, model_id, content_type, text_content, quality_score,
          assignment_count, success_count, last_assigned_at, is_blacklisted,
          CASE 
            WHEN assignment_count = 0 THEN 0.0
            ELSE (success_count::decimal / assignment_count) * 100
          END as success_rate
        FROM available_warmup_text
        WHERE model_id = $1 
          AND content_type = $2
          AND is_blacklisted = false
      `;
            const params = [criteria.modelId, criteria.contentType];
            let paramIndex = 3;
            if (criteria.minQualityScore) {
                query += ` AND quality_score >= $${paramIndex}`;
                params.push(criteria.minQualityScore);
                paramIndex++;
            }
            if (criteria.maxUsageCount) {
                query += ` AND assignment_count <= $${paramIndex}`;
                params.push(criteria.maxUsageCount);
                paramIndex++;
            }
            if (criteria.excludeUsedContent) {
                query += ` AND (last_assigned_at IS NULL OR last_assigned_at < CURRENT_TIMESTAMP - INTERVAL '7 days')`;
            }
            if (criteria.contentType === 'username') {
                query += ` AND id NOT IN (
          SELECT DISTINCT assigned_text_id 
          FROM account_warmup_phases 
          WHERE phase = 'username' 
          AND assigned_text_id IS NOT NULL
        )`;
            }
            query += ` ORDER BY quality_score DESC, assignment_count ASC, RANDOM() LIMIT 1`;
            const result = await database_1.db.query(query, params);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            console.error('Error selecting text for phase:', error);
            throw new Error('Failed to select text');
        }
    }
    async assignContentToPhase(accountId, warmupPhaseId, contentType, modelId) {
        try {
            const criteria = {
                modelId,
                contentType,
                accountId,
                excludeUsedContent: true,
                minQualityScore: 20.0,
                maxUsageCount: 50
            };
            let selectedContent = null;
            let selectedText = null;
            if ([warmupProcess_1.ContentType.PFP, warmupProcess_1.ContentType.POST, warmupProcess_1.ContentType.HIGHLIGHT, warmupProcess_1.ContentType.STORY].includes(contentType)) {
                selectedContent = await this.selectContentForPhase(criteria);
            }
            if ([warmupProcess_1.ContentType.BIO, warmupProcess_1.ContentType.POST, warmupProcess_1.ContentType.HIGHLIGHT, warmupProcess_1.ContentType.STORY].includes(contentType)) {
                selectedText = await this.selectTextForPhase(criteria);
            }
            if (!selectedContent && !selectedText) {
                console.warn(`No content available for ${contentType} in model ${modelId}`);
                return null;
            }
            const assignmentScore = this.calculateAssignmentScore(selectedContent, selectedText);
            const assignmentReason = this.getAssignmentReason(selectedContent, selectedText);
            const assignmentQuery = `
        INSERT INTO warmup_content_assignments (
          account_id, warmup_phase_id, content_id, text_id, content_type,
          assignment_score, assignment_reason, assignment_algorithm,
          assigned_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
            const assignmentParams = [
                accountId,
                warmupPhaseId,
                selectedContent?.id || null,
                selectedText?.id || null,
                contentType,
                assignmentScore,
                assignmentReason,
                'quality_score_v1',
                'system'
            ];
            const assignmentResult = await database_1.db.query(assignmentQuery, assignmentParams);
            await database_1.db.query(`
        UPDATE account_warmup_phases 
        SET 
          status = 'content_assigned',
          assigned_content_id = $2,
          assigned_text_id = $3,
          content_assigned_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [warmupPhaseId, selectedContent?.id || null, selectedText?.id || null]);
            return assignmentResult.rows[0];
        }
        catch (error) {
            console.error('Error assigning content to phase:', error);
            throw new Error('Failed to assign content to phase');
        }
    }
    async getAssignedContent(warmupPhaseId) {
        try {
            const result = await database_1.db.query(`
        SELECT 
          wca.*,
          mc.image_url,
          mc.content_type as image_content_type,
          tp.text_content,
          tp.content_type as text_content_type
        FROM warmup_content_assignments wca
        LEFT JOIN model_content mc ON wca.content_id = mc.id
        LEFT JOIN text_pools tp ON wca.text_id = tp.id
        WHERE wca.warmup_phase_id = $1
        ORDER BY wca.assigned_at DESC
        LIMIT 1
      `, [warmupPhaseId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        }
        catch (error) {
            console.error('Error fetching assigned content:', error);
            throw new Error('Failed to fetch assigned content');
        }
    }
    async markContentAsUsed(assignmentId, success, performanceScore, engagementMetrics) {
        try {
            await database_1.db.query(`
        UPDATE warmup_content_assignments 
        SET 
          used_at = CURRENT_TIMESTAMP,
          success = $2,
          performance_score = $3,
          engagement_metrics = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [assignmentId, success, performanceScore, JSON.stringify(engagementMetrics)]);
        }
        catch (error) {
            console.error('Error marking content as used:', error);
            throw new Error('Failed to mark content as used');
        }
    }
    async getContentAssignmentStatistics(modelId, days = 30) {
        try {
            const result = await database_1.db.query(`
        SELECT 
          -- Assignment counts
          COUNT(wca.id) as total_assignments,
          COUNT(CASE WHEN wca.used_at IS NOT NULL THEN 1 END) as used_assignments,
          COUNT(CASE WHEN wca.success = true THEN 1 END) as successful_assignments,
          
          -- Success rates
          CASE 
            WHEN COUNT(CASE WHEN wca.used_at IS NOT NULL THEN 1 END) > 0 THEN
              ROUND((COUNT(CASE WHEN wca.success = true THEN 1 END)::decimal / 
                     COUNT(CASE WHEN wca.used_at IS NOT NULL THEN 1 END)) * 100, 2)
            ELSE 0 
          END as success_rate_percent,
          
          -- Performance metrics
          ROUND(AVG(wca.performance_score), 2) as avg_performance_score,
          ROUND(AVG(wca.assignment_score), 2) as avg_assignment_score,
          
          -- Content type breakdown
          json_object_agg(
            wca.content_type,
            json_build_object(
              'total', COUNT(CASE WHEN wca.content_type IS NOT NULL THEN 1 END),
              'used', COUNT(CASE WHEN wca.used_at IS NOT NULL THEN 1 END),
              'successful', COUNT(CASE WHEN wca.success = true THEN 1 END),
              'avg_score', ROUND(AVG(wca.performance_score), 2)
            )
          ) FILTER (WHERE wca.content_type IS NOT NULL) as content_type_breakdown
          
        FROM warmup_content_assignments wca
        JOIN account_warmup_phases awp ON wca.warmup_phase_id = awp.id
        JOIN accounts a ON awp.account_id = a.id
        WHERE a.model_id = $1
          AND wca.assigned_at > CURRENT_TIMESTAMP - INTERVAL '${days} days'
      `, [modelId]);
            return result.rows[0];
        }
        catch (error) {
            console.error('Error fetching content assignment statistics:', error);
            throw new Error('Failed to fetch content assignment statistics');
        }
    }
    async getContentPerformanceAnalytics(modelId) {
        try {
            const result = await database_1.db.query(`
        SELECT 
          'image' as content_category,
          mc.id,
          mc.content_type,
          mc.image_url as content_reference,
          mc.quality_score,
          mc.assignment_count,
          mc.success_count,
          mc.failure_count,
          CASE 
            WHEN mc.assignment_count > 0 THEN 
              ROUND((mc.success_count::decimal / mc.assignment_count) * 100, 2)
            ELSE 0 
          END as success_rate,
          mc.avg_performance_score,
          mc.last_assigned_at
        FROM model_content mc
        WHERE mc.model_id = $1
        
        UNION ALL
        
        SELECT 
          'text' as content_category,
          tp.id,
          tp.content_type,
          SUBSTRING(tp.text_content, 1, 50) || '...' as content_reference,
          tp.quality_score,
          tp.assignment_count,
          tp.success_count,
          tp.failure_count,
          CASE 
            WHEN tp.assignment_count > 0 THEN 
              ROUND((tp.success_count::decimal / tp.assignment_count) * 100, 2)
            ELSE 0 
          END as success_rate,
          tp.avg_performance_score,
          tp.last_assigned_at
        FROM text_pools tp
        WHERE tp.model_id = $1
        
        ORDER BY assignment_count DESC, success_rate DESC
      `, [modelId]);
            return result.rows;
        }
        catch (error) {
            console.error('Error fetching content performance analytics:', error);
            throw new Error('Failed to fetch content performance analytics');
        }
    }
    async blacklistContent(contentId, contentCategory, reason) {
        try {
            const table = contentCategory === 'image' ? 'model_content' : 'text_pools';
            await database_1.db.query(`
        UPDATE ${table} 
        SET 
          is_blacklisted = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [contentId]);
            console.log(`Content ${contentId} blacklisted: ${reason}`);
        }
        catch (error) {
            console.error('Error blacklisting content:', error);
            throw new Error('Failed to blacklist content');
        }
    }
    calculateAssignmentScore(imageContent, textContent) {
        let totalScore = 0;
        let contentCount = 0;
        if (imageContent) {
            totalScore += imageContent.qualityScore;
            contentCount++;
        }
        if (textContent) {
            totalScore += textContent.qualityScore;
            contentCount++;
        }
        return contentCount > 0 ? totalScore / contentCount : 0;
    }
    getAssignmentReason(imageContent, textContent) {
        const reasons = [];
        if (imageContent) {
            reasons.push(`Image: score ${imageContent.qualityScore}, used ${imageContent.assignmentCount} times`);
        }
        if (textContent) {
            reasons.push(`Text: score ${textContent.qualityScore}, used ${textContent.assignmentCount} times`);
        }
        return reasons.join('; ');
    }
}
exports.ContentAssignmentService = ContentAssignmentService;
//# sourceMappingURL=ContentAssignmentService.js.map