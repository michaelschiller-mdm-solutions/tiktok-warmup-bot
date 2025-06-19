import { PrismaClient } from '@prisma/client';
import { createLogger, Logger } from '../utils/logger';
import { MaintenanceJob, MaintenanceJobStatus, MaintenanceJobType } from '../types/maintenance';
import { ConflictDetectionService } from './conflictDetection';
import { ContentSelectionService } from './contentSelection';
import { PositionAutomationService } from './positionAutomation';
import { PerformanceOptimizationService } from './performanceOptimization';

export interface MaintenanceExecutionResult {
  success: boolean;
  jobId: string;
  groupId: number;
  accountId: number;
  executedAt: Date;
  contentUpdated: number;
  positionsChanged: number;
  conflictsResolved: number;
  errors: string[];
  nextScheduledMaintenance?: Date;
}

export interface MaintenanceOperationContext {
  jobId: string;
  groupId: number;
  accountId: number;
  userId: number;
  maintenanceType: MaintenanceJobType;
  scheduledFor: Date;
  priority: number;
  retryCount: number;
  metadata: Record<string, any>;
}

export interface MaintenanceAutomationConfig {
  maxRetries: number;
  retryDelayMs: number;
  maxConcurrentJobs: number;
  conflictDetectionEnabled: boolean;
  performanceOptimizationEnabled: boolean;
  emergencyOverrideEnabled: boolean;
  healthCheckIntervalMs: number;
  jobTimeoutMs: number;
}

export class MaintenanceAutomationService {
  private prisma: PrismaClient;
  private logger: Logger;
  private conflictDetection: ConflictDetectionService;
  private contentSelection: ContentSelectionService;
  private positionAutomation: PositionAutomationService;
  private performanceOptimization: PerformanceOptimizationService;
  private config: MaintenanceAutomationConfig;
  private activeJobs: Map<string, MaintenanceOperationContext>;
  private jobQueue: MaintenanceOperationContext[];
  private isProcessing: boolean;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    prisma: PrismaClient,
    config: Partial<MaintenanceAutomationConfig> = {}
  ) {
    this.prisma = prisma;
    this.logger = createLogger('MaintenanceAutomation');
    this.conflictDetection = new ConflictDetectionService(prisma);
    this.contentSelection = new ContentSelectionService(prisma);
    this.positionAutomation = new PositionAutomationService(prisma);
    this.performanceOptimization = new PerformanceOptimizationService(prisma);
    
    this.config = {
      maxRetries: 3,
      retryDelayMs: 5000,
      maxConcurrentJobs: 5,
      conflictDetectionEnabled: true,
      performanceOptimizationEnabled: true,
      emergencyOverrideEnabled: true,
      healthCheckIntervalMs: 60000, // 1 minute
      jobTimeoutMs: 300000, // 5 minutes
      ...config
    };

    this.activeJobs = new Map();
    this.jobQueue = [];
    this.isProcessing = false;

    this.startHealthMonitoring();
  }

  /**
   * Schedule a maintenance operation for execution
   */
  async scheduleMaintenance(
    groupId: number,
    accountId: number,
    userId: number,
    scheduledFor: Date,
    maintenanceType: MaintenanceJobType = 'scheduled',
    priority: number = 1,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const jobId = `maintenance_${groupId}_${accountId}_${Date.now()}`;
    
    try {
      // Create maintenance job record
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

      // Add to queue if should execute now
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
    } catch (error) {
      this.logger.error(`Failed to schedule maintenance`, {
        error: error.message,
        groupId,
        accountId,
        scheduledFor
      });
      throw error;
    }
  }

  /**
   * Execute immediate maintenance (emergency override)
   */
  async executeImmediateMaintenance(
    groupId: number,
    accountId: number,
    userId: number,
    overrideConflicts: boolean = false,
    metadata: Record<string, any> = {}
  ): Promise<MaintenanceExecutionResult> {
    if (!this.config.emergencyOverrideEnabled) {
      throw new Error('Emergency override is disabled');
    }

    const jobId = await this.scheduleMaintenance(
      groupId,
      accountId,
      userId,
      new Date(),
      'emergency',
      10, // High priority
      { ...metadata, overrideConflicts }
    );

    // Process immediately
    return await this.executeMaintenanceJob(jobId);
  }

  /**
   * Add job to processing queue
   */
  private async queueJob(context: MaintenanceOperationContext): Promise<void> {
    // Check if job already queued or active
    if (this.activeJobs.has(context.jobId) || 
        this.jobQueue.find(job => job.jobId === context.jobId)) {
      this.logger.warn(`Job already queued or active`, { jobId: context.jobId });
      return;
    }

    // Insert job in priority order
    const insertIndex = this.jobQueue.findIndex(job => job.priority < context.priority);
    if (insertIndex === -1) {
      this.jobQueue.push(context);
    } else {
      this.jobQueue.splice(insertIndex, 0, context);
    }

    this.logger.debug(`Job queued`, {
      jobId: context.jobId,
      position: insertIndex === -1 ? this.jobQueue.length : insertIndex,
      queueSize: this.jobQueue.length
    });

    // Start processing if not already running
    if (!this.isProcessing) {
      this.processJobQueue();
    }
  }

  /**
   * Process the job queue
   */
  private async processJobQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.logger.info('Starting job queue processing');

    try {
      while (this.jobQueue.length > 0 && this.activeJobs.size < this.config.maxConcurrentJobs) {
        const job = this.jobQueue.shift();
        if (!job) continue;

        // Start job execution asynchronously
        this.executeJobAsync(job);
      }
    } catch (error) {
      this.logger.error('Error in job queue processing', { error: error.message });
    } finally {
      this.isProcessing = false;
    }

    // Schedule next processing if queue has items
    if (this.jobQueue.length > 0) {
      setTimeout(() => this.processJobQueue(), 1000);
    }
  }

  /**
   * Execute job asynchronously
   */
  private async executeJobAsync(context: MaintenanceOperationContext): Promise<void> {
    this.activeJobs.set(context.jobId, context);

    try {
      await this.executeMaintenanceJob(context.jobId);
    } catch (error) {
      this.logger.error(`Job execution failed`, {
        jobId: context.jobId,
        error: error.message
      });
    } finally {
      this.activeJobs.delete(context.jobId);
      
      // Continue processing queue
      if (this.jobQueue.length > 0) {
        setTimeout(() => this.processJobQueue(), 100);
      }
    }
  }

  /**
   * Execute a specific maintenance job
   */
  async executeMaintenanceJob(jobId: string): Promise<MaintenanceExecutionResult> {
    const startTime = Date.now();
    let result: MaintenanceExecutionResult;

    try {
      // Get job details
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

      // Update job status to running
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

      // Execute maintenance phases
      result = await this.executeMaintenancePhases(job);

      // Update job as completed
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
    } catch (error) {
      this.logger.error(`Maintenance execution failed`, {
        jobId,
        error: error.message,
        duration: Date.now() - startTime
      });

      // Handle retry logic
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

  /**
   * Execute all maintenance phases for a job
   */
  private async executeMaintenancePhases(job: any): Promise<MaintenanceExecutionResult> {
    const result: MaintenanceExecutionResult = {
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
      // Phase 1: Conflict Detection and Resolution
      if (this.config.conflictDetectionEnabled && !job.metadata?.overrideConflicts) {
        this.logger.debug(`Phase 1: Conflict detection`, { jobId: job.id });
        const conflicts = await this.conflictDetection.detectMaintenanceConflicts(
          job.groupId,
          job.accountId,
          new Date()
        );

        if (conflicts.length > 0) {
          const resolved = await this.conflictDetection.resolveConflicts(conflicts);
          result.conflictsResolved = resolved.length;
          
          if (conflicts.length > resolved.length) {
            result.errors.push(`Unable to resolve ${conflicts.length - resolved.length} conflicts`);
            // For non-emergency jobs, postpone rather than fail
            if (job.type !== 'emergency') {
              await this.postponeMaintenanceJob(job.id, 'Conflicts detected');
              return { ...result, success: false };
            }
          }
        }
      }

      // Phase 2: Content Selection and Rotation
      this.logger.debug(`Phase 2: Content selection`, { jobId: job.id });
      const selectedContent = await this.contentSelection.selectMaintenanceContent(
        job.groupId,
        job.highlightGroup.maintenanceContentCount || 3,
        {
          respectSeasonal: true,
          avoidRecent: true,
          optimizeForPerformance: this.config.performanceOptimizationEnabled
        }
      );

      if (selectedContent.length === 0) {
        result.errors.push('No suitable content available for maintenance');
        return { ...result, success: false };
      }

      // Phase 3: Content Update Execution
      this.logger.debug(`Phase 3: Content update`, { jobId: job.id });
      const updateResult = await this.updateHighlightContent(
        job.groupId,
        job.accountId,
        selectedContent
      );

      result.contentUpdated = updateResult.contentUpdated;
      if (updateResult.errors.length > 0) {
        result.errors.push(...updateResult.errors);
      }

      // Phase 4: Position Management
      this.logger.debug(`Phase 4: Position management`, { jobId: job.id });
      const positionResult = await this.positionAutomation.updatePositionAfterMaintenance(
        job.groupId,
        job.accountId,
        job.highlightGroup.currentPosition
      );

      result.positionsChanged = positionResult.positionsChanged;
      if (positionResult.errors.length > 0) {
        result.errors.push(...positionResult.errors);
      }

      // Phase 5: Performance Optimization
      if (this.config.performanceOptimizationEnabled) {
        this.logger.debug(`Phase 5: Performance optimization`, { jobId: job.id });
        await this.performanceOptimization.recordMaintenancePerformance(
          job.groupId,
          job.accountId,
          {
            contentUpdated: result.contentUpdated,
            executionTime: Date.now(),
            conflictsResolved: result.conflictsResolved
          }
        );
      }

      // Schedule next maintenance
      const nextMaintenance = await this.scheduleNextMaintenance(job.groupId, job.highlightGroup);
      result.nextScheduledMaintenance = nextMaintenance;

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push(error.message);
      result.success = false;
      return result;
    }
  }

  /**
   * Update highlight content through Instagram API
   */
  private async updateHighlightContent(
    groupId: number,
    accountId: number,
    contentIds: number[]
  ): Promise<{ contentUpdated: number; errors: string[] }> {
    // This would integrate with Instagram API
    // For now, just update the database
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

      // Update last maintenance date
      await this.prisma.highlightGroup.update({
        where: { id: groupId },
        data: {
          lastMaintenanceDate: new Date(),
          contentPoolSize: contentIds.length
        }
      });

      return { contentUpdated: contentIds.length, errors: [] };
    } catch (error) {
      return { contentUpdated: 0, errors: [error.message] };
    }
  }

  /**
   * Schedule next maintenance for a group
   */
  private async scheduleNextMaintenance(groupId: number, group: any): Promise<Date> {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (group.maintenanceFrequencyWeeks * 7));

    await this.prisma.highlightGroup.update({
      where: { id: groupId },
      data: { nextMaintenanceDate: nextDate }
    });

    // Schedule the job
    await this.scheduleMaintenance(
      groupId,
      group.accountId,
      group.userId,
      nextDate,
      'scheduled'
    );

    return nextDate;
  }

  /**
   * Handle job failure and retry logic
   */
  private async handleJobFailure(jobId: string, error: Error): Promise<boolean> {
    const job = await this.prisma.maintenanceJob.findUnique({
      where: { id: jobId }
    });

    if (!job || job.retryCount >= this.config.maxRetries) {
      return false;
    }

    // Update retry count and schedule retry
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

  /**
   * Postpone maintenance job due to conflicts
   */
  private async postponeMaintenanceJob(jobId: string, reason: string): Promise<void> {
    const postponeUntil = new Date(Date.now() + 3600000); // 1 hour

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

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Health check failed', { error: error.message });
      }
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Perform system health check
   */
  private async performHealthCheck(): Promise<void> {
    // Check for stuck jobs
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

    // Check for overdue jobs
    const overdueJobs = await this.prisma.maintenanceJob.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lt: new Date(Date.now() - 300000) // 5 minutes overdue
        }
      }
    });

    for (const job of overdueJobs) {
      await this.queueJob({
        jobId: job.id,
        groupId: job.groupId,
        accountId: job.accountId,
        userId: job.userId,
        maintenanceType: job.type as MaintenanceJobType,
        scheduledFor: job.scheduledFor,
        priority: job.priority,
        retryCount: job.retryCount,
        metadata: job.metadata as Record<string, any>
      });
    }

    this.logger.debug('Health check completed', {
      activeJobs: this.activeJobs.size,
      queuedJobs: this.jobQueue.length,
      stuckJobs: stuckJobs.length,
      overdueJobs: overdueJobs.length
    });
  }

  /**
   * Get automation status
   */
  async getAutomationStatus(): Promise<{
    isRunning: boolean;
    activeJobs: number;
    queuedJobs: number;
    totalJobsToday: number;
    successRate: number;
    averageExecutionTime: number;
  }> {
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
      _avg: {
        // This would need a computed field for duration
      }
    });

    return {
      isRunning: this.isProcessing,
      activeJobs: this.activeJobs.size,
      queuedJobs: this.jobQueue.length,
      totalJobsToday: totalJobs,
      successRate: totalJobs > 0 ? completedJobs / totalJobs : 0,
      averageExecutionTime: 0 // avgExecution._avg.duration || 0
    };
  }

  /**
   * Shutdown the automation service
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down maintenance automation service');
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Wait for active jobs to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
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

export default MaintenanceAutomationService; 