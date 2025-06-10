import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { X, Save, AlertTriangle } from 'lucide-react';

import Modal from './Modal';
import { useForm } from '../hooks/useForm';
import { apiClient } from '../services/api';
import { Model, UpdateModelRequest } from '../types/models';

interface ModelSettingsProps {
  model: Model | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SettingsFormData {
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'paused';
  unfollow_ratio: number;
  daily_follow_limit: number;
  posting_schedule: string;
}

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

const ModelSettings: React.FC<ModelSettingsProps> = ({ 
  model, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const [hasChanges, setHasChanges] = useState(false);
  const [initialValues, setInitialValues] = useState<SettingsFormData>({
    name: '',
    description: '',
    status: 'active',
    unfollow_ratio: 90,
    daily_follow_limit: 50,
    posting_schedule: '{}',
  });

  // Update initial values when model changes
  useEffect(() => {
    if (model) {
      const newValues = {
        name: model.name,
        description: model.description || '',
        status: model.status,
        unfollow_ratio: model.unfollow_ratio,
        daily_follow_limit: model.daily_follow_limit,
        posting_schedule: JSON.stringify(model.posting_schedule, null, 2),
      };
      setInitialValues(newValues);
      form.reset();
      // Set the form values manually since reset uses old initial values
      Object.keys(newValues).forEach(key => {
        form.setValue(key, newValues[key as keyof SettingsFormData]);
      });
      setHasChanges(false);
    }
  }, [model]);

  const form = useForm<SettingsFormData>({
    initialValues,
    validationRules: VALIDATION_RULES,
    onSubmit: async (values) => {
      if (!model) return;

      try {
        const updateData: UpdateModelRequest = {
          name: values.name,
          description: values.description || undefined,
          status: values.status,
          unfollow_ratio: values.unfollow_ratio,
          daily_follow_limit: values.daily_follow_limit,
          posting_schedule: JSON.parse(values.posting_schedule || '{}'),
        };

        await apiClient.updateModel(model.id, updateData);
        toast.success(`Model "${values.name}" updated successfully!`);
        
        setHasChanges(false);
        onClose();
        
        if (onSuccess) {
          onSuccess();
        }
      } catch (error: any) {
        console.error('Failed to update model:', error);
        toast.error(error.message || 'Failed to update model');
      }
    },
  });

  // Track changes
  useEffect(() => {
    if (model) {
      const currentValues = form.values;
      const originalValues = {
        name: model.name,
        description: model.description || '',
        status: model.status,
        unfollow_ratio: model.unfollow_ratio,
        daily_follow_limit: model.daily_follow_limit,
        posting_schedule: JSON.stringify(model.posting_schedule, null, 2),
      };

      const changed = Object.keys(currentValues).some(key => {
        return currentValues[key as keyof SettingsFormData] !== originalValues[key as keyof SettingsFormData];
      });

      setHasChanges(changed);
    }
  }, [form.values, model, form]);

  const handleClose = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all changes to original values?')) {
      if (model) {
        const originalValues = {
          name: model.name,
          description: model.description || '',
          status: model.status,
          unfollow_ratio: model.unfollow_ratio,
          daily_follow_limit: model.daily_follow_limit,
          posting_schedule: JSON.stringify(model.posting_schedule, null, 2),
        };
        
        Object.keys(originalValues).forEach(key => {
          form.setValue(key, originalValues[key as keyof SettingsFormData]);
        });
        setHasChanges(false);
      }
    }
  };

  if (!model) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      size="lg"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Model Settings</h2>
            <p className="text-sm text-gray-600 mt-1">Configure "{model.name}" properties</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md p-1 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Changes indicator */}
        {hasChanges && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">You have unsaved changes</span>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <form onSubmit={form.handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model Name *
                </label>
                <input
                  {...form.getFieldProps('name')}
                  type="text"
                  className={`form-input w-full ${form.getFieldState('name').hasError ? 'border-red-500' : ''}`}
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
                  placeholder="Optional description..."
                />
                {form.getFieldState('description').error && (
                  <p className="text-red-600 text-sm mt-1">{form.getFieldState('description').error}</p>
                )}
              </div>
            </div>
          </div>

          {/* Status & Controls */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Status & Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  {...form.getFieldProps('status')}
                  className="form-select w-full"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

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
                {form.getFieldState('daily_follow_limit').error && (
                  <p className="text-red-600 text-sm mt-1">{form.getFieldState('daily_follow_limit').error}</p>
                )}
              </div>
            </div>
          </div>

          {/* Posting Schedule */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Posting Schedule</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule Configuration (JSON)
              </label>
              <textarea
                {...form.getFieldProps('posting_schedule')}
                rows={8}
                className={`form-textarea w-full font-mono text-sm ${form.getFieldState('posting_schedule').hasError ? 'border-red-500' : ''}`}
                placeholder='{"daily_posts": 2, "hours": [9, 18]}'
              />
              {form.getFieldState('posting_schedule').error && (
                <p className="text-red-600 text-sm mt-1">{form.getFieldState('posting_schedule').error}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Configure posting schedule as JSON. Example: {`{"daily_posts": 2, "hours": [9, 18], "content_types": ["image", "story"]}`}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges}
              className="text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset Changes
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="btn-ghost"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={!hasChanges || !form.isValid || form.isSubmitting}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {form.isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default ModelSettings; 