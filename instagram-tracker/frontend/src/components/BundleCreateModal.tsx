import React, { useState, useEffect } from 'react';
import { X, Plus, Package, Search, Tag } from 'lucide-react';
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
}

interface TextContent {
  id: number;
  text_content: string;
  categories: string[];
  tags: string[];
  template_name?: string;
  language: string;
  status: string;
}

interface BundleCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editBundle?: {
    id: number;
    name: string;
    description?: string;
    bundle_type: string;
    categories: string[];
    tags: string[];
  };
}

const BundleCreateModal: React.FC<BundleCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editBundle
}) => {
  const [bundleName, setBundleName] = useState('');
  const [description, setDescription] = useState('');
  const [bundleType, setBundleType] = useState<'mixed' | 'image' | 'video' | 'text'>('mixed');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  
  // Content selection
  const [availableContent, setAvailableContent] = useState<CentralContent[]>([]);
  const [availableTexts, setAvailableTexts] = useState<TextContent[]>([]);
  const [selectedContentIds, setSelectedContentIds] = useState<number[]>([]);
  const [selectedTextIds, setSelectedTextIds] = useState<number[]>([]);
  const [contentSearch, setContentSearch] = useState('');
  const [textSearch, setTextSearch] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const predefinedCategories = ['pfp', 'bio', 'post', 'highlight', 'story', 'any'];

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (editBundle) {
        setBundleName(editBundle.name);
        setDescription(editBundle.description || '');
        setBundleType(editBundle.bundle_type as any);
        setCategories(editBundle.categories || []);
        setTags(editBundle.tags || []);
      }
      fetchAvailableContent();
      fetchAvailableTexts();
    }
  }, [isOpen, editBundle]);

  const fetchAvailableContent = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/central/content');
      if (response.ok) {
        const content = await response.json();
        setAvailableContent(content);
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTexts = async () => {
    try {
      const response = await fetch('/api/central/text-content');
      if (response.ok) {
        const texts = await response.json();
        setAvailableTexts(texts);
      }
    } catch (error) {
      console.error('Failed to fetch texts:', error);
    }
  };

  const addCategory = () => {
    if (newCategory && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory('');
    }
  };

  const removeCategory = (category: string) => {
    setCategories(categories.filter(c => c !== category));
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const togglePredefinedCategory = (category: string) => {
    if (categories.includes(category)) {
      removeCategory(category);
    } else {
      setCategories([...categories, category]);
    }
  };

  const toggleContentSelection = (contentId: number) => {
    if (selectedContentIds.includes(contentId)) {
      setSelectedContentIds(selectedContentIds.filter(id => id !== contentId));
    } else {
      setSelectedContentIds([...selectedContentIds, contentId]);
    }
  };

  const toggleTextSelection = (textId: number) => {
    if (selectedTextIds.includes(textId)) {
      setSelectedTextIds(selectedTextIds.filter(id => id !== textId));
    } else {
      setSelectedTextIds([...selectedTextIds, textId]);
    }
  };

  const filteredContent = availableContent.filter(item =>
    item.original_name.toLowerCase().includes(contentSearch.toLowerCase()) ||
    item.categories.some(cat => cat.toLowerCase().includes(contentSearch.toLowerCase()))
  );

  const filteredTexts = availableTexts.filter(item =>
    item.text_content.toLowerCase().includes(textSearch.toLowerCase()) ||
    item.categories.some(cat => cat.toLowerCase().includes(textSearch.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (!bundleName.trim()) {
      toast.error('Bundle name is required');
      return;
    }

    setCreating(true);
    
    try {
      // Create or update bundle
      const bundleData = {
        name: bundleName,
        description: description || undefined,
        bundle_type: bundleType,
        categories,
        tags,
        created_by: 'user'
      };

      const bundleResponse = await fetch(
        editBundle ? `/api/central/bundles/${editBundle.id}` : '/api/central/bundles',
        {
          method: editBundle ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bundleData)
        }
      );

      if (!bundleResponse.ok) {
        throw new Error('Failed to create bundle');
      }

      const bundle = await bundleResponse.json();
      const bundleId = bundle.id;

      // Add selected content to bundle
      const contentPromises = selectedContentIds.map(contentId =>
        fetch(`/api/central/bundles/${bundleId}/add-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content_id: contentId, assignment_order: 0 })
        })
      );

      // Add selected texts to bundle
      const textPromises = selectedTextIds.map(textId =>
        fetch(`/api/central/bundles/${bundleId}/add-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text_content_id: textId, assignment_order: 0 })
        })
      );

      await Promise.all([...contentPromises, ...textPromises]);

      toast.success(`Bundle "${bundleName}" ${editBundle ? 'updated' : 'created'} successfully`);
      onSuccess();
      handleClose();

    } catch (error) {
      console.error('Error creating bundle:', error);
      toast.error(`Failed to ${editBundle ? 'update' : 'create'} bundle`);
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setBundleName('');
    setDescription('');
    setBundleType('mixed');
    setCategories([]);
    setTags([]);
    setNewCategory('');
    setNewTag('');
    setSelectedContentIds([]);
    setSelectedTextIds([]);
    setContentSearch('');
    setTextSearch('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-6 h-6" />
            {editBundle ? 'Edit Bundle' : 'Create Content Bundle'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bundle Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Bundle Details</h3>
                
                {/* Bundle Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bundle Name *
                  </label>
                  <input
                    type="text"
                    value={bundleName}
                    onChange={(e) => setBundleName(e.target.value)}
                    placeholder="Enter bundle name"
                    className="form-input w-full"
                  />
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional description"
                    className="form-textarea w-full"
                    rows={3}
                  />
                </div>

                {/* Bundle Type */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bundle Type
                  </label>
                  <select
                    value={bundleType}
                    onChange={(e) => setBundleType(e.target.value as any)}
                    className="form-select w-full"
                  >
                    <option value="mixed">Mixed Content</option>
                    <option value="image">Images Only</option>
                    <option value="video">Videos Only</option>
                    <option value="text">Text Only</option>
                  </select>
                </div>

                {/* Categories */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {predefinedCategories.map(category => (
                      <button
                        key={category}
                        onClick={() => togglePredefinedCategory(category)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          categories.includes(category)
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="Add custom category"
                      className="form-input flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                    />
                    <button onClick={addCategory} className="btn-secondary">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {categories.map(category => (
                        <span
                          key={category}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {category}
                          <button
                            onClick={() => removeCategory(category)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      className="form-input flex-1"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <button onClick={addTag} className="btn-secondary">
                      <Tag className="w-4 h-4" />
                    </button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Content Selection */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Add Content to Bundle</h3>
                
                {/* Content Search */}
                {(bundleType === 'mixed' || bundleType === 'image' || bundleType === 'video') && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Media Content ({selectedContentIds.length} selected)
                    </label>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={contentSearch}
                        onChange={(e) => setContentSearch(e.target.value)}
                        placeholder="Search content..."
                        className="form-input pl-10"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      <div className="grid grid-cols-2 gap-2 p-3">
                        {filteredContent.map(item => (
                          <div
                            key={item.content_id}
                            className={`relative border rounded-lg p-2 cursor-pointer transition-all ${
                              selectedContentIds.includes(item.content_id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => toggleContentSelection(item.content_id)}
                          >
                            <div className="aspect-square bg-gray-100 rounded mb-2 overflow-hidden">
                              <img
                                src={`http://localhost:3001${item.image_url}`}
                                alt={item.original_name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <p className="text-xs text-gray-600 truncate">{item.original_name}</p>
                            {selectedContentIds.includes(item.content_id) && (
                              <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                                ✓
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Text Search */}
                {(bundleType === 'mixed' || bundleType === 'text') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Text Content ({selectedTextIds.length} selected)
                    </label>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={textSearch}
                        onChange={(e) => setTextSearch(e.target.value)}
                        placeholder="Search text content..."
                        className="form-input pl-10"
                      />
                    </div>
                    <div className="max-h-64 overflow-y-auto border rounded-lg">
                      <div className="space-y-2 p-3">
                        {filteredTexts.map(item => (
                          <div
                            key={item.id}
                            className={`border rounded-lg p-3 cursor-pointer transition-all ${
                              selectedTextIds.includes(item.id)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            onClick={() => toggleTextSelection(item.id)}
                          >
                            <p className="text-sm text-gray-800 line-clamp-2 mb-1">
                              {item.text_content}
                            </p>
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>{item.template_name || 'No template'}</span>
                              {selectedTextIds.includes(item.id) && (
                                <span className="text-blue-600 font-medium">✓ Selected</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-500">
            {selectedContentIds.length + selectedTextIds.length} items selected for bundle
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="btn-secondary"
              disabled={creating}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!bundleName.trim() || creating}
              className="btn-primary"
            >
              {creating ? 'Creating...' : editBundle ? 'Update Bundle' : 'Create Bundle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleCreateModal; 