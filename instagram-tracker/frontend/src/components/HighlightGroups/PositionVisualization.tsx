import React from 'react';
import {
  Eye,
  Star,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { HighlightGroup } from '../../types/highlightGroups';

interface PositionVisualizationProps {
  groups: HighlightGroup[];
  showMetrics?: boolean;
  compact?: boolean;
  highlightChanges?: boolean;
  pendingChanges?: { groupId: number; newPosition: number }[];
}

const PositionVisualization: React.FC<PositionVisualizationProps> = ({
  groups,
  showMetrics = true,
  compact = false,
  highlightChanges = false,
  pendingChanges = []
}) => {
  // Sort groups by current position
  const sortedGroups = [...groups].sort((a, b) => a.current_position - b.current_position);

  // Get position change for a group
  const getPositionChange = (groupId: number) => {
    return pendingChanges.find(change => change.groupId === groupId);
  };

  // Get trend icon based on position change
  const getTrendIcon = (oldPos: number, newPos: number) => {
    if (newPos < oldPos) return <TrendingUp size={12} className="text-green-600" />;
    if (newPos > oldPos) return <TrendingDown size={12} className="text-red-600" />;
    return <Minus size={12} className="text-gray-400" />;
  };

  // Get position circle color
  const getPositionColor = (position: number, hasChange: boolean) => {
    if (hasChange) return 'bg-blue-600 text-white border-blue-600';
    if (position === 1) return 'bg-gold-500 text-white border-gold-500';
    if (position <= 3) return 'bg-green-600 text-white border-green-600';
    if (position <= 6) return 'bg-yellow-500 text-white border-yellow-500';
    return 'bg-gray-400 text-white border-gray-400';
  };

  // Calculate engagement estimate based on position
  const getEngagementEstimate = (position: number) => {
    if (position === 1) return 'Very High';
    if (position <= 3) return 'High';
    if (position <= 6) return 'Medium';
    if (position <= 10) return 'Low';
    return 'Very Low';
  };

  // Get visibility percentage estimate
  const getVisibilityPercentage = (position: number) => {
    if (position === 1) return 95;
    if (position <= 3) return 80;
    if (position <= 6) return 60;
    if (position <= 10) return 35;
    return 15;
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {sortedGroups.slice(0, 6).map((group) => {
          const positionChange = getPositionChange(group.id);
          const hasChange = positionChange !== undefined;

          return (
            <div
              key={group.id}
              className={`flex items-center space-x-3 p-2 rounded-lg ${
                hasChange ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold border-2 ${
                getPositionColor(group.current_position, hasChange)
              }`}>
                {group.current_position}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{group.name}</p>
                <p className="text-xs text-gray-500 capitalize">{group.category}</p>
              </div>
              {hasChange && (
                <div className="flex items-center space-x-1">
                  {getTrendIcon(group.current_position, positionChange.newPosition)}
                  <span className="text-xs text-blue-600 font-medium">
                    #{positionChange.newPosition}
                  </span>
                </div>
              )}
            </div>
          );
        })}
        {sortedGroups.length > 6 && (
          <div className="text-center text-xs text-gray-500 py-2">
            +{sortedGroups.length - 6} more groups
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Eye className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Position Visualization</h3>
            <p className="text-sm text-gray-600">Live preview of highlight group ordering</p>
          </div>
        </div>
        {pendingChanges.length > 0 && (
          <div className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {pendingChanges.length} pending changes
          </div>
        )}
      </div>

      {/* Position Grid */}
      <div className="grid gap-4">
        {sortedGroups.map((group) => {
          const positionChange = getPositionChange(group.id);
          const hasChange = positionChange !== undefined;
          const effectivePosition = hasChange ? positionChange.newPosition : group.current_position;
          const visibilityPercentage = getVisibilityPercentage(effectivePosition);

          return (
            <div
              key={group.id}
              className={`relative p-4 border rounded-lg transition-all ${
                hasChange
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Position and Group Info */}
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-3 ${
                      getPositionColor(effectivePosition, hasChange)
                    }`}>
                      {effectivePosition}
                    </div>
                    {effectivePosition === 1 && (
                      <Star size={16} className="absolute -top-1 -right-1 text-yellow-500" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-base font-semibold text-gray-900">{group.name}</h4>
                      <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
                        {group.category}
                      </span>
                      {!group.is_active && (
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    {group.description && (
                      <p className="text-sm text-gray-600 mb-2">{group.description}</p>
                    )}

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Users size={12} className="mr-1" />
                        {group.content_pool_size} items
                      </span>
                      <span className="flex items-center">
                        <Clock size={12} className="mr-1" />
                        Every {group.maintenance_frequency_weeks}w
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics and Changes */}
                <div className="text-right">
                  {hasChange && (
                    <div className="mb-2">
                      <div className="flex items-center justify-end space-x-2 text-sm">
                        <span className="text-gray-600">
                          #{group.current_position} → #{positionChange.newPosition}
                        </span>
                        {getTrendIcon(group.current_position, positionChange.newPosition)}
                      </div>
                      <p className="text-xs text-blue-600 font-medium">Position Change</p>
                    </div>
                  )}

                  {showMetrics && (
                    <div className="space-y-1">
                      <div className="text-right">
                        <div className="text-sm font-semibold text-gray-900">
                          {visibilityPercentage}% visibility
                        </div>
                        <div className="text-xs text-gray-500">
                          {getEngagementEstimate(effectivePosition)} engagement
                        </div>
                      </div>
                      
                      {/* Visibility Bar */}
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            visibilityPercentage >= 80 ? 'bg-green-500' :
                            visibilityPercentage >= 60 ? 'bg-yellow-500' :
                            visibilityPercentage >= 35 ? 'bg-orange-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${visibilityPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Details for Top Positions */}
              {effectivePosition <= 3 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="font-medium text-gray-700">Priority:</span>
                      <span className="ml-1 text-green-600">
                        {effectivePosition === 1 ? 'Highest' : 'High'}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Content:</span>
                      <span className="ml-1">{group.content_pool_size}/{group.max_content_items}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Next Maintenance:</span>
                      <span className="ml-1">
                        {group.next_maintenance_date 
                          ? new Date(group.next_maintenance_date).toLocaleDateString()
                          : 'Not scheduled'
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      {showMetrics && (
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{sortedGroups.length}</div>
              <div className="text-sm text-gray-600">Total Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {sortedGroups.filter(g => g.current_position <= 3).length}
              </div>
              <div className="text-sm text-gray-600">Top 3 Positions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {sortedGroups.filter(g => g.is_active).length}
              </div>
              <div className="text-sm text-gray-600">Active Groups</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {pendingChanges.length}
              </div>
              <div className="text-sm text-gray-600">Pending Changes</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionVisualization; 