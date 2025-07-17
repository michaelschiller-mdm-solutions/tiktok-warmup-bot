import React, { useState, useEffect } from 'react';
import { Activity, Play, Pause, RotateCcw, TrendingUp, Clock, Eye, ChevronRight, User, Hash, Image, FileText, CheckCircle, X, Settings, AlertCircle, Mail, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DataGrid } from '../DataGrid';
import { DataGridColumn } from '../../types/dataGrid';
import { Account } from '../../types/accounts';
import { useAccountsData } from '../../hooks/useAccountsData';
import LoadingSpinner from '../LoadingSpinner';
import WarmupPhaseTracker from '../AccountLifecycle/WarmupPhaseTracker';
import { apiClient } from '../../services/api';
import AutomationSetupModal from './AutomationSetupModal';
import { 
  WarmupPhase, 
  WarmupPhaseStatus, 
  WarmupStatusSummary, 
  WarmupAccountWithPhases,
  ReadyAccount
} from '../../types/warmup';

interface WarmupPipelineTabProps {
  modelId: number;
}

// 10-phase warmup system as defined in WarmupPhases.md
const WARMUP_PHASES = [
  { 
    id: WarmupPhase.BIO, 
    name: 'Bio Change', 
    description: 'Update Instagram bio',
    icon: FileText,
    color: 'blue',
    contentTypes: ['bio']
  },
  { 
    id: WarmupPhase.SET_TO_PRIVATE, 
    name: 'Set to Private', 
    description: 'Set account to private',
    icon: User,
    color: 'gray',
    contentTypes: []
  },
  { 
    id: WarmupPhase.GENDER, 
    name: 'Gender Change', 
    description: 'Change gender to female',
    icon: User,
    color: 'pink',
    contentTypes: []
  },
  { 
    id: WarmupPhase.NAME, 
    name: 'Name Change', 
    description: 'Update display name',
    icon: User,
    color: 'green',
    contentTypes: ['name']
  },
  { 
    id: WarmupPhase.USERNAME, 
    name: 'Username Change', 
    description: 'Change Instagram username',
    icon: Hash,
    color: 'purple',
    contentTypes: ['username']
  },
  { 
    id: WarmupPhase.FIRST_HIGHLIGHT, 
    name: 'First Highlight', 
    description: 'Upload first highlight group',
    icon: Image,
    color: 'yellow',
    contentTypes: ['highlight_group_name'],
    dependency: null
  },
  { 
    id: WarmupPhase.NEW_HIGHLIGHT, 
    name: 'New Highlight', 
    description: 'Upload new highlight group',
    icon: Image,
    color: 'orange',
    contentTypes: ['highlight_group_name'],
    dependency: WarmupPhase.FIRST_HIGHLIGHT
  },
  { 
    id: WarmupPhase.POST_CAPTION, 
    name: 'Post with Caption', 
    description: 'Upload post with caption',
    icon: Image,
    color: 'indigo',
    contentTypes: ['post']
  },
  { 
    id: WarmupPhase.POST_NO_CAPTION, 
    name: 'Post without Caption', 
    description: 'Upload post without caption',
    icon: Image,
    color: 'gray',
    contentTypes: []
  },
  { 
    id: WarmupPhase.STORY_CAPTION, 
    name: 'Story with Caption', 
    description: 'Upload story with caption',
    icon: Image,
    color: 'red',
    contentTypes: ['story']
  },
  { 
    id: WarmupPhase.STORY_NO_CAPTION, 
    name: 'Story without Caption', 
    description: 'Upload story without caption',
    icon: Image,
    color: 'teal',
    contentTypes: []
  }
];

const WarmupPipelineTab: React.FC<WarmupPipelineTabProps> = ({ modelId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [showPhaseDetails, setShowPhaseDetails] = useState(false);
  const [phaseAccounts, setPhaseAccounts] = useState<Record<string, WarmupAccountWithPhases[]>>({});
  const [warmupStatuses, setWarmupStatuses] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingManualSetup, setCompletingManualSetup] = useState<Record<number, boolean>>({});
  const [markingInvalid, setMarkingInvalid] = useState<Record<number, boolean>>({});
  const [showAutomationModal, setShowAutomationModal] = useState(false);
  const [fetchingTokens, setFetchingTokens] = useState<Record<number, boolean>>({});
  const [accountTokens, setAccountTokens] = useState<Record<number, string>>({});
  const [showTokenPopup, setShowTokenPopup] = useState<{ accountId: number; token: string; username: string } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [warmupConfig, setWarmupConfig] = useState<any>(null);
  const [availableIphones, setAvailableIphones] = useState<any[]>([]);
  const [selectedIphoneId, setSelectedIphoneId] = useState<number | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [contentReadiness, setContentReadiness] = useState<Record<number, any>>({});
  
  // Batch selection state
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
  const [selectAllMode, setSelectAllMode] = useState(false);
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  const { 
    accounts, 
    loading: accountsLoading, 
    error: accountsError, 
    totalCount, 
    filteredCount, 
    refreshData,
    updateFilters
  } = useAccountsData({ 
    modelId,
    activeTab: 'warmup'
  });

  const phases = [...WARMUP_PHASES];

  // Fetch warmup data for accounts
  const fetchWarmupData = async () => {
    if (accounts.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      
      // Get warmup status for all accounts in one batch call (major performance improvement)
      const accountIds = accounts.map(account => account.id);
      const statusMap = await apiClient.getBatchWarmupStatus(accountIds);
      setWarmupStatuses(statusMap);

      // Group accounts by their current warmup phase
      const phaseGroups: Record<string, WarmupAccountWithPhases[]> = {
        manual_setup: [],
        invalid: [],
        ready_for_assignment: [],
        ...Object.fromEntries(WARMUP_PHASES.map(phase => [phase.id, []]))
      };
      
      accounts.forEach(account => {
        const status = statusMap[account.id];
        
        // First, check if account is invalid (archived accounts only)
        if (account.lifecycle_state === 'archived') {
          phaseGroups.invalid.push({
            ...account,
            phases: status?.phases || [],
            current_phase: undefined,
            phase_status: undefined,
            warmup_progress: 0
          });
          return;
        }

        // ALL other accounts go to manual setup phase (Phase 0)
        // This includes: imported, ready, warmup, cleanup, and any other states
        phaseGroups.manual_setup.push({
          ...account,
          phases: status?.phases || [],
          current_phase: undefined,
          phase_status: undefined,
          warmup_progress: status?.progress_percent || 0
        });
      });
      
      setPhaseAccounts(phaseGroups);

    } catch (err: any) {
      console.error('Failed to fetch warmup data:', err);
      setError(err.message || 'Failed to fetch warmup data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarmupData();
  }, [accounts]);

  // Update filters when search term changes
  useEffect(() => {
    updateFilters({
      search: searchTerm || undefined
    });
  }, [searchTerm, updateFilters]);

  // Handle manual setup completion
  const handleCompleteManualSetup = async (accountId: number) => {
    try {
      setCompletingManualSetup(prev => ({ ...prev, [accountId]: true }));
      
      const result = await apiClient.completeManualSetup(accountId, 'frontend-user');
      
      if (result.success) {
        toast.success(`Manual setup completed for account ${accountId}`);
        // 🔄 Optimistic update: remove the account from Manual-Setup list immediately so the page doesn't flash-reload
        setPhaseAccounts(prev => {
          const updated: Record<string, typeof prev[keyof typeof prev]> = {} as any;
          for (const key in prev) {
            updated[key] = prev[key].filter(acc => acc.id !== accountId);
          }
          return updated;
        });
        // Defer full refresh; keep UI responsive. User can hit manual Refresh when ready.
      } else {
        toast.error(result.message || 'Failed to complete manual setup');
      }
    } catch (error: any) {
      console.error('Error completing manual setup:', error);
      toast.error(error.message || 'Failed to complete manual setup');
    } finally {
      setCompletingManualSetup(prev => ({ ...prev, [accountId]: false }));
    }
  };

  // Handle marking account as invalid
  const handleMarkInvalid = async (accountId: number) => {
    try {
      setMarkingInvalid(prev => ({ ...prev, [accountId]: true }));
      
      const result = await apiClient.markAccountInvalid(accountId, 'Account marked as invalid during manual setup');
      
      if (result.success) {
        toast.success(`Account marked as invalid. Proxy and container resources freed.`);
        // 🔄 Optimistic update: remove the invalidated account from current lists
        setPhaseAccounts(prev => {
          const updated: Record<string, typeof prev[keyof typeof prev]> = {} as any;
          for (const key in prev) {
            updated[key] = prev[key].filter(acc => acc.id !== accountId);
          }
          return updated;
        });
        // Defer full refresh to avoid jarring table reload.
      } else {
        toast.error(result.message || 'Failed to mark account as invalid');
      }
    } catch (error: any) {
      console.error('Error marking account as invalid:', error);
      toast.error(error.message || 'Failed to mark account as invalid');
    } finally {
      setMarkingInvalid(prev => ({ ...prev, [accountId]: false }));
    }
  };

  // Handle copying text to iPhone clipboard
  const handleCopyToIphoneClipboard = async (text: string, label: string = 'text') => {
    try {
      // Check if iPhone is selected
      if (!selectedIphoneId) {
        toast.error('❌ No iPhone selected. Please select an iPhone in settings.');
        return;
      }

      const result = await apiClient.copyToIphoneClipboard(text, selectedIphoneId);

      toast.success(`📱 ${label} copied to iPhone "${result.iphone?.name || 'Unknown'}" clipboard`);
    } catch (error: any) {
      console.error('Error copying to iPhone clipboard:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const hint = error.response?.data?.hint;
      
      toast.error(`❌ Failed to copy ${label}: ${errorMsg}${hint ? '\n' + hint : ''}`);
    }
  };

  // Handle switching iPhone container
  const handleSwitchContainer = async (containerNumber: number) => {
    if (!selectedIphoneId) {
      toast.error('❌ No iPhone selected. Please select an iPhone in settings.', { duration: 7000 });
      return;
    }

    if (!containerNumber || containerNumber < 1) {
      toast.error('❌ Invalid container number', { duration: 7000 });
      return;
    }

    const loadingToastId = toast.loading(`🔄 Switching to container #${containerNumber}...`);

    try {
      const result = await apiClient.switchContainer(containerNumber, selectedIphoneId);

      toast.dismiss(loadingToastId);
      toast.success(`✅ Switched to container #${containerNumber} on ${result.iphone}`, { duration: 7000 });
    } catch (error: any) {
      toast.dismiss(loadingToastId);
      console.error('Error switching container:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Unknown error';
      const details = error.response?.data?.details;
      toast.error(`❌ Failed to switch container: ${errorMsg}${details ? '\n' + details : ''}`, { duration: 7000 });
    }
  };

  // Handle email token fetching
  const handleFetchEmailToken = async (accountId: number, email: string, emailPassword: string) => {
    try {
      setFetchingTokens(prev => ({ ...prev, [accountId]: true }));
      
      const response = await fetch('/api/automation/fetch-manual-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, email_password: emailPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch token');
      }

      // Store the token for this account
      setAccountTokens(prev => ({ ...prev, [accountId]: data.token }));
      toast.success(`Token retrieved: ${data.token}`);

      // Show the token popup
      const account = accounts.find(acc => acc.id === accountId);
      setShowTokenPopup({
        accountId,
        token: data.token,
        username: account?.username || `Account ${accountId}`
      });

    } catch (error: any) {
      console.error('Error fetching email token:', error);
      toast.error(error.message || 'Failed to fetch email token');
    } finally {
      setFetchingTokens(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const handleAutomationSuccess = (sessionId: string) => {
    refreshData();
    fetchWarmupData();
    toast.success('Automation session completed successfully');
  };

  // Add missing handlers for invalid account actions
  const handleReactivateAccount = async (accountId: number) => {
    try {
      const response = await fetch(`/api/accounts/lifecycle/${accountId}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ changed_by: 'warmup_frontend' })
      });

      if (response.ok) {
        toast.success('Account reactivation attempted');
        refreshData();
        fetchWarmupData();
      } else {
        toast.error('Failed to reactivate account');
      }
    } catch (error) {
      console.error('Error reactivating account:', error);
      toast.error('Error reactivating account');
    }
  };

  const handleMarkForReplacement = async (accountId: number) => {
    try {
      const response = await fetch(`/api/accounts/lifecycle/${accountId}/mark-for-replacement`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ changed_by: 'warmup_frontend' })
      });

      if (response.ok) {
        toast.success('Account marked for replacement');
        refreshData();
        fetchWarmupData();
      } else {
        toast.error('Failed to mark account for replacement');
      }
    } catch (error) {
      console.error('Error marking account for replacement:', error);
      toast.error('Error marking account for replacement');
    }
  };

  // Batch selection handlers
  const handleSelectAccount = (accountId: number, selected: boolean) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(accountId);
      } else {
        newSet.delete(accountId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (accounts: WarmupAccountWithPhases[], selected: boolean) => {
    setSelectedAccounts(prev => {
      const newSet = new Set(prev);
      accounts.forEach(account => {
        if (selected) {
          newSet.add(account.id);
        } else {
          newSet.delete(account.id);
        }
      });
      return newSet;
    });
  };

  // Batch actions
  const handleBatchCompleteManualSetup = async () => {
    const selectedAccountIds = Array.from(selectedAccounts);
    if (selectedAccountIds.length === 0) {
      toast.error('No accounts selected');
      return;
    }

    setBatchActionLoading(true);
    try {
      const promises = selectedAccountIds.map(id => 
        apiClient.completeManualSetup(id, 'frontend-user')
      );
      const results = await Promise.all(promises);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      if (successCount > 0) {
        toast.success(`${successCount} accounts completed successfully`);
      }
      if (failureCount > 0) {
        toast.error(`${failureCount} accounts failed to complete`);
      }
      
      setSelectedAccounts(new Set());
      fetchWarmupData();
    } catch (error) {
      toast.error('Batch operation failed');
    } finally {
      setBatchActionLoading(false);
    }
  };

  const handleBatchMarkInvalid = async () => {
    const selectedAccountIds = Array.from(selectedAccounts);
    if (selectedAccountIds.length === 0) {
      toast.error('No accounts selected');
      return;
    }

    setBatchActionLoading(true);
    try {
      const promises = selectedAccountIds.map(id => 
        apiClient.markAccountInvalid(id, 'Batch invalidation from manual setup')
      );
      const results = await Promise.all(promises);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      if (successCount > 0) {
        toast.success(`${successCount} accounts marked invalid successfully`);
      }
      if (failureCount > 0) {
        toast.error(`${failureCount} accounts failed to mark invalid`);
      }
      
      setSelectedAccounts(new Set());
      fetchWarmupData();
    } catch (error) {
      toast.error('Batch operation failed');
    } finally {
      setBatchActionLoading(false);
    }
  };

  // Define columns for account display in each phase
  const getPhaseColumns = (phaseId?: string): DataGridColumn<WarmupAccountWithPhases>[] => {
    // Base columns that are always visible
    const baseColumns: DataGridColumn<WarmupAccountWithPhases>[] = [
      {
        id: 'select',
        field: 'id',
        header: '', // Will be replaced with select all checkbox
        width: 50,
        minWidth: 50,
        resizable: false,
        sortable: false,
        filterable: false,
        type: 'custom',
        align: 'center',
        visible: true,
        order: 0,
        frozen: true,
        editable: false,
        required: false,
        render: (value, row) => (
          <input
            type="checkbox"
            checked={selectedAccounts.has(row.id)}
            onChange={(e) => handleSelectAccount(row.id, e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        )
      },
      {
        id: 'container_number',
        field: 'container_number',
        header: 'Container',
        width: 120,
        minWidth: 100,
        resizable: true,
        sortable: true,
        filterable: true,
        type: 'number',
        align: 'center',
        visible: true,
        order: 1,
        frozen: false,
        editable: false,
        required: false,
        render: (value) => (
          <div className="text-center">
            {value ? (
              <button
                onClick={() => handleSwitchContainer(value)}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 hover:bg-blue-200 text-blue-800 cursor-pointer transition-colors"
                title={`Click to switch iPhone to container #${value}`}
              >
                #{value}
              </button>
            ) : (
              <span className="text-gray-400 italic text-xs">Auto</span>
            )}
          </div>
        )
      },
      {
        id: 'username',
        field: 'username',
        header: 'Username',
        width: 180,
        minWidth: 150,
        resizable: true,
        sortable: true,
        filterable: true,
        type: 'text',
        align: 'left',
        visible: true,
        order: 2,
        frozen: false,
        editable: false,
        required: true,
        render: (value, row) => (
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              row.status === 'active' ? 'bg-green-500' : 
              row.status === 'banned' ? 'bg-red-500' :
              row.status === 'suspended' ? 'bg-yellow-500' :
              'bg-gray-500'
            }`} title={row.status} />
            {phaseId === 'manual_setup' ? (
              <button
                onClick={() => handleCopyToIphoneClipboard(value, 'Username')}
                className="font-medium text-sm text-blue-600 hover:text-blue-800 underline cursor-pointer transition-colors"
                title="Click to copy username to iPhone clipboard"
              >
                {value}
              </button>
            ) : (
              <span className="font-medium text-sm">{value}</span>
            )}
          </div>
        )
      },
      {
        id: 'next_available',
        field: 'next_available_at',
        header: 'Next Phase In',
        width: 120,
        minWidth: 100,
        resizable: true,
        sortable: true,
        filterable: false,
        type: 'custom',
        align: 'center',
        visible: true,
        order: 11,
        frozen: false,
        editable: false,
        required: false,
        render: (value, row) => {
          if (!value) return <span className="text-gray-400">—</span>;
          
          const nextTime = new Date(value);
          const now = new Date();
          const diffMs = nextTime.getTime() - now.getTime();
          
          if (diffMs <= 0) {
            return <span className="text-green-600 font-medium">Ready</span>;
          }
          
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          
          if (hours > 0) {
            return <span className="text-orange-600">{hours}h {minutes}m</span>;
          } else {
            return <span className="text-yellow-600">{minutes}m</span>;
          }
        }
      }
    ];

    // Phase-specific additional columns
    const phaseSpecificColumns: DataGridColumn<WarmupAccountWithPhases>[] = [];

    // Add phase-specific columns based on the phase
    switch (phaseId) {
      case 'invalid':
        // Invalid accounts show status, issues, and recovery actions
        phaseSpecificColumns.push(
          {
            id: 'account_status',
            field: 'status',
            header: 'Account Status',
            width: 140,
            minWidth: 120,
            resizable: true,
            sortable: true,
            filterable: true,
            type: 'select',
            align: 'left',
            visible: true,
            order: 3,
            frozen: false,
            editable: false,
            required: false,
            options: [
              { value: 'banned', label: 'Banned' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'inactive', label: 'Inactive' }
            ],
            render: (value) => (
              <span className={`text-xs px-2 py-1 rounded-full ${
                value === 'banned' ? 'bg-red-100 text-red-800' :
                value === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-700'
              }`}>
                {value || 'Unknown'}
              </span>
            )
          },
          {
            id: 'lifecycle_state',
            field: 'lifecycle_state',
            header: 'Lifecycle State',
            width: 140,
            minWidth: 120,
            resizable: true,
            sortable: true,
            filterable: true,
            type: 'text',
            align: 'left',
            visible: true,
            order: 4,
            frozen: false,
            editable: false,
            required: false,
            render: (value) => (
              <span className="text-xs text-gray-600 capitalize">{value || 'Unknown'}</span>
            )
          },
          {
            id: 'invalid_actions',
            field: 'id',
            header: 'Recovery Actions',
            width: 240,
            minWidth: 200,
            resizable: false,
            sortable: false,
            filterable: false,
            type: 'custom',
            align: 'center',
            visible: true,
            order: 5,
            frozen: false,
            editable: false,
            required: false,
            render: (value, row) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleReactivateAccount(row.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors"
                  title="Attempt to reactivate account"
                >
                  <CheckCircle className="h-3 w-3" />
                  Reactivate
                </button>
                <button
                  onClick={() => handleMarkForReplacement(row.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-50 hover:bg-orange-100 text-orange-700 rounded transition-colors"
                  title="Mark for replacement"
                >
                  <RotateCcw className="h-3 w-3" />
                  Replace
                </button>
                <button
                  onClick={() => {
                    setSelectedAccountId(row.id);
                    setShowPhaseDetails(true);
                  }}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                  title="View account details"
                >
                  <Eye className="h-3 w-3" />
                  Details
                </button>
              </div>
            )
          }
        );
        break;

      case 'manual_setup':
        // Manual setup shows all required account details with better visibility
        phaseSpecificColumns.push(
          {
            id: 'email',
            field: 'email',
            header: 'Email',
            width: 220,
            minWidth: 180,
            resizable: true,
            sortable: false,
            filterable: false,
            type: 'text',
            align: 'left',
            visible: true,
            order: 3,
            frozen: false,
            editable: false,
            required: false,
            render: (value, row) => {
              const email = row.account_details?.email || row.email || 'Not set';
              return email !== 'Not set' ? (
                <button
                  onClick={() => handleCopyToIphoneClipboard(email, 'Email')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-mono underline cursor-pointer transition-colors"
                  title="Click to copy email to iPhone clipboard"
                >
                  {email}
                </button>
              ) : (
                <span className="text-xs text-gray-700 font-mono">{email}</span>
              );
            }
          },
          {
            id: 'password',
            field: 'password',
            header: 'Password',
            width: 140,
            minWidth: 120,
            resizable: true,
            sortable: false,
            filterable: false,
            type: 'text',
            align: 'left',
            visible: true,
            order: 4,
            frozen: false,
            editable: false,
            required: false,
            render: (value, row) => {
              const password = row.account_details?.password || row.password || 'Not set';
              return password !== 'Not set' ? (
                <button
                  onClick={() => handleCopyToIphoneClipboard(password, 'Password')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-mono underline cursor-pointer transition-colors"
                  title="Click to copy password to iPhone clipboard"
                >
                  {password}
                </button>
              ) : (
                <span className="text-xs text-gray-700 font-mono">{password}</span>
              );
            }
          },
          {
            id: 'email_password',
            field: 'email_password',
            header: 'Email Password',
            width: 140,
            minWidth: 120,
            resizable: true,
            sortable: false,
            filterable: false,
            type: 'text',
            align: 'left',
            visible: true,
            order: 5,
            frozen: false,
            editable: false,
            required: false,
            render: (value, row) => {
              const emailPassword = row.account_details?.email_password || row.email_password || 'Not set';
              return emailPassword !== 'Not set' ? (
                <button
                  onClick={() => handleCopyToIphoneClipboard(emailPassword, 'Email Password')}
                  className="text-xs text-blue-600 hover:text-blue-800 font-mono underline cursor-pointer transition-colors"
                  title="Click to copy email password to iPhone clipboard"
                >
                  {emailPassword}
                </button>
              ) : (
                <span className="text-xs text-gray-700 font-mono">{emailPassword}</span>
              );
            }
          },
          {
            id: 'proxy_info',
            field: 'proxy_host',
            header: 'Proxy',
            width: 150,
            minWidth: 130,
            resizable: true,
            sortable: false,
            filterable: false,
            type: 'text',
            align: 'left',
            visible: true,
            order: 6,
            frozen: false,
            editable: false,
            required: false,
            render: (value, row) => (
              <div className="text-xs text-gray-600">
                {row.proxy_host ? (
                  <div>
                    <div className="font-mono">{row.proxy_host}:{row.proxy_port}</div>
                    <div className="text-gray-500">{row.proxy_username}</div>
                  </div>
                ) : (
                  <span className="text-gray-400">No proxy</span>
                )}
              </div>
            )
          },
          {
            id: 'manual_setup_actions',
            field: 'id',
            header: 'Actions',
            width: 280,
            minWidth: 260,
            resizable: false,
            sortable: false,
            filterable: false,
            type: 'custom',
            align: 'center',
            visible: true,
            order: 7,
            frozen: false,
            editable: false,
            required: false,
            render: (value, row) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCompleteManualSetup(row.id)}
                  disabled={completingManualSetup[row.id] || markingInvalid[row.id] || fetchingTokens[row.id]}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                  title="Complete manual setup"
                >
                  {completingManualSetup[row.id] ? (
                    <>
                      <div className="w-3 h-3 border border-green-600 border-t-transparent rounded-full animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      Complete
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleMarkInvalid(row.id)}
                  disabled={completingManualSetup[row.id] || markingInvalid[row.id] || fetchingTokens[row.id]}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                  title="Mark account as invalid and free resources"
                >
                  {markingInvalid[row.id] ? (
                    <>
                      <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin" />
                      Marking...
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3" />
                      Invalid
                    </>
                  )}
                </button>
                <div className="relative">
                  <button
                    onClick={() => {
                      const email = row.account_details?.email || row.email;
                      const emailPassword = row.account_details?.email_password || row.email_password;
                      
                      if (!email || !emailPassword) {
                        toast.error('Email and email password are required');
                        return;
                      }
                      
                      handleFetchEmailToken(row.id, email, emailPassword);
                    }}
                    disabled={completingManualSetup[row.id] || markingInvalid[row.id] || fetchingTokens[row.id]}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors disabled:opacity-50"
                    title={accountTokens[row.id] ? `Token: ${accountTokens[row.id]}` : 'Fetch Instagram verification token from email'}
                  >
                    {fetchingTokens[row.id] ? (
                      <>
                        <div className="w-3 h-3 border border-blue-600 border-t-transparent rounded-full animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Mail className="h-3 w-3" />
                        Get Token
                      </>
                    )}
                  </button>
                  {accountTokens[row.id] && (
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {accountTokens[row.id]}
                    </div>
                  )}
                </div>
              </div>
            )
          }
        );
        break;

      case WarmupPhase.USERNAME:
        // Username phase needs to show current vs new username
        phaseSpecificColumns.push({
          id: 'new_username',
          field: 'new_username',
          header: 'New Username',
          width: 140,
          minWidth: 120,
          resizable: true,
          sortable: false,
          filterable: false,
          type: 'text',
          align: 'left',
          visible: true,
          order: 3,
          frozen: false,
          editable: false,
          required: false,
          render: (value) => (
            <span className="text-sm text-blue-700 font-medium">{value || 'Pending assignment'}</span>
          )
        });
        break;

      case WarmupPhase.BIO:
      case WarmupPhase.NAME:
      case WarmupPhase.FIRST_HIGHLIGHT:
      case WarmupPhase.NEW_HIGHLIGHT:
      case WarmupPhase.POST_CAPTION:
      case WarmupPhase.STORY_CAPTION:
        // Content-requiring phases show assigned content
        phaseSpecificColumns.push({
          id: 'assigned_content',
          field: 'assigned_content',
          header: 'Assigned Content',
          width: 200,
          minWidth: 150,
          resizable: true,
          sortable: false,
          filterable: false,
          type: 'text',
          align: 'left',
          visible: true,
          order: 3,
          frozen: false,
          editable: false,
          required: false,
          render: (value) => (
            <div className="text-xs text-gray-600 max-w-[180px] truncate" title={value}>
              {value || 'Content pending'}
            </div>
          )
        });
        break;

      default:
        // For other phases, show status and timing info
        phaseSpecificColumns.push({
          id: 'phase_status',
          field: 'phase_status',
          header: 'Phase Status',
          width: 120,
          minWidth: 100,
          resizable: true,
          sortable: false,
          filterable: false,
          type: 'text',
          align: 'center',
          visible: true,
          order: 3,
          frozen: false,
          editable: false,
          required: false,
          render: (value) => {
            const statusColors = {
              [WarmupPhaseStatus.PENDING]: 'bg-gray-100 text-gray-800',
              [WarmupPhaseStatus.AVAILABLE]: 'bg-blue-100 text-blue-800',
              [WarmupPhaseStatus.IN_PROGRESS]: 'bg-yellow-100 text-yellow-800',
              [WarmupPhaseStatus.COMPLETED]: 'bg-green-100 text-green-800',
              [WarmupPhaseStatus.FAILED]: 'bg-red-100 text-red-800',
              [WarmupPhaseStatus.REQUIRES_REVIEW]: 'bg-purple-100 text-purple-800'
            };
            return (
              <span className={`text-xs px-2 py-1 rounded-full ${statusColors[value as WarmupPhaseStatus] || 'bg-gray-100 text-gray-700'}`}>
                {value || 'Ready'}
              </span>
            );
          }
        });
        break;
    }

    // Always add proxy status, progress, and actions columns at the end
    const endColumns: DataGridColumn<WarmupAccountWithPhases>[] = [
      {
        id: 'proxy_status',
        field: 'proxy_status',
        header: 'Proxy',
        width: 90,
        minWidth: 80,
        resizable: true,
        sortable: true,
        filterable: true,
        type: 'select',
        align: 'center',
        visible: true,
        order: 8,
        frozen: false,
        editable: false,
        required: false,
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
          { value: 'error', label: 'Error' },
          { value: 'unknown', label: 'Unknown' }
        ],
        render: (value) => {
          const proxyColors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-gray-100 text-gray-800',
            error: 'bg-red-100 text-red-800',
            unknown: 'bg-yellow-100 text-yellow-800'
          };
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${proxyColors[value as keyof typeof proxyColors] || proxyColors.unknown}`}>
              {value || 'unknown'}
            </span>
          );
        }
      },
      {
        id: 'warmup_progress',
        field: 'id',
        header: 'Progress',
        width: 180,
        minWidth: 150,
        resizable: true,
        sortable: false,
        filterable: false,
        type: 'custom',
        align: 'left',
        visible: true,
        order: 9,
        frozen: false,
        editable: false,
        required: false,
        render: (value, row) => {
          const status = warmupStatuses[row.id];
          if (!status || status.total_phases === 0) {
            return <span className="text-xs text-gray-400">Not started</span>;
          }
          
          return (
            <div className="flex items-center gap-2 w-full" title={`${status.completed_phases} of ${status.total_phases} phases completed`}>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${status.progress_percent || 0}%` }}
                ></div>
              </div>
              <span className="text-xs font-medium text-gray-600">
                {status.completed_phases}/{status.total_phases}
              </span>
            </div>
          );
        }
      },
      {
        id: 'actions',
        field: 'id',
        header: 'Actions',
        width: 100,
        minWidth: 90,
        resizable: false,
        sortable: false,
        filterable: false,
        type: 'custom',
        align: 'center',
        visible: true,
        order: 10,
        frozen: false,
        editable: false,
        required: false,
        render: (value, row) => (
          <button
            onClick={() => {
              setSelectedAccountId(row.id);
              setShowPhaseDetails(true);
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
            title="View phase details"
          >
            <Eye className="h-3 w-3" />
            Details
          </button>
        )
      }
    ];

    // Only add end columns (proxy and actions) for phases other than manual setup
    if (phaseId === WarmupPhase.MANUAL_SETUP) {
      return [...baseColumns, ...phaseSpecificColumns];
    }
    
    return [...baseColumns, ...phaseSpecificColumns, ...endColumns];
  };

  // Load warmup configuration and iPhones
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingConfig(true);
        
        // Load warmup config for the first model (if any accounts exist)
        if (accounts.length > 0) {
          const firstAccount = accounts[0];
          if (firstAccount.model_id) {
            const config = await apiClient.getWarmupConfig(firstAccount.model_id);
            setWarmupConfig(config);
          }
        }

        // Load available iPhones
        const iphones = await apiClient.getActiveIphones();
        setAvailableIphones(iphones);
        
        // Auto-select first iPhone if available
        if (iphones.length > 0 && !selectedIphoneId) {
          setSelectedIphoneId(iphones[0].id);
        }
        
      } catch (error) {
        console.error('Error loading configuration:', error);
        toast.error('Failed to load warmup configuration');
      } finally {
        setLoadingConfig(false);
      }
    };

    loadInitialData();
  }, [accounts]);

  // Update warmup configuration
  const handleUpdateWarmupConfig = async (updates: any) => {
    if (!warmupConfig?.model_id) return;

    try {
      const updatedConfig = await apiClient.updateWarmupConfig(warmupConfig.model_id, updates);
      setWarmupConfig(updatedConfig);
      toast.success('✅ Warmup configuration updated successfully');
    } catch (error: any) {
      console.error('Error updating warmup config:', error);
      toast.error(`Failed to update configuration: ${error.response?.data?.error || error.message}`);
    }
  };

  if (accountsLoading && accounts.length === 0) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" text="Loading warmup pipeline..." className="min-h-96" />
      </div>
    );
  }

  if (accountsError && accounts.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Warmup Pipeline</h3>
          <p className="text-gray-500 mb-6">{accountsError}</p>
          <button 
            onClick={refreshData}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const totalAccounts = Object.values(phaseAccounts).reduce((sum, accounts) => sum + accounts.length, 0);
  const activeWarmupAccounts = Object.entries(phaseAccounts)
    .filter(([phase]) => !['manual_setup', 'invalid', 'ready_for_assignment'].includes(phase))
    .reduce((sum, [, accounts]) => sum + accounts.length, 0);
  const invalidAccounts = phaseAccounts.invalid?.length || 0;

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">10-Phase Warmup Pipeline</h3>
          <p className="text-sm text-gray-500">
            {totalAccounts} accounts • {activeWarmupAccounts} in warmup • {invalidAccounts} need attention
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button 
            onClick={() => setShowAutomationModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Play className="h-4 w-4" />
            Setup Automation
          </button>
          <button 
            onClick={() => {
              refreshData();
              fetchWarmupData();
            }}
            className="btn-secondary flex items-center gap-2"
            disabled={accountsLoading || loading}
          >
            <RotateCcw className={`h-4 w-4 ${(accountsLoading || loading) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-lg shadow-lg border mb-6">
          <div className="p-4 border-b border-gray-200">
            <h4 className="text-lg font-medium text-gray-900">Warmup Configuration</h4>
            <p className="text-sm text-gray-500">Configure cooldown settings and iPhone selection</p>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cooldown Settings */}
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900">Phase Cooldown Settings</h5>
                {loadingConfig ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                  </div>
                ) : warmupConfig ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Minimum Cooldown (hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={warmupConfig.min_cooldown_hours || 15}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= 1 && value <= 168) {
                            handleUpdateWarmupConfig({ min_cooldown_hours: value });
                          }
                        }}
                        className="form-input"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Minimum time between warmup phases (1-168 hours)
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Maximum Cooldown (hours)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={warmupConfig.max_cooldown_hours || 24}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (value >= 1 && value <= 168) {
                            handleUpdateWarmupConfig({ max_cooldown_hours: value });
                          }
                        }}
                        className="form-input"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Maximum time between warmup phases (1-168 hours)
                      </p>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700">
                        💡 Current cooldown range: {warmupConfig.min_cooldown_hours}-{warmupConfig.max_cooldown_hours} hours
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Each account will wait a random time within this range between phases
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500">No warmup configuration found</p>
                    <p className="text-xs text-gray-400">Create an account with a model to set up configuration</p>
                  </div>
                )}
              </div>

              {/* iPhone Selection */}
              <div className="space-y-4">
                <h5 className="font-medium text-gray-900">iPhone Selection</h5>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    iPhone for Clipboard (Any Status)
                  </label>
                  {availableIphones.length > 0 ? (
                    <div className="space-y-2">
                      <select
                        value={selectedIphoneId || ''}
                        onChange={(e) => setSelectedIphoneId(e.target.value ? parseInt(e.target.value) : null)}
                        className="form-select"
                      >
                        <option value="">Select an iPhone...</option>
                        {availableIphones.map(iphone => (
                          <option key={iphone.id} value={iphone.id}>
                            {iphone.name} ({iphone.ip_address})
                          </option>
                        ))}
                      </select>
                      {selectedIphoneId && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          {(() => {
                            const selectedIphone = availableIphones.find(ip => ip.id === selectedIphoneId);
                            return selectedIphone ? (
                              <div>
                                <p className="text-sm text-green-700 font-medium">
                                  📱 {selectedIphone.name}
                                </p>
                                <p className="text-xs text-green-600">
                                  IP: {selectedIphone.ip_address}:{selectedIphone.xxtouch_port || 46952}
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  Click username fields in manual setup to copy to this iPhone
                                </p>
                              </div>
                            ) : null;
                          })()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-lg">
                      <p className="text-gray-500">No iPhones found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Register an iPhone in the iPhone Management section
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Warmup Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Phase 0: Manual Setup</p>
              <p className="text-2xl font-bold text-blue-600">
                {phaseAccounts.manual_setup?.length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">All non-archived accounts</p>
            </div>
            <User className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Archived Accounts</p>
              <p className="text-2xl font-bold text-red-600">
                {phaseAccounts.invalid?.length || 0}
              </p>
              <p className="text-xs text-gray-500 mt-1">Invalidated accounts</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-600">
                {totalCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">All accounts combined</p>
            </div>
            <Users className="h-8 w-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Search Filter */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
        <select
          value={selectedPhase}
          onChange={(e) => setSelectedPhase(e.target.value)}
          className="form-select"
        >
          <option value="all">All Phases</option>
          <option value="manual_setup">Manual Setup</option>
          <option value="invalid">Archived Accounts</option>
          {phases.map(phase => (
            <option key={phase.id} value={phase.id}>{phase.name}</option>
          ))}
        </select>
      </div>

      {/* Main Content Area - Wall of Tables Layout */}
      <div className={`${showPhaseDetails ? 'flex-1' : 'w-full'} space-y-6 overflow-y-auto`}>
        
        {/* Invalid/Banned Accounts Section */}
        {phaseAccounts.invalid && phaseAccounts.invalid.length > 0 && (
          <div className="bg-white rounded-lg shadow border-l-4 border-red-500">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Archived Accounts</h4>
                  <p className="text-sm text-gray-500">Accounts that have been marked as invalid</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Fields: Username, Container, Status, Archived Date, Reason
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    {phaseAccounts.invalid.length} accounts
                  </span>
                </div>
              </div>
            </div>
            <DataGrid
              data={phaseAccounts.invalid}
              columns={getPhaseColumns('invalid')}
              loading={loading}
              error={error}
              height={600}
              virtualScrolling={false}
              multiSelect={true}
              rowSelection={true}
              keyboardNavigation={true}
            />
          </div>
        )}

        {/* Manual Setup Phase */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-medium text-gray-900">Phase 0: Manual Setup</h4>
                <p className="text-sm text-gray-500">Human container configuration and Instagram login</p>
                <p className="text-xs text-gray-400 mt-1">
                  Fields: Username, Container, Email, Password, Complete Button
                </p>
              </div>
              <div className="ml-auto">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {phaseAccounts.manual_setup?.length || 0} accounts
                </span>
              </div>
            </div>
          </div>
          
          {/* Batch Actions for Manual Setup */}
          {phaseAccounts.manual_setup && phaseAccounts.manual_setup.length > 0 && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={selectedAccounts.size > 0 && phaseAccounts.manual_setup.every(account => selectedAccounts.has(account.id))}
                      onChange={(e) => handleSelectAll(phaseAccounts.manual_setup, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Select All ({phaseAccounts.manual_setup.length})
                  </label>
                  {selectedAccounts.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedAccounts.size} account{selectedAccounts.size === 1 ? '' : 's'} selected
                    </span>
                  )}
                </div>
                
                {selectedAccounts.size > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleBatchCompleteManualSetup}
                      disabled={batchActionLoading}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                      title={`Complete manual setup for ${selectedAccounts.size} selected accounts`}
                    >
                      {batchActionLoading ? (
                        <>
                          <div className="w-4 h-4 border border-green-600 border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Complete ({selectedAccounts.size})
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleBatchMarkInvalid}
                      disabled={batchActionLoading}
                      className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                      title={`Mark ${selectedAccounts.size} selected accounts as invalid`}
                    >
                      {batchActionLoading ? (
                        <>
                          <div className="w-4 h-4 border border-red-600 border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4" />
                          Mark Invalid ({selectedAccounts.size})
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {phaseAccounts.manual_setup && phaseAccounts.manual_setup.length > 0 ? (
            <DataGrid
              data={phaseAccounts.manual_setup}
              columns={getPhaseColumns('manual_setup')}
              loading={loading}
              error={error}
              height={600}
              virtualScrolling={false}
              multiSelect={true}
              rowSelection={true}
              keyboardNavigation={true}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              No accounts in manual setup phase
            </div>
          )}
        </div>



        {/* Content Readiness Warning - Show once above all phases */}
        {(() => {
          // Aggregate missing content across all accounts with enhanced details
          const allMissingContent = new Map<string, { 
            text: boolean; 
            image: boolean; 
            requirement: string; 
            issue_type: string;
            model_name: string;
          }>();
          
          Object.values(contentReadiness).forEach(readiness => {
            if (!readiness?.is_ready && readiness?.missing_content_phases) {
              readiness.missing_content_phases.forEach((phase: any) => {
                const existing = allMissingContent.get(phase.phase) || { 
                  text: false, 
                  image: false, 
                  requirement: phase.content_requirement,
                  issue_type: phase.issue_type,
                  model_name: readiness.model_name || 'Unknown Model'
                };
                allMissingContent.set(phase.phase, {
                  text: existing.text || phase.missing_text,
                  image: existing.image || phase.missing_image,
                  requirement: phase.content_requirement,
                  issue_type: phase.issue_type,
                  model_name: readiness.model_name || 'Unknown Model'
                });
              });
            }
          });

          if (allMissingContent.size === 0) return null;

          const missingFromModel = Array.from(allMissingContent.entries()).filter(([_, data]) => data.issue_type === 'missing_from_model');
          const notAssignedToAccount = Array.from(allMissingContent.entries()).filter(([_, data]) => data.issue_type === 'not_assigned_to_account');

          return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Content Issues for Warmup Phases
                  </h3>
                  
                  {/* Missing from model */}
                  {missingFromModel.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-red-700 mb-2">
                        🚨 Missing Content in Model (Need to Upload):
                      </h4>
                      <div className="space-y-2">
                        {missingFromModel.map(([phase, data]) => {
                          // Get the readiness data for this phase to access missing_categories
                          const readinessData = Object.values(contentReadiness).find(r => 
                            r?.missing_content_phases?.some((p: any) => p.phase === phase)
                          );
                          const phaseData = readinessData?.missing_content_phases?.find((p: any) => p.phase === phase);
                          
                          return (
                            <div key={phase} className="text-sm text-red-700 border-l-2 border-red-300 pl-3">
                              <div className="font-medium text-red-800 capitalize">{phase.replace(/[_-]/g, ' ')}</div>
                              
                              {/* Show specific missing categories if available */}
                              {phaseData?.missing_categories && phaseData.missing_categories.length > 0 ? (
                                <div className="mt-1 space-y-1">
                                  {phaseData.missing_categories.map((cat: any, idx: number) => (
                                    <div key={idx} className="text-xs flex items-center gap-2">
                                      <span className="text-red-600 font-medium">Missing:</span>
                                      <span className="px-2 py-0.5 bg-red-200 text-red-900 rounded text-xs font-medium">
                                        {cat.display_name} ({cat.type === 'text' ? 'Text' : 'Image'})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                // Fallback to generic content types
                                <div className="mt-1">
                                  <span className="text-red-600 text-xs">needs:</span>
                                  <div className="flex gap-1 mt-1">
                                    {data.text && (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                        Text Content
                                      </span>
                                    )}
                                    {data.image && (
                                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                                        Image Content
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Not assigned to account */}
                  {notAssignedToAccount.length > 0 && (
                    <div className="mt-3">
                      <h4 className="text-sm font-medium text-orange-700 mb-2">
                        ⚠️ Content Exists but Not Assigned:
                      </h4>
                      <div className="space-y-2">
                        {notAssignedToAccount.map(([phase, data]) => (
                          <div key={phase} className="text-sm text-orange-700">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{phase.replace(/[_-]/g, ' ')}</span>
                              <span className="text-orange-600">content available but not assigned</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="flex gap-2">
                      {missingFromModel.length > 0 && (
                        <>
                          <button
                            onClick={() => window.open('/campaign-pools', '_blank')}
                            className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Create Content Bundles
                          </button>
                          <button
                            onClick={() => window.open('/content-registry', '_blank')}
                            className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Content Registry
                          </button>
                        </>
                      )}
                      {notAssignedToAccount.length > 0 && (
                        <button
                          onClick={async () => {
                            // Trigger content assignment for all accounts in this model
                            try {
                              const modelId = Object.values(contentReadiness)[0]?.model_id;
                              if (modelId) {
                                const response = await fetch(`/api/accounts/assign-content-bulk?model_id=${modelId}`, {
                                  method: 'POST'
                                });
                                if (response.ok) {
                                  window.location.reload(); // Refresh to show updated status
                                }
                              }
                            } catch (error) {
                              console.error('Failed to assign content:', error);
                            }
                          }}
                          className="bg-orange-100 px-3 py-2 rounded-md text-sm font-medium text-orange-800 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                        >
                          Assign Existing Content
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Bot Phases - Always show all phases with improved visibility */}
        {phases.map((phase) => {
          const Icon = phase.icon;
          const phaseAccountsList = phaseAccounts[phase.id] || [];
          
          return (
            <div key={phase.id} className="bg-white border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900">{phase.name}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {phaseAccountsList.length} accounts
                    </span>
                  </div>
                </div>
              </div>

              {phaseAccountsList.length > 0 ? (
                <DataGrid
                  data={phaseAccountsList}
                  columns={getPhaseColumns(phase.id)}
                  loading={loading}
                  error={error}
                  height={500}
                  virtualScrolling={false}
                  multiSelect={true}
                  rowSelection={true}
                  keyboardNavigation={true}
                />
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No accounts in {phase.name.toLowerCase()} phase
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Phase Details Panel */}
      {showPhaseDetails && selectedAccountId && (
        <div className="w-96 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900">Phase Details</h4>
            <button
              onClick={() => {
                setShowPhaseDetails(false);
                setSelectedAccountId(null);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="flex-1">
            <WarmupPhaseTracker 
              accountId={selectedAccountId} 
              showTitle={false}
              compact={true}
            />
          </div>
        </div>
      )}

      {/* Automation Setup Modal */}
      <AutomationSetupModal
        isOpen={showAutomationModal}
        onClose={() => setShowAutomationModal(false)}
        onSuccess={handleAutomationSuccess}
        modelId={modelId}
        accounts={phaseAccounts.manual_setup || []}
      />

      {/* Token Popup Modal */}
      {showTokenPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Instagram Verification Token</h3>
              <button
                onClick={() => setShowTokenPopup(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Token for <strong>{showTokenPopup.username}</strong>:
              </p>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-3xl font-mono font-bold text-blue-900 tracking-wider">
                  {showTokenPopup.token}
                </p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(showTokenPopup.token);
                    toast.success('Token copied to clipboard!');
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Copy Token
                </button>
                <button
                  onClick={() => setShowTokenPopup(null)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarmupPipelineTab; 