"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountImportService = void 0;
const usernameValidator_1 = require("../utils/usernameValidator");
class AccountImportService {
    constructor(db) {
        this.db = db;
    }
    async checkExistingAccounts(usernames) {
        if (usernames.length === 0)
            return [];
        try {
            const cleanUsernames = usernames.map(usernameValidator_1.sanitizeUsername);
            const query = `
        SELECT DISTINCT LOWER(username) as username
        FROM accounts 
        WHERE LOWER(username) = ANY($1)
      `;
            const result = await this.db.query(query, [cleanUsernames]);
            return result.rows.map(row => row.username);
        }
        catch (error) {
            console.error('Error checking existing accounts:', error);
            return [];
        }
    }
    async importAccountsBatch(usernames, modelId) {
        const client = await this.db.connect();
        try {
            await client.query('BEGIN');
            const result = {
                successful: 0,
                failed: 0,
                total: usernames.length,
                errors: []
            };
            const validation = (0, usernameValidator_1.validateUsernamesBatch)(usernames);
            validation.invalid.forEach(invalid => {
                result.failed++;
                result.errors.push({
                    username: invalid.username,
                    error: invalid.reason
                });
            });
            const existingUsernames = await this.checkExistingAccounts(validation.valid);
            const accountsToImport = validation.valid.filter(username => !existingUsernames.includes(username.toLowerCase()));
            if (accountsToImport.length > 0) {
                const insertValues = accountsToImport.map((_, index) => {
                    const paramIndex = index * 3;
                    return `($${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3})`;
                }).join(', ');
                const insertParams = accountsToImport.flatMap(username => [
                    username,
                    modelId,
                    'imported'
                ]);
                const insertQuery = `
          INSERT INTO accounts (username, model_id, lifecycle_state)
          VALUES ${insertValues}
          RETURNING id, username
        `;
                const insertResult = await client.query(insertQuery, insertParams);
                result.successful = insertResult.rows.length;
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
}
exports.AccountImportService = AccountImportService;
//# sourceMappingURL=accountImportService.js.map