import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  description?: string;
  loading?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon: Icon,
  trend = 'neutral',
  trendValue,
  description,
  loading = false
}) => {
  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  const getTrendIcon = () => {
    if (trend === 'up') return TrendingUp;
    if (trend === 'down') return TrendingDown;
    return null;
  };

  const TrendIcon = getTrendIcon();

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-6 w-6 bg-gray-200 rounded"></div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <Icon className="h-6 w-6 text-gray-400" />
      </div>

      <div className="mb-2">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
      </div>

      {(trend !== 'neutral' && trendValue !== undefined) && (
        <div className={`flex items-center gap-1 text-sm ${getTrendColor()}`}>
          {TrendIcon && <TrendIcon className="h-4 w-4" />}
          <span>
            {trend === 'up' ? '+' : '-'}{Math.abs(trendValue).toFixed(1)}%
          </span>
          <span className="text-gray-500">vs last period</span>
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
};

export default KPICard; 