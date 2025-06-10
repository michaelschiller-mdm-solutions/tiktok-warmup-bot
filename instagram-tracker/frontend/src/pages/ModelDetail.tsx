import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, Users, Activity, Settings, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { Model } from '../types/models';
import { apiClient } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface ModelPerformanceData {
  model: Model;
  follow_stats: {
    total_follows: number;
    active_follows: number;
    unfollowed_follows: number;
    recent_follows: number;
    avg_follow_duration_days: number;
    daily_follow_rate: number;
  };
  account_stats: {
    total_accounts: number;
    active_accounts: number;
    banned_accounts: number;
    suspended_accounts: number;
    last_account_activity: string;
  };
  daily_activity: Array<{
    activity_date: string;
    follows_count: number;
    active_accounts: number;
  }>;
  period: string;
}

const ModelDetail: React.FC = () => {
  const { modelId } = useParams();
  const [performanceData, setPerformanceData] = useState<ModelPerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');

  const loadModelPerformance = useCallback(async () => {
    if (!modelId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getModelPerformance(parseInt(modelId), selectedPeriod);
      setPerformanceData(data);
    } catch (err: any) {
      console.error('Failed to load model performance:', err);
      setError(err.message || 'Failed to load model performance');
      toast.error('Failed to load model performance');
    } finally {
      setLoading(false);
    }
  }, [modelId, selectedPeriod]);

  useEffect(() => {
    if (modelId) {
      loadModelPerformance();
    }
  }, [modelId, loadModelPerformance]);

  const handleExport = () => {
    toast('Export functionality coming soon!');
  };

  if (loading) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" text="Loading model analytics..." className="min-h-96" />
      </div>
    );
  }

  if (error || !performanceData) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to load model analytics</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={loadModelPerformance}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { model, follow_stats, account_stats, daily_activity } = performanceData;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/models"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{model.name}</h1>
            <p className="text-gray-600 mt-1">Model Performance Analytics</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* Period Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="form-select"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="btn-secondary flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <Link
              to={`/models/${modelId}/settings`}
              className="btn-primary flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Follow Performance</h3>
              <p className="text-sm text-gray-600">Recent activity stats</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Follows:</span>
              <span className="font-semibold">{follow_stats.total_follows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Follows:</span>
              <span className="font-semibold text-green-600">{follow_stats.active_follows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Recent Follows:</span>
              <span className="font-semibold">{follow_stats.recent_follows}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Daily Rate:</span>
              <span className="font-semibold">{follow_stats.daily_follow_rate.toFixed(1)}/day</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Account Status</h3>
              <p className="text-sm text-gray-600">Instagram accounts</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Accounts:</span>
              <span className="font-semibold">{account_stats.total_accounts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active:</span>
              <span className="font-semibold text-green-600">{account_stats.active_accounts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Banned:</span>
              <span className="font-semibold text-red-600">{account_stats.banned_accounts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Suspended:</span>
              <span className="font-semibold text-yellow-600">{account_stats.suspended_accounts}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Model Settings</h3>
              <p className="text-sm text-gray-600">Configuration</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`font-semibold capitalize ${
                model.status === 'active' ? 'text-green-600' :
                model.status === 'paused' ? 'text-yellow-600' : 'text-gray-600'
              }`}>
                {model.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Unfollow Ratio:</span>
              <span className="font-semibold">{model.unfollow_ratio}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Daily Limit:</span>
              <span className="font-semibold">{model.daily_follow_limit}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Avg Duration:</span>
              <span className="font-semibold">
                {follow_stats.avg_follow_duration_days 
                  ? `${follow_stats.avg_follow_duration_days.toFixed(1)}d`
                  : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Activity Chart - Placeholder for charts */}
      {daily_activity.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Activity</h3>
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">Activity Chart</p>
            <p className="text-sm text-gray-500">
              Chart visualization will be available once Chart.js dependencies are installed
            </p>
            <div className="mt-4 text-xs text-gray-400">
              Last {daily_activity.length} days of activity data loaded
            </div>
          </div>
        </div>
      )}

      {/* Recent Daily Activity Table */}
      {daily_activity.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Daily Activity</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Follows
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Accounts
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {daily_activity.slice(0, 10).map((day) => (
                  <tr key={day.activity_date}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(day.activity_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {day.follows_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {day.active_accounts}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelDetail; 