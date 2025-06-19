import React, { useMemo } from 'react';
import type { 
  GanttTooltipData, 
  AssignmentBar, 
  ConflictWarning, 
  ContentItemMarker 
} from '../../types/ganttChart';

interface GanttTooltipProps {
  data: GanttTooltipData;
  position: { x: number; y: number };
  onAction?: (action: string, data: any) => void;
  className?: string;
}

interface TooltipAction {
  id: string;
  label: string;
  icon: string;
  variant: 'primary' | 'secondary' | 'danger';
  data?: any;
}

export const GanttTooltip: React.FC<GanttTooltipProps> = ({
  data,
  position,
  onAction,
  className = ''
}) => {
  const { type, assignmentBar, conflicts, contentItems, accountInfo } = data;

  // Generate actions based on tooltip type and data
  const actions = useMemo((): TooltipAction[] => {
    const actions: TooltipAction[] = [];

    if (type === 'sprint' && assignmentBar) {
      const { assignment, sprint } = assignmentBar;
      
      // Sprint-specific actions
      actions.push({
        id: 'view-sprint',
        label: 'View Details',
        icon: '👁',
        variant: 'primary',
        data: { sprintId: sprint.id }
      });

      if (assignment.status === 'active') {
        actions.push({
          id: 'pause-sprint',
          label: 'Pause',
          icon: '⏸',
          variant: 'secondary',
          data: { assignmentId: assignment.id }
        });
      } else if (assignment.status === 'paused') {
        actions.push({
          id: 'resume-sprint',
          label: 'Resume',
          icon: '▶',
          variant: 'primary',
          data: { assignmentId: assignment.id }
        });
      }

      if (assignment.status === 'scheduled') {
        actions.push({
          id: 'reschedule-sprint',
          label: 'Reschedule',
          icon: '📅',
          variant: 'secondary',
          data: { assignmentId: assignment.id }
        });
      }

      actions.push({
        id: 'cancel-sprint',
        label: 'Cancel',
        icon: '✕',
        variant: 'danger',
        data: { assignmentId: assignment.id }
      });
    }

    if (conflicts && conflicts.length > 0) {
      actions.push({
        id: 'resolve-conflicts',
        label: 'Resolve Conflicts',
        icon: '⚠',
        variant: 'primary',
        data: { conflicts }
      });
    }

    return actions;
  }, [type, assignmentBar, conflicts]);

  // Format duration for display
  const formatDuration = (hours: number): string => {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days === 0) {
      return `${remainingHours}h`;
    } else if (remainingHours === 0) {
      return `${days}d`;
    } else {
      return `${days}d ${remainingHours}h`;
    }
  };

  // Format progress percentage
  const formatProgress = (current: number, total: number): string => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    return `${current}/${total} (${percentage}%)`;
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      scheduled: '#6B7280',
      active: '#10B981',
      paused: '#F59E0B',
      completed: '#3B82F6',
      cancelled: '#EF4444',
      failed: '#EF4444'
    };
    return colors[status] || '#6B7280';
  };

  // Get conflict severity color
  const getConflictColor = (severity: string): string => {
    const colors: Record<string, string> = {
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    };
    return colors[severity] || '#6B7280';
  };

  // Handle action click
  const handleActionClick = (action: TooltipAction) => {
    onAction?.(action.id, action.data);
  };

  // Calculate tooltip position to keep it in viewport
  const tooltipStyle = useMemo(() => {
    const tooltipWidth = 320;
    const tooltipHeight = 200; // Estimated height
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x;
    let y = position.y - tooltipHeight - 10; // Position above cursor by default

    // Adjust horizontal position if tooltip would go off-screen
    if (x + tooltipWidth > viewportWidth) {
      x = viewportWidth - tooltipWidth - 10;
    }
    if (x < 10) {
      x = 10;
    }

    // Adjust vertical position if tooltip would go off-screen
    if (y < 10) {
      y = position.y + 10; // Position below cursor
    }

    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${tooltipWidth}px`
    };
  }, [position]);

  if (type === 'sprint' && assignmentBar) {
    const { assignment, sprint, progress, contentItems } = assignmentBar;
    
        return (
      <div 
        className={`fixed z-50 bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 ${className}`}
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold truncate">{sprint.name}</h3>
            <span 
              className="px-2 py-1 text-xs font-medium rounded-full"
              style={{ 
                backgroundColor: getStatusColor(assignment.status),
                color: 'white'
              }}
            >
              {assignment.status.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-gray-300 mt-1">
            {sprint.sprint_type} • {sprint.location || 'Any Location'}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Timeline Information */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Start:</span>
              <div className="text-white">
                {assignment.start_date ? new Date(assignment.start_date).toLocaleDateString() : 'Not scheduled'}
              </div>
            </div>
            <div>
              <span className="text-gray-400">End:</span>
              <div className="text-white">
                {assignment.end_date ? new Date(assignment.end_date).toLocaleDateString() : 'Not scheduled'}
              </div>
            </div>
          </div>

          {/* Progress Information */}
          {progress !== undefined && (
            <div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Progress:</span>
                <span className="text-white">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Next Content Due */}
          {assignment.next_content_due && (
            <div className="text-sm">
              <span className="text-gray-400">Next Content:</span>
              <div className="text-white">
                {new Date(assignment.next_content_due).toLocaleString()}
              </div>
            </div>
          )}

          {/* Content Breakdown */}
          {contentItems && contentItems.length > 0 && (
          <div>
              <span className="text-gray-400 text-sm">Content Items:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                                 {contentItems.slice(0, 8).map((item: ContentItemMarker, index: number) => (
                  <div
                    key={index}
                    className="flex items-center space-x-1 bg-gray-800 rounded px-2 py-1 text-xs"
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                                             style={{
                         backgroundColor: '#6B7280' // Will be fixed when proper content type is available
                       }}
                     />
                     <span>content</span>
                    {item.status === 'posted' && <span className="text-green-400">✓</span>}
                    {item.status === 'failed' && <span className="text-red-400">✗</span>}
                  </div>
                ))}
                {contentItems.length > 8 && (
                  <span className="text-gray-400 text-xs">+{contentItems.length - 8} more</span>
                )}
              </div>
            </div>
          )}

          {/* Conflicts */}
          {conflicts && conflicts.length > 0 && (
            <div className="border-t border-gray-700 pt-3">
              <span className="text-gray-400 text-sm">Conflicts:</span>
              <div className="space-y-2 mt-1">
                {conflicts.slice(0, 3).map((conflict, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: getConflictColor(conflict.severity) }}
                    />
                    <div className="text-sm">
                      <div className="text-white">{conflict.message}</div>
                      {conflict.resolution_options && conflict.resolution_options.length > 0 && (
                        <div className="text-gray-400 text-xs mt-1">
                          Solutions: {conflict.resolution_options.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {conflicts.length > 3 && (
                  <div className="text-gray-400 text-xs">
                    +{conflicts.length - 3} more conflicts
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-700">
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className={`
                    px-3 py-1 text-xs font-medium rounded transition-colors duration-200
                    ${action.variant === 'primary' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                      action.variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                      'bg-gray-700 hover:bg-gray-600 text-gray-200'}
                  `}
                >
                  <span className="mr-1">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tooltip Arrow */}
        <div 
          className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
          style={{
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        />
          </div>
        );
  }
      
  // Account tooltip
  if (type === 'account' && accountInfo) {
        return (
      <div 
        className={`fixed z-50 bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 ${className}`}
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-semibold">{accountInfo.username}</h3>
          {accountInfo.display_name && (
            <div className="text-sm text-gray-300">{accountInfo.display_name}</div>
          )}
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {/* Account State */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-400">Status:</span>
              <div className="text-white">{accountInfo.status}</div>
            </div>
          <div>
              <span className="text-gray-400">Location:</span>
              <div className="text-white">{accountInfo.location || 'Unknown'}</div>
            </div>
          </div>

          {/* Active Sprints */}
          {accountInfo.activeSprintIds && accountInfo.activeSprintIds.length > 0 && (
            <div>
              <span className="text-gray-400 text-sm">Active Sprints:</span>
              <div className="text-white">{accountInfo.activeSprintIds.length}</div>
            </div>
          )}

          {/* Idle Information */}
          {accountInfo.idleSince && (
            <div>
              <span className="text-gray-400 text-sm">Idle Since:</span>
              <div className="text-white">
                {new Date(accountInfo.idleSince).toLocaleDateString()}
              </div>
            </div>
          )}

          {/* Cooldown Information */}
          {accountInfo.cooldownUntil && (
          <div>
              <span className="text-gray-400 text-sm">Cooldown Until:</span>
              <div className="text-white">
                {new Date(accountInfo.cooldownUntil).toLocaleDateString()}
              </div>
            </div>
          )}
        </div>

        {/* Tooltip Arrow */}
        <div 
          className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
          style={{
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        />
          </div>
        );
    }

  // Generic conflict tooltip
  if (type === 'conflict' && conflicts) {
  return (
    <div
        className={`fixed z-50 bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 ${className}`}
        style={tooltipStyle}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-red-400">Conflicts Detected</h3>
          <div className="text-sm text-gray-300">{conflicts.length} conflict(s)</div>
        </div>

        {/* Content */}
        <div className="px-4 py-3 space-y-3">
          {conflicts.map((conflict, index) => (
            <div key={index} className="border border-gray-700 rounded p-3">
              <div className="flex items-center space-x-2 mb-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getConflictColor(conflict.severity) }}
                />
                <span className="font-medium">{conflict.type.replace('_', ' ').toUpperCase()}</span>
              </div>
              
              <div className="text-sm text-gray-200 mb-2">
                {conflict.message}
              </div>

              {conflict.resolution_options && conflict.resolution_options.length > 0 && (
                <div>
                  <span className="text-xs text-gray-400">Resolutions:</span>
                  <ul className="text-xs text-gray-300 mt-1 space-y-1">
                    {conflict.resolution_options.map((option, optionIndex) => (
                      <li key={optionIndex} className="flex items-center space-x-1">
                        <span>•</span>
                        <span>{option}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
      {actions.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-700">
            <div className="flex flex-wrap gap-2">
              {actions.map((action) => (
            <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className="px-3 py-1 text-xs font-medium rounded bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
                >
                  <span className="mr-1">{action.icon}</span>
              {action.label}
            </button>
          ))}
            </div>
        </div>
      )}

        {/* Tooltip Arrow */}
        <div 
          className="absolute w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"
          style={{
            bottom: '-4px',
            left: '50%',
            transform: 'translateX(-50%)'
          }}
        />
    </div>
  );
  }

  // Default empty tooltip
  return null;
}; 

export default GanttTooltip; 