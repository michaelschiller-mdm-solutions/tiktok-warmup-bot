import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Users, Settings, Activity } from 'lucide-react';

import { Model } from '../types/models';
import { apiClient } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import AccountsTabNavigation, { AccountsTab } from '../components/ModelAccounts/AccountsTabNavigation';
import AccountsOverviewTab from '../components/ModelAccounts/AccountsOverviewTab';
import AvailableAccountsTab from '../components/ModelAccounts/AvailableAccountsTab';
import WarmupPipelineTab from '../components/ModelAccounts/WarmupPipelineTab';
import ProxyManagementTab from '../components/ModelAccounts/ProxyManagementTab';
import ContentManagementTab from '../components/ModelAccounts/ContentManagementTab';
import InvalidAccountsList from '../components/ModelAccounts/InvalidAccountsList';

const ModelAccountsPage: React.FC = () => {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AccountsTab>('overview');

  useEffect(() => {
    if (!modelId) {
      setError('Invalid model ID');
      setLoading(false);
      return;
    }

    const fetchModel = async () => {
      try {
        setLoading(true);
        setError(null);
        const model = await apiClient.getModel(parseInt(modelId));
        setModel(model);
      } catch (err: any) {
        console.error('Failed to load model:', err);
        setError(err.message || 'Failed to load model');
        toast.error('Failed to load model details');
      } finally {
        setLoading(false);
      }
    };

    fetchModel();
  }, [modelId]);

  // Handle tab state from URL parameters
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as AccountsTab;
    if (tabFromUrl && ['overview', 'available', 'warmup', 'proxy', 'content', 'invalid'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    } else {
      setActiveTab('overview');
    }
  }, [searchParams]);

  const handleBackToModels = () => {
    navigate('/models');
  };

  if (loading) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" text="Loading model details..." className="min-h-96" />
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Model Not Found</h3>
          <p className="text-gray-500 mb-6">{error || 'The requested model could not be found.'}</p>
          <button 
            onClick={handleBackToModels}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Models
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <Link 
            to="/models" 
            className="hover:text-primary-600 transition-colors"
          >
            Models
          </Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">{model.name}</span>
          <span>/</span>
          <span className="text-gray-900 font-medium">Accounts</span>
        </nav>
      </div>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToModels}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              title="Back to Models"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{model.name} - Account Management</h1>
              <p className="text-gray-600 mt-1">
                Manage accounts for this model • Status: 
                <span className={`ml-1 px-2 py-1 rounded-full text-xs font-medium ${
                  model.status === 'active' ? 'bg-green-100 text-green-800' :
                  model.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {model.status}
                </span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              to={`/models/${model.id}`}
              className="btn-secondary flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Model Settings
            </Link>
          </div>
        </div>

        {/* Model Summary */}
        {model.description && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{model.description}</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Accounts</p>
              <p className="text-2xl font-bold text-gray-900">{model.account_count || 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Accounts</p>
              <p className="text-2xl font-bold text-green-600">{model.active_accounts || 0}</p>
            </div>
            <Activity className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Daily Follow Limit</p>
              <p className="text-2xl font-bold text-purple-600">{model.daily_follow_limit}</p>
            </div>
            <Settings className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unfollow Ratio</p>
              <p className="text-2xl font-bold text-orange-600">{model.unfollow_ratio}%</p>
            </div>
            <Activity className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Tabbed Interface */}
      <div className="bg-white rounded-lg shadow flex flex-col h-[800px]">
        {/* Tab Navigation */}
        <AccountsTabNavigation
          modelId={model.id}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        
        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && <AccountsOverviewTab modelId={model.id} />}
          {activeTab === 'available' && <AvailableAccountsTab modelId={model.id} />}
          {activeTab === 'warmup' && <WarmupPipelineTab modelId={model.id} />}
          {activeTab === 'proxy' && <ProxyManagementTab modelId={model.id} />}
          {activeTab === 'content' && <ContentManagementTab modelId={model.id} modelName={model.name} />}
          {activeTab === 'invalid' && <InvalidAccountsList />}
        </div>
      </div>
    </div>
  );
};

export default ModelAccountsPage; 