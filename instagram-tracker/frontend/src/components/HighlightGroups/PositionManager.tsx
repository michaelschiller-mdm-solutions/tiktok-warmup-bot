import React, { useState, useEffect, useCallback } from 'react';
import {
  Move,
  GripVertical,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Target,
  Users,
  Clock
} from 'lucide-react';
import {
  PositionManagerProps,
  HighlightGroup,
  PositionManagement,
  PositionUpdateRequest
} from '../../types/highlightGroups';

interface DraggedItem {
  groupId: number;
  startPosition: number;
  currentPosition: number;
}

interface PositionConflict {
  groupId: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
  affectedAccounts: number[];
}

const PositionManager: React.FC<PositionManagerProps> = ({
  groups,
  positionData,
  onPositionChange,
  previewMode = false
}) => {
  // State management
  const [sortedGroups, setSortedGroups] = useState<HighlightGroup[]>([]);
  const [draggedItem, setDraggedItem] = useState<DraggedItem | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewModeActive, setPreviewModeActive] = useState(previewMode);
  const [pendingChanges, setPendingChanges] = useState<{ groupId: number; newPosition: number }[]>([]);
  const [conflicts, setConflicts] = useState<PositionConflict[]>([]);
  const [originalPositions, setOriginalPositions] = useState<{ groupId: number; position: number }[]>([]);

  // Initialize sorted groups and original positions
  useEffect(() => {
    const sorted = [...groups].sort((a, b) => a.current_position - b.current_position);
    setSortedGroups(sorted);
    setOriginalPositions(sorted.map(group => ({ groupId: group.id, position: group.current_position })));
  }, [groups]);

  // Detect position conflicts
  const detectConflicts = useCallback((positions: { groupId: number; position: number }[]) => {
    const conflicts: PositionConflict[] = [];
    
    // Check for duplicate positions
    const positionCounts = new Map<number, number[]>();
    positions.forEach(({ groupId, position }) => {
      if (!positionCounts.has(position)) {
        positionCounts.set(position, []);
      }
      positionCounts.get(position)!.push(groupId);
    });

    positionCounts.forEach((groupIds, position) => {
      if (groupIds.length > 1) {
        conflicts.push({
          groupId: groupIds[0],
          message: `Position ${position} is occupied by ${groupIds.length} groups`,
          severity: 'high',
          affectedAccounts: [1, 2, 3] // Mock affected accounts
        });
      }
    });

    // Check for position gaps
    const sortedPositions = Array.from(positionCounts.keys()).sort((a, b) => a - b);
    for (let i = 1; i < sortedPositions.length; i++) {
      if (sortedPositions[i] - sortedPositions[i - 1] > 1) {
        const gapSize = sortedPositions[i] - sortedPositions[i - 1] - 1;
        if (gapSize > 2) {
          conflicts.push({
            groupId: 0,
            message: `Large gap between positions ${sortedPositions[i - 1]} and ${sortedPositions[i]}`,
            severity: 'medium',
            affectedAccounts: []
          });
        }
      }
    }

    setConflicts(conflicts);
  }, []);

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, group: HighlightGroup) => {
    setDraggedItem({
      groupId: group.id,
      startPosition: group.current_position,
      currentPosition: group.current_position
    });
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem && draggedItem.currentPosition !== targetPosition) {
      setDraggedItem(prev => prev ? { ...prev, currentPosition: targetPosition } : null);
      
      // Update sorted groups for visual feedback
      const newSorted = [...sortedGroups];
      const draggedIndex = newSorted.findIndex(g => g.id === draggedItem.groupId);
      const targetIndex = newSorted.findIndex(g => g.current_position === targetPosition);
      
      if (draggedIndex !== -1 && targetIndex !== -1) {
        const [draggedGroup] = newSorted.splice(draggedIndex, 1);
        newSorted.splice(targetIndex, 0, draggedGroup);
        
        // Update positions temporarily for preview
        newSorted.forEach((group, index) => {
          group.current_position = index + 1;
        });
        
        setSortedGroups(newSorted);
      }
    }
  };

  // Handle drop
  const handleDrop = (e: React.DragEvent, targetPosition: number) => {
    e.preventDefault();
    
    if (draggedItem) {
      const newPosition = targetPosition;
      
      // Add to pending changes
      setPendingChanges(prev => {
        const filtered = prev.filter(change => change.groupId !== draggedItem.groupId);
        return [...filtered, { groupId: draggedItem.groupId, newPosition }];
      });
      
      // Check for conflicts
      const allPositions = sortedGroups.map(group => ({
        groupId: group.id,
        position: group.id === draggedItem.groupId ? newPosition : group.current_position
      }));
      detectConflicts(allPositions);
    }
    
    setDraggedItem(null);
    setIsDragging(false);
  };

  // Handle position change with buttons
  const movePosition = (groupId: number, direction: 'up' | 'down') => {
    const group = sortedGroups.find(g => g.id === groupId);
    if (!group) return;
    
    const newPosition = direction === 'up' 
      ? Math.max(1, group.current_position - 1)
      : Math.min(sortedGroups.length, group.current_position + 1);
    
    if (newPosition !== group.current_position) {
      // Add to pending changes
      setPendingChanges(prev => {
        const filtered = prev.filter(change => change.groupId !== groupId);
        return [...filtered, { groupId, newPosition }];
      });
      
      // Update sorted groups
      const newSorted = [...sortedGroups];
      const currentIndex = newSorted.findIndex(g => g.id === groupId);
      const targetIndex = newSorted.findIndex(g => g.current_position === newPosition);
      
      if (currentIndex !== -1 && targetIndex !== -1) {
        // Swap positions
        [newSorted[currentIndex], newSorted[targetIndex]] = [newSorted[targetIndex], newSorted[currentIndex]];
        newSorted[currentIndex].current_position = newPosition;
        newSorted[targetIndex].current_position = group.current_position;
        
        setSortedGroups(newSorted.sort((a, b) => a.current_position - b.current_position));
      }
    }
  };

  // Reset to original positions
  const resetPositions = () => {
    const resetGroups = [...groups].map(group => {
      const original = originalPositions.find(op => op.groupId === group.id);
      return { ...group, current_position: original?.position || group.current_position };
    }).sort((a, b) => a.current_position - b.current_position);
    
    setSortedGroups(resetGroups);
    setPendingChanges([]);
    setConflicts([]);
  };

  // Apply changes
  const applyChanges = async () => {
    if (pendingChanges.length === 0) return;
    
    try {
      for (const change of pendingChanges) {
        await onPositionChange(change.groupId, change.newPosition);
      }
      
      // Update original positions
      setOriginalPositions(sortedGroups.map(group => ({ 
        groupId: group.id, 
        position: group.current_position 
      })));
      
      setPendingChanges([]);
      setConflicts([]);
    } catch (error) {
      console.error('Failed to apply position changes:', error);
    }
  };

  // Get position change for a group
  const getPositionChange = (groupId: number) => {
    return pendingChanges.find(change => change.groupId === groupId);
  };

  // Get conflict severity color
  const getConflictColor = (severity: 'high' | 'medium' | 'low') => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Target className="h-6 w-6 text-purple-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Position Manager</h3>
            <p className="text-sm text-gray-600">Manage highlight group positions and ordering</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setPreviewModeActive(!previewModeActive)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${
              previewModeActive
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {previewModeActive ? <EyeOff size={16} /> : <Eye size={16} />}
            <span>{previewModeActive ? 'Exit Preview' : 'Preview Mode'}</span>
          </button>
          
          {pendingChanges.length > 0 && (
            <>
              <button
                onClick={resetPositions}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                <RotateCcw size={16} />
                <span>Reset</span>
              </button>
              
              <button
                onClick={applyChanges}
                className={`flex items-center space-x-2 px-4 py-2 text-sm rounded-lg ${
                  conflicts.filter(c => c.severity === 'high').length > 0
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Save size={16} />
                <span>Apply Changes ({pendingChanges.length})</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Conflicts Display */}
      {conflicts.length > 0 && (
        <div className="mb-6 space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Position Conflicts</h4>
          {conflicts.map((conflict, index) => (
            <div
              key={index}
              className={`p-3 border rounded-lg ${getConflictColor(conflict.severity)}`}
            >
              <div className="flex items-start">
                <AlertTriangle className="h-4 w-4 mt-0.5 mr-2" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{conflict.message}</p>
                  {conflict.affectedAccounts.length > 0 && (
                    <p className="text-xs mt-1">
                      Affects {conflict.affectedAccounts.length} account(s)
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Position Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Highlight Group Positions</h4>
          <div className="text-xs text-gray-500">
            Drag and drop or use arrows to reorder • {sortedGroups.length} groups
          </div>
        </div>

        <div className="grid gap-3">
          {sortedGroups.map((group, index) => {
            const positionChange = getPositionChange(group.id);
            const hasChanges = positionChange !== undefined;
            const isFirst = index === 0;
            const isLast = index === sortedGroups.length - 1;

            return (
              <div
                key={group.id}
                draggable
                onDragStart={(e) => handleDragStart(e, group)}
                onDragOver={(e) => handleDragOver(e, group.current_position)}
                onDrop={(e) => handleDrop(e, group.current_position)}
                className={`relative p-4 border rounded-lg cursor-move transition-all ${
                  hasChanges
                    ? 'border-blue-500 bg-blue-50'
                    : isDragging && draggedItem?.groupId === group.id
                    ? 'border-dashed border-gray-400 opacity-50'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Drag Handle */}
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <GripVertical className="h-5 w-5 text-gray-400" />
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                        hasChanges
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {group.current_position}
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-medium text-gray-900">{group.name}</h5>
                        <span className="text-xs text-gray-500 capitalize bg-gray-100 px-2 py-1 rounded">
                          {group.category}
                        </span>
                        {!group.is_active && (
                          <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center space-x-4">
                        <span className="flex items-center">
                          <Users size={12} className="mr-1" />
                          {group.content_pool_size}/{group.max_content_items} content
                        </span>
                        <span className="flex items-center">
                          <Clock size={12} className="mr-1" />
                          Every {group.maintenance_frequency_weeks}w
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Position Controls */}
                  <div className="flex items-center space-x-2">
                    {hasChanges && (
                      <div className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {positionChange.newPosition > group.current_position ? '↓' : '↑'} 
                        Position {positionChange.newPosition}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => movePosition(group.id, 'up')}
                        disabled={isFirst}
                        className={`p-1 rounded ${
                          isFirst
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      
                      <button
                        onClick={() => movePosition(group.id, 'down')}
                        disabled={isLast}
                        className={`p-1 rounded ${
                          isLast
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Mode Information */}
                {previewModeActive && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
                      <div>
                        <span className="font-medium">Content:</span>
                        <span className="ml-1">{group.content_pool_size} items</span>
                      </div>
                      <div>
                        <span className="font-medium">Maintenance:</span>
                        <span className="ml-1">
                          {group.next_maintenance_date 
                            ? new Date(group.next_maintenance_date).toLocaleDateString()
                            : 'Not scheduled'
                          }
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Blocks:</span>
                        <span className="ml-1">
                          {group.blocks_sprint_types.length + group.blocks_highlight_groups.length} rules
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Impact:</span>
                        <span className="ml-1 text-green-600">No conflicts</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-6">
            <span className="text-gray-600">
              <span className="font-medium">{sortedGroups.length}</span> highlight groups
            </span>
            <span className="text-gray-600">
              <span className="font-medium">{sortedGroups.filter(g => g.is_active).length}</span> active
            </span>
            {pendingChanges.length > 0 && (
              <span className="text-blue-600">
                <span className="font-medium">{pendingChanges.length}</span> pending changes
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {conflicts.length > 0 && (
              <span className="flex items-center text-yellow-600">
                <AlertTriangle size={14} className="mr-1" />
                {conflicts.length} conflicts
              </span>
            )}
            <span className="flex items-center text-green-600">
              <CheckCircle size={14} className="mr-1" />
              Positions ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PositionManager; 