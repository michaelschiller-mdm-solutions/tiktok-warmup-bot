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
  X,
  Upload
} from 'lucide-react';
import {
  HighlightGroup,
  HighlightGroupFilters,
  CreateHighlightGroupRequest
} from '../../types/highlightGroups';
import HighlightGroupCreationWizard from './HighlightGroupCreationWizard';
import PositionManager from './PositionManager';

interface HighlightGroupsTabProps {
  onUploadClick?: () => void;
}

const HighlightGroupsTab: React.FC<HighlightGroupsTabProps> = ({ onUploadClick }) => {
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

  // Load highlight groups (filtered for is_highlight_group = true)
  useEffect(() => {
    const loadHighlightGroups = async () => {
      try {
        setLoading(true);
        // This would be the API call to get highlight groups
        // const response = await apiClient.getHighlightGroups();
        
        // Mock data for development - will be replaced with API call
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
      } catch (error) {
        console.error('Failed to load highlight groups:', error);
        setError('Failed to load highlight groups');
      } finally {
        setLoading(false);
      }
    };

    loadHighlightGroups();
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Error Loading Highlight Groups</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search highlight groups..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="form-input pl-10"
            />
          </div>
          
          <select
            value={filters.category || ''}
            onChange={(e) => setFilters({ ...filters, category: e.target.value || undefined })}
            className="form-select"
          >
            <option value="">All Categories</option>
            <option value="travel">Travel</option>
            <option value="fitness">Fitness</option>
            <option value="professional">Professional</option>
            <option value="lifestyle">Lifestyle</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPositionManager(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Manage Positions
          </button>
          
          {onUploadClick && (
            <button
              onClick={onUploadClick}
              className="btn-secondary flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Content
            </button>
          )}
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Highlight Group
          </button>
        </div>
      </div>

      {/* Highlight Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <div key={group.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{group.name}</h3>
                    <span className="text-sm text-gray-500">#{group.current_position}</span>
                  </div>
                  {group.description && (
                    <p className="text-sm text-gray-600 mb-3">{group.description}</p>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    {getStatusBadge(group)}
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                      {group.category}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGroupEdit(group)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Edit Group"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleGroupDelete(group.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete Group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Content Pool Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Content Pool</span>
                  <span>{group.content_pool_size}/{group.max_content_items}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${getProgressColor(group.content_pool_size, group.max_content_items)}`}
                    style={{ width: `${(group.content_pool_size / group.max_content_items) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Maintenance Info */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Every {group.maintenance_frequency_weeks}w</span>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-600">Next: {formatDate(group.next_maintenance_date)}</p>
                    <p className="text-xs text-gray-500">{group.content_per_maintenance} item(s)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Highlight Groups Found</h3>
          <p className="text-gray-600 mb-6">
            {filters.search ? 'No groups match your search criteria.' : 'Get started by creating your first highlight group.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <Plus className="w-4 h-4" />
            Create Highlight Group
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <HighlightGroupCreationWizard
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onGroupCreate={handleGroupCreate}
          existingGroups={groups}
        />
      )}

      {showPositionManager && (
        <PositionManager
          groups={groups}
          positionData={[]} // Mock empty position data for now
          onPositionChange={handlePositionChange}
          previewMode={false}
        />
      )}
    </div>
  );
};

export default HighlightGroupsTab; 