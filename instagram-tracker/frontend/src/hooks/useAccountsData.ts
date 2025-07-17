import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Account, AccountFilters } from '../types/accounts';
import { apiClient } from '../services/api';
import { AccountsTab } from '../components/ModelAccounts/AccountsTabNavigation';

interface UseAccountsDataProps {
  modelId: number;
  activeTab: AccountsTab;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseAccountsDataReturn {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  filteredCount: number;
  refreshData: () => Promise<void>;
  updateFilters: (filters: AccountFilters) => void;
  currentFilters: AccountFilters;
}

export const useAccountsData = ({
  modelId,
  activeTab,
  autoRefresh = false,
  refreshInterval = 30000 // 30 seconds
}: UseAccountsDataProps): UseAccountsDataReturn => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<AccountFilters>({});

  // Generate tab-specific filters
  const getTabFilters = useCallback((tab: AccountsTab): AccountFilters => {
    const baseFilters: AccountFilters = {
      ...currentFilters
    };

    switch (tab) {
      case 'overview':
        // Show accounts assigned to this model
        return {
          ...baseFilters,
          model_id: modelId,
        };
      
      case 'available':
        // Show accounts that are imported for this model and ready to be configured
        return {
          ...baseFilters,
          model_id: modelId,
          lifecycle_state: ['imported', 'ready'], // Show imported and ready accounts
        };
      
      case 'warmup':
        // Show accounts in warm-up pipeline for this model (imported, ready, ready_for_bot_assignment, and warmup)
        return {
          ...baseFilters,
          model_id: modelId,
          lifecycle_state: ['imported', 'ready', 'ready_for_bot_assignment', 'warmup'], // Accounts in warmup pipeline
        };
      
      case 'proxy':
        // Show accounts with proxy assignments for this model
        return {
          ...baseFilters,
          model_id: modelId,
          proxy_status: ['active', 'inactive', 'error', 'unknown'], // Include unknown status
        };
      
      case 'content':
        // Show accounts for content management for this model
        return {
          ...baseFilters,
          model_id: modelId,
          // Show all accounts for content management, regardless of status
        };
      
      default:
        return baseFilters;
    }
  }, [modelId, currentFilters]);

  // Fetch accounts data
  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const tabFilters = getTabFilters(activeTab);
      console.log(`Fetching accounts for tab: ${activeTab}`, tabFilters);
      
      const response = await apiClient.getAccounts(tabFilters);
      
      // AccountListResponse has accounts, total_count, etc.
      setAccounts(response.accounts || []);
      setTotalCount(response.total_count || response.accounts?.length || 0);
      setFilteredCount(response.accounts?.length || 0);
    } catch (err: any) {
      console.error(`Failed to fetch accounts for tab ${activeTab}:`, err);
      setError(err.message || 'Failed to fetch accounts');
      setAccounts([]);
      setTotalCount(0);
      setFilteredCount(0);
      
      // Show toast error but don't overwhelm user
      if (!err.message?.includes('Network')) {
        toast.error(`Failed to load ${activeTab} accounts`);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, getTabFilters]);

  // Update filters
  const updateFilters = useCallback((newFilters: AccountFilters) => {
    setCurrentFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  // Refresh data function
  const refreshData = useCallback(async () => {
    await fetchAccounts();
  }, [fetchAccounts]);

  // Initial data fetch and when dependencies change
  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (!loading) {
        fetchAccounts();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loading, fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    totalCount,
    filteredCount,
    refreshData,
    updateFilters,
    currentFilters: getTabFilters(activeTab)
  };
}; 