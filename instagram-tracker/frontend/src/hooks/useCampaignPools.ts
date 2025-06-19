import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  CampaignPool, 
  CreatePoolRequest, 
  UpdatePoolRequest, 
  PoolFilters,
  PoolListResponse,
  CompatibilityReport,
  PoolTemplate,
  AssignmentOptions,
  AssignmentResponse,
  CompatibilityCheck
} from '../types/campaignPools';
import { campaignPoolService } from '../services/campaignPoolService';

interface UseCampaignPoolsOptions {
  initialFilters?: PoolFilters;
  autoLoad?: boolean;
}

interface UseCampaignPoolsReturn {
  // Data state
  pools: CampaignPool[];
  templates: PoolTemplate[];
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
  
  // Loading states
  loading: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  assigning: boolean;
  
  // Error state
  error: string | null;
  
  // Filters and pagination
  filters: PoolFilters;
  setFilters: (filters: Partial<PoolFilters>) => void;
  
  // Pool operations
  loadPools: () => Promise<void>;
  createPool: (poolData: CreatePoolRequest) => Promise<CampaignPool>;
  updatePool: (id: number, updates: UpdatePoolRequest) => Promise<void>;
  deletePool: (id: number) => Promise<void>;
  duplicatePool: (id: number, newName: string) => Promise<CampaignPool>;
  
  // Template operations
  loadTemplates: (category?: string) => Promise<void>;
  createFromTemplate: (templateId: number, customizations: Partial<CreatePoolRequest>) => Promise<CampaignPool>;
  
  // Assignment operations
  assignPool: (poolId: number, options: AssignmentOptions) => Promise<AssignmentResponse>;
  
  // Compatibility checking
  checkCompatibility: (sprintIds: number[]) => Promise<CompatibilityCheck>;
  
  // Utility functions
  refreshPool: (id: number) => Promise<void>;
  clearError: () => void;
}

export const useCampaignPools = (options: UseCampaignPoolsOptions = {}): UseCampaignPoolsReturn => {
  const { initialFilters = {}, autoLoad = true } = options;

  // State management
  const [pools, setPools] = useState<CampaignPool[]>([]);
  const [templates, setTemplates] = useState<PoolTemplate[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [assigning, setAssigning] = useState(false);
  
  // Error and filters
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<PoolFilters>(initialFilters);

  // Clear error function
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Update filters function
  const setFilters = useCallback((newFilters: Partial<PoolFilters>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Load pools function
  const loadPools = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: PoolListResponse = await campaignPoolService.listPools(filters);
      
      setPools(response.pools);
      setTotalCount(response.total_count);
      setHasNext(response.has_next);
      setHasPrevious(response.has_previous);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaign pools';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load templates function
  const loadTemplates = useCallback(async (category?: string) => {
    try {
      const templateList = await campaignPoolService.listTemplates(category);
      setTemplates(templateList);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates';
      console.error('Error loading templates:', err);
      toast.error(errorMessage);
    }
  }, []);

  // Create pool function
  const createPool = useCallback(async (poolData: CreatePoolRequest): Promise<CampaignPool> => {
    try {
      setCreating(true);
      setError(null);
      
      const newPool = await campaignPoolService.createPool(poolData);
      
      // Add to local state for optimistic update
      setPools(prev => [newPool, ...prev]);
      setTotalCount(prev => prev + 1);
      
      toast.success(`Campaign pool "${newPool.name}" created successfully`);
      return newPool;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign pool';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  // Update pool function
  const updatePool = useCallback(async (id: number, updates: UpdatePoolRequest): Promise<void> => {
    try {
      setUpdating(true);
      setError(null);
      
      const updatedPool = await campaignPoolService.updatePool(id, updates);
      
      // Update local state
      setPools(prev => 
        prev.map(pool => pool.id === id ? updatedPool : pool)
      );
      
      toast.success('Campaign pool updated successfully');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign pool';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setUpdating(false);
    }
  }, []);

  // Delete pool function
  const deletePool = useCallback(async (id: number): Promise<void> => {
    const poolToDelete = pools.find(p => p.id === id);
    if (!poolToDelete) {
      throw new Error('Pool not found');
    }

    try {
      setDeleting(true);
      setError(null);
      
      await campaignPoolService.deletePool(id);
      
      // Remove from local state
      setPools(prev => prev.filter(pool => pool.id !== id));
      setTotalCount(prev => prev - 1);
      
      toast.success(`Campaign pool "${poolToDelete.name}" deleted successfully`);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete campaign pool';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setDeleting(false);
    }
  }, [pools]);

  // Duplicate pool function
  const duplicatePool = useCallback(async (id: number, newName: string): Promise<CampaignPool> => {
    try {
      setCreating(true);
      setError(null);
      
      const duplicatedPool = await campaignPoolService.duplicatePool(id, newName);
      
      // Add to local state
      setPools(prev => [duplicatedPool, ...prev]);
      setTotalCount(prev => prev + 1);
      
      toast.success(`Campaign pool duplicated as "${duplicatedPool.name}"`);
      return duplicatedPool;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate campaign pool';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  // Create from template function
  const createFromTemplate = useCallback(async (templateId: number, customizations: Partial<CreatePoolRequest>): Promise<CampaignPool> => {
    try {
      setCreating(true);
      setError(null);
      
      const newPool = await campaignPoolService.createFromTemplate(templateId, customizations);
      
      // Add to local state
      setPools(prev => [newPool, ...prev]);
      setTotalCount(prev => prev + 1);
      
      toast.success(`Campaign pool "${newPool.name}" created from template`);
      return newPool;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create pool from template';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  }, []);

  // Assign pool function
  const assignPool = useCallback(async (poolId: number, options: AssignmentOptions): Promise<AssignmentResponse> => {
    try {
      setAssigning(true);
      setError(null);
      
      const response = await campaignPoolService.assignPool(poolId, options);
      
      // Update local state optimistically
      setPools(prev => 
        prev.map(pool => 
          pool.id === poolId 
            ? { 
                ...pool, 
              } 
            : pool
        )
      );
      
      // Show success message with assignment details
      const assignedCount = response.total_accounts_assigned;
      const conflicts = response.conflicts_resolved;
      const warningText = conflicts > 0 ? ` (${conflicts} conflicts resolved)` : '';
      
      toast.success(`Campaign pool assigned to ${assignedCount} accounts${warningText}`);
      return response;
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to assign campaign pool';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setAssigning(false);
    }
  }, [pools]);

  // Check compatibility function
  const checkCompatibility = useCallback(async (sprintIds: number[]): Promise<CompatibilityCheck> => {
    try {
      const result = await campaignPoolService.checkCompatibility(sprintIds);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check compatibility';
      console.error('Error checking compatibility:', err);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Refresh specific pool
  const refreshPool = useCallback(async (id: number): Promise<void> => {
    try {
      const updatedPool = await campaignPoolService.getPool(id);
      setPools(prev => 
        prev.map(pool => pool.id === id ? updatedPool : pool)
      );
    } catch (err) {
      console.error('Error refreshing pool:', err);
    }
  }, []);

  // Load pools when filters change
  useEffect(() => {
    if (autoLoad) {
      loadPools();
    }
  }, [loadPools, autoLoad]);

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  return {
    // Data state
    pools,
    templates,
    totalCount,
    hasNext,
    hasPrevious,
    
    // Loading states
    loading,
    creating,
    updating,
    deleting,
    assigning,
    
    // Error state
    error,
    
    // Filters and pagination
    filters,
    setFilters,
    
    // Pool operations
    loadPools,
    createPool,
    updatePool,
    deletePool,
    duplicatePool,
    
    // Template operations
    loadTemplates,
    createFromTemplate,
    
    // Assignment operations
    assignPool,
    
    // Compatibility checking
    checkCompatibility,
    
    // Utility functions
    refreshPool,
    clearError,
  };
}; 