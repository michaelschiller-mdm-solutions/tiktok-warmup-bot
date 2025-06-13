import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Settings, Users, Activity, Calendar, Trash2, Edit, CheckSquare, Square, Upload } from 'lucide-react';
import { Model } from '../types/models';
import ContentUploadModal from './ContentUploadModal';

interface ModelCardProps {
  model: Model;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  onEdit?: (model: Model) => void;
  onDelete?: (model: Model) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ 
  model, 
  isSelected = false,
  onSelect,
  onEdit, 
  onDelete 
}) => {
  const navigate = useNavigate();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const accountStats = [
    { label: 'Total', value: model.account_count || 0, color: 'text-gray-600' },
    { label: 'Active', value: model.active_accounts || 0, color: 'text-green-600' },
    { label: 'Banned', value: model.banned_accounts || 0, color: 'text-red-600' },
    { label: 'Suspended', value: model.suspended_accounts || 0, color: 'text-yellow-600' },
  ];

  const handleManageAccounts = () => {
    navigate(`/models/${model.id}/accounts`);
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200 ${
      isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
    }`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Selection Checkbox */}
            {onSelect && (
              <button
                onClick={() => onSelect(!isSelected)}
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                {isSelected ? 
                  <CheckSquare className="h-5 w-5 text-blue-600" /> : 
                  <Square className="h-5 w-5" />
                }
              </button>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}>
                  {model.status}
                </span>
              </div>
              {model.description && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{model.description}</p>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-4">
            {onEdit && (
              <button
                onClick={() => onEdit(model)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                title="Edit model"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(model)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="Delete model"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <Link
              to={`/models/${model.id}`}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-md transition-colors"
              title="View details"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="p-6">
        {/* Quick Actions */}
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleManageAccounts}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
            >
              <Users className="h-4 w-4" />
              Accounts
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
            >
              <Upload className="h-4 w-4" />
              Content
            </button>
          </div>
        </div>

        {/* Account Statistics */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Account Stats</span>
            </div>
          </div>
          <div 
            className="grid grid-cols-2 gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors"
            onClick={handleManageAccounts}
          >
            {accountStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-lg font-semibold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Follow Statistics */}
        {(model.total_follows || model.active_follows) && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Follows</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{model.total_follows || 0}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{model.active_follows || 0}</div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Summary */}
        <div className="mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-500">Unfollow Ratio:</span>
              <span className="ml-2 font-medium">{model.unfollow_ratio}%</span>
            </div>
            <div>
              <span className="text-gray-500">Daily Limit:</span>
              <span className="ml-2 font-medium">{model.daily_follow_limit}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>Created {formatDate(model.created_at)}</span>
          </div>
          {model.last_account_activity && (
            <div>
              Last activity: {formatDate(model.last_account_activity)}
            </div>
          )}
        </div>
      </div>

      {/* Content Upload Modal */}
      <ContentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        modelId={model.id}
        onSuccess={() => {
          setShowUploadModal(false);
        }}
      />
    </div>
  );
};

export default ModelCard; 