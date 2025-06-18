import React, { useState, useEffect } from 'react';
import { X, Package, CheckSquare, AlertCircle, Check } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ContentBundle {
  id: number;
  name: string;
  description?: string;
  bundle_type: string;
  categories: string[];
  tags: string[];
  status: string;
  content_count: number;
  text_count: number;
  created_at: string;
}

interface BatchAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContentIds: number[];
  selectedTextIds: number[];
  onSuccess: () => void;
}

const BatchAssignModal: React.FC<BatchAssignModalProps> = ({
  isOpen,
  onClose,
  selectedContentIds,
  selectedTextIds,
  onSuccess
}) => {
  const [bundles, setBundles] = useState<ContentBundle[]>([]);
  const [selectedBundles, setSelectedBundles] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBundles();
    }
  }, [isOpen]);

  const fetchBundles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/central/bundles');
      if (response.ok) {
        const data = await response.json();
        setBundles(data);
      }
    } catch (error) {
      console.error('Failed to load bundles:', error);
      toast.error('Failed to load bundles');
    } finally {
      setLoading(false);
    }
  };

  const toggleBundle = (bundleId: number) => {
    const newSelection = new Set(selectedBundles);
    if (newSelection.has(bundleId)) {
      newSelection.delete(bundleId);
    } else {
      newSelection.add(bundleId);
    }
    setSelectedBundles(newSelection);
  };

  const selectAll = () => {
    setSelectedBundles(new Set(bundles.map(bundle => bundle.id)));
  };

  const clearSelection = () => {
    setSelectedBundles(new Set());
  };

  const handleBatchAssign = async () => {
    if (selectedBundles.size === 0) {
      toast.error('Please select at least one bundle');
      return;
    }

    try {
      setAssigning(true);
      const assignmentResults = [];

      for (const bundleId of Array.from(selectedBundles)) {
        try {
          const response = await fetch(`/api/central/bundles/${bundleId}/add-content/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              content_ids: selectedContentIds,
              text_content_ids: selectedTextIds,
              assignment_order: 0
            })
          });

          const result = await response.json();
          const bundleName = bundles.find(b => b.id === bundleId)?.name || `Bundle ${bundleId}`;
          
          assignmentResults.push({
            bundleId,
            bundleName,
            success: response.ok,
            result: result,
            error: response.ok ? null : result.error || 'Unknown error'
          });

        } catch (error) {
          const bundleName = bundles.find(b => b.id === bundleId)?.name || `Bundle ${bundleId}`;
          assignmentResults.push({
            bundleId,
            bundleName,
            success: false,
            result: null,
            error: error instanceof Error ? error.message : 'Network error'
          });
        }
      }

      setResults(assignmentResults);

      // Show summary toast
      const successCount = assignmentResults.filter(r => r.success).length;
      const errorCount = assignmentResults.filter(r => !r.success).length;

      if (successCount > 0 && errorCount === 0) {
        toast.success(`Successfully assigned content to ${successCount} bundle(s)`);
      } else if (successCount > 0 && errorCount > 0) {
        toast.success(`Assigned to ${successCount} bundle(s), ${errorCount} failed`);
      } else {
        toast.error('All assignments failed');
      }

      onSuccess();

    } catch (error) {
      console.error('Batch assignment error:', error);
      toast.error('Failed to assign content to bundles');
    } finally {
      setAssigning(false);
    }
  };

  const handleClose = () => {
    setSelectedBundles(new Set());
    setResults(null);
    onClose();
  };

  if (!isOpen) return null;

  const totalItems = selectedContentIds.length + selectedTextIds.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="w-7 h-7 text-purple-600" />
              Batch Assign to Bundles
            </h2>
            <p className="text-gray-600 mt-1">
              Assign {totalItems} selected item{totalItems !== 1 ? 's' : ''} to bundles
              {selectedContentIds.length > 0 && ` (${selectedContentIds.length} content)`}
              {selectedTextIds.length > 0 && ` (${selectedTextIds.length} text)`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : results ? (
            /* Results Display */
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Results</h3>
              
              {results.map((result: any) => (
                <div key={result.bundleId} className={`border rounded-lg p-4 ${
                  result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      result.success ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                    }`}>
                      {result.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{result.bundleName}</h4>
                      {result.success ? (
                        <div className="text-sm text-green-700 mt-1">
                          <p>{result.result.message}</p>
                          {result.result.results && (
                            <p className="text-xs mt-1">
                              {result.result.results.total_success} successful, {result.result.results.total_errors} errors
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-red-700 mt-1">{result.error}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Bundle Selection */
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Select Bundles</h3>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="btn-secondary text-sm"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearSelection}
                    className="btn-secondary text-sm"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>

              {bundles.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Bundles Available</h3>
                  <p className="text-gray-500">Create a bundle first to assign content to it.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bundles.map((bundle) => (
                    <div
                      key={bundle.id}
                      onClick={() => toggleBundle(bundle.id)}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        selectedBundles.has(bundle.id)
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center mt-1 ${
                          selectedBundles.has(bundle.id)
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-gray-300'
                        }`}>
                          {selectedBundles.has(bundle.id) && <CheckSquare className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{bundle.name}</h4>
                          {bundle.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{bundle.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                            <span className={`px-2 py-1 rounded-full ${
                              bundle.bundle_type === 'mixed' ? 'bg-purple-100 text-purple-800' :
                              bundle.bundle_type === 'image' ? 'bg-blue-100 text-blue-800' :
                              bundle.bundle_type === 'video' ? 'bg-red-100 text-red-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {bundle.bundle_type}
                            </span>
                            <span>{bundle.content_count} content</span>
                            <span>{bundle.text_count} text</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          {results ? (
            <div className="text-sm text-gray-600">
              Assignment completed for {results.length} bundle(s)
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              {selectedBundles.size} bundle(s) selected
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="btn-secondary"
            >
              {results ? 'Close' : 'Cancel'}
            </button>
            {!results && (
              <button
                onClick={handleBatchAssign}
                disabled={assigning || selectedBundles.size === 0}
                className="btn-primary flex items-center gap-2"
              >
                {assigning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Assigning...
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    Assign to {selectedBundles.size} Bundle(s)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchAssignModal; 