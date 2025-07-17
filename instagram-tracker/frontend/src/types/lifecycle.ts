// Account Lifecycle State Management Types

export enum AccountLifecycleState {
  IMPORTED = 'imported',
  READY = 'ready',
  READY_FOR_BOT_ASSIGNMENT = 'ready_for_bot_assignment',
  WARMUP = 'warmup',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLEANUP = 'cleanup',
  MAINTENANCE = 'maintenance',
  ARCHIVED = 'archived'
}

export interface StateTransition {
  id: number;
  account_id: number;
  from_state: AccountLifecycleState | null;
  to_state: AccountLifecycleState;
  transition_reason?: string;
  validation_passed: boolean;
  validation_errors?: ValidationError[];
  changed_by?: string;
  changed_at: string;
  notes?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface StateValidationRule {
  id: number;
  state: AccountLifecycleState;
  requires_proxy: boolean;
  requires_model_assignment: boolean;
  requires_warmup_completion: boolean;
  requires_profile_configuration: boolean;
  requires_no_active_errors: boolean;
  custom_validation_rules?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface StateValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  missingRequirements: string[];
  canTransition: boolean;
}

export interface StateTransitionRequest {
  account_id: number;
  to_state: AccountLifecycleState;
  reason?: string;
  notes?: string;
  force?: boolean; // Skip validation if true
}

export interface BulkStateTransitionRequest {
  account_ids: number[];
  to_state: AccountLifecycleState;
  reason?: string;
  notes?: string;
  force?: boolean;
}

export interface BulkStateTransitionResult {
  successful: number[];
  failed: Array<{
    account_id: number;
    error: string;
    validation_errors?: ValidationError[];
  }>;
  total_processed: number;
  success_count: number;
  failure_count: number;
}

export interface LifecycleSummary {
  lifecycle_state: AccountLifecycleState;
  account_count: number;
  percentage: number;
}

export interface AccountWithLifecycle {
  id: number;
  username: string;
  lifecycle_state: AccountLifecycleState;
  state_changed_at: string;
  state_changed_by?: string;
  state_notes?: string;
  // Include other account fields as needed
  model_id: number;
  proxy_host?: string;
  proxy_port?: number;
  status: string;
}

// State transition matrix - defines valid transitions
export const VALID_TRANSITIONS: Record<AccountLifecycleState, AccountLifecycleState[]> = {
  [AccountLifecycleState.IMPORTED]: [AccountLifecycleState.READY, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.READY]: [AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT, AccountLifecycleState.WARMUP, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT]: [AccountLifecycleState.WARMUP, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.WARMUP]: [AccountLifecycleState.MAINTENANCE, AccountLifecycleState.PAUSED, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.ACTIVE]: [AccountLifecycleState.PAUSED, AccountLifecycleState.CLEANUP, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.PAUSED]: [AccountLifecycleState.ACTIVE, AccountLifecycleState.CLEANUP, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.CLEANUP]: [AccountLifecycleState.READY, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.MAINTENANCE]: [AccountLifecycleState.PAUSED, AccountLifecycleState.CLEANUP, AccountLifecycleState.ARCHIVED],
  [AccountLifecycleState.ARCHIVED]: [] // Terminal state
};

// State display configuration
export const STATE_CONFIG: Record<AccountLifecycleState, {
  label: string;
  color: string;
  bgColor: string;
  description: string;
  icon: string;
}> = {
  [AccountLifecycleState.IMPORTED]: {
    label: 'Imported',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    description: 'Account just imported, needs initial setup',
    icon: 'Upload'
  },
  [AccountLifecycleState.READY]: {
    label: 'Ready',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    description: 'Account configured and ready for warmup',
    icon: 'CheckCircle'
  },
  [AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT]: {
    label: 'Ready for Bot Assignment',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    description: 'Account has verification code and ready for content assignment',
    icon: 'Smartphone'
  },
  [AccountLifecycleState.WARMUP]: {
    label: 'Warmup',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    description: 'Account in warmup process',
    icon: 'Clock'
  },
  [AccountLifecycleState.ACTIVE]: {
    label: 'Active',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    description: 'Account ready for automation',
    icon: 'Play'
  },
  [AccountLifecycleState.PAUSED]: {
    label: 'Paused',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    description: 'Account temporarily disabled',
    icon: 'Pause'
  },
  [AccountLifecycleState.CLEANUP]: {
    label: 'Cleanup',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    description: 'Account being prepared for reassignment',
    icon: 'RefreshCw'
  },
  [AccountLifecycleState.MAINTENANCE]: {
    label: 'Maintenance',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    description: 'Account completed warmup and in maintenance mode',
    icon: 'Settings'
  },
  [AccountLifecycleState.ARCHIVED]: {
    label: 'Archived',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    description: 'Account no longer in use',
    icon: 'Archive'
  }
};

// Helper functions
export const isValidTransition = (from: AccountLifecycleState, to: AccountLifecycleState): boolean => {
  return VALID_TRANSITIONS[from].includes(to);
};

export const getAvailableTransitions = (currentState: AccountLifecycleState): AccountLifecycleState[] => {
  return VALID_TRANSITIONS[currentState] || [];
};

export const getStateConfig = (state: AccountLifecycleState) => {
  return STATE_CONFIG[state];
};

export const isTerminalState = (state: AccountLifecycleState): boolean => {
  return VALID_TRANSITIONS[state].length === 0;
}; 