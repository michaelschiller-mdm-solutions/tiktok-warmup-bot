import React, { useState, useCallback, useMemo } from 'react';
import type { AssignmentBar, ContentItemMarker, ConflictWarning } from '../../types/ganttChart';

interface SprintBarProps {
  assignmentBar: AssignmentBar;
  onSprintClick: (assignment: AssignmentBar, event: React.MouseEvent) => void;
  onContentItemClick?: (contentItem: ContentItemMarker, event: React.MouseEvent) => void;
  showContentItems?: boolean;
  showProgress?: boolean;
  className?: string;
}

// Sprint type colors
const SPRINT_COLORS: Record<string, { color: string; lightColor: string; darkColor: string }> = {
  vacation: { color: '#10B981', lightColor: '#A7F3D0', darkColor: '#065F46' },
  university: { color: '#3B82F6', lightColor: '#BFDBFE', darkColor: '#1E3A8A' },
  home: { color: '#6B7280', lightColor: '#D1D5DB', darkColor: '#374151' },
  work: { color: '#374151', lightColor: '#E5E7EB', darkColor: '#111827' },
  fitness: { color: '#EF4444', lightColor: '#FECACA', darkColor: '#991B1B' },
  lifestyle: { color: '#8B5CF6', lightColor: '#DDD6FE', darkColor: '#5B21B6' },
  default: { color: '#6366F1', lightColor: '#C7D2FE', darkColor: '#3730A3' }
};

// Content type colors
const CONTENT_TYPE_COLORS: Record<string, string> = {
  story: '#3B82F6',
  post: '#8B5CF6', 
  highlight: '#10B981',
  emergency: '#EF4444'
};

// Status indicators
const STATUS_STYLES: Record<string, { borderColor: string; opacity: number }> = {
  scheduled: { borderColor: '#D1D5DB', opacity: 0.7 },
  active: { borderColor: '#10B981', opacity: 1.0 },
  paused: { borderColor: '#F59E0B', opacity: 0.8 },
  completed: { borderColor: '#6B7280', opacity: 0.6 },
  cancelled: { borderColor: '#EF4444', opacity: 0.5 }
};

export const SprintBar: React.FC<SprintBarProps> = ({
  assignmentBar,
  onSprintClick,
  onContentItemClick,
  showContentItems = true,
  showProgress = true,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const { assignment, sprint, x, width, height, progress, status, contentItems, conflicts } = assignmentBar;

  // Get sprint colors
  const sprintColorScheme = useMemo(() => {
    return SPRINT_COLORS[sprint.sprint_type] || SPRINT_COLORS.default;
  }, [sprint.sprint_type]);

  // Get status styling
  const statusStyle = useMemo(() => {
    return STATUS_STYLES[status] || STATUS_STYLES.scheduled;
  }, [status]);

  // Calculate progress bar width
  const progressWidth = useMemo(() => {
    if (!showProgress || progress === undefined) return 0;
    return Math.max(0, Math.min(100, progress)) * width / 100;
  }, [showProgress, progress, width]);

  // Position content item markers
  const positionedContentItems = useMemo(() => {
    if (!showContentItems || !contentItems.length) return [];
    
    return contentItems.map((item, index) => {
      const itemX = (index / Math.max(contentItems.length - 1, 1)) * (width - 12) + 6;
      return {
        ...item,
        x: itemX,
        y: height / 2
      };
    });
  }, [showContentItems, contentItems, width, height]);

  // Check if sprint has conflicts
  const hasConflicts = useMemo(() => {
    return conflicts && conflicts.length > 0;
  }, [conflicts]);

  // Get conflict severity
  const conflictSeverity = useMemo(() => {
    if (!hasConflicts) return null;
    const severities = conflicts!.map(c => c.severity);
    if (severities.includes('error')) return 'error';
    if (severities.includes('warning')) return 'warning';
    return 'info';
  }, [hasConflicts, conflicts]);

  // Handle click events
  const handleBarClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onSprintClick(assignmentBar, event);
  }, [assignmentBar, onSprintClick]);

  const handleContentItemClick = useCallback((contentItem: ContentItemMarker, event: React.MouseEvent) => {
    event.stopPropagation();
    onContentItemClick?.(contentItem, event);
  }, [onContentItemClick]);

  // Handle hover events
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setShowTooltip(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setShowTooltip(false);
  }, []);

  // Generate gradient for sprint bar
  const barGradient = useMemo(() => {
    const { color, lightColor } = sprintColorScheme;
    return `linear-gradient(135deg, ${color} 0%, ${lightColor} 100%)`;
  }, [sprintColorScheme]);

  // Conflict indicator style
  const conflictIndicatorStyle = useMemo(() => {
    if (!hasConflicts) return {};
    
    const colors = {
      error: '#EF4444',
      warning: '#F59E0B',
      info: '#3B82F6'
    };
    
    return {
      boxShadow: `0 0 0 2px ${colors[conflictSeverity!]}`,
      animation: 'pulse 2s infinite'
    };
  }, [hasConflicts, conflictSeverity]);

  return (
    <div
      className={`sprint-bar relative cursor-pointer transition-all duration-200 ${className}`}
      style={{
        transform: `translate(${x}px, 0)`,
        width: `${width}px`,
        height: `${height}px`
      }}
      onClick={handleBarClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Main Sprint Bar */}
      <div
        className="sprint-bar-main rounded-md relative overflow-hidden"
        style={{
          width: '100%',
          height: '100%',
          background: barGradient,
          border: `2px solid ${statusStyle.borderColor}`,
          opacity: statusStyle.opacity,
          transform: isHovered ? 'scale(1.02)' : 'scale(1)',
          transition: 'transform 0.2s ease',
          ...conflictIndicatorStyle
        }}
      >
        {/* Progress Bar Overlay */}
        {showProgress && progress !== undefined && (
          <div
            className="absolute top-0 left-0 h-full bg-black bg-opacity-20 transition-all duration-300"
            style={{ width: `${progressWidth}px` }}
          />
        )}

        {/* Sprint Label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span 
            className="text-white text-xs font-medium truncate px-2"
            style={{ 
              textShadow: '0 1px 2px rgba(0,0,0,0.5)',
              maxWidth: `${width - 8}px`
            }}
          >
            {sprint.name}
          </span>
        </div>

        {/* Status Indicator */}
        <div 
          className="absolute top-1 right-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: statusStyle.borderColor }}
        />

        {/* Progress Text */}
        {showProgress && progress !== undefined && (
          <div className="absolute bottom-1 left-2">
            <span className="text-white text-xs opacity-80">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>

      {/* Content Item Markers */}
      {showContentItems && positionedContentItems.map((contentItem, index) => (
        <div
          key={`content-${index}`}
          className="absolute cursor-pointer hover:scale-125 transition-transform duration-150"
          style={{
            left: `${contentItem.x}px`,
            top: `${contentItem.y - 3}px`,
            transform: 'translate(-50%, -50%)'
          }}
          onClick={(e) => handleContentItemClick(contentItem, e)}
          title={`${contentItem.content_type || 'story'}: ${contentItem.status}`}
        >
          <div
            className="w-3 h-3 rounded-full border border-white shadow-sm"
            style={{
              backgroundColor: CONTENT_TYPE_COLORS[contentItem.content_type || 'story'] || '#6B7280',
              opacity: contentItem.status === 'posted' ? 1 : 0.7
            }}
          />
          
          {/* Posted checkmark */}
          {contentItem.status === 'posted' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs">✓</span>
            </div>
          )}
          
          {/* Failed indicator */}
          {contentItem.status === 'failed' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-xs">✗</span>
            </div>
          )}
        </div>
      ))}

      {/* Conflict Warning Overlay */}
      {hasConflicts && (
        <div className="absolute -top-1 -right-1">
          <div 
            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ 
              backgroundColor: conflictSeverity === 'error' ? '#EF4444' : '#F59E0B' 
            }}
          >
            !
          </div>
        </div>
      )}

      {/* After-Sprint Content Indicator */}
      {(sprint.has_after_sprint_content || sprint.content_items?.some(item => item.is_after_sprint_content)) && (
        <div 
          className="absolute top-0 bottom-0 border-l-2 border-dashed"
          style={{
            left: `${width}px`,
            borderColor: sprintColorScheme.color,
            width: '20px'
          }}
        >
          <div 
            className="w-full h-full opacity-50"
            style={{ 
              background: `linear-gradient(135deg, ${sprintColorScheme.lightColor} 0%, transparent 100%)` 
            }}
          />
        </div>
      )}

      {/* Tooltip (will be enhanced with rich content later) */}
      {showTooltip && (
        <div 
          className="absolute z-10 bg-gray-900 text-white text-xs rounded-md p-2 shadow-lg whitespace-nowrap"
          style={{
            bottom: `${height + 8}px`,
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: '200px'
          }}
        >
          <div className="font-semibold">{sprint.name}</div>
          <div className="text-gray-300">
            Type: {sprint.sprint_type} | Location: {sprint.location || 'Any'}
          </div>
          {progress !== undefined && (
            <div className="text-gray-300">Progress: {Math.round(progress)}%</div>
          )}
          {assignment.next_content_due && (
            <div className="text-gray-300">
              Next: {new Date(assignment.next_content_due).toLocaleDateString()}
            </div>
          )}
          {hasConflicts && (
            <div className="text-red-300 mt-1">
              ⚠ {conflicts!.length} conflict(s)
            </div>
          )}
          
          {/* Tooltip arrow */}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"
          />
        </div>
      )}
    </div>
  );
};

export default SprintBar; 