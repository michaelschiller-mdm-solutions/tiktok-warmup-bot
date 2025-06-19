import type {
  ConflictWarning,
  ConflictIndicator,
  ConflictResolution,
  AccountTimelineRow,
  AssignmentBar,
  SprintAssignment,
  AccountState
} from '../types/ganttChart';
import type { Account } from '../types/accounts';
import type { ContentSprint } from '../types/sprintCreation';

export interface ConflictDetectionOptions {
  checkOverlaps: boolean;
  checkLocationConflicts: boolean;
  checkSeasonalConflicts: boolean;
  checkCooldownViolations: boolean;
  checkResourceLimits: boolean;
  toleranceHours: number; // Minimum hours between assignments
}

export interface ConflictContext {
  accounts: Account[];
  sprints: ContentSprint[];
  assignments: SprintAssignment[];
  accountStates: Map<number, AccountState>;
  currentTime: Date;
}

export class ConflictDetectionEngine {
  private defaultOptions: ConflictDetectionOptions = {
    checkOverlaps: true,
    checkLocationConflicts: true,
    checkSeasonalConflicts: true,
    checkCooldownViolations: true,
    checkResourceLimits: true,
    toleranceHours: 2 // 2-hour buffer between assignments
  };

  /**
   * Main conflict detection function
   */
  detectConflicts(
    context: ConflictContext,
    options: Partial<ConflictDetectionOptions> = {}
  ): ConflictWarning[] {
    const opts = { ...this.defaultOptions, ...options };
    const conflicts: ConflictWarning[] = [];

    // Group assignments by account for efficient processing
    const assignmentsByAccount = this.groupAssignmentsByAccount(context.assignments);

    // Check each account for conflicts
    assignmentsByAccount.forEach((accountAssignments, accountId) => {
      const account = context.accounts.find(a => a.id === accountId);
      if (!account) return;

      const accountState = context.accountStates.get(accountId);
      
      // Detect various types of conflicts
      if (opts.checkOverlaps) {
        conflicts.push(...this.detectOverlapConflicts(accountAssignments, account, context));
      }

      if (opts.checkLocationConflicts) {
        conflicts.push(...this.detectLocationConflicts(accountAssignments, account, context));
      }

      if (opts.checkSeasonalConflicts) {
        conflicts.push(...this.detectSeasonalConflicts(context));
      }

      if (opts.checkCooldownViolations) {
        conflicts.push(...this.detectCooldownViolations(accountAssignments, account, context, accountState));
      }

      if (opts.checkResourceLimits) {
        conflicts.push(...this.detectResourceConflicts(accountAssignments, account, context));
      }
    });

    // Cross-account conflict detection
    conflicts.push(...this.detectCrossAccountConflicts(context, opts));

    return conflicts;
  }

  /**
   * Convert conflicts to visual indicators for the timeline
   */
  convertToIndicators(
    conflicts: ConflictWarning[],
    accountRows: AccountTimelineRow[],
    pixelsPerDay: number,
    timelineStart: Date
  ): ConflictIndicator[] {
    return conflicts.map(conflict => {
      const indicator = this.createConflictIndicator(conflict, accountRows, pixelsPerDay, timelineStart);
      return indicator;
    }).filter(Boolean) as ConflictIndicator[];
  }

  /**
   * Detect overlapping assignments on the same account
   */
  private detectOverlapConflicts(
    assignments: SprintAssignment[],
    account: Account,
    context: ConflictContext
  ): ConflictWarning[] {
    const conflicts: ConflictWarning[] = [];
    const sortedAssignments = assignments.sort((a, b) => 
      new Date(a.start_date || a.assignment_date).getTime() - new Date(b.start_date || b.assignment_date).getTime()
    );

    for (let i = 0; i < sortedAssignments.length - 1; i++) {
      const current = sortedAssignments[i];
      const next = sortedAssignments[i + 1];

      if (this.assignmentsOverlap(current, next)) {
        const currentSprint = context.sprints.find(s => s.id === current.sprint_id);
        const nextSprint = context.sprints.find(s => s.id === next.sprint_id);

        conflicts.push({
          id: `overlap-${current.id}-${next.id}`,
          type: 'location',
          severity: 'error',
          message: `Overlapping assignments detected`,
          description: `Account ${account.username} has overlapping sprint assignments: "${currentSprint?.name}" and "${nextSprint?.name}"`,
          affectedItems: [current.id.toString(), next.id.toString()],
          resolution_options: ['Auto-reschedule', 'Pause conflicting sprint', 'Cancel one assignment'],
          resolutionOptions: [
            {
              type: 'reschedule',
              label: 'Auto-reschedule',
              description: 'Automatically adjust timing to prevent overlap',
              action: async () => this.autoRescheduleOverlap(current, next)
            },
            {
              type: 'pause',
              label: 'Pause conflicting sprint',
              description: 'Pause one of the conflicting sprints',
              action: async () => this.pauseAssignment(next.id)
            },
            {
              type: 'cancel',
              label: 'Cancel one assignment',
              description: 'Cancel the later assignment',
              action: async () => this.cancelAssignment(next.id)
            }
          ]
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect location-based conflicts
   */
  private detectLocationConflicts(
    assignments: SprintAssignment[],
    account: Account,
    context: ConflictContext
  ): ConflictWarning[] {
    const conflicts: ConflictWarning[] = [];

    assignments.forEach(assignment => {
      const sprint = context.sprints.find(s => s.id === assignment.sprint_id);
      if (!sprint || !sprint.location) return;

      // Check if account's current location matches sprint requirement
      if (account.location && sprint.location !== account.location) {
        conflicts.push({
          id: `location-${assignment.id}`,
          type: 'location',
          severity: 'warning',
          message: `Location mismatch detected`,
          description: `Sprint "${sprint.name}" requires location "${sprint.location}" but account is in "${account.location}"`,
          affectedItems: [assignment.id.toString()],
          resolution_options: ['Wait for location change', 'Force assignment'],
          resolutionOptions: [
            {
              type: 'reschedule',
              label: 'Wait for location change',
              description: 'Delay assignment until account moves to required location',
              action: async () => this.scheduleForLocationChange(assignment, sprint.location || 'home')
            },
            {
              type: 'override',
              label: 'Force assignment',
              description: 'Assign anyway despite location conflict',
              action: async () => this.forceAssignment(assignment)
            }
          ]
        });
      }
    });

    return conflicts;
  }

  /**
   * Detect seasonal conflicts
   */
  private detectSeasonalConflicts(context: ConflictContext): ConflictWarning[] {
    const conflicts: ConflictWarning[] = [];
    
    context.assignments.forEach(assignment => {
      const sprint = context.sprints.find(s => s.id === assignment.sprint_id);
      if (!sprint || !sprint.available_months?.length) return;

      const assignmentMonth = new Date(assignment.start_date || assignment.assignment_date).getMonth() + 1; // 1-based month
      
      if (!sprint.available_months.includes(assignmentMonth)) {
        const availableMonthNames = sprint.available_months.map((m: number) => 
          new Date(2024, m - 1, 1).toLocaleString('default', { month: 'long' })
        ).join(', ');

        conflicts.push({
          id: `seasonal-${assignment.id}`,
          type: 'seasonal',
          severity: 'warning',
          message: `Sprint "${sprint.name}" scheduled outside its season`,
          description: `This sprint is available in: ${availableMonthNames}`,
          affectedItems: [assignment.id.toString()],
          resolution_options: [`Move to valid season: ${availableMonthNames}`],
          resolutionOptions: [
            {
              type: 'reschedule',
              label: 'Move to valid season',
              description: 'Reschedule assignment to appropriate month',
              action: async () => this.rescheduleToValidSeason(assignment, sprint.available_months || [])
            },
            {
              type: 'override',
              label: 'Keep current timing',
              description: 'Proceed despite seasonal mismatch',
              action: async () => this.overrideSeasonalConflict(assignment)
            }
          ]
        });
      }
    });

    return conflicts;
  }

  /**
   * Detect cooldown period violations
   */
  private detectCooldownViolations(
    assignments: SprintAssignment[],
    account: Account,
    context: ConflictContext,
    accountState?: AccountState
  ): ConflictWarning[] {
    const conflicts: ConflictWarning[] = [];

    if (accountState?.cooldownUntil) {
      const cooldownEnd = new Date(accountState.cooldownUntil);
      
      assignments.forEach(assignment => {
        const assignmentStart = new Date(assignment.start_date || assignment.assignment_date);
        
        if (assignmentStart < cooldownEnd) {
          const sprint = context.sprints.find(s => s.id === assignment.sprint_id);
          const hoursRemaining = Math.ceil((cooldownEnd.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60));
          
          conflicts.push({
            id: `cooldown-${assignment.id}`,
            type: 'blocking',
            severity: 'error',
            message: `Cooldown period violation`,
            description: `Account in cooldown for ${hoursRemaining} more hours. Cannot start "${sprint?.name}" until ${cooldownEnd.toLocaleString()}`,
            affectedItems: [assignment.id.toString()],
            resolution_options: ['Wait for cooldown', 'Emergency override'],
            resolutionOptions: [
              {
                type: 'reschedule',
                label: 'Wait for cooldown',
                description: 'Automatically reschedule after cooldown period',
                action: async () => this.rescheduleAfterCooldown(assignment, cooldownEnd)
              },
              {
                type: 'override',
                label: 'Emergency override',
                description: 'Override cooldown (may affect account health)',
                action: async () => this.emergencyOverrideCooldown(assignment.id)
              }
            ]
          });
        }
      });
    }

    return conflicts;
  }

  /**
   * Detect resource/capacity conflicts
   */
  private detectResourceConflicts(
    assignments: SprintAssignment[],
    account: Account,
    context: ConflictContext
  ): ConflictWarning[] {
    const conflicts: ConflictWarning[] = [];

    // Check for too many concurrent assignments
    const maxConcurrentSprints = 3; // Configurable limit
    const activeAssignments = assignments.filter(a => a.status === 'active');
    
    if (activeAssignments.length > maxConcurrentSprints) {
      conflicts.push({
        id: `resource-${account.id}`,
        type: 'overlap',
        severity: 'warning',
        message: `Resource overload detected`,
        description: `Account has ${activeAssignments.length} concurrent assignments (max: ${maxConcurrentSprints})`,
        affectedItems: activeAssignments.map(a => a.id.toString()),
        resolution_options: ['Pause excess assignments', 'Stagger assignments'],
        resolutionOptions: [
          {
            type: 'pause',
            label: 'Pause excess assignments',
            description: 'Pause the most recent assignments',
            action: async () => this.pauseExcessAssignments(activeAssignments, maxConcurrentSprints)
          },
          {
            type: 'reschedule',
            label: 'Stagger assignments',
            description: 'Automatically space out assignment timing',
            action: async () => this.staggerAssignments(activeAssignments)
          }
        ]
      });
    }

    return conflicts;
  }

  /**
   * Detect conflicts that span multiple accounts
   */
  private detectCrossAccountConflicts(
    context: ConflictContext,
    options: ConflictDetectionOptions
  ): ConflictWarning[] {
    const conflicts: ConflictWarning[] = [];

    // Example: Check for sprints that block other sprints across accounts
    context.sprints.forEach(sprint => {
      if (sprint.blocks_sprints?.length) {
        const blockingAssignments = context.assignments.filter(a => a.sprint_id === sprint.id);
        const blockedAssignments = context.assignments.filter(a => 
          sprint.blocks_sprints!.includes(a.sprint_id)
        );

        blockingAssignments.forEach(blockingAssignment => {
          blockedAssignments.forEach(blockedAssignment => {
            if (this.assignmentsOverlap(blockingAssignment, blockedAssignment)) {
              conflicts.push({
                id: `cross-block-${blockingAssignment.id}-${blockedAssignment.id}`,
                type: 'blocking',
                severity: 'error',
                message: `Sprint blocking conflict`,
                description: `Sprint "${sprint.name}" blocks other sprints from running`,
                affectedItems: [blockingAssignment.id.toString(), blockedAssignment.id.toString()],
                resolution_options: ['Reschedule blocked sprint'],
                resolutionOptions: [
                  {
                    type: 'reschedule',
                    label: 'Reschedule blocked sprint',
                    description: 'Move the blocked sprint to a different time',
                    action: async () => this.rescheduleBlockedSprint(blockedAssignment)
                  }
                ]
              });
            }
          });
        });
      }
    });

    return conflicts;
  }

  /**
   * Helper: Group assignments by account
   */
  private groupAssignmentsByAccount(assignments: SprintAssignment[]): Map<number, SprintAssignment[]> {
    const grouped = new Map<number, SprintAssignment[]>();
    
    assignments.forEach(assignment => {
      if (!grouped.has(assignment.account_id)) {
        grouped.set(assignment.account_id, []);
      }
      grouped.get(assignment.account_id)!.push(assignment);
    });
    
    return grouped;
  }

  /**
   * Helper: Check if two assignments overlap in time
   */
  private assignmentsOverlap(a1: SprintAssignment, a2: SprintAssignment): boolean {
    const start1 = new Date(a1.start_date || a1.assignment_date).getTime();
    const end1 = new Date(a1.end_date || a1.assignment_date).getTime();
    const start2 = new Date(a2.start_date || a2.assignment_date).getTime();
    const end2 = new Date(a2.end_date || a2.assignment_date).getTime();
    
    return start1 < end2 && start2 < end1;
  }

  /**
   * Helper: Create visual conflict indicator
   */
  private createConflictIndicator(
    conflict: ConflictWarning,
    accountRows: AccountTimelineRow[],
    pixelsPerDay: number,
    timelineStart: Date
  ): ConflictIndicator | null {
    // Find the account row and assignment bar
    const affectedAssignmentId = conflict.affectedItems[0];
    
    for (const accountRow of accountRows) {
      const assignmentBar = accountRow.assignments.find(bar => 
        bar.assignment.id.toString() === affectedAssignmentId
      );
      
      if (assignmentBar) {
        return {
          id: conflict.id,
          type: conflict.type,
          severity: conflict.severity,
          x: assignmentBar.x,
          y: accountRow.y,
          width: assignmentBar.width,
          height: assignmentBar.height,
          message: conflict.message,
          affectedAssignments: conflict.affectedItems,
          resolutionOptions: conflict.resolutionOptions
        };
      }
    }
    
    return null;
  }

  // Resolution action implementations (these would call actual API endpoints)
  private async autoRescheduleOverlap(assignment1: SprintAssignment, assignment2: SprintAssignment): Promise<void> {
    console.log('Auto-rescheduling overlap:', assignment1.id, assignment2.id);
    // Implementation would call API to reschedule
  }

  private async pauseAssignment(assignmentId: number): Promise<void> {
    console.log('Pausing assignment:', assignmentId);
    // Implementation would call API to pause assignment
  }

  private async cancelAssignment(assignmentId: number): Promise<void> {
    console.log('Cancelling assignment:', assignmentId);
    // Implementation would call API to cancel assignment
  }

  private async scheduleForLocationChange(assignment: SprintAssignment, requiredLocation: string): Promise<void> {
    console.log('Scheduling for location change:', assignment.id, requiredLocation);
    // Implementation would reschedule based on location
  }

  private async forceAssignment(assignment: SprintAssignment): Promise<void> {
    console.log('Forcing assignment:', assignment.id);
    // Implementation would mark assignment as forced
  }

  private async rescheduleToValidSeason(assignment: SprintAssignment, validMonths: number[]): Promise<void> {
    console.log('Rescheduling to valid season:', assignment.id, validMonths);
    // Implementation would find next valid month and reschedule
  }

  private async overrideSeasonalConflict(assignment: SprintAssignment): Promise<void> {
    console.log('Overriding seasonal conflict:', assignment.id);
    // Implementation would mark assignment as season-override
  }

  private async rescheduleAfterCooldown(assignment: SprintAssignment, cooldownEnd: Date): Promise<void> {
    console.log('Rescheduling after cooldown:', assignment.id, cooldownEnd);
    // Implementation would reschedule assignment after cooldown
  }

  private async emergencyOverrideCooldown(assignmentId: number): Promise<void> {
    console.log('Emergency cooldown override:', assignmentId);
    // Implementation would override cooldown (with warnings)
  }

  private async pauseExcessAssignments(assignments: SprintAssignment[], maxConcurrent: number): Promise<void> {
    console.log('Pausing excess assignments:', assignments.length, maxConcurrent);
    // Implementation would pause the most recent assignments
  }

  private async staggerAssignments(assignments: SprintAssignment[]): Promise<void> {
    console.log('Staggering assignments:', assignments.length);
    // Implementation would space out assignment timing
  }

  private async rescheduleBlockedSprint(assignment: SprintAssignment): Promise<void> {
    console.log('Rescheduling blocked sprint:', assignment.id);
    // Implementation would reschedule the blocked sprint
  }
}

// Export singleton instance
export const conflictDetectionEngine = new ConflictDetectionEngine();

// Export utility functions
export const detectTimelineConflicts = (
  accounts: Account[],
  sprints: ContentSprint[],
  assignments: SprintAssignment[],
  accountStates: Map<number, AccountState> = new Map(),
  options: Partial<ConflictDetectionOptions> = {}
): ConflictWarning[] => {
  const context: ConflictContext = {
    accounts,
    sprints,
    assignments,
    accountStates,
    currentTime: new Date()
  };

  return conflictDetectionEngine.detectConflicts(context, options);
};

export default conflictDetectionEngine; 