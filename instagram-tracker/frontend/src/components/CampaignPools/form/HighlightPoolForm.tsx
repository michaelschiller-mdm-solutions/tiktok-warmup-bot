import React, { useState } from 'react';
import { FormRow, FormLabel, FormInput, FormTextarea, FormSelect, FormInputNumber } from './FormComponents';

const HighlightPoolForm: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contentOrder, setContentOrder] = useState<'chronological' | 'random'>('chronological');
  const [defaultDelayHours, setDefaultDelayHours] = useState(24);
  const [highlightCaption, setHighlightCaption] = useState('');

  return (
    <div>
      <FormRow>
        <FormLabel htmlFor="highlight-pool-name" label="Pool Name" description="A descriptive name for your highlight pool." />
        <FormInput id="highlight-pool-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Travel Memories" />
      </FormRow>
      <FormRow>
        <FormLabel htmlFor="highlight-pool-description" label="Description" description="An optional description for internal reference." />
        <FormTextarea id="highlight-pool-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Long-term collection of travel highlights." />
      </FormRow>
       <FormRow>
        <FormLabel htmlFor="highlight-caption" label="Highlight Caption" description="The single caption that will be used for the entire Instagram Highlight group." />
        <FormInput id="highlight-caption" value={highlightCaption} onChange={e => setHighlightCaption(e.target.value)} placeholder="e.g., My Adventures!" />
      </FormRow>
      <FormRow>
        <FormLabel htmlFor="content-order" label="Content Order" description="Choose how content is posted from this pool." />
        <FormSelect id="content-order" value={contentOrder} onChange={e => setContentOrder(e.target.value as 'chronological' | 'random')}>
          <option value="chronological">Chronological</option>
          <option value="random">Random</option>
        </FormSelect>
      </FormRow>
      {contentOrder === 'chronological' && (
        <FormRow>
          <FormLabel htmlFor="default-delay-hours" label="Default Delay (Hours)" description="The default time between uploads for chronological posts. This can be overridden per item." />
          <FormInputNumber id="default-delay-hours" value={defaultDelayHours} onChange={setDefaultDelayHours} min={1} />
        </FormRow>
      )}
    </div>
  );
};

export default HighlightPoolForm; 