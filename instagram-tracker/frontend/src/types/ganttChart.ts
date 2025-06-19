// Gantt Chart Types for Content Sprint Visualization

import type { Account } from './accounts';
import type { ContentSprint, SprintContentItem } from './sprintCreation';  

// Define SprintAssignment here since assignments module doesn't exist yet
export interface SprintAssignment {
  id: number;
  account_id: number;
  sprint_id: number;
  assignment_date: string;
  start_date?: string;
  end_date?: string;
  status: 'scheduled' | 'active' | 'completed' | 'paused' | 'cancelled';
  current_content_index: number;
  next_content_due?: string;
  sprint_instance_id: string;
  created_at: string;
  updated_at: string;
}

export interface GanttChartProps {
  accounts: Account[];
  sprints: ContentSprint[];
  assignments: SprintAssignment[];
  dateRange: { start: Date; end: Date };
  zoomLevel: 'hour' | 'day' | 'week' | 'month' | 'quarter';
  filters: GanttFilters;
  onSprintClick?: (sprint: ContentSprint) => void;
  onAccountClick?: (account: Account) => void;
  onAssignmentAction?: (action: AssignmentAction) => void;
  className?: string;
}

export interface GanttFilters {
  accountStatus?: AccountStatus[];
  sprintTypes?: SprintType[];
  contentTypes?: ContentType[];
  conflictsOnly?: boolean;
  accountIds?: number[];
  dateRange?: { start: Date; end: Date };
  searchQuery?: string;
}

export interface TimelineData {
  accounts: AccountTimelineRow[];
  conflicts: ConflictIndicator[];
  dateRange: DateRange;
  totalDuration: number;
  scale: TimeScale;
}

export interface AccountTimelineRow {
  account: Account;
  assignments: AssignmentBar[];
  state: AccountState;
  conflicts: ConflictWarning[];
  height: number;
  y: number;
}

export interface AssignmentBar {
  id: string;
  assignment: SprintAssignment;
  sprint: ContentSprint;
  x: number;
  width: number;
  height: number;
  color: string;
  progress: number;
  status: AssignmentStatus;
  contentItems: ContentItemMarker[];
  conflicts: ConflictWarning[];
}

export interface ContentItemMarker {
  id: string;
  contentItem: SprintContentItem;
  x: number;
  y: number;
  content_type: string;
  status: 'queued' | 'posted' | 'failed' | 'cancelled';
  isEmergency: boolean;
  scheduledTime: Date;
  postedTime?: Date;
}

export interface ConflictIndicator {
  id: string;
  type: 'blocking' | 'location' | 'seasonal' | 'overlap';
  severity: 'warning' | 'error';
  x: number;
  y: number;
  width: number;
  height: number;
  message: string;
  affectedAssignments: string[];
  resolutionOptions: ConflictResolution[];
}

export interface ConflictResolution {
  type: 'pause' | 'reschedule' | 'override' | 'cancel';
  label: string;
  description: string;
  action: () => Promise<void>;
}

export interface AccountState {
  currentLocation: string;
  activeSprintIds: number[];
  idleSince?: Date;
  idleDuration?: number;
  lastEmergencyContent?: Date;
  cooldownUntil?: Date;
  nextMaintenanceDue?: Date;
}

export interface TimeScale {
  start: Date;
  end: Date;
  pixelsPerDay: number;
  majorTicks: DateTick[];
  minorTicks: DateTick[];
  currentTimeX: number;
}

export interface DateTick {
  date: Date;
  x: number;
  label: string;
  isMajor: boolean;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface AssignmentAction {
  type: 'pause' | 'resume' | 'cancel' | 'reschedule' | 'details';
  assignmentId: string;
  payload?: any;
}

export interface GanttTooltipData {
  type: 'sprint' | 'account' | 'conflict' | 'content';
  x: number;
  y: number;
  assignmentBar?: AssignmentBar;
  data?: any;
  accountInfo?: Account & { 
    status: string;
    location?: string;
    activeSprintIds?: number[];
    idleSince?: Date;
    cooldownUntil?: Date;
  };
  conflicts?: ConflictWarning[];
  contentItems?: ContentItemMarker[];
  actions?: TooltipAction[];
}

export interface TooltipAction {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface ZoomLevel {
  level: 'hour' | 'day' | 'week' | 'month' | 'quarter';
  pixelsPerDay: number;
  majorTickInterval: number; // days
  minorTickInterval: number; // days
  label: string;
}

export interface GanttViewport {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

export interface SprintTypeConfig {
  type: SprintType;
  color: string;
  lightColor: string;
  label: string;
  icon: string;
}

export interface ContentTypeConfig {
  type: ContentType;
  color: string;
  label: string;
  icon: string;
}

export type AccountStatus = 'warmup' | 'active' | 'idle' | 'cooldown' | 'paused' | 'error';
export type SprintType = 'vacation' | 'university' | 'home' | 'work' | 'fitness' | 'lifestyle' | string;
export type ContentType = 'story' | 'post' | 'highlight';
export type AssignmentStatus = 'scheduled' | 'active' | 'completed' | 'paused' | 'cancelled';

export interface ConflictWarning {
  id: string;
  type: 'blocking' | 'location' | 'seasonal' | 'overlap';
  severity: 'warning' | 'error';
  message: string;
  description: string;
  affectedItems: string[];
  resolution_options: string[];
  resolutionOptions: ConflictResolution[];
}

// Timeline calculation utilities
export interface TimelineCalculationOptions {
  containerWidth: number;
  dateRange: DateRange;
  zoomLevel: ZoomLevel;
  accountCount: number;
  rowHeight: number;
  headerHeight: number;
}

export interface PositionedElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

// Interaction event types
export interface GanttMouseEvent {
  type: 'click' | 'hover' | 'drag' | 'scroll';
  target: 'sprint' | 'account' | 'timeline' | 'background';
  targetId?: string;
  position: { x: number; y: number };
  originalEvent: MouseEvent;
}

export interface GanttKeyboardEvent {
  type: 'shortcut' | 'navigation';
  key: string;
  modifiers: string[];
  originalEvent: KeyboardEvent;
}

// Performance optimization types
export interface VirtualScrollData {
  startIndex: number;
  endIndex: number;
  visibleRows: AccountTimelineRow[];
  totalHeight: number;
  scrollTop: number;
}

export interface RenderCache {
  timeScale: TimeScale;
  assignments: Map<string, AssignmentBar>;
  conflicts: Map<string, ConflictIndicator>;
  lastUpdate: number;
}

// Animation and transition types
export interface GanttAnimation {
  id: string;
  type: 'move' | 'resize' | 'fade' | 'slide';
  element: string;
  duration: number;
  easing: string;
  from: any;
  to: any;
}

export interface GanttTransition {
  property: string;
  duration: number;
  easing: string;
  delay?: number;
} 