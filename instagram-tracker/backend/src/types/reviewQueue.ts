export interface ReviewQueueItem {
  reviewId: number;
  accountId: number;
  username: string;
  modelName: string;
  phase: string;
  failureType: string;
  failureMessage: string;
  priorityLevel: number;
  failedAt: Date;
  retryCount: number;
  daysInReview: number;
}

export interface ReviewResolution {
  reviewId: number;
  resolutionMethod: 'retry_bot' | 'manual_completion' | 'skip_phase' | 'reset_account' | 'change_content' | 'escalate_support' | 'other';
  resolutionNotes: string;
  resolvedBy: string;
}

export enum FailureType {
  BOT_ERROR = 'bot_error',
  INSTAGRAM_CHALLENGE = 'instagram_challenge',
  CONTENT_REJECTION = 'content_rejection',
  CAPTCHA = 'captcha',
  RATE_LIMIT = 'rate_limit',
  ACCOUNT_SUSPENDED = 'account_suspended',
  NETWORK_ERROR = 'network_error',
  TIMEOUT = 'timeout',
  OTHER = 'other'
}

export enum ReviewStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  ESCALATED = 'escalated',
  CANCELLED = 'cancelled'
}

export enum ResolutionMethod {
  RETRY_BOT = 'retry_bot',
  MANUAL_COMPLETION = 'manual_completion',
  SKIP_PHASE = 'skip_phase',
  RESET_ACCOUNT = 'reset_account',
  CHANGE_CONTENT = 'change_content',
  ESCALATE_SUPPORT = 'escalate_support',
  OTHER = 'other'
}

export interface BotFailureContext {
  failureType: FailureType;
  errorMessage: string;
  errorDetails?: any;
  retryCount: number;
  botId: string;
  sessionId?: string;
  instagramResponse?: any;
  shouldEscalateToReview?: boolean;
} 