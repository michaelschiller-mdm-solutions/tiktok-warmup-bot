import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Users, Activity, Calendar, Target } from 'lucide-react';
import { apiClient } from '../services/api';

interface AnalyticsData {
  models: {
    total_models: number;
    active_models: number;
    paused_models: number;
    inactive_models: number;
  };
  accounts: {
    total_accounts: number;
    active_accounts: number;
    banned_accounts: number;
    suspended_accounts: number;
  };
  follows: {
    total_follows: number;
    active_follows: number;
    unfollowed_follows: number;
    avg_follow_duration_days: number;
  };
  recent_activity: Array<{
    action_type: string;
    action_count: number;
    last_action: string;
  }>;
}

interface ModelStatsProps {
  refreshTrigger?: number;
  className?: string;
}

const ModelStats: React.FC<ModelStatsProps> = ({ refreshTrigger, className = '' }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, [refreshTrigger]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.getAnalytics();
      setAnalytics(response);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-4 bg-gray-300 rounded mb-2"></div>
            <div className="h-8 bg-gray-300 rounded mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <p className="text-red-600">Failed to load analytics: {error}</p>
        <button 
          onClick={loadAnalytics}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Models',
      value: analytics.models.total_models,
      subtitle: `${analytics.models.active_models} active`,
      icon: Target,
      color: 'blue',
      trend: analytics.models.active_models > 0 ? 'up' : 'neutral'
    },
    {
      title: 'Instagram Accounts',
      value: analytics.accounts.total_accounts,
      subtitle: `${analytics.accounts.active_accounts} active`,
      icon: Users,
      color: 'green',
      trend: analytics.accounts.banned_accounts === 0 ? 'up' : 'down'
    },
    {
      title: 'Total Follows',
      value: analytics.follows.total_follows,
      subtitle: `${analytics.follows.active_follows} active`,
      icon: Activity,
      color: 'purple',
      trend: analytics.follows.active_follows > analytics.follows.unfollowed_follows ? 'up' : 'down'
    },
    {
      title: 'Avg Follow Duration',
      value: analytics.follows.avg_follow_duration_days 
        ? `${Math.round(analytics.follows.avg_follow_duration_days)}d`
        : 'N/A',
      subtitle: 'Days before unfollow',
      icon: Calendar,
      color: 'yellow',
      trend: 'neutral'
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'text-blue-600 bg-blue-100',
      green: 'text-green-600 bg-green-100',
      purple: 'text-purple-600 bg-purple-100',
      yellow: 'text-yellow-600 bg-yellow-100',
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  return (
    <div className={className}>
      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((stat) => (
          <div 
            key={stat.title}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`p-3 rounded-lg ${getColorClasses(stat.color)}`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                {getTrendIcon(stat.trend)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity Summary */}
      {analytics.recent_activity.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity (24h)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analytics.recent_activity.slice(0, 3).map((activity) => (
              <div 
                key={activity.action_type}
                className="text-center p-4 bg-gray-50 rounded-lg"
              >
                <div className="text-2xl font-bold text-gray-900">{activity.action_count}</div>
                <div className="text-sm text-gray-600 capitalize">
                  {activity.action_type.replace('_', ' ')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Last: {new Date(activity.last_action).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelStats; 