import React from 'react';
import { CheckCircle, Clock, MapPin, Calendar, FileText, Sparkles } from 'lucide-react';
import { StepProps } from '../../../types/sprintCreation';

const PreviewStep: React.FC<StepProps> = ({
  data,
  onChange,
  errors,
  onStepComplete,
  isActive
}) => {
  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days} days`;
    return `${days} days ${remainingHours} hours`;
  };

  const getSprintTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      'vacation': '🏖️',
      'university': '🎓',
      'lifestyle': '✨',
      'work': '💼',
      'fitness': '💪'
    };
    return icons[type] || '📱';
  };

  const contentCount = data.content_items?.length || 0;
  const blockingRulesCount = data.blocking_rules?.length || 0;

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-4">🚀</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Ready to Launch!</h2>
        <p className="text-gray-600 text-lg">
          Review your sprint configuration and create when ready
        </p>
      </div>

      {/* Sprint Summary Card */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 border border-primary-200 rounded-xl p-8">
        <div className="flex items-center mb-6">
          <div className="text-4xl mr-4">{getSprintTypeIcon(data.sprint_type || '')}</div>
          <div>
            <h3 className="text-2xl font-bold text-primary-900">{data.name}</h3>
            {data.description && (
              <p className="text-primary-700 mt-1">{data.description}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Sprint Type */}
          <div className="bg-white/70 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Sparkles className="w-5 h-5 text-primary-600 mr-2" />
              <span className="text-sm font-medium text-primary-700">Type</span>
            </div>
            <div className="text-lg font-semibold text-primary-900 capitalize">
              {data.sprint_type}
            </div>
          </div>

          {/* Duration */}
          <div className="bg-white/70 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Clock className="w-5 h-5 text-primary-600 mr-2" />
              <span className="text-sm font-medium text-primary-700">Duration</span>
            </div>
            <div className="text-lg font-semibold text-primary-900">
              {data.target_duration_hours ? formatDuration(data.target_duration_hours) : 'Not set'}
            </div>
          </div>

          {/* Location */}
          <div className="bg-white/70 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <MapPin className="w-5 h-5 text-primary-600 mr-2" />
              <span className="text-sm font-medium text-primary-700">Location</span>
            </div>
            <div className="text-lg font-semibold text-primary-900">
              {data.location || 'Not specified'}
            </div>
          </div>

          {/* Content Items */}
          <div className="bg-white/70 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <FileText className="w-5 h-5 text-primary-600 mr-2" />
              <span className="text-sm font-medium text-primary-700">Content</span>
            </div>
            <div className="text-lg font-semibold text-primary-900">
              {contentCount} items
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Details */}
      <div className="space-y-6">
        <h3 className="text-xl font-semibold text-gray-900">Configuration Details</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h4>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Name:</span>
                <div className="text-gray-900">{data.name}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Type:</span>
                <div className="text-gray-900 capitalize">{data.sprint_type}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Duration:</span>
                <div className="text-gray-900">
                  {data.target_duration_hours ? formatDuration(data.target_duration_hours) : 'Not set'}
                </div>
              </div>
              {data.location && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Location:</span>
                  <div className="text-gray-900">{data.location}</div>
                </div>
              )}
              {data.description && (
                <div>
                  <span className="text-sm font-medium text-gray-600">Description:</span>
                  <div className="text-gray-900">{data.description}</div>
                </div>
              )}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Advanced Settings</h4>
            <div className="space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-600">Content Items:</span>
                <div className="text-gray-900">{contentCount} uploaded</div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Blocking Rules:</span>
                <div className="text-gray-900">{blockingRulesCount} configured</div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-600">Seasonal Period:</span>
                <div className="text-gray-900">
                  {data.seasonal_start && data.seasonal_end 
                    ? `${new Date(data.seasonal_start).toLocaleDateString()} - ${new Date(data.seasonal_end).toLocaleDateString()}`
                    : 'Year-round'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Status */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Validation Status</h4>
        
        <div className="space-y-3">
          {/* Required Fields Check */}
          <div className="flex items-center">
            {data.name && data.sprint_type && data.target_duration_hours ? (
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3" />
            )}
            <span className={`font-medium ${
              data.name && data.sprint_type && data.target_duration_hours 
                ? 'text-green-700' 
                : 'text-gray-700'
            }`}>
              Required fields completed
            </span>
          </div>

          {/* Content Check */}
          <div className="flex items-center">
            {contentCount > 0 ? (
              <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-yellow-400 mr-3" />
            )}
            <span className={`font-medium ${
              contentCount > 0 ? 'text-green-700' : 'text-yellow-700'
            }`}>
              Content uploaded ({contentCount > 0 ? 'optional but recommended' : 'none yet'})
            </span>
          </div>

          {/* No Conflicts */}
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-3" />
            <span className="font-medium text-green-700">
              No conflicts detected
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200">
        <div className="text-sm text-gray-600">
          Once created, you can still edit your sprint configuration
        </div>
        
        <div className="text-sm text-green-700 font-medium">
          ✅ Ready to create sprint
        </div>
      </div>

      {/* Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="font-semibold text-blue-900 mb-3">🎯 Final Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Your sprint will be created in draft status and can be activated later</li>
          <li>• You can add more content and modify settings after creation</li>
          <li>• Test your sprint with a small account first before full deployment</li>
          <li>• Monitor performance and adjust timing based on results</li>
        </ul>
      </div>
    </div>
  );
};

export default PreviewStep; 