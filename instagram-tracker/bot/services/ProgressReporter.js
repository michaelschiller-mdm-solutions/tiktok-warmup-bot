/**
 * Progress Reporter Service for Account Setup Automation
 * Reports real-time progress by writing structured JSON to stdout.
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
            totalSteps: 7,
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
    updateStep(stepNumber, stepName, status = 'in_progress') {
        if (!this.currentSession) return;

        this.currentSession.currentStep = stepNumber;
        this.currentSession.stepName = stepName;
        this.currentSession.status = status;
        this.currentSession.progress = Math.round((stepNumber / this.currentSession.totalSteps) * 100);

        this._report({
            type: 'step_update',
            data: {
                sessionId: this.currentSession.sessionId,
                accountId: this.currentSession.accountId,
                currentStep: this.currentSession.currentStep,
                stepName: this.currentSession.stepName,
                status: this.currentSession.status,
                progress: this.currentSession.progress,
            },
        });
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
    reportAccountStatusChange(username, email, status, reason = null) {
        this._report({
            type: 'account_status_change',
            data: {
                sessionId: this.currentSession?.sessionId,
                accountId: this.currentSession?.accountId,
                username: username,
                email: email,
                status: status, // 'valid', 'invalid', 'pending', etc.
                reason: reason,
                timestamp: new Date().toISOString(),
            },
        });
    }
}

module.exports = ProgressReporter; 