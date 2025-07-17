import React, { useState, useEffect } from 'react';
import { 
  Play,
  AlertTriangle,
  Search,
  Grid,
  BarChart3,
  Activity
} from 'lucide-react';
import DataGrid from '../components/DataGrid/DataGrid';
import { DataGridColumn, SelectionState } from '../types/dataGrid';
import SprintCreationWizard from '../components/SprintCreation/SprintCreationWizard';
import { GanttChart } from '../components/GanttChart/GanttChart';
import { apiClient } from '../services/api';
import type { Account } from '../types/accounts';
import type { ContentSprint } from '../types/sprintCreation';
import type { SprintAssignment, GanttFilters } from '../types/ganttChart';

// Extended interface for grid view with additional properties from API
interface ExtendedContentSprint extends ContentSprint {
  is_highlight_group?: boolean;
  max_content_items?: number;
  content_count?: number;
  assignment_count?: number;
  active_accounts?: number;
  status?: 'active' | 'paused' | 'completed' | 'draft';
  calculated_duration_hours?: number | null;
  cooldown_hours?: number;
}

const SprintManagement: React.FC = () => {
  const [sprints, setSprints] = useState<ExtendedContentSprint[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [assignments, setAssignments] = useState<SprintAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'timeline' | 'analytics'>('grid');
  const [selectedSprints, setSelectedSprints] = useState<Set<number>>(new Set());
  const [showSprintWizard, setShowSprintWizard] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<number | undefined>(undefined);

  // Load data for all views
  useEffect(() => {
    loadSprints();
    if (viewMode === 'timeline') {
      loadTimelineData();
    }
  }, [viewMode]);

  const loadTimelineData = async () => {
    try {
      // TODO: Replace with actual API calls when endpoints are ready
      // const accountsResponse = await fetch('/api/accounts');
      // const assignmentsResponse = await fetch('/api/assignments');
      
      // For now, set empty arrays until real API integration
      setAccounts([]);
      setAssignments([]);
    } catch (error) {
      console.error('Error loading timeline data:', error);
    }
  };

  // Filter sprints based on search and filters
  const filteredSprints = sprints.filter(sprint => {
    const matchesSearch = sprint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sprint.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || sprint.sprint_type === filterType;
    const matchesLocation = filterLocation === 'all' || sprint.location === filterLocation;
    const matchesStatus = filterStatus === 'all' || sprint.status === filterStatus;
    
    return matchesSearch && matchesType && matchesLocation && matchesStatus;
  });

  // Define columns for DataGrid
  const columns: DataGridColumn<ExtendedContentSprint>[] = [
    {
      id: 'name',
      field: 'name',
      header: 'Sprint Name',
      width: 250,
      minWidth: 200,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'custom',
      align: 'left',
      editable: false,
      required: false,
      visible: true,
      order: 1,
      frozen: false,
      render: (value: any, sprint: ExtendedContentSprint) => (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {sprint.is_highlight_group ? (
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-purple-600" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Play className="w-4 h-4 text-blue-600" />
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{sprint.name}</div>
            <div className="text-sm text-gray-500 truncate max-w-[200px]">{sprint.description}</div>
          </div>
        </div>
      )
    },
    {
      id: 'type',
      field: 'sprint_type',
      header: 'Type',
      width: 150,
      minWidth: 120,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'custom',
      align: 'left',
      editable: false,
      required: false,
      visible: true,
      order: 2,
      frozen: false,
      render: (value: any, sprint: ExtendedContentSprint) => (
        <div className="space-y-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSprintTypeColor(sprint.sprint_type)}`}>
            {sprint.sprint_type}
          </span>
          {sprint.location && (
            <div className="text-xs text-gray-500">{sprint.location}</div>
          )}
          {sprint.is_highlight_group && (
            <div className="text-xs text-purple-600 font-medium">Highlight Group</div>
          )}
        </div>
      )
    },
    {
      id: 'content',
      field: 'content_count',
      header: 'Content',
      width: 100,
      minWidth: 80,
      resizable: true,
      sortable: true,
      filterable: false,
      type: 'custom',
      align: 'center',
      editable: false,
      required: false,
      visible: true,
      order: 3,
      frozen: false,
      render: (value: any, sprint: ExtendedContentSprint) => (
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {sprint.content_count}/{sprint.max_content_items}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div 
              className="bg-blue-600 h-1.5 rounded-full" 
              style={{ width: `${((sprint.content_count ?? 0) / (sprint.max_content_items ?? 1)) * 100}%` }}
            ></div>
          </div>
        </div>
      )
    },
    {
      id: 'duration',
      field: 'calculated_duration_hours',
      header: 'Duration',
      width: 120,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filterable: false,
      type: 'custom',
      align: 'center',
      editable: false,
      required: false,
      visible: true,
      order: 4,
      frozen: false,
      render: (value: any, sprint: ExtendedContentSprint) => (
        <div className="text-center">
          <div className="text-sm font-medium text-gray-900">
            {formatDuration(sprint.calculated_duration_hours ?? null)}
          </div>
          <div className="text-xs text-gray-500">
            {sprint.is_highlight_group ? 'Ongoing' : 'Estimated'}
          </div>
        </div>
      )
    },
    {
      id: 'accounts',
      field: 'active_accounts',
      header: 'Accounts',
      width: 100,
      minWidth: 80,
      resizable: true,
      sortable: true,
      filterable: false,
      type: 'custom',
      align: 'center',
      editable: false,
      required: false,
      visible: true,
      order: 5,
      frozen: false,
      render: (value: any, sprint: ExtendedContentSprint) => (
        <div className="text-center">
          <div className="text-sm font-medium text-green-600">
            {sprint.active_accounts}
          </div>
          <div className="text-xs text-gray-500">
            of {sprint.assignment_count}
          </div>
        </div>
      )
    },
    {
      id: 'availability',
      field: 'available_months',
      header: 'Availability',
      width: 150,
      minWidth: 120,
      resizable: true,
      sortable: false,
      filterable: false,
      type: 'custom',
      align: 'left',
      editable: false,
      required: false,
      visible: true,
      order: 6,
      frozen: false,
      render: (value: any, sprint: ExtendedContentSprint) => (
        <div className="text-sm text-gray-900">
          {formatMonths(sprint.available_months ?? [])}
        </div>
      )
    },
    {
      id: 'status',
      field: 'status',
      header: 'Status',
      width: 120,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'custom',
      align: 'left',
      editable: false,
      required: false,
      visible: true,
      order: 7,
      frozen: false,
      render: (value: any, sprint: ExtendedContentSprint) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(sprint.status ?? 'draft')}
          <span className="text-sm capitalize">{sprint.status}</span>
        </div>
      )
    }
  ];

  // Helper functions
  const getSprintTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'vacation': 'bg-green-100 text-green-800',
      'university': 'bg-blue-100 text-blue-800',
      'lifestyle': 'bg-purple-100 text-purple-800',
      'work': 'bg-gray-100 text-gray-800',
      'fitness': 'bg-red-100 text-red-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <div className="w-2 h-2 bg-green-500 rounded-full"></div>;
      case 'paused':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>;
      case 'completed':
        return <div className="w-2 h-2 bg-blue-500 rounded-full"></div>;
      case 'draft':
        return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full"></div>;
    }
  };

  const formatDuration = (hours: number | null): string => {
    if (!hours) return 'N/A';
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days > 0) {
      return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
    }
    return `${remainingHours}h`;
  };

  const formatMonths = (months: number[]): string => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (months.length === 12) return 'Year-round';
    if (months.length <= 3) {
      return months.map(m => monthNames[m - 1]).join(', ');
    }
    return `${months.length} months`;
  };

  // Selection handler
  const handleSelectionChange = (selection: SelectionState) => {
    setSelectedSprints(new Set(Array.from(selection.selectedRows)));
  };

  // Sprint creation handlers
  const handleCreateSprint = () => {
    setEditingSprintId(undefined);
    setShowSprintWizard(true);
  };

  const handleEditSprint = (sprintId: number) => {
    setEditingSprintId(sprintId);
    setShowSprintWizard(true);
  };

  const handleSprintWizardClose = () => {
    setShowSprintWizard(false);
    setEditingSprintId(undefined);
  };

  const handleSprintSuccess = (sprint: any) => {
    setShowSprintWizard(false);
    setEditingSprintId(undefined);
    // Reload sprints to reflect changes
    loadSprints();
  };

  // Extract loadSprints as a separate function to be reusable
  const loadSprints = async () => {
    try {
      setLoading(true);
      const result = await apiClient.getSprints();
      
      if (result.success) {
        // Map the API response to include status field
        const sprintsWithStatus = result.data.sprints.map((sprint: any) => ({
          ...sprint,
          status: (sprint.active_accounts ?? 0) > 0 ? 'active' : 'draft' // Simple status derivation
        }));
        setSprints(sprintsWithStatus as ExtendedContentSprint[]);
      } else {
        throw new Error(result.error || 'Failed to load sprints');
      }
    } catch (err) {
      setError('Failed to load sprints');
      console.error('Error loading sprints:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sprint Management</h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage content sprints and highlight groups for your Instagram accounts
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={handleCreateSprint} className="btn-primary">
              <Play className="w-4 h-4 mr-2" />
              Create Sprint
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredSprints.length}</span> sprints
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredSprints.filter(s => s.status === 'active').length}</span> active
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium">{filteredSprints.reduce((sum, s) => sum + (s.active_accounts ?? 0), 0)}</span> accounts assigned
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {selectedSprints.size > 0 && (
              <div className="text-sm text-gray-600">
                {selectedSprints.size} selected
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between space-x-4">
          <div className="flex-1 max-w-lg">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search sprints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Filters */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="form-select"
            >
              <option value="all">All Types</option>
              <option value="vacation">Vacation</option>
              <option value="university">University</option>
              <option value="lifestyle">Lifestyle</option>
              <option value="work">Work</option>
              <option value="fitness">Fitness</option>
            </select>
            
            <select
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="form-select"
            >
              <option value="all">All Locations</option>
              <option value="jamaica">Jamaica</option>
              <option value="germany">Germany</option>
              <option value="university">University</option>
              <option value="home">Home</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="form-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : ''}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={`p-1.5 rounded ${viewMode === 'timeline' ? 'bg-white shadow-sm' : ''}`}
              >
                <Activity className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('analytics')}
                className={`p-1.5 rounded ${viewMode === 'analytics' ? 'bg-white shadow-sm' : ''}`}
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 py-4">
        {viewMode === 'grid' && (
          <div className="bg-white rounded-lg shadow">
            <DataGrid
              data={filteredSprints}
              columns={columns}
              height={600}
              virtualScrolling={true}
              rowSelection={true}
              onSelectionChange={handleSelectionChange}
              rowClassName={(sprint: ExtendedContentSprint) => 
                selectedSprints.has(sprint.id ?? 0) ? 'bg-blue-50' : ''
              }
            />
          </div>
        )}
        
        {viewMode === 'timeline' && (
          <div className="bg-white rounded-lg shadow">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <GanttChart
                accounts={accounts}
                sprints={sprints.map(s => ({
                  ...s,
                  id: s.id || 0,
                  location: s.location || undefined,
                  target_duration_hours: s.target_duration_hours || 168
                }))}
                assignments={assignments}
                dateRange={{
                  start: new Date(),
                  end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
                }}
                zoomLevel="week"
                filters={{}}
                onSprintClick={(sprint) => console.log('Sprint clicked:', sprint)}
                onAccountClick={(account) => console.log('Account clicked:', account)}
                onAssignmentAction={(action) => console.log('Assignment action:', action)}
                className="w-full"
              />
            )}
          </div>
        )}
        
        {viewMode === 'analytics' && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center py-12">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics View</h3>
              <p className="text-gray-600">Analytics dashboard coming soon</p>
            </div>
          </div>
        )}
      </div>

      {/* Sprint Creation Wizard */}
      <SprintCreationWizard
        isOpen={showSprintWizard}
        onClose={handleSprintWizardClose}
        editingSprintId={editingSprintId}
        onSuccess={handleSprintSuccess}
      />
    </div>
  );
};

export default SprintManagement; 