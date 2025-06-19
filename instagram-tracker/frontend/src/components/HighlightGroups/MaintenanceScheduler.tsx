import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Play,
  Pause,
  RefreshCw,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';
import {
  MaintenanceSchedulerProps,
  MaintenanceSchedule,
  MaintenanceConflict,
  HighlightGroupContentItem
} from '../../types/highlightGroups';

const MaintenanceScheduler: React.FC<MaintenanceSchedulerProps> = ({
  group,
  onScheduleUpdate,
  conflicts,
  showConflicts
}) => {
  // State management
  const [schedule, setSchedule] = useState<Partial<MaintenanceSchedule>>({
    highlight_group_id: group.id,
    scheduled_date: '',
    status: 'pending',
    content_items_selected: [],
    position_after_maintenance: group.current_position,
    blocking_conflicts: [],
    override_conflicts: false
  });

  const [availableContent, setAvailableContent] = useState<HighlightGroupContentItem[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Mock available content - would come from API
  useEffect(() => {
    const mockContent: HighlightGroupContentItem[] = [
      {
        id: 1,
        highlight_group_id: group.id,
        file_path: '/content/travel/beach_sunset.jpg',
        file_name: 'beach_sunset.jpg',
        caption: 'Perfect sunset at the beach 🌅',
        seasonal_months: [6, 7, 8],
        usage_count: 2,
        last_used_date: '2025-01-15T00:00:00Z',
        content_batch: 'summer_2024',
        metadata: {
          hashtags: ['#sunset', '#beach', '#travel'],
          location: 'Malibu Beach',
          mood: 'relaxed'
        },
        created_at: '2024-06-01T00:00:00Z'
      },
      {
        id: 2,
        highlight_group_id: group.id,
        file_path: '/content/travel/mountain_hike.jpg',
        file_name: 'mountain_hike.jpg',
        caption: 'Adventure awaits in the mountains ⛰️',
        seasonal_months: [4, 5, 6, 9, 10],
        usage_count: 1,
        last_used_date: '2024-12-20T00:00:00Z',
        content_batch: 'adventure_2024',
        metadata: {
          hashtags: ['#mountains', '#hiking', '#adventure'],
          location: 'Rocky Mountains',
          mood: 'energetic'
        },
        created_at: '2024-04-15T00:00:00Z'
      },
      {
        id: 3,
        highlight_group_id: group.id,
        file_path: '/content/travel/city_lights.jpg',
        file_name: 'city_lights.jpg',
        caption: 'Urban exploration at its finest 🏙️',
        seasonal_months: [1, 2, 3, 4, 11, 12],
        usage_count: 0,
        content_batch: 'urban_2024',
        metadata: {
          hashtags: ['#city', '#urban', '#lights'],
          location: 'New York City',
          mood: 'energetic'
        },
        created_at: '2024-11-01T00:00:00Z'
      }
    ];

    setAvailableContent(mockContent);
  }, [group.id]);

  // Calculate suggested maintenance date
  const getSuggestedDate = useCallback(() => {
    const nextMaintenance = group.next_maintenance_date 
      ? new Date(group.next_maintenance_date) 
      : new Date(Date.now() + group.maintenance_frequency_weeks * 7 * 24 * 60 * 60 * 1000);
    
    return nextMaintenance.toISOString().split('T')[0];
  }, [group.next_maintenance_date, group.maintenance_frequency_weeks]);

  // Initialize suggested date
  useEffect(() => {
    if (!schedule.scheduled_date) {
      setSchedule(prev => ({
        ...prev,
        scheduled_date: getSuggestedDate()
      }));
    }
  }, [getSuggestedDate, schedule.scheduled_date]);

  // Get content recommendations based on usage and season
  const getContentRecommendations = useCallback(() => {
    const currentMonth = new Date().getMonth() + 1;
    
    // Filter content by current season and sort by usage count (least used first)
    const seasonalContent = availableContent.filter(item => 
      item.seasonal_months.includes(currentMonth)
    );

    const sortedContent = seasonalContent.sort((a, b) => {
      // Prioritize unused content
      if (a.usage_count === 0 && b.usage_count > 0) return -1;
      if (b.usage_count === 0 && a.usage_count > 0) return 1;
      
      // Then sort by least used
      return a.usage_count - b.usage_count;
    });

    return sortedContent.slice(0, group.content_per_maintenance);
  }, [availableContent, group.content_per_maintenance]);

  // Auto-select recommended content
  const selectRecommendedContent = () => {
    const recommended = getContentRecommendations();
    setSchedule(prev => ({
      ...prev,
      content_items_selected: recommended.map(item => item.id)
    }));
  };

  // Handle content selection
  const toggleContentSelection = (contentId: number) => {
    setSchedule(prev => ({
      ...prev,
      content_items_selected: prev.content_items_selected?.includes(contentId)
        ? prev.content_items_selected.filter(id => id !== contentId)
        : [...(prev.content_items_selected || []), contentId]
    }));
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get conflict severity color
  const getConflictColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  // Handle schedule submission
  const handleScheduleSubmit = () => {
    if (!schedule.scheduled_date || !schedule.content_items_selected?.length) {
      return;
    }

    onScheduleUpdate(schedule);
  };

  // Get selected content details
  const selectedContent = availableContent.filter(item => 
    schedule.content_items_selected?.includes(item.id)
  );

  const recommendations = getContentRecommendations();

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Calendar className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Maintenance Scheduler</h3>
            <p className="text-sm text-gray-600">Schedule content refresh for {group.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className={`p-2 rounded-lg ${previewMode ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
            title={previewMode ? 'Exit Preview' : 'Preview Changes'}
          >
            {previewMode ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
            title="Advanced Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      {/* Schedule Configuration */}
      <div className="space-y-6">
        {/* Basic Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date & Time
            </label>
            <input
              type="datetime-local"
              value={schedule.scheduled_date}
              onChange={(e) => setSchedule(prev => ({ ...prev, scheduled_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Suggested: {formatDate(getSuggestedDate())}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Items to Replace
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="1"
                max="5"
                value={schedule.content_items_selected?.length || 0}
                readOnly
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <span className="text-sm text-gray-600">items selected</span>
              <button
                onClick={selectRecommendedContent}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Auto-select
              </button>
            </div>
          </div>
        </div>

        {/* Content Selection */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-900">Select Content for Replacement</h4>
            <span className="text-xs text-gray-500">
              {schedule.content_items_selected?.length || 0} of {group.content_per_maintenance} selected
            </span>
          </div>

          {/* Content Recommendations */}
          {recommendations.length > 0 && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <div className="ml-2">
                  <h5 className="text-sm font-medium text-green-800">Recommended Content</h5>
                  <p className="text-xs text-green-700 mt-1">
                    Based on season, usage history, and performance
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recommendations.map(item => (
                      <span key={item.id} className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        {item.file_name} (used {item.usage_count}x)
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Available Content Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-64 overflow-y-auto border rounded-lg p-3">
            {availableContent.map(item => {
              const isSelected = schedule.content_items_selected?.includes(item.id);
              const isRecommended = recommendations.some(r => r.id === item.id);
              
              return (
                <div
                  key={item.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : isRecommended
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => toggleContentSelection(item.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.file_name}
                    </span>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // Handled by div onClick
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-xs text-gray-600 mb-2 truncate">{item.caption}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Used {item.usage_count}x</span>
                    {isRecommended && (
                      <span className="text-green-600 font-medium">Recommended</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    {item.metadata.mood} • {item.metadata.location}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Advanced Settings */}
        {showAdvanced && (
          <div className="border-t pt-6 space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Advanced Settings</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Position After Maintenance
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={schedule.position_after_maintenance}
                  onChange={(e) => setSchedule(prev => ({ 
                    ...prev, 
                    position_after_maintenance: parseInt(e.target.value) || group.current_position 
                  }))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Current position: #{group.current_position}
                </p>
              </div>

              <div>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={schedule.override_conflicts || false}
                    onChange={(e) => setSchedule(prev => ({ ...prev, override_conflicts: e.target.checked }))}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium">Override conflict warnings</span>
                </label>
                <p className="text-xs text-gray-500 ml-6 mt-1">
                  Proceed with maintenance even if conflicts are detected
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Conflicts Display */}
        {showConflicts && conflicts.length > 0 && (
          <div className="border-t pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Detected Conflicts</h4>
            <div className="space-y-3">
              {conflicts.map(conflict => (
                <div
                  key={conflict.id}
                  className={`p-3 border rounded-lg ${getConflictColor(conflict.severity)}`}
                >
                  <div className="flex items-start">
                    <AlertTriangle className="h-4 w-4 mt-0.5 mr-2" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{conflict.message}</p>
                      {conflict.resolution_suggestions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium">Suggestions:</p>
                          <ul className="text-xs mt-1 list-disc list-inside">
                            {conflict.resolution_suggestions.map((suggestion, index) => (
                              <li key={index}>{suggestion}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preview Mode */}
        {previewMode && selectedContent.length > 0 && (
          <div className="border-t pt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Maintenance Preview</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Scheduled for:</p>
                  <p className="text-gray-600">{formatDate(schedule.scheduled_date || '')}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Content to replace:</p>
                  <p className="text-gray-600">{selectedContent.length} items</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">New position:</p>
                  <p className="text-gray-600">#{schedule.position_after_maintenance}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-700">Estimated impact:</p>
                  <p className="text-gray-600">
                    {conflicts.length > 0 ? 'May cause conflicts' : 'No issues detected'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div className="text-sm text-gray-500">
            {schedule.content_items_selected?.length || 0} of {group.content_per_maintenance} items selected
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setSchedule(prev => ({ ...prev, scheduled_date: getSuggestedDate() }));
                selectRecommendedContent();
              }}
              className="btn-secondary flex items-center space-x-2"
            >
              <RefreshCw size={16} />
              <span>Reset to Defaults</span>
            </button>
            
            <button
              onClick={handleScheduleSubmit}
              disabled={!schedule.scheduled_date || !schedule.content_items_selected?.length}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                !schedule.scheduled_date || !schedule.content_items_selected?.length
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Calendar size={16} />
              <span>Schedule Maintenance</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceScheduler; 