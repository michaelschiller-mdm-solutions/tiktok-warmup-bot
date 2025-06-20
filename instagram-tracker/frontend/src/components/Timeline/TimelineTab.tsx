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

  // Sample data for demonstration
  useEffect(() => {
    const loadSampleData = () => {
      // Sample accounts
      const sampleAccounts: Account[] = [
        {
          id: 1,
          model_id: 1,
          username: 'travel_enthusiast',
          password: 'dummy_password',
          display_name: 'Travel Enthusiast',
          email: 'travel@example.com',
          status: 'active',
          device_info: {},
          lifecycle_state: 'active',
          state_changed_at: new Date().toISOString(),
          location: 'paris',
          proxy_status: 'active',
          follow_back_rate: 85.5,
          conversion_rate: 12.3,
          total_follows: 150,
          total_conversions: 18,
          monthly_cost: 45.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          model_id: 1,
          username: 'fitness_guru',
          password: 'dummy_password',
          display_name: 'Fitness Guru',
          email: 'fitness@example.com',
          status: 'active',
          device_info: {},
          lifecycle_state: 'active',
          state_changed_at: new Date().toISOString(),
          location: 'london',
          proxy_status: 'active',
          follow_back_rate: 78.2,
          conversion_rate: 15.6,
          total_follows: 230,
          total_conversions: 36,
          monthly_cost: 50.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          model_id: 1,
          username: 'food_lover',
          password: 'dummy_password',
          display_name: 'Food Lover',
          email: 'food@example.com',
          status: 'active',
          device_info: {},
          lifecycle_state: 'active',
          state_changed_at: new Date().toISOString(),
          location: 'newyork',
          proxy_status: 'active',
          follow_back_rate: 92.1,
          conversion_rate: 18.4,
          total_follows: 180,
          total_conversions: 33,
          monthly_cost: 40.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 4,
          model_id: 1,
          username: 'tech_reviewer',
          password: 'dummy_password',
          display_name: 'Tech Reviewer',
          email: 'tech@example.com',
          status: 'active',
          device_info: {},
          lifecycle_state: 'active',
          state_changed_at: new Date().toISOString(),
          location: 'tokyo',
          proxy_status: 'active',
          follow_back_rate: 65.8,
          conversion_rate: 22.1,
          total_follows: 95,
          total_conversions: 21,
          monthly_cost: 55.00,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Sample sprints
      const sampleSprints: ContentSprint[] = [
        {
          id: 1,
          name: 'Summer Vacation',
          description: 'Summer vacation content in Paris',
          sprint_type: 'vacation',
          location: 'paris',
          target_duration_hours: 168,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Morning Workout',
          description: 'Daily fitness routines',
          sprint_type: 'fitness',
          location: 'london',
          target_duration_hours: 720,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          name: 'Home Cooking',
          description: 'Home cooking recipes and tips',
          sprint_type: 'lifestyle',
          location: 'newyork',
          target_duration_hours: 504,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 4,
          name: 'Tech Reviews',
          description: 'Latest gadget reviews',
          sprint_type: 'work',
          location: 'tokyo',
          target_duration_hours: 336,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Sample assignments
      const sampleAssignments: SprintAssignment[] = [
        {
          id: 1,
          account_id: 1,
          sprint_id: 1,
          assignment_date: new Date().toISOString(),
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          current_content_index: 3,
          next_content_due: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          sprint_instance_id: 'vacation-paris-2024',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          account_id: 2,
          sprint_id: 2,
          assignment_date: new Date().toISOString(),
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          current_content_index: 8,
          next_content_due: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          sprint_instance_id: 'fitness-london-2024',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 3,
          account_id: 3,
          sprint_id: 3,
          assignment_date: new Date().toISOString(),
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'scheduled',
          current_content_index: 0,
          next_content_due: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          sprint_instance_id: 'cooking-ny-2024',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 4,
          account_id: 4,
          sprint_id: 4,
          assignment_date: new Date().toISOString(),
          start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          end_date: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'scheduled',
          current_content_index: 0,
          next_content_due: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          sprint_instance_id: 'tech-tokyo-2024',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      setAccounts(sampleAccounts);
      setSprints(sampleSprints);
      setAssignments(sampleAssignments);
      setLoading(false);
    };

    // Load data with a small delay to simulate API call
    const timer = setTimeout(() => {
      loadSampleData();
    }, 500);

    return () => clearTimeout(timer);
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