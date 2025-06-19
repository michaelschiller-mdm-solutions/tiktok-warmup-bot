export interface EmergencyContent {
  id?: number;
  file_path: string;
  file_name: string;
  caption?: string;
  content_type: 'story' | 'post' | 'highlight';
  priority: 'critical' | 'high' | 'standard';
  location_context?: string;
  theme_context?: string;
  post_immediately: boolean;
}

export interface EmergencyInjectionRequest {
  emergency_content: EmergencyContent;
  target_account_ids?: number[];
  target_all_accounts?: boolean;
  conflict_strategy: 'pause_sprints' | 'post_alongside' | 'override_conflicts' | 'skip_conflicted';
  cooldown_extension_hours?: number;
  scheduled_time?: Date;
}

export interface ConflictAnalysis {
  account_id: number;
  has_conflicts: boolean;
  location_conflicts: LocationConflict[];
  sprint_conflicts: SprintConflict[];
  theme_conflicts: ThemeConflict[];
  recommended_strategy: ConflictStrategy;
  can_proceed: boolean;
}

export interface EmergencyInjectionResult {
  successful_injections: SuccessfulInjection[];
  failed_injections: FailedInjection[];
  conflicts_resolved: ConflictResolution[];
  queue_adjustments: QueueAdjustment[];
  total_accounts_affected: number;
  summary: string;
}

export interface LocationConflict {
  type: 'location_mismatch';
  current_location: string;
  emergency_location: string;
  severity: 'warning' | 'error';
  resolution_options: string[];
}

export interface SprintConflict {
  type: 'sprint_blocking' | 'theme_mismatch';
  active_sprint_id: number;
  sprint_name: string;
  conflict_reason: string;
  resolution_options: string[];
}

export interface ThemeConflict {
  type: 'theme_incompatible';
  current_theme: string;
  emergency_theme: string;
  severity: 'warning' | 'error';
  resolution_options: string[];
}

export interface SuccessfulInjection {
  account_id: number;
  queue_item_id: number;
  scheduled_time: Date;
  strategy_used: ConflictStrategy;
  conflicts_resolved: number;
  adjustments_made: number;
}

export interface FailedInjection {
  account_id: number;
  error: string;
  conflicts: ConflictAnalysis;
  attempted_strategy: ConflictStrategy;
}

export interface ConflictResolution {
  account_id: number;
  conflict_type: string;
  resolution_strategy: string;
  original_state: any;
  new_state: any;
  timestamp: Date;
}

export interface QueueAdjustment {
  type: 'sprint_paused' | 'sprint_resumed' | 'item_rescheduled' | 'item_cancelled' | 'cooldown_extended';
  assignment_id?: number;
  queue_item_id?: number;
  original_time?: Date;
  new_time?: Date;
  original_status?: string;
  new_status?: string;
  pause_time?: Date;
  resume_time?: Date;
  reason: string;
}

export type ConflictStrategy = 'pause_sprints' | 'post_alongside' | 'override_conflicts' | 'skip_conflicted';
export type EmergencyPriority = 'critical' | 'high' | 'standard';

export interface EmergencyContentPreview {
  total_target_accounts: number;
  accounts_with_conflicts: number;
  accounts_skipped: number;
  estimated_successful_injections: number;
  conflict_summary: ConflictSummary;
  recommendations: string[];
}

export interface ConflictSummary {
  location_conflicts: number;
  sprint_conflicts: number;
  theme_conflicts: number;
  high_severity_conflicts: number;
  low_severity_conflicts: number;
}

export interface EmergencyContentStats {
  total_injections: number;
  successful_injections: number;
  failed_injections: number;
  conflicts_resolved: number;
  avg_resolution_time_seconds: number;
  most_common_conflict_type: string;
  most_used_strategy: ConflictStrategy;
}

export interface EmergencyContentLog {
  id: number;
  timestamp: Date;
  user_id?: number;
  emergency_content: EmergencyContent;
  request: EmergencyInjectionRequest;
  result: EmergencyInjectionResult;
  execution_time_ms: number;
} 