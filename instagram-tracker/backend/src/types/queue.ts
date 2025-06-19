// Queue Management Type Definitions

export interface QueueFilters {
  account_id?: number;
  sprint_assignment_id?: number;
  content_type?: 'story' | 'post' | 'highlight';
  status?: 'queued' | 'posted' | 'failed' | 'cancelled' | 'retrying';
  emergency_content?: boolean;
  scheduled_from?: Date;
  scheduled_to?: Date;
  limit?: number;
  offset?: number;
  sort_by?: 'scheduled_time' | 'created_at' | 'queue_priority' | 'posted_at';
  sort_order?: 'ASC' | 'DESC';
}

export interface QueueStats {
  total_items: number;
  queued_count: number;
  posted_count: number;
  failed_count: number;
  overdue_count: number;
  upcoming_24h: number;
  emergency_count: number;
  accounts_with_queue: number;
  avg_queue_size: number;
}

export interface QueueUpdate {
  item_id: number;
  scheduled_time?: Date;
  content_type?: 'story' | 'post' | 'highlight';
  queue_priority?: number;
  status?: 'queued' | 'posted' | 'failed' | 'cancelled' | 'retrying';
}

export interface BulkUpdateResult {
  updated_count: number;
  failed_count: number;
  errors: Array<{
    item_id: number;
    error_message: string;
  }>;
}

export interface EmergencyContentRequest {
  account_id: number;
  central_content_id?: number;
  central_text_id?: number;
  content_type: 'story' | 'post' | 'highlight';
  strategy: 'pause_sprints' | 'post_alongside' | 'override_conflicts';
  priority: number;
  scheduled_time?: Date;
  reason?: string;
}

export interface ConflictResolution {
  conflicts_detected: number;
  conflicts_resolved: number;
  accounts_affected: number;
  actions_taken: Array<{
    action: string;
    account_id: number;
    details: string;
  }>;
}

export interface ScheduleOptimization {
  account_id: number;
  current_efficiency: number;
  optimized_efficiency: number;
  suggestions: Array<{
    type: 'gap_fill' | 'timing_adjustment' | 'priority_reorder';
    description: string;
    impact: 'low' | 'medium' | 'high';
  }>;
  timeline_conflicts: number;
}

export interface HealthReport {
  overall_status: 'healthy' | 'warning' | 'critical';
  queue_size: number;
  processing_rate: number;
  error_rate: number;
  bottlenecks: Bottleneck[];
  alerts: Alert[];
  last_checked: Date;
}

export interface Bottleneck {
  type: 'high_queue_size' | 'slow_processing' | 'failed_items' | 'overdue_content';
  severity: 'low' | 'medium' | 'high';
  affected_accounts: number;
  description: string;
  suggested_action: string;
}

export interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  account_id?: number;
  queue_item_id?: number;
  created_at: Date;
  requires_action: boolean;
}

export interface ProcessingMetrics {
  items_processed_last_hour: number;
  items_processed_last_24h: number;
  avg_processing_time_ms: number;
  success_rate: number;
  retry_rate: number;
  peak_queue_size_24h: number;
  accounts_processed_24h: number;
}

export interface GanttData {
  accounts: Array<{
    account_id: number;
    username: string;
    timeline_items: TimelineItem[];
  }>;
  time_range: {
    start_date: Date;
    end_date: Date;
  };
  conflicts: TimelineConflict[];
}

export interface TimelineItem {
  id: number;
  type: 'sprint_content' | 'highlight_maintenance' | 'emergency_content' | 'idle_period';
  title: string;
  start_time: Date;
  end_time?: Date;
  content_type: 'story' | 'post' | 'highlight';
  status: 'queued' | 'posted' | 'failed' | 'cancelled';
  sprint_name?: string;
  priority: number;
  conflicts: boolean;
}

export interface Timeline {
  account_id: number;
  username: string;
  items: TimelineItem[];
  total_items: number;
  next_posting_time: Date | null;
  conflicts: TimelineConflict[];
  queue_health: 'good' | 'warning' | 'critical';
}

export interface TimelineConflict {
  type: 'location_conflict' | 'timing_overlap' | 'sprint_blocking' | 'emergency_override';
  severity: 'low' | 'medium' | 'high';
  affected_items: number[];
  description: string;
  suggested_resolution: string;
  account_id: number;
}

export interface QueueItemDetailed {
  id: number;
  account_id: number;
  account_username: string;
  sprint_assignment_id: number | null;
  sprint_name: string | null;
  content_item_id: number | null;
  central_content_id: number | null;
  central_text_id: number | null;
  scheduled_time: Date;
  content_type: 'story' | 'post' | 'highlight';
  status: 'queued' | 'posted' | 'failed' | 'cancelled' | 'retrying';
  posted_at: Date | null;
  emergency_content: boolean;
  emergency_strategy: string | null;
  queue_priority: number;
  error_message: string | null;
  retry_count: number;
  created_at: Date;
  is_overdue: boolean;
  time_until_due: number; // minutes
}

export interface Suggestion {
  type: 'timing' | 'content' | 'priority' | 'conflict_resolution';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'easy' | 'moderate' | 'complex';
  auto_applicable: boolean;
} 