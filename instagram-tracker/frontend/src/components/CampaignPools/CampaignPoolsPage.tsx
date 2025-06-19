import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Download,
  Settings,
  Trash2,
  Copy,
  Play,
  Upload,
  BarChart3,
  Users,
  Calendar
} from 'lucide-react';
import { CampaignPoolsPageProps, CampaignPool, PoolListFilters, ContentSprint, PoolFilters } from '../../types/campaignPools';
import { useCampaignPools } from '../../hooks/useCampaignPools';
import LoadingSpinner from '../LoadingSpinner';
import { apiClient } from '../../services/api';
import CompatibilityIndicator from './CompatibilityIndicator';

const CampaignPoolsPage: React.FC<CampaignPoolsPageProps> = ({ className = '' }) => {
  // State management
  const {
    pools,
    templates,
    totalCount,
    loading,
    creating,
    error,
    filters,
    setFilters,
    createPool,
    updatePool,
    deletePool,
    duplicatePool,
    assignPool,
    loadPools,
    clearError
  } = useCampaignPools();

  // Additional state for sprints data
  const [availableSprints, setAvailableSprints] = useState<ContentSprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = useState(false);

  // Local state
  const [selectedPools, setSelectedPools] = useState<number[]>([]);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<CampaignPool | null>(null);
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [localFilters, setLocalFilters] = useState<PoolListFilters>({
    strategy: 'all',
    template_status: 'all',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Filter pools based on search and filter criteria
  const filteredPools = (pools || []).filter(pool => {
    const matchesSearch = pool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         pool.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ search: query });
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: PoolListFilters) => {
    // Convert PoolListFilters to PoolFilters for the hook
    const convertedFilters: Partial<PoolFilters> = {};
    
    if (newFilters.strategy !== 'all') {
      convertedFilters.strategy = newFilters.strategy;
    }
    
    if (newFilters.template_status !== 'all') {
      convertedFilters.template_status = newFilters.template_status;
    }
    
    convertedFilters.sort_by = newFilters.sort_by;
    convertedFilters.sort_order = newFilters.sort_order;
    
    setFilters(convertedFilters);
  };

  // Handle select changes with proper type casting
  const handleStrategyChange = (value: string) => {
    const strategy = value as PoolListFilters['strategy'];
    handleFilterChange({ ...localFilters, strategy });
  };

  const handleTemplateStatusChange = (value: string) => {
    const template_status = value as PoolListFilters['template_status'];
    handleFilterChange({ ...localFilters, template_status });
  };

  const handleSortByChange = (value: string) => {
    const sort_by = value as PoolListFilters['sort_by'];
    handleFilterChange({ ...localFilters, sort_by });
  };

  // Handle pool selection
  const handlePoolSelect = (poolId: number, selected: boolean) => {
    if (selected) {
      setSelectedPools(prev => [...prev, poolId]);
    } else {
      setSelectedPools(prev => prev.filter(id => id !== poolId));
    }
  };

  // Handle select all
  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedPools((pools || []).map(pool => pool.id));
    } else {
      setSelectedPools([]);
    }
  };

  // Load available sprints
  const loadAvailableSprints = async () => {
    try {
      setSprintsLoading(true);
      const result = await apiClient.getSprints({ limit: 100 });
      
      if (result.success) {
        const sprints = result.data.sprints.map((sprint: any) => ({
          id: sprint.id,
          name: sprint.name,
          type: sprint.sprint_type,
          duration_hours: sprint.calculated_duration_hours || 24,
          content_count: sprint.content_count || 0,
          created_at: new Date(sprint.created_at)
        }));
        setAvailableSprints(sprints);
      }
    } catch (error) {
      console.error('Error loading sprints:', error);
    } finally {
      setSprintsLoading(false);
    }
  };

  // Load sprints on component mount
  React.useEffect(() => {
    loadAvailableSprints();
  }, []);

  // Pool actions
  const handleCreatePool = () => {
    setShowCreateWizard(true);
  };

  const handleViewPool = (pool: CampaignPool) => {
    setSelectedPool(pool);
    setShowDetailsModal(true);
  };

  const handleAssignPool = (pool: CampaignPool) => {
    setSelectedPool(pool);
    setShowAssignmentModal(true);
  };

  const handleDuplicatePool = async (pool: CampaignPool) => {
    const newName = `${pool.name} (Copy)`;
    try {
      await duplicatePool(pool.id, newName);
    } catch (error) {
      console.error('Error duplicating pool:', error);
    }
  };

  const handleDeletePool = async (pool: CampaignPool) => {
    if (window.confirm(`Are you sure you want to delete "${pool.name}"?`)) {
      try {
        await deletePool(pool.id);
      } catch (error) {
        console.error('Error deleting pool:', error);
      }
    }
  };

  // Get compatibility status color
  const getCompatibilityColor = (pool: CampaignPool) => {
    // This would be based on real compatibility data
    // For now, return based on sprint count
    if (pool.sprint_ids.length <= 2) return 'text-green-600';
    if (pool.sprint_ids.length <= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get strategy badge color
  const getStrategyBadgeColor = (strategy: string) => {
    switch (strategy) {
      case 'random': return 'bg-blue-100 text-blue-800';
      case 'balanced': return 'bg-green-100 text-green-800';
      case 'manual': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && (!pools || pools.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className={`campaign-pools-page ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Pools</h1>
            <p className="text-gray-600 mt-1">
              Manage collections of compatible content sprints for automated assignment to accounts
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadPools()}
              disabled={loading}
              className="btn-ghost"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={handleCreatePool}
              disabled={creating}
              className="btn-primary"
            >
              <Plus className="h-4 w-4" />
              Create Pool
            </button>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-800">{error}</p>
            <button onClick={clearError} className="text-red-600 hover:text-red-800">
              ×
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search pools by name or description..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 w-full form-input"
            />
          </div>

          {/* Strategy Filter */}
          <select
            value={localFilters.strategy}
            onChange={(e) => handleStrategyChange(e.target.value)}
            className="form-select"
          >
            <option value="all">All Strategies</option>
            <option value="random">Random</option>
            <option value="balanced">Balanced</option>
            <option value="manual">Manual</option>
          </select>

          {/* Template Filter */}
          <select
            value={localFilters.template_status}
            onChange={(e) => handleTemplateStatusChange(e.target.value)}
            className="form-select"
          >
            <option value="all">All Types</option>
            <option value="pools">Pools Only</option>
            <option value="templates">Templates Only</option>
          </select>

          {/* Sort */}
          <select
            value={localFilters.sort_by}
            onChange={(e) => handleSortByChange(e.target.value)}
            className="form-select"
          >
            <option value="created_at">Created Date</option>
            <option value="name">Name</option>
            <option value="usage_count">Usage Count</option>
          </select>

          <Filter className="h-4 w-4 text-gray-400" />
        </div>

        {/* Results summary */}
        <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
          <span>{totalCount} pools found</span>
          {selectedPools.length > 0 && (
            <span>{selectedPools.length} selected</span>
          )}
        </div>
      </div>

      {/* Pool List */}
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Table Header */}
        <div className="border-b px-6 py-3">
          <div className="flex items-center space-x-4">
            <input
              type="checkbox"
              checked={selectedPools.length === (pools || []).length && (pools || []).length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All ({(pools || []).length})
            </span>
          </div>
        </div>

        {/* Pool Cards/Rows */}
        <div className="divide-y">
          {filteredPools.map((pool) => (
            <div key={pool.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedPools.includes(pool.id)}
                  onChange={(e) => handlePoolSelect(pool.id, e.target.checked)}
                  className="rounded border-gray-300"
                />

                {/* Pool Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {pool.name}
                    </h3>
                  </div>
                  
                  {pool.description && (
                    <p className="text-gray-600 mt-1">{pool.description}</p>
                  )}

                  <div className="text-sm text-gray-500 space-y-1">
                    <div>Created: {new Date(pool.created_at).toLocaleDateString()}</div>
                    <div>Duration: {Math.round(pool.total_duration_hours / 24)} days</div>
                  </div>
                </div>

                {/* Pool Status/Template Badge */}
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800">
                    Ready
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleViewPool(pool)}
                    className="btn-ghost p-2"
                    title="View Details"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleAssignPool(pool)}
                    className="btn-ghost p-2"
                    title="Assign to Accounts"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDuplicatePool(pool)}
                    className="btn-ghost p-2"
                    title="Duplicate Pool"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePool(pool)}
                    className="btn-ghost p-2 text-red-600 hover:text-red-800"
                    title="Delete Pool"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPools.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <BarChart3 className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No pools found' : 'No campaign pools yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery 
                ? 'Try adjusting your search criteria or filters'
                : 'Create your first campaign pool to start organizing content sprints for account assignment'
              }
            </p>
            <button onClick={handleCreatePool} className="btn-primary">
              <Plus className="h-4 w-4" />
              Create Your First Pool
            </button>
          </div>
        )}
      </div>

      {/* Simple Pool Creation Modal */}
      {showCreateWizard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Create Campaign Pool</h2>
              <button
                onClick={() => setShowCreateWizard(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Pool creation wizard will be implemented in subsequent tasks
              </p>
              <div className="text-sm text-gray-500 mb-4">
                Available sprints: {availableSprints.length} loaded
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowCreateWizard(false)}
                  className="btn-ghost"
                >
                  Close
                </button>
                <button
                  onClick={() => setShowCreateWizard(false)}
                  className="btn-primary"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignPoolsPage; 