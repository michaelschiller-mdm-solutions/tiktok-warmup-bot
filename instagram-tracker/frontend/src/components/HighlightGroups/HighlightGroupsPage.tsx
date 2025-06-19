import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Calendar,
  Settings,
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react';
import {
  HighlightGroup,
  HighlightGroupsPageProps,
  HighlightGroupFilters,
  CreateHighlightGroupRequest
} from '../../types/highlightGroups';
import HighlightGroupCreationWizard from './HighlightGroupCreationWizard';
import PositionManager from './PositionManager';

const HighlightGroupsPage: React.FC<HighlightGroupsPageProps> = ({ className = '' }) => {
  // State management
  const [groups, setGroups] = useState<HighlightGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<number[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPositionManager, setShowPositionManager] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<HighlightGroup | null>(null);
  
  // Filters and search
  const [filters, setFilters] = useState<HighlightGroupFilters>({
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc',
    limit: 50
  });

  // Mock data for development - will be replaced with API call
  useEffect(() => {
    const mockGroups: HighlightGroup[] = [
      {
        id: 1,
        name: "Travel Adventures",
        description: "Best travel moments and destinations",
        category: "travel",
        content_pool_size: 45,
        max_content_items: 100,
        current_position: 1,
        maintenance_frequency_weeks: 3,
        content_per_maintenance: 2,
        last_maintenance_date: "2025-01-20T10:00:00Z",
        next_maintenance_date: "2025-02-10T10:00:00Z",
        is_active: true,
        seasonal_months: [3, 4, 5, 6, 7, 8, 9, 10],
        blocks_sprint_types: ["vacation", "travel"],
        blocks_highlight_groups: [],
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-20T10:00:00Z"
      },
      {
        id: 2,
        name: "Fitness Journey",
        description: "Workout routines and health tips",
        category: "fitness",
        content_pool_size: 78,
        max_content_items: 100,
        current_position: 2,
        maintenance_frequency_weeks: 2,
        content_per_maintenance: 1,
        last_maintenance_date: "2025-01-15T08:00:00Z",
        next_maintenance_date: "2025-01-29T08:00:00Z",
        is_active: true,
        seasonal_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        blocks_sprint_types: ["health"],
        blocks_highlight_groups: [],
        created_at: "2024-12-15T00:00:00Z",
        updated_at: "2025-01-15T08:00:00Z"
      },
      {
        id: 3,
        name: "Work & Career",
        description: "Professional achievements and insights",
        category: "professional",
        content_pool_size: 23,
        max_content_items: 100,
        current_position: 5,
        maintenance_frequency_weeks: 4,
        content_per_maintenance: 1,
        is_active: false,
        seasonal_months: [1, 2, 3, 4, 9, 10, 11, 12],
        blocks_sprint_types: ["work", "professional"],
        blocks_highlight_groups: [1],
        created_at: "2024-11-01T00:00:00Z",
        updated_at: "2025-01-10T00:00:00Z"
      }
    ];

    setGroups(mockGroups);
    setLoading(false);
  }, []);

  // Helper functions
  const getStatusBadge = (group: HighlightGroup) => {
    if (!group.is_active) {
      return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Inactive</span>;
    }
    
    const now = new Date();
    const nextMaintenance = group.next_maintenance_date ? new Date(group.next_maintenance_date) : null;
    const isMaintenanceDue = nextMaintenance && nextMaintenance <= now;
    
    if (isMaintenanceDue) {
      return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Maintenance Due</span>;
    }
    
    return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Active</span>;
  };

  const getProgressColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage < 30) return 'bg-red-500';
    if (percentage < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const handleGroupCreate = async (groupData: CreateHighlightGroupRequest) => {
    // This will be implemented with actual API call
    console.log('Creating group:', groupData);
    setShowCreateModal(false);
  };

  const handleGroupEdit = (group: HighlightGroup) => {
    setSelectedGroup(group);
    setShowEditModal(true);
  };

  const handleGroupDelete = async (groupId: number) => {
    if (window.confirm('Are you sure you want to delete this highlight group?')) {
      // This will be implemented with actual API call
      setGroups(groups.filter(g => g.id !== groupId));
    }
  };

  const handlePositionChange = async (groupId: number, newPosition: number) => {
    // This will be implemented with actual API call
    console.log('Position change:', groupId, newPosition);
    
    // Update local state for immediate feedback
    setGroups(prevGroups => 
      prevGroups.map(group => 
        group.id === groupId 
          ? { ...group, current_position: newPosition }
          : group
      )
    );
  };

  const filteredGroups = groups.filter(group => {
    if (filters.search && !group.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.category && group.category !== filters.category) {
      return false;
    }
    if (filters.is_active !== undefined && group.is_active !== filters.is_active) {
      return false;
    }
    return true;
  });

  return (
    <div className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Highlight Groups</h1>
          <p className="text-gray-600 mt-1">
            Manage Instagram highlight groups with automated maintenance and position control
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Create Group</span>
          </button>
          <button 
            onClick={() => setShowPositionManager(true)}
            className="btn-secondary flex items-center space-x-2"
          >
            <Settings size={16} />
            <span>Manage Positions</span>
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border mb-6 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search highlight groups..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Categories</option>
            <option value="travel">Travel</option>
            <option value="fitness">Fitness</option>
            <option value="lifestyle">Lifestyle</option>
            <option value="professional">Professional</option>
            <option value="food">Food</option>
          </select>

          <select
            value={filters.is_active === undefined ? '' : filters.is_active.toString()}
            onChange={(e) => setFilters({ 
              ...filters, 
              is_active: e.target.value === '' ? undefined : e.target.value === 'true' 
            })}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          {selectedGroups.length > 0 && (
            <button className="btn-secondary flex items-center space-x-2">
              <span>Bulk Actions ({selectedGroups.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Groups Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading highlight groups...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-2" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No highlight groups found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first highlight group.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 btn-primary flex items-center space-x-2 mx-auto"
            >
              <Plus size={16} />
              <span>Create Highlight Group</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGroups(filteredGroups.map(g => g.id));
                        } else {
                          setSelectedGroups([]);
                        }
                      }}
                      checked={selectedGroups.length === filteredGroups.length && filteredGroups.length > 0}
                    />
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name & Category
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content Pool
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Position
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Maintenance
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredGroups.map((group) => (
                  <tr key={group.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedGroups.includes(group.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGroups([...selectedGroups, group.id]);
                          } else {
                            setSelectedGroups(selectedGroups.filter(id => id !== group.id));
                          }
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                        <div className="text-xs text-gray-500 capitalize">{group.category}</div>
                        {group.description && (
                          <div className="text-xs text-gray-400 mt-1 max-w-48 truncate">{group.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getProgressColor(group.content_pool_size, group.max_content_items)}`}
                              style={{ width: `${(group.content_pool_size / group.max_content_items) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                        <span className="ml-2 text-xs text-gray-600">
                          {group.content_pool_size}/{group.max_content_items}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">#{group.current_position}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs">
                        <div className="text-gray-600">Every {group.maintenance_frequency_weeks}w</div>
                        <div className="text-gray-500">Next: {formatDate(group.next_maintenance_date)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(group)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleGroupEdit(group)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className="text-green-600 hover:text-green-900"
                          title="Analytics"
                        >
                          <BarChart3 size={16} />
                        </button>
                        <button
                          className="text-purple-600 hover:text-purple-900"
                          title="Schedule Maintenance"
                        >
                          <Calendar size={16} />
                        </button>
                        <button
                          onClick={() => handleGroupDelete(group.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Statistics */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Groups</p>
              <p className="text-lg font-semibold text-gray-900">{groups.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Groups</p>
              <p className="text-lg font-semibold text-gray-900">
                {groups.filter(g => g.is_active).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Maintenance Due</p>
              <p className="text-lg font-semibold text-gray-900">
                {groups.filter(g => {
                  const nextMaintenance = g.next_maintenance_date ? new Date(g.next_maintenance_date) : null;
                  return nextMaintenance && nextMaintenance <= new Date();
                }).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Avg Content</p>
              <p className="text-lg font-semibold text-gray-900">
                {groups.length > 0 ? Math.round(groups.reduce((sum, g) => sum + g.content_pool_size, 0) / groups.length) : 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Creation Wizard Modal */}
      <HighlightGroupCreationWizard
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onGroupCreate={handleGroupCreate}
        existingGroups={groups}
      />

      {/* Position Manager Modal */}
      {showPositionManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Position Manager</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage highlight group positions and ordering
                </p>
              </div>
              <button
                onClick={() => setShowPositionManager(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {/* Position Manager Content */}
            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <PositionManager
                groups={groups}
                positionData={[]} // Mock empty position data for now
                onPositionChange={handlePositionChange}
                previewMode={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* Other modals would be implemented here */}
    </div>
  );
};

export default HighlightGroupsPage;