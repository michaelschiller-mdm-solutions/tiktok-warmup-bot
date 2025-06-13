import { Pool } from 'pg';
import { validateUsernamesBatch, sanitizeUsername } from '../utils/usernameValidator';

export interface ImportResult {
  successful: number;
  failed: number;
  total: number;
  errors: Array<{ username: string; error: string }>;
}

export interface ExistingAccountsCheck {
  existing: string[];
  available: string[];
}

export interface AccountToImport {
  username: string;
  password?: string;
  email?: string;
  account_code?: string;
}

export class AccountImportService {
  constructor(private db: Pool) {}

  /**
   * Check which accounts already exist in the database
   */
  async checkExistingAccounts(usernames: string[]): Promise<string[]> {
    if (usernames.length === 0) return [];

    const placeholders = usernames.map((_, index) => `$${index + 1}`).join(', ');
    const normalizedUsernames = usernames.map(u => u.toLowerCase().trim().replace(/^@/, ''));
    
    const query = `
      SELECT LOWER(username) as username 
      FROM accounts 
      WHERE LOWER(username) IN (${placeholders})
    `;
    
    const result = await this.db.query(query, normalizedUsernames);
    return result.rows.map((row: any) => row.username);
  }

  /**
   * Import accounts in batch with transaction support
   */
  async importAccountsBatch(accounts: (string | AccountToImport)[], modelId: number): Promise<ImportResult> {
    const client = await this.db.connect();
    
    try {
      await client.query('BEGIN');

      const result: ImportResult = {
        successful: 0,
        failed: 0,
        total: accounts.length,
        errors: []
      };

      // Normalize accounts to AccountToImport objects
      const normalizedAccounts: AccountToImport[] = accounts.map(account => {
        if (typeof account === 'string') {
          // If it's a string, check if it's colon-separated format
          if (account.includes(':')) {
            const parts = account.split(':');
            return {
              username: parts[0]?.trim() || '',
              password: parts[1]?.trim() || undefined,
              email: parts[2]?.trim() || undefined,
              account_code: parts[3]?.trim() || undefined
            };
          } else {
            // Simple username format
            return { username: account.trim() };
          }
        } else {
          // Already an AccountToImport object
          return account;
        }
      });

      // Validate usernames
      const validation = validateUsernamesBatch(normalizedAccounts.map(acc => acc.username));
      
      validation.invalid.forEach(invalid => {
        result.failed++;
        result.errors.push({
          username: invalid.username,
          error: invalid.reason
        });
      });

      const validUsernames = validation.valid;
      const existingUsernames = await this.checkExistingAccounts(validUsernames);
      
      const accountsToImport = normalizedAccounts.filter(
        account => validUsernames.includes(account.username) && 
                  !existingUsernames.includes(account.username.toLowerCase())
      );

      if (accountsToImport.length > 0) {
        const insertValues = accountsToImport.map((_, index) => {
          const paramIndex = index * 6;
          return `($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6})`;
        }).join(', ');

        const insertParams = accountsToImport.flatMap(account => [
          account.username,
          modelId,
          'imported',
          account.password || null,
          account.email || null,
          account.account_code || null
        ]);

        const insertQuery = `
          INSERT INTO accounts (username, model_id, lifecycle_state, password, email, account_code)
          VALUES ${insertValues}
          RETURNING id, username
        `;

        const insertResult = await client.query(insertQuery, insertParams);
        result.successful = insertResult.rows.length;

        // Initialize warmup phases for successfully imported accounts
        if (insertResult.rows.length > 0) {
          for (const account of insertResult.rows) {
            try {
              await client.query('SELECT initialize_warmup_phases($1)', [account.id]);
            } catch (warmupError) {
              console.warn(`Failed to initialize warmup phases for account ${account.username}:`, warmupError);
              // Don't fail the import if warmup initialization fails
            }
          }
        }
      }

      await client.query('COMMIT');
      return result;

    } catch (error: any) {
      await client.query('ROLLBACK');
      throw new Error(error.message || 'Import failed');
    } finally {
      client.release();
    }
  }

  /**
   * Import large numbers of accounts with automatic batching
   */
  async importAccountsWithBatching(
    usernames: string[], 
    modelId: number, 
    batchSize: number = 100
  ): Promise<ImportResult> {
    if (usernames.length === 0) {
      return { successful: 0, failed: 0, total: 0, errors: [] };
    }

    // Split into batches
    const batches: string[][] = [];
    for (let i = 0; i < usernames.length; i += batchSize) {
      batches.push(usernames.slice(i, i + batchSize));
    }

    const totalResult: ImportResult = {
      successful: 0,
      failed: 0,
      total: usernames.length,
      errors: []
    };

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      try {
        const batchResult = await this.importAccountsBatch(
          batch, 
          modelId
        );

        totalResult.successful += batchResult.successful;
        totalResult.failed += batchResult.failed;
        totalResult.errors.push(...batchResult.errors);

      } catch (batchError: any) {
        console.error(`Batch ${batchIndex + 1} failed completely:`, batchError);
        
        // Mark entire batch as failed
        totalResult.failed += batch.length;
        batch.forEach(username => {
          totalResult.errors.push({
            username: sanitizeUsername(username),
            error: batchError.message || 'Batch processing failed'
          });
        });
      }
    }

    console.log('Complete import finished:', {
      successful: totalResult.successful,
      failed: totalResult.failed,
      total: totalResult.total,
      errorCount: totalResult.errors.length
    });

    return totalResult;
  }

  /**
   * Get import statistics for a model
   */
  async getImportStatistics(modelId: number): Promise<{
    totalAccounts: number;
    importedAccounts: number;
    activeAccounts: number;
    lastImportDate?: Date;
  }> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_accounts,
          COUNT(CASE WHEN lifecycle_state = 'imported' THEN 1 END) as imported_accounts,
          COUNT(CASE WHEN lifecycle_state = 'active' THEN 1 END) as active_accounts,
          MAX(created_at) as last_import_date
        FROM accounts 
        WHERE model_id = $1
      `;

      const result = await this.db.query(query, [modelId]);
      const row = result.rows[0];

      return {
        totalAccounts: parseInt(row.total_accounts) || 0,
        importedAccounts: parseInt(row.imported_accounts) || 0,
        activeAccounts: parseInt(row.active_accounts) || 0,
        lastImportDate: row.last_import_date || undefined
      };

    } catch (error) {
      console.error('Error getting import statistics:', error);
      throw new Error('Failed to get import statistics');
    }
  }
} 