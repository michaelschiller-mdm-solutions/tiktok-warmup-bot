import React from 'react';
import { ArrowDown, DollarSign, Users, Target } from 'lucide-react';

interface ConversionData {
  account_id: number;
  username: string;
  model_name: string;
  total_follows: number;
  total_follow_backs: number;
  total_conversions: number;
  follow_back_rate: number;
  conversion_rate: number;
  follow_to_conversion_rate: number;
  average_conversion_value: number;
  total_revenue: number;
  cost_per_conversion: number;
  roi_percentage: number;
}

interface ConversionFunnelChartProps {
  data: ConversionData[];
}

const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No conversion data available
      </div>
    );
  }

  // Calculate aggregated funnel data
  const totalFollows = data.reduce((sum, item) => sum + item.total_follows, 0);
  const totalFollowBacks = data.reduce((sum, item) => sum + item.total_follow_backs, 0);
  const totalConversions = data.reduce((sum, item) => sum + item.total_conversions, 0);
  const totalRevenue = data.reduce((sum, item) => sum + item.total_revenue, 0);

  const followBackRate = totalFollows > 0 ? (totalFollowBacks / totalFollows) * 100 : 0;
  const conversionRate = totalFollowBacks > 0 ? (totalConversions / totalFollowBacks) * 100 : 0;
  const overallConversionRate = totalFollows > 0 ? (totalConversions / totalFollows) * 100 : 0;
  const avgConversionValue = totalConversions > 0 ? totalRevenue / totalConversions : 0;

  // Funnel stages
  const funnelStages = [
    {
      name: 'Total Follows',
      value: totalFollows,
      percentage: 100,
      icon: Users,
      color: 'bg-blue-500',
      description: 'Initial follows generated'
    },
    {
      name: 'Follow Backs',
      value: totalFollowBacks,
      percentage: followBackRate,
      icon: Users,
      color: 'bg-green-500',
      description: 'Users who followed back'
    },
    {
      name: 'Conversions',
      value: totalConversions,
      percentage: conversionRate,
      icon: Target,
      color: 'bg-purple-500',
      description: 'Follow backs who subscribed'
    },
    {
      name: 'Revenue Generated',
      value: totalRevenue,
      percentage: 100,
      icon: DollarSign,
      color: 'bg-amber-500',
      description: 'Total revenue from conversions',
      isCurrency: true
    }
  ];

  // Top performing accounts
  const topAccounts = data
    .filter(account => account.total_conversions > 0)
    .sort((a, b) => b.roi_percentage - a.roi_percentage)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Overall Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{followBackRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Follow Back Rate</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{conversionRate.toFixed(1)}%</div>
          <div className="text-sm text-gray-600">Conversion Rate</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">${avgConversionValue.toFixed(2)}</div>
          <div className="text-sm text-gray-600">Avg Conversion Value</div>
        </div>
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <div className="text-lg font-semibold text-gray-900">{overallConversionRate.toFixed(2)}%</div>
          <div className="text-sm text-gray-600">Overall Conversion</div>
        </div>
      </div>

      {/* Funnel Visualization */}
      <div className="bg-white">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Conversion Funnel</h4>
        
        <div className="space-y-4">
          {funnelStages.map((stage, index) => {
            const Icon = stage.icon;
            const widthPercentage = index === 0 ? 100 : Math.max((stage.value / funnelStages[0].value) * 100, 5);
            
            return (
              <div key={index} className="relative">
                {/* Funnel Stage */}
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className={`p-3 rounded-full ${stage.color} text-white`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  {/* Funnel Bar */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{stage.name}</span>
                      <span className="text-sm text-gray-600">{stage.description}</span>
                    </div>
                    
                    <div className="relative">
                      {/* Background bar */}
                      <div className="w-full h-8 bg-gray-100 rounded-lg overflow-hidden">
                        {/* Progress bar */}
                        <div 
                          className={`h-full ${stage.color} transition-all duration-1000 ease-out rounded-lg flex items-center justify-center`}
                          style={{ width: `${widthPercentage}%` }}
                        >
                          <span className="text-white text-sm font-medium">
                            {stage.isCurrency 
                              ? `$${stage.value.toLocaleString()}`
                              : stage.value.toLocaleString()
                            }
                          </span>
                        </div>
                      </div>
                      
                      {/* Percentage indicator */}
                      {index > 0 && index < 3 && (
                        <div className="absolute -right-16 top-1/2 transform -translate-y-1/2 text-sm font-medium text-gray-700">
                          {stage.percentage.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Arrow connector */}
                {index < funnelStages.length - 1 && (
                  <div className="flex justify-center my-2">
                    <ArrowDown className="h-4 w-4 text-gray-400" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Performing Accounts */}
      {topAccounts.length > 0 && (
        <div className="bg-white">
          <h4 className="text-lg font-medium text-gray-900 mb-4">Top Converting Accounts</h4>
          
          <div className="space-y-3">
            {topAccounts.map((account, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{account.username}</div>
                    <div className="text-sm text-gray-600">{account.model_name}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{account.total_conversions}</div>
                    <div className="text-gray-600">Conversions</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">{account.conversion_rate.toFixed(1)}%</div>
                    <div className="text-gray-600">Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">${account.total_revenue.toLocaleString()}</div>
                    <div className="text-gray-600">Revenue</div>
                  </div>
                  <div className="text-center">
                    <div className={`font-medium ${account.roi_percentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {account.roi_percentage.toFixed(0)}%
                    </div>
                    <div className="text-gray-600">ROI</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conversion Insights */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">🎯 Conversion Insights</h4>
        <div className="space-y-1 text-sm text-blue-800">
          {followBackRate > 75 && (
            <div>• Excellent follow-back rate of {followBackRate.toFixed(1)}% - your content is engaging!</div>
          )}
          {conversionRate > 5 && (
            <div>• Strong conversion rate of {conversionRate.toFixed(1)}% - good monetization strategy</div>
          )}
          {conversionRate < 2 && totalFollowBacks > 100 && (
            <div>• Conversion rate of {conversionRate.toFixed(1)}% could be improved - review your CTA strategy</div>
          )}
          {avgConversionValue > 50 && (
            <div>• High average conversion value of ${avgConversionValue.toFixed(2)} - premium audience</div>
          )}
          {topAccounts.length > 0 && (
            <div>• Top performer: {topAccounts[0].username} with {topAccounts[0].roi_percentage.toFixed(0)}% ROI</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversionFunnelChart; 