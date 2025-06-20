import React, { useState, useCallback, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  Info,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { CreateCampaignPoolRequest, HighlightGroup } from '../../../types/campaignPools';
import { FormRow, FormLabel, FormInput, FormTextarea, FormSwitch, FormSelect } from './../form/FormComponents';
import { Button } from '../../ui/button';

interface UploadedStoryFile {
  temporaryId: string;
  file: File;
  preview: string;
  addToHighlights: boolean;
  targetHighlightGroup?: number;
  fileName: string;
  fileSize: number;
}

interface StoryPoolCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onPoolCreate: (poolData: CreateCampaignPoolRequest) => Promise<void>;
  availableHighlightGroups: HighlightGroup[];
}

const StoryPoolCreationWizard: React.FC<StoryPoolCreationWizardProps> = ({
  isOpen,
  onClose,
  onPoolCreate,
  availableHighlightGroups,
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    uploadedFiles: [] as UploadedStoryFile[],
  });

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((files: File[]) => {
    const newFiles = files.map(file => {
      const temporaryId = `temp_${Date.now()}_${Math.random()}`;
      return {
        temporaryId,
        file,
        preview: URL.createObjectURL(file),
        addToHighlights: false,
        fileName: file.name,
        fileSize: file.size,
      };
    });
    setFormData(prev => ({ ...prev, uploadedFiles: [...prev.uploadedFiles, ...newFiles] }));
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: handleFileUpload,
    accept: { 'image/*': [], 'video/*': [] },
  });

  const removeFile = (tempId: string) => {
    setFormData(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.filter(f => f.temporaryId !== tempId),
    }));
  };

  const updateFile = (tempId: string, updates: Partial<UploadedStoryFile>) => {
    setFormData(prev => ({
      ...prev,
      uploadedFiles: prev.uploadedFiles.map(f => (f.temporaryId === tempId ? { ...f, ...updates } : f)),
    }));
  };

  const steps = [
    { id: 1, name: 'Basic Info' },
    { id: 2, name: 'Upload Content' },
    { id: 3, name: 'Review & Create' },
  ];

  const handleCreate = async () => {
    const { name, description, uploadedFiles } = formData;
    const poolData: CreateCampaignPoolRequest = {
      name,
      description,
      pool_type: 'story',
      auto_add_to_highlights: uploadedFiles.some(f => f.addToHighlights),
      target_highlight_groups: uploadedFiles.map(f => f.targetHighlightGroup).filter(Boolean) as number[],
      content_files: uploadedFiles.map(f => f.file),
    };
    await onPoolCreate(poolData);
    onClose();
  };
  
  if (!isOpen) return null;

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <FormRow>
              <FormLabel htmlFor="story-pool-name" label="Pool Name" required />
              <FormInput id="story-pool-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Daily Snaps" />
            </FormRow>
            <FormRow>
              <FormLabel htmlFor="story-pool-description" label="Description" />
              <FormTextarea id="story-pool-description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="A short description of the stories in this pool." />
            </FormRow>
          </>
        );
      case 2:
        return (
            <div>
                <div
                    {...getRootProps()}
                    className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragOver 
                        ? 'border-blue-400 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={() => setDragOver(true)}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={() => setDragOver(false)}
                >
                    <input {...getInputProps()} ref={fileInputRef} />
                    <div className="space-y-4">
                        <div className="text-6xl">📤</div>
                        <div>
                            <h3 className="text-lg font-medium text-gray-900">
                                {dragOver ? 'Drop files here' : 'Upload story content'}
                            </h3>
                            <p className="text-gray-500 mt-1">
                                Drag and drop or{' '}
                                <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-blue-600 hover:text-blue-500 font-medium"
                                >
                                browse files
                                </button>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.uploadedFiles.map((uploadedFile) => (
                        <div key={uploadedFile.temporaryId} className="group relative border rounded-lg overflow-hidden">
                            <img src={uploadedFile.preview} alt={uploadedFile.fileName} className="w-full h-40 object-cover" />
                            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => removeFile(uploadedFile.temporaryId)} className="text-white p-2 bg-red-500 rounded-full">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="p-2 border-t">
                                <FormSwitch id={`add-to-hl-${uploadedFile.temporaryId}`} checked={uploadedFile.addToHighlights} onChange={(checked) => updateFile(uploadedFile.temporaryId, { addToHighlights: checked })} />
                                <FormLabel htmlFor={`add-to-hl-${uploadedFile.temporaryId}`} label="Add to Highlight" />
                                {uploadedFile.addToHighlights && (
                                    <FormSelect id={`hl-group-${uploadedFile.temporaryId}`} value={String(uploadedFile.targetHighlightGroup || '')} onChange={(e) => updateFile(uploadedFile.temporaryId, { targetHighlightGroup: Number(e.target.value) })} className="mt-2">
                                        <option value="">Select Group...</option>
                                        {availableHighlightGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                    </FormSelect>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
      case 3:
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Review</h3>
            <p>You are about to create a story pool named <span className="font-bold">{formData.name}</span> with <span className="font-bold">{formData.uploadedFiles.length}</span> items.</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Create New Story Pool</h2>
            <p className="text-sm text-gray-500">Organize your story content into reusable collections.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-8 overflow-y-auto">
          {renderStepContent()}
        </div>

        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center space-x-2">
            {steps.map(s => (
              <div key={s.id} className={`w-3 h-3 rounded-full ${s.id <= step ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
            ))}
          </div>
          <div className="flex space-x-4">
            {step > 1 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>
            )}
            {step < steps.length ? (
              <Button onClick={() => setStep(step + 1)}>
                Next <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleCreate} variant="primary">
                <Check className="mr-2 h-4 w-4" /> Create Pool
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryPoolCreationWizard; 