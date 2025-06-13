import React from 'react';

interface ProfitMarginData {
  breakdown: {
    category_name: string;
    total_amount: number;
    percentage: number;
    color: string;
    subcategories: any[];
  }[];
  total_amount: number;
}

interface ProfitMarginChartProps {
  data: {
    breakdown: any[];
    total_amount: number;
  };
}

const ProfitMarginChart: React.FC<ProfitMarginChartProps> = ({ data }) => {
  if (!data || !data.breakdown || data.breakdown.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No cost breakdown data available
      </div>
    );
  }

  const { breakdown, total_amount } = data;

  // Predefined colors for categories
  const colors = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // green-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#f97316', // orange-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#ec4899', // pink-500
    '#6b7280'  // gray-500
  ];

  // Assign colors to categories
  const categoriesWithColors = breakdown.map((item, index) => ({
    ...item,
    color: colors[index % colors.length],
    percentage: total_amount > 0 ? (item.total_amount / total_amount) * 100 : 0
  }));

  // Create pie chart using conic gradient
  let cumulativePercentage = 0;
  const gradientStops = categoriesWithColors.map((category) => {
    const startPercentage = cumulativePercentage;
    cumulativePercentage += category.percentage;
    const endPercentage = cumulativePercentage;
    
    return `${category.color} ${startPercentage}% ${endPercentage}%`;
  }).join(', ');

  const pieStyle = {
    background: `conic-gradient(${gradientStops})`,
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="text-center p-4 bg-gray-50 rounded-lg">
        <div className="text-lg font-semibold text-gray-900">
          ${total_amount.toLocaleString()}
        </div>
        <div className="text-sm text-gray-600">Total Monthly Costs</div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Pie Chart */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            {/* Pie Chart Circle */}
            <div 
              className="w-48 h-48 rounded-full border-4 border-white shadow-lg"
              style={pieStyle}
            />
            
            {/* Center Circle with Total */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-gray-100">
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-900">Total</div>
                  <div className="text-xs text-gray-600">${(total_amount / 1000).toFixed(1)}k</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legend and Details */}
        <div className="flex-1 space-y-3">
          <h4 className="font-medium text-gray-900">Cost Breakdown</h4>
          
          {categoriesWithColors.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <div>
                  <div className="font-medium text-gray-900">{category.category_name}</div>
                  {category.subcategories && category.subcategories.length > 0 && (
                    <div className="text-xs text-gray-500">
                      {category.subcategories.length} providers
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium text-gray-900">
                  ${category.total_amount.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  {category.percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
          
          {categoriesWithColors.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No cost data available
            </div>
          )}
        </div>
      </div>

      {/* Detailed Breakdown */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Detailed Analysis</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categoriesWithColors.map((category, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <h5 className="font-medium text-gray-900">{category.category_name}</h5>
              </div>
              
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">${category.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Percentage:</span>
                  <span className="font-medium">{category.percentage.toFixed(1)}%</span>
                </div>
                {category.subcategories && category.subcategories.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-1">Subcategories:</div>
                    {category.subcategories.map((sub: any, subIndex: number) => (
                      <div key={subIndex} className="text-xs text-gray-600 ml-2">
                        • {sub.provider || sub.name}: ${sub.amount?.toFixed(2) || '0.00'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Optimization Tips */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">💡 Cost Optimization Tips</h4>
        <div className="space-y-1 text-sm text-blue-800">
          {categoriesWithColors.length > 0 && (
            <>
              <div>• Largest expense: {categoriesWithColors[0].category_name} (${categoriesWithColors[0].total_amount.toLocaleString()})</div>
              {categoriesWithColors[0].percentage > 50 && (
                <div>• Consider negotiating better rates for {categoriesWithColors[0].category_name}</div>
              )}
              {categoriesWithColors.filter(c => c.percentage > 20).length > 1 && (
                <div>• Multiple high-cost categories detected - review spending allocation</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitMarginChart; 