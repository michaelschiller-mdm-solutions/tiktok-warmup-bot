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
    return response.data;
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
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient; 