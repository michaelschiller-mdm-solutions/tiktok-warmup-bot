import React, { useState } from 'react';
import { FormRow, FormLabel, FormInput, FormTextarea, FormSwitch, FormSelect } from './FormComponents';
import { HighlightGroup } from '../../../types/campaignPools';

interface StoryPoolFormProps {
  // Mock data for now, will be fetched from API later
  availableHighlightGroups: HighlightGroup[];
}

const StoryPoolForm: React.FC<StoryPoolFormProps> = ({ availableHighlightGroups }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [autoAddToHighlights, setAutoAddToHighlights] = useState(false);
  const [targetHighlightGroups, setTargetHighlightGroups] = useState<number[]>([]);

  const handleHighlightGroupChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    setTargetHighlightGroups(selectedOptions);
  };

  return (
    <div>
      <FormRow>
        <FormLabel htmlFor="story-pool-name" label="Pool Name" description="A descriptive name for your story pool." />
        <FormInput id="story-pool-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Summer Vibes 2024" />
      </FormRow>
      <FormRow>
        <FormLabel htmlFor="story-pool-description" label="Description" description="An optional description for internal reference." />
        <FormTextarea id="story-pool-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Daily stories for the summer campaign." />
      </FormRow>
      <FormRow>
        <FormLabel htmlFor="auto-add-to-highlights" label="Add to Highlights" description="Automatically add stories from this pool to selected highlight groups." />
        <FormSwitch id="auto-add-to-highlights" checked={autoAddToHighlights} onChange={setAutoAddToHighlights} />
      </FormRow>
      {autoAddToHighlights && (
        <FormRow>
          <FormLabel htmlFor="target-highlight-groups" label="Target Highlight Groups" description="Select one or more highlight groups to add these stories to." />
          <FormSelect id="target-highlight-groups" value={targetHighlightGroups.toString()} onChange={handleHighlightGroupChange} >
             {/* This will be a multi-select in a future step */}
             <option value="">Select groups...</option>
            {availableHighlightGroups.map(group => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </FormSelect>
        </FormRow>
      )}
    </div>
  );
};

export default StoryPoolForm; 