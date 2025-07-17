import React from 'react';
import { 
  Upload, 
  CheckCircle, 
  Clock, 
  Play, 
  Pause, 
  RefreshCw, 
  Archive, 
  Smartphone,
  Settings,
  LucideIcon 
} from 'lucide-react';
import { AccountLifecycleState, getStateConfig } from '../../types/lifecycle';

interface StateIndicatorProps {
  state: AccountLifecycleState;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Icon mapping for lifecycle states
const STATE_ICONS: Record<AccountLifecycleState, LucideIcon> = {
  [AccountLifecycleState.IMPORTED]: Upload,
  [AccountLifecycleState.READY]: CheckCircle,
  [AccountLifecycleState.READY_FOR_BOT_ASSIGNMENT]: Smartphone,
  [AccountLifecycleState.WARMUP]: Clock,
  [AccountLifecycleState.ACTIVE]: Play,
  [AccountLifecycleState.PAUSED]: Pause,
  [AccountLifecycleState.CLEANUP]: RefreshCw,
  [AccountLifecycleState.MAINTENANCE]: Settings,
  [AccountLifecycleState.ARCHIVED]: Archive,
};

const StateIndicator: React.FC<StateIndicatorProps> = ({ 
  state, 
  showLabel = true, 
  size = 'md',
  className = '' 
}) => {
  const config = getStateConfig(state);
  const IconComponent = STATE_ICONS[state];

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (!showLabel) {
    // Icon only mode
    return (
      <div 
        className={`inline-flex items-center justify-center rounded-full ${config.bgColor} ${sizeClasses[size]} ${className}`}
        title={`${config.label}: ${config.description}`}
      >
        <IconComponent className={`${iconSizes[size]} ${config.color}`} />
      </div>
    );
  }

  return (
    <div 
      className={`inline-flex items-center gap-2 rounded-full ${config.bgColor} ${sizeClasses[size]} ${className}`}
      title={config.description}
    >
      <IconComponent className={`${iconSizes[size]} ${config.color}`} />
      <span className={`font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
};

export default StateIndicator; 