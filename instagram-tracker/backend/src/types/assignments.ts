export interface Assignment {
  id: number;
  account_id: number;
  sprint_id: number;
  assignment_date: Date;
  start_date?: Date;
  end_date?: Date;
  status: 'scheduled' | 'active' | 'completed' | 'paused' | 'cancelled';
  current_content_index: number;
  next_content_due?: Date;
  sprint_instance_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface AssignmentOptions {
  start_date?: Date;
  assignment_strategy?: 'random' | 'balanced' | 'manual';
  force_override?: boolean;
  skip_validation?: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  conflicts: Conflict[];
  warnings: Warning[];
  eligibilityChecks: EligibilityCheck[];
}

export interface Conflict {
  type: 'location' | 'blocking' | 'cooldown' | 'seasonal' | 'capacity';
  severity: 'error' | 'warning';
  message: string;
  affected_sprint_id?: number;
  affected_account_id?: number;
  details: Record<string, any>;
}

export interface Warning {
  type: 'performance' | 'content' | 'timing';
  message: string;
  details: Record<string, any>;
}

export interface EligibilityCheck {
  check: 'warmup_complete' | 'account_active' | 'not_in_cooldown' | 'not_idle';
  passed: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface QueueItem {
  account_id: number;
  sprint_assignment_id: number;
  content_item_id: number;
  central_content_id?: number;
  central_text_id?: number;
  scheduled_time: Date;
  content_type: 'story' | 'post' | 'highlight';
  queue_priority: number;
  emergency_content: boolean;
}

export interface Schedule {
  start_date: Date;
  end_date: Date;
  content_items: ScheduledContentItem[];
  total_duration_hours: number;
}

export interface ScheduledContentItem {
  content_item_id: number;
  content_order: number;
  scheduled_time: Date;
  content_type: 'story' | 'post' | 'highlight';
  delay_from_previous_hours: number;
  is_after_sprint_content: boolean;
}

export interface BulkAssignmentRequest {
  assignments: Array<{
    account_id: number;
    sprint_id: number;
    start_date?: Date;
  }>;
  assignment_strategy?: 'random' | 'balanced' | 'manual';
  force_override?: boolean;
}

export interface BulkAssignmentResult {
  successful_assignments: Assignment[];
  failed_assignments: Array<{
    account_id: number;
    sprint_id: number;
    errors: Conflict[];
  }>;
  summary: {
    total_requested: number;
    successful: number;
    failed: number;
    warnings: Warning[];
  };
}

export interface AssignmentFilters {
  account_id?: number;
  sprint_id?: number;
  status?: Assignment['status'];
  model_id?: number;
  date_from?: Date;
  date_to?: Date;
  location?: string;
  sprint_type?: string;
}

export interface AccountAssignmentSummary {
  account_id: number;
  username: string;
  model_id: number;
  active_assignments: number;
  completed_assignments: number;
  last_assignment_date?: Date;
  current_location: string;
  cooldown_until?: Date;
  next_content_due?: Date;
} 