import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Target, 
  PieChart,
  BarChart3,
  Activity,
  Crown,
  Filter,
  RefreshCw,
  Calendar,
  Download
} from 'lucide-react';

import { apiClient } from '../services/api';
import FollowBackRateChart from '../components/charts/FollowBackRateChart';
import ProfitMarginChart from '../components/charts/ProfitMarginChart';
import ConversionFunnelChart from '../components/charts/ConversionFunnelChart';
import BestPerformersTable from '../components/charts/BestPerformersTable';
import KPICard from '../components/charts/KPICard';
import { Model } from '../types/models';

interface DashboardFilters {
  model_id?: number;
  date_from?: string;
  date_to?: string;
}

interface AnalyticsData {
  overall_follow_back_rate: number;
  total_revenue: number;
  total_costs: number;
  net_profit: number;
  profit_margin_percentage: number;
  overall_conversion_rate: number;
  cost_by_category: any[];
  best_performers: any[];
  performance_over_time: any[];
}

const Analytics: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>({
    date_from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0]
  });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [followBackData, setFollowBackData] = useState<any>(null);
  const [profitData, setProfitData] = useState<any>(null);
  const [conversionData, setConversionData] = useState<any>(null);
  const [bestPerformers, setBestPerformers] = useState<any>(null);
  const [proxyProviders, setProxyProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!loading) {
      loadAnalyticsData();
    }
  }, [filters]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [modelsData, providersData] = await Promise.all([
        apiClient.getModels(),
        apiClient.getProxyProviders()
      ]);
      
      setModels(modelsData);
      setProxyProviders(providersData);
      
      await loadAnalyticsData();
    } catch (error: any) {
      console.error('Failed to load initial data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      setRefreshing(true);
      
      const [
        dashboardData,
        followBackRateData,
        profitMarginData,
        conversionFunnelData,
        bestPerformersData
      ] = await Promise.all([
        apiClient.getDashboardAnalytics(filters),
        apiClient.getFollowBackRates({ 
          model_id: filters.model_id, 
          limit: 50, 
          sort_by: 'follow_back_rate', 
          sort_order: 'desc' 
        }),
        apiClient.getProfitMarginBreakdown(filters.model_id),
        apiClient.getConversionFunnel({ model_id: filters.model_id }),
        apiClient.getBestPerformers({ 
          model_id: filters.model_id, 
          metric_type: 'profit', 
          limit: 10 
        })
      ]);

      setAnalytics(dashboardData.data);
      setFollowBackData(followBackRateData);
      setProfitData(profitMarginData);
      setConversionData(conversionFunnelData);
      setBestPerformers(bestPerformersData);

    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to refresh analytics data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleFilterChange = (field: keyof DashboardFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value === '' ? undefined : value
    }));
  };

  const handleRefresh = () => {
    loadAnalyticsData();
  };

  const handleExportData = async () => {
    try {
      // In a real implementation, this would export all analytics data
      toast.success('Analytics data exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const selectedModel = models.find(m => m.id === filters.model_id);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analytics for Instagram account performance
          </p>
        </div>

        <div className="flex items-center gap-3 mt-4 sm:mt-0">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-ghost flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <button
            onClick={handleExportData}
            className="btn-ghost flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-gray-500" />
          <h3 className="font-medium text-gray-900">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <select
              value={filters.model_id || ''}
              onChange={(e) => handleFilterChange('model_id', e.target.value ? parseInt(e.target.value) : undefined)}
              className="form-select w-full"
            >
              <option value="">All Models</option>
              {models.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Date
            </label>
            <input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="form-input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Date
            </label>
            <input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="form-input w-full"
            />
          </div>
        </div>

        {selectedModel && (
          <div className="mt-3 p-3 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-700">
              Showing data for: <span className="font-medium">{selectedModel.name}</span>
            </p>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Follow Back Rate"
            value={`${analytics.overall_follow_back_rate.toFixed(1)}%`}
            icon={Users}
            trend="up"
            trendValue={2.3}
            description="Average follow-back rate across all accounts"
          />

          <KPICard
            title="Total Revenue"
            value={`$${analytics.total_revenue.toLocaleString()}`}
            icon={DollarSign}
            trend="up"
            trendValue={15.2}
            description="Total revenue generated this period"
          />

          <KPICard
            title="Conversion Rate"
            value={`${analytics.overall_conversion_rate.toFixed(2)}%`}
            icon={Target}
            trend="up"
            trendValue={8.7}
            description="Follow-to-subscription conversion rate"
          />

          <KPICard
            title="Profit Margin"
            value={`${analytics.profit_margin_percentage.toFixed(1)}%`}
            icon={TrendingUp}
            trend={analytics.profit_margin_percentage > 0 ? "up" : "down"}
            trendValue={Math.abs(analytics.profit_margin_percentage)}
            description="Net profit margin after all costs"
          />
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follow Back Rate Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Follow Back Rate Analysis
            </h3>
          </div>
          {followBackData ? (
            <FollowBackRateChart data={followBackData.data} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Loading follow back data...
            </div>
          )}
        </div>

        {/* Profit Margin Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Cost Breakdown
            </h3>
          </div>
          {profitData ? (
            <ProfitMarginChart data={profitData.data} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              Loading profit data...
            </div>
          )}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Conversion Funnel
          </h3>
        </div>
        {conversionData ? (
          <ConversionFunnelChart data={conversionData.data} />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Loading conversion data...
          </div>
        )}
      </div>

      {/* Best Performers Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Best Performing Accounts
          </h3>
        </div>
        {bestPerformers ? (
          <BestPerformersTable data={bestPerformers.data} />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            Loading performance data...
          </div>
        )}
      </div>

      {/* Proxy Status Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Proxy Provider Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {proxyProviders.map((provider, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{provider.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  provider.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {provider.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p>Accounts: {provider.accounts_count || 0}</p>
                <p>Monthly Cost: ${(provider.total_monthly_cost || 0).toFixed(2)}</p>
                <p>Cost per Proxy: ${(provider.monthly_cost_per_proxy || 0).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Analytics;