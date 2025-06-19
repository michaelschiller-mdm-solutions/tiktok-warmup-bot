import React, { useState, useCallback, useMemo } from 'react';
import { StepProps, BlockingRule, ConflictWarning } from '../../../types/sprintCreation';

interface ExistingSprint {
  id: number;
  name: string;
  sprint_type: string;
  location?: string;
  is_highlight_group: boolean;
  description: string;
  target_duration_hours: number;
}

const ConflictRulesStep: React.FC<StepProps> = ({
  data,
  onChange,
  errors,
  onStepComplete,
  isActive
}) => {
  const [selectedSprints, setSelectedSprints] = useState<number[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [rulePreview, setRulePreview] = useState<string>('');

  // Mock existing sprints - in real app, this would come from API
  const existingSprints: ExistingSprint[] = [
    { id: 1, name: 'Jamaica Vacation', sprint_type: 'vacation', location: 'jamaica', is_highlight_group: false, description: 'Vacation content from Jamaica', target_duration_hours: 168 },
    { id: 2, name: 'Germany University', sprint_type: 'university', location: 'germany', is_highlight_group: false, description: 'University life in Germany', target_duration_hours: 720 },
    { id: 3, name: 'Home Lifestyle', sprint_type: 'lifestyle', location: 'home', is_highlight_group: false, description: 'Daily lifestyle content', target_duration_hours: 240 },
    { id: 4, name: 'Work Content', sprint_type: 'work', location: 'office', is_highlight_group: false, description: 'Professional work content', target_duration_hours: 120 },
    { id: 5, name: 'Travel Highlights', sprint_type: 'travel', location: undefined, is_highlight_group: true, description: 'Travel highlight collection', target_duration_hours: 0 },
    { id: 6, name: 'Fitness Journey', sprint_type: 'fitness', location: 'gym', is_highlight_group: true, description: 'Fitness journey highlights', target_duration_hours: 0 },
  ];

  const blockingRules = data.blocking_rules || [];

  // Smart blocking suggestions based on sprint type and location
  const getSmartSuggestions = useCallback((): ExistingSprint[] => {
    const suggestions: ExistingSprint[] = [];
    const currentType = data.sprint_type;
    const currentLocation = data.location;

    existingSprints.forEach(sprint => {
      // Location conflicts (can't be in two places at once)
      if (currentLocation && sprint.location && currentLocation !== sprint.location) {
        suggestions.push(sprint);
      }
      
      // Type-based conflicts
      if (currentType === 'vacation' && sprint.sprint_type === 'work') {
        suggestions.push(sprint);
      }
      if (currentType === 'work' && sprint.sprint_type === 'vacation') {
        suggestions.push(sprint);
      }
      if (currentType === 'university' && sprint.sprint_type === 'work') {
        suggestions.push(sprint);
      }
    });

    return suggestions.filter((sprint, index, arr) => 
      arr.findIndex(s => s.id === sprint.id) === index
    );
  }, [data.sprint_type, data.location, existingSprints]);

  const smartSuggestions = getSmartSuggestions();

  // Detect conflicts in current configuration
  const detectConflicts = useCallback((): ConflictWarning[] => {
    const conflicts: ConflictWarning[] = [];
    const currentType = data.sprint_type;
    const currentLocation = data.location;

    blockingRules.forEach((rule, ruleIndex) => {
      const blockedSprint = existingSprints.find(s => s.id === rule.blocked_sprint_id);
      if (!blockedSprint) return;

      // Check for circular dependencies
      const reverseRule = blockingRules.find(r => 
        r.blocked_sprint_id === data.id && blockedSprint.id === data.id
      );
      
      if (reverseRule) {
        conflicts.push({
          id: `circular_${rule.id || ruleIndex}`,
          severity: 'error',
          type: 'blocking_rule',
          title: 'Circular Blocking Detected',
          description: `${data.name} and ${blockedSprint.name} block each other`,
          suggestedResolution: 'Remove one of the blocking rules to prevent deadlock'
        });
      }

      // Check for redundant location-based rules
      if (currentLocation && blockedSprint.location && 
          currentLocation !== blockedSprint.location) {
        conflicts.push({
          id: `redundant_${rule.id || ruleIndex}`,
          severity: 'warning',
          type: 'blocking_rule',
          title: 'Redundant Location Rule',
          description: `${blockedSprint.name} is already blocked by location (${blockedSprint.location} vs ${currentLocation})`,
          suggestedResolution: 'This rule may be unnecessary due to location conflict'
        });
      }
    });

    return conflicts;
  }, [blockingRules, data, existingSprints]);

  const conflicts = detectConflicts();

  // Add blocking rule
  const addBlockingRule = useCallback((sprintId: number, ruleType: 'before' | 'after' | 'during' | 'not_during' = 'during') => {
    const blockedSprint = existingSprints.find(s => s.id === sprintId);
    if (!blockedSprint) return;

    const newRule: BlockingRule = {
      blocked_sprint_id: sprintId,
      rule_type: ruleType,
      description: `Blocks ${blockedSprint.name} ${ruleType === 'during' ? 'while active' : ruleType}`,
      blocked_sprint: blockedSprint
    };

    const updatedRules = [...blockingRules, newRule];
    onChange({
      ...data,
      blocking_rules: updatedRules
    });
  }, [blockingRules, data, onChange, existingSprints]);

  // Remove blocking rule
  const removeBlockingRule = useCallback((sprintId: number) => {
    const updatedRules = blockingRules.filter(rule => rule.blocked_sprint_id !== sprintId);
    onChange({
      ...data,
      blocking_rules: updatedRules
    });
  }, [blockingRules, data, onChange]);

  // Apply smart suggestions
  const applySmartSuggestions = useCallback(() => {
    const newRules = [...blockingRules];
    
    smartSuggestions.forEach(sprint => {
      const existingRule = blockingRules.find(rule => rule.blocked_sprint_id === sprint.id);
      if (!existingRule) {
        newRules.push({
          blocked_sprint_id: sprint.id,
          rule_type: 'during',
          description: `Auto-suggested: Blocks ${sprint.name} due to conflict`,
          blocked_sprint: sprint
        });
      }
    });

    onChange({
      ...data,
      blocking_rules: newRules
    });
  }, [smartSuggestions, blockingRules, data, onChange]);

  // Rule preview text
  const generateRulePreview = useCallback((sprint: ExistingSprint, ruleType: string) => {
    const sprintName = data.name || 'This sprint';
    switch (ruleType) {
      case 'during':
        return `${sprintName} cannot run while ${sprint.name} is active`;
      case 'before':
        return `${sprintName} cannot run before ${sprint.name} starts`;
      case 'after':
        return `${sprintName} cannot run after ${sprint.name} ends`;
      case 'not_during':
        return `${sprintName} can only run while ${sprint.name} is NOT active`;
      default:
        return `${sprintName} blocks ${sprint.name}`;
    }
  }, [data.name]);

  // Validation
  const isStepValid = true; // Basic step is always valid

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Blocking Rules</h2>
        <p className="text-gray-600">
          Prevent conflicts by defining which sprints cannot run simultaneously
        </p>
      </div>

      {/* Smart Suggestions */}
      {smartSuggestions.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-blue-900">Smart Suggestions</h3>
              <p className="text-sm text-blue-700 mt-1">
                We detected potential conflicts based on your sprint configuration
              </p>
            </div>
            <button
              onClick={applySmartSuggestions}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Apply All
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {smartSuggestions.map(sprint => (
              <div
                key={sprint.id}
                className="flex items-center justify-between p-3 bg-white rounded border border-blue-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-lg">
                    {sprint.is_highlight_group ? '⭐' : 
                     sprint.sprint_type === 'vacation' ? '🏖️' :
                     sprint.sprint_type === 'work' ? '💼' :
                     sprint.sprint_type === 'university' ? '🎓' : '📱'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{sprint.name}</div>
                    <div className="text-xs text-gray-500">
                      {sprint.location && `Location: ${sprint.location}`}
                      {sprint.sprint_type && ` • Type: ${sprint.sprint_type}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => addBlockingRule(sprint.id)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Block
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current Blocking Rules */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Active Blocking Rules ({blockingRules.length})
        </h3>

        {blockingRules.length > 0 ? (
          <div className="space-y-3">
            {blockingRules.map((rule, index) => {
              const blockedSprint = rule.blocked_sprint || 
                existingSprints.find(s => s.id === rule.blocked_sprint_id);
              
              if (!blockedSprint) return null;

              return (
                <div
                  key={`${rule.blocked_sprint_id}_${index}`}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-lg">
                      {'is_highlight_group' in blockedSprint && blockedSprint.is_highlight_group ? '⭐' : '📱'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{blockedSprint.name}</div>
                      <div className="text-sm text-gray-600">{rule.description}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Rule: {rule.rule_type} • 
                        {blockedSprint.location && ` Location: ${blockedSprint.location} •`} 
                        Type: {blockedSprint.sprint_type}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={rule.rule_type}
                      onChange={(e) => {
                        const updatedRules = [...blockingRules];
                        updatedRules[index] = {
                          ...rule,
                          rule_type: e.target.value as any,
                          description: 'is_highlight_group' in blockedSprint 
                            ? generateRulePreview(blockedSprint as ExistingSprint, e.target.value)
                            : `Rule updated for ${blockedSprint.name}`
                        };
                        onChange({ ...data, blocking_rules: updatedRules });
                      }}
                      className="text-xs border border-gray-300 rounded px-2 py-1"
                    >
                      <option value="during">During</option>
                      <option value="before">Before</option>
                      <option value="after">After</option>
                      <option value="not_during">Not During</option>
                    </select>
                    <button
                      onClick={() => removeBlockingRule(rule.blocked_sprint_id)}
                      className="p-1 text-red-400 hover:text-red-600"
                      title="Remove rule"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-lg mb-2">🚫</div>
            <p className="text-gray-500 mb-4">No blocking rules configured</p>
            <p className="text-xs text-gray-400">
              Blocking rules are optional but help prevent conflicting content
            </p>
          </div>
        )}
      </div>

      {/* Available Sprints */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Sprints & Highlights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {existingSprints.map(sprint => {
            const isBlocked = blockingRules.some(rule => rule.blocked_sprint_id === sprint.id);
            const isSuggested = smartSuggestions.some(s => s.id === sprint.id);

            return (
              <div
                key={sprint.id}
                className={`relative p-4 border rounded-lg transition-all cursor-pointer ${
                  isBlocked 
                    ? 'border-red-300 bg-red-50' 
                    : isSuggested
                    ? 'border-blue-300 bg-blue-50 hover:border-blue-400'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => isBlocked ? removeBlockingRule(sprint.id) : addBlockingRule(sprint.id)}
              >
                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  {isBlocked ? (
                    <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
                      ✗
                    </div>
                  ) : isSuggested ? (
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                      !
                    </div>
                  ) : (
                    <div className="w-6 h-6 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-xs">
                      +
                    </div>
                  )}
                </div>

                <div className="flex items-start space-x-3">
                  <div className="text-2xl">
                    {sprint.is_highlight_group ? '⭐' : 
                     sprint.sprint_type === 'vacation' ? '🏖️' :
                     sprint.sprint_type === 'work' ? '💼' :
                     sprint.sprint_type === 'university' ? '🎓' :
                     sprint.sprint_type === 'fitness' ? '💪' : '📱'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{sprint.name}</h4>
                    <p className="text-sm text-gray-600 capitalize">{sprint.sprint_type}</p>
                    {sprint.location && (
                      <p className="text-xs text-gray-500">{sprint.location}</p>
                    )}
                    {sprint.is_highlight_group && (
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                        Highlight Group
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Text */}
                <div className="mt-3 text-xs">
                  {isBlocked ? (
                    <span className="text-red-600 font-medium">Click to unblock</span>
                  ) : isSuggested ? (
                    <span className="text-blue-600 font-medium">Suggested - Click to block</span>
                  ) : (
                    <span className="text-gray-500">Click to add blocking rule</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conflicts Warning */}
      {conflicts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-medium text-gray-900">Detected Conflicts</h3>
          {conflicts.map((conflict, index) => (
            <div
              key={conflict.id || `conflict-${index}`}
              className={`p-4 rounded-lg border ${
                conflict.severity === 'error' 
                  ? 'bg-red-50 border-red-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    conflict.severity === 'error' ? 'bg-red-400' : 'bg-yellow-400'
                  }`}>
                    <span className="text-white text-xs">
                      {conflict.severity === 'error' ? '⚠️' : '⚠️'}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <h4 className={`text-sm font-medium ${
                    conflict.severity === 'error' ? 'text-red-800' : 'text-yellow-800'
                  }`}>
                    {conflict.title}
                  </h4>
                  <p className={`text-sm ${
                    conflict.severity === 'error' ? 'text-red-700' : 'text-yellow-700'
                  }`}>
                    {conflict.description}
                  </p>
                  {conflict.suggestedResolution && (
                    <p className={`text-xs mt-1 ${
                      conflict.severity === 'error' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      💡 {conflict.suggestedResolution}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advanced Settings */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50"
        >
          <span className="text-lg font-medium text-gray-900">Advanced Conflict Settings</span>
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="px-6 pb-6 border-t border-gray-200 pt-6">
            <div className="space-y-6">
              {/* Global Conflict Settings */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Global Settings</h4>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-600">Auto-detect location conflicts</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-600">Warn about similar content types</span>
                  </label>
                  <label className="flex items-center">
                    <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                    <span className="ml-2 text-sm text-gray-600">Allow emergency content override</span>
                  </label>
                </div>
              </div>

              {/* Priority Settings */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Sprint Priority</h4>
                <select className="w-full border border-gray-300 rounded px-3 py-2">
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority (can override some blocks)</option>
                  <option value="emergency">Emergency Priority (overrides all blocks)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Higher priority sprints can override lower priority blocking rules
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-gray-900">About Blocking Rules</h4>
            <p className="text-sm text-gray-600 mt-1">
              Blocking rules prevent content conflicts by ensuring certain sprints cannot run simultaneously. 
              For example, vacation content shouldn't post while work sprints are active, or accounts can't 
              be in Jamaica and Germany at the same time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictRulesStep; 