import express from 'express';
import { TimelineCalculationService } from '../services/TimelineCalculationService';

const router = express.Router();

/**
 * GET /api/gantt/timeline-data
 * 
 * Calculate timeline data for Gantt chart visualization
 * Integrates with TimelineCalculationService for proper date-based positioning
 */
router.get('/timeline-data', async (req: any, res: any) => {
  try {
    const {
      start_date,
      end_date,
      container_width = 1200,
      zoom_level = 'week',
      pixels_per_day,
      major_tick_interval,
      minor_tick_interval,
      account_ids,
      sprint_ids
    } = req.query;

    // Validate required parameters
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'start_date and end_date are required'
      });
    }

    // Parse date range
    const dateRange = {
      start: new Date(start_date as string),
      end: new Date(end_date as string)
    };

    // Validate date range
    if (dateRange.start >= dateRange.end) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'start_date must be before end_date'
      });
    }

    // Configure zoom level
    const zoomConfig = {
      level: zoom_level as 'hour' | 'day' | 'week' | 'month' | 'quarter',
      pixelsPerDay: pixels_per_day ? parseInt(pixels_per_day as string) : getDefaultPixelsPerDay(zoom_level as string),
      majorTickInterval: major_tick_interval ? parseInt(major_tick_interval as string) : getDefaultMajorTicks(zoom_level as string),
      minorTickInterval: minor_tick_interval ? parseInt(minor_tick_interval as string) : getDefaultMinorTicks(zoom_level as string),
      label: `${zoom_level} View`
    };

    // TODO: Fetch real data from database
    // For now, using mock data structure
    const mockSprints = [
      { id: 1, name: 'Vacation Content', sprint_type: 'vacation', content_items: new Array(10).fill(null) },
      { id: 2, name: 'University Life', sprint_type: 'university', content_items: new Array(8).fill(null) },
      { id: 3, name: 'Fitness Journey', sprint_type: 'fitness', content_items: new Array(12).fill(null) }
    ];

    const mockAssignments = [
      {
        id: 1,
        account_id: 1,
        sprint_id: 1,
        start_date: '2024-12-15',
        end_date: '2024-12-25',
        status: 'active' as const,
        current_content_index: 3
      },
      {
        id: 2,
        account_id: 2,
        sprint_id: 2,
        start_date: '2024-12-20',
        end_date: '2024-12-28',
        status: 'scheduled' as const,
        current_content_index: 0
      },
      {
        id: 3,
        account_id: 1,
        sprint_id: 3,
        start_date: '2024-12-10',
        end_date: '2024-12-18',
        status: 'completed' as const,
        current_content_index: 12
      }
    ];

    // Calculate timeline data using the service
    const timelineData = TimelineCalculationService.calculateTimelineData(
      mockAssignments,
      mockSprints,
      dateRange,
      parseInt(container_width as string),
      zoomConfig
    );

    res.json({
      success: true,
      data: {
        timeline_scale: timelineData.timeScale,
        assignment_bars: timelineData.assignmentBars,
        conflicts: timelineData.conflicts,
        total_duration: timelineData.totalDuration,
        date_range: dateRange,
        zoom_level: zoomConfig
      },
      metadata: {
        request_params: {
          start_date,
          end_date,
          container_width,
          zoom_level
        },
        calculation_timestamp: new Date().toISOString(),
        assignments_count: mockAssignments.length,
        sprints_count: mockSprints.length
      }
    });

  } catch (error) {
    console.error('Gantt timeline calculation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to calculate timeline data'
    });
  }
});

/**
 * GET /api/gantt/zoom-levels
 * 
 * Get available zoom level configurations
 */
router.get('/zoom-levels', async (req: any, res: any) => {
  try {
    const zoomLevels = [
      {
        level: 'hour',
        pixelsPerDay: 480,
        majorTickInterval: 0.25,
        minorTickInterval: 0.125,
        label: 'Hourly View'
      },
      {
        level: 'day',
        pixelsPerDay: 200,
        majorTickInterval: 1,
        minorTickInterval: 0.5,
        label: 'Daily View'
      },
      {
        level: 'week',
        pixelsPerDay: 60,
        majorTickInterval: 7,
        minorTickInterval: 1,
        label: 'Weekly View'
      },
      {
        level: 'month',
        pixelsPerDay: 20,
        majorTickInterval: 30,
        minorTickInterval: 7,
        label: 'Monthly View'
      },
      {
        level: 'quarter',
        pixelsPerDay: 6,
        majorTickInterval: 90,
        minorTickInterval: 30,
        label: 'Quarterly View'
      }
    ];

    res.json({
      success: true,
      data: zoomLevels
    });

  } catch (error) {
    console.error('Gantt zoom levels error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to fetch zoom levels'
    });
  }
});

/**
 * POST /api/gantt/resolve-conflict
 * 
 * Resolve assignment conflicts using suggested resolution options
 */
router.post('/resolve-conflict', async (req: any, res: any) => {
  try {
    const { conflict_id, resolution_type, assignment_ids } = req.body;

    // Validate required parameters
    if (!conflict_id || !resolution_type || !assignment_ids) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'conflict_id, resolution_type, and assignment_ids are required'
      });
    }

    // TODO: Implement actual conflict resolution logic
    // This would update assignment dates in the database
    console.log(`Resolving conflict ${conflict_id} with ${resolution_type} for assignments:`, assignment_ids);

    res.json({
      success: true,
      data: {
        conflict_id,
        resolution_applied: resolution_type,
        affected_assignments: assignment_ids,
        resolved_at: new Date().toISOString()
      },
      message: `Conflict resolved using ${resolution_type} strategy`
    });

  } catch (error) {
    console.error('Gantt conflict resolution error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to resolve conflict'
    });
  }
});

// Helper functions for default zoom configurations
function getDefaultPixelsPerDay(zoomLevel: string): number {
  const defaults: Record<string, number> = {
    hour: 480,
    day: 200,
    week: 60,
    month: 20,
    quarter: 6
  };
  return defaults[zoomLevel] || 60;
}

function getDefaultMajorTicks(zoomLevel: string): number {
  const defaults: Record<string, number> = {
    hour: 0.25,
    day: 1,
    week: 7,
    month: 30,
    quarter: 90
  };
  return defaults[zoomLevel] || 7;
}

function getDefaultMinorTicks(zoomLevel: string): number {
  const defaults: Record<string, number> = {
    hour: 0.125,
    day: 0.5,
    week: 1,
    month: 7,
    quarter: 30
  };
  return defaults[zoomLevel] || 1;
}

export default router; 