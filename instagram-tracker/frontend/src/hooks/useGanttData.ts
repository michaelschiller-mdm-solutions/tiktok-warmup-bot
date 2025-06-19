import { useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  TimelineData, 
  AccountTimelineRow, 
  AssignmentBar, 
  ConflictIndicator,
  GanttFilters,
  DateRange,
  ZoomLevel,
  AccountState,
  ConflictWarning,
  ContentItemMarker
} from '../types/ganttChart';
import type { Account } from '../types/accounts';
import type { ContentSprint } from '../types/sprintCreation';
import type { SprintAssignment } from '../types/assignments';
import { timelineCalculations } from '../utils/timelineCalculations';

interface UseGanttDataProps {
  accounts: Account[];
  sprints: ContentSprint[];
  assignments: SprintAssignment[];
  filters: GanttFilters;
  dateRange: DateRange;
  zoomLevel: ZoomLevel;
}

interface UseGanttDataReturn {
  timelineData: TimelineData | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  subscribeToUpdates: () => () => void;
}

export const useGanttData = ({
  accounts,
  sprints,
  assignments,
  filters,
  dateRange,
  zoomLevel
}: UseGanttDataProps): UseGanttDataReturn => {
  
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sprint type colors for assignment bars
  const SPRINT_TYPE_COLORS = useMemo(() => ({
    vacation: { color: '#10B981', lightColor: '#A7F3D0' },
    university: { color: '#3B82F6', lightColor: '#BFDBFE' },
    home: { color: '#6B7280', lightColor: '#D1D5DB' },
    work: { color: '#374151', lightColor: '#E5E7EB' },
    fitness: { color: '#EF4444', lightColor: '#FECACA' },
    lifestyle: { color: '#8B5CF6', lightColor: '#DDD6FE' },
    default: { color: '#6366F1', lightColor: '#C7D2FE' }
  }), []);

  /**
   * Process assignments into timeline bars with positioning
   */
  const createAssignmentBars = useCallback((
    assignments: SprintAssignment[],
    sprints: ContentSprint[],
    timelineStart: Date,
    pixelsPerDay: number
  ): AssignmentBar[] => {
    return assignments.map(assignment => {
      const sprint = sprints.find(s => s.id === assignment.sprint_id);
      if (!sprint) return null;

      // Calculate assignment duration
      const startDate = new Date(assignment.start_date || assignment.assignment_date);
      const endDate = assignment.end_date 
        ? new Date(assignment.end_date)
        : new Date(startDate.getTime() + (7 * 24 * 60 * 60 * 1000)); // Default 7 days

      // Position the bar
      const { x, width } = timelineCalculations.positionAssignmentBar(
        startDate, 
        endDate, 
        timelineStart, 
        pixelsPerDay
      );

      // Get sprint color
      const sprintTypeColor = SPRINT_TYPE_COLORS[sprint.sprint_type as keyof typeof SPRINT_TYPE_COLORS] 
        || SPRINT_TYPE_COLORS.default;

      // Calculate progress
      const progress = timelineCalculations.calculateProgress(assignment);

      // Process content items (if available)
      const contentQueue = assignment.content_queue || [];
      const contentItemMarkers: ContentItemMarker[] = contentQueue.map((item, index) => {
        const scheduledTime = new Date(item.scheduled_time);
        const itemX = timelineCalculations.positionContentItems(
          [{ scheduledTime, status: item.status }],
          startDate,
          endDate,
          timelineStart,
          pixelsPerDay,
          width
        );

        // Create a SprintContentItem from queue item data
        const sprintContentItem = {
          id: item.content_item_id || index,
          sprint_id: assignment.sprint_id,
          content_type: item.content_type,
          delay_after_hours: 24, // Default delay
          position: index + 1,
          file_path: '', // Not available in queue item
          description: '', // Not available in queue item
          created_at: item.created_at || new Date().toISOString()
        };

        return {
          id: `content-${item.id || index}`,
          contentItem: sprintContentItem,
          x: itemX[0]?.x || 0,
          y: 0, // Will be set by the account row
          content_type: item.content_type,
          scheduledTime,
          status: item.status as 'queued' | 'posted' | 'failed' | 'cancelled',
          isEmergency: item.emergency_content || false,
          postedTime: item.posted_at ? new Date(item.posted_at) : undefined
        };
      });

      return {
        id: `assignment-${assignment.id}`,
        assignment,
        sprint,
        x,
        width,
        height: 40, // Standard bar height
        color: sprintTypeColor.color,
        progress,
        status: assignment.status,
        contentItems: contentItemMarkers,
        conflicts: [] // Will be populated by conflict detection
      };
    }).filter(Boolean) as AssignmentBar[];
  }, [SPRINT_TYPE_COLORS]);

  /**
   * Detect conflicts between assignments
   */
  const detectConflicts = useCallback((
    accountRows: AccountTimelineRow[],
    assignments: SprintAssignment[],
    sprints: ContentSprint[]
  ): ConflictIndicator[] => {
    const conflicts: ConflictIndicator[] = [];

    // Check for overlapping assignments on same account
    accountRows.forEach(accountRow => {
      const sortedAssignments = [...accountRow.assignments].sort((a, b) => a.x - b.x);
      
      for (let i = 0; i < sortedAssignments.length - 1; i++) {
        const current = sortedAssignments[i];
        const next = sortedAssignments[i + 1];
        
        // Check overlap
        if (current.x + current.width > next.x) {
          conflicts.push({
            id: `overlap-${current.id}-${next.id}`,
            type: 'overlap',
            severity: 'warning',
            x: next.x,
            y: accountRow.y,
            width: (current.x + current.width) - next.x,
            height: 40,
            message: 'Overlapping sprint assignments',
            affectedAssignments: [current.id, next.id],
            resolutionOptions: [
              {
                type: 'reschedule',
                label: 'Reschedule',
                description: 'Adjust assignment timing to prevent overlap',
                action: async () => {
                  console.log('Reschedule conflict resolution');
                }
              }
            ]
          });
        }
      }
    });

    // Check for location conflicts
    assignments.forEach(assignment => {
      const sprint = sprints.find(s => s.id === assignment.sprint_id);
      const account = accounts.find(a => a.id === assignment.account_id);
      
      if (sprint && account && sprint.location && account.location) {
        if (sprint.location !== account.location) {
          const accountRow = accountRows.find(row => row.account.id === account.id);
          const assignmentBar = accountRow?.assignments.find(bar => bar.assignment.id === assignment.id);
          
          if (accountRow && assignmentBar) {
            conflicts.push({
              id: `location-${assignment.id}`,
              type: 'location',
              severity: 'error',
              x: assignmentBar.x,
              y: accountRow.y,
              width: assignmentBar.width,
              height: 40,
              message: `Location mismatch: Sprint requires ${sprint.location}, account at ${account.location}`,
              affectedAssignments: [assignmentBar.id],
              resolutionOptions: [
                {
                  type: 'override',
                  label: 'Override',
                  description: 'Proceed despite location mismatch',
                  action: async () => {
                    console.log('Override location conflict');
                  }
                }
              ]
            });
          }
        }
      }
    });

    return conflicts;
  }, [accounts]);

  /**
   * Calculate account state based on assignments
   */
  const createAccountState = useCallback((
    account: Account,
    assignments: AssignmentBar[]
  ): AccountState => {
    const now = new Date();
    const activeAssignments = assignments.filter(a => 
      a.status === 'active' || a.status === 'scheduled'
    );
    
    return {
      currentLocation: account.location || 'unknown',
      activeSprintIds: activeAssignments
        .map(a => a.sprint?.id)
        .filter((id): id is number => id !== undefined),
      idleSince: activeAssignments.length === 0 ? new Date(account.updated_at) : undefined,
      idleDuration: activeAssignments.length === 0 
        ? (now.getTime() - new Date(account.updated_at).getTime()) / (1000 * 60 * 60)
        : undefined,
      lastEmergencyContent: undefined, // TODO: Get from API
      cooldownUntil: undefined, // TODO: Get from API
      nextMaintenanceDue: undefined // TODO: Get from API
    };
  }, []);

  /**
   * Process data into timeline format
   */
  const processTimelineData = useCallback((): TimelineData => {
    try {
      setError(null);
      
      // Calculate optimal date range if not provided
      const effectiveDateRange = dateRange.start && dateRange.end 
        ? dateRange 
        : timelineCalculations.calculateOptimalDateRange(assignments);

      // Process assignments into bars
      const assignmentBars = createAssignmentBars(
        assignments, 
        sprints, 
        effectiveDateRange.start, 
        zoomLevel.pixelsPerDay
      );

      // Group assignments by account
      const accountAssignmentMap = new Map<number, AssignmentBar[]>();
      assignmentBars.forEach(bar => {
        const accountId = bar.assignment.account_id;
        if (!accountAssignmentMap.has(accountId)) {
          accountAssignmentMap.set(accountId, []);
        }
        accountAssignmentMap.get(accountId)!.push(bar);
      });

      // Create account timeline rows
      const accountRows: AccountTimelineRow[] = accounts.map((account, index) => {
        const accountAssignments = accountAssignmentMap.get(account.id) || [];
        const accountState = createAccountState(account, accountAssignments);
        
        return {
          account,
          assignments: accountAssignments,
          state: accountState,
          conflicts: [], // Will be populated after conflict detection
          height: 60,
          y: index * 60
        };
      });

      // Detect conflicts
      const conflicts = detectConflicts(accountRows, assignments, sprints);

      // Add conflicts to affected account rows
      conflicts.forEach(conflict => {
        conflict.affectedAssignments.forEach(assignmentId => {
          const accountRow = accountRows.find(row => 
            row.assignments.some(a => a.id === assignmentId)
          );
          if (accountRow) {
            const conflictWarning: ConflictWarning = {
              id: conflict.id,
              type: conflict.type as any,
              severity: conflict.severity,
              message: conflict.message,
              description: conflict.message,
              affectedItems: conflict.affectedAssignments,
              resolution_options: conflict.resolutionOptions.map(r => r.label),
              resolutionOptions: conflict.resolutionOptions
            };
            accountRow.conflicts.push(conflictWarning);
          }
        });
      });

      return {
        accounts: accountRows,
        conflicts,
        dateRange: effectiveDateRange,
        totalDuration: timelineCalculations.getDaysBetween(
          effectiveDateRange.start, 
          effectiveDateRange.end
        ),
        scale: {
          start: effectiveDateRange.start,
          end: effectiveDateRange.end,
          pixelsPerDay: zoomLevel.pixelsPerDay,
          majorTicks: [],
          minorTicks: [],
          currentTimeX: 0
        }
      };
    } catch (err) {
      console.error('Error processing timeline data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error processing timeline data');
      throw err;
    }
  }, [
    accounts, 
    sprints, 
    assignments, 
    dateRange, 
    zoomLevel, 
    createAssignmentBars, 
    detectConflicts, 
    createAccountState
  ]);

  /**
   * Refresh data from source
   */
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In a real implementation, this would fetch fresh data
      // For now, we'll just reprocess existing data
      const processedData = processTimelineData();
      setTimelineData(processedData);
    } catch (err) {
      console.error('Error refreshing Gantt data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, [processTimelineData]);

  /**
   * Subscribe to real-time updates
   */
  const subscribeToUpdates = useCallback(() => {
    // In a real implementation, this would set up WebSocket or polling
    // For now, we'll just return a no-op unsubscribe function
    return () => {
      // Cleanup subscription
    };
  }, []);

  // Process data when dependencies change
  useEffect(() => {
    let mounted = true;
    
    const processData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Add small delay to prevent rapid re-processing
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (!mounted) return;
        
        const processedData = processTimelineData();
        setTimelineData(processedData);
      } catch (err) {
        if (mounted) {
          console.error('Error processing timeline data:', err);
          setError(err instanceof Error ? err.message : 'Failed to process timeline data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    processData();
    
    return () => {
      mounted = false;
    };
  }, [processTimelineData]);

  return {
    timelineData,
    loading,
    error,
    refreshData,
    subscribeToUpdates
  };
}; 