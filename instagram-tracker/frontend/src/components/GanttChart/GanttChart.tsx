import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  User, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Square, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  Maximize2,
  Copy,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle2,
  Loader
} from 'lucide-react';
import type { 
  GanttChartProps, 
  GanttFilters, 
  TimelineData, 
  ZoomLevel,
  GanttTooltipData,
  AccountTimelineRow,
  AssignmentBar,
  ConflictIndicator
} from '../../types/ganttChart';
import type { Account } from '../../types/accounts';
import type { SprintContentItem } from '../../types/sprintCreation';
import { VirtualizedGantt } from './VirtualizedGantt';
import { GanttTooltip } from './GanttTooltip';
import { apiClient } from '../../services/api';

// Enhanced zoom level configurations
const ZOOM_LEVELS: ZoomLevel[] = [
  { level: 'hour', pixelsPerDay: 480, majorTickInterval: 0.25, minorTickInterval: 0.125, label: 'Hourly' },
  { level: 'day', pixelsPerDay: 200, majorTickInterval: 1, minorTickInterval: 0.5, label: 'Daily' },
  { level: 'week', pixelsPerDay: 60, majorTickInterval: 7, minorTickInterval: 1, label: 'Weekly' },
  { level: 'month', pixelsPerDay: 20, majorTickInterval: 30, minorTickInterval: 7, label: 'Monthly' },
  { level: 'quarter', pixelsPerDay: 6, majorTickInterval: 90, minorTickInterval: 30, label: 'Quarterly' }
];

// Professional color system
const SPRINT_COLORS = {
  vacation: { bg: '#ecfdf5', border: '#10b981', text: '#065f46', dot: '#059669' },
  fitness: { bg: '#fef2f2', border: '#ef4444', text: '#7f1d1d', dot: '#dc2626' },
  lifestyle: { bg: '#f3f4f6', border: '#6b7280', text: '#374151', dot: '#4b5563' },
  work: { bg: '#eff6ff', border: '#3b82f6', text: '#1e3a8a', dot: '#2563eb' },
  university: { bg: '#faf5ff', border: '#8b5cf6', text: '#581c87', dot: '#7c3aed' },
  default: { bg: '#f8fafc', border: '#64748b', text: '#334155', dot: '#475569' }
};

const STATUS_COLORS = {
  active: { bg: '#dcfce7', border: '#16a34a', text: '#15803d', icon: CheckCircle2 },
  scheduled: { bg: '#dbeafe', border: '#2563eb', text: '#1d4ed8', icon: Clock },
  paused: { bg: '#fef3c7', border: '#d97706', text: '#92400e', icon: Pause },
  completed: { bg: '#f3f4f6', border: '#6b7280', text: '#374151', icon: CheckCircle2 },
  cancelled: { bg: '#fee2e2', border: '#dc2626', text: '#991b1b', icon: Square }
};

export const GanttChart: React.FC<GanttChartProps> = ({
  accounts,
  sprints,
  assignments,
  dateRange,
  zoomLevel = 'week',
  filters,
  onSprintClick,
  onAccountClick,
  onAssignmentAction,
  className = ''
}) => {
  // Enhanced state management
  const [currentZoomLevel, setCurrentZoomLevel] = useState<ZoomLevel>(
    ZOOM_LEVELS.find(z => z.level === zoomLevel) || ZOOM_LEVELS[2]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [selectedAssignments, setSelectedAssignments] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    assignmentId: number | null;
    startX: number;
    originalLeft: number;
  }>({ isDragging: false, assignmentId: null, startX: 0, originalLeft: 0 });
  const [hoveredAssignment, setHoveredAssignment] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    assignmentId: number | null;
  }>({ visible: false, x: 0, y: 0, assignmentId: null });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: any;
  }>({ visible: false, x: 0, y: 0, content: null });
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const [showFilters, setShowFilters] = useState(false);
  const [timelineFilters, setTimelineFilters] = useState({
    status: 'all',
    sprintType: 'all',
    dateRange: 'all'
  });

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Constants
  const ACCOUNT_SIDEBAR_WIDTH = 320;
  const ROW_HEIGHT = 72;
  const HEADER_HEIGHT = 80;
  const PIXELS_PER_DAY = currentZoomLevel.pixelsPerDay;

  // Calculate timeline dimensions
  const timelineWidth = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return 1000;
    const days = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(days * PIXELS_PER_DAY, 1000);
  }, [dateRange, PIXELS_PER_DAY]);

  // Generate timeline markers
  const timelineMarkers = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return { major: [] as Array<{x: number; date: Date; label: string}>, minor: [] as Array<{x: number; date: Date}> };
    
    const markers: {
      major: Array<{x: number; date: Date; label: string}>;
      minor: Array<{x: number; date: Date}>;
    } = { major: [], minor: [] };
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Major markers (weeks for daily view, months for weekly view, etc.)
    const majorInterval = currentZoomLevel.majorTickInterval;
    for (let i = 0; i <= totalDays; i += majorInterval) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const x = i * PIXELS_PER_DAY;
      
      markers.major.push({
        x,
        date,
        label: currentZoomLevel.level === 'day' 
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : currentZoomLevel.level === 'week'
          ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      });
    }
    
    // Minor markers
    const minorInterval = currentZoomLevel.minorTickInterval;
    for (let i = 0; i <= totalDays; i += minorInterval) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const x = i * PIXELS_PER_DAY;
      markers.minor.push({ x, date });
    }
    
    return markers;
  }, [dateRange, currentZoomLevel, PIXELS_PER_DAY]);

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    return accounts.filter(account => {
      const matchesSearch = searchQuery === '' || 
        account.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        account.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [accounts, searchQuery]);

  // Get current time indicator position
  const currentTimePosition = useMemo(() => {
    if (!dateRange.start) return -1;
    const now = new Date();
    const daysSinceStart = (now.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceStart * PIXELS_PER_DAY;
  }, [dateRange.start, PIXELS_PER_DAY]);

  // Enhanced zoom controls
  const handleZoomIn = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z.level === currentZoomLevel.level);
    if (currentIndex > 0) {
      setCurrentZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
    }
  }, [currentZoomLevel]);

  const handleZoomOut = useCallback(() => {
    const currentIndex = ZOOM_LEVELS.findIndex(z => z.level === currentZoomLevel.level);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setCurrentZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
    }
  }, [currentZoomLevel]);

  // Scroll to today
  const scrollToToday = useCallback(() => {
    if (!dateRange.start || currentTimePosition < 0) return;
    
    const container = scrollContainerRef.current;
    if (container) {
      const centerPosition = currentTimePosition - (container.clientWidth / 2);
      container.scrollLeft = Math.max(0, centerPosition);
    }
  }, [currentTimePosition, dateRange.start]);

  // Enhanced assignment click with multi-select
  const handleAssignmentClick = useCallback((assignmentId: number, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (event.ctrlKey || event.metaKey) {
      setSelectedAssignments(prev => {
        const newSet = new Set(prev);
        if (newSet.has(assignmentId)) {
          newSet.delete(assignmentId);
        } else {
          newSet.add(assignmentId);
        }
        return newSet;
      });
    } else if (event.shiftKey && selectedAssignments.size > 0) {
      // Implement range selection logic here
    } else {
      setSelectedAssignments(new Set([assignmentId]));
    }
  }, [selectedAssignments]);

  // Context menu handler
  const handleContextMenu = useCallback((event: React.MouseEvent, assignmentId: number) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      assignmentId
    });
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: React.MouseEvent, assignmentId: number) => {
    if (event.button !== 0) return; // Only left mouse button
    
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setDragState({
      isDragging: true,
      assignmentId,
      startX: event.clientX,
      originalLeft: rect.left
    });
  }, []);

  const handleDragMove = useCallback((event: MouseEvent) => {
    if (!dragState.isDragging) return;
    
    const deltaX = event.clientX - dragState.startX;
    const newLeft = dragState.originalLeft + deltaX;
    
    // Update assignment position (this would trigger a callback to parent)
    console.log('Dragging assignment', dragState.assignmentId, 'to position', newLeft);
  }, [dragState]);

  const handleDragEnd = useCallback(() => {
    if (!dragState.isDragging) return;
    
    setDragState({
      isDragging: false,
      assignmentId: null,
      startX: 0,
      originalLeft: 0
    });
  }, [dragState]);

  // Global event listeners for drag and drop
  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [dragState.isDragging, handleDragMove, handleDragEnd]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft -= 100;
          }
          break;
        case 'ArrowRight':
          event.preventDefault();
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollLeft += 100;
          }
          break;
        case '=':
        case '+':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            handleZoomOut();
          }
          break;
        case 't':
          event.preventDefault();
          scrollToToday();
          break;
        case 'Escape':
          setSelectedAssignments(new Set());
          setContextMenu({ visible: false, x: 0, y: 0, assignmentId: null });
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut, scrollToToday]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu({ visible: false, x: 0, y: 0, assignmentId: null });
    if (contextMenu.visible) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu.visible]);

  return (
    <div 
      ref={containerRef}
      className={`gantt-chart relative bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${className}`}
    >
      {/* Enhanced Header */}
      <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Content Timeline</h2>
              <p className="text-sm text-gray-500">
                {filteredAccounts.length} accounts • {assignments.length} assignments
              </p>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 border rounded-lg text-sm font-medium transition-all ${
                showFilters 
                  ? 'bg-blue-50 border-blue-300 text-blue-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter size={16} />
              <span>Filters</span>
            </button>
          </div>

          {/* Zoom and View Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center border border-gray-300 rounded-lg bg-white">
              <button
                onClick={handleZoomOut}
                disabled={currentZoomLevel.level === 'quarter'}
                className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Zoom Out (Ctrl + -)"
              >
                <ZoomOut size={16} />
              </button>
              <div className="px-3 py-2 text-sm border-x border-gray-300 min-w-20 text-center">
                {currentZoomLevel.label}
              </div>
              <button
                onClick={handleZoomIn}
                disabled={currentZoomLevel.level === 'hour'}
                className="p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Zoom In (Ctrl + +)"
              >
                <ZoomIn size={16} />
              </button>
            </div>
            
            <button
              onClick={scrollToToday}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              title="Go to Today (T)"
            >
              <Calendar size={16} />
              <span>Today</span>
            </button>
            
            <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Status:</label>
                <select 
                  value={timelineFilters.status}
                  onChange={(e) => setTimelineFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Sprint Type:</label>
                <select 
                  value={timelineFilters.sprintType}
                  onChange={(e) => setTimelineFilters(prev => ({ ...prev, sprintType: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="vacation">Vacation</option>
                  <option value="fitness">Fitness</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="work">Work</option>
                  <option value="university">University</option>
                </select>
              </div>

              {selectedAssignments.size > 0 && (
                <div className="flex items-center space-x-2 ml-auto">
                  <span className="text-sm text-gray-600">
                    {selectedAssignments.size} selected
                  </span>
                  <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors">
                    Bulk Edit
                  </button>
                  <button className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors">
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Timeline Header */}
      <div className="flex border-b border-gray-200">
        {/* Account Header */}
        <div 
          className="flex-shrink-0 bg-gray-50 border-r border-gray-200 px-4 py-3 flex items-center justify-between"
          style={{ width: ACCOUNT_SIDEBAR_WIDTH }}
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Accounts</h3>
            <p className="text-xs text-gray-500 mt-1">{filteredAccounts.length} accounts</p>
          </div>
          <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
            <Settings size={14} />
          </button>
        </div>
        
        {/* Timeline Header with Markers */}
        <div 
          className="flex-1 bg-gray-50 relative overflow-hidden"
          style={{ height: HEADER_HEIGHT }}
        >
          <div 
            ref={timelineRef}
            className="relative h-full"
            style={{ width: timelineWidth }}
          >
            {/* Timeline Scale */}
            <div className="absolute inset-0">
              {/* Minor tick marks */}
              {timelineMarkers.minor.map((marker, index) => (
                <div
                  key={`minor-${index}`}
                  className="absolute top-0 w-px bg-gray-300"
                  style={{ left: marker.x, height: '20px' }}
                />
              ))}
              
              {/* Major tick marks and labels */}
              {timelineMarkers.major.map((marker, index) => (
                <div
                  key={`major-${index}`}
                  className="absolute top-0"
                  style={{ left: marker.x }}
                >
                  <div className="w-px bg-gray-400 h-8" />
                  <div className="absolute top-8 left-0 transform -translate-x-1/2 text-xs font-medium text-gray-700 whitespace-nowrap">
                    {marker.label}
                  </div>
                </div>
              ))}
              
              {/* Current time indicator */}
              {currentTimePosition >= 0 && currentTimePosition <= timelineWidth && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                  style={{ left: currentTimePosition }}
                >
                  <div className="absolute top-0 left-0 transform -translate-x-1/2 w-3 h-3 bg-red-500 rounded-full" />
                  <div className="absolute top-4 left-0 transform -translate-x-1/2 text-xs font-medium text-red-600 whitespace-nowrap">
                    Now
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex" style={{ height: '500px' }}>
        {/* Account List Sidebar */}
        <div 
          className="flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-white"
          style={{ width: ACCOUNT_SIDEBAR_WIDTH }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader className="animate-spin text-gray-400" size={24} />
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No accounts found
            </div>
          ) : (
            filteredAccounts.map((account, index) => {
              const accountAssignments = assignments.filter(a => a.account_id === account.id);
              const isSelected = selectedAccountId === account.id;
              
              return (
                <div
                  key={account.id}
                  className={`group flex items-center px-4 py-3 border-b border-gray-100 cursor-pointer transition-all ${
                    isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  style={{ height: ROW_HEIGHT }}
                  onClick={() => setSelectedAccountId(isSelected ? null : account.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      {/* Enhanced Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-sm ${
                        account.status === 'active' ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        {account.username.charAt(0).toUpperCase()}
                      </div>
                      
                      {/* Account Info - Responsive layout */}
                      <div className="flex-1 min-w-0">
                        {/* Full layout for wide sidebar (>250px) */}
                        {ACCOUNT_SIDEBAR_WIDTH > 250 && (
                          <>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {account.display_name || account.username}
                              </p>
                              {accountAssignments.some(a => a.status === 'active') && (
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              @{account.username}
                            </p>
                            <div className="flex items-center justify-between mt-0.5">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                STATUS_COLORS[account.status as keyof typeof STATUS_COLORS]?.bg || 'bg-gray-100'
                              } ${
                                STATUS_COLORS[account.status as keyof typeof STATUS_COLORS]?.text || 'text-gray-800'
                              }`}>
                                {account.status}
                              </span>
                              {ACCOUNT_SIDEBAR_WIDTH > 300 && (
                                <span className="text-xs text-gray-400 capitalize">{account.location}</span>
                              )}
                            </div>
                          </>
                        )}
                        
                        {/* Compact layout for narrow sidebar (≤250px) */}
                        {ACCOUNT_SIDEBAR_WIDTH <= 250 && (
                          <>
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {(account.display_name || account.username).length > 15 
                                  ? `${(account.display_name || account.username).substring(0, 15)}...`
                                  : (account.display_name || account.username)
                                }
                              </p>
                              {accountAssignments.some(a => a.status === 'active') && (
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                STATUS_COLORS[account.status as keyof typeof STATUS_COLORS]?.bg || 'bg-gray-100'
                              } ${
                                STATUS_COLORS[account.status as keyof typeof STATUS_COLORS]?.text || 'text-gray-800'
                              }`}>
                                {account.status}
                              </span>
                              <span className="text-xs text-gray-500">{accountAssignments.length}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Assignment Summary - Only show for wide sidebar and compact layout */}
                    {ACCOUNT_SIDEBAR_WIDTH > 280 && (
                      <div className="mt-0.5 flex items-center justify-between">
                        <div className="flex items-center space-x-1 text-xs text-gray-500">
                          <span>{accountAssignments.length}</span>
                          {accountAssignments.some(a => a.status === 'active') && (
                            <span className="text-green-600 font-medium">•</span>
                          )}
                        </div>
                        <button className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors opacity-0 group-hover:opacity-100">
                          <MoreHorizontal size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Timeline Area */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 relative overflow-auto bg-gray-50"
          onScroll={(e) => {
            const target = e.target as HTMLDivElement;
            setScrollPosition({ x: target.scrollLeft, y: target.scrollTop });
            
            // Sync timeline header scroll
            if (timelineRef.current) {
              timelineRef.current.style.transform = `translateX(-${target.scrollLeft}px)`;
            }
          }}
        >
          <div 
            className="relative"
            style={{ 
              width: timelineWidth,
              height: filteredAccounts.length * ROW_HEIGHT,
              minHeight: '200px'
            }}
          >
            {/* Grid Background */}
            <div className="absolute inset-0">
              {/* Horizontal grid lines */}
              {filteredAccounts.map((_, index) => (
                <div
                  key={index}
                  className="absolute w-full border-b border-gray-200"
                  style={{
                    top: index * ROW_HEIGHT,
                    height: ROW_HEIGHT
                  }}
                />
              ))}
              
              {/* Vertical grid lines (major markers) */}
              {timelineMarkers.major.map((marker, index) => (
                <div
                  key={`grid-${index}`}
                  className="absolute top-0 bottom-0 w-px bg-gray-200"
                  style={{ left: marker.x }}
                />
              ))}
            </div>
            
            {/* Assignment Bars */}
            {filteredAccounts.map((account, accountIndex) => {
              const accountAssignments = assignments.filter(a => a.account_id === account.id);
              
              return (
                <div
                  key={account.id}
                  className="absolute w-full"
                  style={{
                    top: accountIndex * ROW_HEIGHT,
                    height: ROW_HEIGHT
                  }}
                >
                  {accountAssignments.map((assignment) => {
                    const sprint = sprints.find(s => s.id === assignment.sprint_id);
                    if (!sprint || !assignment.start_date || !assignment.end_date) return null;

                    const assignmentStart = new Date(assignment.start_date);
                    const assignmentEnd = new Date(assignment.end_date);
                    const timelineStart = dateRange.start || new Date();
                    
                    const daysSinceStart = Math.floor(
                      (assignmentStart.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const durationDays = Math.floor(
                      (assignmentEnd.getTime() - assignmentStart.getTime()) / (1000 * 60 * 60 * 24)
                    );
                    
                    const left = Math.max(0, daysSinceStart * PIXELS_PER_DAY);
                    const width = Math.max(20, durationDays * PIXELS_PER_DAY);
                    
                    const sprintColor = SPRINT_COLORS[sprint.sprint_type as keyof typeof SPRINT_COLORS] || SPRINT_COLORS.default;
                    const statusColor = STATUS_COLORS[assignment.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.active;
                    const isSelected = selectedAssignments.has(assignment.id);
                    const isHovered = hoveredAssignment === assignment.id;

                    return (
                      <div
                        key={assignment.id}
                        className={`absolute rounded-lg cursor-pointer transition-all duration-200 group ${
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-2 z-20' : 'z-10'
                        } ${isHovered ? 'shadow-md transform scale-[1.02]' : 'shadow-sm hover:shadow-md'}`}
                        style={{
                          left: left + 8,
                          top: (ROW_HEIGHT - (ROW_HEIGHT - 32)) / 2,
                          width: width - 16,
                          height: ROW_HEIGHT - 32,
                          backgroundColor: sprintColor.bg,
                          border: `2px solid ${sprintColor.border}`
                        }}
                        onClick={(e) => handleAssignmentClick(assignment.id, e)}
                        onContextMenu={(e) => handleContextMenu(e, assignment.id)}
                        onMouseDown={(e) => handleDragStart(e, assignment.id)}
                        onMouseEnter={(e) => {
                          setHoveredAssignment(assignment.id);
                          // Enhanced tooltip
                          setTooltip({
                            visible: true,
                            x: e.clientX,
                            y: e.clientY,
                            content: {
                              sprint,
                              assignment,
                              progress: `${((assignment.current_content_index || 0) / 10) * 100}%`,
                              duration: `${durationDays} days`,
                              startDate: assignmentStart.toLocaleDateString(),
                              endDate: assignmentEnd.toLocaleDateString()
                            }
                          });
                        }}
                        onMouseLeave={() => {
                          setHoveredAssignment(null);
                          setTooltip({ visible: false, x: 0, y: 0, content: null });
                        }}
                        title={`${sprint.name} (${assignment.status})`}
                      >
                        {/* Gradient background for visual depth */}
                        <div 
                          className="absolute inset-0 rounded-lg opacity-10"
                          style={{
                            background: `linear-gradient(135deg, ${sprintColor.border}, transparent)`
                          }}
                        />
                        
                        {/* Left accent border */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                          style={{ backgroundColor: sprintColor.border }}
                        />
                        
                        {/* Content with responsive layout based on width */}
                        <div className="relative px-2 py-1 h-full flex items-center justify-between overflow-hidden">
                          <div className="flex-1 min-w-0">
                            {/* Wide layout (>180px) - Show full content */}
                            {width > 180 && (
                              <>
                                <div className="flex items-center space-x-2">
                                  {/* Enhanced status indicator */}
                                  <div className="relative flex-shrink-0">
                                    <div 
                                      className="w-2 h-2 rounded-full shadow-sm"
                                      style={{ backgroundColor: statusColor.border }}
                                    />
                                    {assignment.status === 'active' && (
                                      <div 
                                        className="absolute inset-0 w-2 h-2 rounded-full animate-ping"
                                        style={{ backgroundColor: statusColor.border, opacity: 0.4 }}
                                      />
                                    )}
                                  </div>
                                  <span 
                                    className="text-xs font-semibold truncate drop-shadow-sm flex-1 min-w-0"
                                    style={{ color: sprintColor.text }}
                                  >
                                    {sprint.name}
                                  </span>
                                  {/* Sprint type badge - only show if width > 250px */}
                                  {width > 250 && (
                                    <span 
                                      className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-white bg-opacity-20 backdrop-blur-sm flex-shrink-0"
                                      style={{ color: sprintColor.text }}
                                    >
                                      {sprint.sprint_type}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center space-x-2 mt-0.5">
                                  <span className="text-xs font-medium" style={{ color: sprintColor.text, opacity: 0.8 }}>
                                    {durationDays}d
                                  </span>
                                  {assignment.current_content_index !== undefined && width > 220 && (
                                    <span className="text-xs" style={{ color: sprintColor.text, opacity: 0.7 }}>
                                      {assignment.current_content_index}/10
                                    </span>
                                  )}
                                </div>
                              </>
                            )}
                            
                            {/* Medium layout (120-180px) - Show abbreviated content */}
                            {width > 120 && width <= 180 && (
                              <div className="flex items-center justify-center h-full">
                                <div className="flex items-center space-x-1.5">
                                  <div 
                                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: statusColor.border }}
                                  />
                                  <span 
                                    className="text-xs font-semibold truncate"
                                    style={{ color: sprintColor.text }}
                                    title={sprint.name}
                                  >
                                    {sprint.name.length > 10 ? `${sprint.name.substring(0, 10)}...` : sprint.name}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Narrow layout (60-120px) - Show minimal content */}
                            {width > 60 && width <= 120 && (
                              <div className="flex items-center justify-center h-full">
                                <div className="flex items-center space-x-1">
                                  <div 
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{ backgroundColor: statusColor.border }}
                                  />
                                  <span 
                                    className="text-xs font-bold"
                                    style={{ color: sprintColor.text }}
                                  >
                                    {durationDays}d
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {/* Very narrow layout (≤60px) - Show only indicator */}
                            {width <= 60 && (
                              <div className="flex justify-center items-center h-full">
                                <div 
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: statusColor.border }}
                                />
                              </div>
                            )}
                          </div>
                          
                          {/* Enhanced progress and actions - only show for wider bars */}
                          {width > 200 && (
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              {/* Circular progress indicator - only show for wide bars */}
                              {assignment.current_content_index !== undefined && width > 250 && (
                                <div className="relative w-5 h-5">
                                  <svg className="w-5 h-5 transform -rotate-90" viewBox="0 0 20 20">
                                    <circle
                                      cx="10"
                                      cy="10"
                                      r="8"
                                      stroke="white"
                                      strokeWidth="1.5"
                                      fill="none"
                                      opacity="0.3"
                                    />
                                    <circle
                                      cx="10"
                                      cy="10"
                                      r="8"
                                      stroke="white"
                                      strokeWidth="1.5"
                                      fill="none"
                                      strokeDasharray={`${((assignment.current_content_index || 0) / 10) * 50.27} 50.27`}
                                      className="transition-all duration-300"
                                    />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xs font-bold text-white">
                                      {Math.round(((assignment.current_content_index || 0) / 10) * 100)}%
                                    </span>
                                  </div>
                                </div>
                              )}
                              
                              {/* Action menu button - only show for wide bars */}
                              {width > 220 && (
                                <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white hover:bg-opacity-20">
                                  <MoreHorizontal 
                                    size={12} 
                                    className="drop-shadow-sm"
                                    style={{ color: sprintColor.text }}
                                  />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Bottom progress bar - only show for wider bars */}
                        {assignment.current_content_index !== undefined && width > 120 && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white bg-opacity-20 rounded-b-lg overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-b-lg transition-all duration-500"
                              style={{ 
                                width: `${((assignment.current_content_index || 0) / 10) * 100}%`,
                                opacity: 0.8
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Empty state for accounts with no assignments */}
                  {accountAssignments.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                      <div className="flex items-center space-x-2 opacity-50">
                        <Clock size={16} />
                        <span className="text-sm">No assignments</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Current time indicator line */}
            {currentTimePosition >= 0 && currentTimePosition <= timelineWidth && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-30 pointer-events-none"
                style={{ left: currentTimePosition }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Footer with Analytics */}
      <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Status Statistics */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-medium text-gray-700">
                    {assignments.filter(a => a.status === 'active').length} Active
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full" />
                  <span className="text-sm text-gray-600">
                    {assignments.filter(a => a.status === 'scheduled').length} Scheduled
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                  <span className="text-sm text-gray-600">
                    {assignments.filter(a => a.status === 'paused').length} Paused
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                  <span className="text-sm text-gray-600">
                    {assignments.filter(a => a.status === 'completed').length} Completed
                  </span>
                </div>
              </div>
              
              {/* Performance Metrics */}
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Clock size={14} />
                  <span>
                    {Math.round(assignments.reduce((acc, a) => {
                      if (!a.start_date || !a.end_date) return acc;
                      const days = (new Date(a.end_date).getTime() - new Date(a.start_date).getTime()) / (1000 * 60 * 60 * 24);
                      return acc + days;
                    }, 0) / assignments.length || 0)}d avg
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <User size={14} />
                  <span>{accounts.filter(a => a.status === 'active').length} active accounts</span>
                </div>
              </div>
            </div>
            
            {/* Keyboard Shortcuts */}
            <div className="flex items-center space-x-4">
              {selectedAssignments.size > 0 && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-full">
                  <span className="text-sm font-medium text-blue-700">
                    {selectedAssignments.size} selected
                  </span>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">Click</kbd>
                <span>Multi-select</span>
                <span className="mx-2">•</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">T</kbd>
                <span>Today</span>
                <span className="mx-2">•</span>
                <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">±</kbd>
                <span>Zoom</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mini Progress Overview */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span>Overall Progress</span>
            <span>
              {Math.round((assignments.filter(a => a.status === 'completed').length / assignments.length) * 100 || 0)}% complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-green-500 h-1.5 rounded-full transition-all duration-500"
              style={{ 
                width: `${(assignments.filter(a => a.status === 'completed').length / assignments.length) * 100 || 0}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Tooltip */}
      {tooltip.visible && tooltip.content && (
        <div
          className="fixed bg-gray-900 text-white rounded-lg shadow-xl z-50 p-4 max-w-sm"
          style={{ 
            left: tooltip.x + 10, 
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-white">{tooltip.content.sprint?.name}</h4>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                STATUS_COLORS[tooltip.content.assignment?.status as keyof typeof STATUS_COLORS]?.bg || 'bg-gray-100'
              } ${
                STATUS_COLORS[tooltip.content.assignment?.status as keyof typeof STATUS_COLORS]?.text || 'text-gray-800'
              }`}>
                {tooltip.content.assignment?.status}
              </span>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Type: <span className="text-white capitalize">{tooltip.content.sprint?.sprint_type}</span></div>
              <div>Duration: <span className="text-white">{tooltip.content.duration}</span></div>
              <div>Period: <span className="text-white">{tooltip.content.startDate} - {tooltip.content.endDate}</span></div>
              <div>Progress: <span className="text-white">{tooltip.content.progress}</span></div>
            </div>
            {tooltip.content.assignment?.current_content_index !== undefined && (
              <div className="mt-3">
                <div className="flex justify-between text-xs text-gray-300 mb-1">
                  <span>Content Progress</span>
                  <span>{tooltip.content.assignment.current_content_index}/10</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: tooltip.content.progress }}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Tooltip arrow */}
          <div 
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"
            style={{ marginTop: '-4px' }}
          />
        </div>
      )}

      {/* Enhanced Context Menu */}
      {contextMenu.visible && (
        <div
          className="fixed bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-2 min-w-48 backdrop-blur-sm"
          style={{ 
            left: contextMenu.x, 
            top: contextMenu.y,
            transform: 'translate(-50%, -10px)'
          }}
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sprint Actions</div>
          </div>
          <button className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 hover:text-blue-700 flex items-center space-x-3 transition-colors">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Edit size={14} className="text-blue-600" />
            </div>
            <div>
              <div className="font-medium">Edit Sprint</div>
              <div className="text-xs text-gray-500">Modify sprint details</div>
            </div>
          </button>
          <button className="w-full px-4 py-3 text-left text-sm hover:bg-green-50 hover:text-green-700 flex items-center space-x-3 transition-colors">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Copy size={14} className="text-green-600" />
            </div>
            <div>
              <div className="font-medium">Duplicate</div>
              <div className="text-xs text-gray-500">Create a copy</div>
            </div>
          </button>
          <button className="w-full px-4 py-3 text-left text-sm hover:bg-yellow-50 hover:text-yellow-700 flex items-center space-x-3 transition-colors">
            <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Pause size={14} className="text-yellow-600" />
            </div>
            <div>
              <div className="font-medium">Pause</div>
              <div className="text-xs text-gray-500">Temporarily halt</div>
            </div>
          </button>
          <div className="border-t border-gray-100 mt-2 pt-2">
            <button className="w-full px-4 py-3 text-left text-sm hover:bg-red-50 hover:text-red-700 flex items-center space-x-3 transition-colors">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <Trash2 size={14} className="text-red-600" />
              </div>
              <div>
                <div className="font-medium">Delete</div>
                <div className="text-xs text-gray-500">Remove permanently</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}; 