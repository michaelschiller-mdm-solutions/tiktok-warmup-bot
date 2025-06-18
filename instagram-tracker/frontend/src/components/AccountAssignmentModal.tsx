import React, { useState, useEffect } from 'react';
import { X, Smartphone, Container, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AvailableContainer {
  container_id: number;
  container_number: number;
  container_status: string;
}

interface AvailableIPhone {
  iphone_id: number;
  iphone_name: string;
  iphone_model: string;
  ip_address: string;
  iphone_status: string;
  available_containers_count: number;
  containers: AvailableContainer[];
}

interface AccountAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number;
  accountUsername: string;
  onAssignmentComplete: () => void;
}

const AccountAssignmentModal: React.FC<AccountAssignmentModalProps> = ({
  isOpen,
  onClose,
  accountId,
  accountUsername,
  onAssignmentComplete
}) => {
  const [availableIphones, setAvailableIphones] = useState<AvailableIPhone[]>([]);
  const [selectedIphoneId, setSelectedIphoneId] = useState<number | null>(null);
  const [selectedContainerNumber, setSelectedContainerNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableContainers();
    }
  }, [isOpen, accountId]);

  const fetchAvailableContainers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/iphones/available-for-account/${accountId}`);
      const data = await response.json();

      if (data.success) {
        setAvailableIphones(data.available_iphones);
      } else {
        toast.error(data.error || 'Failed to fetch available containers');
      }
    } catch (error) {
      console.error('Error fetching available containers:', error);
      toast.error('Failed to fetch available containers');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedIphoneId || selectedContainerNumber === null) {
      toast.error('Please select an iPhone and container');
      return;
    }

    setAssigning(true);
    try {
      const response = await fetch('/api/iphones/assign-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          iphoneId: selectedIphoneId,
          containerNumber: selectedContainerNumber
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        onAssignmentComplete();
        onClose();
      } else {
        toast.error(data.error || 'Failed to assign account');
      }
    } catch (error) {
      console.error('Error assigning account:', error);
      toast.error('Failed to assign account');
    } finally {
      setAssigning(false);
    }
  };

  const selectedIphone = availableIphones.find(iphone => iphone.iphone_id === selectedIphoneId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Assign Account to iPhone Container
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Account Info */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <Container className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">
                Account: <strong>{accountUsername}</strong> (ID: {accountId})
              </span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading available containers...</p>
            </div>
          ) : availableIphones.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Available Containers
              </h3>
              <p className="text-gray-600">
                There are no available iPhone containers for assignment.
                Please check that iPhones are registered and have available containers.
              </p>
            </div>
          ) : (
            <>
              {/* iPhone Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select iPhone:
                </label>
                <div className="space-y-3">
                  {availableIphones.map((iphone) => (
                    <div
                      key={iphone.iphone_id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedIphoneId === iphone.iphone_id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedIphoneId(iphone.iphone_id);
                        setSelectedContainerNumber(null);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Smartphone className="h-5 w-5 text-gray-600 mr-3" />
                          <div>
                            <h4 className="font-medium text-gray-900">{iphone.iphone_name}</h4>
                            <p className="text-sm text-gray-600">
                              {iphone.iphone_model} • {iphone.ip_address}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                            <span className="text-sm text-green-600 font-medium">
                              {iphone.available_containers_count} available
                            </span>
                          </div>
                          <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                            iphone.iphone_status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {iphone.iphone_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Container Selection */}
              {selectedIphone && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Container on {selectedIphone.iphone_name}:
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {selectedIphone.containers.map((container) => (
                      <button
                        key={container.container_id}
                        onClick={() => setSelectedContainerNumber(container.container_number)}
                        className={`p-3 text-sm font-medium rounded-lg border transition-colors ${
                          selectedContainerNumber === container.container_number
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        #{container.container_number}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Assignment Summary */}
              {selectedIphone && selectedContainerNumber !== null && (
                <div className="mb-6 p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-900">
                      Ready to assign <strong>{accountUsername}</strong> to container{' '}
                      <strong>#{selectedContainerNumber}</strong> on{' '}
                      <strong>{selectedIphone.iphone_name}</strong>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={!selectedIphoneId || selectedContainerNumber === null || assigning || availableIphones.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {assigning ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Assigning...
              </>
            ) : (
              'Assign Container'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountAssignmentModal; 