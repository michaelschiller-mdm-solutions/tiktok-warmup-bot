import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Filter, 
  Play, 
  Pause, 
  MoreHorizontal,
  ZoomIn,
  ZoomOut,
  RefreshCw
} from 'lucide-react';
import { Account } from '../../types/accounts';
import { ContentSprint } from '../../types/sprintCreation';
import { SprintAssignment } from '../../types/assignments';
import { GanttChart } from '../GanttChart/GanttChart';
import { GanttFilters } from '../../types/ganttChart';
import { AccountLifecycleState } from '../../types/lifecycle';

interface TimelineTabProps {}

const TimelineTab: React.FC<TimelineTabProps> = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sprints, setSprints] = useState<ContentSprint[]>([]);
  const [assignments, setAssignments] = useState<SprintAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // State for filters and timeline controls
  const [filters, setFilters] = useState<GanttFilters>({
    accountStatus: [],
    sprintTypes: [],
    contentTypes: [],
    conflictsOnly: false,
    accountIds: []
  });

  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)    // 90 days from now
  });

  const [zoomLevel, setZoomLevel] = useState<'hour' | 'day' | 'week' | 'month' | 'quarter'>('week');

  // Load real data from API
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // TODO: Replace with actual API calls when endpoints are ready
        // const accountsResponse = await fetch('/api/accounts');
        // const sprintsResponse = await fetch('/api/sprints');
        // const assignmentsResponse = await fetch('/api/assignments');
        
        // For now, set empty arrays until real API integration
        setAccounts([]);
        setSprints([]);
        setAssignments([]);
      } catch (error) {
        console.error('Failed to load timeline data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSprintClick = (sprint: ContentSprint) => {
    console.log('Sprint clicked:', sprint);
  };

  const handleAccountClick = (account: Account) => {
    console.log('Account clicked:', account);
  };

  const handleAssignmentAction = (action: any) => {
    console.log('Assignment action:', action);
  };

  const handleFilterChange = (filters: GanttFilters) => {
    console.log('Filter change:', filters);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Timeline Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Content Sprint Timeline</h3>
          <p className="text-sm text-gray-600">
            Visualize account sprint assignments and content scheduling across time
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            {accounts.length} accounts • {assignments.length} assignments
          </span>
        </div>
      </div>

      {/* Gantt Chart Container */}
      <div className="bg-white rounded-lg shadow-sm border">
        <GanttChart
          accounts={accounts}
          sprints={sprints}
          assignments={assignments}
          dateRange={dateRange}
          zoomLevel={zoomLevel}
          filters={filters}
          onSprintClick={handleSprintClick}
          onAccountClick={handleAccountClick}
          onAssignmentAction={handleAssignmentAction}
        />
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Timeline Legend</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-blue-500 rounded"></div>
            <span className="text-sm text-gray-600">Active Sprint</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-yellow-500 rounded"></div>
            <span className="text-sm text-gray-600">Scheduled Sprint</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-500 rounded"></div>
            <span className="text-sm text-gray-600">Completed Sprint</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-purple-500 rounded"></div>
            <span className="text-sm text-gray-600">Highlight Maintenance</span>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Sprints</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignments.filter(a => a.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <div className="w-6 h-6 bg-yellow-600 rounded"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">
                {assignments.filter(a => a.status === 'scheduled').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <div className="w-6 h-6 bg-green-600 rounded"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <div className="w-6 h-6 bg-purple-600 rounded"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Sprint Types</p>
              <p className="text-2xl font-bold text-gray-900">{sprints.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimelineTab; 