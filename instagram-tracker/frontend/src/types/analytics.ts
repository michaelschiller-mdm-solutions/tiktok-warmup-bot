// Analytics and cost tracking types for the Instagram Tracker application

export interface CostCategory {
  id: number;
  name: string;
  description?: string;
  category_type: 'recurring' | 'one_time' | 'variable';
  default_unit: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ModelCost {
  id: number;
  model_id: number;
  cost_category_id: number;
  cost_amount: number;
  cost_period: string;
  cost_date: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cost_category?: CostCategory;
  model_name?: string;
}

export interface AccountCost {
  id: number;
  account_id: number;
  cost_category_id: number;
  cost_amount: number;
  cost_period: string;
  cost_date: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cost_category?: CostCategory;
  account_username?: string;
}

export interface CostHistory {
  id: number;
  model_id?: number;
  account_id?: number;
  cost_category_id: number;
  cost_amount: number;
  period_start: string;
  period_end: string;
  total_cost: number;
  notes?: string;
  created_at: string;
}

export interface RevenueEvent {
  id: number;
  account_id: number;
  model_id: number;
  revenue_type: string;
  revenue_amount: number;
  source_user_id?: number;
  conversion_date: string;
  description?: string;
  metadata: Record<string, any>;
}

export interface ConversionEvent {
  id: number;
  account_id: number;
  model_id: number;
  target_user_id: number;
  follow_event_id?: number;
  conversion_type: string;
  conversion_value: number;
  conversion_date: string;
  conversion_source: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ModelProfitAnalysis {
  model_id: number;
  model_name: string;
  status: string;
  total_model_costs: number;
  total_account_costs: number;
  total_costs: number;
  total_revenue: number;
  net_profit: number;
  profit_margin_percentage: number;
  total_accounts: number;
  active_accounts: number;
}

export interface FollowBackRateAnalysis {
  account_id: number;
  username: string;
  model_id: number;
  model_name: string;
  total_follows: number;
  total_follow_backs: number;
  follow_back_rate: number;
  conversion_rate: number;
  total_conversions: number;
  recent_performance: Array<{
    date: string;
    follows: number;
    follow_backs: number;
    rate: number;
  }>;
}

export interface ProfitMarginBreakdown {
  category_name: string;
  total_amount: number;
  percentage: number;
  color: string;
  subcategories?: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
}

export interface ConversionFunnelAnalysis {
  account_id: number;
  username: string;
  model_id: number;
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

export interface BestPerformerAnalysis {
  account_id: number;
  username: string;
  model_id: number;
  model_name: string;
  metric_type: 'follow_back_rate' | 'conversion_rate' | 'profit' | 'roi';
  metric_value: number;
  rank: number;
  total_revenue: number;
  total_cost: number;
  net_profit: number;
  comparison_to_average: number; // percentage
}

export interface AnalyticsFilters {
  date_from?: string;
  date_to?: string;
  model_ids?: number[];
  account_ids?: number[];
  cost_categories?: number[];
  metric_type?: string;
  period?: '7d' | '30d' | '90d' | '1y';
}

export interface AnalyticsResponse<T> {
  success: boolean;
  data: T;
  filters?: AnalyticsFilters;
  metadata?: {
    total_records: number;
    date_range: {
      from: string;
      to: string;
    };
    calculation_date: string;
  };
}

export interface DashboardKPIs {
  // Follow Back Rate
  overall_follow_back_rate: number;
  follow_back_rate_trend: number; // percentage change
  follow_back_rate_by_account: FollowBackRateAnalysis[];
  
  // Profit Margin
  total_revenue: number;
  total_costs: number;
  net_profit: number;
  profit_margin_percentage: number;
  profit_breakdown: ProfitMarginBreakdown[];
  
  // Conversion Analysis
  overall_conversion_rate: number;
  conversion_trend: number; // percentage change
  best_performers: BestPerformerAnalysis[];
  
  // Cost Analysis
  cost_by_category: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  
  // Time Series Data
  performance_over_time: Array<{
    date: string;
    follows: number;
    follow_backs: number;
    conversions: number;
    revenue: number;
    costs: number;
  }>;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    fill?: boolean;
  }>;
}

export interface AnalyticsChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar';
  title: string;
  data: ChartData;
  options?: Record<string, any>;
} 