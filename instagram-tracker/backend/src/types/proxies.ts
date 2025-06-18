// Proxy Management Types
// Author: AI Agent
// Date: 2025-01-27

export interface ProxyProvider {
  id: number;
  name: string;
  monthly_cost_per_proxy: number;
  contact_email?: string;
  service_type: 'residential' | 'datacenter' | 'mobile';
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateProxyProviderRequest {
  name: string;
  monthly_cost_per_proxy: number;
  contact_email?: string;
  service_type: 'residential' | 'datacenter' | 'mobile';
  status?: 'active' | 'inactive' | 'suspended';
  notes?: string;
}

export interface UpdateProxyProviderRequest extends Partial<CreateProxyProviderRequest> {}

export interface Proxy {
  id: number;
  provider_id: number;
  ip: string;
  port: number;
  username: string;
  password_encrypted: string;
  location?: string;
  status: 'active' | 'inactive' | 'error' | 'testing';
  
  // Assignment tracking
  assigned_model_id?: number;
  account_count: number;
  max_accounts: number;
  
  // Health monitoring
  last_tested_at?: string;
  last_success_at?: string;
  last_error_message?: string;
  response_time_ms?: number;
  
  // Metadata
  created_at: string;
  updated_at: string;
  
  // Relationships
  provider?: ProxyProvider;
}

export interface CreateProxyRequest {
  provider_id: number;
  ip: string;
  port: number;
  username: string;
  password: string; // Will be encrypted before storage
  location?: string;
  status?: 'active' | 'inactive' | 'error' | 'testing';
  max_accounts?: number;
}

export interface UpdateProxyRequest extends Partial<Omit<CreateProxyRequest, 'password'>> {
  password?: string; // Will be encrypted if provided
}

export interface ProxyAssignmentHistory {
  id: number;
  proxy_id: number;
  account_id: number;
  model_id: number;
  action: 'assigned' | 'released' | 'reassigned' | 'failed';
  reason?: string;
  assigned_by?: string;
  details?: Record<string, any>;
  created_at: string;
  
  // Relationships
  proxy?: Proxy;
  account?: {
    id: number;
    username: string;
  };
  model?: {
    id: number;
    name: string;
  };
}

export interface AvailableProxy {
  proxy_id: number;
  ip: string;
  port: number;
  location?: string;
  account_count: number;
  max_accounts: number;
  provider_name: string;
  available_slots: number;
}

export interface ProxyAssignmentResult {
  success: boolean;
  message: string;
  proxy_id?: number;
  account_id: number;
}

export interface ProxyTestResult {
  success: boolean;
  response_time_ms?: number;
  error_message?: string;
  tested_at: string;
}

export interface ProxyStats {
  total_proxies: number;
  active_proxies: number;
  assigned_proxies: number;
  available_slots: number;
  total_capacity: number;
  utilization_percentage: number;
  providers: {
    [provider_name: string]: {
      proxy_count: number;
      assigned_count: number;
      monthly_cost: number;
    };
  };
}

export interface ProxyFilters {
  provider_id?: number;
  status?: string;
  location?: string;
  assigned_model_id?: number;
  has_available_slots?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProxyProviderStats {
  id: number;
  name: string;
  proxy_count: number;
  active_proxies: number;
  assigned_accounts: number;
  total_capacity: number;
  utilization_percentage: number;
  monthly_cost_total: number;
  avg_response_time_ms?: number;
  last_tested_at?: string;
}

// Error types for proxy operations
export class ProxyError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'ProxyError';
  }
}

export class ProxyAssignmentError extends ProxyError {
  constructor(message: string, public account_id: number, public proxy_id?: number) {
    super(message, 'ASSIGNMENT_ERROR');
    this.name = 'ProxyAssignmentError';
  }
}

export class ProxyConstraintError extends ProxyError {
  constructor(message: string, public constraint: string) {
    super(message, 'CONSTRAINT_ERROR');
    this.name = 'ProxyConstraintError';
  }
}

// Utility types
export type ProxyStatus = 'active' | 'inactive' | 'error' | 'testing';
export type ProxyServiceType = 'residential' | 'datacenter' | 'mobile';
export type ProxyProviderStatus = 'active' | 'inactive' | 'suspended';
export type ProxyAssignmentAction = 'assigned' | 'released' | 'reassigned' | 'failed'; 