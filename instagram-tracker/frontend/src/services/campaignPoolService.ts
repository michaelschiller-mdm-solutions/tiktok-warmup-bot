import { 
  CampaignPool, 
  CreatePoolRequest, 
  UpdatePoolRequest, 
  PoolFilters,
  PoolListResponse,
  CompatibilityReport,
  PoolAssignment,
  AssignmentResponse,
  PoolAnalytics,
  PoolTemplate,
  AssignmentOptions
} from '../types/campaignPools';

class CampaignPoolService {
  private baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Helper method for API calls
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
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
  async listPools(filters?: PoolFilters): Promise<PoolListResponse> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const endpoint = `/campaign-pools${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await this.request<{ pools: CampaignPool[]; total_count: number; has_next: boolean; has_previous: boolean }>(endpoint);
    
    return {
      pools: response.pools.map(pool => ({
        ...pool,
        created_at: new Date(pool.created_at),
        updated_at: new Date(pool.updated_at),
        last_assigned: pool.last_assigned ? new Date(pool.last_assigned) : undefined,
      })),
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
    
    return {
      ...pool,
      created_at: new Date(pool.created_at),
      updated_at: new Date(pool.updated_at),
      last_assigned: pool.last_assigned ? new Date(pool.last_assigned) : undefined,
    };
  }

  /**
   * Create a new campaign pool
   */
  async createPool(poolData: CreatePoolRequest): Promise<CampaignPool> {
    const pool = await this.request<CampaignPool>('/campaign-pools', {
      method: 'POST',
      body: JSON.stringify(poolData),
    });

    return {
      ...pool,
      created_at: new Date(pool.created_at),
      updated_at: new Date(pool.updated_at),
      last_assigned: pool.last_assigned ? new Date(pool.last_assigned) : undefined,
    };
  }

  /**
   * Update an existing campaign pool
   */
  async updatePool(id: number, updates: UpdatePoolRequest): Promise<CampaignPool> {
    const pool = await this.request<CampaignPool>(`/campaign-pools/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    return {
      ...pool,
      created_at: new Date(pool.created_at),
      updated_at: new Date(pool.updated_at),
      last_assigned: pool.last_assigned ? new Date(pool.last_assigned) : undefined,
    };
  }

  /**
   * Delete a campaign pool
   */
  async deletePool(id: number): Promise<void> {
    await this.request<void>(`/campaign-pools/${id}`, {
      method: 'DELETE',
    });
  }

  // Compatibility and Validation

  /**
   * Validate sprint compatibility for pool creation
   */
  async validateCompatibility(sprintIds: number[]): Promise<CompatibilityReport> {
    const report = await this.request<CompatibilityReport>('/campaign-pools/validate-compatibility', {
      method: 'POST',
      body: JSON.stringify({ sprint_ids: sprintIds }),
    });

    return report;
  }

  /**
   * Check compatibility for a specific pool
   */
  async checkPoolCompatibility(poolId: number): Promise<CompatibilityReport> {
    return await this.request<CompatibilityReport>(`/campaign-pools/${poolId}/validate`);
  }

  // Assignment Operations

  /**
   * Assign a pool to accounts with specified options
   */
  async assignPool(poolId: number, options: AssignmentOptions): Promise<AssignmentResponse> {
    const response = await this.request<AssignmentResponse>(`/campaign-pools/${poolId}/assign`, {
      method: 'POST',
      body: JSON.stringify(options),
    });

    return response;
  }

  /**
   * Get assignment history for a pool
   */
  async getPoolAssignments(poolId: number): Promise<PoolAssignment[]> {
    const assignments = await this.request<PoolAssignment[]>(`/campaign-pools/${poolId}/assignments`);
    
    return assignments.map(assignment => ({
      ...assignment,
      assignment_date: new Date(assignment.assignment_date),
      start_date: new Date(assignment.start_date),
    }));
  }

  /**
   * Preview assignment distribution before executing
   */
  async previewAssignment(poolId: number, options: AssignmentOptions): Promise<{
    preview: Array<{
      account_id: number;
      account_username: string;
      conflicts: string[];
      success_probability: number;
    }>;
    estimated_success_rate: number;
    estimated_conflicts: number;
  }> {
    return await this.request(`/campaign-pools/${poolId}/preview-assignment`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Analytics and Reporting

  /**
   * Get analytics for a specific pool
   */
  async getPoolAnalytics(poolId: number): Promise<PoolAnalytics> {
    const analytics = await this.request<PoolAnalytics>(`/campaign-pools/${poolId}/analytics`);
    
    return {
      ...analytics,
      last_assigned: new Date(analytics.last_assigned),
    };
  }

  /**
   * Get overall pool performance metrics
   */
  async getPoolMetrics(): Promise<{
    total_pools: number;
    total_assignments: number;
    average_success_rate: number;
    top_performing_pools: Array<{
      pool_id: number;
      pool_name: string;
      performance_score: number;
    }>;
  }> {
    return await this.request('/campaign-pools/metrics');
  }

  // Template Operations

  /**
   * List available pool templates
   */
  async listTemplates(category?: string): Promise<PoolTemplate[]> {
    const queryParams = category ? `?template_category=${encodeURIComponent(category)}` : '';
    const templates = await this.request<PoolTemplate[]>(`/campaign-pools/templates${queryParams}`);
    
    return templates.map(template => ({
      ...template,
      created_at: new Date(template.created_at),
    }));
  }

  /**
   * Create a pool from a template
   */
  async createFromTemplate(templateId: number, customizations: Partial<CreatePoolRequest>): Promise<CampaignPool> {
    const pool = await this.request<CampaignPool>(`/campaign-pools/templates/${templateId}/create`, {
      method: 'POST',
      body: JSON.stringify(customizations),
    });

    return {
      ...pool,
      created_at: new Date(pool.created_at),
      updated_at: new Date(pool.updated_at),
      last_assigned: pool.last_assigned ? new Date(pool.last_assigned) : undefined,
    };
  }

  /**
   * Convert a pool to a template
   */
  async convertToTemplate(poolId: number, templateData: {
    template_category: string;
    name?: string;
    description?: string;
  }): Promise<PoolTemplate> {
    const template = await this.request<PoolTemplate>(`/campaign-pools/${poolId}/convert-to-template`, {
      method: 'POST',
      body: JSON.stringify(templateData),
    });

    return {
      ...template,
      created_at: new Date(template.created_at),
    };
  }

  // Bulk Operations

  /**
   * Duplicate an existing pool
   */
  async duplicatePool(poolId: number, newName: string): Promise<CampaignPool> {
    const pool = await this.request<CampaignPool>(`/campaign-pools/${poolId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify({ name: newName }),
    });

    return {
      ...pool,
      created_at: new Date(pool.created_at),
      updated_at: new Date(pool.updated_at),
      last_assigned: pool.last_assigned ? new Date(pool.last_assigned) : undefined,
    };
  }

  /**
   * Bulk delete multiple pools
   */
  async bulkDeletePools(poolIds: number[]): Promise<{
    deleted_count: number;
    failed_deletes: Array<{
      pool_id: number;
      reason: string;
    }>;
  }> {
    return await this.request('/campaign-pools/bulk-delete', {
      method: 'POST',
      body: JSON.stringify({ pool_ids: poolIds }),
    });
  }

  /**
   * Export pool data for reporting
   */
  async exportPools(filters?: PoolFilters): Promise<Blob> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const endpoint = `/campaign-pools/export${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: {
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return await response.blob();
  }
}

// Export singleton instance
export const campaignPoolService = new CampaignPoolService();
export default campaignPoolService; 