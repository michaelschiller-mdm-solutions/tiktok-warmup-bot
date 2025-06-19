import React, { useState, useEffect, useCallback } from 'react';
import { X, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Import types
import {
  ContentSprint,
  SprintCreationState,
  WizardStep,
  ValidationResult
} from '../../types/sprintCreation';

// Import step components
import BasicInfoStep from './steps/BasicInfoStep';
import ContentUploadStep from './steps/ContentUploadStep';
import SchedulingStep from './steps/SchedulingStep';
import ConflictRulesStep from './steps/ConflictRulesStep';
import PreviewStep from './steps/PreviewStep';

// Import wizard components
import WizardProgress from './WizardProgress';
import SprintSummary from './SprintSummary';

interface SprintCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  editingSprintId?: number;
  onSuccess: (sprint: ContentSprint) => void;
}

// Define wizard steps with amazing visual design
const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Set up your sprint name, type, and basic settings',
    icon: '📋',
    component: BasicInfoStep,
    validation: (data) => {
      const errors: Record<string, string> = {};
      if (!data.name?.trim()) errors.name = 'Sprint name is required';
      if (!data.sprint_type) errors.sprint_type = 'Sprint type is required';
      if (!data.target_duration_hours || data.target_duration_hours <= 0) {
        errors.target_duration_hours = 'Duration must be greater than 0';
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings: []
      };
    }
  },
  {
    id: 'content',
    title: 'Content Upload',
    description: 'Upload and organize your content with smart categorization',
    icon: '📱',
    component: ContentUploadStep,
    validation: (data) => {
      const warnings: string[] = [];
      if (!data.content_items || data.content_items.length === 0) {
        warnings.push('Consider adding content items to make your sprint more effective');
      }
      
      return {
        isValid: true,
        errors: {},
        warnings
      };
    }
  },
  {
    id: 'scheduling',
    title: 'Scheduling Rules',
    description: 'Configure timing and seasonal availability',
    icon: '📅',
    component: SchedulingStep,
    validation: (data) => {
      const errors: Record<string, string> = {};
      
      if (data.seasonal_start && data.seasonal_end) {
        const start = new Date(data.seasonal_start);
        const end = new Date(data.seasonal_end);
        if (start >= end) {
          errors.seasonal_end = 'End date must be after start date';
        }
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings: []
      };
    },
    isOptional: true
  },
  {
    id: 'conflicts',
    title: 'Blocking Rules',
    description: 'Set up conflict prevention and blocking rules',
    icon: '🛡️',
    component: ConflictRulesStep,
    validation: () => ({
      isValid: true,
      errors: {},
      warnings: []
    }),
    isOptional: true
  },
  {
    id: 'preview',
    title: 'Preview & Publish',
    description: 'Review your sprint and publish when ready',
    icon: '🚀',
    component: PreviewStep,
    validation: (data) => {
      const errors: Record<string, string> = {};
      
      if (!data.name?.trim()) errors.name = 'Sprint name is required';
      if (!data.sprint_type) errors.sprint_type = 'Sprint type is required';
      if (!data.target_duration_hours || data.target_duration_hours <= 0) {
        errors.target_duration_hours = 'Duration must be greater than 0';
      }
      
      return {
        isValid: Object.keys(errors).length === 0,
        errors,
        warnings: []
      };
    }
  }
];

const SprintCreationWizard: React.FC<SprintCreationWizardProps> = ({
  isOpen,
  onClose,
  editingSprintId,
  onSuccess
}) => {
  // Wizard state management
  const [state, setState] = useState<SprintCreationState>({
    currentStep: 0,
    sprintData: {
      name: '',
      description: '',
      sprint_type: '',
      target_duration_hours: 24,
      content_items: [],
      blocking_rules: []
    },
    validationErrors: {},
    conflicts: [],
    isAutoSaving: false,
    uploadProgress: {}
  });

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isClosing, setIsClosing] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setState({
        currentStep: 0,
        sprintData: {
          name: '',
          description: '',
          sprint_type: '',
          target_duration_hours: 24,
          content_items: [],
          blocking_rules: []
        },
        validationErrors: {},
        conflicts: [],
        isAutoSaving: false,
        uploadProgress: {}
      });
      setCompletedSteps([]);
      setIsClosing(false);
    }
  }, [isOpen]);

  // Load existing sprint data if editing
  useEffect(() => {
    if (editingSprintId && isOpen) {
      loadExistingSprintData(editingSprintId);
    }
  }, [editingSprintId, isOpen]);

  // Load existing sprint data
  const loadExistingSprintData = async (sprintId: number) => {
    try {
      const response = await fetch(`/api/sprints/${sprintId}`);
      if (response.ok) {
        const sprintData = await response.json();
        setState(prev => ({
          ...prev,
          sprintData: {
            ...sprintData,
            content_items: sprintData.content_items || [],
            blocking_rules: sprintData.blocking_rules || []
          }
        }));
      }
    } catch (error) {
      toast.error('Failed to load sprint data');
    }
  };

  // Update sprint data
  const updateSprintData = useCallback((updates: Partial<ContentSprint>) => {
    setState(prev => ({
      ...prev,
      sprintData: { ...prev.sprintData, ...updates }
    }));
  }, []);

  // Validate current step
  const validateCurrentStep = useCallback((): ValidationResult => {
    const currentStepConfig = WIZARD_STEPS[state.currentStep];
    const result = currentStepConfig.validation(state.sprintData);
    
    setState(prev => ({
      ...prev,
      validationErrors: result.errors
    }));
    
    return result;
  }, [state.currentStep, state.sprintData]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    const validation = validateCurrentStep();
    
    if (validation.isValid) {
      setCompletedSteps(prev => {
        const newCompleted = [...prev];
        if (!newCompleted.includes(state.currentStep)) {
          newCompleted.push(state.currentStep);
        }
        return newCompleted;
      });
      
      if (state.currentStep < WIZARD_STEPS.length - 1) {
        setState(prev => ({
          ...prev,
          currentStep: prev.currentStep + 1,
          validationErrors: {}
        }));
      }
    } else {
      toast.error('Please fix the errors before continuing');
    }
  }, [state.currentStep, validateCurrentStep]);

  const handlePrevious = useCallback(() => {
    if (state.currentStep > 0) {
      setState(prev => ({
        ...prev,
        currentStep: prev.currentStep - 1,
        validationErrors: {}
      }));
    }
  }, [state.currentStep]);

  const handleStepClick = useCallback((stepIndex: number) => {
    if (stepIndex <= state.currentStep || completedSteps.includes(state.currentStep)) {
      setState(prev => ({
        ...prev,
        currentStep: stepIndex,
        validationErrors: {}
      }));
    }
  }, [state.currentStep, completedSteps]);

  const handleSkip = useCallback(() => {
    const currentStepConfig = WIZARD_STEPS[state.currentStep];
    if (currentStepConfig.isOptional) {
      handleNext();
    }
  }, [state.currentStep, handleNext]);

  // Submit sprint
  const handleSubmit = async () => {
    const validation = validateCurrentStep();
    
    if (!validation.isValid) {
      toast.error('Please fix all errors before submitting');
      return;
    }

    try {
      const endpoint = editingSprintId ? `/api/sprints/${editingSprintId}` : '/api/sprints';
      const method = editingSprintId ? 'PUT' : 'POST';
      
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(state.sprintData),
      });

      if (response.ok) {
        const savedSprint = await response.json();
        toast.success(`Sprint ${editingSprintId ? 'updated' : 'created'} successfully!`);
        onSuccess(savedSprint);
        handleClose();
      } else {
        throw new Error('Failed to save sprint');
      }
    } catch (error) {
      toast.error('Failed to save sprint. Please try again.');
    }
  };

  // Close handler with confirmation
  const handleClose = useCallback(() => {
    const hasUnsavedChanges = Object.keys(state.sprintData).some(key => {
      const value = state.sprintData[key as keyof ContentSprint];
      return value !== '' && value !== undefined && value !== null;
    });

    if (hasUnsavedChanges && !isClosing) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }

    setIsClosing(true);
    onClose();
  }, [state.sprintData, isClosing, onClose]);

  if (!isOpen) return null;

  const currentStepConfig = WIZARD_STEPS[state.currentStep];
  const StepComponent = currentStepConfig.component;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop with blur effect */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      
      {/* Main modal container */}
      <div className="relative w-full h-full bg-white flex overflow-hidden">
        {/* Sidebar - Sprint Summary */}
        <div className="w-80 bg-gradient-to-b from-primary-50 to-primary-100 border-r border-primary-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-primary-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-primary-900">
                {editingSprintId ? 'Edit Sprint' : 'Create Sprint'}
              </h2>
              <button
                onClick={handleClose}
                className="p-2 text-primary-600 hover:text-primary-800 hover:bg-primary-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Auto-save indicator */}
            <div className="flex items-center mt-2 text-sm">
              <div className="flex items-center text-primary-600">
                {state.isAutoSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    <span className="transition-colors">Auto-saved</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sprint Summary */}
          <div className="flex-1 overflow-auto">
            <SprintSummary
              sprintData={state.sprintData}
              currentStep={state.currentStep}
              validationErrors={state.validationErrors}
              conflicts={state.conflicts}
            />
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Progress header */}
          <div className="bg-white border-b border-gray-200 p-6">
            <WizardProgress
              steps={WIZARD_STEPS}
              currentStep={state.currentStep}
              completedSteps={completedSteps}
              onStepClick={handleStepClick}
            />
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-auto bg-gray-50">
            <div className="max-w-4xl mx-auto p-8">
              {/* Step header */}
              <div className="mb-8">
                <div className="flex items-center mb-4">
                  <div className="text-4xl mr-4">{currentStepConfig.icon}</div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      {currentStepConfig.title}
                    </h1>
                    <p className="text-gray-600 mt-1">
                      {currentStepConfig.description}
                    </p>
                  </div>
                </div>
                
                <div className="text-sm text-gray-500">
                  Step {state.currentStep + 1} of {WIZARD_STEPS.length}
                </div>
              </div>

              {/* Step component */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                              <StepComponent
                data={state.sprintData}
                onChange={updateSprintData}
                errors={state.validationErrors}
                onStepComplete={() => {
                  // Mark step as completed but don't auto-advance
                  setCompletedSteps(prev => {
                    const newCompleted = [...prev];
                    if (!newCompleted.includes(state.currentStep)) {
                      newCompleted.push(state.currentStep);
                    }
                    return newCompleted;
                  });
                }}
                isActive={true}
              />
              </div>
            </div>
          </div>

          {/* Navigation footer */}
          <div className="bg-white border-t border-gray-200 p-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={state.currentStep === 0}
                className="px-6 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              {/* Step indicator dots */}
              <div className="flex items-center space-x-2">
                {WIZARD_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === state.currentStep
                        ? 'bg-primary-600'
                        : completedSteps.includes(index)
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center space-x-3">
                {currentStepConfig.isOptional && state.currentStep !== WIZARD_STEPS.length - 1 && (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Skip
                  </button>
                )}
                
                {state.currentStep === WIZARD_STEPS.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm flex items-center"
                  >
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    {editingSprintId ? 'Update Sprint' : 'Create Sprint'}
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintCreationWizard; 