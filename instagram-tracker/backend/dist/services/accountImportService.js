"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountImportService = void 0;
const usernameValidator_1 = require("../utils/usernameValidator");
const ProxyAssignmentService_1 = require("./ProxyAssignmentService");
const ContentAssignmentService_1 = require("./ContentAssignmentService");
const WarmupProcessService_1 = require("./WarmupProcessService");
class AccountImportService {
    constructor(db) {
        this.db = db;
        this.proxyService = new ProxyAssignmentService_1.ProxyAssignmentService();
        this.contentService = new ContentAssignmentService_1.ContentAssignmentService();
        this.warmupService = new WarmupProcessService_1.WarmupProcessService();
    }
    async checkExistingAccounts(usernames) {
        if (usernames.length === 0)
            return [];
        const placeholders = usernames.map((_, index) => `$${index + 1}`).join(', ');
        const normalizedUsernames = usernames.map(u => u.toLowerCase().trim().replace(/^@/, ''));
        const query = `
      SELECT LOWER(username) as username 
      FROM accounts 
      WHERE LOWER(username) IN (${placeholders})
    `;
        const result = await this.db.query(query, normalizedUsernames);
        return result.rows.map((row) => row.username);
    }
    async importAccountsBatch(accounts, modelId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const result = {
                successful: 0,
                failed: 0,
                total: accounts.length,
                errors: []
            };
            const normalizedAccounts = accounts.map(account => {
                if (typeof account === 'string') {
                    if (account.includes(':')) {
                        const parts = account.split(':');
                        return {
                            username: parts[0]?.trim() || '',
                            password: parts[1]?.trim() || undefined,
                            email: parts[2]?.trim() || undefined,
                            token: parts[3]?.trim() || undefined,
                            order_number: parts[4]?.trim(),
                            import_source: parts[5]?.trim(),
                            import_batch_id: parts[6]?.trim()
                        };
                    }
                    else {
                        return { username: account.trim() };
                    }
                }
                else {
                    return account;
                }
            });
            const validation = (0, usernameValidator_1.validateUsernamesBatch)(normalizedAccounts.map(acc => acc.username));
            validation.invalid.forEach(invalid => {
                result.failed++;
                result.errors.push({
                    username: invalid.username,
                    error: invalid.reason
                });
            });
            const validUsernames = validation.valid;
            const existingUsernames = await this.checkExistingAccounts(validUsernames);
            const accountsToImport = normalizedAccounts.filter(account => validUsernames.includes(account.username) &&
                !existingUsernames.includes(account.username.toLowerCase()));
            if (accountsToImport.length > 0) {
                const insertValues = accountsToImport.map((_, index) => {
                    const paramIndex = index * 10;
                    return `($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`;
                }).join(', ');
                const insertParams = [];
                for (const account of accountsToImport) {
                    insertParams.push(account.username, modelId, 'imported', account.password || null, account.email || null, (account.token || account.account_code || account.email_password) || null, account.order_number || null, account.import_source || 'csv_file', account.import_batch_id || null, new Date());
                }
                const insertQuery = `
          INSERT INTO accounts (username, model_id, lifecycle_state, password, email, account_code, order_number, import_source, import_batch_id, imported_at)
          VALUES ${insertValues}
          RETURNING id, username
        `;
                const insertResult = await client.query(insertQuery, insertParams);
                result.successful = insertResult.rows.length;
                if (insertResult.rows.length > 0) {
                    console.log(`Starting post-import processing for ${insertResult.rows.length} accounts`);
                    for (const account of insertResult.rows) {
                        try {
                            await client.query('SELECT initialize_warmup_phases($1)', [account.id]);
                            console.log(`✓ Warmup phases initialized for ${account.username}`);
                            try {
                                const proxyResult = await this.proxyService.assignProxyToAccount(account.id);
                                if (proxyResult.success) {
                                    console.log(`✓ Proxy assigned to ${account.username}: ${proxyResult.message}`);
                                }
                                else {
                                    console.warn(`⚠ Proxy assignment failed for ${account.username}: ${proxyResult.message}`);
                                }
                            }
                            catch (proxyError) {
                                console.warn(`⚠ Proxy assignment failed for ${account.username}: ${proxyError.message}`);
                            }
                            try {
                                await this.initializeContentAssignments(account.id, modelId);
                                console.log(`✓ Content assignments initialized for ${account.username}`);
                            }
                            catch (contentError) {
                                console.warn(`⚠ Content assignment failed for ${account.username}:`, contentError);
                            }
                        }
                        catch (processingError) {
                            console.error(`❌ Post-import processing failed for ${account.username}:`, processingError);
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
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw new Error(error.message || 'Import failed');
        }
        finally {
            client.release();
        }
    }
    async importAccountsWithBatching(usernames, modelId, batchSize = 100) {
        if (usernames.length === 0) {
            return { successful: 0, failed: 0, total: 0, errors: [] };
        }
        const batches = [];
        for (let i = 0; i < usernames.length; i += batchSize) {
            batches.push(usernames.slice(i, i + batchSize));
        }
        const totalResult = {
            successful: 0,
            failed: 0,
            total: usernames.length,
            errors: []
        };
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
            const batch = batches[batchIndex];
            try {
                const batchResult = await this.importAccountsBatch(batch, modelId);
                totalResult.successful += batchResult.successful;
                totalResult.failed += batchResult.failed;
                totalResult.errors.push(...batchResult.errors);
            }
            catch (batchError) {
                console.error(`Batch ${batchIndex + 1} failed completely:`, batchError);
                totalResult.failed += batch.length;
                batch.forEach(username => {
                    totalResult.errors.push({
                        username: (0, usernameValidator_1.sanitizeUsername)(username),
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
    async getImportStatistics(modelId) {
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
        }
        catch (error) {
            console.error('Error getting import statistics:', error);
            throw new Error('Failed to get import statistics');
        }
    }
    async initializeContentAssignments(accountId, modelId) {
        try {
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
                    await this.contentService.assignContentToPhase(accountId, phase.id, phase.phase, modelId);
                    console.log(`Content assigned to ${phase.phase} phase for account ${accountId}`);
                }
                catch (phaseError) {
                    console.warn(`Failed to assign content to ${phase.phase} phase for account ${accountId}:`, phaseError);
                }
            }
        }
        catch (error) {
            console.error('Error initializing content assignments:', error);
            throw new Error('Failed to initialize content assignments');
        }
    }
}
exports.AccountImportService = AccountImportService;
//# sourceMappingURL=accountImportService.js.map