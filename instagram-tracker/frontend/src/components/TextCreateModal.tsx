import React, { useState, useEffect } from 'react';
import { X, Plus, FileText, Tag, Copy, Wand2, Package, Check } from 'lucide-react';
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
}

interface TextCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editText?: {
    id: number;
    text_content: string;
    categories: string[];
    tags: string[];
    template_name?: string;
    language: string;
  };
}

const TextCreateModal: React.FC<TextCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editText
}) => {
  const [textContent, setTextContent] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [language, setLanguage] = useState('en');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [bulkTexts, setBulkTexts] = useState('');
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [creating, setCreating] = useState(false);
  const [variationCount, setVariationCount] = useState(10);
  
  // Bundle assignment
  const [availableBundles, setAvailableBundles] = useState<ContentBundle[]>([]);
  const [selectedBundles, setSelectedBundles] = useState<number[]>([]);
  const [showBundleCreation, setShowBundleCreation] = useState(false);
  const [newBundleName, setNewBundleName] = useState('');

  const predefinedCategories = ['pfp', 'bio', 'post', 'highlight', 'story', 'any', 'username'];
  const commonTemplates = [
    'greeting',
    'introduction',
    'call_to_action',
    'question',
    'compliment',
    'conversation_starter',
    'follow_up',
    'closing'
  ];

  // Load edit data and bundles
  useEffect(() => {
    if (isOpen) {
      fetchBundles();
      if (editText) {
        setTextContent(editText.text_content);
        setTemplateName(editText.template_name || '');
        setLanguage(editText.language);
        setCategories(editText.categories || []);
        setTags(editText.tags || []);
      }
    }
  }, [isOpen, editText]);

  const fetchBundles = async () => {
    try {
      const response = await fetch('/api/central/bundles');
      if (response.ok) {
        const bundles = await response.json();
        setAvailableBundles(bundles.filter((b: ContentBundle) => 
          b.bundle_type === 'mixed' || b.bundle_type === 'text'
        ));
      }
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
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

  const toggleBundle = (bundleId: number) => {
    if (selectedBundles.includes(bundleId)) {
      setSelectedBundles(selectedBundles.filter(id => id !== bundleId));
    } else {
      setSelectedBundles([...selectedBundles, bundleId]);
    }
  };

  const createQuickBundle = async () => {
    if (!newBundleName.trim()) {
      toast.error('Bundle name is required');
      return;
    }

    try {
      const response = await fetch('/api/central/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBundleName,
          description: `Text bundle created during text creation`,
          bundle_type: 'text',
          categories: categories,
          tags: tags,
          created_by: 'user'
        })
      });

      if (response.ok) {
        const newBundle = await response.json();
        setAvailableBundles(prev => [...prev, newBundle]);
        setSelectedBundles(prev => [...prev, newBundle.id]);
        setNewBundleName('');
        setShowBundleCreation(false);
        toast.success(`Bundle "${newBundleName}" created and selected`);
      }
    } catch (error) {
      toast.error('Failed to create bundle');
    }
  };

  const generateVariations = async () => {
    if (!textContent.trim()) {
      toast.error('Enter some text first to generate variations');
      return;
    }
    
    if (variationCount < 1 || variationCount > 500) {
      toast.error('Please enter a number of variations between 1 and 500.');
      return;
    }

    try {
      setCreating(true);
      let variations = [];
      
      // Check if username or bio category is selected
      const isUsername = categories.includes('username');
      const isBio = categories.includes('bio');
      
      if (isUsername || isBio) {
        // Use AI generation for username/bio
        const endpoint = isUsername ? '/api/central/generate-username-variations' : '/api/central/generate-bio-variations';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            text: textContent,
            count: variationCount
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          variations = data.variations || [];
        } else {
          throw new Error(`Failed to generate ${isUsername ? 'username' : 'bio'} variations`);
        }
      } else {
        // Simple text variations for other categories
        variations = [
          textContent,
          textContent.replace(/\b(hi|hello|hey)\b/gi, 'Hello there'),
          textContent.replace(/\b(you)\b/gi, 'you'),
          textContent + ' 😊',
          textContent.replace(/\.$/, '!'),
          textContent.replace(/\b(great|good|nice)\b/gi, 'amazing')
        ].filter((v, i, arr) => arr.indexOf(v) === i && v !== textContent);
      }

      if (variations.length > 0) {
        setBulkTexts(variations.join('\n'));
        setMode('bulk');
        toast.success(`Generated ${variations.length} ${isUsername ? 'username' : isBio ? 'bio' : ''} variations`);
      } else {
        toast.success('No variations could be generated for this text');
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Failed to generate variations');
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async () => {
    if (mode === 'single' && !textContent.trim()) {
      toast.error('Text content is required');
      return;
    }

    if (mode === 'bulk' && !bulkTexts.trim()) {
      toast.error('Bulk text content is required');
      return;
    }

    setCreating(true);

    try {
      const createdTexts: any[] = [];

      if (mode === 'single') {
        // Create or update single text
        const textData = {
          text_content: textContent,
          template_name: templateName || undefined,
          language,
          categories,
          tags,
          created_by: 'user'
        };

        const response = await fetch(
          editText ? `/api/central/text-content/${editText.id}` : '/api/central/text-content',
          {
            method: editText ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textData)
          }
        );

        if (!response.ok) {
          throw new Error('Failed to save text content');
        }

        const savedText = await response.json();
        createdTexts.push(savedText);

        toast.success(`Text content ${editText ? 'updated' : 'created'} successfully`);
      } else {
        // Create multiple texts from bulk input
        const texts = bulkTexts
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0);

        if (texts.length === 0) {
          toast.error('No valid text lines found');
          return;
        }

        const promises = texts.map((text, index) =>
          fetch('/api/central/text-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text_content: text,
              template_name: templateName ? `${templateName}_${index + 1}` : undefined,
              language,
              categories,
              tags,
              created_by: 'user'
            })
          })
        );

        const results = await Promise.allSettled(promises);
        const successful = results.filter(r => r.status === 'fulfilled');
        const failed = results.length - successful.length;

        // Get created texts
        for (const result of successful) {
          if (result.status === 'fulfilled') {
            const response = result.value;
            if (response.ok) {
              const text = await response.json();
              createdTexts.push(text);
            }
          }
        }

        if (successful.length > 0) {
          toast.success(`Created ${successful.length} text items${failed > 0 ? ` (${failed} failed)` : ''}`);
        } else {
          toast.error('Failed to create text content');
        }
      }

      // Add created texts to selected bundles
      if (selectedBundles.length > 0 && createdTexts.length > 0) {
        const bundlePromises: Promise<any>[] = [];
        
        for (const text of createdTexts) {
          for (const bundleId of selectedBundles) {
            bundlePromises.push(
              fetch(`/api/central/bundles/${bundleId}/add-content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text_content_id: text.id,
                  assignment_order: 0
                })
              })
            );
          }
        }

        await Promise.allSettled(bundlePromises);
      }

      onSuccess();
      handleClose();

    } catch (error) {
      console.error('Error creating text content:', error);
      toast.error('Failed to save text content');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setTextContent('');
    setTemplateName('');
    setLanguage('en');
    setCategories([]);
    setTags([]);
    setNewCategory('');
    setNewTag('');
    setBulkTexts('');
    setMode('single');
    setSelectedBundles([]);
    setShowBundleCreation(false);
    setNewBundleName('');
    setVariationCount(10);
    onClose();
  };

  const copyFromSingle = () => {
    if (textContent.trim()) {
      setBulkTexts(textContent);
      setMode('bulk');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="w-7 h-7 text-green-600" />
              {editText ? 'Edit Text Content' : 'Create Text Content'}
            </h2>
            <p className="text-gray-600 mt-1">Create text content and assign to bundles</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Mode Selection */}
          {!editText && (
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900">Creation Mode:</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMode('single')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    mode === 'single'
                      ? 'bg-green-100 text-green-800 ring-2 ring-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'single' && <Check className="w-3 h-3 inline mr-1" />}
                  Single Text
                </button>
                <button
                  onClick={() => setMode('bulk')}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    mode === 'bulk'
                      ? 'bg-green-100 text-green-800 ring-2 ring-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {mode === 'bulk' && <Check className="w-3 h-3 inline mr-1" />}
                  Bulk Import
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Panel - Text Content */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Text Content
                </h3>
                
                {mode === 'single' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Content *
                      </label>
                      <textarea
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="Enter your text content..."
                        className="form-textarea w-full"
                        rows={6}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          value={variationCount}
                          onChange={(e) => setVariationCount(parseInt(e.target.value))}
                          className="form-input w-24"
                          min="1"
                          max="500"
                        />
                        <button
                          onClick={generateVariations}
                          className="btn-secondary flex-1 flex items-center justify-center gap-2 text-sm"
                          disabled={creating}
                        >
                          <Wand2 className="w-4 h-4" />
                          {categories.includes('username') 
                            ? 'Generate Usernames'
                            : categories.includes('bio')
                            ? 'Generate Bios'
                            : 'Generate Variations'
                          }
                        </button>
                        <button
                          onClick={copyFromSingle}
                          className="btn-secondary flex items-center gap-2 text-sm"
                        >
                          <Copy className="w-4 h-4" />
                          Copy to Bulk
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bulk Text Content (one per line) *
                    </label>
                    <textarea
                      value={bulkTexts}
                      onChange={(e) => setBulkTexts(e.target.value)}
                      placeholder="Enter multiple text lines, one per line..."
                      className="form-textarea w-full"
                      rows={8}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-gray-500">
                        {bulkTexts.split('\n').filter(line => line.trim()).length} text items
                      </p>
                      <button
                        onClick={() => setMode('single')}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Switch to Single Mode
                      </button>
                    </div>
                  </div>
                )}

                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Enter template name"
                      className="form-input flex-1"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {commonTemplates.map(template => (
                      <button
                        key={template}
                        onClick={() => setTemplateName(template)}
                        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        {template}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="form-select w-full"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Panel - Categories, Tags & Bundles */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600" />
                  Classification & Assignment
                </h3>
                
                {/* Categories */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categories
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {predefinedCategories.map(category => (
                      <button
                        key={category}
                        onClick={() => togglePredefinedCategory(category)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          categories.includes(category)
                            ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {categories.includes(category) && <Check className="w-3 h-3 inline mr-1" />}
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
                <div className="mb-6">
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

                {/* Bundle Assignment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Assign to Bundles ({selectedBundles.length} selected)
                  </label>
                  <div className="space-y-2 max-h-40 overflow-y-auto mb-3 border rounded-lg p-2">
                    {availableBundles.map(bundle => (
                      <label key={bundle.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedBundles.includes(bundle.id)}
                          onChange={() => toggleBundle(bundle.id)}
                          className="form-checkbox"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{bundle.name}</p>
                          <p className="text-xs text-gray-500">{bundle.bundle_type} • {bundle.text_count} texts</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {/* Quick Bundle Creation */}
                  {!showBundleCreation ? (
                    <button
                      onClick={() => setShowBundleCreation(true)}
                      className="w-full text-sm text-green-600 hover:text-green-800 font-medium flex items-center justify-center gap-1 py-2 border border-green-200 rounded hover:bg-green-50 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Create New Text Bundle
                    </button>
                  ) : (
                    <div className="space-y-2 p-3 bg-green-50 rounded-lg">
                      <input
                        type="text"
                        value={newBundleName}
                        onChange={(e) => setNewBundleName(e.target.value)}
                        placeholder="Bundle name"
                        className="form-input w-full text-sm"
                        onKeyPress={(e) => e.key === 'Enter' && createQuickBundle()}
                      />
                      <div className="flex gap-2">
                        <button onClick={createQuickBundle} className="btn-primary flex-1 text-sm py-1">
                          Create Bundle
                        </button>
                        <button 
                          onClick={() => setShowBundleCreation(false)} 
                          className="btn-secondary flex-1 text-sm py-1"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview */}
                {(textContent || bulkTexts) && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Preview
                    </h4>
                    {mode === 'single' ? (
                      <p className="text-sm text-gray-700 italic">"{textContent}"</p>
                    ) : (
                      <div className="space-y-1">
                        {bulkTexts.split('\n').filter(line => line.trim()).slice(0, 3).map((line, index) => (
                          <p key={index} className="text-sm text-gray-700 italic">"{line}"</p>
                        ))}
                        {bulkTexts.split('\n').filter(line => line.trim()).length > 3 && (
                          <p className="text-sm text-gray-500">
                            ...and {bulkTexts.split('\n').filter(line => line.trim()).length - 3} more
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>
                {mode === 'single' 
                  ? `${textContent.length} characters`
                  : `${bulkTexts.split('\n').filter(line => line.trim()).length} text items`
                }
              </span>
              {selectedBundles.length > 0 && (
                <>
                  <span>•</span>
                  <span>{selectedBundles.length} bundles selected</span>
                </>
              )}
            </div>
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
              disabled={
                creating || 
                (mode === 'single' && !textContent.trim()) ||
                (mode === 'bulk' && !bulkTexts.trim())
              }
              className="btn-primary flex items-center gap-2"
            >
              {creating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  {editText ? 'Update Text' : 'Create Text'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextCreateModal; 