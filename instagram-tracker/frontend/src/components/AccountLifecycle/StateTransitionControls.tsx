import React, { useState } from 'react';
import { ChevronDown, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  AccountLifecycleState, 
  getAvailableTransitions, 
  getStateConfig,
  StateValidationResult 
} from '../../types/lifecycle';
import StateIndicator from './StateIndicator';

interface StateTransitionControlsProps {
  accountId: number;
  currentState: AccountLifecycleState;
  onStateChanged?: (newState: AccountLifecycleState) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface TransitionConfirmationProps {
  isOpen: boolean;
  fromState: AccountLifecycleState;
  toState: AccountLifecycleState;
  validation?: StateValidationResult;
  onConfirm: (notes?: string, force?: boolean) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const TransitionConfirmation: React.FC<TransitionConfirmationProps> = ({
  isOpen,
  fromState,
  toState,
  validation,
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  const [notes, setNotes] = useState('');
  const [force, setForce] = useState(false);

  if (!isOpen) return null;

  const fromConfig = getStateConfig(fromState);
  const toConfig = getStateConfig(toState);
  const hasErrors = validation && !validation.isValid;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Confirm State Transition
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-center gap-4 mb-4">
              <StateIndicator state={fromState} size="lg" />
              <div className="text-gray-400">→</div>
              <StateIndicator state={toState} size="lg" />
            </div>
            
            <p className="text-sm text-gray-600 text-center">
              Transition account from <strong>{fromConfig.label}</strong> to <strong>{toConfig.label}</strong>
            </p>
          </div>

          {hasErrors && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-red-800 mb-2">
                    Validation Issues
                  </h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {validation?.errors.map((error, index) => (
                      <li key={index}>• {error.message}</li>
                    ))}
                  </ul>
                  {validation?.missingRequirements.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-800">Missing Requirements:</p>
                      <ul className="text-sm text-red-700">
                        {validation.missingRequirements.map((req, index) => (
                          <li key={index}>• {req}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="force-transition"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <label htmlFor="force-transition" className="text-sm text-red-700">
                  Force transition (skip validation)
                </label>
              </div>
            </div>
          )}

          <div className="mb-6">
            <label htmlFor="transition-notes" className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional)
            </label>
            <textarea
              id="transition-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this transition..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm(notes || undefined, force)}
              disabled={isLoading || (hasErrors && !force)}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Transitioning...' : 'Confirm Transition'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StateTransitionControls: React.FC<StateTransitionControlsProps> = ({
  accountId,
  currentState,
  onStateChanged,
  disabled = false,
  size = 'md'
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedState, setSelectedState] = useState<AccountLifecycleState | null>(null);
  const [validation, setValidation] = useState<StateValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const availableTransitions = getAvailableTransitions(currentState);

  const handleStateSelect = async (newState: AccountLifecycleState) => {
    setIsDropdownOpen(false);
    setSelectedState(newState);
    setIsLoading(true);

    try {
      // Validate the transition
      const response = await fetch(`/api/accounts/lifecycle/${accountId}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ target_state: newState }),
      });

      const result = await response.json();
      
      if (result.success) {
        setValidation(result.data);
        setShowConfirmation(true);
      } else {
        toast.error('Failed to validate transition');
      }
    } catch (error) {
      console.error('Error validating transition:', error);
      toast.error('Failed to validate transition');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmTransition = async (notes?: string, force?: boolean) => {
    if (!selectedState) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/accounts/lifecycle/${accountId}/transition`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to_state: selectedState,
          notes,
          force
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Account state updated successfully');
        onStateChanged?.(selectedState);
        setShowConfirmation(false);
        setSelectedState(null);
        setValidation(null);
      } else {
        toast.error(result.message || 'Failed to update account state');
      }
    } catch (error) {
      console.error('Error transitioning state:', error);
      toast.error('Failed to update account state');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTransition = () => {
    setShowConfirmation(false);
    setSelectedState(null);
    setValidation(null);
  };

  if (availableTransitions.length === 0) {
    // No transitions available, just show current state
    return <StateIndicator state={currentState} size={size} />;
  }

  const buttonSizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={disabled || isLoading}
        className={`inline-flex items-center gap-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${buttonSizes[size]}`}
      >
        <StateIndicator state={currentState} showLabel={false} size={size} />
        <span className="font-medium text-gray-700">
          {getStateConfig(currentState).label}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </button>

      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
              Available Transitions
            </div>
            {availableTransitions.map((state) => {
              const config = getStateConfig(state);
              return (
                <button
                  key={state}
                  onClick={() => handleStateSelect(state)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 flex items-center gap-2"
                >
                  <StateIndicator state={state} showLabel={false} size="sm" />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}

      {/* Confirmation Dialog */}
      {selectedState && (
        <TransitionConfirmation
          isOpen={showConfirmation}
          fromState={currentState}
          toState={selectedState}
          validation={validation || undefined}
          onConfirm={handleConfirmTransition}
          onCancel={handleCancelTransition}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default StateTransitionControls; 