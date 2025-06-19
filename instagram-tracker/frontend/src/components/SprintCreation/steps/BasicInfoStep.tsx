import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Info, Sparkles, Plus, Tag } from 'lucide-react';
import { StepProps, SprintTypeOption } from '../../../types/sprintCreation';
import { apiClient } from '../../../services/api';

// Base sprint type options - will be expanded with API data
const BASE_SPRINT_TYPES: SprintTypeOption[] = [
  {
    value: 'vacation',
    label: 'Vacation',
    description: 'Travel and vacation content to showcase destinations',
    icon: '🏖️',
    color: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
    features: ['Travel posts', 'Location tags', 'Lifestyle content']
  },
  {
    value: 'university',
    label: 'University',
    description: 'Student life and academic content',
    icon: '🎓',
    color: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    features: ['Campus life', 'Study content', 'Social activities']
  },
  {
    value: 'lifestyle',
    label: 'Lifestyle',
    description: 'Daily life and personal brand content',
    icon: '✨',
    color: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
    features: ['Daily activities', 'Personal brand', 'Hobbies']
  },
  {
    value: 'work',
    label: 'Work',
    description: 'Professional and career-related content',
    icon: '💼',
    color: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
    features: ['Professional posts', 'Career updates', 'Networking']
  },
  {
    value: 'fitness',
    label: 'Fitness',
    description: 'Health, fitness, and wellness content',
    icon: '💪',
    color: 'bg-red-50 border-red-200 hover:bg-red-100',
    features: ['Workout posts', 'Healthy lifestyle', 'Progress updates']
  }
];

const BasicInfoStep: React.FC<StepProps> = ({
  data,
  onChange,
  errors,
  onStepComplete,
  isActive
}) => {
  const [selectedType, setSelectedType] = useState<string>(data.sprint_type || '');
  const [sprintTypes, setSprintTypes] = useState<SprintTypeOption[]>(BASE_SPRINT_TYPES);
  const [showCustomTypeInput, setShowCustomTypeInput] = useState<boolean>(false);
  const [customTypeName, setCustomTypeName] = useState<string>('');
  const [isLoadingTypes, setIsLoadingTypes] = useState<boolean>(false);

  // Load sprint types from API
  useEffect(() => {
    const loadSprintTypes = async () => {
      try {
        setIsLoadingTypes(true);
        const response = await apiClient.getSprintTypes();
        
        // Combine predefined and custom types
        const allTypes = [
          ...response.predefined.map((type: any) => ({
            ...type,
            color: getColorForType(type.value),
            features: type.features || []
          })),
          ...response.custom.map((type: any) => ({
            ...type,
            color: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
            features: [],
            isCustom: true
          }))
        ];
        
        setSprintTypes(allTypes);
      } catch (error) {
        console.error('Failed to load sprint types:', error);
        // Fall back to base types
        setSprintTypes(BASE_SPRINT_TYPES);
      } finally {
        setIsLoadingTypes(false);
      }
    };

    loadSprintTypes();
  }, []);

  // Helper to get color for predefined types
  const getColorForType = (type: string): string => {
    const colorMap: Record<string, string> = {
      vacation: 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100',
      university: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      home: 'bg-purple-50 border-purple-200 hover:bg-purple-100',
      work: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
      fitness: 'bg-red-50 border-red-200 hover:bg-red-100'
    };
    return colorMap[type] || 'bg-gray-50 border-gray-200 hover:bg-gray-100';
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ name: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ description: e.target.value });
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    onChange({ sprint_type: type });
  };

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hours = parseInt(e.target.value) || 0;
    onChange({ target_duration_hours: hours });
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ location: e.target.value });
  };

  return (
    <div className="p-8 space-y-8">
      {/* Sprint Name */}
      <div className="space-y-3">
        <label className="text-lg font-semibold text-gray-900 block">
          Sprint Name
          <span className="text-red-500 ml-1">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={data.name || ''}
            onChange={handleNameChange}
            placeholder="Enter a descriptive name for your sprint"
            className={`
              w-full px-4 py-3 text-lg border rounded-xl transition-all duration-200
              focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              ${errors.name 
                ? 'border-red-300 bg-red-50' 
                : 'border-gray-300 hover:border-gray-400'
              }
            `}
          />
          {errors.name && (
            <div className="mt-2 text-sm text-red-600 flex items-center">
              <Info className="w-4 h-4 mr-1" />
              {errors.name}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-600">
          Choose a name that clearly identifies the purpose and content of this sprint
        </p>
      </div>

      {/* Sprint Type Selection */}
      <div className="space-y-4">
        <label className="text-lg font-semibold text-gray-900 block">
          Sprint Type
          <span className="text-red-500 ml-1">*</span>
        </label>
        <p className="text-sm text-gray-600">
          Select the type that best describes your sprint content
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprintTypes.map((type: SprintTypeOption) => (
            <button
              key={type.value}
              onClick={() => handleTypeSelect(type.value)}
              className={`
                relative p-6 text-left border-2 rounded-xl transition-all duration-200 group
                ${selectedType === type.value
                  ? 'border-primary-500 bg-primary-50 shadow-lg scale-105'
                  : type.color
                }
              `}
            >
              {/* Selection indicator */}
              {selectedType === type.value && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full" />
                  </div>
                </div>
              )}
              
              {/* Type icon */}
              <div className="text-3xl mb-3">{type.icon}</div>
              
              {/* Type info */}
              <h3 className="font-semibold text-gray-900 mb-2">{type.label}</h3>
              <p className="text-sm text-gray-600 mb-3">{type.description}</p>
              
              {/* Features */}
              {type.features && type.features.length > 0 && (
                <div className="space-y-1">
                  {type.features.map((feature: string, index: number) => (
                    <div key={index} className="flex items-center text-xs text-gray-500">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {feature}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Custom type indicator */}
              {type.isCustom && (
                <div className="flex items-center text-xs text-blue-600 mt-2">
                  <Tag className="w-3 h-3 mr-1" />
                  Custom Type
                  {type.usageCount && (
                    <span className="ml-1 text-gray-500">({type.usageCount} uses)</span>
                  )}
                </div>
              )}
            </button>
          ))}
          
          {/* Add Custom Type Button */}
          <button
            onClick={() => setShowCustomTypeInput(true)}
            className="relative p-6 text-left border-2 border-dashed border-gray-300 rounded-xl transition-all duration-200 hover:border-primary-400 hover:bg-primary-50 group"
          >
            <div className="text-center">
              <Plus className="w-8 h-8 text-gray-400 mx-auto mb-3 group-hover:text-primary-500" />
              <h3 className="font-semibold text-gray-600 group-hover:text-primary-700">Create Custom Type</h3>
              <p className="text-sm text-gray-500 mt-1">Define your own sprint category</p>
            </div>
          </button>
        </div>
        
        {/* Custom Type Input Modal */}
        {showCustomTypeInput && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h4 className="font-semibold text-blue-900 mb-3">Create Custom Sprint Type</h4>
            <div className="space-y-3">
              <input
                type="text"
                value={customTypeName}
                onChange={(e) => setCustomTypeName(e.target.value)}
                placeholder="Enter custom type name (e.g., 'photography', 'gaming')"
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    if (customTypeName.trim()) {
                      handleTypeSelect(customTypeName.trim().toLowerCase());
                      setShowCustomTypeInput(false);
                      setCustomTypeName('');
                    }
                  }}
                  disabled={!customTypeName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create & Select
                </button>
                <button
                  onClick={() => {
                    setShowCustomTypeInput(false);
                    setCustomTypeName('');
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        
        {errors.sprint_type && (
          <div className="text-sm text-red-600 flex items-center">
            <Info className="w-4 h-4 mr-1" />
            {errors.sprint_type}
          </div>
        )}
      </div>

      {/* Duration and Location Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Duration */}
        <div className="space-y-3">
          <label className="text-lg font-semibold text-gray-900 block">
            Target Duration
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="number"
              value={data.target_duration_hours || ''}
              onChange={handleDurationChange}
              placeholder="24"
              min="1"
              max="720"
              className={`
                w-full pl-12 pr-4 py-3 text-lg border rounded-xl transition-all duration-200
                focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                ${errors.target_duration_hours 
                  ? 'border-red-300 bg-red-50' 
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              hours
            </div>
          </div>
          {errors.target_duration_hours && (
            <div className="text-sm text-red-600 flex items-center">
              <Info className="w-4 h-4 mr-1" />
              {errors.target_duration_hours}
            </div>
          )}
          <p className="text-sm text-gray-600">
            How long should this sprint run? (1-720 hours)
          </p>
        </div>

        {/* Location */}
        <div className="space-y-3">
          <label className="text-lg font-semibold text-gray-900 block">
            Location
            <span className="text-gray-400 text-sm font-normal ml-2">(Optional)</span>
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={data.location || ''}
              onChange={handleLocationChange}
              placeholder="e.g., Miami, FL"
              className="
                w-full pl-12 pr-4 py-3 text-lg border border-gray-300 rounded-xl
                hover:border-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
                transition-all duration-200
              "
            />
          </div>
          <p className="text-sm text-gray-600">
            Specify a location for geo-targeted content
          </p>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <label className="text-lg font-semibold text-gray-900 block">
          Description
          <span className="text-gray-400 text-sm font-normal ml-2">(Optional)</span>
        </label>
        <textarea
          value={data.description || ''}
          onChange={handleDescriptionChange}
          placeholder="Describe the purpose and goals of this sprint..."
          rows={4}
          className="
            w-full px-4 py-3 text-lg border border-gray-300 rounded-xl resize-none
            hover:border-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            transition-all duration-200
          "
        />
        <p className="text-sm text-gray-600">
          Provide additional context about what this sprint aims to achieve
        </p>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-2">Sprint Setup Tips</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Choose a descriptive name that identifies the sprint's purpose</li>
              <li>• Select the type that best matches your content strategy</li>
              <li>• Set a realistic duration based on your content volume</li>
              <li>• Add location for geo-targeted campaigns</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfoStep; 