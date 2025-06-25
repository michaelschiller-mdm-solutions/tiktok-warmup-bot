import { useState, useCallback } from 'react';
import { toast } from 'react-hot-toast';

interface ParsedAccount {
  username: string;
  password?: string;
  email?: string;
  account_code?: string;
  email_password?: string;
  lineNumber: number;
  originalLine: string;
}

interface ValidationResults {
  valid: ParsedAccount[];
  invalid: Array<{ account: ParsedAccount; reason: string }>;
  duplicatesInFile: ParsedAccount[];
  existingInDatabase: string[];
}

interface ImportSummary {
  successful: number;
  failed: number;
  total: number;
  errors?: Array<{ username: string; error: string }>;
}

interface UseAccountImportReturn {
  validateAccounts: (accounts: ParsedAccount[]) => Promise<ValidationResults>;
  importAccounts: (accounts: ParsedAccount[], orderNumber?: string, importSource?: string) => Promise<ImportSummary>;
  isLoading: boolean;
  progress: number;
  error: string | null;
  importSummary: ImportSummary | null;
  resetImport: () => void;
}

const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

export const useAccountImport = (modelId: number): UseAccountImportReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const validateUsername = (username: string): { isValid: boolean; reason?: string } => {
    if (!username || username.trim().length === 0) {
      return { isValid: false, reason: 'Empty username' };
    }

    const cleanUsername = username.trim().replace(/^@/, ''); // Remove @ if present

    if (cleanUsername.length < 1) {
      return { isValid: false, reason: 'Username too short' };
    }

    if (cleanUsername.length > 30) {
      return { isValid: false, reason: 'Username too long (max 30 characters)' };
    }

    if (!INSTAGRAM_USERNAME_REGEX.test(cleanUsername)) {
      return { isValid: false, reason: 'Invalid characters (only letters, numbers, dots, underscores)' };
    }

    if (cleanUsername.startsWith('.') || cleanUsername.endsWith('.')) {
      return { isValid: false, reason: 'Username cannot start or end with a dot' };
    }

    if (cleanUsername.includes('..')) {
      return { isValid: false, reason: 'Username cannot contain consecutive dots' };
    }

    return { isValid: true };
  };

  const validateAccounts = useCallback(async (accounts: ParsedAccount[]): Promise<ValidationResults> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    try {
      const results: ValidationResults = {
        valid: [],
        invalid: [],
        duplicatesInFile: [],
        existingInDatabase: []
      };

      // Step 1: Validate username format and detect duplicates within file
      const seenUsernames = new Set<string>();

      for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const cleanUsername = account.username.trim().replace(/^@/, '').toLowerCase();

        // Update progress
        setProgress(Math.round(((i + 1) / accounts.length) * 50)); // First 50% for validation

        if (seenUsernames.has(cleanUsername)) {
          if (!results.duplicatesInFile.find(dup => dup.username.toLowerCase() === cleanUsername)) {
            results.duplicatesInFile.push(account);
          }
          continue;
        }

        seenUsernames.add(cleanUsername);

        const validation = validateUsername(account.username);
        if (validation.isValid) {
          results.valid.push({
            ...account,
            username: cleanUsername
          });
        } else {
          results.invalid.push({
            account: {
              ...account,
              username: cleanUsername
            },
            reason: validation.reason || 'Invalid format'
          });
        }
      }

      // Step 2: Check existing accounts in database
      if (results.valid.length > 0) {
        try {
          const usernames = results.valid.map(account => account.username);
          const response = await fetch('/api/import/accounts/check-existing', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              usernames: usernames
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to check existing accounts');
          }

          const data = await response.json();
          const existingUsernames = data.data.existing || [];

          // Move existing accounts from valid to existing
          results.existingInDatabase = existingUsernames;
          results.valid = results.valid.filter(account => !existingUsernames.includes(account.username));

        } catch (dbError) {
          console.warn('Could not check existing accounts:', dbError);
          // Continue without checking existing accounts
        }
      }

      setProgress(100);
      return results;

    } catch (err: any) {
      setError(err.message || 'Validation failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [modelId]);

  const importAccounts = useCallback(async (accounts: ParsedAccount[], orderNumber?: string, importSource?: string): Promise<ImportSummary> => {
    setIsLoading(true);
    setError(null);
    setProgress(0);
    setImportSummary(null);

    try {
      const batchSize = 100; // Process in batches to avoid timeout
      const batches = [];
      
      for (let i = 0; i < accounts.length; i += batchSize) {
        batches.push(accounts.slice(i, i + batchSize));
      }

      let totalSuccessful = 0;
      let totalFailed = 0;
      const allErrors: Array<{ username: string; error: string }> = [];

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        
        try {
          // Convert ParsedAccount[] to account objects with all fields
          const batchId = orderNumber ? `${orderNumber}_batch_${batchIndex + 1}` : `batch_${Date.now()}_${batchIndex + 1}`;
          const accountsData = batch.map(account => ({
            username: account.username,
            password: account.password,
            email: account.email,
            account_code: account.email_password || account.account_code || undefined,
            order_number: orderNumber,
            import_source: importSource || 'manual_upload',
            import_batch_id: batchId
          }));
          
          const response = await fetch('/api/import/accounts/import', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              accounts_data: accountsData, // Send full account objects instead of just usernames
              model_id: modelId,
              batch_index: batchIndex,
              total_batches: batches.length,
              order_number: orderNumber,
              import_source: importSource
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Import failed');
          }

          const data = await response.json();
          totalSuccessful += data.data.successful || 0;
          totalFailed += data.data.failed || 0;
          
          if (data.data.errors) {
            allErrors.push(...data.data.errors);
          }

        } catch (batchError: any) {
          console.error(`Batch ${batchIndex + 1} failed:`, batchError);
          totalFailed += batch.length;
          
          batch.forEach(account => {
            allErrors.push({
              username: account.username,
              error: batchError.message || 'Import failed'
            });
          });
        }

        // Update progress
        const progress = ((batchIndex + 1) / batches.length) * 100;
        setProgress(progress);
      }

      const summary: ImportSummary = {
        total: accounts.length,
        successful: totalSuccessful,
        failed: totalFailed,
        errors: allErrors
      };

      setImportSummary(summary);
      return summary;

    } catch (err: any) {
      setError(err.message || 'Import failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [modelId]);

  const resetImport = useCallback(() => {
    setIsLoading(false);
    setProgress(0);
    setError(null);
    setImportSummary(null);
  }, []);

  return {
    validateAccounts,
    importAccounts,
    isLoading,
    progress,
    error,
    importSummary,
    resetImport
  };
}; 