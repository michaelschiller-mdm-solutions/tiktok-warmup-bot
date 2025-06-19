import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, Home, Package, Users, Settings, Smartphone, Play, Activity, Layers, Star } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Models', href: '/models', icon: Settings },
    { name: 'All Accounts', href: '/accounts', icon: Users },
    { name: 'Content Registry', href: '/content', icon: Package },
    { name: 'Sprint Management', href: '/sprints', icon: Play },
    { name: 'Campaign Pools', href: '/pools', icon: Layers },
    { name: 'Highlight Groups', href: '/highlights', icon: Package },
    { name: 'Content Timeline', href: '/timeline', icon: Activity },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'iPhone Settings', href: '/iphones', icon: Smartphone },
  ];

  const isActive = (href: string) => {
    return location.pathname === href || location.pathname.startsWith(href + '/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        {/* Logo */}
        <div className="flex h-16 items-center px-6 border-b border-gray-200">
          <div className="flex items-center">
            <img 
              src="/logo.png" 
              alt="NoduNet Logo" 
              className="h-8 w-8 object-contain"
            />
            <span className="ml-3 text-xl font-bold text-gray-900">
              NoduNet - Marketing
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon
                      className={`mr-3 h-5 w-5 ${
                        isActive(item.href)
                          ? 'text-primary-500'
                          : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 