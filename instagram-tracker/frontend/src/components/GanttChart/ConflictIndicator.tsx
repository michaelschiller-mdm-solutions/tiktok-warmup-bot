import React from 'react';
import type { ConflictIndicator as ConflictIndicatorType, GanttTooltipData } from '../../types/ganttChart';

interface ConflictIndicatorProps {
  conflict: ConflictIndicatorType;
  onMouseEnter: (data: GanttTooltipData) => void;
  onMouseLeave: () => void;
}

export const ConflictIndicator: React.FC<ConflictIndicatorProps> = ({
  conflict,
  onMouseEnter,
  onMouseLeave
}) => {
  const getConflictColor = (type: string, severity: string) => {
    if (severity === 'error') {
      return 'bg-red-500 bg-opacity-30 border-red-500';
    } else {
      return 'bg-yellow-500 bg-opacity-30 border-yellow-500';
    }
  };

  const getConflictIcon = (type: string) => {
    switch (type) {
      case 'overlap':
        return '⚠️';
      case 'location':
        return '📍';
      case 'blocking':
        return '🚫';
      case 'seasonal':
        return '📅';
      default:
        return '⚠️';
    }
  };

  return (
    <div
      className={`absolute border-2 border-dashed rounded cursor-help z-20 ${getConflictColor(conflict.type, conflict.severity)}`}
      style={{
        left: conflict.x,
        top: conflict.y,
        width: conflict.width,
        height: conflict.height
      }}
      onMouseEnter={() => onMouseEnter({
        type: 'conflict',
        x: conflict.x,
        y: conflict.y,
        data: conflict,
        actions: conflict.resolutionOptions.map(option => ({
          label: option.label,
          onClick: option.action,
          variant: option.type === 'cancel' ? 'danger' : 'primary'
        }))
      })}
      onMouseLeave={onMouseLeave}
    >
      <div className="absolute -top-2 -left-2 w-4 h-4 flex items-center justify-center text-xs">
        {getConflictIcon(conflict.type)}
      </div>
      
      {conflict.severity === 'error' && (
        <div className="absolute inset-0 bg-red-500 bg-opacity-10 animate-pulse rounded"></div>
      )}
    </div>
  );
}; 