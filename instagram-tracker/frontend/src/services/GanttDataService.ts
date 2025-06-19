import { apiClient } from './api';
import type { Account } from '../types/accounts';
import type { ContentSprint } from '../types/sprintCreation';
import type {
  GanttFilters,
  TimelineData,
  AccountTimelineRow,
  AssignmentBar,
  ConflictIndicator,
  TimeScale,
  DateRange,
  ConflictWarning,
  SprintAssignment,
  AccountState,
  DateTick
} from '../types/ganttChart';

export class GanttDataService {
  private updateSubscriptions: Set<(update: TimelineUpdate) => void> = new Set();
  private cache: Map<string, any> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Fetch comprehensive timeline data with filtering
   */
  async fetchTimelineData(filters: GanttFilters = {}): Promise<TimelineData> {
    const cacheKey = `timeline-${JSON.stringify(filters)}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // Fetch all required data in parallel
      const [accountsData, sprintsData, assignmentsData, conflictsData] = await Promise.all([
        this.fetchAccounts(filters),
        this.fetchSprints(filters),
        this.fetchAssignments(filters),
        this.fetchConflicts(filters)
      ]);

      // Process and combine data
      const timelineData = this.processTimelineData(
        accountsData,
        sprintsData,
        assignmentsData,
        conflictsData,
        filters
      );

      // Cache the result
      this.setCache(cacheKey, timelineData);
      
      return timelineData;
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
      throw new Error('Failed to load timeline data');
    }
  }

  /**
   * Get assignments for a specific account
   */
  async getAccountAssignments(accountId: number): Promise<SprintAssignment[]> {
    const cacheKey = `assignments-${accountId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await apiClient.get(`/api/sprints/assignments?account_id=${accountId}`);
      const assignments = response.data.assignments || [];
      
      this.setCache(cacheKey, assignments);
      return assignments;
    } catch (error) {
      console.error(`Failed to fetch assignments for account ${accountId}:`, error);
      return [];
    }
  }

  /**
   * Get detailed information about a specific sprint
   */
  async getSprintDetails(sprintId: number): Promise<SprintDetails> {
    const cacheKey = `sprint-details-${sprintId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await apiClient.get(`/api/sprints/${sprintId}`);
      const sprintDetails = {
        ...response.data.sprint,
        contentItems: response.data.content_items || [],
        assignmentCount: response.data.assignment_count || 0,
        activeAssignments: response.data.active_assignments || 0
      };
      
      this.setCache(cacheKey, sprintDetails);
      return sprintDetails;
    } catch (error) {
      console.error(`Failed to fetch sprint details for ${sprintId}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time timeline updates
   */
  subscribeToUpdates(callback: (update: TimelineUpdate) => void): () => void {
    this.updateSubscriptions.add(callback);
    
    // Start polling for updates if this is the first subscription
    if (this.updateSubscriptions.size === 1) {
      this.startUpdatePolling();
    }
    
    // Return unsubscribe function
    return () => {
      this.updateSubscriptions.delete(callback);
      if (this.updateSubscriptions.size === 0) {
        this.stopUpdatePolling();
      }
    };
  }

  /**
   * Detect conflicts in sprint assignments
   */
  detectConflicts(assignments: SprintAssignment[]): ConflictWarning[] {
    const conflicts: ConflictWarning[] = [];
    const accountAssignments: Map<number, SprintAssignment[]> = new Map();

    // Group assignments by account
    assignments.forEach(assignment => {
      if (!accountAssignments.has(assignment.account_id)) {
        accountAssignments.set(assignment.account_id, []);
      }
      accountAssignments.get(assignment.account_id)!.push(assignment);
    });

    // Check for conflicts within each account
    accountAssignments.forEach((accountAssignments, accountId) => {
      conflicts.push(...this.detectAccountConflicts(accountId, accountAssignments));
    });

    return conflicts;
  }

  /**
   * Calculate timeline scale based on date range and container width
   */
  calculateTimelineScale(dateRange: DateRange, containerWidth: number): TimeScale {
    const { start, end } = dateRange;
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const pixelsPerDay = Math.max(containerWidth / totalDays, 20); // Minimum 20px per day
    
    return {
      start,
      end,
      pixelsPerDay,
      majorTicks: this.generateMajorTicks(start, end, pixelsPerDay),
      minorTicks: this.generateMinorTicks(start, end, pixelsPerDay),
      currentTimeX: this.dateToX(new Date(), { start, end, pixelsPerDay } as TimeScale)
    };
  }

  /**
   * Position assignment bars on the timeline
   */
  positionAssignmentBars(assignments: SprintAssignment[], scale: TimeScale): PositionedBar[] {
    return assignments.map(assignment => {
      const startDate = new Date(assignment.start_date || assignment.assignment_date);
      const endDate = new Date(assignment.end_date || assignment.assignment_date);
      
      const startX = this.dateToX(startDate, scale);
      const endX = this.dateToX(endDate, scale);
      const width = Math.max(endX - startX, 10); // Minimum 10px width

      return {
        id: assignment.id.toString(),
        x: startX,
        y: 0, // Will be set by account row
        width,
        height: 40,
        data: assignment,
        assignment
      };
    });
  }

  /**
   * Fetch account data with filtering
   */
  private async fetchAccounts(filters: GanttFilters): Promise<Account[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.accountIds?.length) {
        params.append('ids', filters.accountIds.join(','));
      }
      
      if (filters.accountStatus?.length) {
        params.append('status', filters.accountStatus.join(','));
      }

      const response = await apiClient.get(`/api/accounts?${params.toString()}`);
      return response.data.accounts || [];
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
      return [];
    }
  }

  /**
   * Fetch sprint data with filtering
   */
  private async fetchSprints(filters: GanttFilters): Promise<ContentSprint[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.sprintTypes?.length) {
        params.append('types', filters.sprintTypes.join(','));
      }

      const response = await apiClient.get(`/api/sprints?${params.toString()}`);
      return response.data.sprints || [];
    } catch (error) {
      console.error('Failed to fetch sprints:', error);
      return [];
    }
  }

  /**
   * Fetch assignment data with filtering
   */
  private async fetchAssignments(filters: GanttFilters): Promise<SprintAssignment[]> {
    try {
      const params = new URLSearchParams();
      
      if (filters.accountIds?.length) {
        params.append('account_ids', filters.accountIds.join(','));
      }
      
      if (filters.conflictsOnly) {
        params.append('conflicts_only', 'true');
      }

      const response = await apiClient.get(`/api/sprints/assignments?${params.toString()}`);
      return response.data.assignments || [];
    } catch (error) {
      console.error('Failed to fetch assignments:', error);
      return [];
    }
  }

  /**
   * Fetch conflict data
   */
  private async fetchConflicts(filters: GanttFilters): Promise<ConflictIndicator[]> {
    try {
      const response = await apiClient.get('/api/sprints/conflicts');
      return response.data.conflicts || [];
    } catch (error) {
      console.error('Failed to fetch conflicts:', error);
      return [];
    }
  }

  /**
   * Convert ConflictIndicator to ConflictWarning for account timeline rows
   */
  private convertConflictIndicatorToWarning(indicator: ConflictIndicator): ConflictWarning {
    return {
      id: indicator.id,
      type: indicator.type,
      severity: indicator.severity,
      message: indicator.message,
      description: indicator.message, // Use message as description
      affectedItems: indicator.affectedAssignments,
      resolution_options: indicator.resolutionOptions.map(r => r.label),
      resolutionOptions: indicator.resolutionOptions
    };
  }

  /**
   * Process and combine all data into timeline format
   */
  private processTimelineData(
    accounts: Account[],
    sprints: ContentSprint[],
    assignments: SprintAssignment[],
    conflicts: ConflictIndicator[],
    filters: GanttFilters
  ): TimelineData {
    const sprintMap = new Map(sprints.map(s => [s.id, s]));
    
    const accountRows: AccountTimelineRow[] = accounts.map((account, index) => {
      const accountAssignments = assignments.filter(a => a.account_id === account.id);
      
      // For now, since ConflictIndicator doesn't have account_id/assignment_id, 
      // we'll use an empty array and rely on the conflict detection logic
      const accountConflicts: ConflictWarning[] = [];
      
      const assignmentBars: AssignmentBar[] = accountAssignments.map(assignment => {
        const sprint = sprintMap.get(assignment.sprint_id);
        if (!sprint) return null;

        return {
          id: `assignment-${assignment.id}`,
          assignment,
          sprint,
          x: 0, // Will be calculated by timeline scale
          width: 0, // Will be calculated by timeline scale
          height: 40,
          color: this.getSprintColor(sprint.sprint_type),
          progress: assignment.current_content_index || 0,
          status: assignment.status,
          contentItems: [], // Will be populated separately
          conflicts: [] // Will be populated by conflict detection
        };
      }).filter(Boolean) as AssignmentBar[];

      // Detect conflicts for this account's assignments
      const detectedConflicts = this.detectAccountConflicts(account.id, accountAssignments);
      accountConflicts.push(...detectedConflicts);

      return {
        account,
        assignments: assignmentBars,
        state: this.getAccountState(account),
        conflicts: accountConflicts,
        height: 60,
        y: index * 60
      };
    });

    // Calculate date range
    const now = new Date();
    const dateRange: DateRange = {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)   // 30 days from now
    };

    return {
      accounts: accountRows,
      conflicts,
      dateRange,
      totalDuration: 37, // days
      scale: this.calculateTimelineScale(dateRange, 1200) // Default width
    };
  }

  /**
   * Detect conflicts for a specific account
   */
  private detectAccountConflicts(accountId: number, assignments: SprintAssignment[]): ConflictWarning[] {
    const conflicts: ConflictWarning[] = [];
    
    // Check for overlapping assignments
    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const a1 = assignments[i];
        const a2 = assignments[j];
        
        if (this.assignmentsOverlap(a1, a2)) {
          conflicts.push({
            id: `overlap-${a1.id}-${a2.id}`,
            type: 'location',
            severity: 'error',
            message: `Sprint assignments overlap: ${a1.sprint_id} and ${a2.sprint_id}`,
            description: 'Two sprints cannot run simultaneously on the same account',
            affectedItems: [a1.id.toString(), a2.id.toString()],
            resolution_options: ['Reschedule one sprint'],
            resolutionOptions: [
              {
                type: 'reschedule',
                label: 'Reschedule one sprint',
                description: 'Move one of the conflicting sprints to a different time',
                action: async () => { /* Implementation needed */ }
              }
            ]
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Check if two assignments overlap in time
   */
  private assignmentsOverlap(a1: SprintAssignment, a2: SprintAssignment): boolean {
    // Use assignment_date as fallback if start_date/end_date are not available
    const start1 = new Date(a1.start_date || a1.assignment_date).getTime();
    const end1 = new Date(a1.end_date || a1.assignment_date).getTime();
    const start2 = new Date(a2.start_date || a2.assignment_date).getTime();
    const end2 = new Date(a2.end_date || a2.assignment_date).getTime();
    
    return start1 < end2 && start2 < end1;
  }

  /**
   * Generate major timeline ticks (days, weeks, months)
   */
  private generateMajorTicks(start: Date, end: Date, pixelsPerDay: number): DateTick[] {
    const ticks: DateTick[] = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    
    while (current <= end) {
      const x = this.dateToX(current, { start, end, pixelsPerDay } as TimeScale);
      ticks.push({
        x,
        date: new Date(current),
        label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isMajor: true
      });
      current.setDate(current.getDate() + 7); // Weekly ticks
    }
    
    return ticks;
  }

  /**
   * Generate minor timeline ticks
   */
  private generateMinorTicks(start: Date, end: Date, pixelsPerDay: number): DateTick[] {
    const ticks: DateTick[] = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    
    while (current <= end) {
      const x = this.dateToX(current, { start, end, pixelsPerDay } as TimeScale);
      ticks.push({
        x,
        date: new Date(current),
        label: current.getDate().toString(),
        isMajor: false
      });
      current.setDate(current.getDate() + 1); // Daily ticks
    }
    
    return ticks;
  }

  /**
   * Calculate current time position on timeline
   */
  private calculateCurrentTimePosition(start: Date, pixelsPerDay: number): number {
    const now = new Date();
    const daysDiff = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff * pixelsPerDay;
  }

  /**
   * Convert date to X coordinate on timeline
   */
  private dateToX(date: Date, scale: TimeScale): number {
    const daysDiff = (date.getTime() - scale.start.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff * scale.pixelsPerDay;
  }

  /**
   * Get sprint color based on type
   */
  private getSprintColor(sprintType: string): string {
    const colors: Record<string, string> = {
      vacation: '#10B981',
      university: '#3B82F6',
      home: '#6B7280',
      work: '#374151',
      fitness: '#EF4444',
      lifestyle: '#8B5CF6'
    };
    
    return colors[sprintType] || '#6366F1';
  }

  /**
   * Get account state information
   */
  private getAccountState(account: Account): AccountState {
    return {
      currentLocation: account.location || 'unknown',
      activeSprintIds: [], // Will be populated from assignments
      idleSince: undefined,
      idleDuration: undefined,
      cooldownUntil: undefined,
      nextMaintenanceDue: undefined
    };
  }

  /**
   * Cache management
   */
  private isCacheValid(key: string): boolean {
    if (!this.cache.has(key)) return false;
    
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  private setCache(key: string, value: any): void {
    this.cache.set(key, value);
    this.cacheTimestamps.set(key, Date.now());
  }

  /**
   * Real-time update polling
   */
  private updatePollingInterval?: NodeJS.Timeout;

  private startUpdatePolling(): void {
    this.updatePollingInterval = setInterval(async () => {
      try {
        const response = await apiClient.get('/api/sprints/updates');
        const updates = response.data.updates || [];
        
        updates.forEach((update: TimelineUpdate) => {
          this.updateSubscriptions.forEach(callback => callback(update));
        });
      } catch (error) {
        console.error('Failed to poll for updates:', error);
      }
    }, 5000); // Poll every 5 seconds
  }

  private stopUpdatePolling(): void {
    if (this.updatePollingInterval) {
      clearInterval(this.updatePollingInterval);
      this.updatePollingInterval = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopUpdatePolling();
    this.updateSubscriptions.clear();
    this.cache.clear();
    this.cacheTimestamps.clear();
  }
}

// Add missing type definitions that are referenced but not defined
export interface TimelineUpdate {
  type: 'assignment_created' | 'assignment_updated' | 'assignment_deleted' | 'conflict_detected';
  data: any;
  timestamp: Date;
}

export interface SprintDetails extends ContentSprint {
  contentItems: any[];
  assignmentCount: number;
  activeAssignments: number;
}

export interface PositionedBar {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: SprintAssignment;
  assignment: SprintAssignment;
}

// Singleton instance
export const ganttDataService = new GanttDataService();

// Export default for easier importing
export default ganttDataService; 