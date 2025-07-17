import React, { useState, useEffect } from 'react';
import { Upload, Plus, Package, Image, Type, Tag, Search, Filter, RefreshCw, RotateCcw, Edit, Trash2, CheckSquare, Square, AlertTriangle, Users, Calendar, BarChart3, Link, Unlink, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import CentralContentUploadModal from '../CentralContentUploadModal';
import BundleCreateModal from '../BundleCreateModal';
import BundleContentsModal from '../BundleContentsModal';
import Modal from '../Modal';

interface ModelContent {
  content_id: number;
  filename: string;
  original_name: string;
  content_type: 'image' | 'video';
  file_size: number;
  categories: string[];
  content_status: string;
  image_url: string;
  content_created_at: string;
  text_content?: string;
  text_content_id?: number;
  template_name?: string;
  assignment_type?: string;
  assigned_at?: string;
}

interface ContentBundle {
  id: number;
  name: string;
  description?: string;
  bundle_type: string;
  categories: string[];
  tags: string[];
  status: string;
  content_count: number;
  text_count: number;
  created_at: string;
  is_assigned?: boolean; // Whether this bundle is assigned to the current model
}

interface ContentManagementTabProps {
  modelId: number;
  modelName: string;
}

const ContentManagementTab: React.FC<ContentManagementTabProps> = ({ modelId, modelName }) => {
  const [activeTab, setActiveTab] = useState<'model_content' | 'available_bundles' | 'assigned_bundles'>('model_content');
  const [content, setContent] = useState<ModelContent[]>([]);
  const [bundles, setBundles] = useState<ContentBundle[]>([]);
  const [assignedBundles, setAssignedBundles] = useState<ContentBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentIssues, setContentIssues] = useState<any>(null);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [showBundleContentsModal, setShowBundleContentsModal] = useState(false);
  const [selectedBundle, setSelectedBundle] = useState<ContentBundle | null>(null);

  useEffect(() => {
    loadModelContent();
    loadAvailableBundles();
    loadAssignedBundles();
    checkContentReadiness();
  }, [modelId]);

  const checkContentReadiness = async () => {
    try {
      // Get accounts in warmup for this model to check content readiness
      const response = await fetch(`/api/accounts?model_id=${modelId}&lifecycle_state=warmup,ready&limit=1`);
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          // Check content readiness for the first account (they all share the same model content)
          const accountId = data.data[0].id;
          const readinessResponse = await fetch(`/api/accounts/${accountId}/content-readiness`);
          if (readinessResponse.ok) {
            const readinessData = await readinessResponse.json();
            if (readinessData.success && !readinessData.data.is_ready) {
              setContentIssues(readinessData.data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to check content readiness:', error);
    }
  };

  const loadModelContent = async () => {
    try {
      setLoading(true);
      setError(null);

      // Try to load from central registry bundles first
      const response = await fetch(`/api/central/models/${modelId}/bundles`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch model content: ${response.statusText}`);
      }
      
      const bundleData = await response.json();
      
      // If no bundles, fall back to model-specific content
      if (!bundleData || bundleData.length === 0) {
        const modelResponse = await fetch(`/api/models/${modelId}/content`);
        if (modelResponse.ok) {
          const modelData = await modelResponse.json();
          setContent(modelData || []);
        }
      } else {
        // Fetch content from assigned bundles
        const bundleId = bundleData[0]?.id;
        if (bundleId) {
          await fetchBundleContent(bundleId);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch model content:', err);
      setError(err.message || 'Failed to fetch model content');
      setContent([]);
      toast.error('Failed to load model content');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableBundles = async () => {
    try {
      setBundleLoading(true);
      const response = await fetch('/api/central/bundles');
      if (response.ok) {
        const data = await response.json();
        setBundles(data || []);
      }
    } catch (error) {
      console.error('Failed to load bundles:', error);
      toast.error('Failed to load content bundles');
    } finally {
      setBundleLoading(false);
    }
  };

  const loadAssignedBundles = async () => {
    try {
      const response = await fetch(`/api/central/models/${modelId}/bundles`);
      if (response.ok) {
        const data = await response.json();
        setAssignedBundles(data || []);
      }
    } catch (error) {
      console.error('Failed to load assigned bundles:', error);
    }
  };

  // Fetch content from central registry bundles
  const fetchBundleContent = async (bundleId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/central/bundles/${bundleId}/contents`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bundle content: ${response.statusText}`);
      }
      
      const bundleData = await response.json();
      
      // Transform bundle content to match ModelContent interface
      const transformedContent = bundleData.content_items?.map((item: any) => ({
        content_id: item.content_id,
        filename: item.filename,
        original_name: item.original_name,
        content_type: item.content_type,
        file_size: item.file_size,
        categories: item.categories || [],
        content_status: item.content_status,
        content_created_at: item.content_created_at,
        image_url: `/uploads/content/${item.filename}`,
        // Include assigned texts
        text_content: item.assigned_texts?.[0]?.text_content,
        text_content_id: item.assigned_texts?.[0]?.text_id,
        template_name: item.assigned_texts?.[0]?.template_name,
        assignment_type: item.assigned_texts?.[0]?.assignment_type,
        assigned_at: item.assigned_texts?.[0]?.assigned_at
      })) || [];
      
      setContent(transformedContent);
    } catch (err: any) {
      console.error('Failed to fetch bundle content:', err);
      setError(err.message || 'Failed to fetch bundle content');
      setContent([]);
      toast.error('Failed to load bundle content');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignBundle = async (bundleId: number, bundleName: string) => {
    try {
      const response = await fetch(`/api/central/models/${modelId}/bundles/${bundleId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: modelId,
          bundle_id: bundleId,
          assigned_by: 'frontend_user'
        })
      });

      if (response.ok) {
        toast.success(`Bundle "${bundleName}" assigned to model`);
        loadAssignedBundles();
        loadModelContent();
        loadAvailableBundles(); // Refresh to update assignment status
      } else {
        const errorData = await response.json();
        toast.error(`Failed to assign bundle: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error assigning bundle:', error);
      toast.error('Failed to assign bundle to model');
    }
  };

  const handleUnassignBundle = async (bundleId: number, bundleName: string) => {
    try {
      const response = await fetch(`/api/central/models/${modelId}/bundles/${bundleId}/unassign`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        toast.success(`Bundle "${bundleName}" unassigned from model`);
        loadAssignedBundles();
        loadModelContent();
        loadAvailableBundles(); // Refresh to update assignment status
      } else {
        const errorData = await response.json();
        toast.error(`Failed to unassign bundle: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error unassigning bundle:', error);
      toast.error('Failed to unassign bundle from model');
    }
  };

  const handleViewBundleContents = (bundle: ContentBundle) => {
    setSelectedBundle(bundle);
    setShowBundleContentsModal(true);
  };

  const handleRefresh = () => {
    loadModelContent();
    loadAvailableBundles();
    loadAssignedBundles();
    checkContentReadiness();
  };

  // Filter content based on search and filters
  const filteredContent = content.filter(item => {
    const matchesSearch = !searchTerm || 
      item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.template_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || 
      item.categories.includes(categoryFilter);
    
    const matchesType = !typeFilter || 
      (typeFilter === 'text' && item.text_content) ||
      (typeFilter === 'image' && item.content_type === 'image') ||
      (typeFilter === 'video' && item.content_type === 'video');
    
    return matchesSearch && matchesCategory && matchesType;
  });

  // Filter bundles
  const filteredBundles = bundles.filter(bundle => {
    const matchesSearch = !searchTerm || 
      bundle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bundle.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-gray-900">Content Management: {modelName}</h3>
            {contentIssues && (
              <div className="flex items-center gap-1">
                <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                  {contentIssues.missing_content_phases?.length || 0} Content Issues
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Manage model content and assign content bundles
            {contentIssues && (
              <span className="text-red-600 ml-2">
                • Missing content for warmup phases
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowUploadModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Content
          </button>
          <button 
            onClick={() => setShowBundleModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Package className="h-4 w-4" />
            Create Bundle
          </button>
          <button 
            onClick={handleRefresh}
            className="btn-secondary flex items-center gap-2"
            disabled={loading || bundleLoading}
          >
            <RotateCcw className={`h-4 w-4 ${(loading || bundleLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Content Issues Warning */}
      {contentIssues && contentIssues.missing_content_phases && contentIssues.missing_content_phases.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 mb-2">
                🚨 Missing Content in Model (Need to Upload):
              </h3>
              <div className="space-y-3">
                {contentIssues.missing_content_phases.map((phase: any, index: number) => (
                  <div key={index} className="text-sm text-red-700 border-l-2 border-red-300 pl-3">
                    <div className="font-medium text-red-800 capitalize">{phase.phase_display_name || phase.phase.replace(/[_-]/g, ' ')}</div>
                    
                    {/* Show specific missing categories */}
                    {phase.missing_categories && phase.missing_categories.length > 0 ? (
                      <div className="mt-1 space-y-1">
                        {phase.missing_categories.map((cat: any, idx: number) => (
                          <div key={idx} className="text-xs flex items-center gap-2">
                            <span className="text-red-600 font-medium">Missing:</span>
                            <span className="px-2 py-0.5 bg-red-200 text-red-900 rounded text-xs font-medium">
                              {cat.display_name} ({cat.type === 'text' ? 'Text' : 'Image'})
                            </span>
                          </div>
                        ))}
                        {phase.issue_type === 'missing_from_model' && (
                          <div className="text-xs">
                            <span className="px-2 py-1 bg-red-200 text-red-900 rounded font-medium">
                              📁 Need to Upload
                            </span>
                          </div>
                        )}
                        {phase.issue_type === 'not_assigned_to_account' && (
                          <div className="text-xs">
                            <span className="px-2 py-1 bg-orange-200 text-orange-900 rounded font-medium">
                              🔗 Need to Assign
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      // Fallback to generic content types
                      <div className="mt-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-red-600 text-xs">needs:</span>
                          {phase.missing_text && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                              Text Content
                            </span>
                          )}
                          {phase.missing_image && (
                            <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-medium">
                              Image Content
                            </span>
                          )}
                          {phase.issue_type === 'missing_from_model' && (
                            <span className="px-2 py-1 bg-red-200 text-red-900 rounded text-xs font-medium">
                              📁 Need to Upload
                            </span>
                          )}
                          {phase.issue_type === 'not_assigned_to_account' && (
                            <span className="px-2 py-1 bg-orange-200 text-orange-900 rounded text-xs font-medium">
                              🔗 Need to Assign
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Upload Missing Content
                </button>
                <button
                  onClick={() => setActiveTab('available_bundles')}
                  className="bg-purple-100 px-3 py-2 rounded-md text-sm font-medium text-purple-800 hover:bg-purple-200"
                >
                  Browse Content Bundles
                </button>
                <button
                  onClick={checkContentReadiness}
                  className="bg-gray-100 px-3 py-2 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-200"
                >
                  Recheck Issues
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
          onClick={() => setActiveTab('model_content')}
          className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'model_content'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Image className="w-4 h-4 mr-2" />
          Model Content ({filteredContent.length})
            </button>
            <button
          onClick={() => setActiveTab('available_bundles')}
          className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'available_bundles'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4 mr-2" />
          Available Bundles ({filteredBundles.length})
            </button>
            <button
          onClick={() => setActiveTab('assigned_bundles')}
          className={`flex-1 flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'assigned_bundles'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Link className="w-4 h-4 mr-2" />
          Assigned Bundles ({assignedBundles.length})
            </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
        </div>
        {activeTab === 'model_content' && (
          <>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="form-select"
        >
              <option value="">All Categories</option>
              <option value="bio">Bio</option>
              <option value="post">Post</option>
              <option value="story">Story</option>
              <option value="highlight">Highlight</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="form-select"
            >
              <option value="">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="text">Text</option>
        </select>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'model_content' && (
          <div className="h-full">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-red-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Content</h3>
                <p className="text-gray-500 mb-6">{error}</p>
                <button onClick={handleRefresh} className="btn-primary">Try Again</button>
              </div>
            ) : filteredContent.length === 0 ? (
              <div className="text-center py-12">
                <Image className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Found</h3>
            <p className="text-gray-500 mb-6">
                  {searchTerm || categoryFilter || typeFilter 
                    ? 'No content matches your search criteria'
                    : 'Upload content or assign a content bundle to get started'
              }
            </p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => setShowUploadModal(true)} className="btn-primary">
                Upload Content
              </button>
                  <button onClick={() => setActiveTab('available_bundles')} className="btn-secondary">
                    Browse Bundles
                  </button>
                </div>
          </div>
        ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto">
                {filteredContent.map((item) => (
                  <div key={`${item.content_id}-${item.text_content_id || 'no-text'}`} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    {/* Image/Video Content */}
                    {item.content_type && (
                      <div className="aspect-w-16 aspect-h-9 bg-gray-100">
                        <img 
                          src={item.image_url}
                          alt={item.original_name}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-image.png';
                          }}
                        />
                      </div>
                    )}
                    
                    {/* Text Content */}
                    {item.text_content && !item.content_type && (
                      <div className="h-48 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
                        <Type className="w-16 h-16 text-gray-400" />
                    </div>
                    )}
                    
                    {/* Content Details */}
                    <div className="p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2 truncate">
                        {item.original_name || item.template_name || 'Untitled'}
                      </h4>
                      
                      {item.text_content && (
                        <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                          {item.text_content.length > 100 
                            ? `${item.text_content.substring(0, 100)}...` 
                            : item.text_content}
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="capitalize">
                          {item.content_type || 'Text'}
                        </span>
                        {item.categories.length > 0 && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            {item.categories[0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'available_bundles' && (
          <div className="h-full">
            {bundleLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredBundles.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Bundles Available</h3>
                <p className="text-gray-500 mb-6">
                  Create content bundles to organize and share content across models
                </p>
                <button onClick={() => setShowBundleModal(true)} className="btn-primary">
                  Create First Bundle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                {filteredBundles.map((bundle) => {
                  const isAssigned = assignedBundles.some(ab => ab.id === bundle.id);
                  
                  return (
                    <div key={bundle.id} className="bg-white border rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                      {/* Bundle Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-lg font-medium text-gray-900 truncate">{bundle.name}</h4>
                          {bundle.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{bundle.description}</p>
                          )}
                        </div>
                        {isAssigned && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                            Assigned
                          </span>
                        )}
                      </div>
                      
                      {/* Bundle Stats */}
                      <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Image className="h-4 w-4" />
                          <span>{bundle.content_count} content</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Type className="h-4 w-4" />
                          <span>{bundle.text_count} texts</span>
                        </div>
                          </div>

                      {/* Bundle Categories */}
                      {bundle.categories.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-4">
                          {bundle.categories.slice(0, 3).map((category, index) => (
                            <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                              {category}
                            </span>
                          ))}
                          {bundle.categories.length > 3 && (
                            <span className="text-xs text-gray-500">+{bundle.categories.length - 3}</span>
                          )}
                        </div>
                      )}
                      
                      {/* Bundle Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewBundleContents(bundle)}
                          className="btn-secondary text-sm flex-1"
                        >
                          View Contents
                        </button>
                        {isAssigned ? (
                          <button
                            onClick={() => handleUnassignBundle(bundle.id, bundle.name)}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors"
                          >
                            <X className="h-4 w-4" />
                            Unassign
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAssignBundle(bundle.id, bundle.name)}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Assign
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assigned_bundles' && (
          <div className="h-full">
            {bundleLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : assignedBundles.length === 0 ? (
              <div className="text-center py-12">
                <Link className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Bundles Assigned</h3>
                <p className="text-gray-500 mb-6">
                  Assign content bundles to make them available for this model's warmup phases
                </p>
                <button onClick={() => setActiveTab('available_bundles')} className="btn-primary">
                  Browse Available Bundles
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto">
                {assignedBundles.map((bundle) => (
                  <div key={bundle.id} className="bg-white border border-green-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                    {/* Bundle Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-lg font-medium text-gray-900 truncate">{bundle.name}</h4>
                        {bundle.description && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{bundle.description}</p>
                        )}
                      </div>
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex-shrink-0">
                        Active
                      </span>
                    </div>

                    {/* Bundle Stats */}
                    <div className="flex items-center gap-4 mb-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Image className="h-4 w-4" />
                        <span>{bundle.content_count} content</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Type className="h-4 w-4" />
                        <span>{bundle.text_count} texts</span>
                      </div>
                    </div>

                    {/* Bundle Categories */}
                    {bundle.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {bundle.categories.slice(0, 3).map((category, index) => (
                          <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                            {category}
                          </span>
                        ))}
                        {bundle.categories.length > 3 && (
                          <span className="text-xs text-gray-500">+{bundle.categories.length - 3}</span>
                        )}
                      </div>
                    )}

                    {/* Bundle Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewBundleContents(bundle)}
                        className="btn-secondary text-sm flex-1"
                      >
                        View Contents
                      </button>
                      <button
                        onClick={() => handleUnassignBundle(bundle.id, bundle.name)}
                        className="flex items-center gap-1 px-3 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CentralContentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => {
          setShowUploadModal(false);
          handleRefresh();
        }}
      />

      <BundleCreateModal
        isOpen={showBundleModal}
        onClose={() => setShowBundleModal(false)}
        onSuccess={() => {
          setShowBundleModal(false);
          handleRefresh();
        }}
      />

      {selectedBundle && (
        <BundleContentsModal
          isOpen={showBundleContentsModal}
          onClose={() => {
            setShowBundleContentsModal(false);
            setSelectedBundle(null);
          }}
          bundle={selectedBundle}
          onUpdate={() => {
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};

export default ContentManagementTab; 