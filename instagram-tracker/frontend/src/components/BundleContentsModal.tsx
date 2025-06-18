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
        
        // Transform the data to match our interface
        const transformedContents: BundleContent[] = [];
        
        // Add content items
        if (data.content_items) {
          data.content_items.forEach((item: any) => {
            transformedContents.push({
              content_id: item.content_id,
              filename: item.filename,
              original_name: item.original_name,
              content_type: item.content_type,
              assignment_order: item.assignment_order || 0,
              assigned_at: item.assigned_at,
              assignment_id: item.assignment_id
            });
          });
        }
        
        // Add text items
        if (data.text_items) {
          data.text_items.forEach((item: any) => {
            transformedContents.push({
              text_content_id: item.text_content_id,
              text_content: item.text_content,
              template_name: item.template_name,
              assignment_order: item.assignment_order || 0,
              assigned_at: item.assigned_at,
              assignment_id: item.assignment_id
            });
          });
        }
        
        setContents(transformedContents);
      } else {
        toast.error('Failed to load bundle contents');
      }
    } catch (error) {
      console.error('Error fetching bundle contents:', error);
      toast.error('Failed to load bundle contents');
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Contents Found</h3>
              <p className="text-gray-500">
                {searchTerm || contentTypeFilter !== 'all' 
                  ? 'No contents match your search criteria'
                  : 'This bundle is empty'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredContents.map((item) => (
                <div key={item.assignment_id} className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow">
                  {/* Content Item */}
                  {item.content_id && (
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.content_type === 'image' ? (
                          <img
                            src={`/uploads/content/${item.filename}`}
                            alt={item.original_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.original_name}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {item.content_type}
                        </p>
                        <p className="text-xs text-gray-400">
                          Added {new Date(item.assigned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromBundle(item.assignment_id, item.original_name || 'item')}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Remove from bundle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Text Item */}
                  {item.text_content_id && (
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Type className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">
                          {item.text_content}
                        </p>
                        {item.template_name && (
                          <p className="text-xs text-gray-500">
                            Template: {item.template_name}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          Added {new Date(item.assigned_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeFromBundle(item.assignment_id, item.text_content?.substring(0, 30) + '...' || 'text')}
                        className="text-gray-400 hover:text-red-600 p-1"
                        title="Remove from bundle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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