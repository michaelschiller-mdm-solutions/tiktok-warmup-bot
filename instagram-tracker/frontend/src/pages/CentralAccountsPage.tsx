import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Users, 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Trash2, 
  CheckSquare,
  Square,
  AlertTriangle,
  Settings,
  Eye,
  UserPlus,
  AlertCircle,
  UserCheck,
  Plus,
  Users2,
  BarChart3,
  TrendingUp,
  Zap,
  CheckCircle,
  Activity,
  Target,
  X,
  Upload,
  FileText,
  Smartphone
} from 'lucide-react';

import { DataGrid } from '../components/DataGrid';
import { DataGridColumn } from '../types/dataGrid';
import { Account } from '../types/accounts';
import { Model } from '../types/models';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import AccountImportModal from '../components/ModelAccounts/AccountImportModal';
import ContainerCreationModal from '../components/ContainerCreationModal';
import AccountAssignmentModal from '../components/AccountAssignmentModal';
import { apiClient } from '../services/api';

interface AccountWithModel extends Account {
  model_name: string;
  model_status: string;
}

interface AccountStatistics {
  total_accounts: number;
  assigned_accounts: number;
  unassigned_accounts: number;
  total_models: number;
  by_model: { model_name: string; count: number; model_id: number }[];
  by_lifecycle_state: { state: string; count: number }[];
  by_status: { status: string; count: number }[];
}

interface ModelAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAccounts: Set<number>;
  onAssign: (modelId: number) => void;
  models: Model[];
  isAssigning: boolean;
}

const ModelAssignmentModal: React.FC<ModelAssignmentModalProps> = ({
  isOpen,
  onClose,
  selectedAccounts,
  onAssign,
  models,
  isAssigning
}) => {
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);

  const handleAssign = () => {
    if (selectedModelId) {
      onAssign(selectedModelId);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Assign Accounts to Model">
      <div className="space-y-8">
        <div>
          <p className="text-gray-600 mb-6">
            Assign {selectedAccounts.size} selected account(s) to a model. 
            This will trigger content assignment and warmup pipeline initialization.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">What happens when accounts are assigned:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Content will be automatically assigned to warmup phases</li>
                  <li>Proxy assignment will be attempted (if available)</li>
                  <li>Accounts will be ready for warmup pipeline</li>
                  <li>Manual setup phase will become available for each account</li>
                </ul>
              </div>
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-3">
            Select Model
          </label>
          <select
            value={selectedModelId || ''}
            onChange={(e) => setSelectedModelId(e.target.value ? parseInt(e.target.value) : null)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isAssigning}
          >
            <option value="">Choose a model...</option>
            {models.map(model => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.account_count || 0} accounts)
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-4 pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 font-medium"
            disabled={isAssigning}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedModelId || isAssigning}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
          >
            {isAssigning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserCheck className="w-4 h-4" />
                Assign to Model
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const CentralAccountsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Data state
  const [accounts, setAccounts] = useState<AccountWithModel[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [statistics, setStatistics] = useState<AccountStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  
  // Selection and bulk operations
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Model assignment
  const [showModelAssignmentModal, setShowModelAssignmentModal] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Import
  const [showAccountImportModal, setShowAccountImportModal] = useState(false);
  const [selectedImportModelId, setSelectedImportModelId] = useState<number | null>(null);
  const [showModelSelectionModal, setShowModelSelectionModal] = useState(false);

  // Container Creation
  const [showContainerCreationModal, setShowContainerCreationModal] = useState(false);

  // Account Assignment to iPhone Container
  const [showAccountAssignmentModal, setShowAccountAssignmentModal] = useState(false);
  const [selectedAccountForAssignment, setSelectedAccountForAssignment] = useState<{ id: number; username: string } | null>(null);

  // Import handlers
  const handleImportClick = () => {
    if (models.length === 0) {
      toast.error('Please create a model first before importing accounts');
      return;
    }
    setShowModelSelectionModal(true);
  };

  const handleModelSelectionForImport = (modelId: number) => {
    setSelectedImportModelId(modelId);
    setShowModelSelectionModal(false);
    setShowAccountImportModal(true);
  };

  const handleImportComplete = () => {
    loadAccountsAndModels();
    setSelectedImportModelId(null);
  };

  // Load data on component mount
  useEffect(() => {
    loadAccountsAndModels();
    loadStatistics();
  }, []);

  const loadAccountsAndModels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load both accounts and models in parallel
      const [accountsResponse, modelsData] = await Promise.all([
        fetch('/api/accounts?limit=10000'),
        apiClient.getModels()
      ]);
      
      if (!accountsResponse.ok) {
        throw new Error('Failed to load accounts');
      }
      
      const accountsData = await accountsResponse.json();
      const accountsArray = accountsData.data?.accounts || accountsData.accounts || [];
      
      setAccounts(accountsArray);
      setModels(modelsData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch('/api/accounts/statistics');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Transform the new statistics format to match the existing interface
          const transformedStats = {
            total_accounts: data.data.overview.total_accounts,
            assigned_accounts: data.data.overview.assigned_accounts,
            unassigned_accounts: data.data.overview.unassigned_accounts,
            total_models: data.data.overview.total_models,
            by_model: data.data.breakdown.by_model.map((item: any) => ({
              model_name: item.model_name,
              count: item.count,
              model_id: item.model_id || 0
            })),
            by_lifecycle_state: data.data.breakdown.by_lifecycle.map((item: any) => ({
              state: item.state,
              count: item.count
            })),
            by_status: [
              { status: 'active', count: data.data.account_status.active },
              { status: 'banned', count: data.data.account_status.banned },
              { status: 'suspended', count: data.data.account_status.suspended },
              { status: 'needs_review', count: data.data.account_status.needs_review }
            ]
          };
          setStatistics(transformedStats);
        }
      }
    } catch (err) {
      console.error('Failed to load statistics:', err);
    }
  };

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const matchesSearch = !searchTerm || 
        account.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        account.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (account.model_name && account.model_name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesModel = !modelFilter || account.model_id?.toString() === modelFilter;
      const matchesLifecycle = !lifecycleFilter || account.lifecycle_state === lifecycleFilter;
      const matchesStatus = !statusFilter || account.status === statusFilter;
      const matchesUnassigned = !showUnassignedOnly || !account.model_id;
      
      return matchesSearch && matchesModel && matchesLifecycle && matchesStatus && matchesUnassigned;
    });
  }, [accounts, searchTerm, modelFilter, lifecycleFilter, statusFilter, showUnassignedOnly]);

  // Selection handlers
  const toggleSelection = (accountId: number) => {
    const newSelection = new Set(selectedAccounts);
    if (newSelection.has(accountId)) {
      newSelection.delete(accountId);
    } else {
      newSelection.add(accountId);
    }
    setSelectedAccounts(newSelection);
  };

  const selectAll = () => {
    setSelectedAccounts(new Set(filteredAccounts.map(account => account.id)));
  };

  const clearSelection = () => {
    setSelectedAccounts(new Set());
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      clearSelection();
    }
  };

  // Model assignment handler
  const handleModelAssignment = async (modelId: number) => {
    if (selectedAccounts.size === 0) return;
    
    setIsAssigning(true);
    try {
      const accountIds = Array.from(selectedAccounts);
      
      const response = await fetch('/api/accounts/assign-to-model', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_ids: accountIds,
          model_id: modelId
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to assign accounts to model');
      }

      toast.success(`Successfully assigned ${result.data.successful} account(s) to model`);
      
      if (result.data.failed > 0) {
        toast.error(`Failed to assign ${result.data.failed} account(s)`);
      }
      
      // Refresh data
      await loadAccountsAndModels();
      await loadStatistics();
      clearSelection();
      setSelectionMode(false);
      setShowModelAssignmentModal(false);
      
    } catch (error: any) {
      console.error('Model assignment failed:', error);
      toast.error(error.message || 'Failed to assign accounts to model');
    } finally {
      setIsAssigning(false);
    }
  };

  // Batch delete handler
  const handleBatchDelete = async () => {
    if (selectedAccounts.size === 0) return;
    
    setIsDeleting(true);
    try {
      const accountIds = Array.from(selectedAccounts);
      
      const response = await fetch('/api/accounts/batch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ account_ids: accountIds }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete accounts');
      }

      toast.success(`Successfully deleted ${result.data.successful} account(s)`);
      
      if (result.data.failed > 0) {
        toast.error(`Failed to delete ${result.data.failed} account(s)`);
      }
      
      // Refresh data
      await loadAccountsAndModels();
      await loadStatistics();
      clearSelection();
      setSelectionMode(false);
      
    } catch (error: any) {
      console.error('Batch delete failed:', error);
      toast.error(error.message || 'Failed to delete accounts');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  // Export handler
  const handleExport = () => {
    const csvContent = [
      // Header
      ['Username', 'Email', 'Model', 'Lifecycle State', 'Status', 'Created At'].join(','),
      // Data
      ...filteredAccounts.map(account => [
        account.username,
        account.email || '',
        account.model_name || 'Unassigned',
        account.lifecycle_state,
        account.status,
        new Date(account.created_at).toISOString()
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `accounts-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Accounts exported successfully');
  };

  // Navigate to account details
  const handleAccountClick = (account: AccountWithModel) => {
    if (account.model_id) {
      navigate(`/models/${account.model_id}?tab=accounts&account=${account.id}`);
    } else {
      toast('Account is not assigned to a model yet. Assign it to a model to manage it.', {
        icon: 'ℹ️',
        duration: 3000
      });
    }
  };

  const handleAssignToIPhone = (account: AccountWithModel) => {
    setSelectedAccountForAssignment({
      id: account.id,
      username: account.username
    });
    setShowAccountAssignmentModal(true);
  };

  const handleAssignmentComplete = () => {
    // Refresh the accounts data to show updated assignment status
    loadAccountsAndModels();
    setSelectedAccountForAssignment(null);
  };

  // Get available options for filters
  const uniqueLifecycleStates = Array.from(new Set(accounts.map(a => a.lifecycle_state))).filter(Boolean);
  const uniqueStatuses = Array.from(new Set(accounts.map(a => a.status))).filter(Boolean);

  // Define columns for the data grid
  const columns = useMemo((): DataGridColumn<AccountWithModel>[] => [
    {
      id: 'selection',
      field: 'id',
      header: '',
      width: selectionMode ? 60 : 0,
      minWidth: selectionMode ? 60 : 0,
      resizable: false,
      sortable: false,
      filterable: false,
      type: 'text',
      align: 'center',
      visible: selectionMode,
      order: 0,
      frozen: false,
      editable: false,
      required: false,
      headerRender: selectionMode ? () => (
        <div className="flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              selectedAccounts.size === filteredAccounts.length ? clearSelection() : selectAll();
            }}
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
              selectedAccounts.size === filteredAccounts.length && filteredAccounts.length > 0
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                : selectedAccounts.size > 0
                ? 'bg-blue-100 border-blue-400 text-blue-600'
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
            title={selectedAccounts.size === filteredAccounts.length ? 'Deselect All' : 'Select All'}
          >
            {selectedAccounts.size === filteredAccounts.length && filteredAccounts.length > 0 ? (
              <CheckSquare className="w-4 h-4" />
            ) : selectedAccounts.size > 0 ? (
              <div className="w-2 h-2 bg-blue-600 rounded-sm" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        </div>
      ) : undefined,
      render: (value, row) => (
        <div className="flex items-center justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleSelection(row.id);
            }}
            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 transform ${
              selectedAccounts.has(row.id)
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-110'
                : 'bg-white border-gray-300 hover:border-blue-400 hover:shadow-md'
            }`}
            title={selectedAccounts.has(row.id) ? 'Deselect account' : 'Select account'}
          >
            {selectedAccounts.has(row.id) ? (
              <CheckSquare className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        </div>
      )
    },
    {
      id: 'username',
      field: 'username',
      header: 'Username',
      width: 150,
      minWidth: 120,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'text',
      align: 'left',
      visible: true,
      order: 1,
      frozen: false,
      editable: false,
      required: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            row.status === 'active' ? 'bg-green-500' : 
            row.status === 'banned' ? 'bg-red-500' :
            row.status === 'suspended' ? 'bg-yellow-500' :
            'bg-gray-500'
          }`} title={row.status} />
          <span className="font-medium cursor-pointer hover:text-blue-600" 
                onClick={() => handleAccountClick(row)}>
            {value}
          </span>
        </div>
      )
    },
    {
      id: 'model_name',
      field: 'model_name',
      header: 'Model',
      width: 180,
      minWidth: 150,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'text',
      align: 'left',
      visible: true,
      order: 2,
      frozen: false,
      editable: false,
      required: false,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {value ? (
            <>
              <Users2 className="w-4 h-4 text-blue-500" />
              <span className="text-blue-600 font-medium">{value}</span>
            </>
          ) : (
            <span className="text-gray-400 italic">Unassigned</span>
          )}
        </div>
      )
    },
    {
      id: 'email',
      field: 'email',
      header: 'Email',
      width: 200,
      minWidth: 180,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'text',
      align: 'left',
      visible: true,
      order: 3,
      frozen: false,
      editable: false,
      required: false,
      render: (value) => (
        <span className="text-sm text-gray-600">{value || '-'}</span>
      )
    },
    {
      id: 'lifecycle_state',
      field: 'lifecycle_state',
      header: 'Lifecycle',
      width: 120,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'text',
      align: 'center',
      visible: true,
      order: 4,
      frozen: false,
      editable: false,
      required: false,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'active' ? 'bg-green-100 text-green-800' :
          value === 'warmup' ? 'bg-yellow-100 text-yellow-800' :
          value === 'imported' ? 'bg-blue-100 text-blue-800' :
          value === 'ready' ? 'bg-purple-100 text-purple-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      id: 'status',
      field: 'status',
      header: 'Status',
      width: 100,
      minWidth: 80,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'text',
      align: 'center',
      visible: true,
      order: 5,
      frozen: false,
      editable: false,
      required: false,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'active' ? 'bg-green-100 text-green-800' :
          value === 'banned' ? 'bg-red-100 text-red-800' :
          value === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value}
        </span>
      )
    },
    {
      id: 'created_at',
      field: 'created_at',
      header: 'Created',
      width: 120,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filterable: false,
      type: 'date',
      align: 'center',
      visible: true,
      order: 6,
      frozen: false,
      editable: false,
      required: false,
      render: (value) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    },
    {
      id: 'actions',
      field: 'id',
      header: 'Actions',
      width: 120,
      minWidth: 100,
      resizable: false,
      sortable: false,
      filterable: false,
      type: 'text',
      align: 'center',
      visible: true,
      order: 7,
      frozen: false,
      editable: false,
      required: false,
      render: (value, row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAssignToIPhone(row);
            }}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Assign to iPhone Container"
          >
            <Smartphone className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAccountClick(row);
            }}
            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ], [selectionMode, selectedAccounts, handleAccountClick, handleAssignToIPhone, toggleSelection]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      {/* Enhanced Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-2xl shadow-2xl">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative px-8 py-12">
          <div className="flex justify-between items-start">
            <div className="text-white">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Users className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight">Account Hub</h1>
                  <p className="text-blue-100 text-lg font-medium">Central command for all Instagram accounts</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Live Dashboard</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                  <Target className="w-4 h-4" />
                  <span>Real-time Analytics</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowContainerCreationModal(true)}
                className="bg-purple-500 backdrop-blur-sm border border-purple-400/30 text-white px-6 py-3 rounded-xl hover:bg-purple-600 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg"
              >
                <Smartphone className="w-5 h-5" />
                Create Containers
              </button>
              <button
                onClick={handleImportClick}
                className="bg-green-500 backdrop-blur-sm border border-green-400/30 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg"
              >
                <Upload className="w-5 h-5" />
                Import Accounts
              </button>
              <button
                onClick={handleExport}
                className="bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-xl hover:bg-white/30 transition-all duration-200 flex items-center gap-2 font-medium"
              >
                <Download className="w-5 h-5" />
                Export Data
              </button>
              <button
                onClick={loadAccountsAndModels}
                className="bg-white text-blue-600 px-6 py-3 rounded-xl hover:bg-blue-50 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-xs font-medium text-blue-600">TOTAL</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Total Accounts</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.total_accounts?.toLocaleString() || '0'}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">System-wide</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-green-600 font-medium">Live</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-green-600">ASSIGNED</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Assigned to Models</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.assigned_accounts?.toLocaleString() || '0'}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Ready for workflow</span>
                  <span className="text-xs font-medium text-green-600">
                    {statistics.total_accounts > 0 ? Math.round((statistics.assigned_accounts / statistics.total_accounts) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                    <span className="text-xs font-medium text-orange-600">PENDING</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Unassigned</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.unassigned_accounts?.toLocaleString() || '0'}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Need assignment</span>
                  {statistics.unassigned_accounts > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Action needed
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Users2 className="w-6 h-6 text-white" />
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-xs font-medium text-purple-600">MODELS</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-1">Active Models</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.total_models?.toLocaleString() || '0'}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Available targets</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                    <span className="text-xs text-purple-600 font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Filters and Actions */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
                <p className="text-sm text-gray-600">Refine your account view</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{filteredAccounts.length} results</span>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
              <span>{accounts.length} total</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            {/* Enhanced Search */}
            <div className="lg:col-span-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Search Accounts
              </label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by username, email, or model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-full transition-all duration-200 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Model Filter */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Model
              </label>
              <select
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="">All Models</option>
                {models.map(model => (
                  <option key={model.id} value={model.id.toString()}>
                    {model.name} ({model.account_count || 0})
                  </option>
                ))}
              </select>
            </div>

            {/* Lifecycle Filter */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Lifecycle
              </label>
              <select
                value={lifecycleFilter}
                onChange={(e) => setLifecycleFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="">All States</option>
                {uniqueLifecycleStates.map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <div className="lg:col-span-2 flex gap-2">
              <div className="flex-1">
                <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnassignedOnly}
                    onChange={(e) => setShowUnassignedOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Unassigned only</span>
                </label>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setModelFilter('');
                  setLifecycleFilter('');
                  setStatusFilter('');
                  setShowUnassignedOnly(false);
                }}
                className="px-4 py-3 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-200 flex items-center gap-2"
                title="Clear all filters"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Bulk Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex items-center gap-5">
              <button
                onClick={toggleSelectionMode}
                className={`flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  selectionMode 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                }`}
              >
                <CheckSquare className="w-5 h-5" />
                {selectionMode ? 'Exit Selection Mode' : 'Enable Selection Mode'}
              </button>

              {selectionMode && (
                <div className="flex items-center gap-5">
                  <button 
                    onClick={selectAll} 
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium hover:underline transition-all duration-200"
                  >
                    Select All ({filteredAccounts.length})
                  </button>
                  <button 
                    onClick={clearSelection} 
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium hover:underline transition-all duration-200"
                  >
                    Clear Selection
                  </button>
                  {selectedAccounts.size > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-lg">
                      <CheckSquare className="w-4 h-4" />
                      <span className="text-sm font-bold">
                        {selectedAccounts.size} of {filteredAccounts.length} selected
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectionMode && selectedAccounts.size > 0 && (
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowModelAssignmentModal(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 text-sm font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                  disabled={isAssigning}
                >
                  <UserPlus className="w-5 h-5" />
                  Assign to Model
                  {isAssigning && <RefreshCw className="w-4 h-4 animate-spin ml-1" />}
                </button>
                <button
                  onClick={() => setShowDeleteConfirmation(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 text-sm font-semibold shadow-lg transition-all duration-200 transform hover:scale-105"
                  disabled={isDeleting}
                >
                  <Trash2 className="w-5 h-5" />
                  Delete Selected
                  {isDeleting && <RefreshCw className="w-4 h-4 animate-spin ml-1" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Accounts Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Account Directory</h3>
                <p className="text-sm text-gray-600">
                  {filteredAccounts.length} of {accounts.length} accounts shown
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {selectionMode && selectedAccounts.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-full">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-blue-700">
                    {selectedAccounts.size} selected
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Live data</span>
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-[600px]">
          {error ? (
            <div className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-red-50 rounded-xl mb-6">
                  <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Connection Error</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button 
                  onClick={loadAccountsAndModels}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium"
                >
                  <RefreshCw className="w-4 h-4 inline mr-2" />
                  Retry Connection
                </button>
              </div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="p-4 bg-gray-50 rounded-xl mb-6">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {accounts.length === 0 ? 'No Accounts Yet' : 'No Matches Found'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {accounts.length === 0 
                    ? "Ready to get started? Import your first batch of accounts to begin managing your Instagram automation." 
                    : "No accounts match your current search and filter criteria. Try adjusting your parameters or clearing filters."
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {accounts.length === 0 ? (
                    <button 
                      onClick={() => navigate('/models')}
                      className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all duration-200 font-medium"
                    >
                      <Plus className="w-4 h-4 inline mr-2" />
                      Import Accounts
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setSearchTerm('');
                        setModelFilter('');
                        setLifecycleFilter('');
                        setStatusFilter('');
                        setShowUnassignedOnly(false);
                      }}
                      className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all duration-200 font-medium"
                    >
                      <RefreshCw className="w-4 h-4 inline mr-2" />
                      Clear All Filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <DataGrid
              data={filteredAccounts}
              columns={columns}
              onRowClick={(rowIndex: number, row: AccountWithModel) => handleAccountClick(row)}
              loading={loading}
              height={600}
              className="border-0"
            />
          )}
        </div>
      </div>

      {/* Model Assignment Modal */}
      <ModelAssignmentModal
        isOpen={showModelAssignmentModal}
        onClose={() => setShowModelAssignmentModal(false)}
        selectedAccounts={selectedAccounts}
        onAssign={handleModelAssignment}
        models={models}
        isAssigning={isAssigning}
      />

      {/* Delete Confirmation Modal */}
      <Modal 
        isOpen={showDeleteConfirmation} 
        onClose={() => setShowDeleteConfirmation(false)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to delete {selectedAccounts.size} selected account(s)? 
            This action cannot be undone and will remove all associated data including:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Account credentials and settings</li>
            <li>Warmup progress and phase data</li>
            <li>Analytics and performance history</li>
            <li>Follow/unfollow tracking</li>
          </ul>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowDeleteConfirmation(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Accounts
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Model Selection Modal for Import */}
      <Modal 
        isOpen={showModelSelectionModal} 
        onClose={() => setShowModelSelectionModal(false)}
        title="Select Model for Import"
      >
        <div className="space-y-8">
          <div className="flex items-start gap-4 p-5 bg-blue-50 border border-blue-200 rounded-xl">
            <Upload className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Account Import</p>
              <p>Choose which model to assign the imported accounts to. Accounts will be automatically assigned content and prepared for the warmup pipeline.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Target Model
            </label>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelectionForImport(model.id)}
                  className="w-full text-left p-5 border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 group hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                        {model.name}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {model.description || 'No description'}
                      </p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                        <span className="px-2 py-1 bg-gray-100 rounded-full">Status: {model.status}</span>
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full">{model.account_count || 0} accounts</span>
                      </div>
                    </div>
                    <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setShowModelSelectionModal(false)}
              className="px-6 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Account Import Modal */}
      {selectedImportModelId && (
        <AccountImportModal
          isOpen={showAccountImportModal}
          onClose={() => {
            setShowAccountImportModal(false);
            setSelectedImportModelId(null);
          }}
          modelId={selectedImportModelId}
          onImportComplete={handleImportComplete}
        />
      )}

      {/* Container Creation Modal */}
      <ContainerCreationModal
        isOpen={showContainerCreationModal}
        onClose={() => setShowContainerCreationModal(false)}
        onComplete={(results) => {
          console.log('Container creation completed:', results);
          toast.success(`Container creation finished! ${results.successful}/${results.total} containers created.`);
        }}
      />

      {/* Account Assignment to iPhone Container Modal */}
      {selectedAccountForAssignment && (
        <AccountAssignmentModal
          isOpen={showAccountAssignmentModal}
          onClose={() => {
            setShowAccountAssignmentModal(false);
            setSelectedAccountForAssignment(null);
          }}
          accountId={selectedAccountForAssignment.id}
          accountUsername={selectedAccountForAssignment.username}
          onAssignmentComplete={handleAssignmentComplete}
        />
      )}
    </div>
  );
};

export default CentralAccountsPage; 