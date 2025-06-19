import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import type { 
  TimelineData, 
  AccountTimelineRow, 
  GanttViewport,
  VirtualScrollData,
  TimeScale,
  GanttTooltipData
} from '../../types/ganttChart';
import { AccountRow } from './AccountRow';
import { TimelineHeader } from './TimelineHeader';

interface VirtualizedGanttProps {
  timelineData: TimelineData;
  containerWidth: number;
  containerHeight: number;
  rowHeight: number;
  headerHeight: number;
  onSprintClick: (assignmentBar: any, event: React.MouseEvent) => void;
  onAccountClick: (accountRow: AccountTimelineRow, event: React.MouseEvent) => void;
  onMouseEnter: (data: GanttTooltipData) => void;
  onMouseLeave: () => void;
  pixelsPerDay: number;
  scrollPosition: { left: number; top: number };
  onScroll: (scrollLeft: number, scrollTop: number) => void;
  className?: string;
}

interface RowData {
  accounts: AccountTimelineRow[];
  onSprintClick: (assignmentBar: any, event: React.MouseEvent) => void;
  onAccountClick: (accountRow: AccountTimelineRow, event: React.MouseEvent) => void;
  pixelsPerDay: number;
  scrollLeft: number;
  containerWidth: number;
  timelineStart: Date;
  timelineEnd: Date;
}

export const VirtualizedGantt: React.FC<VirtualizedGanttProps> = ({
  timelineData,
  containerWidth,
  containerHeight,
  rowHeight,
  headerHeight,
  onSprintClick,
  onAccountClick,
  onMouseEnter,
  onMouseLeave,
  pixelsPerDay,
  scrollPosition,
  onScroll,
  className = ''
}) => {
  const listRef = useRef<List>(null);
  const [localScrollPosition, setLocalScrollPosition] = useState({ left: 0, top: 0 });
  const [virtualScrollData, setVirtualScrollData] = useState<VirtualScrollData>({
    startIndex: 0,
    endIndex: 0,
    visibleRows: [],
    totalHeight: 0,
    scrollTop: 0
  });

  // Calculate timeline dimensions
  const timelineWidth = useMemo(() => {
    if (!timelineData?.scale) return containerWidth;
    const days = Math.ceil((timelineData.scale.end.getTime() - timelineData.scale.start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(days * pixelsPerDay, containerWidth);
  }, [timelineData?.scale, pixelsPerDay, containerWidth]);

  const availableHeight = containerHeight - headerHeight;
  const totalAccountsHeight = (timelineData?.accounts?.length || 0) * rowHeight;

  // Calculate visible range based on scroll position
  const visibleRange = useMemo(() => {
    const accounts = timelineData?.accounts || [];
    const startIndex = Math.floor(scrollPosition.top / rowHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(availableHeight / rowHeight) + 1, // +1 for buffer
      accounts.length - 1
    );

    return {
      startIndex: Math.max(0, startIndex),
      endIndex: Math.max(0, endIndex),
      visibleRows: accounts.slice(
        Math.max(0, startIndex), 
        Math.min(accounts.length, endIndex + 1)
      )
    };
  }, [timelineData?.accounts, scrollPosition.top, rowHeight, availableHeight]);

  // Update virtual scroll data when visible range changes
  useEffect(() => {
    setVirtualScrollData({
      startIndex: visibleRange.startIndex,
      endIndex: visibleRange.endIndex,
      visibleRows: visibleRange.visibleRows,
      totalHeight: totalAccountsHeight,
      scrollTop: scrollPosition.top
    });
  }, [visibleRange, totalAccountsHeight, scrollPosition.top]);

  // Row renderer for react-window
  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const accountRow = timelineData?.accounts?.[index];
    if (!accountRow) return null;

    return (
      <div style={style}>
        <AccountRow
          accountRow={accountRow}
          rowIndex={index}
          timelineWidth={timelineWidth}
          pixelsPerDay={pixelsPerDay}
          onSprintClick={onSprintClick}
          onAccountClick={onAccountClick}
          scrollLeft={scrollPosition.left}
          timelineStart={timelineData?.scale?.start || new Date()}
          timelineEnd={timelineData?.scale?.end || new Date()}
          showDetails={pixelsPerDay >= 15}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
      </div>
    );
  }, [
    timelineData,
    timelineWidth,
    pixelsPerDay,
    onSprintClick,
    onAccountClick,
    scrollPosition.left,
    onMouseEnter,
    onMouseLeave
  ]);

  // Handle scroll events
  const handleScroll = (props: any) => {
    // Handle vertical scrolling only - horizontal is handled separately
    setLocalScrollPosition(prev => ({ ...prev, y: props.scrollTop }));
    // Notify parent component of scroll change
    onScroll(scrollPosition.left, props.scrollTop);
  };

  // Handle horizontal scroll
  const handleHorizontalScroll = useCallback((deltaX: number) => {
    const maxScrollLeft = Math.max(0, timelineWidth - containerWidth);
    const newScrollLeft = Math.max(0, Math.min(maxScrollLeft, scrollPosition.left + deltaX));
    onScroll(newScrollLeft, scrollPosition.top);
  }, [timelineWidth, containerWidth, scrollPosition.left, scrollPosition.top, onScroll]);

  // Mouse wheel handling for horizontal scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Horizontal scroll with Shift + wheel or trackpad horizontal gesture
    if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      e.preventDefault();
      const deltaX = e.deltaX || e.deltaY;
      handleHorizontalScroll(deltaX);
    }
    // Let vertical scroll events pass through to the List component naturally
  }, [handleHorizontalScroll]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 50; // Pixels per arrow key press
    const bigStep = 200; // Pixels for Page Up/Down
    
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        handleHorizontalScroll(-step);
        break;
      case 'ArrowRight':
        e.preventDefault();
        handleHorizontalScroll(step);
        break;
      case 'Home':
        e.preventDefault();
        onScroll(0, scrollPosition.top);
        break;
      case 'End':
        e.preventDefault();
        onScroll(Math.max(0, timelineWidth - containerWidth), scrollPosition.top);
        break;
      case 'PageLeft':
        e.preventDefault();
        handleHorizontalScroll(-bigStep);
        break;
      case 'PageRight':
        e.preventDefault();
        handleHorizontalScroll(bigStep);
        break;
    }
  }, [handleHorizontalScroll, onScroll, scrollPosition.top, timelineWidth, containerWidth]);

  // Track current scroll position for sync
  const [lastScrollTop, setLastScrollTop] = useState(0);

  // Sync external scroll position with internal list
  useEffect(() => {
    if (listRef.current && Math.abs(lastScrollTop - scrollPosition.top) > 1) {
      listRef.current.scrollTo(scrollPosition.top);
      setLastScrollTop(scrollPosition.top);
    }
  }, [scrollPosition.top, lastScrollTop]);

  // Optimized rendering: only render rows that are actually visible
  const renderVisibleRows = useCallback(() => {
    if (!timelineData?.accounts) return null;

    return virtualScrollData.visibleRows.map((accountRow, relativeIndex) => {
      const absoluteIndex = virtualScrollData.startIndex + relativeIndex;
      const top = absoluteIndex * rowHeight;

      return (
        <div
          key={`account-row-${accountRow.account.id}`}
          className="absolute w-full"
          style={{
            top,
            height: rowHeight,
            transform: `translateX(-${scrollPosition.left}px)`
          }}
        >
          <AccountRow
            accountRow={accountRow}
            rowIndex={absoluteIndex}
            timelineWidth={timelineWidth}
            pixelsPerDay={pixelsPerDay}
            onSprintClick={onSprintClick}
            onAccountClick={onAccountClick}
            scrollLeft={scrollPosition.left}
            timelineStart={timelineData.scale?.start || new Date()}
            timelineEnd={timelineData.scale?.end || new Date()}
            showDetails={pixelsPerDay >= 15}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
          />
        </div>
      );
    });
  }, [
    timelineData,
    virtualScrollData,
    rowHeight,
    scrollPosition.left,
    timelineWidth,
    pixelsPerDay,
    onSprintClick,
    onAccountClick,
    onMouseEnter,
    onMouseLeave
  ]);

  return (
    <div 
      className={`relative overflow-hidden focus:outline-none ${className}`} 
      style={{ width: containerWidth, height: containerHeight }}
      onWheel={handleWheel}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Fixed Timeline Header */}
      <div 
        className="absolute top-0 left-0 z-10 bg-white border-b"
        style={{ 
          width: timelineWidth,
          height: headerHeight,
          transform: `translateX(-${scrollPosition.left}px)`
        }}
      >
        <TimelineHeader
          scale={timelineData?.scale}
          timeScale={timelineData?.scale}
          dateRange={{ start: timelineData?.scale?.start || new Date(), end: timelineData?.scale?.end || new Date() }}
          scrollPosition={{ x: scrollPosition.left, y: scrollPosition.top }}
          containerWidth={containerWidth}
          width={timelineWidth}
          height={headerHeight}
          pixelsPerDay={pixelsPerDay}
          showDetails={pixelsPerDay >= 10}
        />
      </div>

      {/* Scrollable Content Area */}
      <div 
        className="absolute bg-gray-50"
        style={{ 
          top: headerHeight,
          left: 0,
          width: containerWidth,
          height: availableHeight
        }}
      >
        {/* Option 1: Using react-window for optimal performance */}
        <List
          ref={listRef}
          width={containerWidth}
          height={availableHeight}
          itemCount={timelineData?.accounts?.length || 0}
          itemSize={rowHeight}
          onScroll={handleScroll}
          className="gantt-virtual-list"
          style={{
            overflowX: 'hidden' // Horizontal scroll handled separately
          }}
        >
          {Row}
        </List>

        {/* Option 2: Custom virtual scrolling (alternative implementation) */}
        {/* Uncomment this section if you prefer custom virtual scrolling over react-window */}
        {/*
        <div 
          className="relative"
          style={{ 
            height: totalAccountsHeight,
            width: timelineWidth
          }}
        >
          {renderVisibleRows()}
        </div>
        */}

        {/* Horizontal Scrollbar Track */}
        <div 
          className="absolute bottom-0 left-0 bg-gray-200 border-t"
          style={{ 
            width: containerWidth,
            height: 20
          }}
        >
          <div
            className="bg-gray-400 h-full cursor-grab active:cursor-grabbing hover:bg-gray-500"
            style={{
              width: Math.max((containerWidth * containerWidth) / timelineWidth, 20),
              transform: `translateX(${(scrollPosition.left * containerWidth) / timelineWidth}px)`
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              const startScrollLeft = scrollPosition.left;
              
              const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const scrollRatio = timelineWidth / containerWidth;
                const newScrollLeft = Math.max(0, Math.min(
                  timelineWidth - containerWidth,
                  startScrollLeft + (deltaX * scrollRatio)
                ));
                onScroll(newScrollLeft, scrollPosition.top);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
        </div>
      </div>

      {/* Performance Metrics (Development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white p-2 rounded text-xs">
          <div>Visible: {virtualScrollData.startIndex} - {virtualScrollData.endIndex}</div>
          <div>Total: {timelineData?.accounts?.length || 0} accounts</div>
          <div>Rendered: {virtualScrollData.visibleRows.length} rows</div>
          <div>Timeline Width: {Math.round(timelineWidth)}px</div>
          <div>Pixels/Day: {pixelsPerDay}</div>
        </div>
      )}
    </div>
  );
};

// Performance optimization: Memoize row data
const useRowData = (
  accounts: AccountTimelineRow[],
  onSprintClick: (assignmentBar: any, event: React.MouseEvent) => void,
  onAccountClick: (accountRow: AccountTimelineRow, event: React.MouseEvent) => void,
  pixelsPerDay: number,
  scrollLeft: number,
  containerWidth: number,
  timelineStart: Date,
  timelineEnd: Date
): RowData => {
  return useMemo(() => ({
    accounts,
    onSprintClick,
    onAccountClick,
    pixelsPerDay,
    scrollLeft,
    containerWidth,
    timelineStart,
    timelineEnd
  }), [
    accounts,
    onSprintClick,
    onAccountClick,
    pixelsPerDay,
    scrollLeft,
    containerWidth,
    timelineStart,
    timelineEnd
  ]);
};

// Additional Performance Optimizations
export const OptimizedVirtualizedGantt = React.memo(VirtualizedGantt, (prevProps, nextProps) => {
  // Custom comparison for performance
  return (
    prevProps.timelineData === nextProps.timelineData &&
    prevProps.containerWidth === nextProps.containerWidth &&
    prevProps.containerHeight === nextProps.containerHeight &&
    prevProps.pixelsPerDay === nextProps.pixelsPerDay &&
    prevProps.scrollPosition.left === nextProps.scrollPosition.left &&
    prevProps.scrollPosition.top === nextProps.scrollPosition.top
  );
});

export default VirtualizedGantt; 