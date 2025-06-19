// Timeline calculation utilities for Gantt Chart

import type { 
  DateRange, 
  TimeScale, 
  DateTick, 
  ZoomLevel, 
  TimelineCalculationOptions,
  PositionedElement
} from '../types/ganttChart';

export const timelineCalculations = {
  /**
   * Calculate the complete timeline scale and positioning
   */
  calculateTimeline(options: TimelineCalculationOptions) {
    const { containerWidth, dateRange, zoomLevel, accountCount, rowHeight, headerHeight } = options;
    
    const timeScale = this.calculateTimeScale(dateRange, containerWidth, zoomLevel);
    const totalWidth = this.calculateTotalWidth(dateRange, zoomLevel.pixelsPerDay);
    const totalHeight = accountCount * rowHeight + headerHeight;
    
    return {
      timeScale,
      totalWidth,
      totalHeight,
      rowHeight,
      headerHeight,
      containerWidth,
      containerHeight: options.accountCount * rowHeight
    };
  },

  /**
   * Calculate time scale with tick marks and positioning
   */
  calculateTimeScale(dateRange: DateRange, containerWidth: number, zoomLevel: ZoomLevel): TimeScale {
    const { start, end } = dateRange;
    const totalDays = this.getDaysBetween(start, end);
    const pixelsPerDay = zoomLevel.pixelsPerDay;
    const totalWidth = totalDays * pixelsPerDay;
    
    // Calculate current time position
    const now = new Date();
    const currentTimeX = now >= start && now <= end 
      ? this.dateToPixel(now, start, pixelsPerDay)
      : -1;

    // Generate tick marks
    const majorTicks = this.generateTicks(start, end, zoomLevel.majorTickInterval, true, pixelsPerDay);
    const minorTicks = this.generateTicks(start, end, zoomLevel.minorTickInterval, false, pixelsPerDay);

    return {
      start,
      end,
      pixelsPerDay,
      majorTicks,
      minorTicks,
      currentTimeX
    };
  },

  /**
   * Convert a date to pixel position
   */
  dateToPixel(date: Date, startDate: Date, pixelsPerDay: number): number {
    const daysDiff = this.getDaysBetween(startDate, date);
    return daysDiff * pixelsPerDay;
  },

  /**
   * Convert pixel position to date
   */
  pixelToDate(pixel: number, startDate: Date, pixelsPerDay: number): Date {
    const days = pixel / pixelsPerDay;
    const date = new Date(startDate);
    date.setDate(date.getDate() + days);
    return date;
  },

  /**
   * Calculate total width needed for timeline
   */
  calculateTotalWidth(dateRange: DateRange, pixelsPerDay: number): number {
    const totalDays = this.getDaysBetween(dateRange.start, dateRange.end);
    return Math.max(1200, totalDays * pixelsPerDay); // Minimum width of 1200px
  },

  /**
   * Generate tick marks for timeline
   */
  generateTicks(start: Date, end: Date, intervalDays: number, isMajor: boolean, pixelsPerDay: number): DateTick[] {
    const ticks: DateTick[] = [];
    const current = new Date(start);
    
    // Align to interval boundary
    if (isMajor) {
      if (intervalDays === 7) {
        // Align to Monday for weekly ticks
        const dayOfWeek = current.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        current.setDate(current.getDate() + daysToMonday);
      } else if (intervalDays === 30) {
        // Align to first of month for monthly ticks
        current.setDate(1);
      }
    }

    while (current <= end) {
      const x = this.dateToPixel(current, start, pixelsPerDay);
      const label = this.formatTickLabel(new Date(current), intervalDays, isMajor);
      
      ticks.push({
        date: new Date(current),
        x,
        label,
        isMajor
      });

      current.setDate(current.getDate() + intervalDays);
    }

    return ticks;
  },

  /**
   * Format tick label based on interval and type
   */
  formatTickLabel(date: Date, intervalDays: number, isMajor: boolean): string {
    if (intervalDays === 1) {
      // Daily view
      return isMajor 
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : date.getDate().toString();
    } else if (intervalDays === 7) {
      // Weekly view
      return isMajor
        ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '';
    } else if (intervalDays >= 30) {
      // Monthly view
      return isMajor
        ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : date.toLocaleDateString('en-US', { month: 'short' });
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /**
   * Calculate days between two dates
   */
  getDaysBetween(start: Date, end: Date): number {
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  },

  /**
   * Position assignment bars on timeline
   */
  positionAssignmentBar(startDate: Date, endDate: Date, timelineStart: Date, pixelsPerDay: number) {
    const x = this.dateToPixel(startDate, timelineStart, pixelsPerDay);
    const endX = this.dateToPixel(endDate, timelineStart, pixelsPerDay);
    const width = Math.max(10, endX - x); // Minimum width of 10px

    return { x, width };
  },

  /**
   * Calculate content item positions within assignment bars
   */
  positionContentItems(
    contentItems: Array<{ scheduledTime: Date; status: string }>,
    assignmentStart: Date,
    assignmentEnd: Date,
    timelineStart: Date,
    pixelsPerDay: number,
    barWidth: number
  ) {
    return contentItems.map((item, index) => {
      const itemDate = new Date(item.scheduledTime);
      
      // Position relative to timeline start
      const absoluteX = this.dateToPixel(itemDate, timelineStart, pixelsPerDay);
      
      // Position relative to assignment bar start
      const assignmentStartX = this.dateToPixel(assignmentStart, timelineStart, pixelsPerDay);
      const relativeX = absoluteX - assignmentStartX;
      
      // Ensure content item is within bar bounds
      const x = Math.max(2, Math.min(barWidth - 8, relativeX));
      
      return {
        id: `content-${index}`,
        x,
        scheduledTime: itemDate,
        status: item.status
      };
    });
  },

  /**
   * Calculate optimal date range for timeline
   */
  calculateOptimalDateRange(assignments: any[], paddingDays: number = 7): DateRange {
    if (assignments.length === 0) {
      const now = new Date();
      const start = new Date(now);
      start.setDate(start.getDate() - paddingDays);
      const end = new Date(now);
      end.setDate(end.getDate() + paddingDays * 4);
      return { start, end };
    }

    // Find earliest and latest dates from assignments
    let earliestDate = new Date();
    let latestDate = new Date();

    assignments.forEach(assignment => {
      const startDate = new Date(assignment.start_date || assignment.created_at);
      const endDate = new Date(assignment.end_date || startDate);
      
      if (startDate < earliestDate) earliestDate = startDate;
      if (endDate > latestDate) latestDate = endDate;
    });

    // Add padding
    const start = new Date(earliestDate);
    start.setDate(start.getDate() - paddingDays);
    
    const end = new Date(latestDate);
    end.setDate(end.getDate() + paddingDays);

    return { start, end };
  },

  /**
   * Check if two date ranges overlap
   */
  dateRangesOverlap(range1: DateRange, range2: DateRange): boolean {
    return range1.start <= range2.end && range1.end >= range2.start;
  },

  /**
   * Calculate progress percentage for assignment
   */
  calculateProgress(assignment: any): number {
    if (!assignment.start_date || !assignment.end_date) return 0;
    
    const start = new Date(assignment.start_date).getTime();
    const end = new Date(assignment.end_date).getTime();
    const now = Date.now();
    
    if (now < start) return 0;
    if (now > end) return 100;
    
    const total = end - start;
    const elapsed = now - start;
    
    return Math.round((elapsed / total) * 100);
  },

  /**
   * Format duration in human readable format
   */
  formatDuration(hours: number): string {
    if (hours < 24) {
      return `${Math.round(hours)}h`;
    } else if (hours < 24 * 7) {
      const days = Math.round(hours / 24);
      return `${days}d`;
    } else {
      const weeks = Math.round(hours / (24 * 7));
      return `${weeks}w`;
    }
  },

  /**
   * Calculate viewport bounds for virtual scrolling
   */
  calculateViewport(scrollPosition: { x: number; y: number }, containerSize: { width: number; height: number }) {
    const padding = 100; // Render padding outside viewport
    
    return {
      left: Math.max(0, scrollPosition.x - padding),
      right: scrollPosition.x + containerSize.width + padding,
      top: Math.max(0, scrollPosition.y - padding),
      bottom: scrollPosition.y + containerSize.height + padding,
      width: containerSize.width,
      height: containerSize.height
    };
  },

  /**
   * Check if element is within viewport
   */
  isElementVisible(element: PositionedElement, viewport: any): boolean {
    return !(
      element.x + element.width < viewport.left ||
      element.x > viewport.right ||
      element.y + element.height < viewport.top ||
      element.y > viewport.bottom
    );
  }
}; 