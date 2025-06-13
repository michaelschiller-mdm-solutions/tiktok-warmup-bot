import React, { useState, useEffect } from 'react';
import { Image, Video, FileText, Upload, RefreshCw, Eye, Calendar } from 'lucide-react';
import { DataGrid } from '../DataGrid';
import { DataGridColumn } from '../../types/dataGrid';
import { Account } from '../../types/accounts';
import { useAccountsData } from '../../hooks/useAccountsData';
import LoadingSpinner from '../LoadingSpinner';

interface ContentManagementTabProps {
  modelId: number;
}

const ContentManagementTab: React.FC<ContentManagementTabProps> = ({ modelId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [contentTypeFilter, setContentTypeFilter] = useState<string>('all');

  const { 
    accounts, 
    loading, 
    error, 
    totalCount, 
    filteredCount, 
    refreshData,
    updateFilters
  } = useAccountsData({
    modelId,
    activeTab: 'content'
  });

  // Update filters when search term or content type filter changes
  useEffect(() => {
    updateFilters({
      search: searchTerm || undefined,
      content_type: contentTypeFilter === 'all' ? undefined : [contentTypeFilter]
    });
  }, [searchTerm, contentTypeFilter, updateFilters]);

  // Define columns for content management
  const columns: DataGridColumn<Account>[] = [
    {
      id: 'username',
      field: 'username',
      header: 'Username',
      width: 150,
      minWidth: 120,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'text',
      align: 'left',
      visible: true,
      order: 1,
      frozen: false,
      editable: false,
      required: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            row.status === 'active' ? 'bg-green-500' : 
            row.status === 'banned' ? 'bg-red-500' :
            row.status === 'suspended' ? 'bg-yellow-500' :
            'bg-gray-500'
          }`} title={row.status} />
          <span className="font-medium">{value}</span>
        </div>
      )
    },
    {
      id: 'content_type',
      field: 'content_type',
      header: 'Content Type',
      width: 120,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'select',
      align: 'center',
      visible: true,
      order: 2,
      frozen: false,
      editable: false,
      required: false,
      options: [
        { value: 'photos', label: 'Photos' },
        { value: 'videos', label: 'Videos' },
        { value: 'stories', label: 'Stories' },
        { value: 'reels', label: 'Reels' },
        { value: 'mixed', label: 'Mixed' }
      ],
      render: (value) => {
        if (!value) return <span className="text-gray-400">Not set</span>;
        
        const contentIcons = {
          photos: Image,
          videos: Video,
          stories: Eye,
          reels: Video,
          mixed: FileText
        };
        
        const contentColors = {
          photos: 'bg-blue-100 text-blue-800',
          videos: 'bg-purple-100 text-purple-800',
          stories: 'bg-green-100 text-green-800',
          reels: 'bg-pink-100 text-pink-800',
          mixed: 'bg-gray-100 text-gray-800'
        };
        
        const Icon = contentIcons[value as keyof typeof contentIcons] || FileText;
        
        return (
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${contentColors[value as keyof typeof contentColors] || contentColors.mixed}`}>
              {value}
            </span>
          </div>
        );
      }
    },
    {
      id: 'niche',
      field: 'niche',
      header: 'Niche',
      width: 120,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'text',
      align: 'center',
      visible: true,
      order: 3,
      frozen: false,
      editable: false,
      required: false,
      render: (value) => {
        if (!value) return <span className="text-gray-400">-</span>;
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            {value}
          </span>
        );
      }
    },
    {
      id: 'cta_text',
      field: 'cta_text',
      header: 'CTA Text',
      width: 150,
      minWidth: 120,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'text',
      align: 'left',
      visible: true,
      order: 4,
      frozen: false,
      editable: false,
      required: false,
      render: (value) => {
        if (!value) return <span className="text-gray-400">No CTA</span>;
        return (
          <div className="text-sm truncate max-w-32" title={value}>
            "{value}"
          </div>
        );
      }
    },
    {
      id: 'bio',
      field: 'bio',
      header: 'Bio',
      width: 200,
      minWidth: 150,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'text',
      align: 'left',
      visible: true,
      order: 5,
      frozen: false,
      editable: false,
      required: false,
      render: (value) => {
        if (!value) return <span className="text-gray-400">No bio</span>;
        return (
          <div className="text-sm text-gray-600 truncate max-w-48" title={value}>
            {value}
          </div>
        );
      }
    },
    {
      id: 'total_conversions',
      field: 'total_conversions',
      header: 'Conversions',
      width: 110,
      minWidth: 90,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'number',
      align: 'right',
      visible: true,
      order: 6,
      frozen: false,
      editable: false,
      required: false,
      formatter: (value) => (value || 0).toLocaleString(),
      render: (value) => (
        <div className="text-right">
          <span className="font-medium text-gray-900">
            {(value || 0).toLocaleString()}
          </span>
        </div>
      )
    },
    {
      id: 'conversion_rate',
      field: 'conversion_rate',
      header: 'Conversion Rate',
      width: 130,
      minWidth: 100,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'number',
      align: 'right',
      visible: true,
      order: 7,
      frozen: false,
      editable: false,
      required: false,
      formatter: (value) => `${(value || 0).toFixed(2)}%`,
      render: (value) => (
        <div className="text-right">
          <span className={`font-medium ${
            value >= 5 ? 'text-green-600' : 
            value >= 2 ? 'text-yellow-600' : 
            'text-red-600'
          }`}>
            {(value || 0).toFixed(2)}%
          </span>
        </div>
      )
    },
    {
      id: 'last_activity',
      field: 'last_activity',
      header: 'Last Activity',
      width: 130,
      minWidth: 110,
      resizable: true,
      sortable: true,
      filterable: true,
      type: 'date',
      align: 'center',
      visible: true,
      order: 8,
      frozen: false,
      editable: false,
      required: false,
      render: (value) => {
        if (!value) return <span className="text-gray-400">Never</span>;
        const date = new Date(value);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        
        if (diffHours < 1) return <span className="text-green-600">Just now</span>;
        if (diffHours < 24) return <span className="text-green-600">{diffHours}h ago</span>;
        if (diffHours < 168) return <span className="text-yellow-600">{Math.floor(diffHours / 24)}d ago</span>;
        return <span className="text-red-600">{date.toLocaleDateString()}</span>;
      }
    }
  ];

  if (loading && accounts.length === 0) {
    return (
      <div className="p-8">
        <LoadingSpinner size="lg" text="Loading content data..." className="min-h-96" />
      </div>
    );
  }

  if (error && accounts.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Content Data</h3>
          <p className="text-gray-500 mb-6">{error}</p>
          <button 
            onClick={refreshData}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const contentStats = {
    photos: accounts.filter(a => a.content_type === 'photos').length,
    videos: accounts.filter(a => a.content_type === 'videos').length,
    stories: accounts.filter(a => a.content_type === 'stories').length,
    reels: accounts.filter(a => a.content_type === 'reels').length,
    totalConversions: accounts.reduce((sum, a) => sum + (a.total_conversions || 0), 0),
    avgConversionRate: accounts.length > 0 
      ? accounts.reduce((sum, a) => sum + (a.conversion_rate || 0), 0) / accounts.length 
      : 0
  };

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Content Management</h3>
          <p className="text-sm text-gray-500">
            {filteredCount} of {totalCount} accounts with content configuration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={refreshData}
            className="btn-secondary flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button 
            className="btn-primary flex items-center gap-2"
            onClick={() => {
              // TODO: Implement content upload modal
            }}
          >
            <Upload className="h-4 w-4" />
            Upload Content
          </button>
        </div>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Photo Accounts</p>
              <p className="text-2xl font-bold text-blue-600">{contentStats.photos}</p>
            </div>
            <Image className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Video Accounts</p>
              <p className="text-2xl font-bold text-purple-600">{contentStats.videos}</p>
            </div>
            <Video className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Conversions</p>
              <p className="text-2xl font-bold text-green-600">{contentStats.totalConversions.toLocaleString()}</p>
            </div>
            <Calendar className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Conv. Rate</p>
              <p className="text-2xl font-bold text-orange-600">{contentStats.avgConversionRate.toFixed(2)}%</p>
            </div>
            <Eye className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search accounts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="form-input"
          />
        </div>
        <select
          value={contentTypeFilter}
          onChange={(e) => setContentTypeFilter(e.target.value)}
          className="form-select"
        >
          <option value="all">All Content Types</option>
          <option value="photos">Photos</option>
          <option value="videos">Videos</option>
          <option value="stories">Stories</option>
          <option value="reels">Reels</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      {/* Accounts Grid */}
      <div className="flex-1 bg-white rounded-lg shadow">
        {accounts.length === 0 && !loading ? (
          <div className="p-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Configuration</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || contentTypeFilter !== 'all' 
                ? 'No accounts match your current filters.' 
                : 'No accounts have content configuration set up.'
              }
            </p>
            {(!searchTerm && contentTypeFilter === 'all') && (
              <button 
                className="btn-primary flex items-center gap-2 mx-auto"
                onClick={() => {
                  // TODO: Implement content upload modal
                }}
              >
                <Upload className="h-4 w-4" />
                Upload Content
              </button>
            )}
          </div>
        ) : (
          <DataGrid
            data={accounts}
            columns={columns}
            loading={loading}
            error={error}
            height={400}
            virtualScrolling={true}
            multiSelect={true}
            rowSelection={true}
            keyboardNavigation={true}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
};

export default ContentManagementTab; 