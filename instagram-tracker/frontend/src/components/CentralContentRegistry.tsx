import React, { useState, useEffect } from 'react';
import { Upload, Plus, Package, Image, Type, Tag, Search, Filter } from 'lucide-react';

interface CentralContent {
  content_id: number;
  filename: string;
  original_name: string;
  content_type: 'image' | 'video';
  file_size: number;
  categories: string[];
  tags: string[];
  content_status: string;
  content_created_at: string;
  image_url: string;
  assigned_texts: Array<{
    text_id: number;
    text_content: string;
    categories: string[];
    tags: string[];
    template_name?: string;
    assignment_type: string;
    priority: number;
    assigned_at: string;
  }>;
}

interface ContentBundle {
  id: number;
  name: string;
  description?: string;
  bundle_type: 'image' | 'video' | 'text' | 'mixed';
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
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBundleModal, setShowBundleModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);

  // Fetch content data
  const fetchContent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/central/content');
      if (response.ok) {
        const data = await response.json();
        setContent(data);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch bundles data
  const fetchBundles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/central/bundles');
      if (response.ok) {
        const data = await response.json();
        setBundles(data);
      }
    } catch (error) {
      console.error('Error fetching bundles:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch texts data
  const fetchTexts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/central/text-content');
      if (response.ok) {
        const data = await response.json();
        setTexts(data);
      }
    } catch (error) {
      console.error('Error fetching texts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'content') {
      fetchContent();
    } else if (activeTab === 'bundles') {
      fetchBundles();
    } else if (activeTab === 'texts') {
      fetchTexts();
    }
  }, [activeTab]);

  // Filter content based on search and category
  const filteredContent = content.filter(item => {
    const matchesSearch = item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.assigned_texts.some(text => text.text_content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = !selectedCategory || item.categories.includes(selectedCategory);
    return matchesSearch && matchesCategory;
  });

  // Get unique categories for filtering
  const allCategories = [...new Set(content.flatMap(item => item.categories))];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Central Content Registry</h1>
        <p className="text-gray-600">Manage your content library, create bundles, and assign to models</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'content', label: 'Content Library', icon: Image },
            { key: 'bundles', label: 'Content Bundles', icon: Package },
            { key: 'texts', label: 'Text Library', icon: Type }
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filter Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        {activeTab === 'content' && (
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Categories</option>
              {allCategories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2">
          {activeTab === 'content' && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Upload Content
            </button>
          )}
          {activeTab === 'bundles' && (
            <button
              onClick={() => setShowBundleModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Bundle
            </button>
          )}
          {activeTab === 'texts' && (
            <button
              onClick={() => setShowTextModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
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
              {bundles.map((bundle) => (
                <BundleCard key={bundle.id} bundle={bundle} onUpdate={fetchBundles} />
              ))}
            </div>
          )}

          {/* Texts Tab */}
          {activeTab === 'texts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {texts.map((text) => (
                <TextCard key={text.id} text={text} onUpdate={fetchTexts} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {showUploadModal && (
        <ContentUploadModal onClose={() => setShowUploadModal(false)} onSuccess={fetchContent} />
      )}
      {showBundleModal && (
        <BundleCreateModal onClose={() => setShowBundleModal(false)} onSuccess={fetchBundles} />
      )}
      {showTextModal && (
        <TextCreateModal onClose={() => setShowTextModal(false)} onSuccess={fetchTexts} />
      )}
    </div>
  );
};

// Content Card Component
const ContentCard: React.FC<{ content: CentralContent; onUpdate: () => void }> = ({ content, onUpdate }) => {
  const [showTexts, setShowTexts] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square relative">
        <img
          src={`http://localhost:3001${content.image_url}`}
          alt={content.original_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2">
          <span className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
            {content.content_type}
          </span>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-medium text-gray-900 truncate mb-2">{content.original_name}</h3>
        
        {content.categories.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {content.categories.map((category, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                {category}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>{(content.file_size / 1024 / 1024).toFixed(1)} MB</span>
          <span>{content.assigned_texts.length} texts</span>
        </div>

        <button
          onClick={() => setShowTexts(!showTexts)}
          className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {showTexts ? 'Hide' : 'Show'} Assigned Texts ({content.assigned_texts.length})
        </button>

        {showTexts && content.assigned_texts.length > 0 && (
          <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
            {content.assigned_texts.map((text, index) => (
              <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                <p className="text-gray-800 line-clamp-2">{text.text_content}</p>
                {text.template_name && (
                  <span className="text-gray-500 mt-1 block">Template: {text.template_name}</span>
                )}
              </div>
            ))}
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
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">{bundle.name}</h3>
          <p className="text-gray-600 text-sm">{bundle.description}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          bundle.bundle_type === 'mixed' ? 'bg-purple-100 text-purple-800' :
          bundle.bundle_type === 'image' ? 'bg-blue-100 text-blue-800' :
          bundle.bundle_type === 'video' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {bundle.bundle_type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{bundle.content_count}</div>
          <div className="text-sm text-gray-500">Content Items</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{bundle.text_count}</div>
          <div className="text-sm text-gray-500">Text Items</div>
        </div>
      </div>

      {bundle.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {bundle.categories.map((category, index) => (
            <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
              {category}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
          View Contents
        </button>
        <button className="flex-1 px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm">
          Edit Bundle
        </button>
      </div>
    </div>
  );
};

// Text Card Component
const TextCard: React.FC<{ text: TextContent; onUpdate: () => void }> = ({ text, onUpdate }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="mb-3">
        <p className="text-gray-800 text-sm line-clamp-3">{text.text_content}</p>
      </div>

      {text.template_name && (
        <div className="mb-2">
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
            {text.template_name}
          </span>
        </div>
      )}

      {text.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {text.categories.map((category, index) => (
            <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
              {category}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{text.language.toUpperCase()}</span>
        <span>{new Date(text.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

// Placeholder Modal Components (to be implemented)
const ContentUploadModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Upload Content</h2>
        <p className="text-gray-600 mb-4">Content upload modal to be implemented</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const BundleCreateModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Create Bundle</h2>
        <p className="text-gray-600 mb-4">Bundle creation modal to be implemented</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};

const TextCreateModal: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-4">Add Text Content</h2>
        <p className="text-gray-600 mb-4">Text creation modal to be implemented</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default CentralContentRegistry; 