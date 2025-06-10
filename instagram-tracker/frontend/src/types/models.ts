// Model data types for the Instagram Tracker application

export interface Model {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'paused';
  unfollow_ratio: number;
  daily_follow_limit: number;
  posting_schedule: Record<string, any>;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  
  // Statistics fields (from API joins)
  account_count?: number;
  active_accounts?: number;
  banned_accounts?: number;
  suspended_accounts?: number;
  total_follows?: number;
  active_follows?: number;
  last_account_activity?: string;
}

export interface CreateModelRequest {
  name: string;
  description?: string;
  unfollow_ratio?: number;
  daily_follow_limit?: number;
  posting_schedule?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface UpdateModelRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive' | 'paused';
  unfollow_ratio?: number;
  daily_follow_limit?: number;
  posting_schedule?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  count?: number;
}

export interface ApiError {
  error: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
  }>;
}

export interface ModelStats {
  totalModels: number;
  activeModels: number;
  totalAccounts: number;
  activeAccounts: number;
  totalFollows: number;
  recentActivity: string;
} 