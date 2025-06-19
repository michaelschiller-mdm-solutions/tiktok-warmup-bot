import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  Download,
  Settings,
  Trash2,
  Copy,
  Play
} from 'lucide-react';
import { CampaignPoolsPageProps, CampaignPool, PoolListFilters } from '../../types/campaignPools';
import { useCampaignPools } from '../../hooks/useCampaignPools';
import LoadingSpinner from '../LoadingSpinner';

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

  // Local state
  const [selectedPools, setSelectedPools] = useState<number[]>([]);
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<CampaignPool | null>(null);
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [localFilters, setLocalFilters] = useState<PoolListFilters>({
    search: '',
    strategy: 'all',
    template_status: 'all',
    template_category: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setFilters({ search: query });
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof PoolListFilters, value: string) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    
    // Update global filters
    const globalFilters: any = { search: searchQuery };
    if (newFilters.strategy !== 'all') globalFilters.strategy = newFilters.strategy;
    if (newFilters.template_status === 'templates') globalFilters.is_template = true;
    if (newFilters.template_status === 'pools') globalFilters.is_template = false;
    if (newFilters.template_category) globalFilters.template_category = newFilters.template_category;
    
    setFilters(globalFilters);
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
      setSelectedPools(pools.map(pool => pool.id));
    } else {
      setSelectedPools([]);
    }
  };

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

  if (loading && pools.length === 0) {
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
              Manage and assign content sprint pools to Instagram accounts
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
            onChange={(e) => handleFilterChange('strategy', e.target.value)}
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
            onChange={(e) => handleFilterChange('template_status', e.target.value)}
            className="form-select"
          >
            <option value="all">All Types</option>
            <option value="pools">Pools Only</option>
            <option value="templates">Templates Only</option>
          </select>

          {/* Sort */}
          <select
            value={localFilters.sort_by}
            onChange={(e) => handleFilterChange('sort_by', e.target.value)}
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
              checked={selectedPools.length === pools.length && pools.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-gray-700">
              Select All ({pools.length})
            </span>
          </div>
        </div>

        {/* Pool Cards/Rows */}
        <div className="divide-y">
          {pools.map((pool) => (
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
                      {pool.is_template && (
                        <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                          Template
                        </span>
                      )}
                    </h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStrategyBadgeColor(pool.assignment_strategy)}`}>
                      {pool.assignment_strategy}
                    </span>
                  </div>
                  
                  {pool.description && (
                    <p className="text-gray-600 mt-1">{pool.description}</p>
                  )}

                  <div className="flex items-center space-x-6 mt-3 text-sm text-gray-500">
                    <span>{pool.sprint_ids.length} sprints</span>
                    <span>{pool.total_duration_hours}h duration</span>
                    <span>{pool.compatible_accounts} compatible accounts</span>
                    <span>Used {pool.usage_count} times</span>
                    {pool.last_assigned && (
                      <span>Last: {new Date(pool.last_assigned).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Compatibility Status */}
                <div className={`text-center ${getCompatibilityColor(pool)}`}>
                  <div className="text-lg font-bold">●</div>
                  <div className="text-xs">Compatible</div>
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
        {pools.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Plus className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaign pools found</h3>
            <p className="text-gray-600 mb-6">
              Get started by creating your first campaign pool
            </p>
            <button onClick={handleCreatePool} className="btn-primary">
              <Plus className="h-4 w-4" />
              Create Your First Pool
            </button>
          </div>
        )}
      </div>

      {/* TODO: Add modals */}
      {/* 
        - PoolCreationWizard (showCreateWizard)
        - PoolDetailsModal (showDetailsModal, selectedPool)
        - PoolAssignmentModal (showAssignmentModal, selectedPool)
      */}
    </div>
  );
};

export default CampaignPoolsPage; 