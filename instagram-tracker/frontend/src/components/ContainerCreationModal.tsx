import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { 
  X, 
  Smartphone, 
  AlertTriangle, 
  Play, 
  Pause, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Wifi,
  Settings,
  Activity,
  Clock,
  Shield,
  Zap
} from 'lucide-react';
import Modal from './Modal';

interface ContainerCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (results: any) => void;
  initialIphoneUrl?: string;
  iphoneId?: string;
}

interface CreationProgress {
  type: string;
  message: string;
  status: string;
  container_number?: number;
  current_index?: number;
  total_containers?: number;
  progress_percent?: number;
  successful_count?: number;
  failed_count?: number;
  error?: string;
  troubleshooting?: string;
  timestamp?: string;
  results?: any;
}

const ContainerCreationModal: React.FC<ContainerCreationModalProps> = ({
  isOpen,
  onClose,
  onComplete,
  initialIphoneUrl,
  iphoneId,
}) => {
  // Form state
  const [count, setCount] = useState<number>(5);
  const [startNumber, setStartNumber] = useState<number>(1);
  const [iphoneUrl, setIphoneUrl] = useState<string>(initialIphoneUrl || '');
  const [isManualSync, setIsManualSync] = useState<boolean>(false);
  const [manualSyncCount, setManualSyncCount] = useState<number>(0);
  
  // Process state
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [logs, setLogs] = useState<CreationProgress[]>([]);
  const [results, setResults] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'testing' | 'connected' | 'failed'>('unknown');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Refs
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Update iPhone URL when initial value changes
  useEffect(() => {
    if (initialIphoneUrl && initialIphoneUrl !== iphoneUrl) {
      setIphoneUrl(initialIphoneUrl);
    }
  }, [initialIphoneUrl]);

  const handleClose = () => {
    if (isCreating) {
      const confirmed = window.confirm(
        'Container creation is in progress. Are you sure you want to close? This will stop the process.'
      );
      if (!confirmed) return;
      
      setIsCreating(false);
    }
    
    // Reset state
    setProgress(0);
    setCurrentStep('');
    setLogs([]);
    setResults(null);
    setConnectionStatus('unknown');
    setIphoneUrl(initialIphoneUrl || '');
    
    onClose();
  };

  const handleManualSync = async () => {
    if (manualSyncCount <= 0) {
      toast.error('Please enter a valid total number of containers.');
      return;
    }

    if (!iphoneId) {
      toast.error('Cannot sync without a valid iPhone ID.');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to sync the database for this iPhone? This will remove all existing 'available' containers and create records up to container #${manualSyncCount}. Assigned containers will NOT be affected.`
    );

    if (!confirmed) return;

    setIsSyncing(true);
    toast.loading('Syncing containers with database...');

    try {
      const response = await fetch(`/api/iphones/${iphoneId}/sync-containers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalContainerCount: manualSyncCount }),
      });

      const data = await response.json();

      toast.dismiss();
      if (data.success) {
        toast.success(data.message);
        if (onComplete) {
          onComplete(data);
        }
        onClose();
      } else {
        toast.error(data.message || 'Failed to sync containers.');
      }
    } catch (error) {
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to sync containers: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const startCreation = async () => {
    if (isCreating) return;

    // Validate inputs
    if (count < 1 || count > 500) {
      toast.error('Container count must be between 1 and 500');
      return;
    }

    if (startNumber < 1) {
      toast.error('Start number must be at least 1');
      return;
    }

    setIsCreating(true);
    setProgress(0);
    setCurrentStep('Initializing...');
    setLogs([]);
    setResults(null);
    setConnectionStatus('testing');

    try {
      // Generate session ID for this container creation session
      const sessionId = `container-creation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const botId = 'container-creator';
      
      // Send the request data
      const response = await fetch('http://localhost:3001/api/bot/accounts/create-containers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bot bot_development_key_123456789',
          'X-Bot-Id': botId,
          'X-Session-Id': sessionId
        },
        body: JSON.stringify({
          count,
          startNumber,
          iphoneUrl: iphoneUrl || undefined
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Handle Server-Sent Events
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: CreationProgress = JSON.parse(line.slice(6));
              handleProgressUpdate(data);
            } catch (error) {
              console.error('Failed to parse SSE data:', error);
            }
          }
        }
      }

    } catch (error) {
      console.error('Container creation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to start container creation: ${errorMessage}`);
      setIsCreating(false);
      setConnectionStatus('failed');
    }
  };

  const handleProgressUpdate = (update: CreationProgress) => {
    console.log('Progress update:', update);
    
    setLogs(prev => [...prev, { ...update, timestamp: update.timestamp || new Date().toISOString() }]);

    switch (update.type) {
      case 'start':
        setCurrentStep('Starting container creation...');
        setConnectionStatus('testing');
        break;

      case 'test':
        if (update.status === 'connected') {
          setConnectionStatus('connected');
          setCurrentStep('iPhone connected successfully');
        } else if (update.status === 'connection_failed') {
          setConnectionStatus('failed');
          setCurrentStep('iPhone connection failed');
        }
        break;

      case 'container_start':
        setCurrentStep(`Creating container ${update.current_index}/${update.total_containers} (${update.container_number})`);
        setProgress(update.progress_percent || 0);
        break;

      case 'container_complete':
        setCurrentStep(`Container ${update.container_number} completed successfully`);
        setProgress(update.progress_percent || 0);
        toast.success(`Container ${update.container_number} created!`);
        break;

      case 'container_failed':
        setCurrentStep(`Container ${update.container_number} failed`);
        setProgress(update.progress_percent || 0);
        toast.error(`Container ${update.container_number} failed: ${update.error}`);
        break;

      case 'complete':
      case 'final_results':
        setCurrentStep('Container creation completed');
        setProgress(100);
        setIsCreating(false);
        setResults(update.results);
        
        if (update.results) {
          if (update.results.successful === update.results.total) {
            toast.success(`All ${update.results.total} containers created successfully!`);
          } else if (update.results.successful > 0) {
            toast.success(`${update.results.successful}/${update.results.total} containers created successfully`);
          }
        }
        
        if (onComplete && update.results) {
          onComplete(update.results);
        }
        break;

      case 'error':
        setCurrentStep(`Error: ${update.message}`);
        setIsCreating(false);
        setConnectionStatus('failed');
        toast.error(update.message);
        break;
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'testing':
        return <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />;
      default:
        return <Wifi className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'iPhone Connected';
      case 'failed':
        return 'Connection Failed';
      case 'testing':
        return 'Testing Connection...';
      default:
        return 'Not Connected';
    }
  };

  const renderManualSync = () => {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Use this to align the app's database with containers that already exist on the iPhone. 
          This will create entries for all containers up to the number you specify, marking them as 'available'.
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Number of Containers on iPhone *
          </label>
          <input
            type="number"
            value={manualSyncCount}
            onChange={(e) => setManualSyncCount(Number(e.target.value))}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isSyncing}
            placeholder="e.g., 150"
          />
        </div>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <Shield className="w-5 h-5" />
          {isSyncing ? 'Syncing...' : 'Sync with Database'}
        </button>
      </div>
    );
  };

  const renderCreationForm = () => {
    return (
      <div className="space-y-4">
        {/* Important Instructions */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-amber-400 mr-3 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-amber-800 mb-2">
                Important Setup Instructions
              </h3>
              <div className="text-sm text-amber-700 space-y-1">
                <p>• <strong>iPhone must be on the home screen</strong> before starting</p>
                <p>• <strong>Do NOT touch the iPhone</strong> during the creation process</p>
                <p>• Ensure stable WiFi connection and XXTouch Elite is running</p>
                <p>• Process takes approximately 10-15 seconds per container</p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Containers *
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isCreating}
              placeholder="e.g., 10"
              max="500"
            />
            <p className="text-xs text-gray-500 mt-1">Maximum: 500 containers</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Starting Number *
            </label>
            <input
              type="number"
              value={startNumber}
              onChange={(e) => setStartNumber(Number(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              disabled={isCreating}
              placeholder="e.g., 1"
            />
            <p className="text-xs text-gray-500 mt-1">Containers will be numbered sequentially</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            iPhone URL (Optional)
          </label>
          <input
            type="text"
            value={iphoneUrl}
            onChange={(e) => setIphoneUrl(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            disabled={isCreating}
            placeholder="http://192.168.178.65:46952 (default)"
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty to use default iPhone IP</p>
        </div>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-full">
              <Smartphone className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isManualSync ? 'Sync Existing Containers' : 'Create New iPhone Containers'}
              </h2>
              <p className="text-sm text-gray-600">
                {isManualSync ? 'Align database with on-device containers' : 'Automated batch creation via XXTouch'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-full hover:bg-gray-200">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center space-x-2 mb-4">
            <input
              type="checkbox"
              id="manualSyncCheckbox"
              checked={isManualSync}
              onChange={(e) => setIsManualSync(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="manualSyncCheckbox" className="text-sm font-medium text-gray-700">
              Manually sync existing containers
            </label>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border">
            {isManualSync ? renderManualSync() : renderCreationForm()}
          </div>
        </div>

        {/* Action Button and Status (for creation only) */}
        {!isManualSync && (
          <div className="mt-6 space-y-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
              <div className="flex items-center gap-2">
                {getStatusIcon()}
                <span className="text-sm font-medium text-gray-900">{getStatusText()}</span>
              </div>
              <div className="text-sm text-gray-600">
                {isCreating ? 'Process Active' : 'Ready to Start'}
              </div>
            </div>

            {/* Progress Section */}
            {isCreating && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-600">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Activity className="w-4 h-4" />
                  <span>{currentStep}</span>
                </div>
              </div>
            )}

            {/* Live Logs */}
            {logs.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Creation Log
                </h4>
                <div className="bg-gray-900 rounded-xl p-4 max-h-64 overflow-y-auto text-sm font-mono">
                  {logs.map((log, index) => (
                    <div key={index} className={`mb-2 ${
                      log.type === 'error' || log.status === 'failed' ? 'text-red-400' :
                      log.type === 'container_complete' || log.status === 'completed' ? 'text-green-400' :
                      log.type === 'warning' ? 'text-yellow-400' :
                      'text-gray-300'
                    }`}>
                      <span className="text-gray-500">[{new Date(log.timestamp || '').toLocaleTimeString()}]</span> {log.message}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              </div>
            )}

            {/* Results Summary */}
            {results && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">Creation Complete!</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{results.successful}</div>
                    <div className="text-green-700">Successful</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                    <div className="text-red-700">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{results.total}</div>
                    <div className="text-blue-700">Total</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{Math.round(results.duration_ms / 1000)}s</div>
                    <div className="text-purple-700">Duration</div>
                  </div>
                </div>
                {results.created_containers?.length > 0 && (
                  <div className="mt-4 p-3 bg-white rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Created Containers:</div>
                    <div className="text-sm text-gray-600">
                      {results.created_containers.join(', ')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                disabled={isCreating}
              >
                {isCreating ? 'Cancel' : 'Close'}
              </button>
              <button
                onClick={startCreation}
                disabled={isCreating || count < 1 || startNumber < 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Start Creation
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ContainerCreationModal; 