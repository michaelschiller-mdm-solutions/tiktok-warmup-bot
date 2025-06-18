import React, { useState, useEffect } from 'react';
import { Activity, Play, Pause, RotateCcw, TrendingUp, Clock, Eye, ChevronRight, User, Hash, Image, FileText, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { DataGrid } from '../DataGrid';
import { DataGridColumn } from '../../types/dataGrid';
import { Account } from '../../types/accounts';
import { useAccountsData } from '../../hooks/useAccountsData';
import LoadingSpinner from '../LoadingSpinner';
import WarmupPhaseTracker from '../AccountLifecycle/WarmupPhaseTracker';
import { apiClient } from '../../services/api';
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
  const [warmupStatuses, setWarmupStatuses] = useState<Record<number, WarmupStatusSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completingManualSetup, setCompletingManualSetup] = useState<Record<number, boolean>>({});
  const [markingInvalid, setMarkingInvalid] = useState<Record<number, boolean>>({});

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

  // Fetch warmup data for accounts
  const fetchWarmupData = async () => {
    if (accounts.length === 0) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get warmup status for each account
      const statusPromises = accounts.map(async (account) => {
        try {
          const status = await apiClient.getWarmupStatus(account.id);
          return { accountId: account.id, status };
        } catch (err) {
          console.warn(`Failed to get warmup status for account ${account.id}:`, err);
          return { accountId: account.id, status: null };
        }
      });

      const statusResults = await Promise.all(statusPromises);
      const statusMap: Record<number, WarmupStatusSummary> = {};
      
      statusResults.forEach(({ accountId, status }) => {
        if (status) {
          statusMap[accountId] = status;
        }
      });

      setWarmupStatuses(statusMap);

      // Group accounts by their current warmup phase
      const phaseGroups: Record<string, WarmupAccountWithPhases[]> = {
        manual_setup: [],
        ready_for_assignment: [],
        ...Object.fromEntries(WARMUP_PHASES.map(phase => [phase.id, []]))
      };
      
      accounts.forEach(account => {
        const warmupStatus = statusMap[account.id];
        const warmupAccount: WarmupAccountWithPhases = {
          ...account,
          warmup_progress: warmupStatus?.progress_percent || 0,
          phases: warmupStatus?.phases || [],
          current_phase: undefined,
          phase_status: undefined,
          assigned_content: undefined,
          next_available_at: undefined,
          account_details: warmupStatus?.account_details
        };

        if (account.lifecycle_state === 'imported') {
          // Accounts that need manual setup
          phaseGroups.manual_setup.push(warmupAccount);
        } else if (account.lifecycle_state === 'ready') {
          // Accounts ready for bot assignment
          phaseGroups.ready_for_assignment.push(warmupAccount);
        } else if (account.lifecycle_state === 'warmup' && warmupStatus) {
          // Find the current active phase (available now or in progress)
          const availablePhase = warmupStatus.phases.find(p => 
            p.status === WarmupPhaseStatus.AVAILABLE || p.status === WarmupPhaseStatus.IN_PROGRESS
          );
          
          if (availablePhase) {
            const phaseId = availablePhase.phase;
            warmupAccount.current_phase = phaseId;
            warmupAccount.phase_status = availablePhase.status as WarmupPhaseStatus;
            warmupAccount.assigned_content = availablePhase.assigned_text?.text_content || 
                                           availablePhase.assigned_content?.original_name;
            
            if (phaseGroups[phaseId]) {
              phaseGroups[phaseId].push(warmupAccount);
            }
          } else {
            // Check if there are phases waiting for timeout to expire
            const waitingPhase = warmupStatus.phases.find(p => 
              p.status === WarmupPhaseStatus.PENDING && 
              p.available_at && 
              new Date(p.available_at) > new Date()
            );
            
            if (waitingPhase) {
              // Account is waiting for cooldown to expire
              warmupAccount.current_phase = 'waiting_cooldown';
              warmupAccount.phase_status = WarmupPhaseStatus.PENDING;
              warmupAccount.next_available_at = waitingPhase.available_at;
              phaseGroups.ready_for_assignment.push(warmupAccount);
            } else {
              // No active phase, put in ready for assignment
              phaseGroups.ready_for_assignment.push(warmupAccount);
            }
          }
        } else {
          // Default to ready for assignment
          phaseGroups.ready_for_assignment.push(warmupAccount);
        }
      });
      
      setPhaseAccounts(phaseGroups);
    } catch (err: any) {
      console.error('Error fetching warmup data:', err);
      setError(err.message || 'Failed to load warmup data');
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
        // Refresh data to show updated state
        await fetchWarmupData();
        await refreshData();
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
        // Refresh data to show updated state
        await fetchWarmupData();
        await refreshData();
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

  // Define columns for account display in each phase
  const getPhaseColumns = (phaseId?: string): DataGridColumn<WarmupAccountWithPhases>[] => {
    // Base columns that are always visible
    const baseColumns: DataGridColumn<WarmupAccountWithPhases>[] = [
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
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                #{value}
              </span>
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
            <span className="font-medium text-sm">{value}</span>
          </div>
        )
      }
    ];

    // Phase-specific additional columns
    const phaseSpecificColumns: DataGridColumn<WarmupAccountWithPhases>[] = [];

    // Add phase-specific columns based on the phase
    switch (phaseId) {
      case 'manual_setup':
        // Manual setup shows all required account details
        phaseSpecificColumns.push(
          {
            id: 'password',
            field: 'password',
            header: 'Password',
            width: 150,
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
            render: (value, row) => (
              <span className="text-xs text-gray-700 font-mono">{row.account_details?.password || 'Not set'}</span>
            )
          },
          {
            id: 'email',
            field: 'email',
            header: 'Email',
            width: 200,
            minWidth: 160,
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
            render: (value, row) => (
              <span className="text-xs text-gray-700">{row.account_details?.email || 'Not set'}</span>
            )
          },
          {
            id: 'email_password',
            field: 'email_password',
            header: 'Email Password',
            width: 160,
            minWidth: 130,
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
            render: (value, row) => (
              <span className="text-xs text-gray-700 font-mono">{row.account_details?.email_password || 'Not set'}</span>
            )
          },


          {
            id: 'manual_setup_actions',
            field: 'id',
            header: 'Actions',
            width: 260,
            minWidth: 240,
            resizable: false,
            sortable: false,
            filterable: false,
            type: 'custom',
            align: 'center',
            visible: true,
            order: 6,
            frozen: false,
            editable: false,
            required: false,
            render: (value, row) => (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleCompleteManualSetup(row.id)}
                  disabled={completingManualSetup[row.id] || markingInvalid[row.id]}
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
                  disabled={completingManualSetup[row.id] || markingInvalid[row.id]}
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

    // Always add proxy status and actions columns at the end
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
        order: 9,
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
    .filter(([phase]) => !['manual_setup', 'ready_for_assignment'].includes(phase))
    .reduce((sum, [, accounts]) => sum + accounts.length, 0);

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">10-Phase Warmup Pipeline</h3>
          <p className="text-sm text-gray-500">
            {totalAccounts} accounts • {activeWarmupAccounts} in active warmup phases
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Warmup Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Manual Setup</p>
              <p className="text-2xl font-bold text-blue-600">
                {phaseAccounts.manual_setup?.length || 0}
              </p>
            </div>
            <User className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ready for Bot</p>
              <p className="text-2xl font-bold text-green-600">
                {phaseAccounts.ready_for_assignment?.length || 0}
              </p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">
                {activeWarmupAccounts}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-purple-600">
                {accounts.filter(a => a.lifecycle_state === 'active').length}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-600" />
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
          <option value="ready_for_assignment">Ready for Bot</option>
          {WARMUP_PHASES.map(phase => (
            <option key={phase.id} value={phase.id}>{phase.name}</option>
          ))}
        </select>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-6">
        {/* Phase Sections */}
        <div className={`${showPhaseDetails ? 'flex-1' : 'w-full'} space-y-6 overflow-y-auto`}>
          
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
                    Fields: Username, Container, Proxy Host, Complete Button
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {phaseAccounts.manual_setup?.length || 0} accounts
                  </span>
                </div>
              </div>
            </div>
            {phaseAccounts.manual_setup && phaseAccounts.manual_setup.length > 0 ? (
              <DataGrid
                data={phaseAccounts.manual_setup}
                columns={getPhaseColumns('manual_setup')}
                loading={loading}
                error={error}
                height={200}
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

          {/* Ready for Assignment Phase */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Ready for Bot Assignment</h4>
                  <p className="text-sm text-gray-500">Accounts ready for random phase assignment</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Fields: Username, Container, Proxy Status
                  </p>
                </div>
                <div className="ml-auto">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {phaseAccounts.ready_for_assignment?.length || 0} accounts
                  </span>
                </div>
              </div>
            </div>
            {phaseAccounts.ready_for_assignment && phaseAccounts.ready_for_assignment.length > 0 ? (
              <DataGrid
                data={phaseAccounts.ready_for_assignment}
                columns={getPhaseColumns('ready_for_assignment')}
                loading={loading}
                error={error}
                height={200}
                virtualScrolling={false}
                multiSelect={true}
                rowSelection={true}
                keyboardNavigation={true}
              />
            ) : (
              <div className="p-8 text-center text-gray-500">
                No accounts ready for assignment
              </div>
            )}
          </div>

          {/* Bot Phases - Always show all phases */}
          {WARMUP_PHASES.map((phase) => {
            const Icon = phase.icon;
            const phaseAccountsList = phaseAccounts[phase.id] || [];
            
            // Define field descriptions for each phase
            const getFieldDescription = (phaseId: WarmupPhase) => {
              switch (phaseId) {
                case WarmupPhase.BIO:
                  return 'Fields: Username, Container, Assigned Content (Bio Text), Phase Status';
                case WarmupPhase.GENDER:
                  return 'Fields: Username, Container, Phase Status';
                case WarmupPhase.NAME:
                  return 'Fields: Username, Container, Assigned Content (Name Text), Phase Status';
                case WarmupPhase.USERNAME:
                  return 'Fields: Username, Container, New Username, Phase Status';
                case WarmupPhase.FIRST_HIGHLIGHT:
                case WarmupPhase.NEW_HIGHLIGHT:
                  return 'Fields: Username, Container, Assigned Content (Highlight Name + Image), Phase Status';
                case WarmupPhase.POST_CAPTION:
                case WarmupPhase.STORY_CAPTION:
                  return 'Fields: Username, Container, Assigned Content (Caption + Image), Phase Status';
                case WarmupPhase.POST_NO_CAPTION:
                case WarmupPhase.STORY_NO_CAPTION:
                  return 'Fields: Username, Container, Phase Status';
                default:
                  return 'Fields: Username, Container, Proxy Status';
              }
            };
            
            return (
              <div key={phase.id} className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full bg-${phase.color}-100 flex items-center justify-center`}>
                      <Icon className={`h-4 w-4 text-${phase.color}-600`} />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">{phase.name}</h4>
                      <p className="text-sm text-gray-500">
                        {phase.description}
                        {phase.dependency && (
                          <span className="ml-2 text-xs text-orange-600">
                            (Requires: {WARMUP_PHASES.find(p => p.id === phase.dependency)?.name})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {getFieldDescription(phase.id)}
                      </p>
                      {phase.contentTypes.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          Content Required: {phase.contentTypes.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="ml-auto">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-${phase.color}-100 text-${phase.color}-800`}>
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
                    height={200}
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
      </div>
    </div>
  );
};

export default WarmupPipelineTab; 