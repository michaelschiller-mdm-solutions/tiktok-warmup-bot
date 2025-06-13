import React, { useMemo } from 'react';
import { RefreshCw, Download, Plus } from 'lucide-react';
import { DataGrid } from '../DataGrid';
import { DataGridColumn } from '../../types/dataGrid';
import { Account } from '../../types/accounts';
import { useAccountsData } from '../../hooks/useAccountsData';
import LoadingSpinner from '../LoadingSpinner';

interface AccountsOverviewTabProps {
  modelId: number;
}

const AccountsOverviewTab: React.FC<AccountsOverviewTabProps> = ({ modelId }) => {
  const { 
    accounts, 
    loading, 
    error, 
    totalCount, 
    filteredCount, 
    refreshData 
  } = useAccountsData({
    modelId,
    activeTab: 'overview'
  });

  // Define columns for the overview tab
  const columns = useMemo((): DataGridColumn<Account>[] => [
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
          <div className="w-2 h-2 rounded-full bg-green-500" title="Active" />
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
      order: 3,
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
      formatter: (value) => (value || 0).toLocaleString()
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
      id: 'monthly_cost',
      field: 'monthly_cost',
      header: 'Monthly Cost',
      width: 110,
      minWidth: 90,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'number',
      align: 'right',
      visible: true,
      order: 6,
      frozen: false,
      editable: false,
      required: false,
      formatter: (value) => `$${(value || 0).toFixed(2)}`,
      render: (value) => (
        <div className="text-right">
          <span className="font-medium text-gray-900">
            ${(value || 0).toFixed(2)}
          </span>
        </div>
      )
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
  ], []);

  if (loading && accounts.length === 0) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" text="Loading accounts..." className="min-h-96" />
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
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Model Accounts Overview</h3>
            <p className="text-sm text-gray-500">
              Showing {filteredCount} of {totalCount} accounts
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Refreshing...
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={refreshData}
            disabled={loading}
            className="btn-ghost flex items-center gap-2"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            className="btn-secondary flex items-center gap-2"
            title="Export accounts"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          
          <button
            className="btn-primary flex items-center gap-2"
            title="Add new account"
          >
            <Plus className="h-4 w-4" />
            Add Account
          </button>
        </div>
      </div>

      {/* DataGrid */}
      <div className="flex-1 bg-white">
        <DataGrid<Account>
          data={accounts}
          columns={columns}
          height={600}
          loading={loading}
          error={error}
          virtualScrolling={true}
          multiSelect={true}
          rowSelection={true}
          keyboardNavigation={true}
          onCellClick={(position, row, column) => {
            console.log('Cell clicked:', { position, row: row.username, column: column.header });
          }}
          onRowClick={(rowIndex, row) => {
            console.log('Row clicked:', { rowIndex, username: row.username });
          }}
          className="border-none"
        />
      </div>
    </div>
  );
};

export default AccountsOverviewTab; 