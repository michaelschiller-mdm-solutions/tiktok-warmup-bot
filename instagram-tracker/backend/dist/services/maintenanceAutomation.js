"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceAutomationService = void 0;
const logger_1 = require("../utils/logger");
const conflictDetection_1 = require("./conflictDetection");
const contentSelection_1 = require("./contentSelection");
const positionAutomation_1 = require("./positionAutomation");
const performanceOptimization_1 = require("./performanceOptimization");
class MaintenanceAutomationService {
    constructor(prisma, config = {}) {
        this.prisma = prisma;
        this.logger = (0, logger_1.createLogger)('MaintenanceAutomation');
        this.conflictDetection = new conflictDetection_1.ConflictDetectionService(prisma);
        this.contentSelection = new contentSelection_1.ContentSelectionService(prisma);
        this.positionAutomation = new positionAutomation_1.PositionAutomationService(prisma);
        this.performanceOptimization = new performanceOptimization_1.PerformanceOptimizationService(prisma);
        this.config = {
            maxRetries: 3,
            retryDelayMs: 5000,
            maxConcurrentJobs: 5,
            conflictDetectionEnabled: true,
            performanceOptimizationEnabled: true,
            emergencyOverrideEnabled: true,
            healthCheckIntervalMs: 60000,
            jobTimeoutMs: 300000,
            ...config
        };
        this.activeJobs = new Map();
        this.jobQueue = [];
        this.isProcessing = false;
        this.startHealthMonitoring();
    }
    async scheduleMaintenance(groupId, accountId, userId, scheduledFor, maintenanceType = 'scheduled', priority = 1, metadata = {}) {
        const jobId = `maintenance_${groupId}_${accountId}_${Date.now()}`;
        try {
            await this.prisma.maintenanceJob.create({
                data: {
                    id: jobId,
                    groupId,
                    accountId,
                    userId,
                    type: maintenanceType,
                    status: 'pending',
                    scheduledFor,
                    priority,
                    metadata,
                    createdAt: new Date(),
                    retryCount: 0
                }
            });
            if (scheduledFor <= new Date()) {
                await this.queueJob({
                    jobId,
                    groupId,
                    accountId,
                    userId,
                    maintenanceType,
                    scheduledFor,
                    priority,
                    retryCount: 0,
                    metadata
                });
            }
            this.logger.info(`Maintenance scheduled`, {
                jobId,
                groupId,
                accountId,
                scheduledFor,
                maintenanceType,
                priority
            });
            return jobId;
        }
        catch (error) {
            this.logger.error(`Failed to schedule maintenance`, {
                error: error.message,
                groupId,
                accountId,
                scheduledFor
            });
            throw error;
        }
    }
    async executeImmediateMaintenance(groupId, accountId, userId, overrideConflicts = false, metadata = {}) {
        if (!this.config.emergencyOverrideEnabled) {
            throw new Error('Emergency override is disabled');
        }
        const jobId = await this.scheduleMaintenance(groupId, accountId, userId, new Date(), 'emergency', 10, { ...metadata, overrideConflicts });
        return await this.executeMaintenanceJob(jobId);
    }
    async queueJob(context) {
        if (this.activeJobs.has(context.jobId) ||
            this.jobQueue.find(job => job.jobId === context.jobId)) {
            this.logger.warn(`Job already queued or active`, { jobId: context.jobId });
            return;
        }
        const insertIndex = this.jobQueue.findIndex(job => job.priority < context.priority);
        if (insertIndex === -1) {
            this.jobQueue.push(context);
        }
        else {
            this.jobQueue.splice(insertIndex, 0, context);
        }
        this.logger.debug(`Job queued`, {
            jobId: context.jobId,
            position: insertIndex === -1 ? this.jobQueue.length : insertIndex,
            queueSize: this.jobQueue.length
        });
        if (!this.isProcessing) {
            this.processJobQueue();
        }
    }
    async processJobQueue() {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;
        this.logger.info('Starting job queue processing');
        try {
            while (this.jobQueue.length > 0 && this.activeJobs.size < this.config.maxConcurrentJobs) {
                const job = this.jobQueue.shift();
                if (!job)
                    continue;
                this.executeJobAsync(job);
            }
        }
        catch (error) {
            this.logger.error('Error in job queue processing', { error: error.message });
        }
        finally {
            this.isProcessing = false;
        }
        if (this.jobQueue.length > 0) {
            setTimeout(() => this.processJobQueue(), 1000);
        }
    }
    async executeJobAsync(context) {
        this.activeJobs.set(context.jobId, context);
        try {
            await this.executeMaintenanceJob(context.jobId);
        }
        catch (error) {
            this.logger.error(`Job execution failed`, {
                jobId: context.jobId,
                error: error.message
            });
        }
        finally {
            this.activeJobs.delete(context.jobId);
            if (this.jobQueue.length > 0) {
                setTimeout(() => this.processJobQueue(), 100);
            }
        }
    }
    async executeMaintenanceJob(jobId) {
        const startTime = Date.now();
        let result;
        try {
            const job = await this.prisma.maintenanceJob.findUnique({
                where: { id: jobId },
                include: {
                    highlightGroup: {
                        include: {
                            content: true,
                            account: true
                        }
                    }
                }
            });
            if (!job) {
                throw new Error(`Maintenance job not found: ${jobId}`);
            }
            if (job.status !== 'pending' && job.status !== 'retrying') {
                throw new Error(`Job is not in executable state: ${job.status}`);
            }
            this.logger.info(`Starting maintenance execution`, {
                jobId,
                groupId: job.groupId,
                accountId: job.accountId,
                type: job.type
            });
            await this.prisma.maintenanceJob.update({
                where: { id: jobId },
                data: {
                    status: 'running',
                    startedAt: new Date(),
                    executionMetadata: {
                        startTime,
                        workerNode: process.env.NODE_ID || 'unknown'
                    }
                }
            });
            result = await this.executeMaintenancePhases(job);
            await this.prisma.maintenanceJob.update({
                where: { id: jobId },
                data: {
                    status: result.success ? 'completed' : 'failed',
                    completedAt: new Date(),
                    result: result,
                    executionMetadata: {
                        ...job.executionMetadata,
                        endTime: Date.now(),
                        duration: Date.now() - startTime
                    }
                }
            });
            this.logger.info(`Maintenance execution completed`, {
                jobId,
                success: result.success,
                duration: Date.now() - startTime,
                contentUpdated: result.contentUpdated,
                positionsChanged: result.positionsChanged
            });
            return result;
        }
        catch (error) {
            this.logger.error(`Maintenance execution failed`, {
                jobId,
                error: error.message,
                duration: Date.now() - startTime
            });
            const shouldRetry = await this.handleJobFailure(jobId, error);
            result = {
                success: false,
                jobId,
                groupId: 0,
                accountId: 0,
                executedAt: new Date(),
                contentUpdated: 0,
                positionsChanged: 0,
                conflictsResolved: 0,
                errors: [error.message]
            };
            if (!shouldRetry) {
                await this.prisma.maintenanceJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'failed',
                        completedAt: new Date(),
                        result: result
                    }
                });
            }
            return result;
        }
    }
    async executeMaintenancePhases(job) {
        const result = {
            success: false,
            jobId: job.id,
            groupId: job.groupId,
            accountId: job.accountId,
            executedAt: new Date(),
            contentUpdated: 0,
            positionsChanged: 0,
            conflictsResolved: 0,
            errors: []
        };
        try {
            if (this.config.conflictDetectionEnabled && !job.metadata?.overrideConflicts) {
                this.logger.debug(`Phase 1: Conflict detection`, { jobId: job.id });
                const conflicts = await this.conflictDetection.detectMaintenanceConflicts(job.groupId, job.accountId, new Date());
                if (conflicts.length > 0) {
                    const resolved = await this.conflictDetection.resolveConflicts(conflicts);
                    result.conflictsResolved = resolved.length;
                    if (conflicts.length > resolved.length) {
                        result.errors.push(`Unable to resolve ${conflicts.length - resolved.length} conflicts`);
                        if (job.type !== 'emergency') {
                            await this.postponeMaintenanceJob(job.id, 'Conflicts detected');
                            return { ...result, success: false };
                        }
                    }
                }
            }
            this.logger.debug(`Phase 2: Content selection`, { jobId: job.id });
            const selectedContent = await this.contentSelection.selectMaintenanceContent(job.groupId, job.highlightGroup.maintenanceContentCount || 3, {
                respectSeasonal: true,
                avoidRecent: true,
                optimizeForPerformance: this.config.performanceOptimizationEnabled
            });
            if (selectedContent.length === 0) {
                result.errors.push('No suitable content available for maintenance');
                return { ...result, success: false };
            }
            this.logger.debug(`Phase 3: Content update`, { jobId: job.id });
            const updateResult = await this.updateHighlightContent(job.groupId, job.accountId, selectedContent);
            result.contentUpdated = updateResult.contentUpdated;
            if (updateResult.errors.length > 0) {
                result.errors.push(...updateResult.errors);
            }
            this.logger.debug(`Phase 4: Position management`, { jobId: job.id });
            const positionResult = await this.positionAutomation.updatePositionAfterMaintenance(job.groupId, job.accountId, job.highlightGroup.currentPosition);
            result.positionsChanged = positionResult.positionsChanged;
            if (positionResult.errors.length > 0) {
                result.errors.push(...positionResult.errors);
            }
            if (this.config.performanceOptimizationEnabled) {
                this.logger.debug(`Phase 5: Performance optimization`, { jobId: job.id });
                await this.performanceOptimization.recordMaintenancePerformance(job.groupId, job.accountId, {
                    contentUpdated: result.contentUpdated,
                    executionTime: Date.now(),
                    conflictsResolved: result.conflictsResolved
                });
            }
            const nextMaintenance = await this.scheduleNextMaintenance(job.groupId, job.highlightGroup);
            result.nextScheduledMaintenance = nextMaintenance;
            result.success = result.errors.length === 0;
            return result;
        }
        catch (error) {
            result.errors.push(error.message);
            result.success = false;
            return result;
        }
    }
    async updateHighlightContent(groupId, accountId, contentIds) {
        try {
            await this.prisma.highlightGroupContent.deleteMany({
                where: { highlightGroupId: groupId }
            });
            await this.prisma.highlightGroupContent.createMany({
                data: contentIds.map((contentId, index) => ({
                    highlightGroupId: groupId,
                    contentId,
                    position: index + 1,
                    addedAt: new Date()
                }))
            });
            await this.prisma.highlightGroup.update({
                where: { id: groupId },
                data: {
                    lastMaintenanceDate: new Date(),
                    contentPoolSize: contentIds.length
                }
            });
            return { contentUpdated: contentIds.length, errors: [] };
        }
        catch (error) {
            return { contentUpdated: 0, errors: [error.message] };
        }
    }
    async scheduleNextMaintenance(groupId, group) {
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + (group.maintenanceFrequencyWeeks * 7));
        await this.prisma.highlightGroup.update({
            where: { id: groupId },
            data: { nextMaintenanceDate: nextDate }
        });
        await this.scheduleMaintenance(groupId, group.accountId, group.userId, nextDate, 'scheduled');
        return nextDate;
    }
    async handleJobFailure(jobId, error) {
        const job = await this.prisma.maintenanceJob.findUnique({
            where: { id: jobId }
        });
        if (!job || job.retryCount >= this.config.maxRetries) {
            return false;
        }
        await this.prisma.maintenanceJob.update({
            where: { id: jobId },
            data: {
                status: 'retrying',
                retryCount: job.retryCount + 1,
                lastError: error.message,
                scheduledFor: new Date(Date.now() + this.config.retryDelayMs * Math.pow(2, job.retryCount))
            }
        });
        this.logger.info(`Job scheduled for retry`, {
            jobId,
            retryCount: job.retryCount + 1,
            retryAt: new Date(Date.now() + this.config.retryDelayMs * Math.pow(2, job.retryCount))
        });
        return true;
    }
    async postponeMaintenanceJob(jobId, reason) {
        const postponeUntil = new Date(Date.now() + 3600000);
        await this.prisma.maintenanceJob.update({
            where: { id: jobId },
            data: {
                status: 'postponed',
                scheduledFor: postponeUntil,
                metadata: {
                    postponeReason: reason,
                    originalSchedule: new Date()
                }
            }
        });
        this.logger.info(`Job postponed`, { jobId, reason, postponeUntil });
    }
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                await this.performHealthCheck();
            }
            catch (error) {
                this.logger.error('Health check failed', { error: error.message });
            }
        }, this.config.healthCheckIntervalMs);
    }
    async performHealthCheck() {
        const stuckJobs = await this.prisma.maintenanceJob.findMany({
            where: {
                status: 'running',
                startedAt: {
                    lt: new Date(Date.now() - this.config.jobTimeoutMs)
                }
            }
        });
        for (const job of stuckJobs) {
            this.logger.warn(`Stuck job detected`, { jobId: job.id });
            await this.prisma.maintenanceJob.update({
                where: { id: job.id },
                data: {
                    status: 'failed',
                    completedAt: new Date(),
                    lastError: 'Job timeout'
                }
            });
        }
        const overdueJobs = await this.prisma.maintenanceJob.findMany({
            where: {
                status: 'pending',
                scheduledFor: {
                    lt: new Date(Date.now() - 300000)
                }
            }
        });
        for (const job of overdueJobs) {
            await this.queueJob({
                jobId: job.id,
                groupId: job.groupId,
                accountId: job.accountId,
                userId: job.userId,
                maintenanceType: job.type,
                scheduledFor: job.scheduledFor,
                priority: job.priority,
                retryCount: job.retryCount,
                metadata: job.metadata
            });
        }
        this.logger.debug('Health check completed', {
            activeJobs: this.activeJobs.size,
            queuedJobs: this.jobQueue.length,
            stuckJobs: stuckJobs.length,
            overdueJobs: overdueJobs.length
        });
    }
    async getAutomationStatus() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalJobs, completedJobs] = await Promise.all([
            this.prisma.maintenanceJob.count({
                where: { createdAt: { gte: today } }
            }),
            this.prisma.maintenanceJob.count({
                where: {
                    createdAt: { gte: today },
                    status: 'completed'
                }
            })
        ]);
        const avgExecution = await this.prisma.maintenanceJob.aggregate({
            where: {
                createdAt: { gte: today },
                status: 'completed',
                executionMetadata: { not: null }
            },
            _avg: {}
        });
        return {
            isRunning: this.isProcessing,
            activeJobs: this.activeJobs.size,
            queuedJobs: this.jobQueue.length,
            totalJobsToday: totalJobs,
            successRate: totalJobs > 0 ? completedJobs / totalJobs : 0,
            averageExecutionTime: 0
        };
    }
    async shutdown() {
        this.logger.info('Shutting down maintenance automation service');
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        const shutdownTimeout = 30000;
        const startTime = Date.now();
        while (this.activeJobs.size > 0 && Date.now() - startTime < shutdownTimeout) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        if (this.activeJobs.size > 0) {
            this.logger.warn(`Shutdown with ${this.activeJobs.size} active jobs remaining`);
        }
        this.logger.info('Maintenance automation service shutdown complete');
    }
}
exports.MaintenanceAutomationService = MaintenanceAutomationService;
exports.default = MaintenanceAutomationService;
//# sourceMappingURL=maintenanceAutomation.js.map