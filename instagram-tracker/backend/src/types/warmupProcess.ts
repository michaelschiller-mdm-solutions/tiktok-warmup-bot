export enum WarmupPhase {
  MANUAL_SETUP = 'manual_setup',
  BIO = 'bio',
  GENDER = 'gender',
  NAME = 'name',
  USERNAME = 'username',
  FIRST_HIGHLIGHT = 'first_highlight',
  NEW_HIGHLIGHT = 'new_highlight',
  POST_CAPTION = 'post_caption',
  POST_NO_CAPTION = 'post_no_caption',
  STORY_CAPTION = 'story_caption',
  STORY_NO_CAPTION = 'story_no_caption'
}

export enum WarmupPhaseStatus {
  PENDING = 'pending',           // Phase not yet available
  AVAILABLE = 'available',       // Phase can be started (timing requirements met)
  CONTENT_ASSIGNED = 'content_assigned', // Content assigned, ready for bot
  IN_PROGRESS = 'in_progress',   // Bot working on phase
  COMPLETED = 'completed',       // Phase successfully completed
  FAILED = 'failed',             // Phase failed, needs retry
  REQUIRES_REVIEW = 'requires_review' // Manual intervention needed
}

export interface WarmupProcessResult {
  success: boolean;
  accountId: number;
  message: string;
  phase?: WarmupPhase;
  phaseId?: number;
  nextPhase?: WarmupPhase;
  warmupComplete?: boolean;
  needsHumanReview?: boolean;
  retryCount?: number;
  containerNumber?: number;
  error?: string;
}

export interface ContentSelectionCriteria {
  modelId: number;
  contentType: ContentType;
  accountId: number;
  excludeUsedContent?: boolean;
  minQualityScore?: number;
  maxUsageCount?: number;
}

export enum ContentType {
  PFP = 'pfp',
  BIO = 'bio',
  POST = 'post',
  HIGHLIGHT = 'highlight',
  STORY = 'story',
  ANY = 'any'
}

export interface ContentAssignment {
  id?: number;
  accountId: number;
  warmupPhaseId: number;
  contentId?: number;
  textId?: number;
  contentType: ContentType;
  assignmentScore?: number;
  assignmentReason?: string;
  assignmentAlgorithm?: string;
  assignedAt?: Date;
  assignedBy?: string;
  usedAt?: Date;
  performanceScore?: number;
  success?: boolean;
  errorMessage?: string;
}

export interface BotSession {
  id?: number;
  botId: string;
  sessionId: string;
  botType?: string;
  startedAt?: Date;
  endedAt?: Date;
  lastHeartbeat?: Date;
  status?: string;
  accountsProcessed?: number;
  phasesCompleted?: number;
  phasesFailed?: number;
  totalActions?: number;
  errorCount?: number;
  lastErrorMessage?: string;
  lastErrorAt?: Date;
  maxAccountsPerSession?: number;
  sessionTimeoutMinutes?: number;
  retryLimit?: number;
  userAgent?: string;
  ipAddress?: string;
  systemInfo?: any;
}

export interface BotActionLog {
  id?: number;
  botSessionId: number;
  botId: string;
  accountId: number;
  warmupPhaseId?: number;
  phaseName?: string;
  actionType: string;
  actionDescription?: string;
  actionStartedAt?: Date;
  actionCompletedAt?: Date;
  actionDurationMs?: number;
  status?: string;
  success?: boolean;
  contentUsed?: any;
  instagramResponse?: any;
  errorMessage?: string;
  errorCode?: string;
  errorDetails?: any;
  retryCount?: number;
  responseTimeMs?: number;
  memoryUsageMb?: number;
  cpuUsagePercent?: number;
}

export interface WarmupPhaseData {
  id?: number;
  accountId: number;
  phase: WarmupPhase;
  status: WarmupPhaseStatus;
  availableAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  minIntervalHours?: number;
  botId?: string;
  botSessionId?: string;
  assignedContentId?: number;
  assignedTextId?: number;
  contentAssignedAt?: Date;
  errorMessage?: string;
  errorDetails?: any;
  retryCount?: number;
  maxRetries?: number;
  executionTimeMs?: number;
  instagramResponse?: any;
  successRate?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WarmupStatusSummary {
  accountId: number;
  username: string;
  lifecycleState: string;
  lastBotActionBy?: string;
  lastBotActionAt?: Date;
  totalPhases: number;
  completedPhases: number;
  availablePhases: number;
  failedPhases: number;
  progressPercent: number;
  isComplete: boolean;
  phases: WarmupPhaseData[];
}

export interface WarmupStatistics {
  totalAccounts: number;
  accountsInWarmup: number;
  completedWarmups: number;
  totalPhases: number;
  completedPhases: number;
  failedPhases: number;
  phasesNeedingReview: number;
  successRatePercent: number;
  avgExecutionTimeMs: number;
  phaseBreakdown: {
    [key in WarmupPhase]?: {
      total: number;
      completed: number;
      failed: number;
      avgTimeMs: number;
    };
  };
}

export interface ContentCandidate {
  id: number;
  modelId: number;
  contentType: ContentType;
  imageUrl?: string;
  textContent?: string;
  qualityScore: number;
  assignmentCount: number;
  successCount: number;
  lastAssignedAt?: Date;
  isBlacklisted: boolean;
  successRate: number;
} 