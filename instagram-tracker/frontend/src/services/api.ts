import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Model, CreateModelRequest, UpdateModelRequest, ApiResponse, ApiError } from '../types/models';

// API client configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || '/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
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

  // Account API methods (placeholder for future tasks)
  async getAccountsByModel(modelId: number): Promise<any[]> {
    const response = await this.client.get(`/accounts/model/${modelId}`);
    return response.data.data || response.data;
  }

  // Analytics API methods (placeholder for future tasks)
  async getAnalytics(): Promise<any> {
    const response = await this.client.get('/analytics');
    return response.data;
  }

  // Import API methods (placeholder for future tasks)
  async importAccounts(modelId: number, data: string): Promise<any> {
    const response = await this.client.post(`/import/accounts/${modelId}`, { data });
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient; 