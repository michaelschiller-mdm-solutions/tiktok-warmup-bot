import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Settings, 
  Eye,
  TestTube,
  Bot,
  Container,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import ContainerCreationModal from '../components/ContainerCreationModal';
import { 
  IPhoneDashboard, 
  CreateIPhoneRequest, 
  IPhoneModel, 
  ConnectionTestResult 
} from '../types/iphone';

const IPhoneSettingsPage: React.FC = () => {
  const [iphones, setIphones] = useState<IPhoneDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showContainerModal, setShowContainerModal] = useState(false);
  const [selectedIPhone, setSelectedIPhone] = useState<IPhoneDashboard | null>(null);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);

  // Add iPhone form state
  const [newIPhone, setNewIPhone] = useState<CreateIPhoneRequest>({
    name: '',
    model: 'iphone_8',
    ip_address: '',
    port: 46952,
    ssh_user: 'mobile',
    ssh_password: '',
    xxtouch_port: 46952,
    notes: ''
  });

  useEffect(() => {
    fetchIPhones();
  }, []);

  const fetchIPhones = async () => {
    try {
      const response = await fetch('/api/iphones');
      const data = await response.json();
      
      if (data.success) {
        setIphones(data.iphones);
      } else {
        toast.error('Failed to fetch iPhones');
      }
    } catch (error) {
      toast.error('Failed to fetch iPhones');
      console.error('Error fetching iPhones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIPhone = async () => {
    try {
      const response = await fetch('/api/iphones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newIPhone)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`iPhone "${data.iphone.name}" registered successfully!`);
        setShowAddModal(false);
        setNewIPhone({
          name: '',
          model: 'iphone_8',
          ip_address: '',
          port: 46952,
          ssh_user: 'mobile',
          ssh_password: '',
          xxtouch_port: 46952,
          notes: ''
        });
        fetchIPhones();
      } else {
        toast.error(data.message || 'Failed to register iPhone');
      }
    } catch (error) {
      toast.error('Failed to register iPhone');
      console.error('Error registering iPhone:', error);
    }
  };

  const testConnection = async (iphoneId: number) => {
    setTestingConnection(iphoneId);
    try {
      const response = await fetch(`/api/iphones/${iphoneId}/test-connection`, {
        method: 'POST'
      });

      const data: ConnectionTestResult = await response.json();

      if (data.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error(`Connection test failed: ${data.message}`);
      }

      // Refresh the iPhone list to get updated status
      fetchIPhones();
    } catch (error) {
      toast.error('Connection test failed');
      console.error('Error testing connection:', error);
    } finally {
      setTestingConnection(null);
    }
  };

  const getStatusIcon = (status: string, connectionStatus: string) => {
    if (connectionStatus === 'online') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (connectionStatus === 'idle') {
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (status: string, connectionStatus: string) => {
    return connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1);
  };

  const handleShowDetails = (iphone: IPhoneDashboard) => {
    setSelectedIPhone(iphone);
    setShowDetailsModal(true);
  };

  const handleShowEdit = (iphone: IPhoneDashboard) => {
    setSelectedIPhone(iphone);
    setShowEditModal(true);
  };

  const handleCreateContainers = (iphone: IPhoneDashboard) => {
    setSelectedIPhone(iphone);
    setShowContainerModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading iPhone settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">iPhone Management</h1>
                <p className="text-gray-600">Register and manage iPhone devices for automation</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add iPhone
            </button>
          </div>
        </div>

        {/* iPhone Grid */}
        {iphones.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Smartphone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No iPhones registered</h3>
            <p className="text-gray-600 mb-6">Get started by registering your first iPhone device</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Register iPhone
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {iphones.map((iphone) => (
              <div key={iphone.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{iphone.name}</h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {iphone.model.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(iphone.status, iphone.connection_status)}
                    <span className="text-sm font-medium">
                      {getStatusText(iphone.status, iphone.connection_status)}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Wifi className="w-4 h-4" />
                    <span>{iphone.ip_address}:{iphone.port}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Container className="w-4 h-4" />
                    <span>
                      {iphone.available_containers || 0}/{iphone.total_containers || 0} containers available
                    </span>
                  </div>

                  {iphone.assigned_bot_id && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Bot className="w-4 h-4" />
                      <span>Bot: {iphone.assigned_bot_id}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Activity className="w-4 h-4" />
                    <span>
                      {iphone.total_actions_performed || 0} actions • {Number(iphone.avg_success_rate || 0).toFixed(1)}% success
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => testConnection(iphone.id)}
                      disabled={testingConnection === iphone.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      <TestTube className="w-4 h-4" />
                      {testingConnection === iphone.id ? 'Testing...' : 'Test'}
                    </button>
                    
                    <button 
                      onClick={() => handleShowDetails(iphone)}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-100 text-blue-700 px-3 py-2 rounded-md hover:bg-blue-200 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Details
                    </button>
                    
                    <button 
                      onClick={() => handleShowEdit(iphone)}
                      className="flex items-center justify-center p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleCreateContainers(iphone)}
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white px-3 py-2 rounded-md hover:bg-purple-700 transition-colors"
                  >
                    <Container className="w-4 h-4" />
                    Create Containers
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add iPhone Modal */}
        <Modal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          title="Register New iPhone"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  iPhone Name *
                </label>
                <input
                  type="text"
                  value={newIPhone.name}
                  onChange={(e) => setNewIPhone({ ...newIPhone, name: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="My iPhone 8"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Model *
                </label>
                <select
                  value={newIPhone.model}
                  onChange={(e) => setNewIPhone({ ...newIPhone, model: e.target.value as IPhoneModel })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="iphone_8">iPhone 8</option>
                  <option value="iphone_x">iPhone X</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IP Address *
                </label>
                <input
                  type="text"
                  value={newIPhone.ip_address}
                  onChange={(e) => setNewIPhone({ ...newIPhone, ip_address: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="192.168.178.65"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Port
                </label>
                <input
                  type="number"
                  value={newIPhone.port}
                  onChange={(e) => setNewIPhone({ ...newIPhone, port: parseInt(e.target.value) || 46952 })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SSH User
                </label>
                <input
                  type="text"
                  value={newIPhone.ssh_user}
                  onChange={(e) => setNewIPhone({ ...newIPhone, ssh_user: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SSH Password
                </label>
                <input
                  type="password"
                  value={newIPhone.ssh_password}
                  onChange={(e) => setNewIPhone({ ...newIPhone, ssh_password: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={newIPhone.notes}
                onChange={(e) => setNewIPhone({ ...newIPhone, notes: e.target.value })}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional notes about this iPhone..."
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIPhone}
                disabled={!newIPhone.name || !newIPhone.ip_address}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register iPhone
              </button>
            </div>
          </div>
        </Modal>

        {/* Details Modal */}
        {selectedIPhone && (
          <Modal
            isOpen={showDetailsModal}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedIPhone(null);
            }}
            title={`iPhone Details - ${selectedIPhone.name}`}
            size="lg"
          >
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Device Information</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Model:</span> {selectedIPhone.model.replace('_', ' ')}</div>
                    <div><span className="font-medium">IP Address:</span> {selectedIPhone.ip_address}:{selectedIPhone.port}</div>
                    <div><span className="font-medium">Status:</span> 
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                        selectedIPhone.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedIPhone.status}
                      </span>
                    </div>
                    <div><span className="font-medium">Connection:</span> {selectedIPhone.connection_status}</div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Performance Stats</h4>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-medium">Containers:</span> {selectedIPhone.assigned_containers || 0}/{selectedIPhone.total_containers || 0} in use</div>
                    <div><span className="font-medium">Actions:</span> {selectedIPhone.total_actions_performed || 0}</div>
                    <div><span className="font-medium">Success Rate:</span> {Number(selectedIPhone.avg_success_rate || 0).toFixed(1)}%</div>
                    <div><span className="font-medium">Errors:</span> {selectedIPhone.total_error_count || 0}</div>
                  </div>
                </div>
              </div>

              {selectedIPhone.assigned_bot_id && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Bot Assignment</h4>
                  <div className="text-sm">
                    <span className="font-medium">Bot ID:</span> {selectedIPhone.assigned_bot_id}
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedIPhone(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Edit Modal */}
        {selectedIPhone && (
          <Modal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setSelectedIPhone(null);
            }}
            title={`Edit iPhone - ${selectedIPhone.name}`}
          >
            <div className="space-y-4">
              <div className="text-center py-8">
                <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Settings Coming Soon</h3>
                <p className="text-gray-600">iPhone editing functionality will be available in a future update.</p>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedIPhone(null);
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
                     </Modal>
         )}

        {/* Container Creation Modal */}
        <ContainerCreationModal
          isOpen={showContainerModal}
          onClose={() => {
            setShowContainerModal(false);
            setSelectedIPhone(null);
          }}
          onComplete={(results) => {
            console.log('Container creation completed:', results);
            toast.success(`Container creation finished! ${results.successful}/${results.total} containers created.`);
            fetchIPhones(); // Refresh the iPhone list to update container counts
          }}
          initialIphoneUrl={selectedIPhone ? `http://${selectedIPhone.ip_address}:${selectedIPhone.port}` : undefined}
        />
      </div>
    </div>
  );
};

export default IPhoneSettingsPage; 