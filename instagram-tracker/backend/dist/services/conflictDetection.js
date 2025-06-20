"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictDetectionService = void 0;
const logger_1 = require("../utils/logger");
class ConflictDetectionService {
    constructor(prisma, config = {}) {
        this.prisma = prisma;
        this.logger = (0, logger_1.createLogger)('ConflictDetection');
        this.config = {
            enableRealTimeDetection: true,
            conflictLookaheadDays: 7,
            autoResolutionEnabled: true,
            severityThreshold: 'medium',
            notificationEnabled: true,
            maxAutoResolutionAttempts: 3,
            ...config
        };
        this.activeDetection = false;
        this.resolutionStrategies = this.initializeResolutionStrategies();
    }
    async detectMaintenanceConflicts(groupId, accountId, scheduledTime, duration = 30) {
        const conflicts = [];
        const endTime = new Date(scheduledTime.getTime() + duration * 60000);
        try {
            this.logger.debug('Starting conflict detection', {
                groupId,
                accountId,
                scheduledTime,
                duration
            });
            const sprintConflicts = await this.detectSprintOverlaps(accountId, scheduledTime, endTime);
            conflicts.push(...sprintConflicts);
            const highlightConflicts = await this.detectHighlightGroupConflicts(groupId, accountId, scheduledTime, endTime);
            conflicts.push(...highlightConflicts);
            const positionConflicts = await this.detectPositionConflicts(groupId, accountId, scheduledTime);
            conflicts.push(...positionConflicts);
            const resourceConflicts = await this.detectResourceConflicts(accountId, scheduledTime, endTime);
            conflicts.push(...resourceConflicts);
            await this.assessConflictSeverities(conflicts, groupId, accountId);
            this.logger.info('Conflict detection completed', {
                groupId,
                accountId,
                totalConflicts: conflicts.length,
                severities: this.groupConflictsBySeverity(conflicts)
            });
            return conflicts;
        }
        catch (error) {
            this.logger.error('Conflict detection failed', {
                error: error.message,
                groupId,
                accountId,
                scheduledTime
            });
            throw error;
        }
    }
    async detectSprintOverlaps(accountId, startTime, endTime) {
        const conflicts = [];
        const overlappingSprints = await this.prisma.contentSprint.findMany({
            where: {
                accountId,
                isActive: true,
                OR: [
                    {
                        startDate: { lte: endTime },
                        endDate: { gte: startTime }
                    }
                ]
            },
            include: {
                sprintType: true
            }
        });
        for (const sprint of overlappingSprints) {
            conflicts.push({
                id: `sprint_overlap_${sprint.id}_${Date.now()}`,
                type: 'sprint_overlap',
                severity: this.calculateSprintConflictSeverity(sprint),
                description: `Maintenance conflicts with active ${sprint.sprintType.name} sprint`,
                affectedGroupId: 0,
                affectedAccountId: accountId,
                conflictingResourceId: sprint.id,
                conflictingResourceType: 'content_sprint',
                detectedAt: new Date(),
                resolutionMetadata: {
                    sprintId: sprint.id,
                    sprintType: sprint.sprintType.name,
                    sprintStart: sprint.startDate,
                    sprintEnd: sprint.endDate,
                    priority: sprint.priority
                }
            });
        }
        return conflicts;
    }
    async detectHighlightGroupConflicts(groupId, accountId, startTime, endTime) {
        const conflicts = [];
        const currentGroup = await this.prisma.highlightGroup.findUnique({
            where: { id: groupId },
            include: {
                blocksHighlightGroups: true
            }
        });
        if (!currentGroup)
            return conflicts;
        const conflictingGroups = await this.prisma.highlightGroup.findMany({
            where: {
                id: { in: currentGroup.blocksHighlightGroups.map(bg => bg.blockedGroupId) },
                accountId,
                nextMaintenanceDate: {
                    gte: new Date(startTime.getTime() - 3600000),
                    lte: new Date(endTime.getTime() + 3600000)
                }
            }
        });
        for (const group of conflictingGroups) {
            conflicts.push({
                id: `highlight_conflict_${group.id}_${Date.now()}`,
                type: 'highlight_conflict',
                severity: 'medium',
                description: `Maintenance conflicts with blocked highlight group "${group.name}"`,
                affectedGroupId: groupId,
                affectedAccountId: accountId,
                conflictingResourceId: group.id,
                conflictingResourceType: 'highlight_group',
                detectedAt: new Date(),
                resolutionMetadata: {
                    conflictingGroupId: group.id,
                    conflictingGroupName: group.name,
                    nextMaintenance: group.nextMaintenanceDate,
                    blockingRule: 'explicit_blocking'
                }
            });
        }
        return conflicts;
    }
    async detectPositionConflicts(groupId, accountId, scheduledTime) {
        const conflicts = [];
        const currentGroup = await this.prisma.highlightGroup.findUnique({
            where: { id: groupId }
        });
        if (!currentGroup)
            return conflicts;
        const samePositionGroups = await this.prisma.highlightGroup.findMany({
            where: {
                accountId,
                currentPosition: currentGroup.currentPosition,
                id: { not: groupId },
                isActive: true
            }
        });
        if (samePositionGroups.length > 0) {
            conflicts.push({
                id: `position_conflict_${groupId}_${Date.now()}`,
                type: 'position_conflict',
                severity: 'high',
                description: `Multiple highlight groups at position ${currentGroup.currentPosition}`,
                affectedGroupId: groupId,
                affectedAccountId: accountId,
                conflictingResourceId: samePositionGroups[0].id,
                conflictingResourceType: 'position',
                detectedAt: new Date(),
                resolutionMetadata: {
                    position: currentGroup.currentPosition,
                    conflictingGroups: samePositionGroups.map(g => ({
                        id: g.id,
                        name: g.name
                    }))
                }
            });
        }
        return conflicts;
    }
    async detectResourceConflicts(accountId, startTime, endTime) {
        const conflicts = [];
        const concurrentMaintenance = await this.prisma.maintenanceJob.findMany({
            where: {
                accountId,
                status: { in: ['pending', 'running'] },
                scheduledFor: {
                    gte: new Date(startTime.getTime() - 1800000),
                    lte: new Date(endTime.getTime() + 1800000)
                }
            }
        });
        if (concurrentMaintenance.length > 2) {
            conflicts.push({
                id: `resource_conflict_${accountId}_${Date.now()}`,
                type: 'resource_conflict',
                severity: 'medium',
                description: `Too many concurrent maintenance operations (${concurrentMaintenance.length})`,
                affectedGroupId: 0,
                affectedAccountId: accountId,
                conflictingResourceId: accountId,
                conflictingResourceType: 'api_rate_limit',
                detectedAt: new Date(),
                resolutionMetadata: {
                    concurrentJobs: concurrentMaintenance.length,
                    jobIds: concurrentMaintenance.map(j => j.id)
                }
            });
        }
        return conflicts;
    }
    async assessConflictSeverities(conflicts, groupId, accountId) {
        for (const conflict of conflicts) {
            conflict.affectedGroupId = groupId;
            conflict.affectedAccountId = accountId;
            if (conflict.type === 'sprint_overlap') {
                const sprintData = conflict.resolutionMetadata;
                if (sprintData?.priority > 8) {
                    conflict.severity = 'critical';
                }
                else if (sprintData?.priority > 5) {
                    conflict.severity = 'high';
                }
            }
            if (conflict.type === 'position_conflict') {
                const position = conflict.resolutionMetadata?.position;
                if (position <= 3) {
                    conflict.severity = 'critical';
                }
            }
        }
    }
    calculateSprintConflictSeverity(sprint) {
        const priority = sprint.priority || 1;
        const sprintType = sprint.sprintType?.name?.toLowerCase() || '';
        if (priority >= 9 || sprintType.includes('emergency')) {
            return 'critical';
        }
        if (priority >= 7 || sprintType.includes('vacation')) {
            return 'high';
        }
        if (priority >= 5) {
            return 'medium';
        }
        return 'low';
    }
    async resolveConflicts(conflicts) {
        const results = [];
        if (!this.config.autoResolutionEnabled) {
            this.logger.info('Auto-resolution disabled, skipping conflict resolution');
            return results;
        }
        for (const conflict of conflicts) {
            if (!this.shouldAttemptResolution(conflict.severity)) {
                this.logger.debug('Skipping resolution due to severity threshold', {
                    conflictId: conflict.id,
                    severity: conflict.severity,
                    threshold: this.config.severityThreshold
                });
                continue;
            }
            const result = await this.resolveConflict(conflict);
            results.push(result);
        }
        return results;
    }
    async resolveConflict(conflict) {
        const context = {
            groupId: conflict.affectedGroupId,
            accountId: conflict.affectedAccountId,
            scheduledTime: new Date(),
            maintenanceType: 'scheduled',
            duration: 30,
            priority: 1,
            metadata: conflict.resolutionMetadata || {}
        };
        const applicableStrategies = this.resolutionStrategies
            .filter(strategy => strategy.canResolve(conflict))
            .sort((a, b) => b.priority - a.priority);
        if (applicableStrategies.length === 0) {
            return {
                conflictId: conflict.id,
                resolved: false,
                strategy: 'none',
                actions: [],
                errors: ['No applicable resolution strategy found'],
                metadata: {}
            };
        }
        for (const strategy of applicableStrategies) {
            try {
                this.logger.debug('Attempting conflict resolution', {
                    conflictId: conflict.id,
                    strategy: strategy.name
                });
                const result = await strategy.resolve(conflict, context);
                if (result.resolved) {
                    await this.markConflictResolved(conflict, strategy.name, result);
                    this.logger.info('Conflict resolved successfully', {
                        conflictId: conflict.id,
                        strategy: strategy.name,
                        actions: result.actions
                    });
                    return result;
                }
            }
            catch (error) {
                this.logger.warn('Resolution strategy failed', {
                    conflictId: conflict.id,
                    strategy: strategy.name,
                    error: error.message
                });
            }
        }
        return {
            conflictId: conflict.id,
            resolved: false,
            strategy: 'failed',
            actions: [],
            errors: ['All resolution strategies failed'],
            metadata: {}
        };
    }
    initializeResolutionStrategies() {
        return [
            {
                name: 'postpone_maintenance',
                description: 'Postpone maintenance to avoid conflicts',
                priority: 3,
                canResolve: (conflict) => conflict.type === 'sprint_overlap' && conflict.severity !== 'critical',
                resolve: async (conflict, context) => {
                    const postponeHours = this.calculatePostponePeriod(conflict);
                    const newTime = new Date(context.scheduledTime.getTime() + postponeHours * 3600000);
                    return {
                        conflictId: conflict.id,
                        resolved: true,
                        strategy: 'postpone_maintenance',
                        actions: [`Postponed maintenance by ${postponeHours} hours`],
                        errors: [],
                        metadata: { newScheduledTime: newTime, postponeHours }
                    };
                }
            },
            {
                name: 'reschedule_to_safe_window',
                description: 'Reschedule to next safe time window',
                priority: 5,
                canResolve: (conflict) => ['sprint_overlap', 'highlight_conflict'].includes(conflict.type),
                resolve: async (conflict, context) => {
                    const safeWindow = await this.findNextSafeWindow(context.accountId, context.scheduledTime, context.duration);
                    if (!safeWindow) {
                        return {
                            conflictId: conflict.id,
                            resolved: false,
                            strategy: 'reschedule_to_safe_window',
                            actions: [],
                            errors: ['No safe window found within lookahead period'],
                            metadata: {}
                        };
                    }
                    return {
                        conflictId: conflict.id,
                        resolved: true,
                        strategy: 'reschedule_to_safe_window',
                        actions: [`Rescheduled to safe window: ${safeWindow.toISOString()}`],
                        errors: [],
                        metadata: { newScheduledTime: safeWindow }
                    };
                }
            },
            {
                name: 'adjust_position_sequence',
                description: 'Adjust position sequence to resolve conflicts',
                priority: 4,
                canResolve: (conflict) => conflict.type === 'position_conflict',
                resolve: async (conflict, context) => {
                    const newPosition = await this.findNextAvailablePosition(context.accountId, conflict.resolutionMetadata?.position || 1);
                    return {
                        conflictId: conflict.id,
                        resolved: true,
                        strategy: 'adjust_position_sequence',
                        actions: [`Adjusted position to ${newPosition}`],
                        errors: [],
                        metadata: { newPosition }
                    };
                }
            },
            {
                name: 'stagger_concurrent_operations',
                description: 'Stagger concurrent operations to reduce resource conflicts',
                priority: 2,
                canResolve: (conflict) => conflict.type === 'resource_conflict',
                resolve: async (conflict, context) => {
                    const staggerDelay = 15;
                    const newTime = new Date(context.scheduledTime.getTime() + staggerDelay * 60000);
                    return {
                        conflictId: conflict.id,
                        resolved: true,
                        strategy: 'stagger_concurrent_operations',
                        actions: [`Staggered operation by ${staggerDelay} minutes`],
                        errors: [],
                        metadata: { newScheduledTime: newTime, staggerDelay }
                    };
                }
            }
        ];
    }
    shouldAttemptResolution(severity) {
        const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
        const thresholdLevel = severityLevels[this.config.severityThreshold];
        const conflictLevel = severityLevels[severity] || 1;
        return conflictLevel >= thresholdLevel;
    }
    calculatePostponePeriod(conflict) {
        const metadata = conflict.resolutionMetadata;
        if (metadata?.sprintEnd) {
            const sprintEnd = new Date(metadata.sprintEnd);
            const now = new Date();
            const hoursUntilEnd = Math.ceil((sprintEnd.getTime() - now.getTime()) / 3600000);
            return Math.max(1, hoursUntilEnd + 2);
        }
        return 24;
    }
    async findNextSafeWindow(accountId, startTime, duration) {
        const lookaheadMs = this.config.conflictLookaheadDays * 24 * 3600000;
        const endLookahead = new Date(startTime.getTime() + lookaheadMs);
        for (let hours = 1; hours <= this.config.conflictLookaheadDays * 24; hours++) {
            const candidateTime = new Date(startTime.getTime() + hours * 3600000);
            if (candidateTime > endLookahead)
                break;
            const conflicts = await this.detectMaintenanceConflicts(0, accountId, candidateTime, duration);
            if (conflicts.length === 0) {
                return candidateTime;
            }
        }
        return null;
    }
    async findNextAvailablePosition(accountId, startPosition) {
        for (let position = startPosition + 1; position <= 20; position++) {
            const existing = await this.prisma.highlightGroup.findFirst({
                where: {
                    accountId,
                    currentPosition: position,
                    isActive: true
                }
            });
            if (!existing) {
                return position;
            }
        }
        return startPosition + 1;
    }
    async markConflictResolved(conflict, strategy, result) {
        this.logger.info('Conflict marked as resolved', {
            conflictId: conflict.id,
            strategy,
            resolvedAt: new Date(),
            actions: result.actions
        });
    }
    groupConflictsBySeverity(conflicts) {
        return conflicts.reduce((acc, conflict) => {
            acc[conflict.severity] = (acc[conflict.severity] || 0) + 1;
            return acc;
        }, {});
    }
    async startRealTimeDetection() {
        if (!this.config.enableRealTimeDetection || this.activeDetection) {
            return;
        }
        this.activeDetection = true;
        this.logger.info('Starting real-time conflict detection');
    }
    async stopRealTimeDetection() {
        this.activeDetection = false;
        this.logger.info('Stopped real-time conflict detection');
    }
    getDetectionStatus() {
        return {
            isActive: this.activeDetection,
            config: this.config,
            strategiesAvailable: this.resolutionStrategies.length
        };
    }
}
exports.ConflictDetectionService = ConflictDetectionService;
exports.default = ConflictDetectionService;
//# sourceMappingURL=conflictDetection.js.map