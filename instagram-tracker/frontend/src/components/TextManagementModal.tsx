import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Upload, FileText, Shuffle, Download, Trash2, Edit } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TextContent {
  id: number;
  text_content: string;
  categories: string[];
  template_name?: string;
  status: string;
  created_at: string;
}

interface TextManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: number;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { id: 'pfp', label: 'Profile Pictures', color: 'bg-blue-100 text-blue-800' },
  { id: 'bio', label: 'Bio Content', color: 'bg-green-100 text-green-800' },
  { id: 'post', label: 'Posts', color: 'bg-purple-100 text-purple-800' },
  { id: 'highlight', label: 'Highlights', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'story', label: 'Stories', color: 'bg-pink-100 text-pink-800' },
  { id: 'any', label: 'Universal', color: 'bg-gray-100 text-gray-800' }
];

const TextManagementModal: React.FC<TextManagementModalProps> = ({
  isOpen,
  onClose,
  modelId,
  onSuccess
}) => {
  const [texts, setTexts] = useState<TextContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'view' | 'add' | 'bulk' | 'assign'>('view');
  
  // Add single text state
  const [newText, setNewText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [templateName, setTemplateName] = useState('');
  
  // Bulk import state
  const [bulkTexts, setBulkTexts] = useState('');
  const [bulkCategories, setBulkCategories] = useState<Set<string>>(new Set());
  const [bulkTemplateName, setBulkTemplateName] = useState('');
  
  // Assignment state
  const [assignmentTemplate, setAssignmentTemplate] = useState('');
  const [assignmentCategories, setAssignmentCategories] = useState<Set<string>>(new Set());

  const fetchTexts = useCallback(async () => {
    if (!modelId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/models/${modelId}/text-content`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setTexts(data.data.text_content || []);
      } else {
        throw new Error(data.message || 'Failed to fetch texts');
      }
    } catch (error) {
      console.error('Error fetching texts:', error);
      toast.error('Failed to load texts');
      setTexts([]);
    } finally {
      setLoading(false);
    }
  }, [modelId]);

  useEffect(() => {
    if (isOpen) {
      fetchTexts();
    }
  }, [isOpen, fetchTexts]);

  const handleAddText = async () => {
    if (!newText.trim() || selectedCategories.size === 0) {
      toast.error('Please enter text content and select at least one category');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/models/${modelId}/text-content`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_content: newText.trim(),
          categories: Array.from(selectedCategories),
          template_name: templateName.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add text');
      }

      toast.success('Text added successfully');
      setNewText('');
      setSelectedCategories(new Set());
      setTemplateName('');
      fetchTexts();
    } catch (error: any) {
      toast.error(`Failed to add text: ${error.message}`);
    }
  };

  const handleBulkImport = async () => {
    const textLines = bulkTexts.split('\n').filter(line => line.trim().length > 0);
    
    if (textLines.length === 0 || bulkCategories.size === 0) {
      toast.error('Please enter text content and select at least one category');
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/models/${modelId}/text-content/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts: textLines,
          categories: Array.from(bulkCategories),
          template_name: bulkTemplateName.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to import texts');
      }

      const result = await response.json();
      toast.success(`Successfully imported ${result.data.imported_count} texts`);
      setBulkTexts('');
      setBulkCategories(new Set());
      setBulkTemplateName('');
      fetchTexts();
    } catch (error: any) {
      toast.error(`Failed to import texts: ${error.message}`);
    }
  };

  const handleAssignTexts = async () => {
    try {
      const response = await fetch(`http://localhost:3001/api/models/${modelId}/assign-texts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template_name: assignmentTemplate.trim() || null,
          category_filter: assignmentCategories.size > 0 ? Array.from(assignmentCategories) : null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign texts');
      }

      const result = await response.json();
      toast.success(`Successfully assigned texts to ${result.data.assignment_count} images`);
      onSuccess?.();
    } catch (error: any) {
      toast.error(`Failed to assign texts: ${error.message}`);
    }
  };

  const toggleCategory = (categoryId: string, targetSet: Set<string>, setter: (set: Set<string>) => void) => {
    const newSet = new Set(targetSet);
    if (newSet.has(categoryId)) {
      newSet.delete(categoryId);
    } else {
      newSet.add(categoryId);
    }
    setter(newSet);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Text Content Management</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'view', label: 'View Texts', icon: FileText },
              { id: 'add', label: 'Add Text', icon: Plus },
              { id: 'bulk', label: 'Bulk Import', icon: Upload },
              { id: 'assign', label: 'Assign to Images', icon: Shuffle }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === 'view' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Text Content ({texts.length})</h3>
                <button
                  onClick={fetchTexts}
                  className="btn-secondary flex items-center gap-2"
                  disabled={loading}
                >
                  <FileText className="h-4 w-4" />
                  Refresh
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">Loading texts...</div>
              ) : texts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Text Content</h3>
                  <p className="text-gray-500">Add some text content to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {texts.map((text) => (
                    <div key={text.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-gray-900 mb-2">{text.text_content}</p>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {text.categories.map((category) => {
                              const categoryInfo = CATEGORIES.find(c => c.id === category);
                              return (
                                <span
                                  key={category}
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    categoryInfo?.color || 'bg-gray-100 text-gray-800'
                                  }`}
                                >
                                  {categoryInfo?.label || category}
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {text.template_name && (
                              <span className="mr-4">Template: {text.template_name}</span>
                            )}
                            Created: {formatDate(text.created_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Add Single Text</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Content
                </label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="Enter your text content..."
                  className="form-textarea h-32"
                  rows={4}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories (select at least one)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id, selectedCategories, setSelectedCategories)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        selectedCategories.has(category.id)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name (optional)
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Summer Campaign 2024"
                  className="form-input"
                />
              </div>

              <button
                onClick={handleAddText}
                className="btn-primary w-full"
                disabled={!newText.trim() || selectedCategories.size === 0}
              >
                Add Text
              </button>
            </div>
          )}

          {activeTab === 'bulk' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Bulk Import Texts</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Content (one per line)
                </label>
                <textarea
                  value={bulkTexts}
                  onChange={(e) => setBulkTexts(e.target.value)}
                  placeholder="Enter multiple texts, one per line..."
                  className="form-textarea h-40"
                  rows={8}
                />
                <p className="text-sm text-gray-500 mt-1">
                  Each line will be imported as a separate text item.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories (select at least one)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id, bulkCategories, setBulkCategories)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        bulkCategories.has(category.id)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name (optional)
                </label>
                <input
                  type="text"
                  value={bulkTemplateName}
                  onChange={(e) => setBulkTemplateName(e.target.value)}
                  placeholder="e.g., Summer Campaign 2024"
                  className="form-input"
                />
              </div>

              <button
                onClick={handleBulkImport}
                className="btn-primary w-full"
                disabled={!bulkTexts.trim() || bulkCategories.size === 0}
              >
                Import Texts
              </button>
            </div>
          )}

          {activeTab === 'assign' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Assign Texts to Images</h3>
              <p className="text-gray-600">
                Randomly assign text content to uploaded images. This will reassign texts if a template name is provided.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name (optional)
                </label>
                <input
                  type="text"
                  value={assignmentTemplate}
                  onChange={(e) => setAssignmentTemplate(e.target.value)}
                  placeholder="e.g., Summer Campaign 2024"
                  className="form-input"
                />
                <p className="text-sm text-gray-500 mt-1">
                  If provided, existing assignments with this template will be cleared and reassigned.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Categories (optional)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {CATEGORIES.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => toggleCategory(category.id, assignmentCategories, setAssignmentCategories)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                        assignmentCategories.has(category.id)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Leave empty to assign to all images, or select categories to filter.
                </p>
              </div>

              <button
                onClick={handleAssignTexts}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Shuffle className="h-4 w-4" />
                Assign Texts Randomly
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TextManagementModal; 