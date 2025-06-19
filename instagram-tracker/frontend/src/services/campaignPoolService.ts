import { 
  CampaignPool, 
  CreateCampaignPoolRequest, 
  UpdateCampaignPoolRequest,
  PoolListResponse,
  PoolFilters,
  CompatibilityCheck,
  PoolTemplate,
  PoolAssignment,
  AssignmentOptions,
  AssignmentResponse,
  PoolAnalytics
} from '../types/campaignPools';

class CampaignPoolService {
  private baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Generic request handler
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'API request failed');
    }

    return data.data;
  }

  // Campaign Pool CRUD Operations

  /**
   * List all campaign pools with optional filtering
   */
  async listPools(filters: PoolFilters = {}): Promise<PoolListResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/campaign-pools${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.request<{
      pools: CampaignPool[];
      total_count: number;
      has_next: boolean;
      has_previous: boolean;
    }>(endpoint);
    
    return {
      pools: response.pools,
      total_count: response.total_count,
      has_next: response.has_next,
      has_previous: response.has_previous,
    };
  }

  /**
   * Get a specific campaign pool by ID
   */
  async getPool(id: number): Promise<CampaignPool> {
    const pool = await this.request<CampaignPool>(`/campaign-pools/${id}`);
    
    return pool;
  }

  /**
   * Create a new campaign pool
   */
  async createPool(poolData: CreateCampaignPoolRequest): Promise<CampaignPool> {
    const pool = await this.request<CampaignPool>('/campaign-pools', {
      method: 'POST',
      body: JSON.stringify(poolData),
    });

    return pool;
  }

  /**
   * Update an existing campaign pool
   */
  async updatePool(id: number, updates: UpdateCampaignPoolRequest): Promise<CampaignPool> {
    const pool = await this.request<CampaignPool>(`/campaign-pools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    return pool;
  }

  /**
   * Delete a campaign pool
   */
  async deletePool(id: number): Promise<void> {
    await this.request<void>(`/campaign-pools/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Duplicate an existing campaign pool
   */
  async duplicatePool(id: number, newName: string): Promise<CampaignPool> {
    const pool = await this.request<CampaignPool>(`/campaign-pools/${id}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });

    return pool;
  }

  // Assignment Operations

  /**
   * Assign a campaign pool to accounts
   */
  async assignPool(poolId: number, options: AssignmentOptions): Promise<AssignmentResponse> {
    const response = await this.request<AssignmentResponse>(`/campaign-pools/${poolId}/assign`, {
      method: 'POST',
      body: JSON.stringify(options),
    });

    return response;
  }

  /**
   * Get pool assignments
   */
  async getPoolAssignments(poolId: number): Promise<PoolAssignment[]> {
    const assignments = await this.request<PoolAssignment[]>(`/campaign-pools/${poolId}/assignments`);
    
    return assignments;
  }

  // Compatibility and Validation

  /**
   * Check sprint compatibility for pool creation
   */
  async checkCompatibility(sprintIds: number[]): Promise<CompatibilityCheck> {
    const result = await this.request<CompatibilityCheck>('/campaign-pools/check-compatibility', {
      method: 'POST',
      body: JSON.stringify({ sprint_ids: sprintIds }),
    });

    return result;
  }

  // Analytics and Reporting

  /**
   * Get pool analytics
   */
  async getPoolAnalytics(poolId: number): Promise<PoolAnalytics> {
    const analytics = await this.request<PoolAnalytics>(`/campaign-pools/${poolId}/analytics`);
    
    return analytics;
  }

  // Template Operations

  /**
   * List available pool templates
   */
  async listTemplates(category?: string): Promise<PoolTemplate[]> {
    const queryParams = category ? `?category=${encodeURIComponent(category)}` : '';
    const templates = await this.request<PoolTemplate[]>(`/campaign-pools/templates${queryParams}`);
    
    return templates;
  }

  /**
   * Create a new pool from a template
   */
  async createFromTemplate(templateId: number, customizations: Partial<CreateCampaignPoolRequest>): Promise<CampaignPool> {
    const pool = await this.request<CampaignPool>(`/campaign-pools/templates/${templateId}/create`, {
      method: 'POST',
      body: JSON.stringify(customizations),
    });

    return pool;
  }

  /**
   * Save a pool as a template
   */
  async saveAsTemplate(poolId: number, templateData: { name: string; category: string; description?: string }): Promise<PoolTemplate> {
    const template = await this.request<PoolTemplate>(`/campaign-pools/${poolId}/save-as-template`, {
      method: 'POST',
      body: JSON.stringify(templateData),
    });

    return template;
  }
}

export const campaignPoolService = new CampaignPoolService(); 