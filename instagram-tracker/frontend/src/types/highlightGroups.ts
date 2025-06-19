// Highlight Groups - Special content pools for Instagram highlights with maintenance automation
export interface HighlightGroup {
  id: number;
  name: string;
  description?: string;
  category: string;                    // travel, lifestyle, fitness, work, etc.
  content_pool_size: number;          // Current number of content items (max 100)
  max_content_items: number;          // Always 100 for highlight groups
  current_position: number;           // Current position in account highlights (1 = first)
  maintenance_frequency_weeks: number; // Every 2-4 weeks
  content_per_maintenance: number;     // 1-2 items per maintenance
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  is_active: boolean;                 // Can be paused
  seasonal_months: number[];          // Months when this group is active
  blocks_sprint_types: string[];      // Sprint types that block this group
  blocks_highlight_groups: number[];  // Other highlight group IDs that block this
  created_at: string;
  updated_at: string;
}

export interface HighlightGroupContentItem {
  id: number;
  highlight_group_id: number;
  file_path: string;
  file_name: string;
  caption?: string;
  seasonal_months: number[];          // Months when this content is available
  usage_count: number;                // How many times this has been used
  last_used_date?: string;
  content_batch: string;              // Seasonal batch identifier (e.g., "summer_2024")
  metadata: {
    hashtags?: string[];
    location?: string;
    mood?: string;                    // happy, relaxed, energetic, etc.
  };
  created_at: string;
}

export interface MaintenanceSchedule {
  id: number;
  highlight_group_id: number;
  scheduled_date: string;
  status: 'pending' | 'approved' | 'completed' | 'failed' | 'cancelled';
  content_items_selected: number[];   // Content item IDs to post
  position_after_maintenance: number; // Expected position after maintenance
  blocking_conflicts: string[];       // Detected conflicts
  override_conflicts: boolean;        // User approved override
  executed_date?: string;
  created_at: string;
}

export interface PositionManagement {
  account_id: number;
  highlight_positions: {
    highlight_group_id: number;
    current_position: number;
    last_updated: string;
  }[];
  reordering_rules: {
    newest_first: boolean;
    manual_overrides: {
      highlight_group_id: number;
      fixed_position: number;
    }[];
  };
}

export interface BlockingRule {
  id: number;
  highlight_group_id: number;
  rule_type: 'blocks_sprint' | 'blocks_highlight' | 'blocked_by_sprint' | 'blocked_by_highlight';
  target_sprint_type?: string;        // For sprint-based blocking
  target_highlight_group_id?: number; // For highlight-based blocking
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface MaintenanceConflict {
  id: string;
  type: 'sprint_conflict' | 'highlight_conflict' | 'position_conflict';
  severity: 'high' | 'medium' | 'low';
  message: string;
  affected_accounts: number[];
  resolution_suggestions: string[];
  can_override: boolean;
}

export interface SeasonalBatch {
  id: string;
  name: string;                       // "Summer 2024", "Winter Holiday", etc.
  months: number[];                   // [6, 7, 8] for summer
  content_count: number;
  year?: number;                      // Optional year restriction
  description?: string;
}

// UI-specific types

export interface HighlightGroupFormData {
  // Step 1: Basic Information
  name: string;
  description: string;
  category: string;
  
  // Step 2: Content Pool
  content_files: File[];
  seasonal_batches: SeasonalBatch[];
  
  // Step 3: Maintenance Schedule
  maintenance_frequency_weeks: number;
  content_per_maintenance: number;
  seasonal_months: number[];
  
  // Step 4: Blocking Rules
  blocks_sprint_types: string[];
  blocks_highlight_groups: number[];
  
  // Step 5: Position Settings
  starting_position: number;
  auto_reorder: boolean;
}

export interface HighlightGroupCreationStep {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  valid: boolean;
  errors: string[];
}

export interface HighlightGroupsPageProps {
  className?: string;
}

export interface HighlightGroupCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreate: (groupData: CreateHighlightGroupRequest) => Promise<void>;
  existingGroups: HighlightGroup[];
}

export interface MaintenanceSchedulerProps {
  group: HighlightGroup;
  onScheduleUpdate: (schedule: Partial<MaintenanceSchedule>) => void;
  conflicts: MaintenanceConflict[];
  showConflicts: boolean;
}

export interface PositionManagerProps {
  groups: HighlightGroup[];
  positionData: PositionManagement[];
  onPositionChange: (groupId: number, newPosition: number) => void;
  previewMode?: boolean;
}

export interface ContentPoolManagerProps {
  groupId: number;
  currentContent: HighlightGroupContentItem[];
  onContentUpdate: (content: HighlightGroupContentItem[]) => void;
  maxItems: number; // Always 100
  seasonalBatches: SeasonalBatch[];
}

export interface HighlightGroupAnalyticsProps {
  group: HighlightGroup;
  analytics: HighlightGroupAnalytics;
  timeRange: 'week' | 'month' | 'quarter' | 'year';
}

export interface HighlightGroupAnalytics {
  group_id: number;
  maintenance_success_rate: number;
  content_rotation_efficiency: number;
  position_stability: number;
  engagement_metrics: {
    average_views: number;
    average_interactions: number;
    click_through_rate: number;
  };
  content_performance: {
    most_effective_content: number[];
    least_effective_content: number[];
    seasonal_preferences: {
      month: number;
      performance_score: number;
    }[];
  };
  last_updated: string;
}

// API Request/Response types

export interface CreateHighlightGroupRequest {
  name: string;
  description?: string;
  category: string;
  maintenance_frequency_weeks: number;
  content_per_maintenance: number;
  seasonal_months: number[];
  blocks_sprint_types: string[];
  blocks_highlight_groups: number[];
  starting_position?: number;
}

export interface UpdateHighlightGroupRequest extends Partial<CreateHighlightGroupRequest> {
  is_active?: boolean;
  current_position?: number;
}

export interface HighlightGroupListResponse {
  groups: HighlightGroup[];
  total_count: number;
  has_next: boolean;
  has_previous: boolean;
}

export interface HighlightGroupFilters {
  search?: string;
  category?: string;
  is_active?: boolean;
  maintenance_due?: boolean;
  position_range?: {
    min: number;
    max: number;
  };
  sort_by?: 'name' | 'created_at' | 'last_maintenance' | 'position';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface MaintenanceScheduleRequest {
  highlight_group_id: number;
  scheduled_date: string;
  content_items_selected: number[];
  override_conflicts?: boolean;
}

export interface PositionUpdateRequest {
  highlight_group_id: number;
  new_position: number;
  account_ids?: number[]; // Optional: specific accounts
  force_update?: boolean; // Override position conflicts
}

export interface ContentUploadRequest {
  highlight_group_id: number;
  files: File[];
  seasonal_batch?: string;
  metadata?: {
    hashtags?: string[];
    location?: string;
    mood?: string;
  };
}

export interface BlockingRuleRequest {
  highlight_group_id: number;
  rule_type: 'blocks_sprint' | 'blocks_highlight';
  target_sprint_type?: string;
  target_highlight_group_id?: number;
  description: string;
} 