import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import ImportPreviewTable from './ImportPreviewTable';
import { useAccountImport } from '../../hooks/useAccountImport';

interface AccountImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  modelId: number;
  onImportComplete: () => void;
}

interface ImportFile {
  file: File;
  content: string;
  accounts: ParsedAccount[];
  lineCount: number;
}

interface ParsedAccount {
  username: string;
  password?: string;
  email?: string;
  token?: string; // Email password
  lineNumber: number;
  originalLine: string;
}

interface ValidationResults {
  valid: ParsedAccount[];
  invalid: Array<{ account: ParsedAccount; reason: string }>;
  duplicatesInFile: ParsedAccount[];
  existingInDatabase: string[];
}

const AccountImportModal: React.FC<AccountImportModalProps> = ({
  isOpen,
  onClose,
  modelId,
  onImportComplete
}) => {
  const [importFile, setImportFile] = useState<ImportFile | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload');
  
  const {
    validateAccounts,
    importAccounts,
    isLoading,
    progress,
    error,
    importSummary,
    resetImport
  } = useAccountImport(modelId);

  const parseAccountLine = (line: string, lineNumber: number): ParsedAccount | null => {
    const trimmedLine = line.trim();
    if (!trimmedLine) return null;

    // Check if line contains colon separator
    if (trimmedLine.includes(':')) {
      const parts = trimmedLine.split(':');
      if (parts.length < 1 || parts.length > 4) {
        return {
          username: parts[0] || '',
          lineNumber,
          originalLine: line
        };
      }

      return {
        username: parts[0]?.trim() || '',
        password: parts[1]?.trim() || undefined,
        email: parts[2]?.trim() || undefined,
        token: parts[3]?.trim() || undefined, // Email password
        lineNumber,
        originalLine: line
      };
    } else {
      // Simple username format
      return {
        username: trimmedLine,
        lineNumber,
        originalLine: line
      };
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.txt')) {
      toast.error('Please upload a .txt file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    try {
      const content = await file.text();
      const lines = content.split('\n');
      const accounts: ParsedAccount[] = [];

      lines.forEach((line, index) => {
        const parsed = parseAccountLine(line, index + 1);
        if (parsed) {
          accounts.push(parsed);
        }
      });

      if (accounts.length === 0) {
        toast.error('File appears to be empty or contains no valid accounts');
        return;
      }

      if (accounts.length > 10000) {
        toast.error('Maximum 10,000 accounts per import');
        return;
      }

      const fileData: ImportFile = {
        file,
        content,
        accounts,
        lineCount: accounts.length
      };

      setImportFile(fileData);
      
      // Immediately validate the accounts
      const results = await validateAccounts(accounts);
      setValidationResults(results);
      setCurrentStep('preview');
      
      toast.success(`Loaded ${accounts.length} accounts for validation`);
    } catch (error) {
      console.error('File reading error:', error);
      toast.error('Failed to read file content');
    }
  }, [validateAccounts]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt']
    },
    multiple: false,
    disabled: isLoading
  });

  const handleImport = async () => {
    if (!validationResults || !importFile) return;

    try {
      setCurrentStep('importing');
      await importAccounts(validationResults.valid);
      setCurrentStep('complete');
      toast.success('Account import completed successfully');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Import failed');
      setCurrentStep('preview');
    }
  };

  const handleClose = () => {
    resetImport();
    setImportFile(null);
    setValidationResults(null);
    setCurrentStep('upload');
    onClose();
  };

  const handleComplete = () => {
    onImportComplete();
    handleClose();
  };

  const downloadErrorReport = (errors: Array<{ username: string; error: string }>) => {
    const csvContent = [
      'Username,Error',
      ...errors.map(error => `"${error.username}","${error.error}"`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `import_errors_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    toast.success('Error report downloaded successfully');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-[90vw] max-w-4xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Upload className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Import Instagram Accounts</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={currentStep === 'importing'}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 ${
              currentStep === 'upload' ? 'text-blue-600' : 'text-gray-500'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                currentStep === 'upload' || !importFile ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
              }`}>
                {importFile ? <CheckCircle className="h-4 w-4" /> : '1'}
              </div>
              <span>Upload File</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${
              currentStep === 'preview' ? 'text-blue-600' : 'text-gray-500'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                currentStep === 'preview' ? 'bg-blue-100 text-blue-600' : 
                currentStep === 'importing' || currentStep === 'complete' ? 'bg-green-100 text-green-600' :
                'bg-gray-100 text-gray-400'
              }`}>
                {currentStep === 'importing' || currentStep === 'complete' ? <CheckCircle className="h-4 w-4" /> : '2'}
              </div>
              <span>Review & Validate</span>
            </div>
            <div className="w-8 h-px bg-gray-300"></div>
            <div className={`flex items-center space-x-2 ${
              currentStep === 'importing' || currentStep === 'complete' ? 'text-blue-600' : 'text-gray-500'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                currentStep === 'importing' ? 'bg-blue-100 text-blue-600' :
                currentStep === 'complete' ? 'bg-green-100 text-green-600' :
                'bg-gray-100 text-gray-400'
              }`}>
                {currentStep === 'importing' ? <Loader className="h-4 w-4 animate-spin" /> :
                 currentStep === 'complete' ? <CheckCircle className="h-4 w-4" /> : '3'}
              </div>
              <span>Import</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'upload' && (
            <div className="p-6 h-full flex items-center justify-center">
              <div className="w-full max-w-lg">
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isDragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <input {...getInputProps()} />
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {isDragActive ? 'Drop the file here' : 'Upload account list'}
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Drag and drop your .txt file here, or click to browse
                  </p>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>• Format: username:password:email:token (or just username)</p>
                    <p>• One account per line</p>
                    <p>• Maximum 10,000 accounts per import</p>
                    <p>• File size limit: 10MB</p>
                    <p>• Supported format: .txt</p>
                  </div>
                </div>
                {isLoading && (
                  <div className="mt-4 flex items-center justify-center space-x-2 text-blue-600">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Processing file...</span>
                  </div>
                )}
                {error && (
                  <div className="mt-4 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {currentStep === 'preview' && validationResults && importFile && (
            <div className="p-6 h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Import Preview: {importFile.file.name}
                </h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-green-800 font-medium">{validationResults.valid.length}</div>
                    <div className="text-green-600">Valid accounts</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="text-red-800 font-medium">{validationResults.invalid.length}</div>
                    <div className="text-red-600">Invalid accounts</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-yellow-800 font-medium">{validationResults.duplicatesInFile.length}</div>
                    <div className="text-yellow-600">Duplicates in file</div>
                  </div>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-blue-800 font-medium">{validationResults.existingInDatabase.length}</div>
                    <div className="text-blue-600">Already exist</div>
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="flex-1 overflow-hidden">
                <ImportPreviewTable
                  validationResults={validationResults}
                  accounts={importFile.accounts}
                />
              </div>
            </div>
          )}

          {currentStep === 'importing' && (
            <div className="p-6 h-full flex items-center justify-center">
              <div className="text-center">
                <Loader className="mx-auto h-12 w-12 text-blue-600 animate-spin mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Importing Accounts</h3>
                <p className="text-gray-500 mb-4">Please wait while we import your accounts...</p>
                <div className="w-64 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-500 mt-2">{progress}% complete</p>
              </div>
            </div>
          )}

          {currentStep === 'complete' && importSummary && (
            <div className="p-6 h-full flex items-center justify-center">
              <div className="text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Import Complete</h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span>Successfully imported:</span>
                      <div className="text-lg font-medium text-green-600">{importSummary.successful}</div>
                    </div>
                    <div>
                      <span>Failed imports:</span>
                      <div className="text-lg font-medium text-red-600">{importSummary.failed}</div>
                    </div>
                    <div>
                      <span>Total processed:</span>
                      <div className="text-lg font-medium text-gray-900">{importSummary.total}</div>
                    </div>
                  </div>
                </div>
                {importSummary.errors && importSummary.errors.length > 0 && (
                  <button 
                    onClick={() => {
                      downloadErrorReport(importSummary.errors || []);
                    }}
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 mb-4"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Error Report</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          {currentStep === 'upload' && (
            <div className="flex space-x-3 ml-auto">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}

          {currentStep === 'preview' && (
            <div className="flex space-x-3 ml-auto">
              <button
                onClick={() => setCurrentStep('upload')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={isLoading}
              >
                Back
              </button>
              <button
                onClick={handleImport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                disabled={!validationResults || validationResults.valid.length === 0}
              >
                Import {validationResults?.valid.length || 0} Accounts
              </button>
            </div>
          )}

          {currentStep === 'complete' && (
            <div className="flex space-x-3 ml-auto">
              <button
                onClick={handleComplete}
                className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={isLoading}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountImportModal; 