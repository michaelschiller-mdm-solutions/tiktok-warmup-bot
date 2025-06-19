import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { 
  TimelineData, 
  AccountTimelineRow, 
  AssignmentBar, 
  ConflictIndicator,
  TimeScale,
  GanttViewport
} from '../../types/ganttChart';

interface GanttCanvasProps {
  timelineData: TimelineData;
  containerWidth: number;
  containerHeight: number;
  scrollLeft: number;
  scrollTop: number;
  pixelsPerDay: number;
  onSprintClick: (assignmentBar: AssignmentBar, event: React.MouseEvent) => void;
  onAccountClick: (account: AccountTimelineRow, event: React.MouseEvent) => void;
  className?: string;
}

interface CanvasRenderOptions {
  showDetails: boolean;
  showContentMarkers: boolean;
  showConflicts: boolean;
  highlightCurrentTime: boolean;
}

export const GanttCanvas: React.FC<GanttCanvasProps> = ({
  timelineData,
  containerWidth,
  containerHeight,
  scrollLeft,
  scrollTop,
  pixelsPerDay,
  onSprintClick,
  onAccountClick,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const hitTestMapRef = useRef<Map<string, { type: 'sprint' | 'account'; data: any; bounds: DOMRect }>>(new Map());

  // Canvas dimensions
  const canvasWidth = useMemo(() => {
    if (!timelineData?.scale) return containerWidth;
    const timelineDuration = (timelineData.scale.end.getTime() - timelineData.scale.start.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(timelineDuration * pixelsPerDay, containerWidth);
  }, [timelineData?.scale, pixelsPerDay, containerWidth]);

  const canvasHeight = useMemo(() => {
    if (!timelineData?.accounts) return containerHeight;
    return Math.max(timelineData.accounts.length * 60, containerHeight);
  }, [timelineData?.accounts, containerHeight]);

  // Viewport calculation for optimization
  const viewport: GanttViewport = useMemo(() => ({
    left: scrollLeft,
    right: scrollLeft + containerWidth,
    top: scrollTop,
    bottom: scrollTop + containerHeight,
    width: containerWidth,
    height: containerHeight
  }), [scrollLeft, scrollTop, containerWidth, containerHeight]);

  /**
   * Main canvas rendering function
   */
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !timelineData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Configure rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const renderOptions: CanvasRenderOptions = {
      showDetails: pixelsPerDay >= 15, // Show details only at sufficient zoom
      showContentMarkers: pixelsPerDay >= 20,
      showConflicts: true,
      highlightCurrentTime: true
    };

    // Clear hit test map
    hitTestMapRef.current.clear();

    // Render timeline background
    renderTimelineBackground(ctx, timelineData.scale, viewport, renderOptions);

    // Render account rows
    timelineData.accounts.forEach((accountRow, index) => {
      renderAccountRow(ctx, accountRow, index, viewport, renderOptions);
    });

    // Render conflicts
    if (renderOptions.showConflicts && timelineData.conflicts) {
      timelineData.conflicts.forEach(conflict => {
        renderConflictIndicator(ctx, conflict, viewport);
      });
    }

    // Render current time indicator
    if (renderOptions.highlightCurrentTime) {
      renderCurrentTimeIndicator(ctx, timelineData.scale, viewport);
    }
  }, [timelineData, canvasWidth, canvasHeight, viewport, pixelsPerDay]);

  /**
   * Render timeline background with time grid
   */
  const renderTimelineBackground = (
    ctx: CanvasRenderingContext2D,
    scale: TimeScale,
    viewport: GanttViewport,
    options: CanvasRenderOptions
  ) => {
    // Background
    ctx.fillStyle = '#FAFAFA';
    ctx.fillRect(viewport.left, viewport.top, viewport.width, viewport.height);

    // Time grid lines
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 1;

    // Major grid lines (weeks)
    const startWeek = new Date(scale.start);
    startWeek.setDate(startWeek.getDate() - startWeek.getDay()); // Start of week

    const currentWeek = new Date(startWeek);
    while (currentWeek <= scale.end) {
      const x = ((currentWeek.getTime() - scale.start.getTime()) / (1000 * 60 * 60 * 24)) * pixelsPerDay;
      
      if (x >= viewport.left && x <= viewport.right) {
        ctx.beginPath();
        ctx.moveTo(x, viewport.top);
        ctx.lineTo(x, viewport.bottom);
        ctx.stroke();
      }
      
      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    // Minor grid lines (days)
    if (options.showDetails && pixelsPerDay >= 10) {
      ctx.strokeStyle = '#F3F4F6';
      ctx.lineWidth = 0.5;

      const startDay = new Date(scale.start);
      const currentDay = new Date(startDay);
      while (currentDay <= scale.end) {
        const x = ((currentDay.getTime() - scale.start.getTime()) / (1000 * 60 * 60 * 24)) * pixelsPerDay;
        
        if (x >= viewport.left && x <= viewport.right) {
          ctx.beginPath();
          ctx.moveTo(x, viewport.top);
          ctx.lineTo(x, viewport.bottom);
          ctx.stroke();
        }
        
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }
  };

  /**
   * Render account row with assignments
   */
  const renderAccountRow = (
    ctx: CanvasRenderingContext2D,
    accountRow: AccountTimelineRow,
    rowIndex: number,
    viewport: GanttViewport,
    options: CanvasRenderOptions
  ) => {
    const rowY = rowIndex * 60;
    const rowHeight = 60;

    // Skip if row is not in viewport
    if (rowY + rowHeight < viewport.top || rowY > viewport.bottom) {
      return;
    }

    // Row background (alternating colors)
    ctx.fillStyle = rowIndex % 2 === 0 ? '#FFFFFF' : '#F9FAFB';
    ctx.fillRect(viewport.left, rowY, viewport.width, rowHeight);

    // Account label background
    ctx.fillStyle = '#F3F4F6';
    ctx.fillRect(viewport.left, rowY, 200, rowHeight);

    // Account label text
    if (options.showDetails) {
      ctx.fillStyle = '#374151';
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      
      const accountText = accountRow.account.username || `Account ${accountRow.account.id}`;
      ctx.fillText(accountText, viewport.left + 10, rowY + rowHeight / 2);

      // Account status indicator
      const statusColor = getAccountStatusColor(accountRow.account.status);
      ctx.fillStyle = statusColor;
      ctx.beginPath();
      ctx.arc(viewport.left + 180, rowY + rowHeight / 2, 4, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Render assignment bars for this account
    accountRow.assignments.forEach(assignmentBar => {
      renderAssignmentBar(ctx, assignmentBar, rowY, viewport, options);
    });

    // Add account to hit test map
    const accountBounds = new DOMRect(viewport.left, rowY, 200, rowHeight);
    hitTestMapRef.current.set(`account-${accountRow.account.id}`, {
      type: 'account',
      data: accountRow,
      bounds: accountBounds
    });
  };

  /**
   * Render individual assignment bar
   */
  const renderAssignmentBar = (
    ctx: CanvasRenderingContext2D,
    assignmentBar: AssignmentBar,
    rowY: number,
    viewport: GanttViewport,
    options: CanvasRenderOptions
  ) => {
    const barX = assignmentBar.x;
    const barY = rowY + 10;
    const barWidth = assignmentBar.width;
    const barHeight = 40;

    // Skip if bar is not in viewport
    if (barX + barWidth < viewport.left || barX > viewport.right) {
      return;
    }

    // Bar background
    ctx.fillStyle = assignmentBar.color;
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Progress indicator
    if (assignmentBar.progress > 0) {
      const progressWidth = (barWidth * assignmentBar.progress) / 100;
      ctx.fillStyle = darkenColor(assignmentBar.color, 0.2);
      ctx.fillRect(barX, barY, progressWidth, barHeight);
    }

    // Border
    ctx.strokeStyle = darkenColor(assignmentBar.color, 0.3);
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // Sprint text
    if (options.showDetails && barWidth > 60) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const sprintName = assignmentBar.sprint.name || `Sprint ${assignmentBar.sprint.id}`;
      const truncatedName = sprintName.length > 15 ? `${sprintName.substring(0, 12)}...` : sprintName;
      
      ctx.fillText(truncatedName, barX + barWidth / 2, barY + barHeight / 2 - 5);
      
      // Progress text
      ctx.font = '10px system-ui, -apple-system, sans-serif';
      ctx.fillText(`${Math.round(assignmentBar.progress)}%`, barX + barWidth / 2, barY + barHeight / 2 + 7);
    }

    // Content item markers
    if (options.showContentMarkers && assignmentBar.contentItems.length > 0) {
      assignmentBar.contentItems.forEach(contentItem => {
        renderContentItemMarker(ctx, contentItem, barY, barHeight);
      });
    }

    // Add to hit test map
    const barBounds = new DOMRect(barX, barY, barWidth, barHeight);
    hitTestMapRef.current.set(assignmentBar.id, {
      type: 'sprint',
      data: assignmentBar,
      bounds: barBounds
    });
  };

  /**
   * Render content item markers within assignment bars
   */
  const renderContentItemMarker = (
    ctx: CanvasRenderingContext2D,
    contentItem: any,
    barY: number,
    barHeight: number
  ) => {
    const markerX = contentItem.x;
    const markerY = barY + barHeight - 8;
    const markerSize = 6;

    // Marker color based on status
    const markerColors = {
      posted: '#10B981',
      queued: '#6366F1',
      failed: '#EF4444',
      cancelled: '#6B7280'
    };

    ctx.fillStyle = markerColors[contentItem.status as keyof typeof markerColors] || '#6B7280';
    ctx.beginPath();
    ctx.arc(markerX, markerY, markerSize / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Emergency indicator
    if (contentItem.isEmergency) {
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  };

  /**
   * Render conflict indicators
   */
  const renderConflictIndicator = (
    ctx: CanvasRenderingContext2D,
    conflict: ConflictIndicator,
    viewport: GanttViewport
  ) => {
    // Skip if conflict is not in viewport
    if (conflict.x + conflict.width < viewport.left || conflict.x > viewport.right ||
        conflict.y + conflict.height < viewport.top || conflict.y > viewport.bottom) {
      return;
    }

    // Conflict highlight
    ctx.fillStyle = conflict.severity === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)';
    ctx.fillRect(conflict.x, conflict.y, conflict.width, conflict.height);

    // Conflict border
    ctx.strokeStyle = conflict.severity === 'error' ? '#DC2626' : '#D97706';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(conflict.x, conflict.y, conflict.width, conflict.height);
    ctx.setLineDash([]); // Reset line dash

    // Conflict icon
    const iconX = conflict.x + conflict.width - 20;
    const iconY = conflict.y + 5;
    ctx.fillStyle = conflict.severity === 'error' ? '#DC2626' : '#D97706';
    ctx.font = '14px system-ui, -apple-system, sans-serif';
    ctx.fillText('⚠', iconX, iconY + 10);
  };

  /**
   * Render current time indicator
   */
  const renderCurrentTimeIndicator = (
    ctx: CanvasRenderingContext2D,
    scale: TimeScale,
    viewport: GanttViewport
  ) => {
    const currentTimeX = scale.currentTimeX;

    if (currentTimeX >= viewport.left && currentTimeX <= viewport.right) {
      // Current time line
      ctx.strokeStyle = '#DC2626';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(currentTimeX, viewport.top);
      ctx.lineTo(currentTimeX, viewport.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Current time label
      ctx.fillStyle = '#DC2626';
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('NOW', currentTimeX, viewport.top + 20);
    }
  };

  /**
   * Handle canvas click events
   */
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) + scrollLeft;
    const y = (event.clientY - rect.top) + scrollTop;

    // Check hit test map for clicked element
    for (const [id, hitTest] of Array.from(hitTestMapRef.current.entries())) {
      const { bounds, type, data } = hitTest;
      
      if (x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom) {
        if (type === 'sprint') {
          onSprintClick?.(data, event);
        } else if (type === 'account') {
          onAccountClick?.(data, event);
        }
        break;
      }
    }
  }, [scrollLeft, scrollTop, onSprintClick, onAccountClick]);

  // Re-render when data or viewport changes
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(() => {
      renderCanvas();
    });

    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [renderCanvas]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleCanvasClick}
        className="absolute top-0 left-0 cursor-pointer"
        style={{
          width: canvasWidth,
          height: canvasHeight
        }}
      />
      {/* Overlay canvas for interactive elements */}
      <canvas
        ref={overlayCanvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="absolute top-0 left-0 pointer-events-none"
        style={{
          width: canvasWidth,
          height: canvasHeight
        }}
      />
    </div>
  );
};

// Helper functions
const getAccountStatusColor = (status: string): string => {
  const statusColors: Record<string, string> = {
    active: '#10B981',
    warmup: '#3B82F6',
    idle: '#6B7280',
    cooldown: '#F59E0B',
    paused: '#8B5CF6',
    error: '#EF4444'
  };
  
  return statusColors[status] || '#6B7280';
};

const darkenColor = (color: string, factor: number): string => {
  // Simple color darkening - in production, use a proper color library
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const darkerR = Math.floor(r * (1 - factor));
  const darkerG = Math.floor(g * (1 - factor));
  const darkerB = Math.floor(b * (1 - factor));
  
  return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
};

export default GanttCanvas; 