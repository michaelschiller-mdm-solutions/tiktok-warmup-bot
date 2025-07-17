// Backend Campaign Pool Types
// These are the core types needed by the backend services

// Campaign Pool Types - Content Collections for Instagram Posting
export interface CampaignPool {
  id: number;
  name: string;
  description?: string;
  pool_type: 'story' | 'post' | 'highlight';
  content_format?: 'single' | 'multi';
  highlight_caption?: string;
  content_order?: 'chronological' | 'random';
  default_delay_hours?: number;
  max_items_per_batch?: number;
  auto_add_to_highlights?: boolean;
  target_highlight_groups?: number[];
  blocked_by_sprint_types?: string[];
  sprint_ids: number[];
  total_duration_hours: number;
  compatible_accounts: number;
  assignment_strategy: 'random' | 'balanced' | 'manual';
  time_horizon_days: number;
  is_template: boolean;
  template_category?: string;
  sprint_names?: string[];
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

// Campaign Pool Content Item (persisted)
export interface CampaignPoolContent {
  id: number;
  pool_id: number;
  file_path: string;
  file_name: string;
  content_order: number;
  custom_delay_hours?: number;
  caption?: string;
  content_type: 'story' | 'post' | 'highlight';
  post_group_id?: number;
  batch_number?: number;
  add_to_highlights: boolean;
  created_at: string;
}

// Pool Creation Request
export interface CreateCampaignPoolRequest {
  name: string;
  description?: string;
  pool_type: 'story' | 'post' | 'highlight';
  content_files?: any[]; // File uploads handled differently in backend
  content_format?: 'single' | 'multi';
  highlight_caption?: string;
  content_order?: 'chronological' | 'random';
  default_delay_hours?: number;
  max_items_per_batch?: number;
  auto_add_to_highlights?: boolean;
  target_highlight_groups?: number[];
  blocked_by_sprint_types?: string[];
  sprint_ids: number[];
  assignment_strategy?: 'random' | 'balanced' | 'manual';
  time_horizon_days?: number;
}

// Pool Update Request
export interface UpdateCampaignPoolRequest {
  name?: string;
  description?: string;
  assignment_strategy?: 'random' | 'balanced' | 'manual';
  time_horizon_days?: number;
  time_spacing_hours?: number;
  respect_cooldowns?: boolean;
  is_template?: boolean;
  template_category?: string;
  sprint_ids?: number[];
  total_duration_hours?: number;
  compatible_accounts?: number;
}

// Missing interfaces for routes
export interface CreatePoolContentRequest {
  pool_id: number;
  file_path: string;
  file_name: string;
  content_order: number;
  custom_delay_hours?: number;
  caption?: string;
  content_type: 'story' | 'post' | 'highlight';
  post_group_id?: number;
  batch_number?: number;
  add_to_highlights: boolean;
  story_only?: boolean;
}

export interface UpdatePoolContentRequest {
  file_path?: string;
  file_name?: string;
  content_order?: number;
  custom_delay_hours?: number;
  caption?: string;
  content_type?: 'story' | 'post' | 'highlight';
  post_group_id?: number;
  batch_number?: number;
  add_to_highlights?: boolean;
}

export interface CampaignPoolListResponse {
  pools: CampaignPool[];
  total_count: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface PoolContentListResponse {
  content_items: CampaignPoolContent[];
  pool_info?: any;
  total_count: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface SprintBlockingInfo {
  sprint_id: number;
  sprint_name: string;
  blocked_by: string[];
  conflicts: string[];
  description?: string;
}

export interface PoolUsageStats {
  pool_id: number;
  total_assignments: number;
  active_assignments: number;
  completed_assignments: number;
  success_rate: number;
  last_used: string;
}

// Pool Assignment to Accounts
export interface PoolAssignment {
  id?: number;
  account_id: number;
  pool_id: number;
  assignment_date: string;
  status?: 'scheduled' | 'active' | 'completed' | 'paused';
  progress_percentage?: number;
  current_content_index?: number;
  next_content_due?: string;
  created_at?: string;
  sprint_ids?: number[];
  start_date?: string;
  strategy_used?: string;
}

// Pool Analytics
export interface PoolAnalytics {
  pool_id: number;
  assigned_accounts: number;
  content_posted: number;
  completion_rate: number;
  average_engagement: number;
  success_rate: number;
  last_updated: string;
}

// Pool Statistics
export interface PoolStats {
  total_pools: number;
  total_content_items: number;
  pools_by_type: {
    story: number;
    post: number;
    highlight: number;
  };
  content_by_type?: {
    story: number;
    post: number;
    highlight: number;
  };
  average_items_per_pool: number;
  most_used_pool_type: 'story' | 'post' | 'highlight';
  usage_count?: number;
  last_assigned?: string;
  accounts_assigned?: number;
  total_assignments?: number;
  completed_assignments?: number;
}

// Pool Filters for listing
export interface PoolFilters {
  search?: string;
  pool_type?: 'story' | 'post' | 'highlight' | 'all';
  content_format?: 'single' | 'multi' | 'all';
  blocked_by_sprint?: string;
  strategy?: 'random' | 'balanced' | 'manual' | 'all';
  template_status?: 'template' | 'pool' | 'all';
  sort_by?: 'name' | 'created_at' | 'estimated_duration' | 'pool_type' | 'content_count';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

// Pool List Response
export interface PoolListResponse {
  pools: CampaignPool[];
  total_count: number;
  has_next: boolean;
  has_previous: boolean;
  filters_applied: PoolFilters;
}

// Assignment Options
export interface AssignmentOptions {
  strategy: 'immediate' | 'scheduled' | 'manual' | 'random' | 'balanced';
  start_date?: string;
  priority: 'low' | 'normal' | 'high';
  account_filters?: any;
  dry_run?: boolean;
  account_ids?: number[];
  max_assignments?: number;
}

// Assignment Request
export interface AssignmentRequest {
  pool_id: number;
  account_ids: number[];
  assignment_strategy: 'immediate' | 'scheduled';
  start_date?: string;
  priority: 'low' | 'normal' | 'high';
}

// Assignment Response
export interface AssignmentResponse {
  successful_assignments: PoolAssignment[];
  failed_assignments: Array<{
    account_id: number;
    reason: string;
  }>;
  total_accounts_assigned: number;
  conflicts_resolved: number;
  warnings: string[];
}

// Assignment Result (for service methods)
export interface AssignmentResult {
  successful_assignments: PoolAssignment[];
  failed_assignments: FailedAssignment[];
  total_accounts_assigned: number;
  conflicts_resolved: number;
  warnings: AssignmentWarning[];
  assignment_preview?: PoolAssignment[];
  eligible_accounts?: number;
  potential_conflicts?: AssignmentWarning[];
}

export interface FailedAssignment {
  account_id: number;
  reason: string;
  error_code?: string;
  pool_id?: number;
  conflict_type?: string;
}

export interface AssignmentWarning {
  type: 'location_conflict' | 'schedule_conflict' | 'content_conflict' | 'capacity_warning' | 'timing' | 'compatibility';
  message: string;
  severity: 'low' | 'medium' | 'high';
  account_id?: number;
  details?: any;
  affected_accounts?: number[];
}

export interface BulkAssignmentRequest {
  pool_ids?: number[];
  account_ids?: number[];
  pool_assignments: { pool_id: number, account_ids: number[] }[];
  assignment_strategy: 'immediate' | 'scheduled';
  start_date?: string;
  priority: 'low' | 'normal' | 'high';
  options?: AssignmentOptions;
}

export interface BulkAssignmentResult {
  successful_pools: number;
  failed_pools: number;
  failed_assignments: number;
  assignment_details: AssignmentResult[];
  summary: {
    total_pools: number;
    total_accounts: number;
    success_rate: number;
    warnings: AssignmentWarning[];
  };
  total_accounts_assigned?: number;
}

// Compatibility Report
export interface CompatibilityReport {
  is_compatible: boolean;
  compatible_accounts: number;
  total_conflicts: number;
  blocking_conflicts: SprintBlockingInfo[];
  location_conflicts: string[];
  seasonal_restrictions: string[];
  seasonal_issues?: any[];
  estimated_success_rate: number;
  message?: string;
  duration_warnings?: any[];
  account_eligibility_count?: number;
}

// Create Pool Request (alias)
export interface CreatePoolRequest extends CreateCampaignPoolRequest {}

// Update Pool Request (alias)  
export interface UpdatePoolRequest extends UpdateCampaignPoolRequest {}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  metadata?: {
    total_records?: number;
    page?: number;
    limit?: number;
    has_next?: boolean;
    has_previous?: boolean;
  };
}

// Error response
export interface ApiError {
  success: false;
  error: string;
  message: string;
  details?: any;
}

// Validation result
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
} 