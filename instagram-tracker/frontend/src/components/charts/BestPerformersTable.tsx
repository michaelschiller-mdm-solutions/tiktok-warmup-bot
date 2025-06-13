import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Crown, TrendingUp, Users, Target, DollarSign } from 'lucide-react';

interface BestPerformerData {
  account_id: number;
  username: string;
  model_id: number;
  model_name: string;
  metric_type: string;
  metric_value: number;
  follow_back_rank: number;
  conversion_rank: number;
  profit_rank: number;
  total_revenue: number;
  monthly_cost: number;
  net_profit: number;
  total_follows: number;
  total_conversions: number;
  follow_back_rate: number;
  conversion_rate: number;
  comparison_to_average: number;
}

interface BestPerformersTableProps {
  data: BestPerformerData[];
}

type SortField = 'username' | 'follow_back_rate' | 'conversion_rate' | 'total_revenue' | 'net_profit' | 'total_follows';
type SortOrder = 'asc' | 'desc';

const BestPerformersTable: React.FC<BestPerformersTableProps> = ({ data }) => {
  const [sortField, setSortField] = useState<SortField>('net_profit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No performance data available
      </div>
    );
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedData = [...data].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'username':
        aValue = a.username.toLowerCase();
        bValue = b.username.toLowerCase();
        break;
      case 'follow_back_rate':
        aValue = a.follow_back_rate;
        bValue = b.follow_back_rate;
        break;
      case 'conversion_rate':
        aValue = a.conversion_rate;
        bValue = b.conversion_rate;
        break;
      case 'total_revenue':
        aValue = a.total_revenue;
        bValue = b.total_revenue;
        break;
      case 'net_profit':
        aValue = a.net_profit;
        bValue = b.net_profit;
        break;
      case 'total_follows':
        aValue = a.total_follows;
        bValue = b.total_follows;
        break;
      default:
        aValue = a.net_profit;
        bValue = b.net_profit;
    }

    if (typeof aValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <div className="w-4 h-4"></div>;
    }
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-4 h-4 text-blue-500" />
      : <ChevronDown className="w-4 h-4 text-blue-500" />;
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      const colors = ['bg-yellow-100 text-yellow-800', 'bg-gray-100 text-gray-800', 'bg-amber-100 text-amber-800'];
      const icons = ['🥇', '🥈', '🥉'];
      return (
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[rank - 1]}`}>
          {icons[rank - 1]} #{rank}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        #{rank}
      </span>
    );
  };

  const getPerformanceColor = (value: number, isPositive: boolean = true) => {
    if (!isPositive) value = -value;
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getComparisonText = (value: number) => {
    if (value > 0) return `+${value.toFixed(1)}%`;
    if (value < 0) return `${value.toFixed(1)}%`;
    return '0%';
  };

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">Top Performer</span>
          </div>
          <div className="text-lg font-semibold text-blue-900">{sortedData[0]?.username || 'N/A'}</div>
          <div className="text-sm text-blue-700">${sortedData[0]?.net_profit.toLocaleString() || '0'} profit</div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-900">Best Follow Rate</span>
          </div>
          <div className="text-lg font-semibold text-green-900">
            {Math.max(...sortedData.map(d => d.follow_back_rate)).toFixed(1)}%
          </div>
          <div className="text-sm text-green-700">Follow back rate</div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-purple-600" />
            <span className="font-medium text-purple-900">Best Conversion</span>
          </div>
          <div className="text-lg font-semibold text-purple-900">
            {Math.max(...sortedData.map(d => d.conversion_rate)).toFixed(1)}%
          </div>
          <div className="text-sm text-purple-700">Conversion rate</div>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-amber-600" />
            <span className="font-medium text-amber-900">Total Revenue</span>
          </div>
          <div className="text-lg font-semibold text-amber-900">
            ${sortedData.reduce((sum, d) => sum + d.total_revenue, 0).toLocaleString()}
          </div>
          <div className="text-sm text-amber-700">Combined revenue</div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('username')}
                >
                  <div className="flex items-center gap-1">
                    Account
                    <SortIcon field="username" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_follows')}
                >
                  <div className="flex items-center gap-1">
                    Follows
                    <SortIcon field="total_follows" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('follow_back_rate')}
                >
                  <div className="flex items-center gap-1">
                    Follow Back Rate
                    <SortIcon field="follow_back_rate" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('conversion_rate')}
                >
                  <div className="flex items-center gap-1">
                    Conversion Rate
                    <SortIcon field="conversion_rate" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_revenue')}
                >
                  <div className="flex items-center gap-1">
                    Revenue
                    <SortIcon field="total_revenue" />
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('net_profit')}
                >
                  <div className="flex items-center gap-1">
                    Net Profit
                    <SortIcon field="net_profit" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  vs Average
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((account, index) => (
                <tr key={account.account_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRankBadge(index + 1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{account.username}</div>
                      <div className="text-sm text-gray-500">{account.model_name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {account.total_follows.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {account.follow_back_rate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      Rank #{account.follow_back_rank}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {account.conversion_rate.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {account.total_conversions} conversions
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${account.total_revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${getPerformanceColor(account.net_profit)}`}>
                      ${account.net_profit.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">
                      Cost: ${account.monthly_cost.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getPerformanceColor(account.comparison_to_average)}`}>
                      {getComparisonText(account.comparison_to_average)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-green-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-green-900 mb-2">📊 Performance Insights</h4>
        <div className="space-y-1 text-sm text-green-800">
          {sortedData.length > 0 && (
            <>
              <div>• Best performing account: {sortedData[0].username} with ${sortedData[0].net_profit.toLocaleString()} profit</div>
              {sortedData.filter(a => a.follow_back_rate > 80).length > 0 && (
                <div>• {sortedData.filter(a => a.follow_back_rate > 80).length} accounts have excellent follow-back rates (80%+)</div>
              )}
              {sortedData.filter(a => a.conversion_rate > 5).length > 0 && (
                <div>• {sortedData.filter(a => a.conversion_rate > 5).length} accounts have strong conversion rates (5%+)</div>
              )}
              {sortedData.filter(a => a.net_profit > 1000).length > 0 && (
                <div>• {sortedData.filter(a => a.net_profit > 1000).length} accounts generate $1000+ monthly profit</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BestPerformersTable;