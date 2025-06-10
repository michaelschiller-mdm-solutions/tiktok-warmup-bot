import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  CheckSquare, 
  Square,
  AlertTriangle,
  X
} from 'lucide-react';

import { Model } from '../types/models';
import { apiClient } from '../services/api';
import Modal from './Modal';

interface BulkActionsProps {
  models: Model[];
  selectedModels: Set<number>;
  onSelectionChange: (selectedIds: Set<number>) => void;
  onModelsUpdated: () => void;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  actionType: 'warning' | 'danger';
  confirmText: string;
  details?: string[];
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  actionType,
  confirmText,
  details
}) => {
  const [confirmInput, setConfirmInput] = useState('');
  const requiresConfirmText = actionType === 'danger';
  const canConfirm = !requiresConfirmText || confirmInput === confirmText;

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
      setConfirmInput('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`p-3 rounded-lg ${
            actionType === 'danger' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'
          }`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-600">{message}</p>
          </div>
        </div>

        {details && details.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Affected models:</p>
            <ul className="text-sm text-gray-600 space-y-1">
              {details.map((detail, index) => (
                <li key={index}>• {detail}</li>
              ))}
            </ul>
          </div>
        )}

        {requiresConfirmText && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type "{confirmText}" to confirm this action:
            </label>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="form-input w-full"
              placeholder={confirmText}
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`${
              actionType === 'danger' ? 'btn-danger' : 'btn-warning'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {actionType === 'danger' ? 'Delete' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const BulkActions: React.FC<BulkActionsProps> = ({
  models,
  selectedModels,
  onSelectionChange,
  onModelsUpdated
}) => {
  const [isOperating, setIsOperating] = useState(false);
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'warning' | 'danger';
    confirmText: string;
    details?: string[];
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    actionType: 'warning',
    confirmText: '',
    action: async () => {}
  });

  const selectedModelsList = models.filter(model => selectedModels.has(model.id));
  const hasSelection = selectedModels.size > 0;
  const allSelected = models.length > 0 && selectedModels.size === models.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(models.map(m => m.id)));
    }
  };

  const handleBulkStatusChange = async (newStatus: 'active' | 'paused' | 'inactive') => {
    const actionMap = {
      active: 'activate',
      paused: 'pause',
      inactive: 'deactivate'
    };

    setConfirmationModal({
      isOpen: true,
      title: `${actionMap[newStatus].charAt(0).toUpperCase() + actionMap[newStatus].slice(1)} Models`,
      message: `Are you sure you want to ${actionMap[newStatus]} ${selectedModels.size} model(s)?`,
      actionType: 'warning',
      confirmText: 'CONFIRM',
      details: selectedModelsList.map(m => `${m.name} (currently ${m.status})`),
      action: async () => {
        setIsOperating(true);
        try {
          const promises = selectedModelsList.map(model =>
            apiClient.updateModel(model.id, { status: newStatus })
          );
          
          await Promise.all(promises);
          toast.success(`Successfully ${actionMap[newStatus]}d ${selectedModels.size} model(s)`);
          onSelectionChange(new Set());
          onModelsUpdated();
        } catch (error: any) {
          console.error(`Failed to ${actionMap[newStatus]} models:`, error);
          toast.error(`Failed to ${actionMap[newStatus]} some models`);
        } finally {
          setIsOperating(false);
        }
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmationModal({
      isOpen: true,
      title: `Delete Models`,
      message: `You are about to permanently delete ${selectedModels.size} model(s) and all their associated data. This action cannot be undone.`,
      actionType: 'danger',
      confirmText: 'DELETE',
      details: selectedModelsList.map(m => `${m.name} (${m.account_count || 0} accounts)`),
      action: async () => {
        setIsOperating(true);
        try {
          const promises = selectedModelsList.map(model =>
            apiClient.deleteModel(model.id)
          );
          
          await Promise.all(promises);
          toast.success(`Successfully deleted ${selectedModels.size} model(s)`);
          onSelectionChange(new Set());
          onModelsUpdated();
        } catch (error: any) {
          console.error('Failed to delete models:', error);
          toast.error('Failed to delete some models');
        } finally {
          setIsOperating(false);
        }
      }
    });
  };

  const handleBulkExport = () => {
    setConfirmationModal({
      isOpen: true,
      title: `Export Models`,
      message: `Export data for ${selectedModels.size} model(s) including accounts and statistics.`,
      actionType: 'warning',
      confirmText: 'EXPORT',
      details: selectedModelsList.map(m => m.name),
      action: async () => {
        // TODO: Implement actual export functionality
        toast.success(`Export for ${selectedModels.size} model(s) started - feature coming soon!`);
        onSelectionChange(new Set());
      }
    });
  };

  if (!hasSelection) {
    return null;
  }

  return (
    <>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-2 text-blue-700 hover:text-blue-800"
            >
              {allSelected ? 
                <CheckSquare className="h-4 w-4" /> : 
                <Square className="h-4 w-4" />
              }
              {selectedModels.size} selected
            </button>
            
            <span className="text-blue-600">|</span>
            
            <button
              onClick={() => onSelectionChange(new Set())}
              className="text-blue-700 hover:text-blue-800 flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkStatusChange('active')}
              disabled={isOperating}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Play className="h-3 w-3" />
              Activate
            </button>
            
            <button
              onClick={() => handleBulkStatusChange('paused')}
              disabled={isOperating}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Pause className="h-3 w-3" />
              Pause
            </button>
            
            <button
              onClick={handleBulkExport}
              disabled={isOperating}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Download className="h-3 w-3" />
              Export
            </button>
            
            <button
              onClick={handleBulkDelete}
              disabled={isOperating}
              className="btn-danger flex items-center gap-2 text-sm"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmationModal.action}
        title={confirmationModal.title}
        message={confirmationModal.message}
        actionType={confirmationModal.actionType}
        confirmText={confirmationModal.confirmText}
        details={confirmationModal.details}
      />
    </>
  );
};

export default BulkActions; 