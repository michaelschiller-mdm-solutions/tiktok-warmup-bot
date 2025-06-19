import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { 
  GanttChartProps, 
  GanttFilters, 
  TimelineData, 
  ZoomLevel,
  GanttTooltipData,
  AccountTimelineRow,
  AssignmentBar,
  ConflictIndicator
} from '../../types/ganttChart';
import type { Account } from '../../types/accounts';
import type { SprintContentItem } from '../../types/sprintCreation';
import { VirtualizedGantt } from './VirtualizedGantt';
import { GanttTooltip } from './GanttTooltip';
// TimelineCalculationService moved to backend - will use API calls instead
import { apiClient } from '../../services/api';

// Enhanced zoom level configurations with better scaling
const ZOOM_LEVELS: ZoomLevel[] = [
  {
    level: 'hour',
    pixelsPerDay: 480, // 20px per hour
    majorTickInterval: 0.25, // Every 6 hours
    minorTickInterval: 0.125, // Every 3 hours
    label: 'Hourly View'
  },
  {
    level: 'day',
    pixelsPerDay: 200, // More spacious daily view
    majorTickInterval: 1,
    minorTickInterval: 0.5, // Twice per day
    label: 'Daily View'
  },
  {
    level: 'week', 
    pixelsPerDay: 60, // Increased from 40
    majorTickInterval: 7,
    minorTickInterval: 1,
    label: 'Weekly View'
  },
  {
    level: 'month',
    pixelsPerDay: 20, // Increased from 12
    majorTickInterval: 30,
    minorTickInterval: 7,
    label: 'Monthly View'
  },
  {
    level: 'quarter',
    pixelsPerDay: 6,
    majorTickInterval: 90,
    minorTickInterval: 30,
    label: 'Quarterly View'
  }
];

// Sprint type colors
const SPRINT_TYPE_COLORS: Record<string, { color: string; lightColor: string }> = {
  vacation: { color: '#10B981', lightColor: '#A7F3D0' },
  university: { color: '#3B82F6', lightColor: '#BFDBFE' },
  home: { color: '#6B7280', lightColor: '#D1D5DB' },
  work: { color: '#374151', lightColor: '#E5E7EB' },
  fitness: { color: '#EF4444', lightColor: '#FECACA' },
  lifestyle: { color: '#8B5CF6', lightColor: '#DDD6FE' },
  default: { color: '#6366F1', lightColor: '#C7D2FE' }
};

export const GanttChart: React.FC<GanttChartProps> = ({
  accounts,
  sprints,
  assignments,
  dateRange,
  zoomLevel = 'week',
  filters,
  onSprintClick,
  onAccountClick,
  onAssignmentAction,
  className = ''
}) => {
  // Basic state management
  const [localFilters, setLocalFilters] = useState<GanttFilters>(filters);
  const [currentZoomLevel, setCurrentZoomLevel] = useState<ZoomLevel>(
    ZOOM_LEVELS.find(z => z.level === zoomLevel) || ZOOM_LEVELS[1]
  );
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'account'>('all');
  const [scrollPosition, setScrollPosition] = useState({ left: 0, top: 0 });
  const [tooltipData, setTooltipData] = useState<GanttTooltipData | null>(null);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

    // Real API-based data processing using backend TimelineCalculationService
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch timeline data from backend API
  useEffect(() => {
    const fetchTimelineData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const startDate = dateRange.start || new Date();
        const endDate = dateRange.end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const containerWidth = containerRef.current?.clientWidth || 1200;

        // Call backend TimelineCalculationService via API
        const response = await apiClient.getTimelineData({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          container_width: containerWidth,
          zoom_level: currentZoomLevel.level,
          pixels_per_day: currentZoomLevel.pixelsPerDay,
          major_tick_interval: currentZoomLevel.majorTickInterval,
          minor_tick_interval: currentZoomLevel.minorTickInterval,
          account_ids: viewMode === 'account' && selectedAccountId ? [selectedAccountId] : undefined,
          sprint_ids: undefined
        });

                 if (response.success) {
           // Transform API response to match frontend types
           const apiData = response.data;
           
           // Convert date strings back to Date objects
           const transformedTimelineScale = {
             ...apiData.timeline_scale,
             start: new Date(apiData.timeline_scale.start),
             end: new Date(apiData.timeline_scale.end),
             majorTicks: apiData.timeline_scale.majorTicks.map((tick: any) => ({
               ...tick,
               date: new Date(tick.date)
             })),
             minorTicks: apiData.timeline_scale.minorTicks.map((tick: any) => ({
               ...tick,
               date: new Date(tick.date)
             }))
           };
           
           const transformedData: TimelineData = {
             accounts: accountsToProcess.map((account, index) => ({
               account,
               assignments: apiData.assignment_bars.filter((bar: any) => bar.assignment.account_id === account.id),
               state: {
                 currentLocation: 'home',
                 activeSprintIds: [],
                 idleSince: undefined,
                 idleDuration: 0,
                 lastEmergencyContent: undefined,
                 cooldownUntil: undefined,
                 nextMaintenanceDue: undefined
               },
               conflicts: [],
               height: 60,
               y: index * 60
             })),
             conflicts: apiData.conflicts || [],
             dateRange: { start: startDate, end: endDate },
             totalDuration: apiData.total_duration,
             scale: transformedTimelineScale
           };

          setTimelineData(transformedData);
        } else {
          throw new Error(response.message || 'Failed to fetch timeline data');
        }
      } catch (err: any) {
        console.error('Timeline data fetch error:', err);
        setError(err.message || 'Failed to load timeline data');
        
        // Fallback to mock data on error
        setTimelineData(createMockTimelineData());
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimelineData();
  }, [dateRange, currentZoomLevel, viewMode, selectedAccountId]);

  // Filter accounts based on view mode
  const accountsToProcess = useMemo(() => {
    return viewMode === 'account' && selectedAccountId 
      ? accounts.filter(a => a.id === selectedAccountId)
      : accounts.slice(0, 50);
  }, [accounts, viewMode, selectedAccountId]);

     // Fallback mock data creation
   const createMockTimelineData = (): TimelineData => {
     const startDate = dateRange.start || new Date();
     const endDate = dateRange.end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
     
     // Ensure all dates are proper Date objects in mock data too
     const timelineScale = {
       start: new Date(startDate),
       end: new Date(endDate),
       pixelsPerDay: currentZoomLevel.pixelsPerDay,
       majorTicks: [
         { date: new Date('2024-12-01'), x: 0, label: 'Dec 1', isMajor: true },
         { date: new Date('2024-12-08'), x: 350, label: 'Dec 8', isMajor: true },
         { date: new Date('2024-12-15'), x: 700, label: 'Dec 15', isMajor: true },
         { date: new Date('2024-12-22'), x: 1050, label: 'Dec 22', isMajor: true },
         { date: new Date('2024-12-29'), x: 1400, label: 'Dec 29', isMajor: true }
       ],
       minorTicks: [
         { date: new Date('2024-12-02'), x: 50, label: '2', isMajor: false },
         { date: new Date('2024-12-03'), x: 100, label: '3', isMajor: false },
         { date: new Date('2024-12-04'), x: 150, label: '4', isMajor: false }
       ],
       currentTimeX: 800
     };

    const assignmentBars: AssignmentBar[] = assignments.map((assignment, index) => {
      const sprint = sprints.find(s => s.id === assignment.sprint_id);
      return {
        id: `assignment-${assignment.id}`,
        assignment,
        sprint: sprint || { id: 0, name: 'Unknown Sprint', sprint_type: 'default', description: '', target_duration_hours: 24, content_items: [] },
        x: 700 + (index * 100),
        width: 400,
        height: 40,
        color: SPRINT_TYPE_COLORS[sprint?.sprint_type || 'default']?.color || '#6366F1',
        progress: Math.round((assignment.current_content_index / (sprint?.content_items?.length || 1)) * 100),
        status: assignment.status,
        contentItems: [],
        conflicts: []
      };
    });

    return {
      accounts: accountsToProcess.map((account, index) => ({
        account,
        assignments: assignmentBars.filter(bar => bar.assignment.account_id === account.id),
        state: {
          currentLocation: 'home',
          activeSprintIds: [],
          idleSince: undefined,
          idleDuration: 0,
          lastEmergencyContent: undefined,
          cooldownUntil: undefined,
          nextMaintenanceDue: undefined
        },
        conflicts: [],
        height: 60,
        y: index * 60
      })),
      conflicts: [],
      dateRange: { start: startDate, end: endDate },
      totalDuration: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
      scale: timelineScale
    };
  };

  // Filtered accounts
  const displayAccounts = useMemo(() => {
    if (!timelineData) return [];
    
    let filtered = timelineData.accounts;

    // If viewing a specific account, filter to just that account
    if (viewMode === 'account' && selectedAccountId) {
      filtered = filtered.filter((row: AccountTimelineRow) => row.account.id === selectedAccountId);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((row: AccountTimelineRow) => 
        row.account.username.toLowerCase().includes(query) ||
        row.account.display_name?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [timelineData, searchQuery, viewMode, selectedAccountId]);

  // Event handlers
  const handleZoomIn = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z.level === currentZoomLevel.level);
    if (currentIndex > 0) {
      setCurrentZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    }
  }, [currentZoomLevel]);

  const handleZoomOut = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z.level === currentZoomLevel.level);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setCurrentZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    }
  }, [currentZoomLevel]);

  const handleSprintClick = useCallback((assignment: AssignmentBar, event: React.MouseEvent) => {
    event.stopPropagation();
    onSprintClick?.(assignment.sprint);
  }, [onSprintClick]);

  const handleAccountClick = useCallback((accountRow: AccountTimelineRow, event: React.MouseEvent) => {
    event.stopPropagation();
    if (viewMode === 'all') {
      // Switch to account-specific view
      setSelectedAccountId(accountRow.account.id);
      setViewMode('account');
    }
    onAccountClick?.(accountRow.account);
  }, [onAccountClick, viewMode]);

  const handleMouseEnter = useCallback((data: GanttTooltipData) => {
    setTooltipData(data);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltipData(null);
  }, []);

  const handleScroll = useCallback((scrollLeft: number, scrollTop: number) => {
    setScrollPosition({ left: scrollLeft, top: scrollTop });
  }, []);

  const handleBackToAllAccounts = useCallback(() => {
    setViewMode('all');
    setSelectedAccountId(null);
  }, []);

  const clearFilters = useCallback(() => {
    setLocalFilters({});
    setSearchQuery('');
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`gantt-chart relative bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}
      style={{ height: '600px' }}
    >
      {/* Header Controls */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-4">
          {viewMode === 'account' && selectedAccountId ? (
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBackToAllAccounts}
                className="text-blue-600 hover:text-blue-800 font-medium text-sm"
              >
                ← Back to All Accounts
              </button>
              <div className="text-lg font-semibold text-gray-900">
                {accounts.find(a => a.id === selectedAccountId)?.username || 'Account'} Timeline
              </div>
            </div>
          ) : (
            <h2 className="text-lg font-semibold text-gray-900">Content Timeline</h2>
          )}
          
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search accounts or sprints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filters Toggle */}
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`flex items-center space-x-2 px-3 py-2 border rounded-md text-sm ${
              isFiltersOpen ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-300 text-gray-700'
            }`}
          >
            <span>🔽</span>
            <span>Filters</span>
          </button>

          {/* Active Filters Indicator */}
          {(Object.keys(localFilters).length > 0 || searchQuery) && (
            <button
              onClick={clearFilters}
              className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs"
            >
              <span>Clear filters</span>
              <span>✕</span>
            </button>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={handleZoomOut}
              disabled={currentZoomLevel.level === 'quarter'}
              className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>🔍➖</span>
            </button>
            <span className="px-3 py-2 text-sm border-x border-gray-300">
              {currentZoomLevel.label}
            </span>
            <button
              onClick={handleZoomIn}
              disabled={currentZoomLevel.level === 'hour'}
              className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>🔍➕</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {isFiltersOpen && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Filter controls - Advanced filtering options will be available here
          </div>
        </div>
      )}

      {/* Timeline Content */}
      <div className="flex h-full">
        {/* Account Sidebar */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <div className="sticky top-0 bg-gray-100 p-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-900">
              Accounts ({displayAccounts.length})
            </h3>
          </div>
          
          {displayAccounts.map((accountRow) => (
            <div
              key={accountRow.account.id}
              className="p-3 border-b border-gray-200 hover:bg-gray-100 cursor-pointer"
              onClick={(e) => handleAccountClick(accountRow, e)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {accountRow.account.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {accountRow.account.display_name || accountRow.account.username}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    @{accountRow.account.username}
                  </p>
                  {accountRow.conflicts.length > 0 && (
                    <div className="flex items-center mt-1">
                      <span className="text-amber-500 mr-1">⚠️</span>
                      <span className="text-xs text-amber-600">
                        {accountRow.conflicts.length} conflict{accountRow.conflicts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* VirtualizedGantt Component */}
        <div className="flex-1">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading timeline data...</div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-red-500">Error: {error}</div>
            </div>
          )}
          
          {timelineData && !isLoading && (
            <VirtualizedGantt
              timelineData={timelineData}
              containerWidth={containerRef.current?.clientWidth ? containerRef.current.clientWidth - 264 : 936} // Subtract sidebar width
              containerHeight={500} // Will make this dynamic later
              rowHeight={60}
              headerHeight={80}
              onSprintClick={handleSprintClick}
              onAccountClick={handleAccountClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              pixelsPerDay={currentZoomLevel.pixelsPerDay}
              scrollPosition={scrollPosition}
              onScroll={handleScroll}
              className="gantt-virtualized"
            />
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltipData && (
        <GanttTooltip
          data={tooltipData}
          position={{ x: tooltipData.x, y: tooltipData.y }}
          onAction={(action, data) => {
            console.log('Tooltip action:', action, data);
            setTooltipData(null);
            // Map tooltip actions to assignment actions
            const actionMap: Record<string, string> = {
              'pause-sprint': 'pause',
              'resume-sprint': 'resume', 
              'cancel-sprint': 'cancel',
              'reschedule-sprint': 'reschedule',
              'view-sprint': 'details'
            };
            
            const mappedAction = actionMap[action];
            if (mappedAction && data?.assignmentId) {
              onAssignmentAction?.({ 
                type: mappedAction as any, 
                assignmentId: data.assignmentId, 
                payload: data 
              });
            }
          }}
        />
      )}
    </div>
  );
}; 