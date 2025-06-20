import React, { useState } from 'react';
import { UploadedFile } from './ContentUpload';

interface PostContentConfigProps {
  files: UploadedFile[];
  onGroupsChange: (groups: UploadedFile[][]) => void;
}

const PostContentConfig: React.FC<PostContentConfigProps> = ({ files, onGroupsChange }) => {
  const [groups, setGroups] = useState<UploadedFile[][]>(files.map(f => [f]));

  // Placeholder for drag-and-drop logic to regroup files
  const handleRegroup = () => {
    // This will be implemented with react-beautiful-dnd in a future step
    console.log("Regrouping logic will go here.");
  };

  return (
    <div className="space-y-4 mt-4">
      <h4 className="text-lg font-semibold">Group Content for Posts</h4>
      <p className="text-sm text-gray-500">Drag and drop images to create multi-image posts (up to 8 images per group).</p>
      
      <div className="p-4 bg-gray-50 rounded-lg space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="p-2 border rounded-md bg-white">
            <p className="text-xs font-bold text-gray-600 mb-2">Post {groupIndex + 1}</p>
            <div className="flex flex-wrap gap-2">
              {group.map((file) => (
                <div key={file.id} className="relative w-20 h-20">
                  <img src={file.preview} alt={file.file.name} className="w-full h-full object-cover rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PostContentConfig; 