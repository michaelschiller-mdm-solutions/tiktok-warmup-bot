import React, { useState, useEffect } from 'react';
import { Activity, Play, Pause, RotateCcw, TrendingUp, Clock, Circle, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { DataGrid } from '../DataGrid';
import { DataGridColumn } from '../../types/dataGrid';
import { Account } from '../../types/accounts';
import { useAccountsData } from '../../hooks/useAccountsData';
import LoadingSpinner from '../LoadingSpinner';

interface WarmupPipelineTabProps {
  modelId: number;
}

const WarmupPipelineTab: React.FC<WarmupPipelineTabProps> = ({ modelId }) => {
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
    activeTab: 'warmup'
  });

  // Update filters when search term or status filter changes
  useEffect(() => {
    updateFilters({
      search: searchTerm || undefined,
      lifecycle_state: statusFilter === 'all' ? undefined : [statusFilter]
    });
  }, [searchTerm, statusFilter, updateFilters]);

  // Component to render warmup phase progression
  const renderWarmupPhases = (account: Account) => {
    const phases = ['pfp', 'bio', 'post', 'highlight', 'story'];
    const currentPhase = account.warmup_step || 0;
    const lifecycleState = account.lifecycle_state;

    return (
      <div className="flex items-center gap-1">
        {phases.map((phase, index) => {
          const phaseNumber = index + 1;
          let icon;
          let colorClass;

          if (lifecycleState === 'warmup' && phaseNumber === currentPhase) {
            // Current phase - in progress
            icon = <Loader className="h-3 w-3 animate-spin" />;
            colorClass = 'text-blue-600 bg-blue-100';
          } else if (phaseNumber < currentPhase) {
            // Completed phase
            icon = <CheckCircle className="h-3 w-3" />;
            colorClass = 'text-green-600 bg-green-100';
          } else if (lifecycleState === 'human_review' && phaseNumber === currentPhase) {
            // Failed phase requiring review
            icon = <AlertCircle className="h-3 w-3" />;
            colorClass = 'text-red-600 bg-red-100';
          } else {
            // Pending phase
            icon = <Circle className="h-3 w-3" />;
            colorClass = 'text-gray-400 bg-gray-100';
          }

          return (
            <div
              key={phase}
              className={`flex items-center justify-center w-6 h-6 rounded-full ${colorClass}`}
              title={`${phase.toUpperCase()} (${phaseNumber}/5) - ${phaseNumber < currentPhase ? 'Completed' : phaseNumber === currentPhase ? 'Current' : 'Pending'}`}
            >
              {icon}
            </div>
          );
        })}
        <span className="ml-2 text-xs text-gray-500">
          {currentPhase}/5
        </span>
      </div>
    );
  };

  // Component to render lifecycle state
  const renderLifecycleState = (lifecycleState: string) => {
    const stateConfig = {
      imported: { color: 'bg-gray-100 text-gray-800', label: 'Imported' },
      ready: { color: 'bg-blue-100 text-blue-800', label: 'Ready' },
      warmup: { color: 'bg-yellow-100 text-yellow-800', label: 'Warming Up' },
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      human_review: { color: 'bg-red-100 text-red-800', label: 'Needs Review' },
      cleanup: { color: 'bg-purple-100 text-purple-800', label: 'Cleanup' },
      archived: { color: 'bg-gray-100 text-gray-800', label: 'Archived' }
    };

    const config = stateConfig[lifecycleState as keyof typeof stateConfig] || 
                  { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Define columns for warmup accounts
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
      header: 'Lifecycle State',
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
        { value: 'warmup', label: 'Warming Up' },
        { value: 'active', label: 'Active' },
        { value: 'human_review', label: 'Needs Review' },
        { value: 'cleanup', label: 'Cleanup' },
        { value: 'archived', label: 'Archived' }
      ],
      render: (value) => renderLifecycleState(value)
    },
    {
      id: 'warmup_phases',
      field: 'warmup_step',
      header: 'Warmup Progress',
      width: 180,
      minWidth: 150,
      resizable: true,
      sortable: true,
      filterable: false,
      type: 'custom',
      align: 'center',
      visible: true,
      order: 3,
      frozen: false,
      editable: false,
      required: false,
      render: (value, row) => renderWarmupPhases(row)
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
      order: 4,
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
      order: 5,
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
      order: 6,
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

  // Calculate statistics for warmup accounts
  const warmupStats = {
    activeWarmup: accounts.filter(a => a.lifecycle_state === 'warmup').length,
    needsReview: accounts.filter(a => a.lifecycle_state === 'human_review').length,
    ready: accounts.filter(a => a.lifecycle_state === 'ready').length,
    active: accounts.filter(a => a.lifecycle_state === 'active').length,
    avgFollowRate: accounts.length > 0 
      ? (accounts.reduce((sum, a) => sum + (a.follow_back_rate || 0), 0) / accounts.length)
      : 0,
    totalFollows: accounts.reduce((sum, a) => sum + (a.total_follows || 0), 0)
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Warmup Pipeline</h3>
          <p className="text-sm text-gray-500">
            {filteredCount} of {totalCount} accounts • {warmupStats.activeWarmup} actively warming up
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
              console.log('Start warmup for selected accounts');
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
              <p className="text-2xl font-bold text-green-600">{warmupStats.activeWarmup}</p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Needs Review</p>
              <p className="text-2xl font-bold text-red-600">{warmupStats.needsReview}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ready Accounts</p>
              <p className="text-2xl font-bold text-blue-600">{warmupStats.ready}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Accounts</p>
              <p className="text-2xl font-bold text-purple-600">{warmupStats.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-purple-600" />
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
          <option value="all">All Lifecycle States</option>
          <option value="imported">Imported</option>
          <option value="ready">Ready</option>
          <option value="warmup">Warming Up</option>
          <option value="active">Active</option>
          <option value="human_review">Needs Review</option>
          <option value="cleanup">Cleanup</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Accounts Grid */}
      <div className="flex-1 bg-white rounded-lg shadow">
        {accounts.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Accounts in Pipeline</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'No accounts match your current filters.' 
                : 'No accounts are currently in the warmup pipeline.'
              }
            </p>
            <div className="text-sm text-gray-400 mt-4">
              <p><strong>Phase Legend:</strong></p>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <Circle className="h-3 w-3 text-gray-400" />
                  <span>Pending</span>
                </div>
                <div className="flex items-center gap-1">
                  <Loader className="h-3 w-3 text-blue-600" />
                  <span>In Progress</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Completed</span>
                </div>
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-red-600" />
                  <span>Failed</span>
                </div>
              </div>
            </div>
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
    </div>
  );
};

export default WarmupPipelineTab; 