import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Play, Loader2, CheckCircle, AlertCircle, Wifi, WifiOff, User, Clock, Pause, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Account } from '../../types/accounts';

interface AutomationSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (sessionId: string) => void;
  modelId: number;
  accounts: Account[];

}

// This is the shape of the data sent to the backend API
interface AutomationPayload {
  accountId: number;
  containerNumber: number;
  username: string;
  password: string;
  email: string;
  email_password?: string;
  sessionId?: string;
}

// This is the shape of account data received from the backend status endpoint
interface AccountPayload extends AutomationPayload {}

interface QueuedAccount {
  id: number;
  username: string;
  password: string;
  email: string;
  email_password?: string;
  container_number?: number;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'invalid_password';
  progress?: ProgressData;
  error?: string;
  errorType?: 'technical' | 'password_reset_detected' | 'resource' | 'timeout' | 'no_token_found';
  invalidatedAt?: string;
}

interface ProgressData {
  sessionId: string;
  username: string;
  containerNumber: number;
  accountId?: number;
  status: 'in_progress' | 'completed' | 'failed';
  currentStep: number;
  totalSteps: number;
  stepName: string;
  startTime: string;
  endTime?: string;
  progress: number;
  error?: string;
  errorType?: 'technical' | 'password_reset_detected' | 'resource' | 'timeout' | 'no_token_found';
}

interface PasswordResetData {
  sessionId: string;
  accountId: number;
  username: string;
  email: string;
  timestamp: string;
  accountInvalid: boolean;
  message: string;
  containerNumber?: number;
}

interface AccountStatusChangeData {
  sessionId: string;
  accountId: number;
  username: string;
  email: string;
  status: string;
  reason: string;
  timestamp: string;
}

interface WebSocketMessage {
  type: 'session_started' | 'step_update' | 'session_completed' | 'session_status' | 'password_reset_detected' | 'account_status_change';
  data: ProgressData | PasswordResetData | AccountStatusChangeData;
}

const AutomationSetupModal: React.FC<AutomationSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  modelId,
  accounts
}) => {
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [automationQueue, setAutomationQueue] = useState<QueuedAccount[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [availableAccounts, setAvailableAccounts] = useState<Account[]>([]);
  const [currentProcessingId, setCurrentProcessingId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [isPreVerifying, setIsPreVerifying] = useState(false);
  const [preVerificationResults, setPreVerificationResults] = useState<any>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const steps = [
    { id: 1, name: 'Pre-Email Check', description: 'Check if verification codes already exist in email' },
    { id: 2, name: 'Selecting Container', description: 'Navigate to and select the specified container' },
    { id: 3, name: 'Entering Username', description: 'Open Instagram and paste username/email' },
    { id: 4, name: 'Entering Password & Login', description: 'Enter password and submit login form' },
    { id: 5, name: 'Fetching Verification Token', description: 'Poll email for Instagram verification code' },
    { id: 6, name: 'Entering Token & Skipping Onboarding', description: 'Enter verification code and skip onboarding' }
  ];

  useEffect(() => {
    setAvailableAccounts(accounts);
  }, [accounts]);

  // WebSocket connection management
  const connectWebSocket = (currentSessionId?: string | null) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      wsRef.current = new WebSocket('ws://localhost:3001');

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setWsConnected(true);
        // If we have a session ID, register this client for updates
        const aSessionId = currentSessionId || sessionId;
        if (aSessionId) {
            wsRef.current?.send(JSON.stringify({
                type: 'register',
                sessionId: aSessionId
            }));
        }
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = async (event) => {
        const message = JSON.parse(event.data);

        // Handle password reset detection - immediate account invalidation
        if (message.type === 'password_reset_detected') {
          const resetData = message.data as PasswordResetData;
          handlePasswordResetDetection(resetData);
          return;
        }

        // Handle account status changes
        if (message.type === 'account_status_change') {
          const statusData = message.data as AccountStatusChangeData;
          handleAccountStatusChange(statusData);
          return;
        }

        // Update queue based on a more detailed session_status message
        if (message.type === 'session_status') {
            const sessionData = message.data;
            const newQueue: QueuedAccount[] = sessionData.accounts.map((acc: AccountPayload, index: number) => {
                const result = sessionData.results.find((r: any) => r.accountId === acc.accountId);
                let status: QueuedAccount['status'] = 'queued';
                
                if (sessionData.currentAccountIndex > index) {
                    // Account has been processed
                    if (result?.status === 'failed') {
                        status = result.errorType === 'no_token_found' ? 'failed' : result.errorType === 'password_reset_detected' ? 'invalid_password' : 'failed';
                    } else {
                        status = 'completed';
                    }
                } else if (sessionData.currentAccountIndex === index && sessionData.status === 'in_progress') {
                    status = 'in_progress';
                }
                
                return {
                    id: acc.accountId,
                    username: acc.username,
                    password: acc.password,
                    email: acc.email,
                    email_password: acc.email_password,
                    container_number: acc.containerNumber,
                    status: status,
                    error: result?.error,
                    errorType: result?.errorType || 'technical',
                };
            });
            setAutomationQueue(newQueue);
            setIsRunning(sessionData.status === 'in_progress' || sessionData.status === 'queued');
            setIsPaused(sessionData.status === 'paused');
            return;
        }

        // Handle other messages (step_update, session_completed) - Enhanced with error types
        if (message.type === 'step_update' || message.type === 'session_completed' || message.type === 'session_started') {
            const progressData = message.data as ProgressData;

            // Some step_update payloads do not include accountId – fall back to the currentProcessingId
            const targetAccountId = progressData.accountId ?? currentProcessingId;

            if (targetAccountId) {
              const { accountId: _ignored, ...otherData } = progressData;

              setAutomationQueue(prev => prev.map(account => 
                  account.id === targetAccountId
                      ? { 
                          ...account, 
                          status: otherData.status === 'failed' && otherData.error?.includes('password') ? 'invalid_password' : (otherData.status as QueuedAccount['status']),
                          progress: progressData,
                          error: otherData.error,
                          errorType: otherData.error?.includes('password') ? 'password_reset_detected' : 'technical'
                        }
                      : account
              ));

              if (otherData.status === 'in_progress') {
                  setCurrentProcessingId(targetAccountId);
                  setProgress(progressData);
              }

              if (message.type === 'session_completed') {
                  if (otherData.status === 'completed') {
                      handleAccountSetupSuccess(targetAccountId);
                  } else if (otherData.status === 'failed') {
                      if (otherData.errorType === 'password_reset_detected' || otherData.error?.includes('password')) {
                          toast.error(`Account ${progressData.username ?? 'Account'} has incorrect password`);
                      } else if (otherData.errorType === 'no_token_found' || otherData.error?.includes('token')) {
                          toast(`Account ${progressData.username ?? 'Account'} skipped - no verification token found`, { icon: '⚠️' });
                      } else {
                          toast.error(`Account ${progressData.username ?? 'Account'} setup failed: ${otherData.error}`);
                      }
                  }
              }
            }
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setWsConnected(false);
        
        // Auto-reconnect if we're expecting updates
        if (isRunning && !isPaused && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect WebSocket...');
            connectWebSocket();
          }, 3000);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setWsConnected(false);
    }
  };

  const handleAccountSetupSuccess = async (accountId: number) => {
    try {
      const response = await fetch(`/api/accounts/lifecycle/${accountId}/complete-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ changed_by: 'automation_frontend' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Failed to move account ${accountId} to ready state: ${errorData.message}`);
      } else {
        toast.success(`Account ${accountId} moved to 'Ready for Bot Assignment'.`);
      }
    } catch (error) {
      console.error(`Error transitioning account ${accountId}:`, error);
      toast.error(`Error transitioning account ${accountId} to ready state.`);
    }
  };

  const disconnectWebSocket = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setWsConnected(false);
  };



  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAccountIds(availableAccounts.map(acc => acc.id));
    } else {
      setSelectedAccountIds([]);
    }
  };

  const emailDomains = useMemo(() => {
    const domains: { [domain: string]: number[] } = {};
    availableAccounts.forEach(acc => {
      const parts = acc.email?.split('@');
      if (parts && parts.length === 2) {
        const domain = parts[1].toLowerCase();
        if (!domains[domain]) {
          domains[domain] = [];
        }
        domains[domain].push(acc.id);
      }
    });
    return domains;
  }, [availableAccounts]);

  const handleSelectDomain = (domain: string, checked: boolean) => {
    const domainAccountIds = emailDomains[domain] || [];
    setSelectedAccountIds(prev => {
      if (checked) {
        // add missing ids
        const newIds = domainAccountIds.filter(id => !prev.includes(id));
        return [...prev, ...newIds];
      } else {
        // remove ids in this domain
        return prev.filter(id => !domainAccountIds.includes(id));
      }
    });
  };

  // Rewritten handleStartAutomation
  const handleStartAutomation = async () => {
    if (selectedAccountIds.length === 0) {
      toast.error('Please select at least one account.');
      return;
    }

    const payload: AutomationPayload[] = availableAccounts
      .filter(acc => selectedAccountIds.includes(acc.id))
      .map(acc => ({
        accountId: acc.id,
        containerNumber: acc.container_number || 1, // Default to 1 if not set
        username: acc.username,
        password: acc.password,
        email: acc.email,
        email_password: acc.email_password,
      }));

    try {
      const response = await fetch('/api/automation/start-account-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start automation session');
      }

      const result = await response.json();
      setSessionId(result.sessionId);
      localStorage.setItem('automationSessionId', result.sessionId);
      
      // The rest of the UI will now be driven by WebSocket messages and status polling
      // so we can set the queue visually here.
      const queue: QueuedAccount[] = payload.map(p => ({
          id: p.accountId,
          username: p.username,
          password: p.password,
          email: p.email,
          email_password: p.email_password,
          container_number: p.containerNumber,
          status: 'queued'
      }));
      setAutomationQueue(queue);
      setIsRunning(true);
      
      toast.success(`Automation queue started for ${payload.length} accounts.`);

    } catch (error: any) {
      console.error('Failed to start automation:', error);
      toast.error(error.message);
    }
  };

  // Pause/Resume automation
  const handlePauseResume = async () => {
    if (!sessionId) {
      toast.error('No active session to pause/resume');
      return;
    }

    try {
      if (isPaused) {
        // Resume the session
        const response = await fetch(`/api/automation/resume/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error('Failed to resume automation');
        }
        
        setIsPaused(false);
        toast.success('Automation resumed');
      } else {
        // Pause the session
        const response = await fetch(`/api/automation/pause/${sessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error('Failed to pause automation');
        }
        
        setIsPaused(true);
        toast.success('Automation paused');
      }
    } catch (error: any) {
      console.error('Error pausing/resuming automation:', error);
      toast.error(error.message || 'Failed to pause/resume automation');
    }
  };

  // Stop automation
  const handleStopAutomation = async () => {
    if (!sessionId) {
      toast.error('No active session to stop');
      return;
    }

    try {
      const response = await fetch(`/api/automation/stop/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop automation');
      }
      
      // Reset local state
      setIsRunning(false);
      setIsPaused(false);
      setCurrentProcessingId(null);
      setProgress(null);
      setAutomationQueue([]);
      
      // Clear session storage
      localStorage.removeItem('automationSessionId');
      setSessionId(null);
      
      toast.success('Automation stopped');
    } catch (error: any) {
      console.error('Error stopping automation:', error);
      toast.error(error.message || 'Failed to stop automation');
    }
  };

  // Handle account selection
  const handleAccountSelection = (accountId: number, selected: boolean) => {
    setSelectedAccountIds(prev => selected 
      ? [...prev, accountId]
      : prev.filter(id => id !== accountId)
    );
  };

  // Handle pre-verification email check
  const handlePreVerification = async () => {
    if (selectedAccountIds.length === 0) {
      toast.error('Please select at least one account.');
      return;
    }

    const accountsToVerify = availableAccounts
      .filter(acc => selectedAccountIds.includes(acc.id))
      .map(acc => ({
        id: acc.id,
        email: acc.email,
        email_password: acc.email_password,
        username: acc.username
      }))
      .filter(acc => acc.email && acc.email_password); // Only accounts with email credentials

    if (accountsToVerify.length === 0) {
      toast.error('Selected accounts must have email and email_password set.');
      return;
    }

    setIsPreVerifying(true);
    setPreVerificationResults(null);

    try {
      const response = await fetch('/api/automation/pre-verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: accountsToVerify }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to perform pre-verification');
      }

      const result = await response.json();
      setPreVerificationResults(result);

      // Show results
      const { summary } = result;
      if (summary.verified > 0) {
        toast.success(`✅ ${summary.verified} accounts verified and moved to warmup!`);
      }
      if (summary.invalid > 0) {
        toast.error(`❌ ${summary.invalid} accounts marked invalid due to email issues.`);
      }
      if (summary.unchanged > 0) {
        toast(`📭 ${summary.unchanged} accounts unchanged - no verification codes found.`);
      }

      // Update selected accounts to exclude those that were processed
      const processedAccountIds = result.results
        .filter((r: any) => r.action !== 'none')
        .map((r: any) => r.accountId);
      
      setSelectedAccountIds(prev => prev.filter(id => !processedAccountIds.includes(id)));

      // Refresh data to reflect changes
      if (summary.verified > 0 || summary.invalid > 0) {
        // Optional: refresh the parent component data
        // This would need to be passed as a prop if needed
      }

    } catch (error: any) {
      console.error('Failed to perform pre-verification:', error);
      toast.error(error.message);
    } finally {
      setIsPreVerifying(false);
    }
  };

  // useEffect for checking session on mount
  useEffect(() => {
    if (isOpen) {
      const savedSessionId = localStorage.getItem('automationSessionId');
      if (savedSessionId) {
        setSessionId(savedSessionId);
        // Fetch the current state of the session
        fetch(`/api/automation/status/${savedSessionId}`)
            .then(res => res.json())
            .then(data => {
                if (data.hasActiveSession) {
                    toast.success('Restored active automation session.');
                    const { status, results, accounts, currentAccountIndex } = data;
                    // Re-hydrate the queue
                    const restoredQueue: QueuedAccount[] = accounts.map((acc: AccountPayload, index: number) => {
                        const result = results.find((r:any) => r.accountId === acc.accountId);
                        let queueStatus: QueuedAccount['status'] = 'queued';
                        
                        if (index < currentAccountIndex) {
                           queueStatus = result?.status === 'failed' ? 'failed' : 'completed';
                        } else if (index === currentAccountIndex && status === 'in_progress') {
                           queueStatus = 'in_progress';
                           setCurrentProcessingId(acc.accountId);
                        }
                        
                        return {
                          id: acc.accountId,
                          username: acc.username,
                          password: acc.password,
                          email: acc.email,
                          email_password: acc.email_password,
                          container_number: acc.containerNumber,
                          status: queueStatus,
                          error: result?.error
                        };
                    });
                    setAutomationQueue(restoredQueue);
                    setIsRunning(status === 'in_progress' || status === 'queued');
                } else {
                    // Session is no longer active on server, clear it from storage
                    localStorage.removeItem('automationSessionId');
                    setSessionId(null);
                }
            }).catch(err => {
                console.error("Failed to fetch session status", err);
                localStorage.removeItem('automationSessionId');
                setSessionId(null);
            });
      }
      connectWebSocket(savedSessionId);
    } else {
      disconnectWebSocket();
      setProgress(null);
      setIsRunning(false);
      setIsPaused(false);
      setAutomationQueue([]);
      setCurrentProcessingId(null);
    }
  }, [isOpen]);

  /*
   * Prevent disconnecting the active session when the modal is merely hidden.
   * We only disconnect when the component unmounts AND there is no running automation session.
   */
  useEffect(() => {
    return () => {
      if (!isRunning) {
        disconnectWebSocket();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle password reset detection - immediate resource cleanup and account invalidation
  const handlePasswordResetDetection = async (resetData: PasswordResetData) => {
    console.log('Password reset detected for account:', resetData.username);
    
    // Immediately mark account as invalid in queue
    setAutomationQueue(prev => prev.map(account => 
      account.id === resetData.accountId
        ? { 
            ...account, 
            status: 'invalid_password',
            error: resetData.message,
            errorType: 'password_reset_detected',
            invalidatedAt: resetData.timestamp
          }
        : account
    ));

    // Stop processing this account
    if (resetData.accountId && currentProcessingId === resetData.accountId) {
      setCurrentProcessingId(null);
      setProgress(null);
    }

    // Show notification
    toast.error(`Invalid password detected for ${resetData.username}. Account marked as invalid.`);
    
    // Try to update account in backend
    if (resetData.accountId) {
      try {
        await fetch(`/api/accounts/lifecycle/${resetData.accountId}/mark-invalid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: 'password_reset_detected',
          changed_by: 'automation_frontend',
          details: resetData.message 
        })
      });
      } catch (error) {
        console.error('Failed to mark account as invalid in backend:', error);
      }
    }
  };

  // Handle account status changes
  const handleAccountStatusChange = async (statusData: AccountStatusChangeData) => {
    console.log('Account status change:', statusData);
    
    setAutomationQueue(prev => prev.map(account => 
      account.id === statusData.accountId
        ? { 
            ...account, 
            status: statusData.status === 'invalid' ? 'invalid_password' : account.status,
            error: statusData.reason,
            errorType: statusData.reason.includes('password') ? 'password_reset_detected' : 'technical'
          }
        : account
    ));

    // Show notification for status changes
    if (statusData.status === 'invalid') {
      toast.error(`Account ${statusData.username} status changed: ${statusData.reason}`);
    }
  };

  if (!isOpen) return null;

  const completedCount = automationQueue.filter(account => account.status === 'completed').length;
  const failedCount = automationQueue.filter(account => account.status === 'failed').length;
  const invalidPasswordCount = automationQueue.filter(account => account.status === 'invalid_password').length;
  const totalCount = automationQueue.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Play className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Instagram Account Automation Queue</h2>
            <div className={`flex items-center space-x-1 text-sm ${wsConnected ? 'text-green-600' : 'text-red-600'}`}>
              {wsConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              <span>{wsConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          <button
            onClick={() => {
              // Allow closing even while running – keep WebSocket & session alive
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
            title={isRunning && !isPaused ? 'Hide queue (continues in background)' : 'Close'}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Queue Status */}
          {automationQueue.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-blue-900">Automation Queue Status</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-green-700">{completedCount} completed</span>
                  <span className="text-red-700">{failedCount} failed</span>
                  <span className="text-orange-700">{invalidPasswordCount} invalid password</span>
                  <span className="text-blue-700">{totalCount - completedCount - failedCount - invalidPasswordCount} remaining</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalCount > 0 ? ((completedCount + failedCount + invalidPasswordCount) / totalCount) * 100 : 0}%` }}
                ></div>
              </div>

              {/* Control Buttons */}
              {isRunning && (
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handlePauseResume}
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      isPaused 
                        ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-3 w-3 inline mr-1" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3 inline mr-1" />
                        Pause
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleStopAutomation}
                    className="px-3 py-1 rounded text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
                  >
                    <X className="h-3 w-3 inline mr-1" />
                    Stop
                  </button>
                  {isPaused && (
                    <span className="text-sm text-yellow-600">Queue paused</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Current Progress */}
          {progress && currentProcessingId && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-blue-900">
                  Current: {progress.username} (Container #{progress.containerNumber})
                </h3>
                <div className="flex items-center space-x-2">
                  {progress.status === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                  {progress.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {progress.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-600" />}
                  <span className="text-sm font-medium">{progress.progress}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.progress}%` }}
                ></div>
              </div>

              {/* Current Step */}
              <div className="text-sm text-blue-800">
                <strong>Step {progress.currentStep} of {progress.totalSteps}:</strong> {progress.stepName}
              </div>

              {/* Steps List */}
              <div className="grid grid-cols-6 gap-2">
                {steps.map((step) => (
                  <div key={step.id} className={`text-center text-xs ${
                    step.id < progress.currentStep ? 'text-green-700' :
                    step.id === progress.currentStep ? 'text-blue-700 font-medium' :
                    'text-gray-500'
                  }`}>
                    <div className={`w-6 h-6 mx-auto rounded-full flex items-center justify-center text-xs mb-1 ${
                      step.id < progress.currentStep ? 'bg-green-100 text-green-700' :
                      step.id === progress.currentStep ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {step.id < progress.currentStep ? '✓' : step.id}
                    </div>
                    <div className="break-words">{step.name}</div>
                  </div>
                ))}
              </div>

              {/* Error Display */}
              {progress.error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
                  <strong>Error:</strong> {progress.error}
                </div>
              )}
            </div>
          )}

          {/* Pre-verification Results */}
          {preVerificationResults && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">📧 Email Pre-Verification Results</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{preVerificationResults.summary.verified}</div>
                  <div className="text-gray-600">Verified & Ready</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{preVerificationResults.summary.invalid}</div>
                  <div className="text-gray-600">Marked Invalid</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">{preVerificationResults.summary.unchanged}</div>
                  <div className="text-gray-600">No Code Found</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{preVerificationResults.summary.errors}</div>
                  <div className="text-gray-600">Errors</div>
                </div>
              </div>
              <button
                onClick={() => setPreVerificationResults(null)}
                className="mt-3 text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Clear Results
              </button>
            </div>
          )}

          {/* Account Selection */}
          {!isRunning && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Select Accounts for Automation</h3>
                <button
                  onClick={() => setShowAccountSelector(!showAccountSelector)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
                >
                  <span className="text-sm">
                    {selectedAccountIds.length} selected
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${showAccountSelector ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {showAccountSelector && (
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {/* Add Select All Checkbox here */}
                    <div className="p-3 border-b">
                        <label className="flex items-center space-x-3">
                            <input
                                type="checkbox"
                                onChange={(e) => handleSelectAll(e.target.checked)}
                                checked={availableAccounts.length > 0 && selectedAccountIds.length === availableAccounts.length}
                            />
                            <span className="font-medium">Select All</span>
                        </label>
                    </div>
                    {/* Batch domain selection */}
                    {Object.keys(emailDomains).length > 1 && (
                      <div className="p-3 space-y-2 border-b bg-gray-50">
                        <p className="text-xs font-medium text-gray-600">Batch select by email domain</p>
                        {Object.entries(emailDomains).map(([domain, ids]) => {
                          const allSelected = ids.every(id => selectedAccountIds.includes(id));
                          return (
                            <label key={domain} className="flex items-center space-x-2 text-sm">
                              <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={(e) => handleSelectDomain(domain, e.target.checked)}
                              />
                              <span>{domain} ({ids.length})</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                    {availableAccounts.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No accounts in manual setup phase</p>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {availableAccounts.map((account) => (
                          <label key={account.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                            <input
                              type="checkbox"
                              checked={selectedAccountIds.includes(account.id)}
                              onChange={(e) => handleAccountSelection(account.id, e.target.checked)}
                              className="rounded border-gray-300"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-sm">{account.username}</span>
                                {account.container_number && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    Container #{account.container_number}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {account.email}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                </div>
              )}
            </div>
          )}

          {/* Queue Display */}
          {automationQueue.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Automation Queue</h4>
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {automationQueue.map((account, index) => (
                  <React.Fragment key={account.id}>
                    <div className={`flex items-center justify-between p-3 border-b last:border-b-0 ${
                      account.id === currentProcessingId ? 'bg-blue-50' : ''
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium text-sm">{account.username}</div>
                          <div className="text-xs text-gray-500">Container #{account.container_number}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {account.status === 'queued' && <Clock className="h-4 w-4 text-gray-400" />}
                        {account.status === 'in_progress' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                        {account.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {account.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-600" />}
                        {account.status === 'invalid_password' && <AlertCircle className="h-4 w-4 text-orange-600" />}
                        <span className={`text-xs capitalize px-2 py-1 rounded-full ${
                          account.status === 'queued' ? 'bg-gray-100 text-gray-700' :
                          account.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          account.status === 'completed' ? 'bg-green-100 text-green-700' :
                          account.status === 'invalid_password' ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {account.status === 'invalid_password' ? 'Invalid Password' : account.status}
                        </span>
                      </div>
                    </div>
                    {account.status === 'invalid_password' && account.error && (
                      <div className="mt-2 text-xs text-orange-600 bg-orange-50 p-2 rounded border-l-2 border-orange-200">
                        <strong>Reason:</strong> {account.error}
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            disabled={isRunning && !isPaused}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {isRunning && !isPaused ? 'Running...' : 'Close'}
          </button>
          {!isRunning && (
            <>
              <button
                onClick={handlePreVerification}
                disabled={selectedAccountIds.length === 0 || isPreVerifying}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isPreVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>
                  {isPreVerifying 
                    ? 'Checking Emails...' 
                    : `Pre-Verify Emails (${selectedAccountIds.length})`
                  }
                </span>
              </button>
              <button
                onClick={handleStartAutomation}
                disabled={selectedAccountIds.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Play className="h-4 w-4" />
                <span>Start Queue ({selectedAccountIds.length} accounts)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutomationSetupModal; 