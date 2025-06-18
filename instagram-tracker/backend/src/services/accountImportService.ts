import { Pool } from 'pg';
import { validateUsernamesBatch, sanitizeUsername } from '../utils/usernameValidator';
import { ProxyAssignmentService } from './ProxyAssignmentService';
import { ContentAssignmentService } from './ContentAssignmentService';
import { WarmupProcessService } from './WarmupProcessService';
import { AccountLifecycleService } from './AccountLifecycleService';

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
  token?: string; // Email password
}

export class AccountImportService {
  private proxyService: ProxyAssignmentService;
  private contentService: ContentAssignmentService;
  private warmupService: WarmupProcessService;

  constructor(private db: Pool) {
    this.proxyService = new ProxyAssignmentService();
    this.contentService = new ContentAssignmentService();
    this.warmupService = new WarmupProcessService();
  }

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
              token: parts[3]?.trim() || undefined // Email password
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

        // Store email passwords in account_code field (plain text as per current system)
        const insertParams = [];
        for (const account of accountsToImport) {
          insertParams.push(
            account.username,
            modelId,
            'imported',
            account.password || null,
            account.email || null,
            account.token || null  // Store email password in account_code field
          );
        }

        const insertQuery = `
          INSERT INTO accounts (username, model_id, lifecycle_state, password, email, account_code)
          VALUES ${insertValues}
          RETURNING id, username
        `;

        const insertResult = await client.query(insertQuery, insertParams);
        result.successful = insertResult.rows.length;

        // Enhanced post-import processing pipeline
        if (insertResult.rows.length > 0) {
          console.log(`Starting post-import processing for ${insertResult.rows.length} accounts`);
          
          for (const account of insertResult.rows) {
            try {
              // Step 1: Initialize warmup phases
              await client.query('SELECT initialize_warmup_phases($1)', [account.id]);
              console.log(`✓ Warmup phases initialized for ${account.username}`);

              // Step 2: Assign proxy automatically
              const proxyResult = await this.proxyService.assignProxyToAccount(account.id);
              if (proxyResult.success) {
                console.log(`✓ Proxy assigned to ${account.username}: ${proxyResult.message}`);
                
                // Step 3: Transition to 'ready' state after proxy assignment
                await AccountLifecycleService.transitionAccountState({
                  account_id: account.id,
                  to_state: 'ready' as any,
                  changed_by: 'system',
                  reason: 'Proxy assigned and account ready for warmup'
                });
                console.log(`✓ Account ${account.username} transitioned to 'ready' state`);

                // Step 4: Initialize content assignment for warmup phases
                try {
                  await this.initializeContentAssignments(account.id, modelId);
                  console.log(`✓ Content assignments initialized for ${account.username}`);
                } catch (contentError) {
                  console.warn(`⚠ Content assignment failed for ${account.username}:`, contentError);
                  // Continue without content assignment - can be done later
                }
              } else {
                console.warn(`⚠ Proxy assignment failed for ${account.username}: ${proxyResult.message}`);
                // Account stays in 'imported' state until proxy is available
              }

            } catch (processingError) {
              console.error(`❌ Post-import processing failed for ${account.username}:`, processingError);
              // Don't fail the import, but log the error
              result.errors.push({
                username: account.username,
                error: `Post-import processing failed: ${processingError.message}`
              });
            }
          }
          
          console.log(`Post-import processing completed for batch`);
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

  /**
   * Initialize content assignments for an account's warmup phases
   */
  private async initializeContentAssignments(accountId: number, modelId: number): Promise<void> {
    try {
      // Get all pending warmup phases for this account
      const phasesQuery = `
        SELECT id, phase 
        FROM account_warmup_phases 
        WHERE account_id = $1 AND status = 'pending'
        ORDER BY 
          CASE phase 
            WHEN 'pfp' THEN 1 
            WHEN 'bio' THEN 2 
            WHEN 'post' THEN 3 
            WHEN 'highlight' THEN 4 
            WHEN 'story' THEN 5 
          END
      `;
      
      const phasesResult = await this.db.query(phasesQuery, [accountId]);
      
      for (const phase of phasesResult.rows) {
        try {
          // Assign content to each warmup phase
          await this.contentService.assignContentToPhase(
            accountId,
            phase.id,
            phase.phase as any, // Convert to ContentType enum
            modelId
          );
          
          console.log(`Content assigned to ${phase.phase} phase for account ${accountId}`);
        } catch (phaseError) {
          console.warn(`Failed to assign content to ${phase.phase} phase for account ${accountId}:`, phaseError);
          // Continue with other phases even if one fails
        }
      }
    } catch (error) {
      console.error('Error initializing content assignments:', error);
      throw new Error('Failed to initialize content assignments');
    }
  }
} 