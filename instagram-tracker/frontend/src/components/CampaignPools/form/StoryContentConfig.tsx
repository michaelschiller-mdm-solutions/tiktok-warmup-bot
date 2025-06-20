import React from 'react';
import { UploadedFile } from './ContentUpload';
import { FormSwitch } from './FormComponents';

interface StoryContentConfigProps {
  files: UploadedFile[];
  onFileConfigChange: (fileId: string, config: any) => void;
  configs: { [key: string]: any };
}

const StoryContentConfig: React.FC<StoryContentConfigProps> = ({ files, onFileConfigChange, configs }) => {
  return (
    <div className="space-y-4 mt-4">
      <h4 className="text-lg font-semibold">Configure Story Items</h4>
      <div className="space-y-3">
        {files.map(file => {
          const config = configs[file.id] || { addToHighlights: false };
          return (
            <div key={file.id} className="flex items-center space-x-4 p-2 border rounded-lg">
              <img src={file.preview} alt={file.file.name} className="w-16 h-16 object-cover rounded" />
              <div className="flex-grow">
                <p className="font-medium text-sm truncate">{file.file.name}</p>
              </div>
              <div className="flex items-center">
                 <label htmlFor={`add-to-highlights-${file.id}`} className="text-sm text-gray-600 mr-2">Add to Highlights?</label>
                <FormSwitch
                  id={`add-to-highlights-${file.id}`}
                  checked={config.addToHighlights}
                  onChange={checked => onFileConfigChange(file.id, { ...config, addToHighlights: checked })}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StoryContentConfig; 