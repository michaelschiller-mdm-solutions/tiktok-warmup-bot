// Account data types for the Instagram Tracker application
// Includes proxy management, cost tracking, and analytics features

export interface Account {
  id: number;
  model_id: number;
  username: string;
  password: string;
  email: string;
  email_password?: string;
  container_number?: number;
  account_code?: string;
  display_name?: string;
  bio?: string;
  status: 'active' | 'banned' | 'suspended' | 'inactive';
  creation_date?: string;
  device_info: Record<string, any>;
  profile_picture_url?: string;
  location?: string;
  birth_date?: string;
  last_activity?: string;
  created_at: string;
  updated_at: string;
  
  // Lifecycle management
  lifecycle_state: 'imported' | 'ready' | 'warmup' | 'active' | 'paused' | 'cleanup' | 'archived';
  state_changed_at: string;
  state_changed_by?: string;
  state_notes?: string;
  
  // Order tracking fields
  order_number?: string;
  import_source?: string;
  import_batch_id?: string;
  imported_at?: string;
  
  // Extended fields
  content_type?: string;
  campus?: string;
  niche?: string;
  cta_text?: string;
  mother_account_id?: number;
  
  // Proxy management fields
  proxy_host?: string;
  proxy_port?: number;
  proxy_username?: string;
  proxy_provider?: string;
  proxy_status: 'active' | 'inactive' | 'error' | 'unknown';
  proxy_location?: string;
  proxy_last_checked?: string;
  
  // Integration fields
  adspower_profile_id?: string;
  cupid_profile_id?: string;
  cupid_system_prompt?: string;
  
  // Performance tracking fields
  follow_back_rate: number;
  conversion_rate: number;
  total_follows: number;
  total_conversions: number;
  last_activity_check?: string;
  
  // Cost allocation
  monthly_cost: number;
  
  // Phase-specific fields for warmup pipeline
  new_username?: string;
  assigned_content?: string;
  phase_status?: string;
  
  // Relations
  model_name?: string;
  mother_account?: Account;
  slave_accounts?: Account[];
}

export interface CreateAccountRequest {
  model_id: number;
  username: string;
  password: string;
  email: string;
  email_password?: string;
  container_number?: number;
  account_code?: string;
  display_name?: string;
  bio?: string;
  content_type?: string;
  campus?: string;
  niche?: string;
  cta_text?: string;
  mother_account_id?: number;
  
  // Proxy management
  proxy_host?: string;
  proxy_port?: number;
  proxy_username?: string;
  proxy_password?: string;
  proxy_provider?: string;
  proxy_location?: string;
  
  // Integration
  adspower_profile_id?: string;
  cupid_profile_id?: string;
  cupid_system_prompt?: string;
  
  // Cost
  monthly_cost?: number;
}

export interface UpdateAccountRequest {
  username?: string;
  password?: string;
  email?: string;
  email_password?: string;
  container_number?: number;
  account_code?: string;
  display_name?: string;
  bio?: string;
  status?: 'active' | 'banned' | 'suspended' | 'inactive';
  content_type?: string;
  campus?: string;
  niche?: string;
  cta_text?: string;
  mother_account_id?: number;
  
  // Proxy management
  proxy_host?: string;
  proxy_port?: number;
  proxy_username?: string;
  proxy_password?: string;
  proxy_provider?: string;
  proxy_location?: string;
  
  // Integration
  adspower_profile_id?: string;
  cupid_profile_id?: string;
  cupid_system_prompt?: string;
  
  // Cost
  monthly_cost?: number;
}

export interface AccountPerformanceAnalysis extends Account {
  model_name: string;
  total_revenue: number;
  net_profit: number;
  total_follow_attempts: number;
  successful_follow_backs: number;
  total_conversion_events: number;
  follow_back_rank: number;
  conversion_rank: number;
  profit_rank: number;
}

export interface ProxyProvider {
  id: number;
  name: string;
  base_url?: string;
  monthly_cost_per_proxy: number;
  setup_fee: number;
  api_endpoint?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountRelationship {
  id: number;
  mother_account_id: number;
  slave_account_id: number;
  relationship_type: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  mother_account?: Account;
  slave_account?: Account;
}

export interface DynamicColumn {
  id: number;
  model_id: number;
  column_name: string;
  column_type: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';
  column_order: number;
  is_visible: boolean;
  is_required: boolean;
  default_value?: string;
  validation_rules: Record<string, any>;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface AccountDynamicData {
  id: number;
  account_id: number;
  dynamic_column_id: number;
  value_text?: string;
  value_number?: number;
  value_date?: string;
  value_boolean?: boolean;
  created_at: string;
  updated_at: string;
  dynamic_column?: DynamicColumn;
}

export interface PerformanceSnapshot {
  id: number;
  account_id: number;
  model_id: number;
  snapshot_date: string;
  total_follows: number;
  total_unfollows: number;
  total_follow_backs: number;
  total_conversions: number;
  follow_back_rate: number;
  conversion_rate: number;
  revenue_generated: number;
  costs_incurred: number;
  net_profit: number;
  created_at: string;
}

export interface BulkAccountImport {
  accounts: CreateAccountRequest[];
  validate_only?: boolean;
  skip_duplicates?: boolean;
}

export interface BulkAccountImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    field?: string;
    message: string;
    data?: any;
  }>;
}

export interface AccountFilters {
  model_id?: number;
  status?: string[];
  lifecycle_state?: string[];
  content_type?: string[];
  niche?: string[];
  proxy_provider?: string[];
  proxy_status?: string[];
  follow_back_rate_min?: number;
  follow_back_rate_max?: number;
  conversion_rate_min?: number;
  conversion_rate_max?: number;
  monthly_cost_min?: number;
  monthly_cost_max?: number;
  search?: string;
}

export interface AccountSort {
  field: string;
  direction: 'asc' | 'desc';
}

export interface AccountListResponse {
  accounts: Account[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
  filters?: AccountFilters;
  sort?: AccountSort;
} 