import { db } from '../database';
import { 
  ProxyProvider, 
  CreateProxyProviderRequest, 
  UpdateProxyProviderRequest,
  ProxyProviderStats,
  ProxyError 
} from '../types/proxies';

export class ProxyProviderService {
  
  /**
   * Get all proxy providers with optional filtering
   */
  async getProviders(
    status?: string, 
    includeStats: boolean = false
  ): Promise<ProxyProvider[] | ProxyProviderStats[]> {
    try {
      let query = `
        SELECT 
          pp.id, pp.name, pp.monthly_cost_per_proxy, pp.contact_email,
          pp.service_type, pp.status, pp.notes, pp.created_at, pp.updated_at
      `;
      
      if (includeStats) {
        query += `,
          COUNT(p.id) as proxy_count,
          COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_proxies,
          COALESCE(SUM(p.account_count), 0) as assigned_accounts,
          COALESCE(SUM(p.max_accounts), 0) as total_capacity,
          CASE 
            WHEN SUM(p.max_accounts) > 0 THEN 
              ROUND((SUM(p.account_count)::decimal / SUM(p.max_accounts)) * 100, 2)
            ELSE 0
          END as utilization_percentage,
          (COUNT(p.id) * pp.monthly_cost_per_proxy) as monthly_cost_total,
          ROUND(AVG(p.response_time_ms), 0) as avg_response_time_ms,
          MAX(p.last_tested_at) as last_tested_at
        `;
      }
      
      query += `
        FROM proxy_providers pp
      `;
      
      if (includeStats) {
        query += ` LEFT JOIN proxies p ON pp.id = p.provider_id`;
      }
      
      const params: any[] = [];
      
      if (status) {
        query += ` WHERE pp.status = $1`;
        params.push(status);
      }
      
      if (includeStats) {
        query += ` GROUP BY pp.id, pp.name, pp.monthly_cost_per_proxy, pp.contact_email, pp.service_type, pp.status, pp.notes, pp.created_at, pp.updated_at`;
      }
      
      query += ` ORDER BY pp.name ASC`;
      
      const result = await db.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        monthly_cost_per_proxy: parseFloat(row.monthly_cost_per_proxy),
        contact_email: row.contact_email,
        service_type: row.service_type,
        status: row.status,
        notes: row.notes,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
        ...(includeStats && {
          proxy_count: parseInt(row.proxy_count),
          active_proxies: parseInt(row.active_proxies),
          assigned_accounts: parseInt(row.assigned_accounts),
          total_capacity: parseInt(row.total_capacity),
          utilization_percentage: parseFloat(row.utilization_percentage),
          monthly_cost_total: parseFloat(row.monthly_cost_total),
          avg_response_time_ms: row.avg_response_time_ms ? parseInt(row.avg_response_time_ms) : undefined,
          last_tested_at: row.last_tested_at ? row.last_tested_at.toISOString() : undefined
        })
      }));
    } catch (error) {
      console.error('Error fetching proxy providers:', error);
      throw new ProxyError('Failed to fetch proxy providers', 'FETCH_ERROR', error);
    }
  }

  /**
   * Get a single proxy provider by ID
   */
  async getProviderById(id: number, includeStats: boolean = false): Promise<ProxyProvider | ProxyProviderStats | null> {
    try {
      let query = `
        SELECT 
          pp.id, pp.name, pp.monthly_cost_per_proxy, pp.contact_email,
          pp.service_type, pp.status, pp.notes, pp.created_at, pp.updated_at
      `;
      
      if (includeStats) {
        query += `,
          COUNT(p.id) as proxy_count,
          COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_proxies,
          COALESCE(SUM(p.account_count), 0) as assigned_accounts,
          COALESCE(SUM(p.max_accounts), 0) as total_capacity,
          CASE 
            WHEN SUM(p.max_accounts) > 0 THEN 
              ROUND((SUM(p.account_count)::decimal / SUM(p.max_accounts)) * 100, 2)
            ELSE 0
          END as utilization_percentage,
          (COUNT(p.id) * pp.monthly_cost_per_proxy) as monthly_cost_total,
          ROUND(AVG(p.response_time_ms), 0) as avg_response_time_ms,
          MAX(p.last_tested_at) as last_tested_at
        `;
      }
      
      query += `
        FROM proxy_providers pp
      `;
      
      if (includeStats) {
        query += ` LEFT JOIN proxies p ON pp.id = p.provider_id`;
      }
      
      query += ` WHERE pp.id = $1`;
      
      if (includeStats) {
        query += ` GROUP BY pp.id, pp.name, pp.monthly_cost_per_proxy, pp.contact_email, pp.service_type, pp.status, pp.notes, pp.created_at, pp.updated_at`;
      }
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        monthly_cost_per_proxy: parseFloat(row.monthly_cost_per_proxy),
        contact_email: row.contact_email,
        service_type: row.service_type,
        status: row.status,
        notes: row.notes,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString(),
        ...(includeStats && {
          proxy_count: parseInt(row.proxy_count),
          active_proxies: parseInt(row.active_proxies),
          assigned_accounts: parseInt(row.assigned_accounts),
          total_capacity: parseInt(row.total_capacity),
          utilization_percentage: parseFloat(row.utilization_percentage),
          monthly_cost_total: parseFloat(row.monthly_cost_total),
          avg_response_time_ms: row.avg_response_time_ms ? parseInt(row.avg_response_time_ms) : undefined,
          last_tested_at: row.last_tested_at ? row.last_tested_at.toISOString() : undefined
        })
      };
    } catch (error) {
      console.error(`Error fetching proxy provider ${id}:`, error);
      throw new ProxyError('Failed to fetch proxy provider', 'FETCH_ERROR', error);
    }
  }

  /**
   * Create a new proxy provider
   */
  async createProvider(data: CreateProxyProviderRequest): Promise<ProxyProvider> {
    try {
      // Validate required fields
      if (!data.name || data.name.trim().length === 0) {
        throw new ProxyError('Provider name is required', 'VALIDATION_ERROR');
      }
      
      if (data.monthly_cost_per_proxy < 0) {
        throw new ProxyError('Monthly cost cannot be negative', 'VALIDATION_ERROR');
      }
      
      const query = `
        INSERT INTO proxy_providers (
          name, monthly_cost_per_proxy, contact_email, service_type, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, name, monthly_cost_per_proxy, contact_email, service_type, status, notes, created_at, updated_at
      `;
      
      const result = await db.query(query, [
        data.name.trim(),
        data.monthly_cost_per_proxy,
        data.contact_email || null,
        data.service_type,
        data.status || 'active',
        data.notes || null
      ]);
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        monthly_cost_per_proxy: parseFloat(row.monthly_cost_per_proxy),
        contact_email: row.contact_email,
        service_type: row.service_type,
        status: row.status,
        notes: row.notes,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString()
      };
    } catch (error: any) {
      console.error('Error creating proxy provider:', error);
      
      if (error.code === '23505' && error.constraint === 'proxy_providers_name_key') {
        throw new ProxyError('Provider name already exists', 'DUPLICATE_NAME');
      }
      
      if (error instanceof ProxyError) {
        throw error;
      }
      
      throw new ProxyError('Failed to create proxy provider', 'CREATE_ERROR', error);
    }
  }

  /**
   * Update an existing proxy provider
   */
  async updateProvider(id: number, data: UpdateProxyProviderRequest): Promise<ProxyProvider | null> {
    try {
      // Build dynamic update query
      const updateFields: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;
      
      if (data.name !== undefined) {
        if (!data.name || data.name.trim().length === 0) {
          throw new ProxyError('Provider name cannot be empty', 'VALIDATION_ERROR');
        }
        updateFields.push(`name = $${paramIndex}`);
        params.push(data.name.trim());
        paramIndex++;
      }
      
      if (data.monthly_cost_per_proxy !== undefined) {
        if (data.monthly_cost_per_proxy < 0) {
          throw new ProxyError('Monthly cost cannot be negative', 'VALIDATION_ERROR');
        }
        updateFields.push(`monthly_cost_per_proxy = $${paramIndex}`);
        params.push(data.monthly_cost_per_proxy);
        paramIndex++;
      }
      
      if (data.contact_email !== undefined) {
        updateFields.push(`contact_email = $${paramIndex}`);
        params.push(data.contact_email || null);
        paramIndex++;
      }
      
      if (data.service_type !== undefined) {
        updateFields.push(`service_type = $${paramIndex}`);
        params.push(data.service_type);
        paramIndex++;
      }
      
      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        params.push(data.status);
        paramIndex++;
      }
      
      if (data.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        params.push(data.notes || null);
        paramIndex++;
      }
      
      if (updateFields.length === 0) {
        throw new ProxyError('No fields to update', 'VALIDATION_ERROR');
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      const query = `
        UPDATE proxy_providers 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, monthly_cost_per_proxy, contact_email, service_type, status, notes, created_at, updated_at
      `;
      
      params.push(id);
      
      const result = await db.query(query, params);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        monthly_cost_per_proxy: parseFloat(row.monthly_cost_per_proxy),
        contact_email: row.contact_email,
        service_type: row.service_type,
        status: row.status,
        notes: row.notes,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString()
      };
    } catch (error: any) {
      console.error(`Error updating proxy provider ${id}:`, error);
      
      if (error.code === '23505' && error.constraint === 'proxy_providers_name_key') {
        throw new ProxyError('Provider name already exists', 'DUPLICATE_NAME');
      }
      
      if (error instanceof ProxyError) {
        throw error;
      }
      
      throw new ProxyError('Failed to update proxy provider', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Delete a proxy provider
   */
  async deleteProvider(id: number): Promise<boolean> {
    try {
      // Check if provider has any proxies
      const proxyCheckResult = await db.query(
        'SELECT COUNT(*) as proxy_count FROM proxies WHERE provider_id = $1',
        [id]
      );
      
      const proxyCount = parseInt(proxyCheckResult.rows[0].proxy_count);
      
      if (proxyCount > 0) {
        throw new ProxyError(
          `Cannot delete provider with ${proxyCount} existing proxies. Remove all proxies first.`,
          'HAS_PROXIES',
          { proxy_count: proxyCount }
        );
      }
      
      const result = await db.query(
        'DELETE FROM proxy_providers WHERE id = $1',
        [id]
      );
      
      return result.rowCount > 0;
    } catch (error) {
      console.error(`Error deleting proxy provider ${id}:`, error);
      
      if (error instanceof ProxyError) {
        throw error;
      }
      
      throw new ProxyError('Failed to delete proxy provider', 'DELETE_ERROR', error);
    }
  }

  /**
   * Get provider proxies with pagination
   */
  async getProviderProxies(
    providerId: number, 
    page: number = 1, 
    limit: number = 50
  ): Promise<{proxies: any[], total: number, page: number, totalPages: number}> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const countResult = await db.query(
        'SELECT COUNT(*) as total FROM proxies WHERE provider_id = $1',
        [providerId]
      );
      const total = parseInt(countResult.rows[0].total);
      
      // Get proxies
      const proxiesResult = await db.query(`
        SELECT 
          id, provider_id, ip, port, username, location, status,
          assigned_model_id, account_count, max_accounts,
          last_tested_at, last_success_at, last_error_message, response_time_ms,
          created_at, updated_at
        FROM proxies 
        WHERE provider_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `, [providerId, limit, offset]);
      
      const proxies = proxiesResult.rows.map(row => ({
        id: row.id,
        provider_id: row.provider_id,
        ip: row.ip,
        port: row.port,
        username: row.username,
        location: row.location,
        status: row.status,
        assigned_model_id: row.assigned_model_id,
        account_count: row.account_count,
        max_accounts: row.max_accounts,
        last_tested_at: row.last_tested_at ? row.last_tested_at.toISOString() : undefined,
        last_success_at: row.last_success_at ? row.last_success_at.toISOString() : undefined,
        last_error_message: row.last_error_message,
        response_time_ms: row.response_time_ms,
        created_at: row.created_at.toISOString(),
        updated_at: row.updated_at.toISOString()
      }));
      
      return {
        proxies,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error(`Error fetching proxies for provider ${providerId}:`, error);
      throw new ProxyError('Failed to fetch provider proxies', 'FETCH_ERROR', error);
    }
  }
} 