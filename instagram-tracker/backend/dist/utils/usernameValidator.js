"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeUsername = exports.validateUsernamesBatch = exports.validateInstagramUsername = void 0;
const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;
const validateInstagramUsername = (username) => {
    if (!username || typeof username !== 'string') {
        return { isValid: false, reason: 'Username is required' };
    }
    const trimmed = username.trim();
    if (trimmed.length === 0) {
        return { isValid: false, reason: 'Username cannot be empty' };
    }
    const cleanUsername = trimmed.replace(/^@/, '');
    if (cleanUsername.length < 1) {
        return { isValid: false, reason: 'Username is too short' };
    }
    if (cleanUsername.length > 30) {
        return { isValid: false, reason: 'Username is too long (max 30 characters)' };
    }
    if (!INSTAGRAM_USERNAME_REGEX.test(cleanUsername)) {
        return {
            isValid: false,
            reason: 'Username can only contain letters, numbers, periods, and underscores'
        };
    }
    if (cleanUsername.startsWith('.') || cleanUsername.endsWith('.')) {
        return {
            isValid: false,
            reason: 'Username cannot start or end with a period'
        };
    }
    if (cleanUsername.includes('..')) {
        return {
            isValid: false,
            reason: 'Username cannot contain consecutive periods'
        };
    }
    const reservedPatterns = [
        /^instagram$/i,
        /^admin$/i,
        /^root$/i,
        /^api$/i,
        /^www$/i,
        /^support$/i
    ];
    const isReserved = reservedPatterns.some(pattern => pattern.test(cleanUsername));
    if (isReserved) {
        return {
            isValid: false,
            reason: 'Username contains reserved words'
        };
    }
    return {
        isValid: true,
        cleanUsername: cleanUsername.toLowerCase()
    };
};
exports.validateInstagramUsername = validateInstagramUsername;
const validateUsernamesBatch = (usernames) => {
    const results = {
        valid: [],
        invalid: [],
        duplicates: []
    };
    const seenUsernames = new Set();
    for (const username of usernames) {
        const validation = (0, exports.validateInstagramUsername)(username);
        if (!validation.isValid) {
            results.invalid.push({
                username: username.trim().replace(/^@/, '').toLowerCase(),
                reason: validation.reason || 'Invalid format'
            });
            continue;
        }
        const cleanUsername = validation.cleanUsername;
        if (seenUsernames.has(cleanUsername)) {
            if (!results.duplicates.includes(cleanUsername)) {
                results.duplicates.push(cleanUsername);
            }
            continue;
        }
        seenUsernames.add(cleanUsername);
        results.valid.push(cleanUsername);
    }
    return results;
};
exports.validateUsernamesBatch = validateUsernamesBatch;
const sanitizeUsername = (username) => {
    return username.trim().replace(/^@/, '').toLowerCase();
};
exports.sanitizeUsername = sanitizeUsername;
//# sourceMappingURL=usernameValidator.js.map