/**
 * Progress Reporter Service for Account Setup Automation
 * Reports real-time progress by writing structured JSON to stdout.
 * 
 * Enhanced Features:
 * - Sound notification support for verification required events
 * - Improved "no token" detection with manual verification flow
 * - Enhanced status reporting with token information
 */
class ProgressReporter {
    constructor() {
        this.currentSession = null;
    }

    /**
     * Logs a structured message to the console for the parent process to capture.
     * @param {object} message The message object to broadcast.
     */
    _report(message) {
        // Debug logging to track message sending
        console.error(`[ProgressReporter] Sending ${message.type} for account ${this.currentSession?.accountId}:`, message.data?.stepName || message.data?.status);
        
        // We use console.log as a way to send messages to the parent's stdout
        console.log(JSON.stringify(message));
    }

    /**
     * Start a new automation session.
     */
    startSession(sessionId, username, containerNumber, accountId) {
        this.currentSession = {
            sessionId,
            username,
            containerNumber,
            accountId,
            status: 'in_progress',
            currentStep: 0,
            totalSteps: 8, // Updated from 7 to 8 to include data cleaning step
            stepName: 'Starting...',
            startTime: new Date().toISOString(),
            progress: 0,
        };

        this._report({
            type: 'session_started',
            data: this.currentSession,
        });
    }

    /**
     * Update the current step progress.
     */
    updateStep(stepNumber, stepName, status = 'in_progress', additionalData = null) {
        if (!this.currentSession) {
            console.warn('[ProgressReporter] ⚠️ No active session to update');
            return;
        }

        this.currentSession.currentStep = stepNumber;
        this.currentSession.stepName = stepName;
        this.currentSession.progress = Math.round((stepNumber / this.currentSession.totalSteps) * 100);
        this.currentSession.status = status;

        const updateData = {
            type: 'step_update',
            data: {
                ...this.currentSession,
                additionalData
            }
        };

        // Handle special verification_required status with screenshot data
        if (status === 'verification_required' && additionalData && additionalData.screenshotPath) {
            console.log(`[ProgressReporter] 📸 Handling screenshot verification data for ${this.currentSession.username}`);
            
            // Store screenshot verification data
            this.storeScreenshotVerificationData(additionalData).catch(error => {
                console.error(`[ProgressReporter] ❌ Failed to store verification data:`, error);
            });
        }
        
        // Handle manual completion required status  
        if (status === 'manual_completion_required' && additionalData) {
            console.log(`[ProgressReporter] 🔄 Handling manual completion requirement for ${this.currentSession.username}`);
            
            // Store manual completion requirement
            this.storeManualCompletionData(additionalData).catch(error => {
                console.error(`[ProgressReporter] ❌ Failed to store manual completion data:`, error);
            });
        }

        this._report(updateData);
    }

    /**
     * Store screenshot verification data in the database
     */
    async storeScreenshotVerificationData(verificationData) {
        try {
            const axios = require('axios');
            
            if (!this.currentSession || !this.currentSession.accountId) {
                console.warn('[ProgressReporter] No account ID available for verification data storage');
                return;
            }

            const payload = {
                verification_screenshot_path: verificationData.screenshotPath,
                verification_screenshot_timestamp: verificationData.screenshotTimestamp,
                verification_required: true,
                verification_status: 'pending_verification'
            };

            // Make API call to update account verification data
            const response = await axios.put(`http://localhost:3001/api/accounts/verification/${this.currentSession.accountId}`, payload);
            
            if (response.data.success) {
                console.log(`[ProgressReporter] ✅ Screenshot verification data stored for account ${this.currentSession.accountId}`);
            } else {
                console.error(`[ProgressReporter] ❌ Failed to store verification data:`, response.data.error);
            }

        } catch (error) {
            console.error(`[ProgressReporter] ❌ Error storing verification data:`, error.message);
            // Don't throw - this shouldn't fail the automation
        }
    }

    /**
     * Store manual completion requirement in the database
     */
    async storeManualCompletionData(completionData) {
        try {
            const axios = require('axios');
            
            if (!this.currentSession || !this.currentSession.accountId) {
                console.warn('[ProgressReporter] No account ID available for manual completion data storage');
                return;
            }

            const payload = {
                verification_required: true,
                verification_status: 'manual_completion_required',
                verification_notes: completionData.reason || 'Automation incomplete - manual completion required'
            };

            // Make API call to update account verification data
            const response = await axios.put(`http://localhost:3001/api/accounts/verification/${this.currentSession.accountId}`, payload);
            
            if (response.data.success) {
                console.log(`[ProgressReporter] ✅ Manual completion requirement stored for account ${this.currentSession.accountId}`);
            } else {
                console.error(`[ProgressReporter] ❌ Failed to store manual completion data:`, response.data.error);
            }

        } catch (error) {
            console.error(`[ProgressReporter] ❌ Error storing manual completion data:`, error.message);
            // Don't throw - this shouldn't fail the automation
        }
    }

    /**
     * Report password reset detection (special status update)
     */
    reportPasswordResetDetected(username, email) {
        if (!this.currentSession) return;

        this._report({
            type: 'password_reset_detected',
            data: {
                sessionId: this.currentSession.sessionId,
                accountId: this.currentSession.accountId,
                username: username,
                email: email,
                timestamp: new Date().toISOString(),
                accountInvalid: true,
                message: `Password reset email detected for ${username}. Account marked as invalid.`
            },
        });

        // Actually mark the account as invalid in the database
        if (this.currentSession?.accountId) {
            this._markAccountAsInvalid(this.currentSession.accountId, `Password reset email detected for ${username} (${email}). Incorrect password was provided.`);
        }
    }

    /**
     * Complete the current session with enhanced error handling.
     */
    completeSession(success = true, error = null) {
        if (!this.currentSession) return;

        this.currentSession.status = success ? 'completed' : 'failed';
        this.currentSession.progress = 100;
        this.currentSession.endTime = new Date().toISOString();
        this.currentSession.error = error;

        // Handle special error types
        let reportData = {
            sessionId: this.currentSession.sessionId,
            accountId: this.currentSession.accountId,
            status: this.currentSession.status,
            endTime: this.currentSession.endTime,
            error: error,
        };

        // If error is an object with additional metadata (like password reset)
        if (error && typeof error === 'object' && error.type) {
            reportData = {
                ...reportData,
                errorType: error.type,
                errorMetadata: {
                    username: error.username,
                    email: error.email,
                    accountInvalid: error.accountInvalid || false
                }
            };

            // Special handling for password reset errors
            if (error.type === 'password_reset_detected') {
                this.reportPasswordResetDetected(error.username, error.email);
            }
        }

        this._report({
            type: 'session_completed',
            data: reportData,
        });

        // Clear the session for the next account in the batch
        this.currentSession = null;
    }

    /**
     * Send a custom log message.
     */
    log(message) {
        this._report({
            type: 'log',
            data: {
                sessionId: this.currentSession?.sessionId,
                accountId: this.currentSession?.accountId,
                message,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Report account status change (for external systems)
     */
    reportAccountStatusChange(username, email, status, reason = null, token = null) {
        this._report({
            type: 'account_status_change',
            data: {
                sessionId: this.currentSession?.sessionId,
                accountId: this.currentSession?.accountId,
                username: username,
                email: email,
                status: status, // 'valid', 'invalid', 'pending_verification', etc.
                reason: reason,
                token: token,
                timestamp: new Date().toISOString(),
            },
        });

        // Actually mark account as invalid in database if status is 'invalid'
        if (status === 'invalid' && this.currentSession?.accountId) {
            this._markAccountAsInvalid(this.currentSession.accountId, reason || 'Account marked as invalid during automation');
        }
    }

    /**
     * Mark account as invalid in the database via backend API
     * @param {number} accountId - The account ID to invalidate
     * @param {string} reason - Reason for invalidation
     */
    async _markAccountAsInvalid(accountId, reason) {
        try {
            // Dynamic import for fetch (node-fetch 3.x is ES module)
            const { default: fetch } = await import('node-fetch');
            
            console.error(`[ProgressReporter] 🚨 Marking account ${accountId} as invalid: ${reason}`);
            
            const response = await fetch(`http://localhost:3001/api/accounts/lifecycle/${accountId}/invalidate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: reason
                })
            });

            if (response.ok) {
                console.error(`[ProgressReporter] ✅ Account ${accountId} marked as invalid successfully`);
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error(`[ProgressReporter] ❌ Failed to mark account ${accountId} as invalid:`, errorData);
            }

        } catch (error) {
            console.error(`[ProgressReporter] ❌ Error marking account ${accountId} as invalid:`, error.message);
        }
    }
}

module.exports = ProgressReporter; 