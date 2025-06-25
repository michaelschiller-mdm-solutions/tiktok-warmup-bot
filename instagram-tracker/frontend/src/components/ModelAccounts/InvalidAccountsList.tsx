import React, { useState, useEffect } from 'react';
import { AlertTriangle, Package, Calendar, User, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { apiClient } from '../../services/api';

interface InvalidAccount {
  id: number;
  username: string;
  email: string;
  status: string;
  lifecycle_state: string;
  order_number?: string;
  import_source?: string;
  import_batch_id?: string;
  imported_at?: string;
  state_changed_at: string;
  state_changed_by?: string;
  state_notes?: string;
  model_name?: string;
}

interface InvalidAccountsData {
  grouped_by_order: Record<string, InvalidAccount[]>;
  ungrouped: InvalidAccount[];
  total_count: number;
  order_summary: Array<{
    order_number: string;
    account_count: number;
    accounts: string[];
  }>;
}

const InvalidAccountsList: React.FC = () => {
  const [data, setData] = useState<InvalidAccountsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const fetchInvalidAccounts = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.getInvalidAccounts();
      setData(result.data);
    } catch (err: any) {
      console.error('Error fetching invalid accounts:', err);
      setError(err.message || 'Failed to load invalid accounts');
      toast.error('Failed to load invalid accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvalidAccounts();
  }, []);

  const toggleOrderExpansion = (orderNumber: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderNumber)) {
        newSet.delete(orderNumber);
      } else {
        newSet.add(orderNumber);
      }
      return newSet;
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeColor = (status: string, lifecycle: string) => {
    if (lifecycle === 'archived' || lifecycle === 'cleanup') {
      return 'bg-red-100 text-red-800';
    }
    switch (status) {
      case 'banned':
        return 'bg-red-100 text-red-800';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading invalid accounts...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Invalid Accounts</h3>
        <p className="text-gray-500 mb-4">{error}</p>
        <button 
          onClick={fetchInvalidAccounts}
          className="btn-primary flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </button>
      </div>
    );
  }

  if (!data || data.total_count === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-12 w-12 text-green-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Invalid Accounts</h3>
        <p className="text-gray-500">All accounts are currently valid and operational.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Invalid Accounts
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {data.total_count} invalid accounts found
            {Object.keys(data.grouped_by_order).length > 0 && (
              <span> • {Object.keys(data.grouped_by_order).length} orders affected</span>
            )}
          </p>
        </div>
        <button
          onClick={fetchInvalidAccounts}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Order Summary */}
      {Object.keys(data.grouped_by_order).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-900 mb-3 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Orders with Invalid Accounts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.order_summary.map(summary => (
              <div
                key={summary.order_number}
                className="bg-white border border-yellow-200 rounded p-3 cursor-pointer hover:bg-yellow-50"
                onClick={() => toggleOrderExpansion(summary.order_number)}
              >
                <div className="font-medium text-sm text-gray-900">
                  Order: {summary.order_number}
                </div>
                <div className="text-xs text-gray-600">
                  {summary.account_count} invalid accounts
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Accounts by Order */}
      {Object.entries(data.grouped_by_order).map(([orderNumber, accounts]) => (
        <div key={orderNumber} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div
            className="bg-gray-50 px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-100"
            onClick={() => toggleOrderExpansion(orderNumber)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-gray-500" />
                <div>
                  <h3 className="font-medium text-gray-900">Order: {orderNumber}</h3>
                  <p className="text-sm text-gray-500">{accounts.length} invalid accounts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {expandedOrders.has(orderNumber) ? 'Collapse' : 'Expand'}
                </span>
                <div className={`transform transition-transform ${expandedOrders.has(orderNumber) ? 'rotate-180' : ''}`}>
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {expandedOrders.has(orderNumber) && (
            <div className="divide-y divide-gray-200">
              {accounts.map(account => (
                <div key={account.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-900">{account.username}</h4>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(account.status, account.lifecycle_state)}`}>
                          {account.status}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          {account.lifecycle_state}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Email: {account.email}</div>
                        {account.model_name && <div>Model: {account.model_name}</div>}
                        <div className="flex items-center gap-4">
                          <span>Invalid since: {formatDate(account.state_changed_at)}</span>
                          {account.imported_at && (
                            <span>Imported: {formatDate(account.imported_at)}</span>
                          )}
                        </div>
                        {account.state_notes && (
                          <div className="text-xs bg-red-50 border border-red-200 rounded p-2 mt-2">
                            <strong>Reason:</strong> {account.state_notes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Ungrouped Accounts */}
      {data.ungrouped.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-500" />
              Accounts without Order Number ({data.ungrouped.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {data.ungrouped.map(account => (
              <div key={account.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-gray-900">{account.username}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(account.status, account.lifecycle_state)}`}>
                        {account.status}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        {account.lifecycle_state}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>Email: {account.email}</div>
                      {account.model_name && <div>Model: {account.model_name}</div>}
                      <div className="flex items-center gap-4">
                        <span>Invalid since: {formatDate(account.state_changed_at)}</span>
                        {account.imported_at && (
                          <span>Imported: {formatDate(account.imported_at)}</span>
                        )}
                      </div>
                      {account.state_notes && (
                        <div className="text-xs bg-red-50 border border-red-200 rounded p-2 mt-2">
                          <strong>Reason:</strong> {account.state_notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default InvalidAccountsList; 