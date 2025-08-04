/*
 * Error Handler - Robust error handling and recovery mechanisms
 * Provides centralized error management, retry logic, and recovery strategies
 * 
 * Created: Enhanced error handling and recovery mechanisms for markt.de DM bot
 */

// Prevent duplicate class declarations
if (typeof window.ErrorHandler === 'undefined') {

window.ErrorHandler = class ErrorHandler {
  constructor(logger) {
    this.logger = logger;
    this.errorCounts = new Map();
    this.recoveryStrategies = new Map();
    this.circuitBreakers = new Map();
    
    this.setupErrorCategories();
    this.setupRecoveryStrategies();
    this.setupCircuitBreakers();
  }

  // Error categories and their characteristics
  setupErrorCategories() {
    this.errorCategories = {
      NETWORK: {
        patterns: ['network', 'timeout', 'connection', 'fetch', 'xhr'],
        recoverable: true,
        maxRetries: 3,
        baseDelay: 1000,
        backoffMultiplier: 2
      },
      AUTHENTICATION: {
        patterns: ['login', 'auth', 'session', 'unauthorized', '401', '403'],
        recoverable: true,
        maxRetries: 2,
        baseDelay: 2000,
        backoffMultiplier: 1.5,
        requiresReauth: true
      },
      DOM_ELEMENT: {
        patterns: ['element not found', 'selector', 'querySelector', 'click'],
        recoverable: true,
        maxRetries: 5,
        baseDelay: 500,
        backoffMultiplier: 1.2
      },
      RATE_LIMIT: {
        patterns: ['rate limit', 'too many requests', '429', 'throttle'],
        recoverable: true,
        maxRetries: 3,
        baseDelay: 5000,
        backoffMultiplier: 3,
        requiresCooldown: true
      },
      VALIDATION: {
        patterns: ['validation', 'invalid', 'required', 'format'],
        recoverable: false,
        maxRetries: 0,
        baseDelay: 0,
        backoffMultiplier: 1
      },
      SYSTEM: {
        patterns: ['memory', 'storage', 'permission', 'security'],
        recoverable: false,
        maxRetries: 1,
        baseDelay: 1000,
        backoffMultiplier: 1
      },
      UNKNOWN: {
        patterns: [],
        recoverable: true,
        maxRetries: 2,
        baseDelay: 1000,
        backoffMultiplier: 2
      }
    };
  }

  // Recovery strategies for different error types
  setupRecoveryStrategies() {
    this.recoveryStrategies.set('NETWORK', async (error, context) => {
      this.logger.info('Attempting network error recovery');
      
      // Wait for network to stabilize
      await this.sleep(2000);
      
      // Check network connectivity
      if (navigator.onLine) {
        this.logger.info('Network appears to be online, retrying operation');
        return { canRetry: true, delay: 1000 };
      } else {
        this.logger.warning('Network appears to be offline, waiting longer');
        return { canRetry: true, delay: 10000 };
      }
    });

    this.recoveryStrategies.set('AUTHENTICATION', async (error, context) => {
      this.logger.warning('Attempting authentication error recovery');
      
      try {
        // Check if session is still valid
        const sessionValid = await this.validateSession(context);
        
        if (!sessionValid) {
          this.logger.info('Session invalid, attempting re-authentication');
          
          // Try to re-authenticate
          const reauth = await this.attemptReauthentication(context);
          
          if (reauth.success) {
            this.logger.success('Re-authentication successful');
            return { canRetry: true, delay: 2000 };
          } else {
            this.logger.error('Re-authentication failed');
            return { canRetry: false, requiresUserAction: true };
          }
        }
        
        return { canRetry: true, delay: 3000 };
      } catch (recoveryError) {
        this.logger.error('Authentication recovery failed', recoveryError);
        return { canRetry: false, requiresUserAction: true };
      }
    });

    this.recoveryStrategies.set('DOM_ELEMENT', async (error, context) => {
      this.logger.info('Attempting DOM element error recovery');
      
      try {
        // Wait for page to stabilize
        await this.sleep(1000);
        
        // Check if page has loaded completely
        if (document.readyState !== 'complete') {
          this.logger.info('Page still loading, waiting for completion');
          await this.waitForPageLoad();
        }
        
        // Check for common page issues
        const pageIssues = await this.checkPageIssues();
        
        if (pageIssues.hasModal) {
          this.logger.info('Modal detected, attempting to close');
          await this.closeModals();
        }
        
        if (pageIssues.hasOverlay) {
          this.logger.info('Overlay detected, waiting for it to disappear');
          await this.waitForOverlayToDisappear();
        }
        
        return { canRetry: true, delay: 1500 };
      } catch (recoveryError) {
        this.logger.error('DOM element recovery failed', recoveryError);
        return { canRetry: true, delay: 3000 };
      }
    });

    this.recoveryStrategies.set('RATE_LIMIT', async (error, context) => {
      this.logger.warning('Rate limit detected, implementing cooldown strategy');
      
      // Implement exponential backoff with jitter
      const baseDelay = 30000; // 30 seconds base
      const jitter = Math.random() * 10000; // Up to 10 seconds jitter
      const cooldownDelay = baseDelay + jitter;
      
      this.logger.info(`Cooling down for ${Math.round(cooldownDelay / 1000)} seconds`);
      
      // Update circuit breaker
      this.updateCircuitBreaker('rate_limit', true);
      
      return { 
        canRetry: true, 
        delay: cooldownDelay,
        requiresCooldown: true 
      };
    });
  }

  // Circuit breakers to prevent cascading failures
  setupCircuitBreakers() {
    const defaultCircuitBreaker = {
      failureCount: 0,
      lastFailureTime: null,
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      threshold: 5,
      timeout: 60000, // 1 minute
      halfOpenMaxCalls: 3
    };

    this.circuitBreakers.set('login', { ...defaultCircuitBreaker, threshold: 3 });
    this.circuitBreakers.set('dm_send', { ...defaultCircuitBreaker, threshold: 10 });
    this.circuitBreakers.set('navigation', { ...defaultCircuitBreaker, threshold: 5 });
    this.circuitBreakers.set('rate_limit', { ...defaultCircuitBreaker, threshold: 2, timeout: 300000 }); // 5 minutes
  }

  // Main error handling method
  async handleError(error, context = {}) {
    try {
      this.logger.error(`Handling error in ${context.operation || 'unknown operation'}`, error);
      
      // Categorize the error
      const category = this.categorizeError(error);
      const errorKey = `${context.operation || 'unknown'}_${category}`;
      
      // Update error count
      this.updateErrorCount(errorKey);
      
      // Check circuit breaker
      const circuitBreakerKey = context.operation || 'default';
      const circuitBreaker = this.circuitBreakers.get(circuitBreakerKey);
      
      if (circuitBreaker && circuitBreaker.state === 'OPEN') {
        const canAttempt = await this.checkCircuitBreaker(circuitBreakerKey);
        if (!canAttempt) {
          throw new Error(`Circuit breaker is OPEN for ${circuitBreakerKey}. Too many recent failures.`);
        }
      }
      
      // Get error category configuration
      const categoryConfig = this.errorCategories[category];
      
      // Check if error is recoverable
      if (!categoryConfig.recoverable) {
        this.logger.error(`Error is not recoverable: ${category}`);
        this.updateCircuitBreaker(circuitBreakerKey, false);
        throw error;
      }
      
      // Check retry count
      const retryCount = context.retryCount || 0;
      if (retryCount >= categoryConfig.maxRetries) {
        this.logger.error(`Max retries (${categoryConfig.maxRetries}) exceeded for ${category}`);
        this.updateCircuitBreaker(circuitBreakerKey, false);
        throw new Error(`Max retries exceeded: ${error.message}`);
      }
      
      // Attempt recovery
      const recoveryResult = await this.attemptRecovery(category, error, context);
      
      if (!recoveryResult.canRetry) {
        this.logger.error('Recovery strategy indicates error cannot be retried');
        this.updateCircuitBreaker(circuitBreakerKey, false);
        
        if (recoveryResult.requiresUserAction) {
          throw new Error(`User action required: ${error.message}`);
        }
        
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = this.calculateRetryDelay(categoryConfig, retryCount, recoveryResult.delay);
      
      this.logger.info(`Retrying in ${delay}ms (attempt ${retryCount + 1}/${categoryConfig.maxRetries})`);
      
      // Update circuit breaker with successful recovery attempt
      this.updateCircuitBreaker(circuitBreakerKey, true);
      
      return {
        shouldRetry: true,
        delay: delay,
        retryCount: retryCount + 1,
        category: category,
        recoveryResult: recoveryResult
      };
      
    } catch (handlingError) {
      this.logger.error('Error in error handling', handlingError);
      throw handlingError;
    }
  }

  // Categorize error based on message and context
  categorizeError(error) {
    const errorMessage = error.message.toLowerCase();
    
    for (const [category, config] of Object.entries(this.errorCategories)) {
      if (config.patterns.some(pattern => errorMessage.includes(pattern))) {
        return category;
      }
    }
    
    return 'UNKNOWN';
  }

  // Attempt recovery using appropriate strategy
  async attemptRecovery(category, error, context) {
    const strategy = this.recoveryStrategies.get(category);
    
    if (strategy) {
      try {
        return await strategy(error, context);
      } catch (strategyError) {
        this.logger.error(`Recovery strategy failed for ${category}`, strategyError);
        return { canRetry: true, delay: 2000 }; // Fallback
      }
    }
    
    // Default recovery
    return { canRetry: true, delay: 1000 };
  }

  // Calculate retry delay with exponential backoff
  calculateRetryDelay(categoryConfig, retryCount, baseDelay = null) {
    const configDelay = baseDelay || categoryConfig.baseDelay;
    const exponentialDelay = configDelay * Math.pow(categoryConfig.backoffMultiplier, retryCount);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  // Update error count for monitoring
  updateErrorCount(errorKey) {
    const current = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, current + 1);
    
    // Log if error count is getting high
    if (current > 5) {
      this.logger.warning(`High error count for ${errorKey}: ${current + 1}`);
    }
  }

  // Update circuit breaker state
  updateCircuitBreaker(key, success) {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return;
    
    if (success) {
      breaker.failureCount = 0;
      if (breaker.state === 'HALF_OPEN') {
        breaker.state = 'CLOSED';
        this.logger.info(`Circuit breaker ${key} closed after successful operation`);
      }
    } else {
      breaker.failureCount++;
      breaker.lastFailureTime = Date.now();
      
      if (breaker.failureCount >= breaker.threshold && breaker.state === 'CLOSED') {
        breaker.state = 'OPEN';
        this.logger.warning(`Circuit breaker ${key} opened after ${breaker.failureCount} failures`);
      }
    }
    
    this.circuitBreakers.set(key, breaker);
  }

  // Check if circuit breaker allows operation
  async checkCircuitBreaker(key) {
    const breaker = this.circuitBreakers.get(key);
    if (!breaker) return true;
    
    switch (breaker.state) {
      case 'CLOSED':
        return true;
        
      case 'OPEN':
        if (Date.now() - breaker.lastFailureTime > breaker.timeout) {
          breaker.state = 'HALF_OPEN';
          breaker.halfOpenCalls = 0;
          this.logger.info(`Circuit breaker ${key} moved to HALF_OPEN state`);
          return true;
        }
        return false;
        
      case 'HALF_OPEN':
        if (breaker.halfOpenCalls < breaker.halfOpenMaxCalls) {
          breaker.halfOpenCalls++;
          return true;
        }
        return false;
        
      default:
        return true;
    }
  }

  // Utility methods for recovery strategies
  async validateSession(context) {
    try {
      // Check if we can access a protected resource
      const response = await fetch('https://www.markt.de/api/user/profile', {
        credentials: 'include'
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  async attemptReauthentication(context) {
    try {
      // This would trigger re-authentication flow
      // In practice, this might send a message to background script
      // to prompt user for re-login
      
      return { success: false, requiresUserAction: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async waitForPageLoad(timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkLoad = () => {
        if (document.readyState === 'complete') {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('Page load timeout'));
        } else {
          setTimeout(checkLoad, 100);
        }
      };
      
      checkLoad();
    });
  }

  async checkPageIssues() {
    const issues = {
      hasModal: false,
      hasOverlay: false,
      hasError: false
    };
    
    // Check for modals
    const modals = document.querySelectorAll('.modal, .popup, [role="dialog"]');
    issues.hasModal = modals.length > 0;
    
    // Check for overlays
    const overlays = document.querySelectorAll('.overlay, .loading, .spinner');
    issues.hasOverlay = Array.from(overlays).some(el => 
      window.getComputedStyle(el).display !== 'none'
    );
    
    // Check for error messages
    const errors = document.querySelectorAll('.error, .alert-error, .message-error');
    issues.hasError = errors.length > 0;
    
    return issues;
  }

  async closeModals() {
    const closeButtons = document.querySelectorAll(
      '.modal .close, .popup .close, [role="dialog"] .close, .modal-close'
    );
    
    for (const button of closeButtons) {
      try {
        if (button.offsetParent !== null) { // Check if visible
          button.click();
          await this.sleep(500);
        }
      } catch (error) {
        this.logger.warning('Failed to close modal', error);
      }
    }
  }

  async waitForOverlayToDisappear(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const overlays = document.querySelectorAll('.overlay, .loading, .spinner');
      const visibleOverlays = Array.from(overlays).filter(el => 
        window.getComputedStyle(el).display !== 'none'
      );
      
      if (visibleOverlays.length === 0) {
        return;
      }
      
      await this.sleep(500);
    }
    
    throw new Error('Overlay did not disappear within timeout');
  }

  // Retry wrapper for operations
  async withRetry(operation, context = {}) {
    let lastError;
    let retryCount = 0;
    
    while (true) {
      try {
        const result = await operation();
        
        // Reset circuit breaker on success
        if (context.operation) {
          this.updateCircuitBreaker(context.operation, true);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        try {
          const errorResult = await this.handleError(error, {
            ...context,
            retryCount
          });
          
          if (!errorResult.shouldRetry) {
            throw error;
          }
          
          // Wait before retry
          await this.sleep(errorResult.delay);
          retryCount = errorResult.retryCount;
          
        } catch (handlingError) {
          // If error handling fails, throw original error
          throw lastError;
        }
      }
    }
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      totalErrors: 0,
      errorsByType: {},
      circuitBreakers: {},
      topErrors: []
    };
    
    // Count errors by type
    for (const [key, count] of this.errorCounts.entries()) {
      stats.totalErrors += count;
      stats.errorsByType[key] = count;
    }
    
    // Get circuit breaker states
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      stats.circuitBreakers[key] = {
        state: breaker.state,
        failureCount: breaker.failureCount,
        lastFailureTime: breaker.lastFailureTime
      };
    }
    
    // Get top errors
    stats.topErrors = Array.from(this.errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ error: key, count }));
    
    return stats;
  }

  // Reset error statistics
  resetStats() {
    this.errorCounts.clear();
    
    // Reset circuit breakers
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      breaker.failureCount = 0;
      breaker.lastFailureTime = null;
      breaker.state = 'CLOSED';
    }
    
    this.logger.info('Error statistics reset');
  }

  // Utility sleep function
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}; // End of class definition

} // End of duplicate prevention check

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = window.ErrorHandler;
}

} // End of duplicate prevention check