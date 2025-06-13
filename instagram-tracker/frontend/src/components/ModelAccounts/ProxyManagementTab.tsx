import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldX, ShieldAlert, RefreshCw, Settings, Globe } from 'lucide-react';
import { DataGrid } from '../DataGrid';
import { DataGridColumn } from '../../types/dataGrid';
import { Account } from '../../types/accounts';
import { useAccountsData } from '../../hooks/useAccountsData';
import LoadingSpinner from '../LoadingSpinner';

interface ProxyManagementTabProps {
  modelId: number;
}

const ProxyManagementTab: React.FC<ProxyManagementTabProps> = ({ modelId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [proxyStatusFilter, setProxyStatusFilter] = useState<string>('all');

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
    activeTab: 'proxy'
  });

  // Update filters when search term or proxy status filter changes
  useEffect(() => {
    updateFilters({
      search: searchTerm || undefined,
      proxy_status: proxyStatusFilter === 'all' ? undefined : [proxyStatusFilter]
    });
  }, [searchTerm, proxyStatusFilter, updateFilters]);

  // Define columns for proxy management
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
            row.proxy_status === 'active' ? 'bg-green-500' : 
            row.proxy_status === 'error' ? 'bg-red-500' :
            row.proxy_status === 'inactive' ? 'bg-yellow-500' :
            'bg-gray-500'
          }`} title={row.proxy_status} />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      id: 'proxy_status',
      field: 'proxy_status',
      header: 'Proxy Status',
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
        const ProxyIcon = value === 'active' ? ShieldCheck : 
                          value === 'error' ? ShieldX :
                          value === 'inactive' ? ShieldAlert : Shield;
        
        return (
          <div className="flex items-center gap-2">
            <ProxyIcon className="h-4 w-4" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${proxyColors[value as keyof typeof proxyColors] || proxyColors.unknown}`}>
              {value || 'unknown'}
            </span>
          </div>
        );
      }
    },
    {
      id: 'proxy_host',
      field: 'proxy_host',
      header: 'Proxy Host',
      width: 150,
      minWidth: 120,
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
      render: (value, row) => {
        if (!value) return <span className="text-gray-400">No proxy</span>;
        return (
          <div className="font-mono text-sm">
            <div>{value}</div>
            {row.proxy_port && (
              <div className="text-xs text-gray-500">:{row.proxy_port}</div>
            )}
          </div>
        );
      }
    },
    {
      id: 'proxy_provider',
      field: 'proxy_provider',
      header: 'Provider',
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
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {value}
          </span>
        );
      }
    },
    {
      id: 'proxy_location',
      field: 'proxy_location',
      header: 'Location',
      width: 120,
      minWidth: 100,
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
      render: (value) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return (
          <div className="flex items-center gap-1">
            <Globe className="h-3 w-3 text-gray-400" />
            <span className="text-sm">{value}</span>
          </div>
        );
      }
    },
    {
      id: 'proxy_last_checked',
      field: 'proxy_last_checked',
      header: 'Last Checked',
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
      id: 'status',
      field: 'status',
      header: 'Account Status',
      width: 120,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'select',
      align: 'center',
      visible: true,
      order: 7,
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
    }
  ];

  if (loading && accounts.length === 0) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" text="Loading proxy information..." className="min-h-96" />
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Proxy Data</h3>
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

  const proxyStats = {
    active: accounts.filter(a => a.proxy_status === 'active').length,
    inactive: accounts.filter(a => a.proxy_status === 'inactive').length,
    error: accounts.filter(a => a.proxy_status === 'error').length,
    noProxy: accounts.filter(a => !a.proxy_host).length
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Proxy Management</h3>
          <p className="text-sm text-gray-500">
            {filteredCount} of {totalCount} accounts with proxy configuration
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
            className="btn-primary flex items-center gap-2"
            onClick={() => {
              // TODO: Implement proxy configuration modal
            }}
          >
            <Settings className="h-4 w-4" />
            Configure Proxies
          </button>
        </div>
      </div>

      {/* Proxy Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Proxies</p>
              <p className="text-2xl font-bold text-green-600">{proxyStats.active}</p>
            </div>
            <ShieldCheck className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Inactive Proxies</p>
              <p className="text-2xl font-bold text-yellow-600">{proxyStats.inactive}</p>
            </div>
            <ShieldAlert className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Proxy Errors</p>
              <p className="text-2xl font-bold text-red-600">{proxyStats.error}</p>
            </div>
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">No Proxy</p>
              <p className="text-2xl font-bold text-gray-600">{proxyStats.noProxy}</p>
            </div>
            <Shield className="h-8 w-8 text-gray-600" />
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
          value={proxyStatusFilter}
          onChange={(e) => setProxyStatusFilter(e.target.value)}
          className="form-select"
        >
          <option value="all">All Proxy Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="error">Error</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {/* Accounts Grid */}
      <div className="flex-1 bg-white rounded-lg shadow">
        {accounts.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Proxy Configuration</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || proxyStatusFilter !== 'all' 
                ? 'No accounts match your current filters.' 
                : 'No accounts have proxy configuration set up.'
              }
            </p>
            {(!searchTerm && proxyStatusFilter === 'all') && (
              <button 
                className="btn-primary flex items-center gap-2 mx-auto"
                onClick={() => {
                  // TODO: Implement proxy configuration modal
                }}
              >
                <Settings className="h-4 w-4" />
                Configure Proxies
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
    </div>
  );
};

export default ProxyManagementTab; 