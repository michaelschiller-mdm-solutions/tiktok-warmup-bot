import React from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { CompatibilityIndicatorProps } from '../../types/campaignPools';

const CompatibilityIndicator: React.FC<CompatibilityIndicatorProps> = ({
  report,
  size = 'md',
  showDetails = false,
  onClick
}) => {
  // Determine overall compatibility status
  const getCompatibilityStatus = (): { 
    status: 'compatible' | 'incompatible' | 'warning' | 'unknown';
    color: 'red' | 'yellow' | 'green' | 'gray';
    icon: typeof AlertTriangle | typeof CheckCircle | typeof AlertCircle | typeof Info;
  } => {
    if (!report) {
      return { status: 'unknown', color: 'gray', icon: Info };
    }

    if (report.blocking_conflicts.length > 0) {
      return { status: 'incompatible', color: 'red', icon: AlertTriangle };
    }

    if (report.seasonal_issues.length > 0 || report.duration_warnings.length > 0) {
      return { status: 'warning', color: 'yellow', icon: AlertCircle };
    }

    return { status: 'compatible', color: 'green', icon: CheckCircle };
  };

  // Get size classes
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-6 h-6',
          icon: 'h-3 w-3',
          text: 'text-xs'
        };
      case 'lg':
        return {
          container: 'w-10 h-10',
          icon: 'h-5 w-5',
          text: 'text-base'
        };
      default: // md
        return {
          container: 'w-8 h-8',
          icon: 'h-4 w-4',
          text: 'text-sm'
        };
    }
  };

  const { status, color, icon: IconComponent } = getCompatibilityStatus();
  const sizeClasses = getSizeClasses();

  // Color mappings
  const colorClasses = {
    red: {
      bg: 'bg-red-100',
      text: 'text-red-600',
      border: 'border-red-200'
    },
    yellow: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-600',
      border: 'border-yellow-200'
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      border: 'border-green-200'
    },
    gray: {
      bg: 'bg-gray-100',
      text: 'text-gray-600',
      border: 'border-gray-200'
    }
  };

  const colors = colorClasses[color];

  // Status labels
  const statusLabels = {
    compatible: 'Compatible',
    incompatible: 'Incompatible',
    warning: 'Warnings',
    unknown: 'Unknown'
  };

  return (
    <div className="compatibility-indicator">
      {/* Main indicator */}
      <div
        className={`
          ${sizeClasses.container} 
          ${colors.bg} 
          ${colors.border} 
          border rounded-full flex items-center justify-center
          ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        `}
        onClick={onClick}
        title={report ? `Compatibility: ${statusLabels[status]}` : 'Compatibility unknown'}
      >
        <IconComponent className={`${sizeClasses.icon} ${colors.text}`} />
      </div>

      {/* Detailed information */}
      {showDetails && report && (
        <div className="mt-2 space-y-1">
          <div className={`${sizeClasses.text} font-medium ${colors.text}`}>
            {statusLabels[status]}
          </div>
          
          {/* Score */}
          {report.compatibility_score !== undefined && (
            <div className={`${sizeClasses.text} text-gray-600`}>
              Score: {Math.round(report.compatibility_score * 100)}%
            </div>
          )}

          {/* Issue counts */}
          <div className={`${sizeClasses.text} text-gray-500 space-y-1`}>
            {report.blocking_conflicts.length > 0 && (
              <div className="flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3 text-red-500" />
                <span>{report.blocking_conflicts.length} blocking conflicts</span>
              </div>
            )}
            
            {report.seasonal_issues.length > 0 && (
              <div className="flex items-center space-x-1">
                <AlertCircle className="h-3 w-3 text-yellow-500" />
                <span>{report.seasonal_issues.length} seasonal issues</span>
              </div>
            )}
            
            {report.duration_warnings.length > 0 && (
              <div className="flex items-center space-x-1">
                <Info className="h-3 w-3 text-blue-500" />
                <span>{report.duration_warnings.length} duration warnings</span>
              </div>
            )}

            {report.account_eligibility_count > 0 && (
              <div className="text-green-600">
                {report.account_eligibility_count} eligible accounts
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompatibilityIndicator; 