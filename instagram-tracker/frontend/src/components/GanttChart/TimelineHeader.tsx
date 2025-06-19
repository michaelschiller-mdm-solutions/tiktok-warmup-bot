import React from 'react';
import type { TimeScale, DateRange } from '../../types/ganttChart';

interface TimelineHeaderProps {
  timeScale: TimeScale;
  dateRange: DateRange;
  scrollPosition: { x: number; y: number };
  containerWidth: number;
  scale: TimeScale;
  width: number;
  height: number;
  pixelsPerDay: number;
  showDetails: boolean;
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  timeScale,
  dateRange,
  scrollPosition,
  containerWidth
}) => {
  return (
    <div className="timeline-header h-20 bg-gray-50 border-b border-gray-200 relative overflow-hidden">
      {/* Major ticks (months/weeks) */}
      <div className="absolute top-0 left-0 w-full h-10 border-b border-gray-300">
        {timeScale.majorTicks.map((tick) => (
          <div
            key={tick.date.toISOString()}
            className="absolute top-0 h-full flex items-center border-r border-gray-300"
            style={{ left: tick.x - scrollPosition.x }}
          >
            <span className="ml-2 text-sm font-medium text-gray-700">
              {tick.label}
            </span>
          </div>
        ))}
      </div>

      {/* Minor ticks (days) */}
      <div className="absolute top-10 left-0 w-full h-10">
        {timeScale.minorTicks.map((tick) => (
          <div
            key={`minor-${tick.date.toISOString()}`}
            className="absolute top-0 h-full border-r border-gray-200"
            style={{ left: tick.x - scrollPosition.x }}
          >
            {tick.label && (
              <span className="ml-1 text-xs text-gray-500">
                {tick.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Current time indicator in header */}
      {timeScale.currentTimeX >= 0 && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: timeScale.currentTimeX - scrollPosition.x }}
        >
          <div className="absolute -top-1 -left-2 text-xs text-red-600 font-medium">
            Now
          </div>
        </div>
      )}
    </div>
  );
}; 