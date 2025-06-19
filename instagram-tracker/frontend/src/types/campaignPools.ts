// Frontend Campaign Pool Types
// Extends backend types with additional UI-specific properties

// Campaign Pools - Collections of compatible Content Sprints for assignment to accounts
export interface CampaignPool {
  id: number;
  name: string;
  description?: string;
  sprint_ids: number[];           // Array of Content Sprint IDs in this pool
  total_duration_hours: number;  // Calculated duration from all sprints
  compatible_accounts: number;   // Number of accounts that can use this pool
  created_at: string;
  updated_at: string;
}

export interface CreateCampaignPoolRequest {
  name: string;
  description?: string;
  sprint_ids: number[];
}

export interface UpdateCampaignPoolRequest extends Partial<CreateCampaignPoolRequest> {}

// Content Sprints - The actual content workflows that get pooled
export interface ContentSprint {
  id: number;
  name: string;
  description?: string;
  sprint_type: 'vacation' | 'university' | 'home' | 'work' | 'fitness' | 'highlight_group';
  location: string;                    // jamaica, germany, home, university, etc.
  is_highlight_group: boolean;         // true for highlight groups, false for regular sprints
  max_content_items: number;           // 20 for sprints, 100 for highlights
  available_months: number[];          // [4,5,6,7,8,9,10] for seasonal content
  cooldown_hours: number;              // Hours before this can be used again (can be hundreds)
  blocks_sprints: number[];            // Sprint IDs that this blocks
  blocks_highlight_groups: number[];   // Highlight group IDs that this blocks
  content_items_count: number;         // Number of content items in this sprint
  created_at: string;
  updated_at: string;
}

// Content Items within sprints - can include batching for fixed-order pools
export interface SprintContentItem {
  id: number;
  sprint_id: number;
  file_path: string;
  file_name: string;
  caption?: string;
  content_order: number;               // Order within the sprint
  content_categories: string[];        // ['story', 'post', 'highlight']
  story_to_highlight: boolean;         // Auto-move stories to highlights
  post_group_id?: number;              // For batching multiple pictures in fixed-order pools
  delay_hours_min: number;             // Minimum delay (can be hundreds of hours)
  delay_hours_max: number;             // Maximum delay (can be hundreds of hours) 
  is_after_sprint_content: boolean;    // Transition content after main sprint
  created_at: string;
}

// Pool assignment to accounts
export interface PoolAssignment {
  id: number;
  account_id: number;
  pool_id: number;
  assignment_date: string;
  status: 'scheduled' | 'active' | 'completed' | 'paused';
  created_at: string;
}

// Sprint assignment to individual accounts (what actually gets executed)
export interface AccountSprintAssignment {
  id: number;
  account_id: number;
  sprint_id: number;
  assignment_date: string;
  start_date?: string;
  end_date?: string;
  status: 'scheduled' | 'active' | 'completed' | 'paused';
  current_content_index: number;
  next_content_due?: string;
  sprint_instance_id: string;
  created_at: string;
}

// Compatibility checking between sprints
export interface CompatibilityCheck {
  compatible: boolean;
  conflicts: string[];               // List of conflict reasons
  warnings: string[];               // List of potential issues
  sprint_ids: number[];             // Sprints being checked
}

// Assignment strategies for distributing pools to accounts
export interface AssignmentStrategy {
  type: 'random' | 'balanced' | 'manual';
  account_selection: 'all' | 'specific_count' | 'specific_accounts';
  account_count?: number;            // For specific_count strategy
  account_ids?: number[];            // For specific_accounts strategy
  distribution_preference?: 'even' | 'weighted';
}

// Pool analytics and performance
export interface PoolAnalytics {
  pool_id: number;
  assigned_accounts: number;
  completion_rate: number;
  average_engagement: number;
  success_rate: number;
  last_updated: string;
}

// Template for reusable pool configurations
export interface PoolTemplate {
  id: number;
  name: string;
  description?: string;
  sprint_types: string[];           // Types of sprints this template includes
  category: string;                 // vacation, university, lifestyle, etc.
  usage_count: number;
  created_at: string;
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
  usage_count?: number;
}

export interface PoolFilters {
  search?: string;
  strategy?: 'random' | 'balanced' | 'manual';
  template_status?: 'pools' | 'templates';
  template_category?: string;
  sort_by?: 'name' | 'created_at';
  sort_order?: 'asc' | 'desc';
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
  start_date?: string;
  respect_cooldowns?: boolean;
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
  strategy: 'all' | 'random' | 'balanced' | 'manual';
  template_status: 'all' | 'pools' | 'templates';
  sort_by: 'name' | 'created_at';
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
  successful_assignments: PoolAssignment[];
  failed_assignments: any[];
  total_accounts_assigned: number;
  conflicts_resolved: number;
  warnings: string[];
}

// Import types from other modules
export interface Account {
  id: number;
  username: string;
  model_id: number;
  status: string;
  created_at: string;
}

export interface AccountFilters {
  model_id?: number;
  status?: 'active' | 'inactive' | 'cooldown';
  search?: string;
  available_only?: boolean;
} 