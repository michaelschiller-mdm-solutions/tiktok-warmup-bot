// Frontend Campaign Pool Types
// Extends backend types with additional UI-specific properties

// Campaign Pool Types - Content Collections for Instagram Posting
// Updated to reflect actual content collections (not sprint bundling)

// Content Item for upload and management
export interface ContentItem {
  id: string;
  file: File;
  preview: string;
  caption: string;
  content_type: 'story' | 'post' | 'highlight';
  custom_delay_hours?: number;
  post_group_id?: number;
  batch_number?: number;
  add_to_highlights: boolean;
  content_order: number;
}

// NEW: Content Sprint interface for pool creation
export interface ContentSprint {
  id: number;
  name: string;
  description?: string;
  sprint_type: string;
  location: string;
  is_highlight_group: boolean;
  content_items_count: number;
  blocks_sprints: number[];
  available_months: number[];
  cooldown_hours: number;
  created_at: string;
}

// NEW: Compatibility Report for sprint selection
export interface CompatibilityReport {
  compatible_accounts: number;
  total_conflicts: number;
  blocking_conflicts: string[];
  location_conflicts: string[];
  seasonal_restrictions: string[];
  estimated_success_rate: number;
}

// Campaign Pool - Updated for sprint bundling system
export interface CampaignPool {
  id: number;
  name: string;
  description?: string;
  pool_type: 'story' | 'post' | 'highlight';
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

// Pool Creation Request - Updated for sprint bundling
export interface CreateCampaignPoolRequest {
  name: string;
  description?: string;
  pool_type: 'story' | 'post' | 'highlight';
  content_files?: File[];
  // Story-specific
  auto_add_to_highlights?: boolean;
  target_highlight_groups?: number[];
  
  // Post-specific
  content_format?: 'single' | 'multi';

  // Highlight-specific
  content_order?: 'chronological' | 'random';
  default_delay_hours?: number;
  highlight_caption?: string;
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
}

// Existing Highlight Groups for integration
export interface HighlightGroup {
  id: number;
  name: string;
}

// Pool Assignment to Accounts
export interface PoolAssignment {
  id: number;
  account_id: number;
  pool_id: number;
  assignment_date: string;
  status: 'scheduled' | 'active' | 'completed' | 'paused';
  progress_percentage: number;
  current_content_index: number;
  next_content_due?: string;
  created_at: string;
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
  average_items_per_pool: number;
  most_used_pool_type: 'story' | 'post' | 'highlight';
}

// Pool Filters for listing - Updated
export interface PoolFilters {
  search?: string;
  strategy?: 'random' | 'balanced' | 'manual' | 'all';
  template_status?: 'template' | 'pool' | 'all';
  sort_by?: 'name' | 'created_at' | 'estimated_duration';
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

// UI-specific Types

// Creation Step for Wizard - Updated with errors
export interface CreationStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  valid: boolean;
  errors: string[];
}

// NEW: Pool Creation Step (alias for clarity)
export interface PoolCreationStep extends CreationStep {}

// Form Data for Pool Creation - Updated for sprint bundling
export interface PoolFormData {
  name: string;
  description: string;
  selected_sprint_ids: number[];
  compatibility_report?: CompatibilityReport;
  assignment_strategy: 'random' | 'balanced' | 'manual';
  time_horizon_days: number;
  time_spacing_hours: number;
  respect_cooldowns: boolean;
  is_template: boolean;
  template_category: string;
  estimated_accounts: number;
  estimated_duration: number;
}

// Component Props

export interface PoolCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onPoolCreate: (poolData: CreateCampaignPoolRequest) => Promise<void>;
  availableSprints: ContentSprint[];
  templates?: PoolTemplate[];
}

// NEW: Pool Template for reusable configurations
export interface PoolTemplate {
  id: number;
  name: string;
  description?: string;
  category: string;
  sprint_ids: number[];
  assignment_strategy: 'random' | 'balanced' | 'manual';
  time_horizon_days: number;
  time_spacing_hours: number;
  respect_cooldowns: boolean;
  usage_count: number;
  created_at: string;
}

// NEW: Page props interface
export interface CampaignPoolsPageProps {
  className?: string;
}

// NEW: Pool List Filters (alias for backward compatibility)
export interface PoolListFilters extends PoolFilters {}

export interface PoolDetailsModalProps {
  pool: CampaignPool | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: number, updates: UpdateCampaignPoolRequest) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export interface PoolAssignmentModalProps {
  pool: CampaignPool | null;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (poolId: number, accountIds: number[]) => Promise<void>;
  accounts: Account[];
}

// NEW: Assignment Options
export interface AssignmentOptions {
  strategy: 'immediate' | 'scheduled';
  start_date?: string;
  priority: 'low' | 'normal' | 'high';
  account_filters?: AccountFilters;
  dry_run?: boolean;
}

// NEW: Compatibility Check Request
export interface CompatibilityCheck {
  sprint_ids: number[];
  account_filters?: AccountFilters;
  assignment_strategy: 'random' | 'balanced' | 'manual';
}

// NEW: Compatibility Indicator Props
export interface CompatibilityIndicatorProps {
  report: CompatibilityReport | null;
  loading?: boolean;
  className?: string;
}

// File Upload Component Props
export interface FileUploadProps {
  onUpload: (files: FileList) => void;
  maxItems: number;
  acceptedTypes: string[];
  currentCount: number;
}

export interface ContentGridProps {
  items: ContentItem[];
  onRemove: (itemId: string) => void;
  onUpdate: (itemId: string, updates: Partial<ContentItem>) => void;
  onReorder?: (draggedId: string, targetId: string) => void;
  allowReorder: boolean;
  showOrder: boolean;
}

export interface PoolTypeCardProps {
  type: 'story' | 'post' | 'highlight';
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  selected: boolean;
  onClick: () => void;
}

export interface HighlightConfigurationProps {
  caption: string;
  onCaptionChange: (caption: string) => void;
  contentOrder: 'chronological' | 'random';
  onOrderChange: (order: 'chronological' | 'random') => void;
  defaultDelay: number;
  onDelayChange: (delay: number) => void;
  batchSize: number;
  onBatchSizeChange: (size: number) => void;
  disabled?: boolean;
}

export interface HighlightGroupSelectorProps {
  groups: HighlightGroup[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  autoAdd: boolean;
  onAutoAddChange: (autoAdd: boolean) => void;
}

export interface PoolTableProps {
  pools: CampaignPool[];
  loading: boolean;
  onEdit: (pool: CampaignPool) => void;
  onDelete: (id: number) => void;
  onAssign: (pool: CampaignPool) => void;
  onViewDetails: (pool: CampaignPool) => void;
}

export interface PoolTableColumn {
  key: keyof CampaignPool | 'actions' | 'content_count';
  header: string;
  sortable: boolean;
  width?: string;
  render?: (pool: CampaignPool) => React.ReactNode;
}

export interface AssignmentRequest {
  pool_id: number;
  account_ids: number[];
  assignment_strategy: 'immediate' | 'scheduled';
  start_date?: string;
  priority: 'low' | 'normal' | 'high';
}

export interface AssignmentResponse {
  successful_assignments: PoolAssignment[];
  failed_assignments: Array<{
    account_id: number;
    reason: string;
  }>;
  total_accounts_assigned: number;
  conflicts_resolved: number; // Added missing property
  warnings: string[];
}

export interface AssignmentPreview {
  account_id: number;
  account_username: string;
  pool_compatibility: boolean;
  estimated_duration_hours: number;
  content_conflicts: string[];
  success_probability: number;
}

export interface Account {
  id: number;
  username: string;
  model_id: number;
  status: 'active' | 'inactive' | 'suspended';
  current_location?: string;
  active_sprints: number[];
  last_content_posted?: string;
  created_at: string;
}

export interface AccountFilters {
  model_id?: number;
  status?: 'active' | 'inactive' | 'suspended' | 'all';
  search?: string;
  available_only?: boolean;
  location?: string;
}

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

export interface ApiError {
  success: false;
  error: string;
  message: string;
  details?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PoolValidation extends ValidationResult {
  pool_type_issues: string[];
  content_issues: string[];
  configuration_issues: string[];
  highlight_integration_issues: string[];
}

export interface FileUploadProgress {
  file_name: string;
  progress: number;
  status: 'uploading' | 'completed' | 'failed';
  error?: string;
}

export interface UploadResponse {
  successful_uploads: Array<{
    file_name: string;
    file_path: string;
    content_item_id: number;
  }>;
  failed_uploads: Array<{
    file_name: string;
    error: string;
  }>;
  total_size: number;
  upload_duration: number;
}

// Type aliases for backward compatibility
export type CreatePoolRequest = CreateCampaignPoolRequest;
export type UpdatePoolRequest = UpdateCampaignPoolRequest; 