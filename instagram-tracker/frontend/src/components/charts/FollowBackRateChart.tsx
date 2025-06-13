import React from 'react';

interface FollowBackRateData {
  account_id: number;
  username: string;
  model_name: string;
  total_follows: number;
  total_follow_backs: number;
  follow_back_rate: number;
  conversion_rate: number;
  total_conversions: number;
  recent_performance: any[];
}

interface FollowBackRateChartProps {
  data: FollowBackRateData[];
}

const FollowBackRateChart: React.FC<FollowBackRateChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No follow-back rate data available
      </div>
    );
  }

  // Prepare chart data - show top 10 accounts
  const chartData = data.slice(0, 10).map(account => ({
    name: account.username.length > 12 ? account.username.substring(0, 12) + '...' : account.username,
    fullName: account.username,
    rate: account.follow_back_rate,
    follows: account.total_follows,
    followBacks: account.total_follow_backs,
    modelName: account.model_name
  }));

  // Color based on performance
  const getBarColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500'; 
    if (rate >= 60) return 'bg-amber-500'; 
    return 'bg-red-500'; 
  };

  const getBarHeight = (rate: number) => {
    return Math.max(rate * 2, 8); // Minimum height of 8px
  };

  const averageRate = chartData.reduce((sum, item) => sum + item.rate, 0) / chartData.length;
  const maxRate = Math.max(...chartData.map(d => d.rate));

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {averageRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Average Rate</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {maxRate.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Best Rate</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-gray-900">
            {chartData.length}
          </div>
          <div className="text-sm text-gray-600">Accounts</div>
        </div>
      </div>

      {/* Custom Bar Chart */}
      <div className="relative">
        <div className="flex items-end justify-between h-64 px-4 border-l border-b border-gray-200">
          {chartData.map((account, index) => (
            <div key={index} className="flex flex-col items-center group relative">
              {/* Bar */}
              <div className="relative mb-2">
                <div
                  className={`w-8 transition-all duration-300 hover:opacity-80 ${getBarColor(account.rate)}`}
                  style={{ height: `${getBarHeight(account.rate)}px` }}
                  title={`${account.fullName}: ${account.rate.toFixed(1)}%`}
                />
                
                {/* Tooltip on hover */}
                <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 p-2 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap z-10">
                  <div className="font-medium">{account.fullName}</div>
                  <div>{account.modelName}</div>
                  <div>Rate: {account.rate.toFixed(1)}%</div>
                  <div>Follows: {account.follows.toLocaleString()}</div>
                  <div>Follow Backs: {account.followBacks.toLocaleString()}</div>
                  {/* Arrow */}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                </div>
              </div>
              
              {/* Account name */}
              <div className="text-xs text-gray-600 transform -rotate-45 origin-top-left mt-1">
                {account.name}
              </div>
            </div>
          ))}
        </div>
        
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-64 flex flex-col justify-between text-xs text-gray-500 -ml-8">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span>Excellent (80%+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-amber-500 rounded"></div>
            <span>Good (60-79%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span>Needs Improvement (&lt;60%)</span>
          </div>
        </div>
        <div>
          Showing top 10 accounts by follow-back rate
        </div>
      </div>

      {/* Detailed List */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Account Details</h4>
        <div className="space-y-2">
          {chartData.map((account, index) => (
            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded ${getBarColor(account.rate).replace('bg-', 'bg-')}`}></div>
                <span className="font-medium">{account.fullName}</span>
                <span className="text-gray-500">({account.modelName})</span>
              </div>
              <div className="flex items-center gap-4 text-right">
                <span>{account.rate.toFixed(1)}%</span>
                <span className="text-gray-500">{account.follows.toLocaleString()} follows</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FollowBackRateChart; 