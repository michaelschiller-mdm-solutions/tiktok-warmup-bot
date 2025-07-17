import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Model, CreateModelRequest, UpdateModelRequest, ApiResponse, ApiError } from '../types/models';
import { 
  Account, 
  CreateAccountRequest, 
  UpdateAccountRequest, 
  AccountFilters, 
  AccountListResponse
} from '../types/accounts';
import { 
  FollowBackRateAnalysis, 
  ProfitMarginBreakdown, 
  ConversionFunnelAnalysis, 
  BestPerformerAnalysis 
} from '../types/analytics';

// API client configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000, // Increased for bulk operations
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(this.formatError(error));
      }
    );
  }

  private formatError(error: any): ApiError {
    if (error.response?.data) {
      return error.response.data;
    }
    
    return {
      error: 'Network Error',
      message: error.message || 'An unexpected error occurred',
    };
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  // Model API methods
  async getModels(): Promise<Model[]> {
    const response: AxiosResponse<ApiResponse<Model[]>> = await this.client.get('/models');
    return response.data.data;
  }

  async getModel(id: number): Promise<Model> {
    const response: AxiosResponse<ApiResponse<Model>> = await this.client.get(`/models/${id}`);
    return response.data.data;
  }

  async createModel(modelData: CreateModelRequest): Promise<Model> {
    const response: AxiosResponse<ApiResponse<Model>> = await this.client.post('/models', modelData);
    return response.data.data;
  }

  async updateModel(id: number, modelData: UpdateModelRequest): Promise<Model> {
    const response: AxiosResponse<ApiResponse<Model>> = await this.client.put(`/models/${id}`, modelData);
    return response.data.data;
  }

  async deleteModel(id: number): Promise<{ message: string; details: any }> {
    const response = await this.client.delete(`/models/${id}`);
    return response.data;
  }

  // Account API methods
  async getAccounts(filters?: AccountFilters): Promise<AccountListResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await this.client.get(`/accounts?${params}`);
    
    // Transform backend response to match frontend expectations
    const backendData = response.data.data;
    return {
      accounts: backendData.accounts || [],
      total_count: backendData.pagination?.total_count || 0,
      page: backendData.pagination?.page || 1,
      page_size: backendData.pagination?.limit || 50,
      total_pages: backendData.pagination?.total_pages || 0,
      filters,
      sort: undefined
    };
  }

  async getAccount(id: number): Promise<Account> {
    const response = await this.client.get(`/accounts/${id}`);
    return response.data.data;
  }

  async createAccount(accountData: CreateAccountRequest): Promise<Account> {
    const response = await this.client.post('/accounts', accountData);
    return response.data.data;
  }

  async updateAccount(id: number, accountData: UpdateAccountRequest): Promise<Account> {
    const response = await this.client.put(`/accounts/${id}`, accountData);
    return response.data.data;
  }

  async deleteAccount(id: number): Promise<{ message: string }> {
    const response = await this.client.delete(`/accounts/${id}`);
    return response.data;
  }

  async bulkImportAccounts(importData: any): Promise<any> {
    const response = await this.client.post('/accounts/bulk-import', importData);
    return response.data;
  }

  async getAccountPerformance(id: number): Promise<any> {
    const response = await this.client.get(`/accounts/${id}/performance`);
    return response.data.data;
  }

  async testProxyConnection(accountId: number): Promise<any> {
    const response = await this.client.post(`/accounts/${accountId}/test-proxy`);
    return response.data;
  }

  // Legacy method for backwards compatibility
  async getAccountsByModel(modelId: number): Promise<Account[]> {
    const response = await this.getAccounts({ model_id: modelId });
    return response.accounts || [];
  }

  async getAllAccountsWithAllFields(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    model_id?: number;
    lifecycle_state?: string;
    status?: string;
    sort_by?: string;
    sort_order?: 'ASC' | 'DESC';
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const response = await this.client.get(`/accounts/all-fields?${params}`);
    return response.data;
  }

  // Analytics API methods
  async getAnalytics(): Promise<any> {
    const response = await this.client.get('/analytics/overview');
    return response.data.data;
  }

  async getDashboardAnalytics(filters?: { 
    model_id?: number; 
    date_from?: string; 
    date_to?: string; 
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await this.client.get(`/analytics/dashboard?${params}`);
    return response.data;
  }

  async getFollowBackRates(filters?: {
    model_id?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<FollowBackRateAnalysis> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await this.client.get(`/analytics/follow-back-rates?${params}`);
    return response.data;
  }

  async getProfitMarginBreakdown(modelId?: number): Promise<ProfitMarginBreakdown> {
    const params = new URLSearchParams();
    if (modelId) {
      params.append('model_id', modelId.toString());
    }

    const response = await this.client.get(`/analytics/profit-margin-breakdown?${params}`);
    return response.data;
  }

  async getConversionFunnel(filters?: {
    model_id?: number;
    account_id?: number;
  }): Promise<ConversionFunnelAnalysis> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await this.client.get(`/analytics/conversion-funnel?${params}`);
    return response.data;
  }

  async getBestPerformers(filters?: {
    model_id?: number;
    metric_type?: 'profit' | 'follow_back_rate' | 'conversion_rate' | 'roi';
    limit?: number;
    minimum_follows?: number;
  }): Promise<BestPerformerAnalysis> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const response = await this.client.get(`/analytics/best-performers?${params}`);
    return response.data;
  }

  async getTimeSeries(metric: string = 'follows', period: string = '7d', modelId?: number): Promise<any> {
    const params = new URLSearchParams({ metric, period });
    if (modelId) params.append('model_id', modelId.toString());
    
    const response = await this.client.get(`/analytics/timeseries?${params}`);
    return response.data.data;
  }

  async getModelComparison(): Promise<any> {
    const response = await this.client.get('/analytics/models/comparison');
    return response.data.data;
  }

  async getProxyProviders(): Promise<any[]> {
    const response = await this.client.get('/analytics/proxy-providers');
    return response.data.data;
  }

  // Legacy analytics methods for backwards compatibility
  async getActivityFeed(limit: number = 50, offset: number = 0, modelId?: number): Promise<any> {
    const params = new URLSearchParams({ 
      limit: limit.toString(), 
      offset: offset.toString() 
    });
    if (modelId) params.append('model_id', modelId.toString());

    const response = await this.client.get(`/analytics/activity-feed?${params}`);
    return response.data;
  }

  async getModelPerformance(modelId: number, period: string = '30d'): Promise<any> {
    const response = await this.client.get(`/analytics/models/${modelId}/performance?period=${period}`);
    return response.data.data;
  }

  // Import API methods (placeholder for future tasks)
  async importAccounts(modelId: number, data: string): Promise<any> {
    const response = await this.client.post(`/import/accounts/${modelId}`, { data });
    return response.data;
  }

  // Utility methods for Excel-like operations
  async exportAccountsToCSV(filters?: AccountFilters): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }
    params.append('format', 'csv');

    const response = await this.client.get(`/accounts/export?${params}`, {
      responseType: 'blob'
    });
    
    return new Blob([response.data], { type: 'text/csv' });
  }

  async validateAccountsData(accounts: any[]): Promise<any> {
    const response = await this.client.post('/accounts/bulk-import', {
      accounts,
      validate_only: true
    });
    return response.data;
  }

  // Cost and Revenue tracking methods
  async addRevenue(accountId: number, amount: number, description?: string): Promise<any> {
    const response = await this.client.post('/revenue', {
      account_id: accountId,
      revenue_amount: amount,
      description: description || 'Manual revenue entry'
    });
    return response.data;
  }

  async addCost(accountId: number, categoryId: number, amount: number, description?: string): Promise<any> {
    const response = await this.client.post('/costs', {
      account_id: accountId,
      cost_category_id: categoryId,
      cost_amount: amount,
      description: description || 'Manual cost entry'
    });
    return response.data;
  }

  // Dynamic columns management
  async getDynamicColumns(modelId: number): Promise<any[]> {
    const response = await this.client.get(`/models/${modelId}/dynamic-columns`);
    return response.data.data;
  }

  async createDynamicColumn(modelId: number, columnData: {
    column_name: string;
    column_type: 'text' | 'number' | 'date' | 'boolean';
    default_value?: any;
  }): Promise<any> {
    const response = await this.client.post(`/models/${modelId}/dynamic-columns`, columnData);
    return response.data.data;
  }

  async updateDynamicData(accountId: number, dynamicData: {
    [columnName: string]: any;
  }): Promise<any> {
    const response = await this.client.put(`/accounts/${accountId}/dynamic-data`, dynamicData);
    return response.data.data;
  }

  // Warmup API methods (using regular endpoints, not bot-specific)
  async getWarmupStatus(accountId: number): Promise<any> {
    const response = await this.client.get(`/accounts/${accountId}/warmup-status`);
    return response.data.data;
  }

  async getBatchWarmupStatus(accountIds?: number[], modelId?: number): Promise<Record<number, any>> {
    const params = new URLSearchParams();
    if (accountIds && accountIds.length > 0) {
      params.append('account_ids', accountIds.join(','));
    } else if (modelId) {
      params.append('model_id', modelId.toString());
    }
    
    const response = await this.client.get(`/accounts/warmup/batch-status?${params}`);
    return response.data.data || {};
  }

  async getReadyAccountsForWarmup(modelId?: number, limit: number = 50): Promise<any[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (modelId) params.append('model_id', modelId.toString());
    
    const response = await this.client.get(`/accounts/warmup/ready?${params}`);
    return response.data.data;
  }

  async startWarmupProcess(accountId: number, botId: string, sessionId: string): Promise<any> {
    const response = await this.client.post(`/accounts/${accountId}/start-warmup`, {
      bot_id: botId,
      session_id: sessionId
    });
    return response.data;
  }

  async completeManualSetup(accountId: number, userId: string): Promise<any> {
    const response = await this.client.post(`/accounts/${accountId}/complete-manual-setup`, {
      user_id: userId
    });
    return response.data;
  }

  async markAccountInvalid(accountId: number, reason?: string): Promise<any> {
    const response = await this.client.post(`/accounts/lifecycle/${accountId}/invalidate`, {
      reason: reason || 'Marked as invalid by user'
    });
    return response.data;
  }

  async getAvailableWarmupPhases(accountId: number): Promise<any[]> {
    const response = await this.client.get(`/bot/accounts/${accountId}/available-phases`);
    return response.data.data;
  }

  async getNextAvailablePhase(accountId: number, botId: string): Promise<any> {
    const response = await this.client.get(`/bot/accounts/${accountId}/next-phase?bot_id=${botId}`);
    return response.data.data;
  }

  async startWarmupPhase(accountId: number, phase: string, botId: string, sessionId: string): Promise<any> {
    const response = await this.client.post(`/bot/accounts/${accountId}/phases/${phase}/start`, {
      bot_id: botId,
      session_id: sessionId
    });
    return response.data;
  }

  async completeWarmupPhase(accountId: number, phase: string, botId: string, executionTimeMs?: number, instagramResponse?: any): Promise<any> {
    const response = await this.client.post(`/bot/accounts/${accountId}/phases/${phase}/complete`, {
      bot_id: botId,
      execution_time_ms: executionTimeMs,
      instagram_response: instagramResponse
    });
    return response.data;
  }

  async failWarmupPhase(accountId: number, phase: string, botId: string, errorMessage: string, errorDetails?: any): Promise<any> {
    const response = await this.client.post(`/bot/accounts/${accountId}/phases/${phase}/fail`, {
      bot_id: botId,
      error_message: errorMessage,
      error_details: errorDetails
    });
    return response.data;
  }

  // Sprint API methods
  async getSprintTypes(): Promise<{
    predefined: any[];
    custom: any[];
    all: any[];
  }> {
    const response = await this.client.get('/sprints/types');
    return response.data.data;
  }

  async getSprints(filters?: {
    type?: string;
    is_highlight_group?: boolean;
    status?: string;
    location?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
  }): Promise<any> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    const response = await this.client.get(`/sprints?${params}`);
    return response.data;
  }

  async createSprint(sprintData: any): Promise<any> {
    const response = await this.client.post('/sprints', sprintData);
    return response.data;
  }

  async updateSprint(id: number, sprintData: any): Promise<any> {
    const response = await this.client.put(`/sprints/${id}`, sprintData);
    return response.data;
  }

  async deleteSprint(id: number): Promise<any> {
    const response = await this.client.delete(`/sprints/${id}`);
    return response.data;
  }

  // Gantt Chart API methods
  async getTimelineData(params: {
    start_date: string;
    end_date: string;
    container_width?: number;
    zoom_level?: 'hour' | 'day' | 'week' | 'month' | 'quarter';
    pixels_per_day?: number;
    major_tick_interval?: number;
    minor_tick_interval?: number;
    account_ids?: number[];
    sprint_ids?: number[];
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v.toString()));
        } else {
          queryParams.append(key, value.toString());
        }
      }
    });

    const response = await this.client.get(`/gantt/timeline-data?${queryParams}`);
    return response.data;
  }

  async getZoomLevels(): Promise<any> {
    const response = await this.client.get('/gantt/zoom-levels');
    return response.data;
  }

  async resolveConflict(params: {
    conflict_id: string;
    resolution_type: 'pause' | 'reschedule' | 'override' | 'cancel';
    assignment_ids: string[];
  }): Promise<any> {
    const response = await this.client.post('/gantt/resolve-conflict', params);
    return response.data;
  }

  // Generic HTTP methods
  async get(url: string, config?: any): Promise<any> {
    const response = await this.client.get(url, config);
    return response;
  }

  async post(url: string, data?: any, config?: any): Promise<any> {
    const response = await this.client.post(url, data, config);
    return response;
  }

  async put(url: string, data?: any, config?: any): Promise<any> {
    const response = await this.client.put(url, data, config);
    return response;
  }

  async delete(url: string, config?: any): Promise<any> {
    const response = await this.client.delete(url, config);
    return response;
  }

  // Campaign Pool API methods
  async getCampaignPools(filters?: {
    search?: string;
    pool_type?: 'story' | 'post' | 'highlight' | 'all';
    content_order?: 'chronological' | 'random' | 'all';
    sort_by?: 'name' | 'created_at' | 'content_count';
    sort_order?: 'asc' | 'desc';
    limit?: number;
    offset?: number;
  }): Promise<any> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          params.append(key, value.toString());
        }
      });
    }

    const response = await this.client.get(`/campaign-pools?${params}`);
    return response.data;
  }

  async getCampaignPool(id: number): Promise<any> {
    const response = await this.client.get(`/campaign-pools/${id}`);
    return response.data;
  }

  async createCampaignPool(poolData: any): Promise<any> {
    const response = await this.client.post('/campaign-pools', poolData);
    return response.data;
  }

  async updateCampaignPool(id: number, poolData: any): Promise<any> {
    const response = await this.client.put(`/campaign-pools/${id}`, poolData);
    return response.data;
  }

  async deleteCampaignPool(id: number): Promise<any> {
    const response = await this.client.delete(`/campaign-pools/${id}`);
    return response.data;
  }

  async getHighlightGroups(): Promise<any> {
    const response = await this.client.get('/highlight-groups');
    return response.data;
  }

  // Warmup configuration API methods
  async getWarmupConfig(modelId: number): Promise<any> {
    const response = await this.client.get(`/models/${modelId}/warmup-config`);
    return response.data.data;
  }

  async updateWarmupConfig(modelId: number, config: any): Promise<any> {
    const response = await this.client.put(`/models/${modelId}/warmup-config`, config);
    return response.data.data;
  }

  // iPhone management API methods
  async getIphones(): Promise<any[]> {
    const response = await this.client.get('/iphones');
    return response.data.iphones;
  }

  async getActiveIphones(): Promise<any[]> {
    const iphones = await this.getIphones();
    return iphones; // Return all iPhones regardless of status
  }

  // Enhanced clipboard copy with iPhone selection
  async copyToIphoneClipboard(text: string, iphoneId?: number): Promise<any> {
    const response = await this.client.post('/automation/copy-to-iphone-clipboard', {
      text,
      iphone_id: iphoneId
    });
    return response.data;
  }

  // Container switching API method
  async switchContainer(containerNumber: number, iphoneId?: number): Promise<any> {
    const response = await this.client.post('/automation/switch-container', {
      container_number: containerNumber,
      iphone_id: iphoneId
    });
    return response.data;
  }

  // Automation control methods
  async pauseAutomation(sessionId: string): Promise<any> {
    const response = await this.client.post(`/automation/pause/${sessionId}`);
    return response.data;
  }

  async stopAutomation(sessionId: string): Promise<any> {
    const response = await this.client.post(`/automation/stop/${sessionId}`);
    return response.data;
  }

  async resumeAutomation(sessionId: string): Promise<any> {
    const response = await this.client.post(`/automation/resume/${sessionId}`);
    return response.data;
  }

  // Invalid accounts API method
  async getInvalidAccounts(): Promise<any> {
    const response = await this.client.get('/accounts/invalid');
    return response.data;
  }

  async checkContentReadiness(accountId: number): Promise<any> {
    const response = await this.client.get(`/accounts/${accountId}/content-readiness`);
    return response.data.data; // Return the full data object with phase details
  }

  async getReadyForWarmupAccounts(modelId?: number, limit: number = 50): Promise<any> {
    const params = new URLSearchParams();
    if (modelId) {
      params.append('model_id', modelId.toString());
    }
    params.append('limit', limit.toString());
    
    const response = await this.client.get(`/accounts/warmup/ready?${params}`);
    return response.data.data;
  }

}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient; 