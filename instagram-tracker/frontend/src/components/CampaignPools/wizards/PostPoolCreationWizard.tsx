import React, { useState, useCallback, useRef, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Trash2, ImagePlus, GripVertical, Layers, XSquare } from 'lucide-react';
import { CreateCampaignPoolRequest, HighlightGroup } from '../../../types/campaignPools';
import { FormRow, FormLabel, FormInput, FormTextarea, FormSelect, FormSwitch } from '../form/FormComponents';
import { Button } from '../../ui/button';
import { useDropzone } from 'react-dropzone';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

interface UploadedPostFile {
    id: string;
    file: File;
    preview: string;
    caption: string;
    groupId?: string;
    addToHighlights: boolean;
    targetHighlightGroupId?: number;
}

interface PostPoolCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onPoolCreate: (poolData: CreateCampaignPoolRequest & { content_files: File[], captions: string[], post_groups: (string|null)[] }) => Promise<void>;
  availableHighlightGroups: HighlightGroup[];
}

const PostPoolCreationWizard: React.FC<PostPoolCreationWizardProps> = ({ isOpen, onClose, onPoolCreate, availableHighlightGroups }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    contentFormat: 'single' | 'multi';
    files: UploadedPostFile[];
  }>({
    name: '',
    description: '',
    contentFormat: 'multi',
    files: [],
  });
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedPostFile[] = acceptedFiles.map(file => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        file,
        preview: URL.createObjectURL(file),
        caption: '',
        addToHighlights: false,
    }));
    setFormData(prev => ({ ...prev, files: [...prev.files, ...newFiles].slice(0, 20) }));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.gif', '.webp'] },
    maxSize: 50 * 1024 * 1024,
  });

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(formData.files);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFormData(prev => ({ ...prev, files: items }));
  };

  const removeFile = (id: string) => {
    setFormData(prev => ({ ...prev, files: prev.files.filter(f => f.id !== id) }));
  };

  const updateFile = (id: string, updates: Partial<UploadedPostFile>) => {
    setFormData(prev => ({
        ...prev,
        files: formData.files.map(f => f.id === id ? {...f, ...updates} : f)
    }));
  };
  
  const groupSelectedFiles = () => {
    if (selectedFiles.length <= 1) return;
    const groupId = `group-${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      files: prev.files.map(f => selectedFiles.includes(f.id) ? { ...f, groupId } : f)
    }));
    setSelectedFiles([]);
  };
  
  const ungroupFiles = (groupId: string) => {
    setFormData(prev => ({
        ...prev,
        files: prev.files.map(f => f.groupId === groupId ? { ...f, groupId: undefined } : f)
    }));
  }

  const handleCreate = async () => {
    const { name, description, contentFormat, files } = formData;
    const poolData = {
      name,
      description,
      pool_type: 'post' as 'post',
      content_format: contentFormat,
      content_files: files.map(f => f.file),
      captions: files.map(f => f.caption),
      post_groups: files.map(f => f.groupId || null),
      target_highlight_groups: files.map(f => f.targetHighlightGroupId).filter(Boolean) as number[],
      auto_add_to_highlights: files.some(f => f.addToHighlights)
    };
    // @ts-ignore
    await onPoolCreate(poolData);
    onClose();
  };

  const groupedAndSortedFiles = useMemo(() => {
      const grouped: Record<string, UploadedPostFile[]> = {};
      const ungrouped: UploadedPostFile[] = [];
      formData.files.forEach(file => {
          if (file.groupId) {
              if (!grouped[file.groupId]) {
                  grouped[file.groupId] = [];
              }
              grouped[file.groupId].push(file);
          } else {
              ungrouped.push(file);
          }
      });
      return { grouped, ungrouped };
  }, [formData.files]);

  const steps = [ { id: 1, title: 'Basic Information' }, { id: 2, title: 'Upload & Organize Content' } ];
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-50 flex justify-center items-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Create New Post Pool</h2>
            <p className="text-sm text-gray-500">Organize your post content into reusable collections.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X className="w-6 h-6 text-gray-500" /></button>
        </div>
        
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="p-8 overflow-y-auto">
              {step === 1 && (
                <>
                  <FormRow><FormLabel htmlFor="post-pool-name" label="Pool Name" required /><FormInput id="post-pool-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Summer Highlights" /></FormRow>
                  <FormRow><FormLabel htmlFor="post-pool-description" label="Description" /><FormTextarea id="post-pool-description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="A short description of the posts in this pool." /></FormRow>
                  <FormRow><FormLabel htmlFor="content-format" label="Content Format" /><FormSelect id="content-format" value={formData.contentFormat} onChange={(e) => setFormData({...formData, contentFormat: e.target.value as 'single' | 'multi'})}><option value="multi">Multi-Image Posts (Carousel)</option><option value="single">Single-Image Posts</option></FormSelect></FormRow>
                </>
              )}
              {step === 2 && (
                <div>
                  <div {...getRootProps()} className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300 hover:border-blue-500'}`}>
                    <input {...getInputProps()} ref={fileInputRef} />
                    <div className="space-y-4"><div className="text-6xl">📤</div>
                      <div><h3 className="text-lg font-medium">Drop images here or click to upload</h3><p className="text-sm text-gray-500">Max 20 images. Drag to reorder.</p></div>
                    </div>
                  </div>
                  { selectedFiles.length > 1 && formData.contentFormat === 'multi' &&
                    <div className="my-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                        <span>{selectedFiles.length} items selected.</span>
                        <Button onClick={groupSelectedFiles}><ImagePlus className="mr-2 h-4 w-4" /> Group as Carousel</Button>
                    </div>
                  }
                  <Droppable droppableId="postFiles">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="mt-4 grid grid-cols-1 gap-6">
                        {Object.entries(groupedAndSortedFiles.grouped).map(([groupId, items]) => (
                            <div key={groupId} className="p-4 border-2 border-blue-400 rounded-lg bg-blue-50">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center">
                                        <Layers className="h-5 w-5 text-blue-600 mr-2" />
                                        <h4 className="font-semibold text-blue-800">Carousel Group ({items.length} items)</h4>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => ungroupFiles(groupId)}><XSquare className="h-4 w-4 mr-1"/> Ungroup</Button>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                {items.map((item, index) => (
                                    <Draggable key={item.id} draggableId={item.id} index={formData.files.findIndex(f => f.id === item.id)}>
                                        {(provided, snapshot) => (
                                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${snapshot.isDragging ? 'border-blue-600' : 'border-transparent'} ${selectedFiles.includes(item.id) ? 'border-green-500' : ''}`}>
                                              <img src={item.preview} alt={item.file.name} className="w-full h-32 object-cover" />
                                          </div>
                                        )}
                                    </Draggable>
                                ))}
                                </div>
                            </div>
                        ))}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {groupedAndSortedFiles.ungrouped.map((item, index) => (
                              <Draggable key={item.id} draggableId={item.id} index={formData.files.findIndex(f => f.id === item.id)}>
                                {(provided, snapshot) => (
                                  <div ref={provided.innerRef} {...provided.draggableProps} className={`bg-white rounded-lg shadow-md overflow-hidden border-2 ${snapshot.isDragging ? 'border-blue-500' : 'border-transparent'} ${selectedFiles.includes(item.id) ? 'border-green-500' : ''}`}>
                                    <div className="relative">
                                        <img src={item.preview} alt={item.file.name} className="w-full h-40 object-cover cursor-pointer" onClick={() => {
                                            const newSelected = selectedFiles.includes(item.id) ? selectedFiles.filter(id => id !== item.id) : [...selectedFiles, item.id];
                                            setSelectedFiles(newSelected);
                                        }}/>
                                        <div {...provided.dragHandleProps} className="absolute top-1 left-1 bg-black bg-opacity-50 text-white p-1 rounded-full cursor-grab"><GripVertical size={16} /></div>
                                        <button type="button" onClick={() => removeFile(item.id)} className="absolute top-1 right-1 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-red-600"><Trash2 size={16} /></button>
                                    </div>
                                    <div className="p-3">
                                      <FormTextarea id={`caption-${item.id}`} value={item.caption} onChange={(e) => updateFile(item.id, { caption: e.target.value })} placeholder="Enter caption..." rows={2} />
                                      <div className="mt-2">
                                          <FormLabel htmlFor={`highlight-${item.id}`} label="Add to Highlight" />
                                          <FormSwitch id={`highlight-${item.id}`} checked={item.addToHighlights} onChange={(checked) => updateFile(item.id, { addToHighlights: checked })} />
                                      </div>
                                      {item.addToHighlights && (
                                        <FormSelect id={`highlight-group-${item.id}`} value={String(item.targetHighlightGroupId || '')} onChange={(e) => updateFile(item.id, { targetHighlightGroupId: Number(e.target.value) })}>
                                          <option value="">Select group...</option>
                                          {availableHighlightGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                        </FormSelect>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                        </div>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )}
            </div>
        </DragDropContext>
        
        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center space-x-2">
            {steps.map(s => <div key={s.id} className={`w-3 h-3 rounded-full ${s.id <= step ? 'bg-blue-600' : 'bg-gray-300'}`}></div>)}
          </div>
          <div className="flex space-x-4">
            {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}><ChevronLeft className="mr-2 h-4 w-4" /> Back</Button>}
            {step < steps.length ? <Button onClick={() => setStep(step + 1)}>Next <ChevronRight className="ml-2 h-4 w-4" /></Button> : <Button onClick={handleCreate} variant="primary"><Check className="mr-2 h-4 w-4" /> Create Pool</Button>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostPoolCreationWizard; 