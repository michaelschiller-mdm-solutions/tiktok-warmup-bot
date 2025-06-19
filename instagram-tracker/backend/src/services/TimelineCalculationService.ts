/**
 * Timeline Calculation Service
 * 
 * Backend service for calculating Gantt chart timeline positioning,
 * date-based assignment placement, and conflict detection.
 * 
 * Replaces broken timeline logic with proper date-based calculations.
 */

// Define interfaces needed for timeline calculations
interface DateRange {
  start: Date;
  end: Date;
}

interface ZoomLevel {
  level: 'hour' | 'day' | 'week' | 'month' | 'quarter';
  pixelsPerDay: number;
  majorTickInterval: number; // days
  minorTickInterval: number; // days
  label: string;
}

interface TimeScale {
  start: Date;
  end: Date;
  pixelsPerDay: number;
  majorTicks: DateTick[];
  minorTicks: DateTick[];
  currentTimeX: number;
}

interface DateTick {
  date: Date;
  x: number;
  label: string;
  isMajor: boolean;
}

interface SprintAssignment {
  id: number;
  account_id: number;
  sprint_id: number;
  start_date?: string;
  end_date?: string;
  status: 'scheduled' | 'active' | 'completed' | 'paused' | 'cancelled';
  current_content_index: number;
}

interface ContentSprint {
  id: number;
  name: string;
  sprint_type: string;
  content_items?: any[];
}

interface AssignmentBar {
  id: string;
  assignment: SprintAssignment;
  sprint: ContentSprint;
  x: number;
  width: number;
  height: number;
  color: string;
  progress: number;
  status: string;
  contentItems: any[];
  conflicts: any[];
}

interface ConflictIndicator {
  id: string;
  type: 'blocking' | 'location' | 'seasonal' | 'overlap';
  severity: 'warning' | 'error';
  x: number;
  y: number;
  width: number;
  height: number;
  message: string;
  affectedAssignments: string[];
  resolutionOptions: ConflictResolution[];
}

interface ConflictResolution {
  type: 'pause' | 'reschedule' | 'override' | 'cancel';
  label: string;
  description: string;
  action: () => Promise<void>;
}

export class TimelineCalculationService {
  
  /**
   * Calculate proper timeline scale with actual date markers
   */
  static calculateTimeScale(
    dateRange: DateRange, 
    containerWidth: number, 
    zoomLevel: ZoomLevel
  ): TimeScale {
    const { start, end } = dateRange;
    const pixelsPerDay = zoomLevel.pixelsPerDay;

    // Generate major ticks (primary time divisions)
    const majorTicks: DateTick[] = [];
    const majorTickDays = zoomLevel.majorTickInterval;
    
    let currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= end) {
      const daysSinceStart = Math.floor((currentDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const x = daysSinceStart * pixelsPerDay;
      
      majorTicks.push({
        date: new Date(currentDate),
        x,
        label: this.formatMajorTickLabel(currentDate, zoomLevel.level),
        isMajor: true
      });
      
      currentDate.setDate(currentDate.getDate() + majorTickDays);
    }

    // Generate minor ticks (secondary time divisions)
    const minorTicks: DateTick[] = [];
    const minorTickDays = zoomLevel.minorTickInterval;
    
    currentDate = new Date(start);
    currentDate.setHours(0, 0, 0, 0);
    
    while (currentDate <= end) {
      const daysSinceStart = Math.floor((currentDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const x = daysSinceStart * pixelsPerDay;
      
      const isMajorTick = majorTicks.some(major => Math.abs(major.x - x) < 1);
      
      if (!isMajorTick) {
        minorTicks.push({
          date: new Date(currentDate),
          x,
          label: this.formatMinorTickLabel(currentDate, zoomLevel.level),
          isMajor: false
        });
      }
      
      if (zoomLevel.level === 'hour') {
        currentDate.setHours(currentDate.getHours() + (minorTickDays * 24));
      } else {
        currentDate.setDate(currentDate.getDate() + minorTickDays);
      }
    }

    // Calculate current time position
    const now = new Date();
    const currentTimeX = now >= start && now <= end 
      ? Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) * pixelsPerDay
      : -1;

    return {
      start,
      end,
      pixelsPerDay,
      majorTicks,
      minorTicks,
      currentTimeX
    };
  }

  /**
   * Position assignment bars based on actual start/end dates
   */
  static positionAssignmentBars(
    assignments: SprintAssignment[],
    sprints: ContentSprint[],
    timeScale: TimeScale
  ): AssignmentBar[] {
    const bars: AssignmentBar[] = [];
    
    assignments.forEach(assignment => {
      const sprint = sprints.find(s => s.id === assignment.sprint_id);
      if (!sprint || !assignment.start_date || !assignment.end_date) {
        return; // Skip invalid assignments
      }

      const startDate = new Date(assignment.start_date);
      const endDate = new Date(assignment.end_date);
      
      // Calculate position based on actual dates (not hardcoded spacing)
      const daysSinceTimelineStart = Math.floor(
        (startDate.getTime() - timeScale.start.getTime()) / (1000 * 60 * 60 * 24)
      );
      const durationDays = Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      const x = daysSinceTimelineStart * timeScale.pixelsPerDay;
      const width = Math.max(durationDays * timeScale.pixelsPerDay, 20);
      
      // Calculate real progress instead of random values
      const totalContentItems = sprint.content_items?.length || 0;
      const currentProgress = totalContentItems > 0 
        ? Math.round((assignment.current_content_index / totalContentItems) * 100)
        : 0;

      bars.push({
        id: `assignment-${assignment.id}`,
        assignment,
        sprint,
        x,
        width,
        height: 40,
        color: this.getSprintTypeColor(sprint.sprint_type),
        progress: currentProgress,
        status: assignment.status,
        contentItems: [],
        conflicts: []
      });
    });

    return bars;
  }

  /**
   * Detect conflicts between assignments
   */
  static detectConflicts(assignments: AssignmentBar[]): ConflictIndicator[] {
    const conflicts: ConflictIndicator[] = [];
    
    // Group by account to check overlaps
    const assignmentsByAccount = new Map<number, AssignmentBar[]>();
    assignments.forEach(bar => {
      const accountId = bar.assignment.account_id;
      if (!assignmentsByAccount.has(accountId)) {
        assignmentsByAccount.set(accountId, []);
      }
      assignmentsByAccount.get(accountId)!.push(bar);
    });

    // Check for overlapping assignments
    assignmentsByAccount.forEach((accountAssignments) => {
      for (let i = 0; i < accountAssignments.length; i++) {
        for (let j = i + 1; j < accountAssignments.length; j++) {
          const bar1 = accountAssignments[i];
          const bar2 = accountAssignments[j];
          
          if (this.checkAssignmentOverlap(bar1, bar2)) {
            conflicts.push({
              id: `conflict-${bar1.id}-${bar2.id}`,
              type: 'overlap',
              severity: 'error',
              x: Math.min(bar1.x, bar2.x),
              y: 0,
              width: Math.max(bar1.x + bar1.width, bar2.x + bar2.width) - Math.min(bar1.x, bar2.x),
              height: 40,
              message: `Overlapping assignments: ${bar1.sprint.name} and ${bar2.sprint.name}`,
              affectedAssignments: [bar1.id, bar2.id],
              resolutionOptions: [
                {
                  type: 'reschedule',
                  label: 'Reschedule Later Assignment',
                  description: 'Move the later assignment to after the first one ends',
                  action: async () => { /* Implementation needed */ }
                }
              ]
            });
          }
        }
      }
    });

    return conflicts;
  }

  /**
   * Calculate complete timeline data for API endpoint
   */
  static calculateTimelineData(
    assignments: SprintAssignment[],
    sprints: ContentSprint[],
    dateRange: DateRange,
    containerWidth: number,
    zoomLevel: ZoomLevel
  ) {
    // Calculate timeline scale with real date markers
    const timeScale = this.calculateTimeScale(dateRange, containerWidth, zoomLevel);
    
    // Position assignment bars using actual dates
    const assignmentBars = this.positionAssignmentBars(assignments, sprints, timeScale);
    
    // Detect conflicts
    const conflicts = this.detectConflicts(assignmentBars);
    
    return {
      timeScale,
      assignmentBars,
      conflicts,
      totalDuration: Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    };
  }

  private static formatMajorTickLabel(date: Date, zoomLevel: string): string {
    switch (zoomLevel) {
      case 'hour': return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'day': return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'week': return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'month': return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      case 'quarter': return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`;
      default: return date.toLocaleDateString();
    }
  }

  private static formatMinorTickLabel(date: Date, zoomLevel: string): string {
    switch (zoomLevel) {
      case 'hour': return date.toLocaleTimeString('en-US', { hour: 'numeric' });
      case 'day': return date.getDate().toString();
      case 'week': return date.getDate().toString();
      case 'month': return date.toLocaleDateString('en-US', { month: 'short' });
      case 'quarter': return date.toLocaleDateString('en-US', { month: 'short' });
      default: return date.getDate().toString();
    }
  }

  private static getSprintTypeColor(sprintType: string): string {
    const colors: Record<string, string> = {
      vacation: '#10B981',
      university: '#3B82F6',
      home: '#F59E0B',
      work: '#EF4444',
      fitness: '#8B5CF6',
      lifestyle: '#06B6D4'
    };
    return colors[sprintType] || '#6B7280';
  }

  private static checkAssignmentOverlap(bar1: AssignmentBar, bar2: AssignmentBar): boolean {
    const bar1End = bar1.x + bar1.width;
    const bar2End = bar2.x + bar2.width;
    return !(bar1End <= bar2.x || bar2End <= bar1.x);
  }
} 