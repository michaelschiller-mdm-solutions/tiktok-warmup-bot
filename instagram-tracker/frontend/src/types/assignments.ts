// Assignment types for sprint and content management

export interface SprintAssignment {
  id: number;
  account_id: number;
  sprint_id: number;
  assignment_date: string;
  start_date?: string;
  end_date?: string;
  status: 'scheduled' | 'active' | 'completed' | 'paused' | 'cancelled';
  current_content_index: number;
  next_content_due?: string;
  sprint_instance_id: string;
  created_at: string;
  updated_at: string;
  
  // Relations (when populated)
  account?: import('./accounts').Account;
  sprint?: import('./sprintCreation').ContentSprint;
  content_queue?: QueueItem[];
}

export interface QueueItem {
  id: number;
  account_id: number;
  sprint_assignment_id?: number;
  content_item_id?: number;
  scheduled_time: string;
  content_type: 'story' | 'post' | 'highlight';
  status: 'queued' | 'posted' | 'failed' | 'cancelled' | 'retrying';
  posted_at?: string;
  emergency_content: boolean;
  queue_priority: number;
  error_message?: string;
  retry_count: number;
  created_at: string;
  
  // Relations (when populated)
  sprint_assignment?: SprintAssignment;
  content_item?: import('./sprintCreation').SprintContentItem;
}

export interface Assignment {
  id: number;
  account_id: number;
  sprint_id: number;
  assignment_date: string;
  start_date?: string;
  end_date?: string;
  status: AssignmentStatus;
  current_content_index: number;
  next_content_due?: string;
  sprint_instance_id: string;
  created_at: string;
  updated_at: string;
}

export type AssignmentStatus = 'scheduled' | 'active' | 'completed' | 'paused' | 'cancelled';

export interface CreateAssignmentRequest {
  account_id: number;
  sprint_id: number;
  start_date?: string;
}

export interface BulkAssignmentRequest {
  assignments: Array<{
    account_id: number;
    sprint_id: number;
    start_date?: string;
  }>;
}

export interface AssignmentFilters {
  account_id?: number;
  sprint_id?: number;
  status?: AssignmentStatus[];
  start_date_from?: string;
  start_date_to?: string;
  search?: string;
}

export interface AssignmentListResponse {
  assignments: SprintAssignment[];
  total_count: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AssignmentAction {
  type: 'pause' | 'resume' | 'cancel' | 'reschedule' | 'details';
  assignmentId: string;
  payload?: any;
}

export interface ValidationResult {
  is_valid: boolean;
  conflicts: Conflict[];
  warnings: Warning[];
  eligible_accounts: number;
}

export interface Conflict {
  type: 'blocking' | 'location' | 'seasonal' | 'cooldown' | 'resource';
  severity: 'error' | 'warning';
  message: string;
  description: string;
  affected_accounts: number[];
  resolution_options: ConflictResolution[];
}

export interface Warning {
  type: 'performance' | 'resource' | 'timing';
  message: string;
  description: string;
  accounts_affected: number;
}

export interface ConflictResolution {
  type: 'pause' | 'reschedule' | 'override' | 'cancel';
  label: string;
  description: string;
  action: () => Promise<void>;
} 