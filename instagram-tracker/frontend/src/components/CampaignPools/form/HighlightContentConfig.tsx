import React from 'react';
import { UploadedFile } from './ContentUpload';
import { FormSelect, FormInputNumber } from './FormComponents';

interface HighlightContentConfigProps {
  files: UploadedFile[];
  onFileConfigChange: (fileId: string, config: any) => void;
  configs: { [key: string]: any };
}

const HighlightContentConfig: React.FC<HighlightContentConfigProps> = ({ files, onFileConfigChange, configs }) => {
  return (
    <div className="space-y-4 mt-4">
      <h4 className="text-lg font-semibold">Configure Content Items</h4>
      <div className="space-y-3">
        {files.map(file => {
          const config = configs[file.id] || { format: 'story_and_post', delay: 24 };
          return (
            <div key={file.id} className="flex items-center space-x-4 p-2 border rounded-lg">
              <img src={file.preview} alt={file.file.name} className="w-16 h-16 object-cover rounded" />
              <div className="flex-grow">
                <p className="font-medium text-sm truncate">{file.file.name}</p>
              </div>
              <div className="w-40">
                <FormSelect
                  id={`format-${file.id}`}
                  value={config.format}
                  onChange={e => onFileConfigChange(file.id, { ...config, format: e.target.value })}
                >
                  <option value="story_and_post">Post + Story</option>
                  <option value="story_only">Story Only</option>
                </FormSelect>
              </div>
              <div className="w-40">
                <FormInputNumber
                  id={`delay-${file.id}`}
                  value={config.delay}
                  onChange={value => onFileConfigChange(file.id, { ...config, delay: value })}
                  min={1}
                />
                 <label htmlFor={`delay-${file.id}`} className="text-xs text-gray-500 ml-2">hours delay</label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HighlightContentConfig; 