import { Account } from './accounts';

export enum WarmupPhase {
  MANUAL_SETUP = 'manual_setup',
  BIO = 'bio',
  GENDER = 'gender',
  NAME = 'name',
  USERNAME = 'username',
  PROFILE_PICTURE = 'profile_picture',
  FIRST_HIGHLIGHT = 'first_highlight',
  NEW_HIGHLIGHT = 'new_highlight',
  POST_CAPTION = 'post_caption',
  POST_NO_CAPTION = 'post_no_caption',
  STORY_CAPTION = 'story_caption',
  STORY_NO_CAPTION = 'story_no_caption'
}

export enum WarmupPhaseStatus {
  PENDING = 'pending',
  AVAILABLE = 'available',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REQUIRES_REVIEW = 'requires_review'
}

export interface WarmupPhaseData {
  id: number;
  phase: WarmupPhase;
  status: WarmupPhaseStatus;
  available_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  bot_id?: string;
  execution_time_ms?: number;
  assigned_content?: {
    id: number;
    filename: string;
    original_name: string;
    file_path: string;
    content_type: string;
    categories: string[];
  };
  assigned_text?: {
    id: number;
    text_content: string;
    categories: string[];
    template_name?: string;
  };
}

export interface WarmupStatusSummary {
  account_id: number;
  username: string;
  lifecycle_state: string;
  container_number?: number;
  last_bot_action_by?: string;
  last_bot_action_at?: string;
  total_phases: number;
  completed_phases: number;
  available_phases: number;
  failed_phases: number;
  review_phases: number;
  progress_percent: number;
  is_complete: boolean;
  phases: WarmupPhaseData[];
  account_details?: {
    username: string;
    password: string;
    email: string;
    email_password: string;
    container_number: number;
    proxy: string | null;
    proxy_username: string;
    proxy_password: string;
    lifecycle_state: string;
    status: string;
  };
}

export interface WarmupProcessResult {
  success: boolean;
  accountId: number;
  message: string;
  phase?: WarmupPhase;
  phaseId?: number;
  nextPhase?: WarmupPhase;
  warmupComplete?: boolean;
  needsHumanReview?: boolean;
  retryCount?: number;
  containerNumber?: number;
  error?: string;
}

export interface ReadyAccount {
  id: number;
  username: string;
  model_id: number;
  lifecycle_state: string;
  model_name: string;
  container_number?: number;
  total_phases: number;
  completed_phases: number;
  ready_phases: number;
  next_phase_info?: {
    phase: WarmupPhase;
    available_at: string;
  };
}

export interface WarmupStatistics {
  total_accounts: number;
  accounts_in_warmup: number;
  completed_warmups: number;
  total_phases: number;
  completed_phases: number;
  failed_phases: number;
  phases_needing_review: number;
  success_rate_percent: number;
  avg_execution_time_ms: number;
  phase_breakdown: {
    [key in WarmupPhase]?: {
      total: number;
      completed: number;
      failed: number;
      avg_time_ms: number;
    };
  };
}

export interface PhaseScriptSequence {
  phase: WarmupPhase;
  description: string;
  api_scripts: string[];
  lua_scripts: string[];
  requires_content: boolean;
  requires_text: boolean;
  content_categories?: string[];
  text_categories?: string[];
  dependencies?: string[];
  post_execution_action?: string;
}

export interface WarmupAccountWithPhases extends Account {
  current_phase?: WarmupPhase | 'waiting_cooldown';
  phase_status?: WarmupPhaseStatus;
  assigned_content?: string;
  new_username?: string;
  warmup_progress?: number;
  phases?: WarmupPhaseData[];
  next_available_at?: string;
  account_details?: {
    username: string;
    password: string;
    email: string;
    email_password: string;
    container_number: number;
    proxy: string | null;
    proxy_username: string;
    proxy_password: string;
    lifecycle_state: string;
    status: string;
  };
} 