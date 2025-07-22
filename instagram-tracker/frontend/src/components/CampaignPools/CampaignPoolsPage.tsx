import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import CampaignPoolsTab from './CampaignPoolsTab';
import StoryPoolCreationWizard from './wizards/StoryPoolCreationWizard';
import PostPoolCreationWizard from './wizards/PostPoolCreationWizard';
import HighlightGroupCreationWizard from '../HighlightGroups/HighlightGroupCreationWizard';
import SprintCreationWizard from '../SprintCreation/SprintCreationWizard';
import { CreateCampaignPoolRequest, HighlightGroup } from '../../types/campaignPools';
import { ContentSprint } from '../../types/sprintCreation';

const CampaignPoolsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('sprints');
  const [isStoryWizardOpen, setIsStoryWizardOpen] = useState(false);
  const [isPostWizardOpen, setIsPostWizardOpen] = useState(false);
  const [isHighlightWizardOpen, setIsHighlightWizardOpen] = useState(false);
  const [isSprintWizardOpen, setIsSprintWizardOpen] = useState(false);

  // Mock data for wizards
  const [highlightGroups] = useState<HighlightGroup[]>([]);

  const handlePoolCreate = async (poolData: CreateCampaignPoolRequest) => {
    console.log("Pool data to be created:", poolData);
    // This is where an API call would be made, likely as a multipart/form-data request
    // For now, we just log the data and files.
    if (poolData.content_files) {
      console.log(`Received ${poolData.content_files.length} files.`);
    }
    setIsStoryWizardOpen(false);
    setIsPostWizardOpen(false);
    setIsHighlightWizardOpen(false);
  };

  const handleSprintCreate = (sprint: ContentSprint) => {
    console.log("Sprint created:", sprint);
    // This is where an API call would be made.
    setIsSprintWizardOpen(false);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Campaign Pools</h1>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsSprintWizardOpen(true)}
            className="flex items-center justify-center bg-red-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Sprint
          </button>
          <button
            onClick={() => setIsStoryWizardOpen(true)}
            className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Story Pool
          </button>
          <button
            onClick={() => setIsPostWizardOpen(true)}
            className="flex items-center justify-center bg-purple-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Post Pool
          </button>
          <button
            onClick={() => setIsHighlightWizardOpen(true)}
            className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="h-5 w-5 mr-2" />
            New Highlight Pool
          </button>
        </div>
      </header>

      <SprintCreationWizard
        isOpen={isSprintWizardOpen}
        onClose={() => setIsSprintWizardOpen(false)}
        onSuccess={handleSprintCreate}
      />
      <StoryPoolCreationWizard 
        isOpen={isStoryWizardOpen} 
        onClose={() => setIsStoryWizardOpen(false)} 
        onPoolCreate={handlePoolCreate}
        availableHighlightGroups={highlightGroups}
      />
      <PostPoolCreationWizard 
        isOpen={isPostWizardOpen}
        onClose={() => setIsPostWizardOpen(false)} 
        onPoolCreate={handlePoolCreate}
        availableHighlightGroups={highlightGroups}
      />
      <HighlightGroupCreationWizard 
        isOpen={isHighlightWizardOpen}
        onClose={() => setIsHighlightWizardOpen(false)} 
        onGroupCreate={async (data) => console.log(data)} // Placeholder
        existingGroups={[]} // Placeholder
      />


      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <CampaignPoolsTab
              name="Sprints"
              isActive={activeTab === 'sprints'}
              onClick={() => setActiveTab('sprints')}
            />
            <CampaignPoolsTab
              name="Story Pools"
              isActive={activeTab === 'stories'}
              onClick={() => setActiveTab('stories')}
            />
            <CampaignPoolsTab
              name="Post Pools"
              isActive={activeTab === 'posts'}
              onClick={() => setActiveTab('posts')}
            />
            <CampaignPoolsTab
              name="Highlight Pools"
              isActive={activeTab === 'highlights'}
              onClick={() => setActiveTab('highlights')}
            />
          </nav>
        </div>
        <div className="p-6">
          {activeTab === 'sprints' && <div>Content for Sprints</div>}
          {activeTab === 'stories' && <div>Content for Story Pools</div>}
          {activeTab === 'posts' && <div>Content for Post Pools</div>}
          {activeTab === 'highlights' && <div>Content for Highlight Pools</div>}
        </div>
      </div>
    </div>
  );
};

export default CampaignPoolsPage; 