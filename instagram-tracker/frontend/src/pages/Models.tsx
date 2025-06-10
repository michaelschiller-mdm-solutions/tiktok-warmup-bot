import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Model } from '../types/models';
import { apiClient } from '../services/api';
import ModelGrid from '../components/ModelGrid';
import LoadingSpinner from '../components/LoadingSpinner';
import ModelWizard from '../components/ModelWizard';

const Models: React.FC = () => {
  const { modelId } = useParams();
  const navigate = useNavigate();
  
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  // Load models data
  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getModels();
      setModels(data);
    } catch (err: any) {
      console.error('Failed to load models:', err);
      setError(err.message || 'Failed to load models');
      toast.error('Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModel = () => {
    setIsWizardOpen(true);
  };

  const handleEditModel = (model: Model) => {
    // TODO: Implement in Task 1-5 (Model Settings Panel)
    toast(`Edit model "${model.name}" - coming soon!`);
  };

  const handleDeleteModel = async (model: Model) => {
    if (!window.confirm(`Are you sure you want to delete "${model.name}"? This will also delete all associated accounts.`)) {
      return;
    }

    try {
      await apiClient.deleteModel(model.id);
      toast.success(`Model "${model.name}" deleted successfully`);
      loadModels(); // Reload the list
    } catch (err: any) {
      console.error('Failed to delete model:', err);
      toast.error(err.message || 'Failed to delete model');
    }
  };

  // Filter models based on search and status
  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (model.description && model.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || model.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate summary statistics
  const stats = {
    total: models.length,
    active: models.filter(m => m.status === 'active').length,
    totalAccounts: models.reduce((sum, m) => sum + (m.account_count || 0), 0),
    activeAccounts: models.reduce((sum, m) => sum + (m.active_accounts || 0), 0),
  };

  if (loading) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" text="Loading models..." className="min-h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load models</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={loadModels}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Models & Campaigns</h1>
            <p className="text-gray-600 mt-1">Manage your Instagram automation campaigns</p>
          </div>
          <button 
            onClick={handleCreateModel}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Model
          </button>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-500">Total Models</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <div className="text-sm text-gray-500">Active Models</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.totalAccounts}</div>
            <div className="text-sm text-gray-500">Total Accounts</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.activeAccounts}</div>
            <div className="text-sm text-gray-500">Active Accounts</div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search models..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input pl-10 w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select pl-10 pr-8"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Export Button */}
                     <button 
             className="btn-secondary flex items-center gap-2"
             onClick={() => toast('Export functionality coming soon!')}
           >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        {/* Results Count */}
        <div className="mt-4 text-sm text-gray-500">
          Showing {filteredModels.length} of {models.length} models
        </div>
      </div>

      {/* Models Grid */}
      <ModelGrid
        models={filteredModels}
        onEdit={handleEditModel}
        onDelete={handleDeleteModel}
      />

      {/* Model Creation Wizard */}
      <ModelWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={loadModels}
      />
    </div>
  );
};

export default Models; 