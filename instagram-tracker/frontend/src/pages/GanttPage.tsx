import React, { useState, useEffect } from 'react';
import { GanttChart } from '../components/GanttChart/GanttChart';
import type { Account } from '../types/accounts';
import type { ContentSprint } from '../types/sprintCreation';
import type { SprintAssignment } from '../types/assignments';
import type { GanttFilters } from '../types/ganttChart';

export const GanttPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [sprints, setSprints] = useState<ContentSprint[]>([]);
  const [assignments, setAssignments] = useState<SprintAssignment[]>([]);
  const [loading, setLoading] = useState(true);

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
          next_content_due: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
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

    // Simulate loading delay
    const timer = setTimeout(loadSampleData, 1000);
    return () => clearTimeout(timer);
  }, []);

  const defaultFilters: GanttFilters = {};

  const dateRange = {
    start: new Date(),
    end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
  };

  const handleSprintClick = (sprint: ContentSprint) => {
    console.log('Sprint clicked:', sprint);
    // In a real app, this might navigate to sprint details or open a modal
  };

  const handleAccountClick = (account: Account) => {
    console.log('Account clicked:', account);
    // In a real app, this might navigate to account details
  };

  const handleAssignmentAction = (action: any) => {
    console.log('Assignment action:', action);
    // In a real app, this would trigger assignment management actions
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-medium text-gray-900">Loading Gantt Chart...</h2>
          <p className="text-gray-600">Preparing timeline visualization</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Timeline</h1>
              <p className="text-sm text-gray-600">
                Visualize and manage content sprint assignments across all accounts
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">
                {accounts.length} accounts • {assignments.length} assignments
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <GanttChart
            accounts={accounts}
            sprints={sprints}
            assignments={assignments}
            dateRange={dateRange}
            zoomLevel="week"
            filters={defaultFilters}
            onSprintClick={handleSprintClick}
            onAccountClick={handleAccountClick}
            onAssignmentAction={handleAssignmentAction}
            className="w-full"
          />
        </div>

        {/* Info Panel */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Legend</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-200 border-2 border-green-500 rounded"></div>
                <span className="text-sm text-gray-700">Vacation Sprint</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-blue-200 border-2 border-blue-500 rounded"></div>
                <span className="text-sm text-gray-700">University Sprint</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-200 border-2 border-red-500 rounded"></div>
                <span className="text-sm text-gray-700">Fitness Sprint</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-purple-200 border-2 border-purple-500 rounded"></div>
                <span className="text-sm text-gray-700">Lifestyle Sprint</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gray-200 border-2 border-gray-500 rounded"></div>
                <span className="text-sm text-gray-700">Work Sprint</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Active Sprints:</span>
                <span className="text-sm font-medium">{assignments.filter(a => a.status === 'active').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Scheduled:</span>
                <span className="text-sm font-medium">{assignments.filter(a => a.status === 'scheduled').length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Accounts:</span>
                <span className="text-sm font-medium">{accounts.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Unique Sprints:</span>
                <span className="text-sm font-medium">{sprints.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md">
                📅 Create New Sprint
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-md">
                ➕ Add Assignment
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-md">
                📊 View Analytics
              </button>
              <button className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-md">
                📥 Export Timeline
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 