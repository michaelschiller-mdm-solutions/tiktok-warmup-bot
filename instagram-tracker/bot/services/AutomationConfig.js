/**
 * Automation Configuration
 * Centralized configuration for timing, retries, and automation behavior
 */

const AutomationConfig = {
    // Script execution settings
    scriptExecution: {
        maxRetries: 5,              // Reduced from 8 for faster failures
        baseRetryDelay: 2000,       // Base delay between retries (ms)
        maxRetryDelay: 15000,       // Maximum retry delay (ms)
        defaultTimeout: 45000,      // Default script timeout (ms)
        lockTimeout: 5000,          // Lock acquisition timeout (ms)
        healthCheckInterval: 60000, // Health check interval (ms)
    },

    // Container selection timing
    containerSelection: {
        stabilizationDelay: 2000,   // Wait after container selection (ms)
        pageFlipDelay: 1000,        // Delay between page flips (ms)
        selectionTimeout: 30000,    // Container selection timeout (ms)
    },

    // Instagram app timing
    instagram: {
        appLoadDelay: 3000,         // Wait for Instagram to fully load (ms)
        loginProcessDelay: 5000,    // Wait for login to be processed (ms)
        buttonPressDelay: 2000,     // Wait after button presses (ms)
        formStabilizationDelay: 500, // Wait for forms to stabilize (ms)
    },

    // Enhanced clipboard handling with conflict prevention
    clipboard: {
        setDelay: 1000,             // Wait after setting clipboard (ms)
        pasteDelay: 1000,           // Wait after paste operations (ms)
        usernameStabilizationDelay: 4000, // Critical delay to prevent password in username field
        passwordStabilizationDelay: 3000, // Wait after password clipboard operations
        tokenStabilizationDelay: 2000,    // Wait after token clipboard operations
        generalStabilizationDelay: 2000,  // Default stabilization delay
        
        // Safety timing to prevent clipboard conflicts - CONSERVATIVE TIMING
        minimumTimeBetweenOperations: 8000, // 8 seconds minimum between any clipboard operations
        conflictPreventionEnabled: true,    // Enable clipboard conflict prevention
        
        // Operation-specific timing requirements - EXTRA SAFE
        operationTiming: {
            username: 8000,  // 8 seconds for username operations (ensure script completion)
            password: 6000,  // 6 seconds for password operations (allow script to finish)
            token: 5000,     // 5 seconds for token operations (final step safety)
            general: 4000    // 4 seconds default for other operations
        }
    },

    // Email verification
    emailVerification: {
        maxTokenRetries: 3,         // Maximum token fetch attempts
        baseWaitTime: 10000,        // Base wait time between token attempts (ms)
        retryMultiplier: 5000,      // Additional wait time per retry (ms)
        tokenTimeout: 60000,        // Token fetch timeout (ms)
    },

    // Error handling
    errorHandling: {
        maxFailuresPerHour: 5,      // Max failures before pausing system
        pauseDuration: 300000,      // Pause duration after max failures (5min)
        cleanupDelay: 2000,         // Delay for cleanup operations (ms)
    },

    // Advanced timing profiles for different script types
    scriptProfiles: {
        // Quick scripts (button presses, simple navigation)
        quick: {
            preExecutionDelay: 500,
            postExecutionDelay: 1000,
            timeout: 15000,
            maxRetries: 3,
        },
        
        // Standard scripts (form filling, basic operations)
        standard: {
            preExecutionDelay: 1000,
            postExecutionDelay: 2000,
            timeout: 25000,
            maxRetries: 4,
        },
        
        // Complex scripts (app launching, page navigation)
        complex: {
            preExecutionDelay: 1000,
            postExecutionDelay: 3000,
            timeout: 30000,
            maxRetries: 5,
        },
        
        // Critical clipboard operations
        clipboard: {
            preExecutionDelay: 500,
            postExecutionDelay: 1000,
            timeout: 15000,
            maxRetries: 3,
        },
    },

    // Device-specific settings
    device: {
        // iPhone connection settings
        connectionTimeout: 10000,   // HTTP request timeout (ms)
        isRunningCheckInterval: 800, // Script running check interval (ms)
        consecutiveChecksRequired: 2, // Required consecutive "not running" checks
    },

    // Debugging and monitoring
    debugging: {
        enableDetailedLogging: true,
        logScriptTiming: true,
        logClipboardOperations: true,
        enableMetrics: true,
    }
};

/**
 * Get script profile by type
 * @param {string} profileType - 'quick', 'standard', 'complex', or 'clipboard'
 * @returns {Object} Script execution options
 */
AutomationConfig.getScriptProfile = function(profileType) {
    return this.scriptProfiles[profileType] || this.scriptProfiles.standard;
};

/**
 * Calculate retry delay based on error type and attempt
 * @param {Error} error - The error that occurred
 * @param {number} attempt - Current attempt number
 * @returns {number} Delay in milliseconds
 */
AutomationConfig.calculateRetryDelay = function(error, attempt) {
    const { baseRetryDelay, maxRetryDelay } = this.scriptExecution;
    
    // Different delays for different error types
    if (error.message.includes('currently running another script')) {
        return Math.min(baseRetryDelay * attempt * 1.5, maxRetryDelay);
    } else if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
        return Math.min(baseRetryDelay * attempt * 2, maxRetryDelay);
    } else {
        return Math.min(baseRetryDelay * attempt, maxRetryDelay);
    }
};

/**
 * Get timing for email verification retry
 * @param {number} attempt - Current attempt number
 * @returns {number} Delay in milliseconds
 */
AutomationConfig.getEmailRetryDelay = function(attempt) {
    const { baseWaitTime, retryMultiplier } = this.emailVerification;
    return baseWaitTime + (attempt * retryMultiplier);
};

module.exports = AutomationConfig; 