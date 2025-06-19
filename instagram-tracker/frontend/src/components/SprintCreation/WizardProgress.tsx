import React from 'react';
import { Check, Circle } from 'lucide-react';
import { WizardProgressProps, WizardStep } from '../../types/sprintCreation';

const WizardProgress: React.FC<WizardProgressProps> = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick
}) => {
  return (
    <div className="flex items-center justify-center w-full">
      <div className="flex items-center space-x-8">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = index === currentStep;
          const isAccessible = index <= currentStep || isCompleted;
          
          return (
            <div key={step.id} className="flex items-center">
              {/* Step indicator */}
              <button
                onClick={() => isAccessible && onStepClick(index)}
                disabled={!isAccessible}
                className={`
                  relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-200
                  ${isCurrent
                    ? 'border-primary-600 bg-primary-600 text-white shadow-lg scale-110'
                    : isCompleted
                    ? 'border-green-500 bg-green-500 text-white hover:scale-105'
                    : isAccessible
                    ? 'border-gray-300 bg-white text-gray-600 hover:border-primary-300 hover:bg-primary-50'
                    : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isCompleted ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <span className="text-2xl">{step.icon}</span>
                )}
                
                {/* Pulse animation for current step */}
                {isCurrent && (
                  <div className="absolute inset-0 rounded-full border-2 border-primary-400 animate-ping opacity-75" />
                )}
              </button>
              
              {/* Step label */}
              <div className="ml-4 text-left">
                <div className={`text-sm font-medium ${
                  isCurrent ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {step.title}
                </div>
                <div className={`text-xs ${
                  isCurrent ? 'text-primary-500' : 'text-gray-500'
                }`}>
                  {step.description}
                </div>
                {step.isOptional && (
                  <div className="text-xs text-gray-400 italic">Optional</div>
                )}
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className={`ml-8 w-16 h-0.5 transition-colors ${
                  isCompleted ? 'bg-green-300' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WizardProgress; 