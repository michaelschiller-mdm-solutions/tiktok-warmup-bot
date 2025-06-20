import React, { useState } from 'react';
import { FormRow, FormLabel, FormInput, FormTextarea, FormSelect } from './FormComponents';

const PostPoolForm: React.FC = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [contentFormat, setContentFormat] = useState<'single' | 'multi'>('multi');

  return (
    <div>
      <FormRow>
        <FormLabel htmlFor="post-pool-name" label="Pool Name" description="A descriptive name for your post pool." />
        <FormInput id="post-pool-name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., European Trip Highlights" />
      </FormRow>
      <FormRow>
        <FormLabel htmlFor="post-pool-description" label="Description" description="An optional description for internal reference." />
        <FormTextarea id="post-pool-description" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g., Key posts from the 2-week trip." />
      </FormRow>
      <FormRow>
        <FormLabel htmlFor="content-format" label="Content Format" description="Choose how posts are created from this pool." />
        <FormSelect id="content-format" value={contentFormat} onChange={e => setContentFormat(e.target.value as 'single' | 'multi')}>
          <option value="multi">Multi-Image Posts (up to 8 images per post)</option>
          <option value="single">Single-Image Posts</option>
        </FormSelect>
      </FormRow>
    </div>
  );
};

export default PostPoolForm; 