export type IPhoneModel = 'iphone_8' | 'iphone_x';
export type IPhoneStatus = 'active' | 'inactive' | 'maintenance' | 'offline';
export type ContainerStatus = 'available' | 'assigned' | 'in_use' | 'maintenance' | 'error';

export interface IPhone {
  id: number;
  name: string;
  model: IPhoneModel;
  ip_address: string;
  port: number;
  ssh_user: string;
  xxtouch_port: number;
  status: IPhoneStatus;
  last_seen?: string;
  last_health_check?: string;
  connection_test_success: boolean;
  assigned_bot_id?: string;
  bot_assigned_at?: string;
  container_creation_enabled: boolean;
  automation_enabled: boolean;
  settings: Record<string, any>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface IPhoneDashboard extends IPhone {
  total_containers: number;
  available_containers: number;
  assigned_containers: number;
  in_use_containers: number;
  avg_success_rate: number;
  total_actions_performed: number;
  total_error_count: number;
  connection_status: 'online' | 'idle' | 'offline';
}

export interface IPhoneContainer {
  id: number;
  iphone_id: number;
  container_number: number;
  status: ContainerStatus;
  assigned_account_id?: number;
  assigned_at?: string;
  container_uuid?: string;
  instagram_logged_in: boolean;
  last_used?: string;
  warmup_phases_completed: number;
  total_actions_performed: number;
  last_action_at?: string;
  success_rate: number;
  error_count: number;
  last_error_message?: string;
  last_error_at?: string;
  created_at: string;
  updated_at: string;
  
  // Joined fields
  assigned_account_username?: string;
  account_lifecycle_state?: string;
  assigned_account_email?: string;
  model_name?: string;
}

export interface IPhoneActionLog {
  id: number;
  iphone_id: number;
  container_id?: number;
  account_id?: number;
  action_type: string;
  action_description?: string;
  bot_id?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  success?: boolean;
  result_data?: Record<string, any>;
  error_message?: string;
  error_details?: Record<string, any>;
  response_time_ms?: number;
  retry_count: number;
  created_at: string;
  
  // Joined fields
  account_username?: string;
}

export interface IPhoneDetails {
  iphone: IPhoneDashboard;
  containers: IPhoneContainer[];
  recent_logs: IPhoneActionLog[];
}

export interface CreateIPhoneRequest {
  name: string;
  model: IPhoneModel;
  ip_address: string;
  port?: number;
  ssh_user?: string;
  ssh_password?: string;
  xxtouch_port?: number;
  notes?: string;
}

export interface UpdateIPhoneRequest {
  name?: string;
  model?: IPhoneModel;
  ip_address?: string;
  port?: number;
  ssh_user?: string;
  ssh_password?: string;
  xxtouch_port?: number;
  status?: IPhoneStatus;
  assigned_bot_id?: string;
  container_creation_enabled?: boolean;
  automation_enabled?: boolean;
  notes?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  connection_status: 'connected' | 'failed';
  response_data?: any;
}

export interface BotAssignmentRequest {
  bot_id: string;
} 