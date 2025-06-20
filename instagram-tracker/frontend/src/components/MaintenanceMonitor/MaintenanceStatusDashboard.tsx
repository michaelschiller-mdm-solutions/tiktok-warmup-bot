import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { AlertCircle, Clock, CheckCircle, XCircle, Smartphone, Activity } from 'lucide-react';

interface MaintenanceStatus {
  account_id: number;
  account_username: string;
  total_queued: number;
  total_posted: number;
  total_failed: number;
  next_due: string | null;
  overdue_count: number;
  current_location: string;
  bot_status: 'connected' | 'disconnected' | 'running' | 'idle';
  bot_id: string | null;
}

interface BotStatus {
  bot_id: string;
  iphone_ip: string;
  status: 'connected' | 'disconnected' | 'running' | 'idle' | 'error';
  accounts_assigned: number;
  health_check_success: boolean;
  last_seen: string | null;
}

interface ContentQueueItem {
  id: number;
  account_username: string;
  content_type: string;
  scheduled_time: string;
  is_overdue: boolean;
  emergency_content: boolean;
  time_until_due_minutes: number;
}

export const MaintenanceStatusDashboard: React.FC = () => {
  const [accountStatuses, setAccountStatuses] = useState<MaintenanceStatus[]>([]);
  const [botStatuses, setBotStatuses] = useState<BotStatus[]>([]);
  const [pendingContent, setPendingContent] = useState<ContentQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    fetchMaintenanceData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMaintenanceData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMaintenanceData = async () => {
    try {
      setLoading(true);
      
      const [accountsResponse, botsResponse, queueResponse] = await Promise.all([
        fetch('/api/maintenance-status/accounts'),
        fetch('/api/maintenance-status/bots'),
        fetch('/api/maintenance-status/queue/pending?limit=20')
      ]);

      if (!accountsResponse.ok || !botsResponse.ok || !queueResponse.ok) {
        throw new Error('Failed to fetch maintenance data');
      }

      const accountsData = await accountsResponse.json();
      const botsData = await botsResponse.json();
      const queueData = await queueResponse.json();

      setAccountStatuses(accountsData.data || []);
      setBotStatuses(botsData.data || []);
      setPendingContent(queueData.data || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'idle':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'idle':
        return <CheckCircle className="w-4 h-4" />;
      case 'running':
        return <Activity className="w-4 h-4" />;
      case 'disconnected':
      case 'error':
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const formatTimeUntilDue = (minutes: number) => {
    if (minutes < 0) {
      const overdue = Math.abs(minutes);
      if (overdue < 60) return `${Math.round(overdue)}m overdue`;
      return `${Math.round(overdue / 60)}h overdue`;
    }
    if (minutes < 60) return `${Math.round(minutes)}m`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
    return `${Math.round(minutes / 1440)}d`;
  };

  if (loading && accountStatuses.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p>Loading maintenance status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Maintenance Status Dashboard</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button onClick={fetchMaintenanceData} size="sm" disabled={loading}>
            {loading ? <Activity className="w-4 h-4 animate-spin" /> : 'Refresh'}
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Accounts</p>
                <p className="text-2xl font-bold">{accountStatuses.length}</p>
              </div>
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Bots</p>
                <p className="text-2xl font-bold">
                  {botStatuses.filter(bot => bot.status === 'idle' || bot.status === 'running').length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Content</p>
                <p className="text-2xl font-bold">{pendingContent.length}</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Items</p>
                <p className="text-2xl font-bold text-red-600">
                  {pendingContent.filter(item => item.is_overdue).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bot Status */}
      <Card>
        <CardHeader>
          <CardTitle>Bot Status</CardTitle>
        </CardHeader>
        <CardContent>
          {botStatuses.length === 0 ? (
            <p className="text-gray-500">No bots configured</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {botStatuses.map((bot) => (
                <div key={bot.bot_id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{bot.bot_id}</span>
                    <Badge className={getStatusBadgeColor(bot.status)}>
                      {getStatusIcon(bot.status)}
                      <span className="ml-1 capitalize">{bot.status}</span>
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>IP: {bot.iphone_ip}</p>
                    <p>Accounts: {bot.accounts_assigned}</p>
                    {bot.last_seen && (
                      <p>Last seen: {new Date(bot.last_seen).toLocaleTimeString()}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Content Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Content Queue</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingContent.length === 0 ? (
            <p className="text-gray-500">No pending content</p>
          ) : (
            <div className="space-y-2">
              {pendingContent.slice(0, 10).map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={item.content_type === 'story' ? 'default' : 
                                  item.content_type === 'post' ? 'secondary' : 'outline'}>
                      {item.content_type}
                    </Badge>
                    <span className="font-medium">{item.account_username}</span>
                    {item.emergency_content && (
                      <Badge className="bg-red-100 text-red-800">Emergency</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${item.is_overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {formatTimeUntilDue(item.time_until_due_minutes)}
                    </span>
                    {item.is_overdue && <AlertCircle className="w-4 h-4 text-red-600" />}
                  </div>
                </div>
              ))}
              {pendingContent.length > 10 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  ... and {pendingContent.length - 10} more items
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Account Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Account Status</CardTitle>
        </CardHeader>
        <CardContent>
          {accountStatuses.length === 0 ? (
            <p className="text-gray-500">No accounts found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Account</th>
                    <th className="text-left p-2">Location</th>
                    <th className="text-left p-2">Queued</th>
                    <th className="text-left p-2">Posted</th>
                    <th className="text-left p-2">Failed</th>
                    <th className="text-left p-2">Next Due</th>
                    <th className="text-left p-2">Bot Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accountStatuses.slice(0, 15).map((account) => (
                    <tr key={account.account_id} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{account.account_username}</td>
                      <td className="p-2">
                        <Badge variant="outline">{account.current_location}</Badge>
                      </td>
                      <td className="p-2">
                        <span className={account.total_queued > 0 ? 'text-blue-600 font-medium' : ''}>
                          {account.total_queued}
                        </span>
                        {account.overdue_count > 0 && (
                          <span className="ml-1 text-red-600">({account.overdue_count} overdue)</span>
                        )}
                      </td>
                      <td className="p-2 text-green-600">{account.total_posted}</td>
                      <td className="p-2">
                        <span className={account.total_failed > 0 ? 'text-red-600 font-medium' : ''}>
                          {account.total_failed}
                        </span>
                      </td>
                      <td className="p-2">
                        {account.next_due ? (
                          <span className="text-sm">
                            {new Date(account.next_due).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="p-2">
                        <Badge className={getStatusBadgeColor(account.bot_status)}>
                          {getStatusIcon(account.bot_status)}
                          <span className="ml-1 capitalize">{account.bot_status}</span>
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {accountStatuses.length > 15 && (
                <p className="text-sm text-gray-500 text-center pt-2">
                  ... and {accountStatuses.length - 15} more accounts
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}; 