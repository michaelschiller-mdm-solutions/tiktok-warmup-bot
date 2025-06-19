export interface SprintTemplate {
  id: string;
  name: string;
  description: string;
  sprintType: string;
  icon: string;
  color: string;
  defaultSettings: Partial<ContentSprint>;
  contentSuggestions: ContentTypeRecommendation[];
}

export interface ContentTypeRecommendation {
  type: string;
  description: string;
  defaultDelay: number;
  priority: number;
}

export interface ContentSprint {
  id?: number;
  name: string;
  description: string;
  sprint_type: string;
  location?: string;
  seasonal_start?: string;
  seasonal_end?: string;
  target_duration_hours: number;
  created_at?: string;
  updated_at?: string;
  content_items?: SprintContentItem[];
  blocking_rules?: BlockingRule[];
  available_months?: number[];
  blocks_sprints?: number[];
  blocks_highlight_groups?: number[];
  has_after_sprint_content?: boolean;
}

export interface SprintContentItem {
  id?: number;
  sprint_id?: number;
  content_type: string;
  file_path?: string;
  delay_after_hours: number;
  description?: string;
  position: number;
  created_at?: string;
  preview?: string;
  fileSize?: number;
  fileName?: string;
  temporaryId?: string; // For new uploads before backend creation
  is_after_sprint_content?: boolean;
}

export interface BlockingRule {
  id?: number;
  sprint_id?: number;
  blocked_sprint_id: number;
  rule_type: 'before' | 'after' | 'during' | 'not_during';
  description?: string;
  created_at?: string;
  blocked_sprint?: ContentSprint;
}

export interface ConflictWarning {
  id: string;
  severity: 'error' | 'warning' | 'info';
  type: 'sprint_overlap' | 'blocking_rule' | 'timing_conflict' | 'resource_conflict';
  title: string;
  description: string;
  contentItemId?: string;
  suggestedResolution?: string;
  canAutoResolve?: boolean;
}

export interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  component: React.ComponentType<StepProps>;
  validation: (data: Partial<ContentSprint>) => ValidationResult;
  isOptional?: boolean;
}

export interface StepProps {
  data: Partial<ContentSprint>;
  onChange: (updates: Partial<ContentSprint>) => void;
  errors: Record<string, string>;
  onStepComplete: () => void;
  isActive: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings: string[];
}

export interface UploadProgress {
  fileId: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface SprintCreationState {
  currentStep: number;
  sprintData: Partial<ContentSprint>;
  validationErrors: Record<string, string>;
  conflicts: ConflictWarning[];
  isAutoSaving: boolean;
  uploadProgress: Record<string, UploadProgress>;
  selectedTemplate?: SprintTemplate;
}

export interface TimelineItem {
  id: string;
  contentItem: SprintContentItem;
  startTime: number; // Hours from sprint start
  endTime: number;
  conflicts: ConflictWarning[];
  isSelected: boolean;
  isHovered: boolean;
}

export interface DragItem {
  type: 'content-item';
  id: string;
  index: number;
  item: SprintContentItem;
}

export interface DropResult {
  destination?: {
    index: number;
  };
  source: {
    index: number;
  };
}

// UI-specific interfaces
export interface WizardProgressProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps: number[];
  onStepClick: (stepIndex: number) => void;
}

export interface SprintSummaryProps {
  sprintData: Partial<ContentSprint>;
  currentStep: number;
  validationErrors: Record<string, string>;
  conflicts: ConflictWarning[];
}

export interface FileUploadZoneProps {
  onFilesAdded: (files: File[]) => void;
  accepts?: string[];
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
}

export interface BulkActionsBarProps {
  selectedCount: number;
  onBulkEdit: () => void;
  onBulkDelete: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export interface ConflictMatrixProps {
  currentSprint: Partial<ContentSprint>;
  existingSprints: ContentSprint[];
  onRuleChange: (rules: BlockingRule[]) => void;
  conflicts: ConflictWarning[];
}

export interface SprintOptimizationSuggestion {
  type: 'reorder' | 'adjust_delay' | 'remove_content' | 'add_content';
  title: string;
  description: string;
  impact: string;
  confidence: number;
  autoApplicable: boolean;
  action: () => void;
}

// Form field interfaces
export interface SprintTypeOption {
  value: string;
  label: string;
  description?: string;
  icon: string;
  color: string;
  features?: string[];
  isCustom?: boolean;
  usageCount?: number;
}

export interface LocationSuggestion {
  id: string;
  name: string;
  type: 'city' | 'state' | 'country' | 'region';
  coordinates?: {
    lat: number;
    lng: number;
  };
  timezone?: string;
}

export interface SeasonalPeriod {
  id: string;
  name: string;
  description: string;
  startMonth: number;
  endMonth: number;
  icon: string;
  color: string;
} 