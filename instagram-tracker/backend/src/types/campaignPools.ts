export interface CampaignPool {
  id: number;
  name: string;
  description?: string;
  sprint_ids: number[];
  sprint_names?: string[];
  total_duration_hours: number;
  compatible_accounts: number;
  assignment_strategy: 'random' | 'balanced' | 'manual';
  time_horizon_days: number;
  is_template?: boolean;
  template_category?: string;
  usage_count: number;
  last_assigned?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreatePoolRequest {
  name: string;
  description?: string;
  sprint_ids: number[];
  assignment_strategy?: 'random' | 'balanced' | 'manual';
  time_horizon_days?: number;
}

export interface UpdatePoolRequest {
  name?: string;
  description?: string;
  sprint_ids?: number[];
  assignment_strategy?: 'random' | 'balanced' | 'manual';
  time_horizon_days?: number;
  is_template?: boolean;
  template_category?: string;
  total_duration_hours?: number;
  compatible_accounts?: number;
}

export interface CompatibilityReport {
  is_compatible: boolean;
  blocking_conflicts: BlockingConflict[];
  seasonal_issues: SeasonalIssue[];
  duration_warnings: DurationWarning[];
  account_eligibility_count: number;
  message: string;
}

export interface BlockingConflict {
  type: 'blocking_conflict';
  sprint_a_id: number;
  sprint_a_name: string;
  sprint_b_id: number;
  sprint_b_name: string;
  description: string;
}

export interface SeasonalIssue {
  type: 'seasonal_incompatibility' | 'seasonal_warning';
  description: string;
  available_months?: number[];
  affected_sprints: { id: number; name: string }[];
}

export interface DurationWarning {
  type: 'long_duration' | 'short_duration';
  description: string;
  total_duration_days: number;
}

export interface PoolStats {
  usage_count: number;
  last_assigned?: Date;
  accounts_assigned: number;
  total_assignments: number;
  completed_assignments: number;
  completion_rate: number;
}

export interface AssignmentOptions {
  strategy: 'random' | 'balanced' | 'manual';
  account_ids?: number[];
  max_assignments?: number;
  start_date?: Date;
  respect_cooldowns?: boolean;
}

export interface AssignmentResult {
  successful_assignments: PoolAssignment[];
  failed_assignments: FailedAssignment[];
  total_accounts_assigned: number;
  conflicts_resolved: number;
  warnings: AssignmentWarning[];
}

export interface PoolAssignment {
  account_id: number;
  pool_id: number;
  sprint_ids: number[];
  assignment_date: Date;
  start_date: Date;
  strategy_used: string;
}

export interface FailedAssignment {
  account_id: number;
  pool_id: number;
  reason: string;
  conflict_type: 'cooldown' | 'location' | 'seasonal' | 'blocking' | 'other';
}

export interface AssignmentWarning {
  type: 'compatibility' | 'timing' | 'conflict';
  message: string;
  affected_accounts?: number[];
}

export interface BulkAssignmentRequest {
  pool_assignments: {
    pool_id: number;
    options: AssignmentOptions;
  }[];
}

export interface BulkAssignmentResult {
  successful_pools: number;
  failed_pools: number;
  total_accounts_assigned: number;
  assignment_results: AssignmentResult[];
  overall_warnings: AssignmentWarning[];
}

export interface PoolTemplate {
  id: number;
  name: string;
  description?: string;
  template_category: string;
  sprint_types: string[];
  usage_count: number;
  created_at: Date;
}

export interface PoolAnalytics {
  pool_id: number;
  pool_name: string;
  total_assignments: number;
  successful_assignments: number;
  completion_rate: number;
  average_duration_days: number;
  accounts_reached: number;
  last_assigned: Date;
  performance_score: number;
} 