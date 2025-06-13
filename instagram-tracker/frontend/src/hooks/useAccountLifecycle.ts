import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  AccountLifecycleState, 
  LifecycleSummary, 
  StateTransition,
  BulkStateTransitionResult,
  StateValidationResult
} from '../types/lifecycle';

interface UseAccountLifecycleReturn {
  // Summary data
  summary: LifecycleSummary[];
  summaryLoading: boolean;
  
  // State operations
  transitionAccount: (accountId: number, toState: AccountLifecycleState, options?: {
    notes?: string;
    force?: boolean;
  }) => Promise<boolean>;
  
  bulkTransitionAccounts: (accountIds: number[], toState: AccountLifecycleState, options?: {
    notes?: string;
    force?: boolean;
  }) => Promise<BulkStateTransitionResult | null>;
  
  validateAccountForState: (accountId: number, targetState: AccountLifecycleState) => Promise<StateValidationResult | null>;
  
  getAccountHistory: (accountId: number) => Promise<StateTransition[]>;
  
  getAccountsByState: (state: AccountLifecycleState, limit?: number, offset?: number) => Promise<any[]>;
  
  getAvailableTransitions: (accountId: number) => Promise<{
    current_state: AccountLifecycleState;
    available_transitions: AccountLifecycleState[];
  } | null>;
  
  // Loading states
  isTransitioning: boolean;
  isBulkTransitioning: boolean;
  
  // Refresh functions
  refreshSummary: () => void;
}

export const useAccountLifecycle = (): UseAccountLifecycleReturn => {
  const [summary, setSummary] = useState<LifecycleSummary[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isBulkTransitioning, setIsBulkTransitioning] = useState(false);

  // Fetch lifecycle summary
  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const response = await fetch('/api/accounts/lifecycle/summary');
      const result = await response.json();
      
      if (result.success) {
        setSummary(result.data);
      } else {
        console.error('Failed to fetch lifecycle summary:', result.message);
        toast.error('Failed to load lifecycle summary');
      }
    } catch (error) {
      console.error('Error fetching lifecycle summary:', error);
      toast.error('Failed to load lifecycle summary');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  // Load summary on mount
  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Transition single account
  const transitionAccount = useCallback(async (
    accountId: number, 
    toState: AccountLifecycleState, 
    options: { notes?: string; force?: boolean } = {}
  ): Promise<boolean> => {
    try {
      setIsTransitioning(true);
      
      const response = await fetch(`/api/accounts/lifecycle/${accountId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_state: toState,
          notes: options.notes,
          force: options.force || false
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Account state updated successfully');
        fetchSummary(); // Refresh summary
        return true;
      } else {
        toast.error(result.message || 'Failed to update account state');
        return false;
      }
    } catch (error) {
      console.error('Error transitioning account:', error);
      toast.error('Failed to update account state');
      return false;
    } finally {
      setIsTransitioning(false);
    }
  }, [fetchSummary]);

  // Bulk transition accounts
  const bulkTransitionAccounts = useCallback(async (
    accountIds: number[], 
    toState: AccountLifecycleState, 
    options: { notes?: string; force?: boolean } = {}
  ): Promise<BulkStateTransitionResult | null> => {
    try {
      setIsBulkTransitioning(true);
      
      const response = await fetch('/api/accounts/lifecycle/bulk-transition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_ids: accountIds,
          to_state: toState,
          notes: options.notes,
          force: options.force || false
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const data = result.data as BulkStateTransitionResult;
        toast.success(`Bulk transition completed: ${data.success_count} successful, ${data.failure_count} failed`);
        fetchSummary(); // Refresh summary
        return data;
      } else {
        toast.error(result.message || 'Failed to bulk transition accounts');
        return null;
      }
    } catch (error) {
      console.error('Error bulk transitioning accounts:', error);
      toast.error('Failed to bulk transition accounts');
      return null;
    } finally {
      setIsBulkTransitioning(false);
    }
  }, [fetchSummary]);

  // Validate account for state
  const validateAccountForState = useCallback(async (
    accountId: number, 
    targetState: AccountLifecycleState
  ): Promise<StateValidationResult | null> => {
    try {
      const response = await fetch(`/api/accounts/lifecycle/${accountId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target_state: targetState }),
      });

      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to validate account:', result.message);
        return null;
      }
    } catch (error) {
      console.error('Error validating account:', error);
      return null;
    }
  }, []);

  // Get account state history
  const getAccountHistory = useCallback(async (accountId: number): Promise<StateTransition[]> => {
    try {
      const response = await fetch(`/api/accounts/lifecycle/${accountId}/history`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to fetch account history:', result.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching account history:', error);
      return [];
    }
  }, []);

  // Get accounts by state
  const getAccountsByState = useCallback(async (
    state: AccountLifecycleState, 
    limit: number = 100, 
    offset: number = 0
  ): Promise<any[]> => {
    try {
      const response = await fetch(`/api/accounts/lifecycle/states/${state}?limit=${limit}&offset=${offset}`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to fetch accounts by state:', result.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching accounts by state:', error);
      return [];
    }
  }, []);

  // Get available transitions for account
  const getAvailableTransitions = useCallback(async (accountId: number): Promise<{
    current_state: AccountLifecycleState;
    available_transitions: AccountLifecycleState[];
  } | null> => {
    try {
      const response = await fetch(`/api/accounts/lifecycle/${accountId}/available-transitions`);
      const result = await response.json();
      
      if (result.success) {
        return result.data;
      } else {
        console.error('Failed to fetch available transitions:', result.message);
        return null;
      }
    } catch (error) {
      console.error('Error fetching available transitions:', error);
      return null;
    }
  }, []);

  return {
    // Summary data
    summary,
    summaryLoading,
    
    // State operations
    transitionAccount,
    bulkTransitionAccounts,
    validateAccountForState,
    getAccountHistory,
    getAccountsByState,
    getAvailableTransitions,
    
    // Loading states
    isTransitioning,
    isBulkTransitioning,
    
    // Refresh functions
    refreshSummary: fetchSummary,
  };
}; 