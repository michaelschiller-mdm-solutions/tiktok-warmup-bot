export interface ValidationResult {
    isValid: boolean;
    reason?: string;
    cleanUsername?: string;
}
export declare const validateInstagramUsername: (username: string) => ValidationResult;
export declare const validateUsernamesBatch: (usernames: string[]) => {
    valid: string[];
    invalid: Array<{
        username: string;
        reason: string;
    }>;
    duplicates: string[];
};
export declare const sanitizeUsername: (username: string) => string;
//# sourceMappingURL=usernameValidator.d.ts.map