import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import { useForm } from '../hooks/useForm';
import { apiClient } from '../services/api';
import { CreateModelRequest } from '../types/models';

interface ModelWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  description: string;
  unfollow_ratio: number;
  daily_follow_limit: number;
  posting_schedule: string;
}

const INITIAL_VALUES: FormData = {
  name: '',
  description: '',
  unfollow_ratio: 90,
  daily_follow_limit: 50,
  posting_schedule: '{}',
};

const VALIDATION_RULES = {
  name: { 
    required: true, 
    minLength: 3, 
    maxLength: 255 
  },
  description: { 
    maxLength: 1000 
  },
  unfollow_ratio: { 
    required: true, 
    min: 0, 
    max: 100 
  },
  daily_follow_limit: { 
    required: true, 
    min: 1, 
    max: 1000 
  },
  posting_schedule: { 
    custom: (value: string) => {
      try {
        JSON.parse(value);
        return null;
      } catch {
        return 'Must be valid JSON';
      }
    }
  },
};

const ModelWizard: React.FC<ModelWizardProps> = ({ isOpen, onClose, onSuccess }) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  const form = useForm<FormData>({
    initialValues: INITIAL_VALUES,
    validationRules: VALIDATION_RULES,
    onSubmit: async (values) => {
      try {
        const modelData: CreateModelRequest = {
          name: values.name,
          description: values.description || undefined,
          unfollow_ratio: values.unfollow_ratio,
          daily_follow_limit: values.daily_follow_limit,
          posting_schedule: JSON.parse(values.posting_schedule || '{}'),
        };

        await apiClient.createModel(modelData);
        toast.success(`Model "${values.name}" created successfully!`);
        
        // Reset form and close wizard
        form.reset();
        setCurrentStep(0);
        onClose();
        
        // Notify parent to refresh data
        if (onSuccess) {
          onSuccess();
        }
      } catch (error: any) {
        console.error('Failed to create model:', error);
        toast.error(error.message || 'Failed to create model');
      }
    },
  });

  const steps = [
    {
      title: 'Basic Information',
      description: 'Enter the basic details for your model',
      component: <BasicInfoStep form={form} />
    },
    {
      title: 'Automation Settings',
      description: 'Configure follow/unfollow behavior',
      component: <AutomationStep form={form} />
    },
    {
      title: 'Posting Schedule',
      description: 'Set up content posting schedule',
      component: <ScheduleStep form={form} />
    },
    {
      title: 'Review & Confirm',
      description: 'Review your settings before creating',
      component: <ReviewStep form={form} />
    }
  ];

  const canGoNext = () => {
    const currentStepFields = getStepFields(currentStep);
    return currentStepFields.every(field => !form.getFieldState(field).hasError);
  };

  const canGoPrev = () => currentStep > 0;
  const canSubmit = () => currentStep === steps.length - 1 && form.isValid;

  const getStepFields = (step: number): string[] => {
    switch (step) {
      case 0: return ['name', 'description'];
      case 1: return ['unfollow_ratio', 'daily_follow_limit'];
      case 2: return ['posting_schedule'];
      default: return [];
    }
  };

  const handleNext = () => {
    // Validate current step fields
    const fields = getStepFields(currentStep);
    fields.forEach(field => form.setFieldTouched(field));
    
    if (canGoNext() && currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (canGoPrev()) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleClose = () => {
    form.reset();
    setCurrentStep(0);
    onClose();
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title="Create New Model"
      size="lg"
    >
      <div className="p-6">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, index) => (
              <div 
                key={index}
                className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                    ${index <= currentStep 
                      ? 'bg-primary-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                    }`}
                >
                  {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div 
                    className={`flex-1 h-1 mx-4 rounded
                      ${index < currentStep ? 'bg-primary-600' : 'bg-gray-200'}
                    `} 
                  />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900">{steps[currentStep].title}</h3>
            <p className="text-sm text-gray-600 mt-1">{steps[currentStep].description}</p>
          </div>
        </div>

        {/* Step Content */}
        <form onSubmit={form.handleSubmit} className="min-h-64">
          {steps[currentStep].component}
        </form>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-8">
          <button
            type="button"
            onClick={handlePrev}
            disabled={!canGoPrev()}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="btn-ghost"
            >
              Cancel
            </button>
            
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canGoNext()}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSubmit() || form.isSubmitting}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {form.isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Create Model
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Step Components
const BasicInfoStep: React.FC<{ form: any }> = ({ form }) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Model Name *
      </label>
      <input
        {...form.getFieldProps('name')}
        type="text"
        className={`form-input w-full ${form.getFieldState('name').hasError ? 'border-red-500' : ''}`}
        placeholder="e.g., Fashion Campaign 2024"
      />
      {form.getFieldState('name').error && (
        <p className="text-red-600 text-sm mt-1">{form.getFieldState('name').error}</p>
      )}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Description
      </label>
      <textarea
        {...form.getFieldProps('description')}
        rows={3}
        className={`form-textarea w-full ${form.getFieldState('description').hasError ? 'border-red-500' : ''}`}
        placeholder="Optional description of this model/campaign..."
      />
      {form.getFieldState('description').error && (
        <p className="text-red-600 text-sm mt-1">{form.getFieldState('description').error}</p>
      )}
    </div>
  </div>
);

const AutomationStep: React.FC<{ form: any }> = ({ form }) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Unfollow Ratio (%) *
      </label>
      <input
        {...form.getFieldProps('unfollow_ratio')}
        type="number"
        min="0"
        max="100"
        className={`form-input w-full ${form.getFieldState('unfollow_ratio').hasError ? 'border-red-500' : ''}`}
      />
      <p className="text-sm text-gray-500 mt-1">
        Percentage of follows that will be unfollowed (0-100%)
      </p>
      {form.getFieldState('unfollow_ratio').error && (
        <p className="text-red-600 text-sm mt-1">{form.getFieldState('unfollow_ratio').error}</p>
      )}
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Daily Follow Limit *
      </label>
      <input
        {...form.getFieldProps('daily_follow_limit')}
        type="number"
        min="1"
        max="1000"
        className={`form-input w-full ${form.getFieldState('daily_follow_limit').hasError ? 'border-red-500' : ''}`}
      />
      <p className="text-sm text-gray-500 mt-1">
        Maximum number of new follows per day (1-1000)
      </p>
      {form.getFieldState('daily_follow_limit').error && (
        <p className="text-red-600 text-sm mt-1">{form.getFieldState('daily_follow_limit').error}</p>
      )}
    </div>
  </div>
);

const ScheduleStep: React.FC<{ form: any }> = ({ form }) => (
  <div className="space-y-6">
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Posting Schedule (JSON)
      </label>
      <textarea
        {...form.getFieldProps('posting_schedule')}
        rows={6}
        className={`form-textarea w-full font-mono text-sm ${form.getFieldState('posting_schedule').hasError ? 'border-red-500' : ''}`}
        placeholder='{"daily_posts": 2, "hours": [9, 18], "content_types": ["image", "story"]}'
      />
      <p className="text-sm text-gray-500 mt-1">
        JSON configuration for content posting schedule
      </p>
      {form.getFieldState('posting_schedule').error && (
        <p className="text-red-600 text-sm mt-1">{form.getFieldState('posting_schedule').error}</p>
      )}
    </div>
  </div>
);

const ReviewStep: React.FC<{ form: any }> = ({ form }) => (
  <div className="space-y-6">
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="font-medium text-gray-900 mb-3">Review Your Settings</h4>
      <dl className="space-y-2">
        <div className="flex justify-between">
          <dt className="text-sm text-gray-600">Name:</dt>
          <dd className="text-sm font-medium text-gray-900">{form.values.name}</dd>
        </div>
        {form.values.description && (
          <div className="flex justify-between">
            <dt className="text-sm text-gray-600">Description:</dt>
            <dd className="text-sm text-gray-900 max-w-64 text-right">{form.values.description}</dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-sm text-gray-600">Unfollow Ratio:</dt>
          <dd className="text-sm font-medium text-gray-900">{form.values.unfollow_ratio}%</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-sm text-gray-600">Daily Follow Limit:</dt>
          <dd className="text-sm font-medium text-gray-900">{form.values.daily_follow_limit}</dd>
        </div>
      </dl>
    </div>
    
    <div className="text-sm text-gray-600">
      <p>⚠️ Once created, you can modify these settings later from the model management page.</p>
    </div>
  </div>
);

export default ModelWizard; 