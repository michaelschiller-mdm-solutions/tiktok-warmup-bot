import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle, Play, Pause, User, Hash, Image, FileText } from 'lucide-react';
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

// 10-phase warmup system as defined in WarmupPhases.md
const PHASE_ORDER = ['bio', 'gender', 'name', 'username', 'first_highlight', 'new_highlight', 'post_caption', 'post_no_caption', 'story_caption', 'story_no_caption'];

const PHASE_LABELS = {
  bio: 'Bio Change',
  gender: 'Gender Change', 
  name: 'Name Change',
  username: 'Username Change',
  first_highlight: 'First Highlight',
  new_highlight: 'New Highlight',
  post_caption: 'Post with Caption',
  post_no_caption: 'Post without Caption',
  story_caption: 'Story with Caption',
  story_no_caption: 'Story without Caption'
};

const PHASE_ICONS = {
  bio: FileText,
  gender: User,
  name: User,
  username: Hash,
  first_highlight: Image,
  new_highlight: Image,
  post_caption: Image,
  post_no_caption: Image,
  story_caption: Image,
  story_no_caption: Image
};

const PHASE_COLORS = {
  bio: 'blue',
  gender: 'pink',
  name: 'green',
  username: 'purple',
  first_highlight: 'yellow',
  new_highlight: 'orange',
  post_caption: 'indigo',
  post_no_caption: 'gray',
  story_caption: 'red',
  story_no_caption: 'teal'
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

  const getPhaseIcon = (status: string, phase: string) => {
    const IconComponent = PHASE_ICONS[phase as keyof typeof PHASE_ICONS] || Clock;
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'in_progress':
        return <Play className="h-5 w-5 text-blue-600 animate-pulse" />;
      case 'available':
      case 'content_assigned':
        return <IconComponent className="h-5 w-5 text-yellow-600" />;
      case 'failed':
      case 'requires_review':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <IconComponent className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'available':
      case 'content_assigned':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed':
      case 'requires_review':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className={`${compact ? 'p-4' : 'p-6'} bg-white rounded-lg shadow`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
              </div>
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
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold">Warmup Progress</h3>
          <span className="text-sm font-medium text-gray-600">{warmupStatus.username}</span>
        </div>
      )}
      
      <div className="flex items-center mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${warmupStatus.progress_percent}%` }}
          ></div>
        </div>
        <span className="text-sm font-medium ml-3 whitespace-nowrap">
          {warmupStatus.completed_phases} / {warmupStatus.total_phases} ({warmupStatus.progress_percent}%)
        </span>
      </div>

      {/* Phase Pipeline */}
      <div className="space-y-3">
        {PHASE_ORDER.map((phaseKey, index) => {
          const phase = phaseMap.get(phaseKey);
          const status = phase?.status || 'pending';
          const phaseColor = PHASE_COLORS[phaseKey as keyof typeof PHASE_COLORS];
          
          return (
            <div
              key={phaseKey}
              className={`flex items-center p-3 rounded-lg border ${getStatusColor(status)} transition-all duration-200`}
            >
              <div className="flex items-center flex-1">
                <div className="mr-3">
                  {getPhaseIcon(status, phaseKey)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">
                      Phase {index + 1}: {PHASE_LABELS[phaseKey as keyof typeof PHASE_LABELS]}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(status)}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  
                  {/* Phase Details */}
                  {phase && (
                    <div className="mt-1 text-xs text-gray-600 space-y-1">
                      {phase.available_at && (
                        <div>Available: {formatDateTime(phase.available_at)}</div>
                      )}
                      {phase.started_at && (
                        <div>Started: {formatDateTime(phase.started_at)}</div>
                      )}
                      {phase.completed_at && (
                        <div>Completed: {formatDateTime(phase.completed_at)}</div>
                      )}
                      {phase.bot_id && (
                        <div>Bot: {phase.bot_id}</div>
                      )}
                      {phase.error_message && (
                        <div className="text-red-600">Error: {phase.error_message}</div>
                      )}
                      {phase.retry_count && phase.retry_count > 0 && (
                        <div className="text-orange-600">Retries: {phase.retry_count}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Connection Line */}
              {index < PHASE_ORDER.length - 1 && (
                <div className="absolute left-6 mt-12 w-0.5 h-6 bg-gray-300"></div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {!compact && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Lifecycle State:</span>
              <span className="ml-2 font-medium capitalize">{warmupStatus.lifecycle_state}</span>
            </div>
            <div>
              <span className="text-gray-600">Completion:</span>
              <span className="ml-2 font-medium">{warmupStatus.progress_percent}%</span>
            </div>
            <div>
              <span className="text-gray-600">Available Phases:</span>
              <span className="ml-2 font-medium">{warmupStatus.available_phases}</span>
            </div>
            <div>
              <span className="text-gray-600">Failed Phases:</span>
              <span className="ml-2 font-medium text-red-600">{warmupStatus.failed_phases}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarmupPhaseTracker; 