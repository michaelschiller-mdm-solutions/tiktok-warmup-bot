import React, { useState, useEffect } from 'react';
import { Upload, Plus, Package, Image, Type, Tag, Search, Filter, RefreshCw, RotateCcw, Edit, Trash2, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import CentralContentUploadModal from './CentralContentUploadModal';
import BundleCreateModal from './BundleCreateModal';
import TextCreateModal from './TextCreateModal';
import BundleContentsModal from './BundleContentsModal';
import BatchAssignModal from './BatchAssignModal';
import Modal from './Modal';
import { toast } from 'react-hot-toast';

interface CentralContent {
  content_id: number;
  filename: string;
  original_name: string;
  content_type: 'image' | 'video';
  file_size: number;
  categories: string[];
  tags: string[];
  content_status: string;
  image_url: string;
  assigned_texts: Array<{
    id: number;
    text_content: string;
    template_name?: string;
  }>;
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
}

interface TextContent {
  id: number;
  text_content: string;
  categories: string[];
  tags: string[];
  template_name?: string;
  language: string;
  status: string;
  created_at: string;
}

const CentralContentRegistry: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'content' | 'bundles' | 'texts'>('content');
  const [content, setContent] = useState<CentralContent[]>([]);
  const [bundles, setBundles] = useState<ContentBundle[]>([]);
  const [texts, setTexts] = useState<TextContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
  // Selection for batch operations
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);
  const [showBatchAssignModal, setShowBatchAssignModal] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadContent();
    loadBundles();
    loadTexts();
  }, []);

  const loadContent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/central/content');
      if (response.ok) {
        const data = await response.json();
        setContent(data);
      }
    } catch (error) {
      console.error('Failed to load content:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const loadBundles = async () => {
    try {
      const response = await fetch('/api/central/bundles');
      if (response.ok) {
        const data = await response.json();
        setBundles(data);
      }
    } catch (error) {
      console.error('Failed to load bundles:', error);
    }
  };

  const loadTexts = async () => {
    try {
      const response = await fetch('/api/central/text-content');
      if (response.ok) {
        const data = await response.json();
        setTexts(data);
      }
    } catch (error) {
      console.error('Failed to load texts:', error);
    }
  };

  const fetchContent = loadContent;
  const fetchBundles = loadBundles;
  const fetchTexts = loadTexts;

  const syncWithModels = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/central/sync', { method: 'POST' });
      if (response.ok) {
        toast.success('Content synced with models successfully');
        loadContent();
        loadBundles();
        loadTexts();
      } else {
        toast.error('Failed to sync content');
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync content');
    } finally {
      setSyncing(false);
    }
  };

  // Selection handlers
  const toggleSelection = (id: number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItems(newSelection);
  };

  const selectAll = () => {
    if (activeTab === 'content') {
      setSelectedItems(new Set(filteredContent.map(item => item.content_id)));
    } else if (activeTab === 'texts') {
      setSelectedItems(new Set(filteredTexts.map(item => item.id)));
    } else if (activeTab === 'bundles') {
      setSelectedItems(new Set(filteredBundles.map(item => item.id)));
    }
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setSelectionMode(false);
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      clearSelection();
    }
  };

  // Batch delete handler
  const handleBatchDelete = async () => {
    if (selectedItems.size === 0) return;
    
    setIsDeleting(true);
    try {
      const itemIds = Array.from(selectedItems);
      const results = await Promise.allSettled(
        itemIds.map(async (id) => {
          if (activeTab === 'content') {
            const response = await fetch(`/api/central/content/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Failed to delete content ${id}`);
          } else if (activeTab === 'texts') {
            const response = await fetch(`/api/central/text-content/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Failed to delete text ${id}`);
          } else if (activeTab === 'bundles') {
            const response = await fetch(`/api/central/bundles/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(`Failed to delete bundle ${id}`);
          }
          return id;
        })
      );
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (successful > 0) {
        toast.success(`Successfully deleted ${successful} item(s)`);
      }
      if (failed > 0) {
        toast.error(`Failed to delete ${failed} item(s)`);
      }
      
      // Refresh data
      if (activeTab === 'content') {
        await loadContent();
      } else if (activeTab === 'texts') {
        await loadTexts();
      } else if (activeTab === 'bundles') {
        await loadBundles();
      }
      
      clearSelection();
      
    } catch (error: any) {
      console.error('Batch delete failed:', error);
      toast.error('Failed to delete items');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmation(false);
    }
  };

  // Filter content based on search and filters
  const filteredContent = content.filter(item => {
    const matchesSearch = !searchTerm || 
      item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !categoryFilter || item.categories.includes(categoryFilter);
    const matchesType = !typeFilter || item.content_type === typeFilter;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const filteredBundles = bundles.filter(bundle => {
    const matchesSearch = !searchTerm || 
      bundle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bundle.description && bundle.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = !typeFilter || bundle.bundle_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const filteredTexts = texts.filter(text => {
    const matchesSearch = !searchTerm || 
      text.text_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (text.template_name && text.template_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !categoryFilter || text.categories.includes(categoryFilter);
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Central Content Registry</h1>
            <p className="text-gray-600 mt-2">Manage your content library, bundles, and text templates</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={syncWithModels}
              disabled={syncing}
              className="btn-secondary flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync with Models'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Content</p>
                <p className="text-2xl font-bold text-blue-600">{content.length}</p>
              </div>
              <Image className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Content Bundles</p>
                <p className="text-2xl font-bold text-purple-600">{bundles.length}</p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Text Content</p>
                <p className="text-2xl font-bold text-green-600">{texts.length}</p>
              </div>
              <Type className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('content')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'content'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Image className="w-4 h-4 inline mr-2" />
              Content Library
            </button>
            <button
              onClick={() => setActiveTab('bundles')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'bundles'
                  ? 'bg-white text-purple-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Content Bundles
            </button>
            <button
              onClick={() => setActiveTab('texts')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'texts'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Type className="w-4 h-4 inline mr-2" />
              Text Library
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
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
                  <option value="name">Name</option>
                  <option value="username">Username</option>
                </select>
                
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="form-select"
                >
                  <option value="">All Types</option>
                  {activeTab === 'content' && (
                    <>
                      <option value="image">Images</option>
                      <option value="video">Videos</option>
                    </>
                  )}
                  {activeTab === 'bundles' && (
                    <>
                      <option value="mixed">Mixed</option>
                      <option value="image">Image Bundles</option>
                      <option value="video">Video Bundles</option>
                      <option value="text">Text Bundles</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {(activeTab === 'content' || activeTab === 'texts' || activeTab === 'bundles') && (
                  <>
                    <button
                      onClick={toggleSelectionMode}
                      className={`btn-secondary flex items-center gap-2 ${selectionMode ? 'bg-blue-100 text-blue-800' : ''}`}
                    >
                      {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      {selectionMode ? 'Exit Selection' : 'Select Items'}
                    </button>
                    
                    {selectionMode && (
                      <>
                        <button
                          onClick={selectAll}
                          className="btn-secondary text-sm"
                        >
                          Select All
                        </button>
                        <button
                          onClick={clearSelection}
                          className="btn-secondary text-sm"
                        >
                          Clear Selection
                        </button>
                        {selectedItems.size > 0 && (
                          <>
                            {(activeTab === 'content' || activeTab === 'texts') && (
                              <button
                                onClick={() => setShowBatchAssignModal(true)}
                                className="btn-primary flex items-center gap-2"
                              >
                                <Package className="w-4 h-4" />
                                Assign to Bundle ({selectedItems.size})
                              </button>
                            )}
                            <button
                              onClick={() => setShowDeleteConfirmation(true)}
                              disabled={isDeleting}
                              className="btn-danger flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              {isDeleting ? 'Deleting...' : `Delete ${selectedItems.size} Item(s)`}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-3">
                {activeTab === 'content' && (
                  <button
                    onClick={() => setShowUploadModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Content
                  </button>
                )}
                {activeTab === 'bundles' && (
                  <button
                    onClick={() => setShowBundleModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Bundle
                  </button>
                )}
                {activeTab === 'texts' && (
                  <button
                    onClick={() => setShowTextModal(true)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Text
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content Display */}
        <div className="bg-white rounded-lg shadow p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {/* Content Library Tab */}
              {activeTab === 'content' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {filteredContent.map((item) => (
                    <ContentCard 
                      key={item.content_id} 
                      content={item} 
                      onUpdate={fetchContent}
                      isSelected={selectedItems.has(item.content_id)}
                      onToggleSelect={() => toggleSelection(item.content_id)}
                      selectionMode={selectionMode}
                    />
                  ))}
                </div>
              )}

              {/* Bundles Tab */}
              {activeTab === 'bundles' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredBundles.map((bundle) => (
                    <BundleCard 
                      key={bundle.id} 
                      bundle={bundle} 
                      onUpdate={fetchBundles}
                      isSelected={selectedItems.has(bundle.id)}
                      onToggleSelect={() => toggleSelection(bundle.id)}
                      selectionMode={selectionMode}
                    />
                  ))}
                </div>
              )}

              {/* Texts Tab */}
              {activeTab === 'texts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTexts.map((text) => (
                    <TextCard 
                      key={text.id} 
                      text={text} 
                      onUpdate={fetchTexts}
                      isSelected={selectedItems.has(text.id)}
                      onToggleSelect={() => toggleSelection(text.id)}
                      selectionMode={selectionMode}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modals */}
        {showUploadModal && (
          <CentralContentUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onSuccess={fetchContent}
          />
        )}
        {showBundleModal && (
          <BundleCreateModal
            isOpen={showBundleModal}
            onClose={() => setShowBundleModal(false)}
            onSuccess={fetchBundles}
          />
        )}
        {showTextModal && (
          <TextCreateModal
            isOpen={showTextModal}
            onClose={() => setShowTextModal(false)}
            onSuccess={fetchTexts}
          />
        )}
        {showBatchAssignModal && (
          <BatchAssignModal
            isOpen={showBatchAssignModal}
            onClose={() => {
              setShowBatchAssignModal(false);
              clearSelection();
            }}
            selectedContentIds={activeTab === 'content' ? Array.from(selectedItems) : []}
            selectedTextIds={activeTab === 'texts' ? Array.from(selectedItems) : []}
            onSuccess={() => {
              fetchBundles();
              clearSelection();
            }}
          />
        )}

        {/* Delete Confirmation Modal */}
        <Modal 
          isOpen={showDeleteConfirmation} 
          onClose={() => setShowDeleteConfirmation(false)}
          title="Delete Items"
          size="md"
        >
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-lg bg-red-100 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete {activeTab === 'content' ? 'Content' : activeTab === 'texts' ? 'Text Content' : 'Bundles'}</h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to permanently delete {selectedItems.size} {activeTab === 'content' ? 'content item(s)' : activeTab === 'texts' ? 'text item(s)' : 'bundle(s)'}? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                disabled={isDeleting}
                className="btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={isDeleting}
                className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

// Content Card Component with selection support
const ContentCard: React.FC<{ 
  content: CentralContent; 
  onUpdate: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  selectionMode?: boolean;
}> = ({ content, onUpdate, isSelected = false, onToggleSelect, selectionMode = false }) => {
  return (
    <div className={`bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow relative ${
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
    }`}>
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={onToggleSelect}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
              isSelected 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            {isSelected && <CheckSquare className="w-4 h-4" />}
          </button>
        </div>
      )}
      
      <div className="aspect-square bg-gray-100 overflow-hidden">
        <img
          src={content.image_url}
          alt={content.original_name}
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate mb-2">{content.original_name}</h3>
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
          <span className="capitalize">{content.content_type}</span>
          <span>{(content.file_size / 1024 / 1024).toFixed(1)} MB</span>
        </div>
        
        {content.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {content.categories.slice(0, 2).map((category, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                {category}
              </span>
            ))}
            {content.categories.length > 2 && (
              <span className="text-xs text-gray-500">+{content.categories.length - 2}</span>
            )}
          </div>
        )}
        
        {content.assigned_texts.length > 0 && (
          <div className="text-xs text-green-600 mb-2">
            {content.assigned_texts.length} text{content.assigned_texts.length !== 1 ? 's' : ''} assigned
          </div>
        )}
      </div>
    </div>
  );
};

// Bundle Card Component
const BundleCard: React.FC<{ 
  bundle: ContentBundle; 
  onUpdate: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  selectionMode?: boolean;
}> = ({ bundle, onUpdate, isSelected = false, onToggleSelect, selectionMode = false }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContentsModal, setShowContentsModal] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${bundle.name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/central/bundles/${bundle.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Bundle deleted successfully');
        onUpdate();
      } else {
        toast.error('Failed to delete bundle');
      }
    } catch (error) {
      console.error('Error deleting bundle:', error);
      toast.error('Failed to delete bundle');
    }
  };

  return (
    <div className={`bg-white border rounded-lg p-6 hover:shadow-md transition-shadow relative ${
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
    }`}>
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={onToggleSelect}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
              isSelected 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            {isSelected && <CheckSquare className="w-4 h-4" />}
          </button>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-purple-600" />
          <div>
            <h3 className="font-medium text-gray-900">{bundle.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{bundle.bundle_type}</p>
          </div>
        </div>
        {!selectionMode && (
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-600 p-1"
            title="Delete bundle"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {bundle.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{bundle.description}</p>
      )}

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>{bundle.content_count} content</span>
        <span>{bundle.text_count} texts</span>
      </div>

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

      {!selectionMode && (
        <div className="flex gap-2">
          <button
            onClick={() => setShowContentsModal(true)}
            className="btn-secondary text-sm flex-1"
          >
            View Contents
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="btn-secondary text-sm"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      )}

      {showContentsModal && (
        <BundleContentsModal
          isOpen={showContentsModal}
          onClose={() => setShowContentsModal(false)}
          bundle={bundle}
          onUpdate={onUpdate}
        />
      )}
    </div>
  );
};

// Text Card Component with selection support
const TextCard: React.FC<{ 
  text: TextContent; 
  onUpdate: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  selectionMode?: boolean;
}> = ({ text, onUpdate, isSelected = false, onToggleSelect, selectionMode = false }) => {
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this text content? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/central/text-content/${text.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Text content deleted successfully');
        onUpdate();
      } else {
        toast.error('Failed to delete text content');
      }
    } catch (error) {
      console.error('Error deleting text content:', error);
      toast.error('Failed to delete text content');
    }
  };

  return (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow relative ${
      isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
    }`}>
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <button
            onClick={onToggleSelect}
            className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
              isSelected 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white border-gray-300 hover:border-blue-400'
            }`}
          >
            {isSelected && <CheckSquare className="w-4 h-4" />}
          </button>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <Type className="h-5 w-5 text-green-600 mt-1" />
        {!selectionMode && (
          <button
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-600 p-1"
            title="Delete text"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-900 line-clamp-3">{text.text_content}</p>
      </div>

      {text.template_name && (
        <div className="mb-3">
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs">
            {text.template_name}
          </span>
        </div>
      )}

      {text.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {text.categories.slice(0, 2).map((category, index) => (
            <span key={index} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
              {category}
            </span>
          ))}
          {text.categories.length > 2 && (
            <span className="text-xs text-gray-500">+{text.categories.length - 2}</span>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500">
        {text.language.toUpperCase()} • {new Date(text.created_at).toLocaleDateString()}
      </div>
    </div>
  );
};

export default CentralContentRegistry; 