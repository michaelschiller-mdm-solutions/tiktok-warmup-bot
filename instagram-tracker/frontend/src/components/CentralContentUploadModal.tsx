import React, { useState, useEffect } from 'react';
import { X, Upload, Plus, Package, Tag, Image, Video, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface UploadFile {
  file: File;
  preview: string;
  categories: string[];
  tags: string[];
  textContent: string;
  assignedBundles: number[];
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
}

interface CentralContentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CentralContentUploadModal: React.FC<CentralContentUploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [availableBundles, setAvailableBundles] = useState<ContentBundle[]>([]);
  const [globalCategories, setGlobalCategories] = useState<string[]>([]);
  const [globalTags, setGlobalTags] = useState<string[]>([]);
  const [globalBundles, setGlobalBundles] = useState<number[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');
  const [uploading, setUploading] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState<number | null>(null);
  const [showBundleCreation, setShowBundleCreation] = useState(false);
  const [newBundleName, setNewBundleName] = useState('');

  const predefinedCategories = ['pfp', 'bio', 'post', 'highlight', 'story', 'any'];

  useEffect(() => {
    if (isOpen) {
      fetchBundles();
    }
  }, [isOpen]);

  const fetchBundles = async () => {
    try {
      const response = await fetch('/api/central/bundles');
      if (response.ok) {
        const bundles = await response.json();
        setAvailableBundles(bundles);
      }
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    const newFiles: UploadFile[] = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      categories: [...globalCategories],
      tags: [...globalTags],
      textContent: '',
      assignedBundles: [...globalBundles]
    }));

    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      return newFiles;
    });
    if (selectedFileIndex === index) {
      setSelectedFileIndex(null);
    }
  };

  const updateFileProperty = (index: number, property: keyof UploadFile, value: any) => {
    setFiles(prev => prev.map((file, i) => 
      i === index ? { ...file, [property]: value } : file
    ));
  };

  const toggleFileCategory = (fileIndex: number, category: string) => {
    const file = files[fileIndex];
    const newCategories = file.categories.includes(category)
      ? file.categories.filter(c => c !== category)
      : [...file.categories, category];
    updateFileProperty(fileIndex, 'categories', newCategories);
  };

  const toggleFileBundle = (fileIndex: number, bundleId: number) => {
    const file = files[fileIndex];
    const newBundles = file.assignedBundles.includes(bundleId)
      ? file.assignedBundles.filter(id => id !== bundleId)
      : [...file.assignedBundles, bundleId];
    updateFileProperty(fileIndex, 'assignedBundles', newBundles);
  };

  const addGlobalCategory = () => {
    if (newCategory && !globalCategories.includes(newCategory)) {
      const updatedCategories = [...globalCategories, newCategory];
      setGlobalCategories(updatedCategories);
      // Apply to all files
      setFiles(prev => prev.map(file => ({
        ...file,
        categories: Array.from(new Set([...file.categories, newCategory]))
      })));
      setNewCategory('');
    }
  };

  const addGlobalTag = () => {
    if (newTag && !globalTags.includes(newTag)) {
      const updatedTags = [...globalTags, newTag];
      setGlobalTags(updatedTags);
      // Apply to all files
      setFiles(prev => prev.map(file => ({
        ...file,
        tags: Array.from(new Set([...file.tags, newTag]))
      })));
      setNewTag('');
    }
  };

  const toggleGlobalCategory = (category: string) => {
    const isAdding = !globalCategories.includes(category);
    const updatedCategories = isAdding
      ? [...globalCategories, category]
      : globalCategories.filter(c => c !== category);
    
    setGlobalCategories(updatedCategories);
    
    // Apply to all files
    setFiles(prev => prev.map(file => ({
      ...file,
      categories: isAdding 
        ? Array.from(new Set([...file.categories, category]))
        : file.categories.filter(c => c !== category)
    })));
  };

  const toggleGlobalBundle = (bundleId: number) => {
    const isAdding = !globalBundles.includes(bundleId);
    const updatedBundles = isAdding
      ? [...globalBundles, bundleId]
      : globalBundles.filter(id => id !== bundleId);
    
    setGlobalBundles(updatedBundles);
    
    // Apply to all files
    setFiles(prev => prev.map(file => ({
      ...file,
      assignedBundles: isAdding 
        ? Array.from(new Set([...file.assignedBundles, bundleId]))
        : file.assignedBundles.filter(id => id !== bundleId)
    })));
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
          description: `Quick bundle created during upload`,
          bundle_type: 'mixed',
          categories: globalCategories,
          tags: globalTags,
          created_by: 'user'
        })
      });

      if (response.ok) {
        const newBundle = await response.json();
        setAvailableBundles(prev => [...prev, newBundle]);
        toggleGlobalBundle(newBundle.id);
        setNewBundleName('');
        setShowBundleCreation(false);
        toast.success(`Bundle "${newBundleName}" created and selected`);
      }
    } catch (error) {
      toast.error('Failed to create bundle');
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    setUploading(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const uploadFile of files) {
        try {
          const formData = new FormData();
          formData.append('files', uploadFile.file);
          formData.append('categories', JSON.stringify(uploadFile.categories));
          formData.append('tags', JSON.stringify(uploadFile.tags));
          formData.append('uploaded_by', 'user');

          const response = await fetch('/api/central/content/upload', {
            method: 'POST',
            body: formData
          });

          if (response.ok) {
            const result = await response.json();
            const uploadedContent = result.content[0];

            // Add text content if provided
            if (uploadFile.textContent.trim()) {
              await fetch('/api/central/text-content', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  text_content: uploadFile.textContent,
                  categories: uploadFile.categories,
                  tags: uploadFile.tags,
                  created_by: 'user'
                })
              }).then(async (textResponse) => {
                if (textResponse.ok) {
                  const textContent = await textResponse.json();
                  // Assign text to content
                  await fetch(`/api/central/content/${uploadedContent.content_id}/assign-text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      text_content_id: textContent.id,
                      assignment_type: 'manual',
                      priority: 0,
                      assigned_by: 'user'
                    })
                  });
                }
              });
            }

            // Add to selected bundles
            for (const bundleId of uploadFile.assignedBundles) {
              const bundleResponse = await fetch(`/api/central/bundles/${bundleId}/add-content`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  content_id: uploadedContent.content_id,
                  assignment_order: 0
                })
              });
              
              if (!bundleResponse.ok) {
                console.error(`Failed to add content to bundle ${bundleId}:`, await bundleResponse.text());
              }
            }

            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} file(s)${failCount > 0 ? ` (${failCount} failed)` : ''}`);
        onSuccess();
        handleClose();
      } else {
        toast.error('Failed to upload files');
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    setGlobalCategories([]);
    setGlobalTags([]);
    setGlobalBundles([]);
    setSelectedFileIndex(null);
    setShowBundleCreation(false);
    setNewBundleName('');
    onClose();
  };

  if (!isOpen) return null;

  const selectedFile = selectedFileIndex !== null ? files[selectedFileIndex] : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-7xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Upload className="w-7 h-7 text-blue-600" />
              Upload to Central Registry
            </h2>
            <p className="text-gray-600 mt-1">Upload content with per-file categories and bundle assignments</p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - File Selection & Global Settings */}
          <div className="w-1/3 border-r bg-gray-50 flex flex-col">
            {/* File Upload Area */}
            <div className="p-6 border-b">
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, MP4 up to 10MB each</p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </div>

            {/* Global Settings */}
            <div className="p-6 border-b">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Apply to All Files
              </h3>
              
              {/* Global Categories */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {predefinedCategories.map(category => (
                    <button
                      key={category}
                      onClick={() => toggleGlobalCategory(category)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        globalCategories.includes(category)
                          ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {globalCategories.includes(category) && <Check className="w-3 h-3 inline mr-1" />}
                      {category}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Custom category"
                    className="form-input flex-1 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addGlobalCategory()}
                  />
                  <button onClick={addGlobalCategory} className="btn-secondary px-3">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Global Tags */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Add tag"
                    className="form-input flex-1 text-sm"
                    onKeyPress={(e) => e.key === 'Enter' && addGlobalTag()}
                  />
                  <button onClick={addGlobalTag} className="btn-secondary px-3">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {globalTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {globalTags.map(tag => (
                      <span key={tag} className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Global Bundle Assignment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign to Bundles</label>
                <div className="space-y-2 max-h-32 overflow-y-auto mb-2">
                  {availableBundles.map(bundle => (
                    <label key={bundle.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={globalBundles.includes(bundle.id)}
                        onChange={() => toggleGlobalBundle(bundle.id)}
                        className="form-checkbox"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{bundle.name}</p>
                        <p className="text-xs text-gray-500">{bundle.content_count} items</p>
                      </div>
                    </label>
                  ))}
                </div>
                
                {/* Quick Bundle Creation */}
                {!showBundleCreation ? (
                  <button
                    onClick={() => setShowBundleCreation(true)}
                    className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1 py-2 border border-blue-200 rounded hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4" />
                    Create New Bundle
                  </button>
                ) : (
                  <div className="space-y-2">
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
                        Create
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
            </div>

            {/* Upload Summary */}
            <div className="p-6 bg-white">
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Upload Summary:</p>
                <p>• {files.length} file(s) selected</p>
                <p>• {globalCategories.length} global categories</p>
                <p>• {globalBundles.length} bundles selected</p>
              </div>
            </div>
          </div>

          {/* Right Panel - File Preview & Individual Settings */}
          <div className="flex-1 flex flex-col">
            {files.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Image className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No files selected</p>
                  <p className="text-sm">Upload files to see preview and individual settings</p>
                </div>
              </div>
            ) : (
              <>
                {/* File Grid */}
                <div className="p-6 border-b">
                  <h3 className="font-semibold text-gray-900 mb-4">Selected Files ({files.length})</h3>
                  <div className="grid grid-cols-4 gap-4 max-h-48 overflow-y-auto">
                    {files.map((file, index) => (
                      <div
                        key={index}
                        className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all ${
                          selectedFileIndex === index 
                            ? 'border-blue-500 ring-2 ring-blue-200' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => setSelectedFileIndex(index)}
                      >
                        <div className="aspect-square bg-gray-100">
                          {file.file.type.startsWith('image/') ? (
                            <img
                              src={file.preview}
                              alt={file.file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Video className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(index);
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-1">
                          <p className="text-xs truncate">{file.file.name}</p>
                        </div>
                        {/* Status indicators */}
                        <div className="absolute top-1 left-1 flex gap-1">
                          {file.categories.length > 0 && (
                            <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              {file.categories.length}
                            </div>
                          )}
                          {file.assignedBundles.length > 0 && (
                            <div className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              <Package className="w-3 h-3" />
                            </div>
                          )}
                          {file.textContent && (
                            <div className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              T
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Individual File Settings */}
                {selectedFile && (
                  <div className="flex-1 p-6 overflow-y-auto">
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-blue-600" />
                      Individual Settings: {selectedFile.file.name}
                    </h3>

                    <div className="space-y-6">
                      {/* Individual Categories */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Categories for this file</label>
                        <div className="flex flex-wrap gap-2">
                          {predefinedCategories.map(category => (
                            <button
                              key={category}
                              onClick={() => toggleFileCategory(selectedFileIndex!, category)}
                              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                                selectedFile.categories.includes(category)
                                  ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-300'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {selectedFile.categories.includes(category) && <Check className="w-3 h-3 inline mr-1" />}
                              {category}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Individual Text Content */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Text Content (optional)</label>
                        <textarea
                          value={selectedFile.textContent}
                          onChange={(e) => updateFileProperty(selectedFileIndex!, 'textContent', e.target.value)}
                          placeholder="Add text content for this file..."
                          className="form-textarea w-full"
                          rows={3}
                        />
                      </div>

                      {/* Individual Bundle Assignment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Bundle Assignment for this file</label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {availableBundles.map(bundle => (
                            <label key={bundle.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedFile.assignedBundles.includes(bundle.id)}
                                onChange={() => toggleFileBundle(selectedFileIndex!, bundle.id)}
                                className="form-checkbox"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{bundle.name}</p>
                                <p className="text-xs text-gray-500">{bundle.bundle_type} • {bundle.content_count} items</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {files.length > 0 && (
              <div className="flex items-center gap-4">
                <span>{files.length} files ready</span>
                <span>•</span>
                <span>{files.filter(f => f.textContent).length} with text</span>
                <span>•</span>
                <span>{files.reduce((acc, f) => acc + f.assignedBundles.length, 0)} bundle assignments</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="btn-secondary"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="btn-primary flex items-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {files.length} File{files.length !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CentralContentUploadModal; 