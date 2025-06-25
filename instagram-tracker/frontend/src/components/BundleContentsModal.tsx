import React, { useState, useEffect } from 'react';
import { X, Package, Image, Type, Trash2, Plus, Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

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

interface BundleContent {
  content_id?: number;
  text_content_id?: number;
  filename?: string;
  original_name?: string;
  content_type?: 'image' | 'video';
  text_content?: string;
  template_name?: string;
  assignment_order: number;
  assigned_at: string;
  assignment_id: number;
  image_url?: string;
  file_size?: number;
  categories?: string[];
}

interface BundleContentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bundle: ContentBundle;
  onUpdate: () => void;
}

const BundleContentsModal: React.FC<BundleContentsModalProps> = ({
  isOpen,
  onClose,
  bundle,
  onUpdate
}) => {
  const [contents, setContents] = useState<BundleContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<'all' | 'content' | 'text'>('all');

  useEffect(() => {
    if (isOpen) {
      fetchBundleContents();
    }
  }, [isOpen, bundle.id]);

  const fetchBundleContents = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/central/bundles/${bundle.id}/contents`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Bundle contents data:', data); // Debug log
        
        // Transform the data to match our interface
        const transformedContents: BundleContent[] = [];
        
        // Add content items (images/videos)
        if (data.content_items && data.content_items.length > 0) {
          data.content_items.forEach((item: any) => {
            transformedContents.push({
              content_id: item.content_id,
              filename: item.filename,
              original_name: item.original_name,
              content_type: item.content_type,
              assignment_order: item.assignment_order || 0,
              assigned_at: item.assigned_at,
              assignment_id: item.assignment_id,
              image_url: item.image_url || `/uploads/content/${item.filename}`,
              file_size: item.file_size,
              categories: item.categories || []
            });
          });
        }
        
        // Add text items
        if (data.text_items && data.text_items.length > 0) {
          data.text_items.forEach((item: any) => {
            transformedContents.push({
              text_content_id: item.text_content_id,
              text_content: item.text_content,
              template_name: item.template_name,
              assignment_order: item.assignment_order || 0,
              assigned_at: item.assigned_at,
              assignment_id: item.assignment_id,
              categories: item.categories || []
            });
          });
        }
        
        // Sort by assignment order
        transformedContents.sort((a, b) => (a.assignment_order || 0) - (b.assignment_order || 0));
        
        setContents(transformedContents);
        
        if (transformedContents.length === 0) {
          console.log('No content items found in bundle');
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to fetch bundle contents:', response.status, errorText);
        throw new Error(`Failed to fetch bundle contents: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching bundle contents:', error);
      setContents([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFromBundle = async (assignmentId: number, itemName: string) => {
    if (!window.confirm(`Remove "${itemName}" from this bundle?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/central/bundles/${bundle.id}/content/${assignmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Item removed from bundle');
        fetchBundleContents();
        onUpdate();
      } else {
        toast.error('Failed to remove item from bundle');
      }
    } catch (error) {
      console.error('Error removing item from bundle:', error);
      toast.error('Failed to remove item from bundle');
    }
  };

  const filteredContents = contents.filter(item => {
    const matchesSearch = !searchTerm || 
      (item.original_name && item.original_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.text_content && item.text_content.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.template_name && item.template_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = contentTypeFilter === 'all' ||
      (contentTypeFilter === 'content' && item.content_id) ||
      (contentTypeFilter === 'text' && item.text_content_id);

    return matchesSearch && matchesType;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="w-7 h-7 text-purple-600" />
              {bundle.name} Contents
            </h2>
            <p className="text-gray-600 mt-1">
              {bundle.content_count} content items • {bundle.text_count} text items
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search contents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input pl-10"
              />
            </div>
            <select
              value={contentTypeFilter}
              onChange={(e) => setContentTypeFilter(e.target.value as any)}
              className="form-select"
            >
              <option value="all">All Types</option>
              <option value="content">Media Content</option>
              <option value="text">Text Content</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredContents.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Found</h3>
              <p className="text-gray-500">
                {searchTerm || contentTypeFilter !== 'all' 
                  ? 'No content matches your search criteria'
                  : 'This bundle is empty or content failed to load'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredContents.map((item, index) => (
                <div key={`${item.content_id || item.text_content_id}-${index}`} className="bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Content Item */}
                  {item.content_id && (
                    <>
                      {/* Image/Video Preview */}
                      <div className="aspect-w-16 aspect-h-9 bg-gray-100 relative">
                        <img
                          src={item.image_url}
                          alt={item.original_name}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            console.error('Image load error for:', item.image_url);
                            (e.target as HTMLImageElement).src = '/placeholder-image.png';
                          }}
                        />
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.content_type === 'video' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {item.content_type}
                          </span>
                        </div>
                      </div>
                      
                      {/* Content Details */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate" title={item.original_name}>
                              {item.original_name}
                            </h4>
                            <p className="text-xs text-gray-500 truncate" title={item.filename}>
                              {item.filename}
                            </p>
                          </div>
                          {item.assignment_order > 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex-shrink-0">
                              #{item.assignment_order}
                            </span>
                          )}
                        </div>
                        
                        {/* Categories */}
                        {item.categories && item.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.categories.slice(0, 2).map((category, catIndex) => (
                              <span key={catIndex} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                                {category}
                              </span>
                            ))}
                            {item.categories.length > 2 && (
                              <span className="text-xs text-gray-500">+{item.categories.length - 2}</span>
                            )}
                          </div>
                        )}
                        
                        {/* File Size */}
                        {item.file_size && (
                          <div className="text-xs text-gray-500">
                            {(item.file_size / (1024 * 1024)).toFixed(1)} MB
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  {/* Text Item */}
                  {item.text_content_id && (
                    <>
                      {/* Text Preview */}
                      <div className="p-4 bg-gradient-to-br from-gray-50 to-blue-50 border-b">
                        <div className="flex items-center justify-center h-32">
                          <Type className="w-12 h-12 text-gray-400" />
                        </div>
                      </div>
                      
                      {/* Text Details */}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {item.template_name || 'Text Content'}
                            </h4>
                            {item.text_content && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-3" title={item.text_content}>
                                {item.text_content.length > 100 
                                  ? `${item.text_content.substring(0, 100)}...` 
                                  : item.text_content}
                              </p>
                            )}
                          </div>
                          {item.assignment_order > 0 && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex-shrink-0">
                              #{item.assignment_order}
                            </span>
                          )}
                        </div>
                        
                        {/* Categories */}
                        {item.categories && item.categories.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {item.categories.slice(0, 2).map((category, catIndex) => (
                              <span key={catIndex} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                                {category}
                              </span>
                            ))}
                            {item.categories.length > 2 && (
                              <span className="text-xs text-gray-500">+{item.categories.length - 2}</span>
                            )}
                          </div>
                        )}
                        
                        {/* Character Count */}
                        {item.text_content && (
                          <div className="text-xs text-gray-500">
                            {item.text_content.length} characters
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  
                  {/* Assignment Info */}
                  {item.assigned_at && (
                    <div className="px-4 pb-4">
                      <div className="text-xs text-gray-500 border-t pt-2">
                        Added: {new Date(item.assigned_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {filteredContents.length} of {contents.length} items
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleContentsModal; 