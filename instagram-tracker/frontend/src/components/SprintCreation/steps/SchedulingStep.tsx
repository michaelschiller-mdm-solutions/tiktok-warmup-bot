import React, { useState, useCallback, useMemo } from 'react';
import { StepProps, SprintContentItem } from '../../../types/sprintCreation';

const SchedulingStep: React.FC<StepProps> = ({
  data,
  onChange,
  errors,
  onStepComplete,
  isActive
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timelineView, setTimelineView] = useState<'hours' | 'days'>('days');

  const contentItems = data.content_items || [];

  // Calculate sprint duration and timeline
  const sprintTimeline = useMemo(() => {
    let currentTime = 0;
    const timeline = contentItems.map((item, index) => {
      const startTime = currentTime;
      const duration = item.delay_after_hours || 24;
      currentTime += duration;

      return {
        id: item.temporaryId || String(index),
        item,
        startTime,
        endTime: currentTime,
        duration,
        position: index
      };
    });

    return {
      items: timeline,
      totalDuration: currentTime,
      totalDays: Math.ceil(currentTime / 24)
    };
  }, [contentItems]);

  // Update content item
  const updateContentItem = useCallback((index: number, updates: Partial<SprintContentItem>) => {
    const updatedItems = [...contentItems];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    
    onChange({
      ...data,
      content_items: updatedItems
    });
  }, [contentItems, data, onChange]);

  // Bulk update all delays
  const updateAllDelays = useCallback((delayHours: number) => {
    const updatedItems = contentItems.map(item => ({
      ...item,
      delay_after_hours: delayHours
    }));
    
    onChange({
      ...data,
      content_items: updatedItems
    });
  }, [contentItems, data, onChange]);

  // Smart scheduling suggestions
  const getSchedulingSuggestions = useCallback(() => {
    const suggestions = [];

    if (sprintTimeline.totalDuration < 24) {
      suggestions.push({
        type: 'duration',
        title: 'Short Sprint Detected',
        description: 'Consider increasing delays between posts for more realistic timing',
        severity: 'warning'
      });
    }

    if (sprintTimeline.totalDuration > 336) { // 2 weeks
      suggestions.push({
        type: 'duration',
        title: 'Very Long Sprint',
        description: 'Consider splitting into multiple shorter sprints',
        severity: 'info'
      });
    }

    const uniformDelays = contentItems.every(item => item.delay_after_hours === contentItems[0]?.delay_after_hours);
    if (uniformDelays && contentItems.length > 3) {
      suggestions.push({
        type: 'variety',
        title: 'Uniform Timing',
        description: 'Vary posting delays for more natural patterns',
        severity: 'info'
      });
    }

    return suggestions;
  }, [sprintTimeline, contentItems]);

  const suggestions = getSchedulingSuggestions();

  // Validation
  const isStepValid = contentItems.length > 0 && contentItems.every(item => 
    item.delay_after_hours && item.delay_after_hours >= 1 && item.delay_after_hours <= 168
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Scheduling</h2>
        <p className="text-gray-600">
          Set realistic posting delays and review your content timeline
        </p>
      </div>

      {/* Sprint Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{contentItems.length}</div>
            <div className="text-sm text-gray-600">Content Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{sprintTimeline.totalDays}</div>
            <div className="text-sm text-gray-600">Days Duration</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(sprintTimeline.totalDuration)}</div>
            <div className="text-sm text-gray-600">Total Hours</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-pink-600">
              {contentItems.length > 0 ? Math.round(sprintTimeline.totalDuration / contentItems.length) : 0}
            </div>
            <div className="text-sm text-gray-600">Avg. Delay</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Scheduling</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '12 Hours', value: 12, desc: 'Frequent posting' },
            { label: '24 Hours', value: 24, desc: 'Daily posts' },
            { label: '48 Hours', value: 48, desc: 'Every 2 days' },
            { label: '72 Hours', value: 72, desc: 'Every 3 days' }
          ].map((preset) => (
            <button
              key={preset.value}
              onClick={() => updateAllDelays(preset.value)}
              className="p-3 text-center border border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors"
            >
              <div className="font-medium text-gray-900">{preset.label}</div>
              <div className="text-xs text-gray-500">{preset.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Content Timeline</h3>
          <div className="flex space-x-2">
            <button
              onClick={() => setTimelineView('hours')}
              className={`px-3 py-1 text-sm rounded ${timelineView === 'hours' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800'}`}
            >
              Hours
            </button>
            <button
              onClick={() => setTimelineView('days')}
              className={`px-3 py-1 text-sm rounded ${timelineView === 'days' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:text-gray-800'}`}
            >
              Days
            </button>
          </div>
        </div>

        {sprintTimeline.items.length > 0 ? (
          <div className="space-y-3">
            {sprintTimeline.items.map((timelineItem, index) => {
              const item = timelineItem.item;
              const displayStartTime = timelineView === 'days' 
                ? (timelineItem.startTime / 24).toFixed(1)
                : timelineItem.startTime;
              const displayDuration = timelineView === 'days'
                ? (timelineItem.duration / 24).toFixed(1)
                : timelineItem.duration;
              const unit = timelineView === 'days' ? 'days' : 'hours';

              return (
                <div
                  key={timelineItem.id}
                  className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
                >
                  {/* Position */}
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>

                  {/* Content Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">
                        {item.content_type === 'story' ? '📱' : item.content_type === 'post' ? '📸' : '⭐'} 
                        {item.fileName || `Content ${index + 1}`}
                      </span>
                      {item.description && (
                        <span className="text-xs text-gray-500 truncate">
                          {item.description}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      Starts at {displayStartTime} {unit}
                    </div>
                  </div>

                  {/* Delay Control */}
                  <div className="flex-shrink-0">
                    <label className="block text-xs text-gray-600 mb-1">
                      Delay ({item.delay_after_hours}h)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="168"
                      value={item.delay_after_hours}
                      onChange={(e) => updateContentItem(index, { 
                        delay_after_hours: parseInt(e.target.value) 
                      })}
                      className="w-20"
                    />
                  </div>

                  {/* Timeline Bar */}
                  <div className="flex-shrink-0 w-32">
                    <div className="bg-gray-200 rounded-full h-2 relative">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ 
                          width: `${Math.min(100, (timelineItem.duration / Math.max(72, sprintTimeline.totalDuration / sprintTimeline.items.length)) * 100)}%` 
                        }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {displayDuration} {unit}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-lg mb-2">⏰</div>
            <p className="text-gray-500">Add content items to see timeline</p>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <span className="text-lg font-medium text-gray-900">Advanced Scheduling</span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="px-6 pb-6 space-y-6 border-t border-gray-200">
            {/* Global Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Sprint Duration
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={data.target_duration_hours || sprintTimeline.totalDuration}
                    onChange={(e) => onChange({
                      ...data,
                      target_duration_hours: parseInt(e.target.value) || sprintTimeline.totalDuration
                    })}
                    className="flex-1 border border-gray-300 rounded px-3 py-2"
                    placeholder="Hours"
                  />
                  <span className="text-sm text-gray-500">hours</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Current: {Math.round(sprintTimeline.totalDuration)} hours ({sprintTimeline.totalDays} days)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Posting Pattern
                </label>
                <select className="w-full border border-gray-300 rounded px-3 py-2">
                  <option value="regular">Regular intervals</option>
                  <option value="random">Random variation (±25%)</option>
                  <option value="business">Business hours only</option>
                  <option value="weekend">Weekend heavy</option>
                </select>
              </div>
            </div>

            {/* Time Constraints */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Time Constraints</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-2 text-sm text-gray-600">Business hours only</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-2 text-sm text-gray-600">Avoid weekends</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-2 text-sm text-gray-600">No night posting</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-2 text-sm text-gray-600">Seasonal timing</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Suggestions</h3>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${
                suggestion.severity === 'warning' 
                  ? 'bg-yellow-50 border-yellow-200' 
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    suggestion.severity === 'warning' ? 'bg-yellow-400' : 'bg-blue-400'
                  }`}>
                    <span className="text-white text-xs">
                      {suggestion.severity === 'warning' ? '⚠️' : 'ℹ️'}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className={`text-sm font-medium ${
                    suggestion.severity === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                  }`}>
                    {suggestion.title}
                  </h4>
                  <p className={`text-sm ${
                    suggestion.severity === 'warning' ? 'text-yellow-700' : 'text-blue-700'
                  }`}>
                    {suggestion.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Validation Errors */}
      {!isStepValid && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Scheduling Issues Detected
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <ul className="list-disc pl-5 space-y-1">
                  {contentItems.length === 0 && (
                    <li>Add content items to configure scheduling</li>
                  )}
                  {contentItems.some(item => !item.delay_after_hours || item.delay_after_hours < 1) && (
                    <li>All items must have delay times of at least 1 hour</li>
                  )}
                  {contentItems.some(item => item.delay_after_hours > 168) && (
                    <li>Delay times cannot exceed 168 hours (1 week)</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchedulingStep; 