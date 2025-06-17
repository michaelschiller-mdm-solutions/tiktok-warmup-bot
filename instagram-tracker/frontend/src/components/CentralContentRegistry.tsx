import React, { useState, useEffect } from 'react';
import { Upload, Plus, Package, Image, Type, Tag, Search, Filter, RefreshCw, RotateCcw } from 'lucide-react';
import CentralContentUploadModal from './CentralContentUploadModal';
import BundleCreateModal from './BundleCreateModal';
import TextCreateModal from './TextCreateModal';
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
  
  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);

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

  const syncModelContent = async () => {
    setSyncing(true);
    try {
      const response = await fetch('/api/central/sync-model-content', {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        // Reload all data
        await Promise.all([loadContent(), loadBundles(), loadTexts()]);
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync model content');
    } finally {
      setSyncing(false);
    }
  };

  const fetchContent = () => loadContent();
  const fetchBundles = () => loadBundles();
  const fetchTexts = () => loadTexts();

  // Filter content based on search and filters
  const filteredContent = content.filter(item => {
    const matchesSearch = !searchTerm || 
      item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = !categoryFilter || item.categories.includes(categoryFilter);
    const matchesType = !typeFilter || item.content_type === typeFilter;
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const filteredBundles = bundles.filter(bundle => {
    const matchesSearch = !searchTerm || 
      bundle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bundle.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !typeFilter || bundle.bundle_type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const filteredTexts = texts.filter(text => {
    const matchesSearch = !searchTerm || 
      text.text_content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      text.template_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || text.categories.includes(categoryFilter);
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Central Content Registry</h1>
          <p className="text-gray-600">Manage all your content, bundles, and text in one place</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={syncModelContent}
            disabled={syncing}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Model Content'}
          </button>
          <button
            onClick={() => {
              loadContent();
              loadBundles();
              loadTexts();
            }}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
      <div className="flex items-center gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
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
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input pl-10"
          />
        </div>
        
        {activeTab !== 'bundles' && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="form-select"
          >
            <option value="">All Categories</option>
            <option value="pfp">Profile Pictures</option>
            <option value="bio">Bio Content</option>
            <option value="post">Posts</option>
            <option value="highlight">Highlights</option>
            <option value="story">Stories</option>
            <option value="any">Universal</option>
          </select>
        )}
        
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
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

      {/* Content Display */}
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
                <ContentCard key={item.content_id} content={item} onUpdate={fetchContent} />
              ))}
            </div>
          )}

          {/* Bundles Tab */}
          {activeTab === 'bundles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} onUpdate={fetchBundles} />
              ))}
            </div>
          )}

          {/* Texts Tab */}
          {activeTab === 'texts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTexts.map((text) => (
                <TextCard key={text.id} text={text} onUpdate={fetchTexts} />
              ))}
            </div>
          )}
        </>
      )}

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
    </div>
  );
};

// Content Card Component
const ContentCard: React.FC<{ content: CentralContent; onUpdate: () => void }> = ({ content, onUpdate }) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square bg-gray-100 overflow-hidden">
        <img
          src={`http://localhost:3001${content.image_url}`}
          alt={content.original_name}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate mb-2">{content.original_name}</h3>
        
        {content.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {content.categories.map((category, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                {category}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span className="capitalize">{content.content_type}</span>
          <span>{Math.round(content.file_size / 1024)} KB</span>
        </div>

        {content.assigned_texts.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500 mb-1">{content.assigned_texts.length} text(s) assigned</p>
            <p className="text-xs text-gray-700 line-clamp-2">
              {content.assigned_texts[0].text_content}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Bundle Card Component
const BundleCard: React.FC<{ bundle: ContentBundle; onUpdate: () => void }> = ({ bundle, onUpdate }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{bundle.name}</h3>
          {bundle.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{bundle.description}</p>
          )}
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          bundle.bundle_type === 'mixed' ? 'bg-purple-100 text-purple-800' :
          bundle.bundle_type === 'image' ? 'bg-blue-100 text-blue-800' :
          bundle.bundle_type === 'video' ? 'bg-red-100 text-red-800' :
          'bg-green-100 text-green-800'
        }`}>
          {bundle.bundle_type}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <span>{bundle.content_count} content items</span>
        <span>{bundle.text_count} text items</span>
      </div>

      {bundle.categories.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {bundle.categories.slice(0, 3).map((category, index) => (
            <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
              {category}
            </span>
          ))}
          {bundle.categories.length > 3 && (
            <span className="text-xs text-gray-500">+{bundle.categories.length - 3} more</span>
          )}
        </div>
      )}
    </div>
  );
};

// Text Card Component
const TextCard: React.FC<{ text: TextContent; onUpdate: () => void }> = ({ text, onUpdate }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="mb-3">
        <p className="text-gray-800 text-sm line-clamp-3 mb-2">{text.text_content}</p>
        {text.template_name && (
          <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
            {text.template_name}
          </span>
        )}
      </div>
      
      {text.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {text.categories.map((category, index) => (
            <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
              {category}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{text.language.toUpperCase()}</span>
        <span>{text.text_content.length} chars</span>
      </div>
    </div>
  );
};

export default CentralContentRegistry; 