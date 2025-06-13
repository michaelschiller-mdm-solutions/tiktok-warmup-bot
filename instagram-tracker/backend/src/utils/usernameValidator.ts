/**
 * Instagram Username Validation Utilities
 * Validates Instagram usernames according to official rules
 */

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  cleanUsername?: string;
}

const INSTAGRAM_USERNAME_REGEX = /^[a-zA-Z0-9._]{1,30}$/;

/**
 * Validates an Instagram username according to Instagram's rules
 */
export const validateInstagramUsername = (username: string): ValidationResult => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, reason: 'Username is required' };
  }

  const trimmed = username.trim();
  if (trimmed.length === 0) {
    return { isValid: false, reason: 'Username cannot be empty' };
  }

  // Remove @ symbol if present (common in copy-paste scenarios)
  const cleanUsername = trimmed.replace(/^@/, '');

  // Check length constraints
  if (cleanUsername.length < 1) {
    return { isValid: false, reason: 'Username is too short' };
  }

  if (cleanUsername.length > 30) {
    return { isValid: false, reason: 'Username is too long (max 30 characters)' };
  }

  // Check character constraints
  if (!INSTAGRAM_USERNAME_REGEX.test(cleanUsername)) {
    return { 
      isValid: false, 
      reason: 'Username can only contain letters, numbers, periods, and underscores' 
    };
  }

  // Check period constraints
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

  // Check for reserved usernames or patterns
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

/**
 * Batch validate multiple usernames
 */
export const validateUsernamesBatch = (usernames: string[]): {
  valid: string[];
  invalid: Array<{ username: string; reason: string }>;
  duplicates: string[];
} => {
  const results = {
    valid: [] as string[],
    invalid: [] as Array<{ username: string; reason: string }>,
    duplicates: [] as string[]
  };

  const seenUsernames = new Set<string>();

  for (const username of usernames) {
    const validation = validateInstagramUsername(username);
    
    if (!validation.isValid) {
      results.invalid.push({
        username: username.trim().replace(/^@/, '').toLowerCase(),
        reason: validation.reason || 'Invalid format'
      });
      continue;
    }

    const cleanUsername = validation.cleanUsername!;
    
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

/**
 * Sanitize username for database storage
 */
export const sanitizeUsername = (username: string): string => {
  return username.trim().replace(/^@/, '').toLowerCase();
}; 