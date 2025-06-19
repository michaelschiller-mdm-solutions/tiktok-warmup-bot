import { PrismaClient } from '@prisma/client';
import { createLogger, Logger } from '../utils/logger';
import {
  MaintenanceConflict,
  ConflictResolutionResult,
  MaintenanceJob
} from '../types/maintenance';

export interface ConflictDetectionConfig {
  enableRealTimeDetection: boolean;
  conflictLookaheadDays: number;
  autoResolutionEnabled: boolean;
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  notificationEnabled: boolean;
  maxAutoResolutionAttempts: number;
}

export interface ConflictContext {
  groupId: number;
  accountId: number;
  scheduledTime: Date;
  maintenanceType: string;
  duration: number; // minutes
  priority: number;
  metadata: Record<string, any>;
}

export interface ConflictResolutionStrategy {
  name: string;
  description: string;
  canResolve: (conflict: MaintenanceConflict) => boolean;
  resolve: (conflict: MaintenanceConflict, context: ConflictContext) => Promise<ConflictResolutionResult>;
  priority: number;
}

export class ConflictDetectionService {
  private prisma: PrismaClient;
  private logger: Logger;
  private config: ConflictDetectionConfig;
  private resolutionStrategies: ConflictResolutionStrategy[];
  private activeDetection: boolean;

  constructor(
    prisma: PrismaClient,
    config: Partial<ConflictDetectionConfig> = {}
  ) {
    this.prisma = prisma;
    this.logger = createLogger('ConflictDetection');
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

  /**
   * Detect maintenance conflicts for a specific group and time
   */
  async detectMaintenanceConflicts(
    groupId: number,
    accountId: number,
    scheduledTime: Date,
    duration: number = 30 // minutes
  ): Promise<MaintenanceConflict[]> {
    const conflicts: MaintenanceConflict[] = [];
    const endTime = new Date(scheduledTime.getTime() + duration * 60000);

    try {
      this.logger.debug('Starting conflict detection', {
        groupId,
        accountId,
        scheduledTime,
        duration
      });

      // 1. Check for sprint overlaps
      const sprintConflicts = await this.detectSprintOverlaps(
        accountId,
        scheduledTime,
        endTime
      );
      conflicts.push(...sprintConflicts);

      // 2. Check for highlight group conflicts
      const highlightConflicts = await this.detectHighlightGroupConflicts(
        groupId,
        accountId,
        scheduledTime,
        endTime
      );
      conflicts.push(...highlightConflicts);

      // 3. Check for position conflicts
      const positionConflicts = await this.detectPositionConflicts(
        groupId,
        accountId,
        scheduledTime
      );
      conflicts.push(...positionConflicts);

      // 4. Check for resource conflicts
      const resourceConflicts = await this.detectResourceConflicts(
        accountId,
        scheduledTime,
        endTime
      );
      conflicts.push(...resourceConflicts);

      // 5. Assess conflict severities
      await this.assessConflictSeverities(conflicts, groupId, accountId);

      this.logger.info('Conflict detection completed', {
        groupId,
        accountId,
        totalConflicts: conflicts.length,
        severities: this.groupConflictsBySeverity(conflicts)
      });

      return conflicts;
    } catch (error) {
      this.logger.error('Conflict detection failed', {
        error: error.message,
        groupId,
        accountId,
        scheduledTime
      });
      throw error;
    }
  }

  /**
   * Detect conflicts with active sprints
   */
  private async detectSprintOverlaps(
    accountId: number,
    startTime: Date,
    endTime: Date
  ): Promise<MaintenanceConflict[]> {
    const conflicts: MaintenanceConflict[] = [];

    // Query for overlapping sprints
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
        affectedGroupId: 0, // Will be set by caller
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

  /**
   * Detect conflicts with other highlight groups
   */
  private async detectHighlightGroupConflicts(
    groupId: number,
    accountId: number,
    startTime: Date,
    endTime: Date
  ): Promise<MaintenanceConflict[]> {
    const conflicts: MaintenanceConflict[] = [];

    // Get the current group's blocking rules
    const currentGroup = await this.prisma.highlightGroup.findUnique({
      where: { id: groupId },
      include: {
        blocksHighlightGroups: true
      }
    });

    if (!currentGroup) return conflicts;

    // Check for blocked highlight groups with overlapping maintenance
    const conflictingGroups = await this.prisma.highlightGroup.findMany({
      where: {
        id: { in: currentGroup.blocksHighlightGroups.map(bg => bg.blockedGroupId) },
        accountId,
        nextMaintenanceDate: {
          gte: new Date(startTime.getTime() - 3600000), // 1 hour before
          lte: new Date(endTime.getTime() + 3600000)     // 1 hour after
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

  /**
   * Detect position-related conflicts
   */
  private async detectPositionConflicts(
    groupId: number,
    accountId: number,
    scheduledTime: Date
  ): Promise<MaintenanceConflict[]> {
    const conflicts: MaintenanceConflict[] = [];

    // Check for position conflicts (multiple groups at same position)
    const currentGroup = await this.prisma.highlightGroup.findUnique({
      where: { id: groupId }
    });

    if (!currentGroup) return conflicts;

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

  /**
   * Detect resource conflicts (API rate limits, etc.)
   */
  private async detectResourceConflicts(
    accountId: number,
    startTime: Date,
    endTime: Date
  ): Promise<MaintenanceConflict[]> {
    const conflicts: MaintenanceConflict[] = [];

    // Check for concurrent maintenance operations
    const concurrentMaintenance = await this.prisma.maintenanceJob.findMany({
      where: {
        accountId,
        status: { in: ['pending', 'running'] },
        scheduledFor: {
          gte: new Date(startTime.getTime() - 1800000), // 30 minutes before
          lte: new Date(endTime.getTime() + 1800000)     // 30 minutes after
        }
      }
    });

    if (concurrentMaintenance.length > 2) { // Allow up to 2 concurrent operations
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

  /**
   * Assess and assign conflict severities
   */
  private async assessConflictSeverities(
    conflicts: MaintenanceConflict[],
    groupId: number,
    accountId: number
  ): Promise<void> {
    for (const conflict of conflicts) {
      conflict.affectedGroupId = groupId;
      conflict.affectedAccountId = accountId;

      // Enhance severity based on context
      if (conflict.type === 'sprint_overlap') {
        const sprintData = conflict.resolutionMetadata;
        if (sprintData?.priority > 8) {
          conflict.severity = 'critical';
        } else if (sprintData?.priority > 5) {
          conflict.severity = 'high';
        }
      }

      if (conflict.type === 'position_conflict') {
        const position = conflict.resolutionMetadata?.position;
        if (position <= 3) {
          conflict.severity = 'critical'; // Top 3 positions are critical
        }
      }
    }
  }

  /**
   * Calculate sprint conflict severity
   */
  private calculateSprintConflictSeverity(sprint: any): 'low' | 'medium' | 'high' | 'critical' {
    const priority = sprint.priority || 1;
    const sprintType = sprint.sprintType?.name?.toLowerCase() || '';

    // High-priority sprints
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

  /**
   * Resolve conflicts using available strategies
   */
  async resolveConflicts(conflicts: MaintenanceConflict[]): Promise<ConflictResolutionResult[]> {
    const results: ConflictResolutionResult[] = [];

    if (!this.config.autoResolutionEnabled) {
      this.logger.info('Auto-resolution disabled, skipping conflict resolution');
      return results;
    }

    for (const conflict of conflicts) {
      // Skip if severity is below threshold
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

  /**
   * Resolve a single conflict
   */
  private async resolveConflict(conflict: MaintenanceConflict): Promise<ConflictResolutionResult> {
    const context: ConflictContext = {
      groupId: conflict.affectedGroupId,
      accountId: conflict.affectedAccountId,
      scheduledTime: new Date(),
      maintenanceType: 'scheduled',
      duration: 30,
      priority: 1,
      metadata: conflict.resolutionMetadata || {}
    };

    // Find applicable resolution strategies
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

    // Try strategies in priority order
    for (const strategy of applicableStrategies) {
      try {
        this.logger.debug('Attempting conflict resolution', {
          conflictId: conflict.id,
          strategy: strategy.name
        });

        const result = await strategy.resolve(conflict, context);
        
        if (result.resolved) {
          // Mark conflict as resolved
          await this.markConflictResolved(conflict, strategy.name, result);
          
          this.logger.info('Conflict resolved successfully', {
            conflictId: conflict.id,
            strategy: strategy.name,
            actions: result.actions
          });

          return result;
        }
      } catch (error) {
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

  /**
   * Initialize resolution strategies
   */
  private initializeResolutionStrategies(): ConflictResolutionStrategy[] {
    return [
      {
        name: 'postpone_maintenance',
        description: 'Postpone maintenance to avoid conflicts',
        priority: 3,
        canResolve: (conflict) => 
          conflict.type === 'sprint_overlap' && conflict.severity !== 'critical',
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
        canResolve: (conflict) => 
          ['sprint_overlap', 'highlight_conflict'].includes(conflict.type),
        resolve: async (conflict, context) => {
          const safeWindow = await this.findNextSafeWindow(
            context.accountId,
            context.scheduledTime,
            context.duration
          );
          
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
          const newPosition = await this.findNextAvailablePosition(
            context.accountId,
            conflict.resolutionMetadata?.position || 1
          );
          
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
          const staggerDelay = 15; // minutes
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

  /**
   * Check if conflict severity warrants resolution attempt
   */
  private shouldAttemptResolution(severity: string): boolean {
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    const thresholdLevel = severityLevels[this.config.severityThreshold];
    const conflictLevel = severityLevels[severity] || 1;
    
    return conflictLevel >= thresholdLevel;
  }

  /**
   * Calculate postponement period based on conflict
   */
  private calculatePostponePeriod(conflict: MaintenanceConflict): number {
    const metadata = conflict.resolutionMetadata;
    
    if (metadata?.sprintEnd) {
      const sprintEnd = new Date(metadata.sprintEnd);
      const now = new Date();
      const hoursUntilEnd = Math.ceil((sprintEnd.getTime() - now.getTime()) / 3600000);
      return Math.max(1, hoursUntilEnd + 2); // 2 hours buffer
    }
    
    return 24; // Default 24 hours
  }

  /**
   * Find next safe time window for maintenance
   */
  private async findNextSafeWindow(
    accountId: number,
    startTime: Date,
    duration: number
  ): Promise<Date | null> {
    const lookaheadMs = this.config.conflictLookaheadDays * 24 * 3600000;
    const endLookahead = new Date(startTime.getTime() + lookaheadMs);
    
    // Simple algorithm: try every hour for the next week
    for (let hours = 1; hours <= this.config.conflictLookaheadDays * 24; hours++) {
      const candidateTime = new Date(startTime.getTime() + hours * 3600000);
      
      if (candidateTime > endLookahead) break;
      
      const conflicts = await this.detectMaintenanceConflicts(
        0, // groupId not needed for this check
        accountId,
        candidateTime,
        duration
      );
      
      if (conflicts.length === 0) {
        return candidateTime;
      }
    }
    
    return null;
  }

  /**
   * Find next available position for a highlight group
   */
  private async findNextAvailablePosition(accountId: number, startPosition: number): Promise<number> {
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
    
    return startPosition + 1; // Fallback
  }

  /**
   * Mark conflict as resolved in database
   */
  private async markConflictResolved(
    conflict: MaintenanceConflict,
    strategy: string,
    result: ConflictResolutionResult
  ): Promise<void> {
    // This would update a conflicts table if we had one
    // For now, just log the resolution
    this.logger.info('Conflict marked as resolved', {
      conflictId: conflict.id,
      strategy,
      resolvedAt: new Date(),
      actions: result.actions
    });
  }

  /**
   * Group conflicts by severity for reporting
   */
  private groupConflictsBySeverity(conflicts: MaintenanceConflict[]): Record<string, number> {
    return conflicts.reduce((acc, conflict) => {
      acc[conflict.severity] = (acc[conflict.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Start real-time conflict detection
   */
  async startRealTimeDetection(): Promise<void> {
    if (!this.config.enableRealTimeDetection || this.activeDetection) {
      return;
    }

    this.activeDetection = true;
    this.logger.info('Starting real-time conflict detection');

    // This would set up listeners for database changes
    // For now, just indicate that it's active
  }

  /**
   * Stop real-time conflict detection
   */
  async stopRealTimeDetection(): Promise<void> {
    this.activeDetection = false;
    this.logger.info('Stopped real-time conflict detection');
  }

  /**
   * Get conflict detection status
   */
  getDetectionStatus(): {
    isActive: boolean;
    config: ConflictDetectionConfig;
    strategiesAvailable: number;
  } {
    return {
      isActive: this.activeDetection,
      config: this.config,
      strategiesAvailable: this.resolutionStrategies.length
    };
  }
}

export default ConflictDetectionService; 