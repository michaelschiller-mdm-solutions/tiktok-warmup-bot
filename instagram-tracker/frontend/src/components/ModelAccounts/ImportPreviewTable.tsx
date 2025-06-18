import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, User } from 'lucide-react';

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

interface ImportPreviewTableProps {
  validationResults: ValidationResults;
  accounts: ParsedAccount[];
}

type TabType = 'valid' | 'invalid' | 'duplicates' | 'existing';

const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({ validationResults, accounts }) => {
  const [activeTab, setActiveTab] = useState<TabType>('valid');

  const tabs = [
    {
      id: 'valid' as TabType,
      label: 'Valid',
      count: validationResults.valid.length,
      color: 'green',
      icon: CheckCircle
    },
    {
      id: 'invalid' as TabType,
      label: 'Invalid',
      count: validationResults.invalid.length,
      color: 'red',
      icon: XCircle
    },
    {
      id: 'duplicates' as TabType,
      label: 'Duplicates',
      count: validationResults.duplicatesInFile.length,
      color: 'yellow',
      icon: AlertTriangle
    },
    {
      id: 'existing' as TabType,
      label: 'Already Imported',
      count: validationResults.existingInDatabase.length,
      color: 'blue',
      icon: User
    }
  ];

  const getTabColorClasses = (color: string, isActive: boolean) => {
    const baseClasses = "relative px-4 py-2 text-sm font-medium rounded-lg transition-colors";
    
    if (isActive) {
      switch (color) {
        case 'green':
          return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
        case 'red':
          return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
        case 'yellow':
          return `${baseClasses} bg-yellow-100 text-yellow-800 border border-yellow-200`;
        case 'blue':
          return `${baseClasses} bg-blue-100 text-blue-800 border border-blue-200`;
        default:
          return `${baseClasses} bg-gray-100 text-gray-800 border border-gray-200`;
      }
    } else {
      return `${baseClasses} text-gray-600 hover:text-gray-800 hover:bg-gray-50`;
    }
  };

  const renderAccountList = (accounts: ParsedAccount[], showReason = false, reasons?: Array<{ account: ParsedAccount; reason: string }>) => (
    <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg">
      {accounts.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>No accounts in this category</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {accounts.map((account, index) => {
            const reason = showReason && reasons ? reasons.find(r => r.account.username === account.username)?.reason : null;
            
            return (
              <div key={index} className="p-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900">@{account.username}</div>
                    {account.password && (
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        Has Password
                      </div>
                    )}
                    {account.email && (
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Has Email
                      </div>
                    )}
                    {account.token && (
                      <div className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                        Has Token
                      </div>
                    )}
                    {reason && (
                      <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                        {reason}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">Line #{account.lineNumber}</div>
                </div>
                {(account.password || account.email || account.token) && (
                  <div className="mt-2 text-xs text-gray-600 font-mono bg-gray-50 p-2 rounded">
                    {account.originalLine}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderExistingList = (usernames: string[]) => (
    <div className="h-64 overflow-y-auto border border-gray-200 rounded-lg">
      {usernames.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <p>No accounts in this category</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {usernames.map((username, index) => (
            <div key={index} className="p-3 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-sm font-medium text-gray-900">@{username}</div>
                  <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                    Already in database
                  </div>
                </div>
                <div className="text-xs text-gray-500">#{index + 1}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={getTabColorClasses(tab.color, isActive)}
              disabled={tab.count === 0}
            >
              <div className="flex items-center space-x-2">
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span className="bg-white bg-opacity-70 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {tab.count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === 'valid' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Valid Accounts</h4>
              <span className="text-sm text-gray-500">
                {validationResults.valid.length} accounts ready to import
              </span>
            </div>
            {renderAccountList(validationResults.valid)}
          </div>
        )}

        {activeTab === 'invalid' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Invalid Accounts</h4>
              <span className="text-sm text-gray-500">
                {validationResults.invalid.length} accounts with validation errors
              </span>
            </div>
            {renderAccountList(
              validationResults.invalid.map(item => item.account),
              true,
              validationResults.invalid
            )}
          </div>
        )}

        {activeTab === 'duplicates' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Duplicate Accounts</h4>
              <span className="text-sm text-gray-500">
                {validationResults.duplicatesInFile.length} accounts appear multiple times in file
              </span>
            </div>
            {renderAccountList(validationResults.duplicatesInFile)}
            {validationResults.duplicatesInFile.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Only one instance of each duplicate account will be imported.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'existing' && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Already Imported</h4>
              <span className="text-sm text-gray-500">
                {validationResults.existingInDatabase.length} accounts already exist in database
              </span>
            </div>
            {renderExistingList(validationResults.existingInDatabase)}
            {validationResults.existingInDatabase.length > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> These accounts are already in the database and will be skipped.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm text-gray-600">
          <strong>Import Summary:</strong> {validationResults.valid.length} accounts will be imported, {' '}
          {validationResults.invalid.length + validationResults.duplicatesInFile.length + validationResults.existingInDatabase.length} will be skipped
        </div>
      </div>
    </div>
  );
};

export default ImportPreviewTable; 