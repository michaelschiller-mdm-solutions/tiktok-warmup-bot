import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, UserPlus, Activity, Wifi, Image } from 'lucide-react';

export type AccountsTab = 'overview' | 'available' | 'warmup' | 'proxy' | 'content';

interface AccountsTabNavigationProps {
  modelId: number;
  activeTab: AccountsTab;
  onTabChange: (tab: AccountsTab) => void;
}

interface TabConfig {
  id: AccountsTab;
  label: string;
  icon: React.ComponentType<any>;
  description: string;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: Users,
    description: 'All accounts assigned to this model'
  },
  {
    id: 'available',
    label: 'Available',
    icon: UserPlus,
    description: 'Accounts ready for assignment'
  },
  {
    id: 'warmup',
    label: 'Warm-up',
    icon: Activity,
    description: 'Accounts in warm-up process'
  },
  {
    id: 'proxy',
    label: 'Proxy',
    icon: Wifi,
    description: 'Proxy management and assignment'
  },
  {
    id: 'content',
    label: 'Content',
    icon: Image,
    description: 'Content management for this model'
  }
];

const AccountsTabNavigation: React.FC<AccountsTabNavigationProps> = ({
  modelId,
  activeTab,
  onTabChange
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabClick = (tabId: AccountsTab) => {
    // Update URL with tab parameter
    const searchParams = new URLSearchParams(location.search);
    searchParams.set('tab', tabId);
    
    navigate({
      pathname: location.pathname,
      search: searchParams.toString()
    }, { replace: true });
    
    onTabChange(tabId);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <nav className="max-w-full overflow-x-auto">
        <div className="flex space-x-0 min-w-max px-6">
          {TAB_CONFIGS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`
                  group relative py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
                  transition-colors duration-200
                  ${isActive
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
                title={tab.description}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
                  <span>{tab.label}</span>
                </div>
                
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 rounded-t-sm" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AccountsTabNavigation;
export { TAB_CONFIGS };
export type { TabConfig }; 