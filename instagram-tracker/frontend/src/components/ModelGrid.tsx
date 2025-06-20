import React from 'react';
import { Model } from '../types/models';
import ModelCard from './ModelCard';

interface ModelGridProps {
  models: Model[];
  selectedModels?: Set<number>;
  onSelectionChange?: (selectedIds: Set<number>) => void;
  onEdit?: (model: Model) => void;
  onDelete?: (model: Model) => void;
  onCreate?: () => void;
  className?: string;
}

const ModelGrid: React.FC<ModelGridProps> = ({ 
  models, 
  selectedModels = new Set(),
  onSelectionChange,
  onEdit, 
  onDelete,
  onCreate,
  className = '' 
}) => {
  const handleModelSelect = (modelId: number, selected: boolean) => {
    if (!onSelectionChange) return;
    
    const newSelection = new Set(selectedModels);
    if (selected) {
      newSelection.add(modelId);
    } else {
      newSelection.delete(modelId);
    }
    onSelectionChange(newSelection);
  };

  if (models.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <div className="text-gray-400 text-6xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No models found</h3>
        <p className="text-gray-500 mb-6">Get started by creating your first model/campaign.</p>
        <button 
          onClick={onCreate}
          className="btn-primary"
        >
          Create Model
        </button>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
      {models.map((model) => (
        <ModelCard
          key={model.id}
          model={model}
          isSelected={selectedModels.has(model.id)}
          onSelect={onSelectionChange ? (selected) => handleModelSelect(model.id, selected) : undefined}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

export default ModelGrid; 