import React, { useState, useCallback, useRef } from 'react';
import { StepProps, SprintContentItem, UploadProgress } from '../../../types/sprintCreation';

const ContentUploadStep: React.FC<StepProps> = ({
  data,
  onChange,
  errors,
  onStepComplete,
  isActive
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const contentItems = data.content_items || [];

  // Handle file uploads
  const handleFileUpload = useCallback(async (files: File[]) => {
    const newItems: SprintContentItem[] = [];

    for (const file of files) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        continue; // Skip non-media files
      }

      const temporaryId = `temp_${Date.now()}_${Math.random()}`;
      const preview = URL.createObjectURL(file);

      // Create preview item
      const newItem: SprintContentItem = {
        temporaryId,
        content_type: 'story', // Default to story
        file_path: preview,
        fileName: file.name,
        fileSize: file.size,
        delay_after_hours: 24,
        description: '',
        position: contentItems.length + newItems.length,
        preview
      };

      newItems.push(newItem);

      // Track upload progress
      setUploadProgress(prev => ({
        ...prev,
        [temporaryId]: {
          fileId: temporaryId,
          progress: 0,
          status: 'uploading'
        }
      }));

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 20) {
        setTimeout(() => {
          setUploadProgress(prev => ({
            ...prev,
            [temporaryId]: {
              fileId: temporaryId,
              progress,
              status: progress === 100 ? 'completed' : 'uploading'
            }
          }));
        }, progress * 10);
      }
    }

    onChange({
      ...data,
      content_items: [...contentItems, ...newItems]
    });
  }, [data, onChange, contentItems]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  }, [handleFileUpload]);

  // Content item management
  const updateContentItem = useCallback((index: number, updates: Partial<SprintContentItem>) => {
    const updatedItems = [...contentItems];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    
    onChange({
      ...data,
      content_items: updatedItems
    });
  }, [contentItems, data, onChange]);

  const removeContentItem = useCallback((index: number) => {
    const updatedItems = contentItems.filter((_, i) => i !== index);
    // Reorder positions
    const reorderedItems = updatedItems.map((item, i) => ({ ...item, position: i }));
    
    onChange({
      ...data,
      content_items: reorderedItems
    });
  }, [contentItems, data, onChange]);

  const reorderItems = useCallback((fromIndex: number, toIndex: number) => {
    const items = [...contentItems];
    const [removed] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, removed);
    
    // Update positions
    const reorderedItems = items.map((item, index) => ({ ...item, position: index }));
    
    onChange({
      ...data,
      content_items: reorderedItems
    });
  }, [contentItems, data, onChange]);

  // Bulk operations
  const handleBulkUpdate = useCallback((updates: Partial<SprintContentItem>) => {
    const updatedItems = contentItems.map((item, index) => 
      selectedItems.includes(item.temporaryId || String(index)) 
        ? { ...item, ...updates }
        : item
    );
    
    onChange({
      ...data,
      content_items: updatedItems
    });
    setSelectedItems([]);
    setShowBulkEditor(false);
  }, [contentItems, selectedItems, data, onChange]);

  const handleBulkDelete = useCallback(() => {
    const updatedItems = contentItems.filter((item, index) => 
      !selectedItems.includes(item.temporaryId || String(index))
    );
    
    onChange({
      ...data,
      content_items: updatedItems.map((item, i) => ({ ...item, position: i }))
    });
    setSelectedItems([]);
  }, [contentItems, selectedItems, data, onChange]);

  // Smart categorization
  const suggestContentType = useCallback((fileName: string): string => {
    const lowerName = fileName.toLowerCase();
    if (lowerName.includes('story')) return 'story';
    if (lowerName.includes('post')) return 'post';
    if (lowerName.includes('highlight')) return 'highlight';
    if (lowerName.includes('reel') || lowerName.includes('video')) return 'post';
    return 'story'; // Default
  }, []);

  // Validation
  const isStepValid = contentItems.length > 0;

  // Note: Removed automatic step completion - user must click Next button
  // React.useEffect(() => {
  //   if (isStepValid) {
  //     onStepComplete();
  //   }
  // }, [isStepValid, onStepComplete]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Content</h2>
        <p className="text-gray-600">
          Upload images and videos for your content sprint. Drag to reorder and configure each item.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
          className="hidden"
        />
        
        <div className="space-y-4">
          <div className="text-6xl">
            {dragOver ? '📤' : '📱'}
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {dragOver ? 'Drop files here' : 'Upload content files'}
            </h3>
            <p className="text-gray-500 mt-1">
              Drag and drop images/videos or{' '}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                browse files
              </button>
            </p>
          </div>
          <div className="flex justify-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Images: JPG, PNG, WebP
            </div>
            <div className="flex items-center">
              <span className="w-2 h-2 bg-blue-400 rounded-full mr-2"></span>
              Videos: MP4, MOV, AVI
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedItems.length} item{selectedItems.length > 1 ? 's' : ''} selected
            </span>
            <button
              onClick={() => setShowBulkEditor(true)}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Edit Selected
            </button>
            <button
              onClick={handleBulkDelete}
              className="text-sm text-red-600 hover:text-red-500 font-medium"
            >
              Delete Selected
            </button>
          </div>
          <button
            onClick={() => setSelectedItems([])}
            className="text-sm text-gray-500 hover:text-gray-400"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Content Grid */}
      {contentItems.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Content Items ({contentItems.length})
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedItems(contentItems.map((item, index) => item.temporaryId || String(index)))}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Select All
              </button>
              <button
                onClick={() => setSelectedItems([])}
                className="text-sm text-gray-500 hover:text-gray-400"
              >
                Deselect All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contentItems.map((item, index) => {
              const itemId = item.temporaryId || String(index);
              const isSelected = selectedItems.includes(itemId);
              const progress = uploadProgress[itemId];

              return (
                <div
                  key={itemId}
                  className={`bg-white rounded-lg border shadow-sm transition-all ${
                    isSelected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Selection Checkbox */}
                  <div className="p-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems([...selectedItems, itemId]);
                            } else {
                              setSelectedItems(selectedItems.filter(id => id !== itemId));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">Select</span>
                      </label>
                      <button
                        onClick={() => removeContentItem(index)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Remove item"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="relative">
                    <img
                      src={item.preview || item.file_path}
                      alt={item.fileName || `Content ${index + 1}`}
                      className="w-full h-40 object-cover"
                    />
                    
                    {/* Upload Progress */}
                    {progress && progress.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <div className="bg-white rounded-lg p-4 text-center">
                          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-sm text-gray-600">{progress.progress}%</p>
                        </div>
                      </div>
                    )}

                    {/* Content Type Badge */}
                    <div className="absolute top-2 left-2">
                      <select
                        value={item.content_type}
                        onChange={(e) => updateContentItem(index, { content_type: e.target.value })}
                        className="text-xs bg-white bg-opacity-90 border border-gray-300 rounded px-2 py-1 font-medium"
                      >
                        <option value="story">📱 Story</option>
                        <option value="post">📸 Post</option>
                        <option value="highlight">⭐ Highlight</option>
                      </select>
                    </div>

                    {/* Position Badge */}
                    <div className="absolute top-2 right-2 bg-gray-900 bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                  </div>

                  {/* Item Details */}
                  <div className="p-4 space-y-3">
                    {/* File Info */}
                    <div className="text-xs text-gray-500">
                      {item.fileName && (
                        <div className="truncate">{item.fileName}</div>
                      )}
                      {item.fileSize && (
                        <div>{(item.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Caption
                      </label>
                      <textarea
                        value={item.description || ''}
                        onChange={(e) => updateContentItem(index, { description: e.target.value })}
                        placeholder="Add a caption..."
                        className="w-full text-sm border border-gray-300 rounded px-3 py-2 resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Delay Setting */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Delay After (hours)
                      </label>
                      <input
                        type="number"
                        value={item.delay_after_hours}
                        onChange={(e) => updateContentItem(index, { delay_after_hours: parseInt(e.target.value) || 24 })}
                        min="1"
                        max="168"
                        className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Validation Error */}
      {!isStepValid && contentItems.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg mb-2">📱</div>
          <p className="text-gray-500">Upload at least one content item to continue</p>
        </div>
      )}

      {/* Bulk Editor Modal */}
      {showBulkEditor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Edit {selectedItems.length} Items
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Type
                </label>
                <select className="w-full border border-gray-300 rounded px-3 py-2">
                  <option value="">Keep current values</option>
                  <option value="story">📱 Story</option>
                  <option value="post">📸 Post</option>
                  <option value="highlight">⭐ Highlight</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Delay After (hours)
                </label>
                <input
                  type="number"
                  placeholder="Keep current values"
                  className="w-full border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowBulkEditor(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleBulkUpdate({})}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentUploadStep; 