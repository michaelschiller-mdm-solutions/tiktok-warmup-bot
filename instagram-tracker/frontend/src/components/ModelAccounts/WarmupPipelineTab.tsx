import React, { useState, useEffect } from 'react';
import { Activity, Play, Pause, RotateCcw, TrendingUp, Clock, Eye, ChevronRight } from 'lucide-react';
import { DataGrid } from '../DataGrid';
import { DataGridColumn } from '../../types/dataGrid';
import { Account } from '../../types/accounts';
import { useAccountsData } from '../../hooks/useAccountsData';
import LoadingSpinner from '../LoadingSpinner';
import WarmupPhaseTracker from '../AccountLifecycle/WarmupPhaseTracker';

interface WarmupPipelineTabProps {
  modelId: number;
}

const WarmupPipelineTab: React.FC<WarmupPipelineTabProps> = ({ modelId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showPhaseDetails, setShowPhaseDetails] = useState(false);

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
    activeTab: 'warmup'
  });

  // Update filters when search term or status filter changes
  useEffect(() => {
    updateFilters({
      search: searchTerm || undefined,
      status: statusFilter === 'all' ? undefined : [statusFilter]
    });
  }, [searchTerm, statusFilter, updateFilters]);

  // Define columns for warmup accounts
  const columns: DataGridColumn<Account & { warmup_progress?: any; actions?: any }>[] = [
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
      order: 2,
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
      id: 'total_follows',
      field: 'total_follows',
      header: 'Total Follows',
      width: 110,
      minWidth: 90,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'number',
      align: 'right',
      visible: true,
      order: 3,
      frozen: false,
      editable: false,
      required: false,
      formatter: (value) => (value || 0).toLocaleString(),
      render: (value) => (
        <div className="text-right">
          <span className="font-medium text-gray-900">
            {(value || 0).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      id: 'follow_back_rate',
      field: 'follow_back_rate',
      header: 'Follow Back Rate',
      width: 130,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'number',
      align: 'right',
      visible: true,
      order: 4,
      frozen: false,
      editable: false,
      required: false,
      formatter: (value) => `${(value || 0).toFixed(1)}%`,
      render: (value) => (
        <div className="text-right">
          <span className={`font-medium ${
            value >= 15 ? 'text-green-600' : 
            value >= 10 ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {(value || 0).toFixed(1)}%
          </span>
        </div>
      )
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
      id: 'warmup_progress',
      field: 'warmup_progress',
      header: 'Warmup Progress',
      width: 200,
      minWidth: 180,
      resizable: true,
      sortable: false,
      filterable: false,
      type: 'custom',
      align: 'left',
      visible: true,
      order: 6,
      frozen: false,
      editable: false,
      required: false,
      render: (value, row) => {
        // Mock progress data - this would come from the API in real implementation
        const phases = ['pfp', 'bio', 'post', 'highlight', 'story'];
        const completedPhases = Math.floor(Math.random() * phases.length); // Mock data
        const currentPhase = phases[completedPhases] || null;
        
        return (
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {phases.map((phase, index) => (
                <div
                  key={phase}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    index < completedPhases
                      ? 'bg-green-100 text-green-800'
                      : index === completedPhases
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                  title={phase.toUpperCase()}
                >
                  {index < completedPhases ? '✓' : phase.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {completedPhases}/{phases.length}
            </span>
          </div>
        );
      }
    },
    {
      id: 'last_activity',
      field: 'last_activity',
      header: 'Last Activity',
      width: 130,
      minWidth: 110,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'date',
      align: 'center',
      visible: true,
      order: 7,
      frozen: false,
      editable: false,
      required: false,
      render: (value) => {
        if (!value) return <span className="text-gray-400">Never</span>;
        const date = new Date(value);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        if (diffHours < 1) return <span className="text-green-600">Just now</span>;
        if (diffHours < 24) return <span className="text-green-600">{diffHours}h ago</span>;
        if (diffHours < 168) return <span className="text-yellow-600">{Math.floor(diffHours / 24)}d ago</span>;
        return <span className="text-red-600">{date.toLocaleDateString()}</span>;
      }
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
      type: 'custom',
      align: 'center',
      visible: true,
      order: 8,
      frozen: false,
      editable: false,
      required: false,
      render: (value, row) => (
        <button
          onClick={() => {
            setSelectedAccountId(row.id);
            setShowPhaseDetails(true);
          }}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
          title="View phase details"
        >
          <Eye className="h-3 w-3" />
          Details
        </button>
      )
    }
  ];

  if (loading && accounts.length === 0) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" text="Loading warmup accounts..." className="min-h-96" />
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
            <RotateCcw className="h-4 w-4" />
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
          <h3 className="text-lg font-medium text-gray-900">Warmup Pipeline</h3>
          <p className="text-sm text-gray-500">
            {filteredCount} of {totalCount} accounts in warmup process
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshData}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            className="btn-primary flex items-center gap-2"
            onClick={() => {
              // TODO: Implement bulk warmup actions
            }}
          >
            <Play className="h-4 w-4" />
            Start Warmup
          </button>
        </div>
      </div>

      {/* Warmup Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Warmup</p>
              <p className="text-2xl font-bold text-green-600">
                {accounts.filter(a => a.status === 'active').length}
              </p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Follow Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {accounts.length > 0 
                  ? (accounts.reduce((sum, a) => sum + (a.follow_back_rate || 0), 0) / accounts.length).toFixed(1)
                  : '0.0'
                }%
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Follows</p>
              <p className="text-2xl font-bold text-purple-600">
                {accounts.reduce((sum, a) => sum + (a.total_follows || 0), 0).toLocaleString()}
              </p>
            </div>
            <Activity className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Needs Attention</p>
              <p className="text-2xl font-bold text-red-600">
                {accounts.filter(a => a.status === 'banned' || a.status === 'suspended').length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
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

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6">
        {/* Accounts Grid */}
        <div className={`bg-white rounded-lg shadow ${showPhaseDetails ? 'flex-1' : 'w-full'}`}>
          {accounts.length === 0 && !loading ? (
            <div className="p-8 text-center">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounts in Warmup</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter !== 'all' 
                  ? 'No accounts match your current filters.' 
                  : 'No accounts are currently in the warmup process.'
                }
              </p>
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

        {/* Phase Details Panel */}
        {showPhaseDetails && selectedAccountId && (
          <div className="w-96 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Phase Details</h4>
              <button
                onClick={() => {
                  setShowPhaseDetails(false);
                  setSelectedAccountId(null);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1">
              <WarmupPhaseTracker 
                accountId={selectedAccountId} 
                showTitle={false}
                compact={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WarmupPipelineTab; 