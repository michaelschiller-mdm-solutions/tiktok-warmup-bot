import React from 'react';
import { Clock, MapPin, Calendar, Image, AlertTriangle, CheckCircle } from 'lucide-react';
import { SprintSummaryProps } from '../../types/sprintCreation';

const SprintSummary: React.FC<SprintSummaryProps> = ({
  sprintData,
  currentStep,
  validationErrors,
  conflicts
}) => {
  const errorCount = Object.keys(validationErrors).length;
  const conflictCount = conflicts.length;
  const contentCount = sprintData.content_items?.length || 0;

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days}d`;
    return `${days}d ${remainingHours}h`;
  };

  const getSprintTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'vacation': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'university': 'bg-blue-100 text-blue-800 border-blue-200',
      'lifestyle': 'bg-purple-100 text-purple-800 border-purple-200',
      'work': 'bg-gray-100 text-gray-800 border-gray-200',
      'fitness': 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-primary-900">Sprint Overview</h3>
        
        <div>
          <label className="text-sm font-medium text-primary-700 block mb-1">
            Sprint Name
          </label>
          <div className="text-sm text-primary-600 bg-white/50 rounded-lg p-3 border border-primary-200">
            {sprintData.name || (
              <span className="text-gray-400 italic">Not set</span>
            )}
          </div>
        </div>

        {sprintData.sprint_type && (
          <div>
            <label className="text-sm font-medium text-primary-700 block mb-1">
              Type
            </label>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${
              getSprintTypeColor(sprintData.sprint_type)
            }`}>
              {sprintData.sprint_type}
            </div>
          </div>
        )}

        {sprintData.target_duration_hours && (
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-primary-700">
              Duration: {formatDuration(sprintData.target_duration_hours)}
            </span>
          </div>
        )}

        {sprintData.location && (
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-primary-600" />
            <span className="text-sm text-primary-700">
              Location: {sprintData.location}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-primary-800">Status</h4>
        
        {errorCount > 0 ? (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700">
              {errorCount} error{errorCount !== 1 ? 's' : ''} to fix
            </span>
          </div>
        ) : (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">
              No validation errors
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-primary-800">Progress</h4>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-primary-600">Step {currentStep + 1} of 5</span>
            <span className="text-primary-600">{Math.round(((currentStep + 1) / 5) * 100)}%</span>
          </div>
          
          <div className="w-full bg-primary-200 rounded-full h-2">
            <div 
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / 5) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SprintSummary; 