import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Camera, CheckCircle, X, Eye, Calendar, User, Settings, AlertTriangle } from 'lucide-react';

interface VerificationAccount {
  id: number;
  username: string;
  model_name: string;
  verification_screenshot_path: string;
  verification_screenshot_timestamp: string;
  verification_status: 'pending_verification' | 'manual_completion_required';
  created_at: string;
}

interface VerificationSectionProps {
  modelId?: number;
  onVerificationComplete: () => void;
}

const VerificationSection: React.FC<VerificationSectionProps> = ({ modelId, onVerificationComplete }) => {
  const [pendingAccounts, setPendingAccounts] = useState<VerificationAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState<{ [key: number]: boolean }>({});
  const [selectedScreenshot, setSelectedScreenshot] = useState<{ accountId: number; username: string } | null>(null);

  const fetchPendingVerifications = async () => {
    try {
      setLoading(true);
      const params = modelId ? `?model_id=${modelId}` : '';
      const response = await fetch(`/api/accounts/verification/pending${params}`);
      
      if (response.ok) {
        const result = await response.json();
        setPendingAccounts(result.data || []);
      } else {
        console.error('Failed to fetch pending verifications');
      }
    } catch (error) {
      console.error('Error fetching pending verifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (accountId: number, action: 'approve' | 'reject', notes?: string) => {
    try {
      setVerificationLoading(prev => ({ ...prev, [accountId]: true }));
      
      const endpoint = action === 'approve' ? 'approve' : 'reject';
      const response = await fetch(`/api/accounts/verification/${accountId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verified_by: 'user', // In a real app, this would be the logged-in user
          verification_notes: notes
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        
        // Remove account from pending list
        setPendingAccounts(prev => prev.filter(acc => acc.id !== accountId));
        
        // Notify parent component
        onVerificationComplete();
      } else {
        const error = await response.json();
        toast.error(`Failed to ${action} account: ${error.message}`);
      }
    } catch (error) {
      toast.error(`Error ${action}ing account verification`);
    } finally {
      setVerificationLoading(prev => ({ ...prev, [accountId]: false }));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  useEffect(() => {
    fetchPendingVerifications();
  }, [modelId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow border-l-4 border-orange-500">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 animate-pulse" />
            <div className="text-gray-500">Loading verification requests...</div>
          </div>
        </div>
      </div>
    );
  }

  if (pendingAccounts.length === 0) {
    return null; // Don't show section if no accounts need verification
  }

  return (
    <>
      {/* Verification Section */}
      <div className="bg-white rounded-lg shadow border-l-4 border-orange-500">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <Camera className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <h4 className="text-lg font-medium text-gray-900">Manual Verification & Completion</h4>
              <p className="text-sm text-gray-500">Review accounts requiring manual intervention or screenshot verification</p>
            </div>
            <div className="ml-auto">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                {pendingAccounts.length} pending
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {pendingAccounts.map((account) => (
            <div key={account.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {account.verification_status === 'pending_verification' ? (
                    <Camera className="h-5 w-5 text-orange-600" />
                  ) : (
                    <Settings className="h-5 w-5 text-blue-600" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{account.username}</div>
                    <div className="text-sm text-gray-500">{account.model_name}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {account.verification_status === 'pending_verification' 
                        ? 'Needs screenshot review for shadow-ban detection'
                        : 'Automation incomplete - needs manual completion on device'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {formatDate(account.verification_screenshot_timestamp || account.created_at)}
                </div>
              </div>

              {/* Different UI based on verification type */}
              {account.verification_status === 'pending_verification' ? (
                <>
                  {/* Screenshot Verification UI */}
                  <div className="flex items-center gap-3 mb-4">
                    <button
                      onClick={() => setSelectedScreenshot({ accountId: account.id, username: account.username })}
                      className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Screenshot
                    </button>
                    
                    <div className="text-sm text-gray-600">
                      Screenshot: {account.verification_screenshot_path ? 'Available' : 'Not captured'}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleVerification(account.id, 'approve', 'Account verified as valid via screenshot')}
                      disabled={verificationLoading[account.id]}
                      className="flex items-center gap-1 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                    >
                      {verificationLoading[account.id] ? (
                        <div className="w-4 h-4 border border-green-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Valid Account
                    </button>

                    <button
                      onClick={() => handleVerification(account.id, 'reject', 'Account rejected - appears shadow-banned')}
                      disabled={verificationLoading[account.id]}
                      className="flex items-center gap-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                    >
                      {verificationLoading[account.id] ? (
                        <div className="w-4 h-4 border border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Shadow-banned
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Manual Completion UI */}
                  <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                    <div className="text-sm text-blue-800">
                      <strong>Manual intervention required:</strong> Check the device screen and complete the Instagram login process manually.
                      The automation may have stopped due to missing verification code or additional verification steps.
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleVerification(account.id, 'approve', 'Account completed manually and verified as working')}
                      disabled={verificationLoading[account.id]}
                      className="flex items-center gap-1 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded transition-colors disabled:opacity-50"
                    >
                      {verificationLoading[account.id] ? (
                        <div className="w-4 h-4 border border-green-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Completed Successfully
                    </button>

                    <button
                      onClick={() => handleVerification(account.id, 'reject', 'Account could not be completed - invalid or problematic')}
                      disabled={verificationLoading[account.id]}
                      className="flex items-center gap-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded transition-colors disabled:opacity-50"
                    >
                      {verificationLoading[account.id] ? (
                        <div className="w-4 h-4 border border-red-600 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      Cannot Complete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                Screenshot Verification - {selectedScreenshot.username}
              </h3>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="text-center">
              <img
                src={`/api/accounts/verification/${selectedScreenshot.accountId}/screenshot`}
                alt={`Screenshot for ${selectedScreenshot.username}`}
                className="max-w-full h-auto rounded border shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzM3NDE0OCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFNjcmVlbnNob3QgQXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                }}
              />
            </div>
            
            <div className="mt-4 flex justify-center gap-3">
              <button
                onClick={() => {
                  handleVerification(selectedScreenshot.accountId, 'approve', 'Account verified as valid');
                  setSelectedScreenshot(null);
                }}
                disabled={verificationLoading[selectedScreenshot.accountId]}
                className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Account
              </button>

              <button
                onClick={() => {
                  handleVerification(selectedScreenshot.accountId, 'reject', 'Account appears to be shadow-banned');
                  setSelectedScreenshot(null);
                }}
                disabled={verificationLoading[selectedScreenshot.accountId]}
                className="flex items-center gap-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                Reject Account
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VerificationSection; 