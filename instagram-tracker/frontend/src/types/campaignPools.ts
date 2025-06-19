// Frontend Campaign Pool Types
// Extends backend types with additional UI-specific properties

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
  is_template?: boolean;
  template_category?: string;
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

export interface PoolFilters {
  strategy?: 'random' | 'balanced' | 'manual';
  is_template?: boolean;
  template_category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface PoolStats {
  usage_count: number;
  last_assigned?: Date;
  accounts_assigned: number;
  total_assignments: number;
  completed_assignments: number;
  completion_rate: number;
}

export interface PoolAssignment {
  account_id: number;
  pool_id: number;
  sprint_ids: number[];
  assignment_date: Date;
  start_date: Date;
  strategy_used: string;
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

// UI-specific types

export interface CompatibilityReport {
  is_compatible: boolean;
  blocking_conflicts: Conflict[];
  seasonal_issues: SeasonalIssue[];
  duration_warnings: DurationWarning[];
  account_eligibility_count: number;
  compatibility_score: number;
}

export interface Conflict {
  id: string;
  type: 'blocking' | 'warning' | 'info';
  sprint_ids: number[];
  message: string;
  resolution_suggestions: string[];
  severity: 'high' | 'medium' | 'low';
}

export interface SeasonalIssue {
  id: string;
  sprint_ids: number[];
  season: string;
  message: string;
  recommendation: string;
}

export interface DurationWarning {
  id: string;
  total_duration: number;
  recommended_duration: number;
  message: string;
  affected_sprints: number[];
}

export interface AssignmentOptions {
  strategy: 'random' | 'balanced' | 'manual';
  account_ids?: number[];
  max_assignments?: number;
  start_date?: Date;
  respect_cooldowns: boolean;
  time_spacing_hours?: number;
}

export interface AssignmentPreview {
  account_id: number;
  account_username: string;
  sprint_assignments: {
    sprint_id: number;
    sprint_name: string;
    start_time: Date;
    end_time: Date;
    conflicts: string[];
  }[];
  total_duration_hours: number;
  success_probability: number;
}

export interface PoolCreationStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  valid: boolean;
  errors: string[];
}

export interface PoolFormData {
  // Step 1: Basic Information
  name: string;
  description: string;
  
  // Step 2: Sprint Selection
  selected_sprint_ids: number[];
  compatibility_report?: CompatibilityReport;
  
  // Step 3: Strategy Configuration
  assignment_strategy: 'random' | 'balanced' | 'manual';
  time_horizon_days: number;
  time_spacing_hours: number;
  respect_cooldowns: boolean;
  
  // Step 4: Template Settings
  is_template: boolean;
  template_category: string;
  
  // Step 5: Review
  estimated_accounts: number;
  estimated_duration: number;
}

// Component Props Interfaces

export interface CampaignPoolsPageProps {
  className?: string;
}

export interface PoolCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onPoolCreate: (poolData: CreatePoolRequest) => Promise<void>;
  availableSprints: ContentSprint[];
  templates: PoolTemplate[];
}

export interface PoolDetailsModalProps {
  pool: CampaignPool | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: number, updates: UpdatePoolRequest) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  sprints: ContentSprint[];
}

export interface PoolAssignmentModalProps {
  pool: CampaignPool | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (poolId: number, assignments: PoolAssignment[]) => Promise<void>;
  accounts: Account[];
}

export interface CompatibilityIndicatorProps {
  report: CompatibilityReport;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  onClick?: () => void;
}

export interface SprintSelectionGridProps {
  sprints: ContentSprint[];
  selectedSprintIds: number[];
  onSelectionChange: (sprintIds: number[]) => void;
  compatibilityReport?: CompatibilityReport;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export interface AccountSelectionTableProps {
  accounts: Account[];
  selectedAccountIds: number[];
  onSelectionChange: (accountIds: number[]) => void;
  filters: AccountFilters;
  onFiltersChange: (filters: AccountFilters) => void;
}

export interface PoolAnalyticsProps {
  analytics: PoolAnalytics;
  pool: CampaignPool;
  showComparison?: boolean;
}

// Table and List Types

export interface PoolTableColumn {
  key: keyof CampaignPool | 'actions' | 'compatibility';
  header: string;
  sortable: boolean;
  width?: string;
  render?: (pool: CampaignPool) => React.ReactNode;
}

export interface PoolListFilters {
  search: string;
  strategy: 'all' | 'random' | 'balanced' | 'manual';
  template_status: 'all' | 'templates' | 'pools';
  template_category: string;
  sort_by: 'name' | 'created_at' | 'usage_count' | 'compatibility';
  sort_order: 'asc' | 'desc';
}

// API Response Types

export interface PoolListResponse {
  pools: CampaignPool[];
  total_count: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface AssignmentResponse {
  success: boolean;
  assignments_created: number;
  conflicts_detected: number;
  failed_assignments: Array<{
    account_id: number;
    reason: string;
  }>;
}

// Import types from other modules
export interface ContentSprint {
  id: number;
  name: string;
  type: string;
  duration_hours: number;
  content_count: number;
  created_at: Date;
}

export interface Account {
  id: number;
  username: string;
  model_id: number;
  status: 'active' | 'inactive' | 'cooldown';
  last_assignment?: Date;
}

export interface AccountFilters {
  model_id?: number;
  status?: 'active' | 'inactive' | 'cooldown';
  search?: string;
  available_only?: boolean;
} 