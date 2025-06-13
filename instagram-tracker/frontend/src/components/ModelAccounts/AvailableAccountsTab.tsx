import React, { useState, useEffect } from 'react';
import { UserPlus, Import, RefreshCw, Search, Filter } from 'lucide-react';
import { DataGrid } from '../DataGrid';
import { DataGridColumn } from '../../types/dataGrid';
import { Account } from '../../types/accounts';
import { useAccountsData } from '../../hooks/useAccountsData';
import AccountImportModal from './AccountImportModal';
import LoadingSpinner from '../LoadingSpinner';
import StateIndicator from '../AccountLifecycle/StateIndicator';
import StateTransitionControls from '../AccountLifecycle/StateTransitionControls';
import { AccountLifecycleState } from '../../types/lifecycle';

interface AvailableAccountsTabProps {
  modelId: number;
}

const AvailableAccountsTab: React.FC<AvailableAccountsTabProps> = ({ modelId }) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { 
    accounts, 
    loading, 
    error, 
    totalCount, 
    filteredCount, 
    refreshData,
    updateFilters
  } = useAccountsData({
    modelId,
    activeTab: 'available'
  });

  // Update filters when search term or status filter changes
  useEffect(() => {
    updateFilters({
      search: searchTerm || undefined,
      status: statusFilter === 'all' ? undefined : [statusFilter]
    });
  }, [searchTerm, statusFilter, updateFilters]);

  const handleImportComplete = () => {
    refreshData();
  };

  // Define columns for available accounts
  const columns: DataGridColumn<Account>[] = [
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
          <span className="font-medium">{value}</span>
        </div>
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
      type: 'select',
      align: 'center',
      visible: true,
      order: 2,
      frozen: false,
      editable: false,
      required: true,
      options: [
        { value: 'imported', label: 'Imported' },
        { value: 'ready', label: 'Ready' },
        { value: 'warmup', label: 'Warmup' },
        { value: 'active', label: 'Active' },
        { value: 'paused', label: 'Paused' },
        { value: 'cleanup', label: 'Cleanup' },
        { value: 'archived', label: 'Archived' }
      ],
      render: (value, row) => (
        <StateTransitionControls
          accountId={row.id}
          currentState={value as AccountLifecycleState}
          onStateChanged={() => refreshData()}
          size="sm"
        />
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
      type: 'select',
      align: 'center',
      visible: true,
      order: 3,
      frozen: false,
      editable: false,
      required: true,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'banned', label: 'Banned' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'inactive', label: 'Inactive' }
      ],
      render: (value) => {
        const statusColors = {
          active: 'bg-green-100 text-green-800',
          banned: 'bg-red-100 text-red-800',
          suspended: 'bg-yellow-100 text-yellow-800',
          inactive: 'bg-gray-100 text-gray-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[value as keyof typeof statusColors]}`}>
            {value}
          </span>
        );
      }
    },
    {
      id: 'content_type',
      field: 'content_type',
      header: 'Content Type',
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
      render: (value) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {value}
          </span>
        );
      }
    },
    {
      id: 'proxy_status',
      field: 'proxy_status',
      header: 'Proxy',
      width: 100,
      minWidth: 80,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'select',
      align: 'center',
      visible: true,
      order: 5,
      frozen: false,
      editable: false,
      required: false,
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'error', label: 'Error' },
        { value: 'unknown', label: 'Unknown' }
      ],
      render: (value) => {
        const proxyColors = {
          active: 'bg-green-100 text-green-800',
          inactive: 'bg-gray-100 text-gray-800',
          error: 'bg-red-100 text-red-800',
          unknown: 'bg-yellow-100 text-yellow-800'
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${proxyColors[value as keyof typeof proxyColors] || proxyColors.unknown}`}>
            {value || 'unknown'}
          </span>
        );
      }
    },
    {
      id: 'created_at',
      field: 'created_at',
      header: 'Created',
      width: 130,
      minWidth: 110,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'date',
      align: 'center',
      visible: true,
      order: 6,
      frozen: false,
      editable: false,
      required: false,
      render: (value) => {
        if (!value) return <span className="text-gray-400">Unknown</span>;
        const date = new Date(value);
        return (
          <span className="text-sm text-gray-600">
            {date.toLocaleDateString()}
          </span>
        );
      }
    }
  ];

  if (loading && accounts.length === 0) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" text="Loading available accounts..." className="min-h-96" />
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Accounts</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={refreshData}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Available Accounts</h3>
          <p className="text-sm text-gray-500">
            {filteredCount} of {totalCount} accounts available for assignment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshData}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Import className="h-4 w-4" />
            Import Accounts
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="banned">Banned</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Accounts Grid */}
      <div className="flex-1 bg-white rounded-lg shadow">
        {accounts.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <UserPlus className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Accounts</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'No accounts match your current filters.' 
                : 'Import accounts to get started with this model.'
              }
            </p>
            {(!searchTerm && statusFilter === 'all') && (
              <button 
                onClick={() => setIsImportModalOpen(true)}
                className="btn-primary flex items-center gap-2 mx-auto"
              >
                <Import className="h-4 w-4" />
                Import Accounts
              </button>
            )}
          </div>
        ) : (
          <DataGrid
            data={accounts}
            columns={columns}
            loading={loading}
            error={error}
            height={400}
            virtualScrolling={true}
            multiSelect={true}
            rowSelection={true}
            keyboardNavigation={true}
            className="h-full"
          />
        )}
      </div>

      {/* Import Modal */}
      <AccountImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        modelId={modelId}
        onImportComplete={handleImportComplete}
      />
    </div>
  );
};

export default AvailableAccountsTab; 