import { Pool } from 'pg';
export interface ImportResult {
    successful: number;
    failed: number;
    total: number;
    errors: Array<{
        username: string;
        error: string;
    }>;
}
export interface ExistingAccountsCheck {
    existing: string[];
    available: string[];
}
export declare class AccountImportService {
    private db;
    constructor(db: Pool);
    checkExistingAccounts(usernames: string[]): Promise<string[]>;
    importAccountsBatch(usernames: string[], modelId: number): Promise<ImportResult>;
    importAccountsWithBatching(usernames: string[], modelId: number, batchSize?: number): Promise<ImportResult>;
    getImportStatistics(modelId: number): Promise<{
        totalAccounts: number;
        importedAccounts: number;
        activeAccounts: number;
        lastImportDate?: Date;
    }>;
}
//# sourceMappingURL=accountImportService.d.ts.map