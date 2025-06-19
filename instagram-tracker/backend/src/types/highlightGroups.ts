export interface HighlightGroup {
  id: number;
  name: string;
  description?: string;
  sprint_type: string;
  location?: string;
  is_highlight_group: true;
  max_content_items: number;
  available_months: number[];
  cooldown_hours: number;
  blocks_sprints: number[];
  blocks_highlight_groups: number[];
  maintenance_images_min: number;
  maintenance_images_max: number;
  maintenance_frequency_weeks_min: number;
  maintenance_frequency_weeks_max: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateHighlightGroupRequest {
  name: string;
  description?: string;
  sprint_type: string;
  location?: string;
  max_content_items?: number;
  available_months?: number[];
  cooldown_hours?: number;
  blocks_sprints?: number[];
  blocks_highlight_groups?: number[];
  maintenance_images_min?: number;
  maintenance_images_max?: number;
  maintenance_frequency_weeks_min?: number;
  maintenance_frequency_weeks_max?: number;
}

export interface UpdateHighlightGroupRequest {
  name?: string;
  description?: string;
  sprint_type?: string;
  location?: string;
  max_content_items?: number;
  available_months?: number[];
  cooldown_hours?: number;
  blocks_sprints?: number[];
  blocks_highlight_groups?: number[];
  maintenance_images_min?: number;
  maintenance_images_max?: number;
  maintenance_frequency_weeks_min?: number;
  maintenance_frequency_weeks_max?: number;
}

export interface HighlightGroupAssignment {
  id: number;
  account_id: number;
  highlight_group_id: number;
  highlight_name: string;
  position: number;
  is_warmup_highlight: boolean;
  maintenance_last_run?: Date;
  maintenance_next_due?: Date;
  maintenance_frequency_hours: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AssignHighlightGroupRequest {
  account_ids: number[];
  highlight_name: string;
  maintenance_frequency_hours?: number;
  is_active?: boolean;
}

export interface MaintenanceScheduleRequest {
  account_ids?: number[];
  maintenance_frequency_hours?: number;
  immediate_execution?: boolean;
}

export interface PositionUpdateRequest {
  highlight_assignments: Array<{
    assignment_id: number;
    new_position: number;
  }>;
}

export interface ContentBatch {
  id: number;
  highlight_group_id: number;
  batch_name: string;
  available_months: number[];
  content_item_ids: number[];
  is_active: boolean;
  created_at: Date;
}

export interface CreateContentBatchRequest {
  batch_name: string;
  available_months: number[];
  content_item_ids: number[];
  is_active?: boolean;
}

export interface HighlightGroupAnalytics {
  highlight_group_id: number;
  total_assignments: number;
  active_assignments: number;
  maintenance_executions_30d: number;
  avg_maintenance_frequency: number;
  content_items_used: number;
  position_distribution: Record<number, number>;
  monthly_activity: Array<{
    month: string;
    maintenance_count: number;
    new_assignments: number;
  }>;
}

export interface HighlightGroupFilters {
  sprint_type?: string;
  location?: string;
  search?: string;
  is_active?: boolean;
}

export interface HighlightGroupListResponse {
  highlight_groups: HighlightGroup[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface AssignmentResult {
  successful_assignments: HighlightGroupAssignment[];
  failed_assignments: Array<{
    account_id: number;
    error: string;
  }>;
  total_assigned: number;
}

export interface MaintenanceStatus {
  highlight_group_id: number;
  highlight_group_name: string;
  total_accounts: number;
  accounts_due_for_maintenance: number;
  next_maintenance_due?: Date;
  avg_days_between_maintenance: number;
  last_maintenance_executed?: Date;
}

export interface SystemMaintenanceOverview {
  total_highlight_groups: number;
  groups_requiring_maintenance: number;
  accounts_with_overdue_maintenance: number;
  maintenance_executions_today: number;
  maintenance_executions_this_week: number;
  average_maintenance_frequency_hours: number;
} 