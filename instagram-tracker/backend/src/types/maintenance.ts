export type MaintenanceJobStatus = 
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'retrying'
  | 'postponed'
  | 'cancelled';

export type MaintenanceJobType = 
  | 'scheduled'
  | 'emergency'
  | 'manual'
  | 'optimization'
  | 'conflict_resolution';

export interface MaintenanceJob {
  id: string;
  groupId: number;
  accountId: number;
  userId: number;
  type: MaintenanceJobType;
  status: MaintenanceJobStatus;
  scheduledFor: Date;
  startedAt?: Date;
  completedAt?: Date;
  priority: number;
  retryCount: number;
  maxRetries: number;
  metadata: Record<string, any>;
  executionMetadata?: Record<string, any>;
  result?: Record<string, any>;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceConflict {
  id: string;
  type: 'sprint_overlap' | 'highlight_conflict' | 'position_conflict' | 'resource_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedGroupId: number;
  affectedAccountId: number;
  conflictingResourceId?: number;
  conflictingResourceType?: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolutionStrategy?: string;
  resolutionMetadata?: Record<string, any>;
}

export interface ConflictResolutionResult {
  conflictId: string;
  resolved: boolean;
  strategy: string;
  actions: string[];
  errors: string[];
  metadata: Record<string, any>;
}

export interface ContentSelectionOptions {
  respectSeasonal: boolean;
  avoidRecent: boolean;
  optimizeForPerformance: boolean;
  excludeContentIds?: number[];
  maxAge?: number; // days
  minQualityScore?: number;
  preferredSeasons?: string[];
}

export interface ContentSelectionResult {
  contentIds: number[];
  reason: string;
  qualityScore: number;
  alternativeIds: number[];
  metadata: Record<string, any>;
}

export interface PositionUpdateResult {
  groupId: number;
  oldPosition: number;
  newPosition: number;
  positionsChanged: number;
  conflictsDetected: number;
  errors: string[];
  metadata: Record<string, any>;
}

export interface PerformanceMetrics {
  groupId: number;
  accountId: number;
  executionTime: number;
  contentUpdated: number;
  conflictsResolved: number;
  successRate: number;
  averageExecutionTime: number;
  performanceScore: number;
  recommendations: string[];
  recordedAt: Date;
}

export interface SystemHealthStatus {
  isHealthy: boolean;
  activeJobs: number;
  queuedJobs: number;
  failedJobs: number;
  averageExecutionTime: number;
  successRate: number;
  resourceUtilization: {
    cpu: number;
    memory: number;
    database: number;
  };
  lastHealthCheck: Date;
  alerts: string[];
}

export interface MaintenanceSchedule {
  groupId: number;
  accountId: number;
  frequency: number; // weeks
  preferredTime: string; // HH:MM format
  timezone: string;
  lastMaintenance?: Date;
  nextMaintenance: Date;
  isActive: boolean;
  maintenanceWindow: {
    startHour: number;
    endHour: number;
    allowedDays: number[]; // 0-6, Sunday=0
  };
  exclusions: {
    dateRanges: Array<{ start: Date; end: Date; reason: string }>;
    sprintTypes: string[];
    highlightGroups: number[];
  };
}

export interface MaintenanceReport {
  jobId: string;
  groupId: number;
  accountId: number;
  executedAt: Date;
  duration: number;
  success: boolean;
  changes: {
    contentUpdated: number;
    positionsChanged: number;
    conflictsResolved: number;
  };
  performance: {
    executionTime: number;
    resourceUsage: Record<string, number>;
    optimizationGains: Record<string, number>;
  };
  errors: string[];
  warnings: string[];
  recommendations: string[];
  metadata: Record<string, any>;
}

// Webhook event types for external integrations
export interface MaintenanceWebhookEvent {
  type: 'maintenance.started' | 'maintenance.completed' | 'maintenance.failed' | 'conflict.detected' | 'conflict.resolved';
  timestamp: Date;
  jobId: string;
  groupId: number;
  accountId: number;
  payload: Record<string, any>;
}

// API request/response types
export interface ScheduleMaintenanceRequest {
  groupId: number;
  accountId: number;
  scheduledFor: Date;
  type?: MaintenanceJobType;
  priority?: number;
  metadata?: Record<string, any>;
}

export interface ScheduleMaintenanceResponse {
  jobId: string;
  scheduledFor: Date;
  estimatedDuration: number;
  nextMaintenanceDate?: Date;
}

export interface MaintenanceStatusResponse {
  jobId: string;
  status: MaintenanceJobStatus;
  progress: number; // 0-100
  currentPhase: string;
  estimatedTimeRemaining: number;
  errors: string[];
  warnings: string[];
}

export interface BulkMaintenanceRequest {
  groupIds: number[];
  accountId: number;
  scheduledFor: Date;
  type?: MaintenanceJobType;
  priority?: number;
  batchSize?: number;
  delayBetweenJobs?: number; // milliseconds
  metadata?: Record<string, any>;
}

export interface BulkMaintenanceResponse {
  jobIds: string[];
  totalJobs: number;
  estimatedCompletionTime: Date;
  warnings: string[];
} 