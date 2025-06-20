import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  Calendar,
  Shield,
  Settings,
  Info,
  AlertTriangle,
  Plus,
  Trash2,
  GripVertical
} from 'lucide-react';
import {
  HighlightGroupCreationWizardProps,
  HighlightGroupFormData,
  HighlightGroupCreationStep,
  CreateHighlightGroupRequest,
  SeasonalBatch
} from '../../types/highlightGroups';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useDropzone } from 'react-dropzone';
import { MonthSelector } from '../ui/MonthSelector';

const HighlightGroupCreationWizard: React.FC<HighlightGroupCreationWizardProps> = ({
  isOpen,
  onClose,
  onGroupCreate,
  existingGroups
}) => {
  // Form data state
  const [formData, setFormData] = useState<HighlightGroupFormData>({
    name: '',
    description: '',
    category: '',
    content_files: [],
    seasonal_batches: [],
    maintenance_frequency_weeks: 3,
    content_per_maintenance: 2,
    seasonal_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    blocks_sprint_types: [],
    blocks_highlight_groups: [],
    starting_position: 1,
    auto_reorder: true
  });

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Steps configuration
  const steps: HighlightGroupCreationStep[] = [
    {
      id: 1,
      title: 'Basic Information',
      description: 'Set up group name, category, and description',
      completed: false,
      valid: false,
      errors: []
    },
    {
      id: 2,
      title: 'Content Pool',
      description: 'Upload content and organize seasonal batches',
      completed: false,
      valid: false,
      errors: []
    },
    {
      id: 3,
      title: 'Maintenance Schedule',
      description: 'Configure automated maintenance timing',
      completed: false,
      valid: false,
      errors: []
    },
    {
      id: 4,
      title: 'Blocking Rules',
      description: 'Set up conflict prevention rules',
      completed: false,
      valid: false,
      errors: []
    },
    {
      id: 5,
      title: 'Position Settings',
      description: 'Configure highlight positioning',
      completed: false,
      valid: false,
      errors: []
    }
  ];

  // Validation functions
  const validateStep1 = useCallback(() => {
    const errors: string[] = [];
    if (!formData.name.trim()) errors.push('Group name is required');
    if (formData.name.length < 3) errors.push('Group name must be at least 3 characters');
    if (existingGroups.some(g => g.name.toLowerCase() === formData.name.toLowerCase())) {
      errors.push('A group with this name already exists');
    }
    if (!formData.category) errors.push('Category is required');
    return errors;
  }, [formData.name, formData.category, existingGroups]);

  const validateStep2 = useCallback(() => {
    const errors: string[] = [];
    if (formData.content_files.length === 0) errors.push('At least one content file is required');
    if (formData.content_files.length > 100) errors.push('Maximum 100 content items allowed');
    return errors;
  }, [formData.content_files]);

  const validateStep3 = useCallback(() => {
    const errors: string[] = [];
    if (formData.maintenance_frequency_weeks < 1 || formData.maintenance_frequency_weeks > 12) {
      errors.push('Maintenance frequency must be between 1-12 weeks');
    }
    if (formData.content_per_maintenance < 1 || formData.content_per_maintenance > 5) {
      errors.push('Content per maintenance must be between 1-5 items');
    }
    if (formData.seasonal_months.length === 0) {
      errors.push('At least one month must be selected');
    }
    return errors;
  }, [formData.maintenance_frequency_weeks, formData.content_per_maintenance, formData.seasonal_months]);

  const validateStep4 = useCallback(() => {
    const errors: string[] = [];
    // No required validation for blocking rules - they're optional
    return errors;
  }, []);

  const validateStep5 = useCallback(() => {
    const errors: string[] = [];
    if (formData.starting_position < 1 || formData.starting_position > 20) {
      errors.push('Starting position must be between 1-20');
    }
    return errors;
  }, [formData.starting_position]);

  // Update step validation
  const getStepValidation = useCallback((stepId: number) => {
    switch (stepId) {
      case 1: return validateStep1();
      case 2: return validateStep2();
      case 3: return validateStep3();
      case 4: return validateStep4();
      case 5: return validateStep5();
      default: return [];
    }
  }, [validateStep1, validateStep2, validateStep3, validateStep4, validateStep5]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    handleFileUpload(acceptedFiles);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.avi']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  // Handle file upload
  const handleFileUpload = (files: File[] | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files).filter(file => {
      // Validate file types
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isReasonableSize = file.size <= 50 * 1024 * 1024; // 50MB limit
      return isValidType && isReasonableSize;
    });

    setFormData(prev => ({
      ...prev,
      content_files: [...prev.content_files, ...newFiles].slice(0, 100) // Ensure max 100 files
    }));
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) {
      return;
    }

    const items = Array.from(formData.content_files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFormData(prev => ({
      ...prev,
      content_files: items
    }));
  };

  // Remove file from upload
  const removeFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      content_files: prev.content_files.filter((_, i) => i !== index)
    }));
  };

  // Add seasonal batch
  const addSeasonalBatch = () => {
    const newBatch: SeasonalBatch = {
      id: Date.now().toString(),
      name: '',
      months: [],
      content_count: 0,
      description: ''
    };
    setFormData(prev => ({
      ...prev,
      seasonal_batches: [...prev.seasonal_batches, newBatch]
    }));
  };

  // Update seasonal batch
  const updateSeasonalBatch = (index: number, updates: Partial<SeasonalBatch>) => {
    setFormData(prev => ({
      ...prev,
      seasonal_batches: prev.seasonal_batches.map((batch, i) => 
        i === index ? { ...batch, ...updates } : batch
      )
    }));
  };

  // Remove seasonal batch
  const removeSeasonalBatch = (index: number) => {
    setFormData(prev => ({
      ...prev,
      seasonal_batches: prev.seasonal_batches.filter((_, i) => i !== index)
    }));
  };

  // Navigation handlers
  const canGoNext = currentStep < 5 && getStepValidation(currentStep).length === 0;
  const canGoPrev = currentStep > 1;

  const goNext = () => {
    if (canGoNext) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (canGoPrev) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Submit handler
  const handleSubmit = async () => {
    const allErrors = steps.map((_, index) => getStepValidation(index + 1)).flat();
    if (allErrors.length > 0) {
      setSubmitError('Please fix all validation errors before submitting');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const createRequest: CreateHighlightGroupRequest = {
        name: formData.name,
        description: formData.description || undefined,
        category: formData.category,
        maintenance_frequency_weeks: formData.maintenance_frequency_weeks,
        content_per_maintenance: formData.content_per_maintenance,
        seasonal_months: formData.seasonal_months,
        blocks_sprint_types: formData.blocks_sprint_types,
        blocks_highlight_groups: formData.blocks_highlight_groups,
        starting_position: formData.starting_position
      };

      await onGroupCreate(createRequest);
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create highlight group');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        description: '',
        category: '',
        content_files: [],
        seasonal_batches: [],
        maintenance_frequency_weeks: 3,
        content_per_maintenance: 2,
        seasonal_months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        blocks_sprint_types: [],
        blocks_highlight_groups: [],
        starting_position: 1,
        auto_reorder: true
      });
      setCurrentStep(1);
      setSubmitError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Highlight Group</h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    currentStep > step.id
                      ? 'bg-green-500 border-green-500 text-white'
                      : currentStep === step.id
                      ? 'bg-blue-500 border-blue-500 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check size={16} />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className="mx-4 h-0.5 w-12 bg-gray-300"></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Travel Adventures, Fitness Journey"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a category</option>
                  <option value="travel">Travel</option>
                  <option value="fitness">Fitness</option>
                  <option value="lifestyle">Lifestyle</option>
                  <option value="professional">Professional</option>
                  <option value="food">Food</option>
                  <option value="fashion">Fashion</option>
                  <option value="home">Home & Decor</option>
                  <option value="pets">Pets</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of this highlight group..."
                />
              </div>

              {validateStep1().length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {validateStep1().map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Content Pool */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Upload *
                </label>
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">Content Files ({formData.content_files.length}/100)</h4>
                  <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}`}>
                    <input {...getInputProps()} />
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">Drag & drop files here, or click to select files</p>
                    <p className="text-xs text-gray-500">Images and videos supported, up to 50MB each.</p>
                  </div>
                  
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="contentFiles">
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-2">
                          {formData.content_files.map((file, index) => (
                            <Draggable key={file.name + index} draggableId={file.name + index} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="flex items-center justify-between bg-gray-50 p-2 rounded-md border"
                                >
                                  <div className="flex items-center space-x-2">
                                    <GripVertical className="h-5 w-5 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700 truncate w-60">{file.name}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-500">{Math.round(file.size / 1024)} KB</span>
                                    <button
                                      type="button"
                                      onClick={() => removeFile(index)}
                                      className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </DragDropContext>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Seasonal Batches
                  </label>
                  <button
                    onClick={addSeasonalBatch}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Plus size={14} className="mr-1" />
                    Add Batch
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Organize content into seasonal batches for targeted posting
                </p>

                {formData.seasonal_batches.map((batch, index) => (
                  <div key={batch.id} className="border rounded-lg p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <input
                        type="text"
                        value={batch.name}
                        onChange={(e) => updateSeasonalBatch(index, { name: e.target.value })}
                        placeholder="Batch name (e.g., Summer 2024)"
                        className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm"
                      />
                      <button
                        onClick={() => removeSeasonalBatch(index)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                        <label key={month} className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={batch.months.includes(month)}
                            onChange={(e) => {
                              const months = e.target.checked
                                ? [...batch.months, month]
                                : batch.months.filter(m => m !== month);
                              updateSeasonalBatch(index, { months });
                            }}
                            className="mr-2 rounded"
                          />
                          {new Date(2024, month - 1).toLocaleDateString('en', { month: 'short' })}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {validateStep2().length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {validateStep2().map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Maintenance Schedule */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Maintenance Frequency *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.maintenance_frequency_weeks}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        maintenance_frequency_weeks: parseInt(e.target.value) || 1 
                      }))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-600">weeks</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Recommended: 2-4 weeks</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Per Maintenance *
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min="1"
                      max="5"
                      value={formData.content_per_maintenance}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        content_per_maintenance: parseInt(e.target.value) || 1 
                      }))}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <span className="text-sm text-gray-600">items</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">How many items to refresh each time</p>
                </div>
              </div>

              {/* Seasonal months */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Seasonal Availability
                  <span title="Select the months this group can post content. Leave empty for all year.">
                    <Info
                      size={14}
                      className="inline ml-1 text-gray-400 cursor-pointer"
                    />
                  </span>
                </label>
                <MonthSelector
                  selectedMonths={formData.seasonal_months}
                  onChange={(months) => setFormData(prev => ({ ...prev, seasonal_months: months }))}
                />
              </div>

              {validateStep3().length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {validateStep3().map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Blocking Rules */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">About Blocking Rules</h3>
                    <p className="mt-1 text-sm text-blue-700">
                      Blocking rules prevent conflicts between this highlight group and other content sprints or highlight groups.
                      This ensures your content strategy remains coherent and avoids contradictory messaging.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Block Sprint Types
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Select sprint types that should not run while this highlight group is active
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['vacation', 'university', 'home', 'work', 'fitness', 'travel', 'lifestyle', 'professional'].map(type => (
                    <label key={type} className="flex items-center text-sm">
                      <input
                        type="checkbox"
                        checked={formData.blocks_sprint_types.includes(type)}
                        onChange={(e) => {
                          const types = e.target.checked
                            ? [...formData.blocks_sprint_types, type]
                            : formData.blocks_sprint_types.filter(t => t !== type);
                          setFormData(prev => ({ ...prev, blocks_sprint_types: types }));
                        }}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Block Other Highlight Groups
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Select other highlight groups that should not be active at the same time
                </p>
                {existingGroups.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3">
                    {existingGroups.map(group => (
                      <label key={group.id} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={formData.blocks_highlight_groups.includes(group.id)}
                          onChange={(e) => {
                            const groups = e.target.checked
                              ? [...formData.blocks_highlight_groups, group.id]
                              : formData.blocks_highlight_groups.filter(id => id !== group.id);
                            setFormData(prev => ({ ...prev, blocks_highlight_groups: groups }));
                          }}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">{group.name}</span>
                        <span className="ml-2 text-gray-500">({group.category})</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No other highlight groups exist yet</p>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Position Settings */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Starting Position *
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Choose the initial position for this highlight group (1 = first, most visible)
                </p>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.starting_position}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    starting_position: parseInt(e.target.value) || 1 
                  }))}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={formData.auto_reorder}
                    onChange={(e) => setFormData(prev => ({ ...prev, auto_reorder: e.target.checked }))}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium">Enable automatic reordering</span>
                </label>
                <p className="text-sm text-gray-500 ml-6 mt-1">
                  When enabled, newer highlight groups will automatically move to position 1, 
                  and this group's position will adjust accordingly.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                  <Info className="h-5 w-5 text-yellow-500 mt-0.5" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">Position Management</h3>
                    <p className="mt-1 text-sm text-yellow-700">
                      You can manually adjust positions later using the Position Manager. 
                      The system will detect and resolve any position conflicts automatically.
                    </p>
                  </div>
                </div>
              </div>

              {validateStep5().length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                        {validateStep5().map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              canGoPrev
                ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                : 'text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed'
            }`}
          >
            <ChevronLeft size={16} />
            <span>Previous</span>
          </button>

          <div className="text-sm text-gray-500">
            Step {currentStep} of {steps.length}
          </div>

          {currentStep < 5 ? (
            <button
              onClick={goNext}
              disabled={!canGoNext}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
                canGoNext
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !canGoNext}
              className={`flex items-center space-x-2 px-6 py-2 rounded-lg ${
                isSubmitting || !canGoNext
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Create Group</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Submit Error */}
        {submitError && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="ml-2 text-sm text-red-700">{submitError}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HighlightGroupCreationWizard; 