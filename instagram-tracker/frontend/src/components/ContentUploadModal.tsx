import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Upload, X, Image, Video, FileText, Plus, Check, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ContentCategory {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}

const CONTENT_CATEGORIES: ContentCategory[] = [
  {
    id: 'pfp',
    label: 'Profile Picture',
    description: 'Images for profile picture updates',
    icon: Image,
    color: 'bg-blue-100 text-blue-800 border-blue-200'
  },
  {
    id: 'bio',
    label: 'Bio Content',
    description: 'Text content for bio updates',
    icon: FileText,
    color: 'bg-green-100 text-green-800 border-green-200'
  },
  {
    id: 'post',
    label: 'Posts',
    description: 'Images and videos for posts',
    icon: Image,
    color: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'highlight',
    label: 'Story Highlights',
    description: 'Content for story highlights',
    icon: Video,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    id: 'story',
    label: 'Stories',
    description: 'Content for story posts',
    icon: Video,
    color: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  {
    id: 'any',
    label: 'Universal',
    description: 'Can be used for any warmup phase',
    icon: Plus,
    color: 'bg-gray-100 text-gray-800 border-gray-200'
  }
];

interface UploadFile {
  id: string;
  file: File;
  preview?: string;
  categories: Set<string>;
  textContent?: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
}

interface ContentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: number;
  onSuccess?: () => void;
}

const ContentUploadModal: React.FC<ContentUploadModalProps> = ({
  isOpen,
  onClose,
  modelId,
  onSuccess
}) => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setFiles([]);
      setIsDragOver(false);
      setIsUploading(false);
    }
  }, [isOpen]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const createFilePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const processFiles = async (fileList: FileList) => {
    const newFiles: UploadFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Validate file type
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error(`Invalid file type: ${file.name}. Only images and videos are allowed.`);
        continue;
      }
      
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File too large: ${file.name}. Maximum size is 10MB.`);
        continue;
      }
      
      const preview = await createFilePreview(file);
      
      newFiles.push({
        id: `${Date.now()}-${i}`,
        file,
        preview,
        categories: new Set(),
        textContent: '',
        uploading: false,
        uploaded: false
      });
    }
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const fileList = e.dataTransfer.files;
    if (fileList.length > 0) {
      await processFiles(fileList);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (fileList && fileList.length > 0) {
      await processFiles(fileList);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const toggleCategory = (fileId: string, categoryId: string) => {
    setFiles(prev => prev.map(file => {
      if (file.id === fileId) {
        const newCategories = new Set(file.categories);
        if (newCategories.has(categoryId)) {
          newCategories.delete(categoryId);
        } else {
          newCategories.add(categoryId);
        }
        return { ...file, categories: newCategories };
      }
      return file;
    }));
  };

  const updateTextContent = (fileId: string, textContent: string) => {
    setFiles(prev => prev.map(file => {
      if (file.id === fileId) {
        return { ...file, textContent };
      }
      return file;
    }));
  };

  const uploadFiles = async () => {
    const filesToUpload = files.filter(f => !f.uploaded && f.categories.size > 0);
    
    if (filesToUpload.length === 0) {
      toast.error('Please select at least one file and assign categories.');
      return;
    }

    setIsUploading(true);

    try {
      for (const file of filesToUpload) {
        // Update file status
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, uploading: true } : f
        ));

        const formData = new FormData();
        formData.append('file', file.file);
        formData.append('categories', JSON.stringify(Array.from(file.categories)));
        formData.append('modelId', modelId.toString());
        if (file.textContent && file.textContent.trim()) {
          formData.append('textContent', file.textContent.trim());
        }

        try {
          const response = await fetch(`http://localhost:3001/api/models/${modelId}/content`, {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Upload failed: ${response.statusText}`);
          }

          // Update file status - success
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, uploading: false, uploaded: true }
              : f
          ));

          toast.success(`Uploaded: ${file.file.name}`);
        } catch (error: any) {
          // Update file status - error
          setFiles(prev => prev.map(f => 
            f.id === file.id 
              ? { ...f, uploading: false, error: error.message }
              : f
          ));

          toast.error(`Failed to upload ${file.file.name}: ${error.message}`);
        }
      }

      // Check if all files uploaded successfully
      const allUploaded = files.every(f => f.uploaded || f.error);
      if (allUploaded) {
        toast.success('All files processed!');
        onSuccess?.();
        setTimeout(onClose, 1500); // Close modal after success
      }
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  const hasValidFiles = files.some(f => f.categories.size > 0);
  const uploadedCount = files.filter(f => f.uploaded).length;
  const errorCount = files.filter(f => f.error).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upload Content</h2>
            <p className="text-sm text-gray-500 mt-1">
              Upload images and videos for your model's warmup phases
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            disabled={isUploading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Supports images and videos up to 10MB each
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary"
              disabled={isUploading}
            >
              <Plus className="h-4 w-4 mr-2" />
              Select Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Files ({files.length})
                {uploadedCount > 0 && (
                  <span className="text-green-600 ml-2">• {uploadedCount} uploaded</span>
                )}
                {errorCount > 0 && (
                  <span className="text-red-600 ml-2">• {errorCount} failed</span>
                )}
              </h3>
              
              <div className="space-y-4">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className={`border rounded-lg p-4 ${
                      file.uploaded ? 'bg-green-50 border-green-200' :
                      file.error ? 'bg-red-50 border-red-200' :
                      'bg-white border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* File Preview */}
                      <div className="flex-shrink-0">
                        {file.preview ? (
                          <img
                            src={file.preview}
                            alt={file.file.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                            <Video className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* File Info */}
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 truncate">
                            {file.file.name}
                          </h4>
                          <div className="flex items-center gap-2">
                            {file.uploading && (
                              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            )}
                            {file.uploaded && (
                              <Check className="h-4 w-4 text-green-600" />
                            )}
                            {file.error && (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            {!file.uploaded && !file.uploading && (
                              <button
                                onClick={() => removeFile(file.id)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-gray-500 mb-3">
                          {(file.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                        {/* Error Message */}
                        {file.error && (
                          <div className="mb-3 p-2 bg-red-100 border border-red-200 rounded text-sm text-red-700">
                            {file.error}
                          </div>
                        )}

                        {/* Text Content Input */}
                        {!file.uploaded && (
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Text Content (optional)
                            </label>
                            <textarea
                              value={file.textContent || ''}
                              onChange={(e) => updateTextContent(file.id, e.target.value)}
                              placeholder="Enter text content for this image/video..."
                              className="form-textarea h-20 text-sm"
                              disabled={file.uploading}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              If provided, this text will be assigned to the image and won't be randomly assigned later.
                            </p>
                          </div>
                        )}

                        {/* Category Selection */}
                        {!file.uploaded && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Categories ({file.categories.size} selected)
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {CONTENT_CATEGORIES.map((category) => {
                                const isSelected = file.categories.has(category.id);
                                const Icon = category.icon;
                                
                                return (
                                  <button
                                    key={category.id}
                                    onClick={() => toggleCategory(file.id, category.id)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                                      isSelected
                                        ? category.color
                                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                    }`}
                                    disabled={file.uploading}
                                  >
                                    <Icon className="h-4 w-4" />
                                    {category.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {files.length > 0 && (
              <>
                {hasValidFiles ? (
                  <span className="text-green-600">
                    ✓ {files.filter(f => f.categories.size > 0).length} files ready to upload
                  </span>
                ) : (
                  <span className="text-yellow-600">
                    ⚠ Please assign categories to files before uploading
                  </span>
                )}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              onClick={uploadFiles}
              className="btn-primary"
              disabled={!hasValidFiles || isUploading}
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Files
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentUploadModal; 