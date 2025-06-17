import React, { useState, useEffect } from 'react';
import { Image, Video, FileText, Upload, RefreshCw, Eye, Calendar, Download, Trash2, Package, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../LoadingSpinner';
import ContentUploadModal from '../ContentUploadModal';
import TextManagementModal from '../TextManagementModal';

interface ModelContent {
  content_id: number;
  filename: string;
  original_name: string;
  content_type: 'image' | 'video' | 'text';
  file_size: number;
  categories: string[];
  content_status: string;
  content_created_at: string;
  text_content_id?: number;
  text_content?: string;
  text_categories?: string[];
  template_name?: string;
  assignment_type?: string;
  assigned_at?: string;
  image_url?: string;
  video_url?: string;
}

interface ModelContentResponse {
  model_id: number;
  model_name: string;
  content: ModelContent[];
  total_count: number;
}

interface ContentBundle {
  id: number;
  name: string;
  description?: string;
  bundle_type: string;
  content_count: number;
  text_count: number;
}

interface ContentManagementTabProps {
  modelId: number;
}

const ContentManagementTab: React.FC<ContentManagementTabProps> = ({ modelId }) => {
  const [content, setContent] = useState<ModelContent[]>([]);
  const [bundles, setBundles] = useState<ContentBundle[]>([]);
  const [selectedBundleId, setSelectedBundleId] = useState<number | null>(null);
  const [contentSource, setContentSource] = useState<'model' | 'bundles'>('model');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTextModal, setShowTextModal] = useState(false);

  // Fetch model bundles
  const fetchBundles = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/central/models/${modelId}/bundles`);
      if (response.ok) {
        const bundleData = await response.json();
        setBundles(bundleData);
      }
    } catch (err) {
      console.error('Failed to fetch bundles:', err);
    }
  };

  // Fetch content from central registry bundles
  const fetchBundleContent = async (bundleId: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:3001/api/central/bundles/${bundleId}/contents`);
      
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

  // Fetch model content
  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (contentTypeFilter !== 'all') {
        params.append('content_type', contentTypeFilter);
      }
      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter);
      }
      
      const response = await fetch(`http://localhost:3001/api/models/${modelId}/content-with-texts?${params}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch content: ${response.statusText}`);
      }
      
      const data: { success: boolean; data: ModelContentResponse } = await response.json();
      
      if (data.success) {
        setContent(data.data.content || []);
      } else {
        throw new Error('Failed to fetch content');
      }
    } catch (err: any) {
      console.error('Failed to fetch model content:', err);
      setError(err.message || 'Failed to fetch content');
      setContent([]);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  // Load content based on source
  const loadContent = () => {
    if (contentSource === 'bundles' && selectedBundleId) {
      fetchBundleContent(selectedBundleId);
    } else {
      fetchContent();
    }
  };

  // Initial load and when filters change
  useEffect(() => {
    fetchBundles();
    loadContent();
  }, [modelId, contentTypeFilter, categoryFilter, contentSource, selectedBundleId]);

  // Filter content based on search term
  const filteredContent = content.filter(item => {
    const matchesSearch = !searchTerm || 
      item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.categories.some(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  // Calculate content stats
  const contentStats = {
    images: content.filter(c => c.content_type === 'image').length,
    videos: content.filter(c => c.content_type === 'video').length,
    totalSize: content.reduce((sum, c) => sum + c.file_size, 0),
    categories: {
      pfp: content.filter(c => c.categories.includes('pfp')).length,
      bio: content.filter(c => c.categories.includes('bio')).length,
      post: content.filter(c => c.categories.includes('post')).length,
      highlight: content.filter(c => c.categories.includes('highlight')).length,
      story: content.filter(c => c.categories.includes('story')).length,
      any: content.filter(c => c.categories.includes('any')).length,
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      pfp: 'bg-blue-100 text-blue-800',
      bio: 'bg-green-100 text-green-800',
      post: 'bg-purple-100 text-purple-800',
      highlight: 'bg-yellow-100 text-yellow-800',
      story: 'bg-pink-100 text-pink-800',
      any: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (loading && content.length === 0) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" text="Loading content..." className="min-h-96" />
      </div>
    );
  }

  if (error && content.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Content</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={fetchContent}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Content Management</h3>
          <p className="text-sm text-gray-500">
            {filteredContent.length} of {content.length} content files
            {contentSource === 'bundles' && selectedBundleId && (
              <span className="ml-2 text-blue-600">
                from {bundles.find(b => b.id === selectedBundleId)?.name}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadContent}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            className="btn-secondary flex items-center gap-2"
            onClick={() => setShowTextModal(true)}
          >
            <FileText className="h-4 w-4" />
            Manage Texts
          </button>
          <button 
            className="btn-primary flex items-center gap-2"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload className="h-4 w-4" />
            Upload Content
          </button>
        </div>
      </div>

      {/* Content Source Selection */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4 mb-4">
          <h4 className="text-sm font-medium text-gray-900">Content Source:</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setContentSource('model');
                setSelectedBundleId(null);
              }}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                contentSource === 'model'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Model Content
            </button>
            <button
              onClick={() => setContentSource('bundles')}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                contentSource === 'bundles'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Package className="w-4 h-4 inline mr-1" />
              Content Bundles
            </button>
          </div>
        </div>

        {contentSource === 'bundles' && (
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Select Bundle:</label>
            <select
              value={selectedBundleId || ''}
              onChange={(e) => setSelectedBundleId(e.target.value ? parseInt(e.target.value) : null)}
              className="form-select flex-1 max-w-md"
            >
              <option value="">Choose a bundle...</option>
              {bundles.map((bundle) => (
                <option key={bundle.id} value={bundle.id}>
                  {bundle.name} ({bundle.content_count} items)
                </option>
              ))}
            </select>
            <button
              onClick={() => window.open('/content', '_blank')}
              className="btn-secondary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Manage Bundles
            </button>
          </div>
        )}
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Images</p>
              <p className="text-2xl font-bold text-blue-600">{contentStats.images}</p>
            </div>
            <Image className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Videos</p>
              <p className="text-2xl font-bold text-purple-600">{contentStats.videos}</p>
            </div>
            <Video className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Size</p>
              <p className="text-2xl font-bold text-green-600">{formatFileSize(contentStats.totalSize)}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Files</p>
              <p className="text-2xl font-bold text-orange-600">{content.length}</p>
            </div>
            <FileText className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Category Stats */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Content by Category</h4>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-600">{contentStats.categories.pfp}</div>
            <div className="text-xs text-gray-500">Profile Pictures</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{contentStats.categories.bio}</div>
            <div className="text-xs text-gray-500">Bio Content</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-purple-600">{contentStats.categories.post}</div>
            <div className="text-xs text-gray-500">Posts</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-600">{contentStats.categories.highlight}</div>
            <div className="text-xs text-gray-500">Highlights</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-pink-600">{contentStats.categories.story}</div>
            <div className="text-xs text-gray-500">Stories</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-600">{contentStats.categories.any}</div>
            <div className="text-xs text-gray-500">Universal</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
        <select
          value={contentTypeFilter}
          onChange={(e) => setContentTypeFilter(e.target.value)}
          className="form-select"
        >
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="video">Videos</option>
        </select>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="form-select"
        >
          <option value="all">All Categories</option>
          <option value="pfp">Profile Pictures</option>
          <option value="bio">Bio Content</option>
          <option value="post">Posts</option>
          <option value="highlight">Highlights</option>
          <option value="story">Stories</option>
          <option value="any">Universal</option>
        </select>
      </div>

      {/* Content Grid */}
      <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
        {filteredContent.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || contentTypeFilter !== 'all' || categoryFilter !== 'all'
                ? 'No content matches your current filters.' 
                : 'No content has been uploaded yet.'
              }
            </p>
            {(!searchTerm && contentTypeFilter === 'all' && categoryFilter === 'all') && (
              <button 
                className="btn-primary flex items-center gap-2 mx-auto"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload className="h-4 w-4" />
                Upload Content
              </button>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredContent.map((item) => (
                  <div key={item.content_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    {/* Content Preview */}
                    <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                      {item.content_type === 'image' && item.image_url ? (
                        <img 
                          src={`http://localhost:3001${item.image_url}`}
                          alt={item.original_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to icon if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const iconDiv = document.createElement('div');
                            iconDiv.className = 'h-8 w-8 text-gray-400';
                            iconDiv.innerHTML = '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg>';
                            target.parentElement!.appendChild(iconDiv);
                          }}
                        />
                      ) : item.content_type === 'video' && item.video_url ? (
                        <video 
                          src={`http://localhost:3001${item.video_url}`}
                          className="w-full h-full object-cover"
                          muted
                          onError={(e) => {
                            // Fallback to icon if video fails to load
                            const target = e.target as HTMLVideoElement;
                            target.style.display = 'none';
                            const iconDiv = document.createElement('div');
                            iconDiv.className = 'h-8 w-8 text-gray-400';
                            iconDiv.innerHTML = '<svg class="w-full h-full" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" clip-rule="evenodd"></path></svg>';
                            target.parentElement!.appendChild(iconDiv);
                          }}
                        />
                      ) : item.content_type === 'image' ? (
                        <Image className="h-8 w-8 text-gray-400" />
                      ) : (
                        <Video className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    
                    {/* Content Info */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900 truncate" title={item.original_name}>
                        {item.original_name}
                      </h4>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{item.content_type}</span>
                        <span>{formatFileSize(item.file_size)}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {item.categories.map((category) => (
                          <span
                            key={category}
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)}`}
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                      
                      {/* Text Content */}
                      {item.text_content && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                          <div className="font-medium text-blue-800 mb-1">Assigned Text:</div>
                          <div className="text-blue-700 line-clamp-2" title={item.text_content}>
                            {item.text_content}
                          </div>
                          {item.template_name && (
                            <div className="text-blue-600 mt-1">Template: {item.template_name}</div>
                          )}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-400">
                        Uploaded {formatDate(item.content_created_at)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <ContentUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        modelId={modelId}
        onSuccess={() => {
          fetchContent();
          setShowUploadModal(false);
        }}
      />

      {/* Text Management Modal */}
      <TextManagementModal
        isOpen={showTextModal}
        onClose={() => setShowTextModal(false)}
        modelId={modelId}
        onSuccess={() => {
          fetchContent(); // Refresh content to show updated text assignments
        }}
      />
    </div>
  );
};

export default ContentManagementTab; 