import React from 'react';
import type { 
  AccountTimelineRow, 
  AssignmentBar, 
  TimeScale,
  GanttTooltipData 
} from '../../types/ganttChart';

interface AccountRowProps {
  accountRow: AccountTimelineRow;
  rowIndex: number;
  timelineWidth: number;
  pixelsPerDay: number;
  onSprintClick: (assignmentBar: any, event: React.MouseEvent) => void;
  onAccountClick: (account: any, event: React.MouseEvent) => void;
  onMouseEnter: (data: GanttTooltipData) => void;
  onMouseLeave: () => void;
  showDetails: boolean;
  selectedItems?: Set<string>;
  sprintTypeColors?: Record<string, { color: string; lightColor: string }>;
  style?: React.CSSProperties;
  // Additional props passed from VirtualizedGantt
  scrollLeft?: number;
  timelineStart?: Date;
  timelineEnd?: Date;
}

export const AccountRow: React.FC<AccountRowProps> = ({
  accountRow,
  rowIndex,
  timelineWidth,
  pixelsPerDay,
  onSprintClick,
  onAccountClick,
  onMouseEnter,
  onMouseLeave,
  showDetails,
  selectedItems = new Set(),
  sprintTypeColors = {
    default: { color: '#3B82F6', lightColor: '#DBEAFE' },
    vacation: { color: '#F59E0B', lightColor: '#FEF3C7' },
    content: { color: '#10B981', lightColor: '#D1FAE5' },
    special: { color: '#8B5CF6', lightColor: '#EDE9FE' }
  },
  style,
  scrollLeft,
  timelineStart,
  timelineEnd
}) => {
  const { account, assignments, state, conflicts } = accountRow;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContentItemColor = (status: string) => {
    switch (status) {
      case 'queued': return 'bg-blue-500';
      case 'posted': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-400';
      case 'retrying': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div 
      className="account-row relative border-b border-gray-100 hover:bg-gray-50"
      style={style}
    >
      {/* Assignment bars */}
      {assignments.map((assignment) => {
        const isSelected = selectedItems.has(assignment.id);
        const sprintColor = sprintTypeColors[assignment.sprint.sprint_type] || sprintTypeColors.default;
        
        return (
          <div
            key={assignment.id}
            className={`absolute rounded cursor-pointer transition-all duration-200 ${
              isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : ''
            }`}
            style={{
              left: assignment.x,
              top: 10,
              width: assignment.width,
              height: assignment.height,
              backgroundColor: sprintColor.lightColor,
              border: `2px solid ${sprintColor.color}`,
              zIndex: isSelected ? 10 : 1
            }}
            onClick={(e) => onSprintClick(assignment, e)}
            onMouseEnter={() => onMouseEnter({
              type: 'sprint',
              x: assignment.x,
              y: accountRow.y,
              data: assignment,
              actions: [
                {
                  label: 'View Details',
                  onClick: () => console.log('View details', assignment)
                },
                {
                  label: 'Edit Sprint',
                  onClick: () => console.log('Edit sprint', assignment)
                },
                {
                  label: 'Pause',
                  onClick: () => console.log('Pause assignment', assignment),
                  variant: 'secondary'
                }
              ]
            })}
            onMouseLeave={onMouseLeave}
          >
            {/* Assignment content */}
            <div className="px-2 py-1 h-full flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-medium text-gray-900 truncate">
                    {assignment.sprint.name}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(assignment.status)}`}>
                    {assignment.status}
                  </span>
                </div>
                
                {assignment.sprint.sprint_type && (
                  <div className="text-xs text-gray-600 mt-0.5">
                    {assignment.sprint.sprint_type}
                  </div>
                )}
              </div>

              {/* Progress indicator */}
              {assignment.progress > 0 && (
                <div className="flex items-center space-x-1">
                  <div className="w-8 h-1.5 bg-white rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-current transition-all duration-300"
                      style={{ 
                        width: `${assignment.progress}%`,
                        backgroundColor: sprintColor.color
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">
                    {assignment.progress}%
                  </span>
                </div>
              )}
            </div>

            {/* Content item markers */}
            {assignment.contentItems.map((item, index) => (
              <div
                key={`${assignment.id}-content-${index}`}
                className={`absolute top-0 w-1.5 h-full rounded-sm ${getContentItemColor(item.status)}`}
                style={{ left: item.x }}
                title={`Content scheduled for ${item.scheduledTime.toLocaleDateString()}`}
              />
            ))}

            {/* Conflict indicators on assignment */}
            {assignment.conflicts.length > 0 && (
              <div className="absolute -top-1 -right-1 text-amber-500 text-sm">
                ⚠️
              </div>
            )}
          </div>
        );
      })}

      {/* Account idle indicator */}
      {assignments.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
          <div className="flex items-center space-x-2">
            <span className="text-base">🕐</span>
            <span className="text-sm">
              Idle {state.idleDuration ? `for ${Math.round(state.idleDuration / 24)}d` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Row-level conflict indicators */}
      {conflicts.length > 0 && (
        <div className="absolute right-2 top-2 flex items-center space-x-1">
          <span className="text-amber-500 text-sm">⚠️</span>
          <span className="text-xs text-amber-600">
            {conflicts.length}
          </span>
        </div>
      )}
    </div>
  );
}; 