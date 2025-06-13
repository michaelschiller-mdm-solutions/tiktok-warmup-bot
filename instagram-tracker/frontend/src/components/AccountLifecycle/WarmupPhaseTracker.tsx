import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, Play, Pause } from 'lucide-react';
import { apiClient } from '../../services/api';

interface WarmupPhase {
  phase: string;
  status: 'pending' | 'available' | 'content_assigned' | 'in_progress' | 'completed' | 'failed' | 'requires_review';
  available_at?: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  retry_count?: number;
  bot_id?: string;
}

interface WarmupStatus {
  account_id: number;
  username: string;
  lifecycle_state: string;
  total_phases: number;
  completed_phases: number;
  available_phases: number;
  failed_phases: number;
  progress_percent: number;
  is_complete: boolean;
  phases: WarmupPhase[];
}

interface WarmupPhaseTrackerProps {
  accountId: number;
  showTitle?: boolean;
  compact?: boolean;
}

const PHASE_ORDER = ['pfp', 'bio', 'post', 'highlight', 'story'];
const PHASE_LABELS = {
  pfp: 'Profile Picture',
  bio: 'Bio Update',
  post: 'First Post',
  highlight: 'Story Highlight',
  story: 'Story Post'
};

const WarmupPhaseTracker: React.FC<WarmupPhaseTrackerProps> = ({ 
  accountId, 
  showTitle = true,
  compact = false 
}) => {
  const [warmupStatus, setWarmupStatus] = useState<WarmupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWarmupStatus = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`http://localhost:3001/api/bot/accounts/${accountId}/warmup-status`);
        if (!response.ok) {
          throw new Error('Failed to fetch warmup status');
        }
        const data = await response.json();
        setWarmupStatus(data.data);
      } catch (err: any) {
        console.error('Error fetching warmup status:', err);
        setError(err.message || 'Failed to load warmup status');
      } finally {
        setLoading(false);
      }
    };

    fetchWarmupStatus();
  }, [accountId]);

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Play className="h-5 w-5 text-blue-600 animate-pulse" />;
      case 'available':
      case 'content_assigned':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'failed':
      case 'requires_review':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Pause className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPhaseClasses = (status: string) => {
    const baseClasses = "flex items-center gap-3 p-3 rounded-lg border-2 transition-all";
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-50 border-green-200 text-green-800`;
      case 'in_progress':
        return `${baseClasses} bg-blue-50 border-blue-200 text-blue-800 shadow-md`;
      case 'available':
      case 'content_assigned':
        return `${baseClasses} bg-yellow-50 border-yellow-200 text-yellow-800`;
      case 'failed':
      case 'requires_review':
        return `${baseClasses} bg-red-50 border-red-200 text-red-800`;
      default:
        return `${baseClasses} bg-gray-50 border-gray-200 text-gray-600`;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Waiting';
      case 'available':
        return 'Ready';
      case 'content_assigned':
        return 'Content Ready';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'requires_review':
        return 'Needs Review';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-lg shadow`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {PHASE_ORDER.map((_, index) => (
              <div key={index} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !warmupStatus) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-lg shadow`}>
        <div className="text-center py-8">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Status</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Create a map of phases for easy lookup
  const phaseMap = new Map(warmupStatus.phases.map(phase => [phase.phase, phase]));
  
  return (
    <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-lg shadow`}>
      {showTitle && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900">Warmup Progress</h3>
          <p className="text-sm text-gray-500">
            {warmupStatus.username} • {warmupStatus.completed_phases} of {warmupStatus.total_phases} phases completed
          </p>
          
          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{warmupStatus.progress_percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${warmupStatus.progress_percent}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Phase Pipeline */}
      <div className="space-y-3">
        {PHASE_ORDER.map((phaseName, index) => {
          const phase = phaseMap.get(phaseName);
          const status = phase?.status || 'pending';
          const label = PHASE_LABELS[phaseName as keyof typeof PHASE_LABELS];
          
          return (
            <div key={phaseName} className="relative">
              {/* Connection Line */}
              {index < PHASE_ORDER.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-6 bg-gray-300"></div>
              )}
              
              <div className={getPhaseClasses(status)}>
                <div className="flex-shrink-0">
                  {getPhaseIcon(status)}
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{label}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      status === 'completed' ? 'bg-green-100 text-green-800' :
                      status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      status === 'available' || status === 'content_assigned' ? 'bg-yellow-100 text-yellow-800' :
                      status === 'failed' || status === 'requires_review' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {getStatusText(status)}
                    </span>
                  </div>
                  
                  {/* Phase Details */}
                  <div className="mt-1 text-sm opacity-75">
                    {phase?.completed_at && (
                      <span>Completed {new Date(phase.completed_at).toLocaleDateString()}</span>
                    )}
                    {phase?.started_at && !phase?.completed_at && (
                      <span>Started {new Date(phase.started_at).toLocaleDateString()}</span>
                    )}
                    {phase?.available_at && !phase?.started_at && (
                      <span>Available since {new Date(phase.available_at).toLocaleDateString()}</span>
                    )}
                    {!phase?.available_at && status === 'pending' && (
                      <span>Waiting for previous phase</span>
                    )}
                    {phase?.bot_id && (
                      <span className="ml-2">• Bot: {phase.bot_id}</span>
                    )}
                  </div>
                  
                  {/* Error Message */}
                  {phase?.error_message && (
                    <div className="mt-2 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                      <strong>Error:</strong> {phase.error_message}
                      {phase.retry_count && phase.retry_count > 0 && (
                        <span className="ml-2">• Retry {phase.retry_count}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completion Status */}
      {warmupStatus.is_complete && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">Warmup Complete!</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Account is now ready for active operation.
          </p>
        </div>
      )}
    </div>
  );
};

export default WarmupPhaseTracker; 