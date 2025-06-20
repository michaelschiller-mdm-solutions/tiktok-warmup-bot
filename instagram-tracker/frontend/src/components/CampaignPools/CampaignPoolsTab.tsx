import React from 'react';

interface CampaignPoolsTabProps {
  name: string;
  isActive: boolean;
  onClick: () => void;
}

const CampaignPoolsTab: React.FC<CampaignPoolsTabProps> = ({ name, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
        isActive
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }`}
    >
      {name}
    </button>
  );
};

export default CampaignPoolsTab; 