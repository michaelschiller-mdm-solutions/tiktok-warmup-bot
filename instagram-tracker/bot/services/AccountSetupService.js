const AutomationConfig = require('./AutomationConfig');

/**
 * Custom error class for Instagram password reset scenarios
 */
class PasswordResetDetectedError extends Error {
    constructor(username, email) {
        super(`Password reset email detected for account ${username}. Incorrect password was provided.`);
        this.name = 'PasswordResetDetectedError';
        this.username = username;
        this.email = email;
        this.accountInvalid = true;
    }
}

class AccountSetupService {
    /**
     * @param {import('./AutomationBridge')} bridge - An instance of AutomationBridge.
     * @param {import('./EmailTokenFetcher')} emailFetcher - An instance of EmailTokenFetcher.
     * @param {import('./ProgressReporter')} progressReporter - Optional progress reporter for real-time updates.
     */
    constructor(bridge, emailFetcher, progressReporter = null) {
        if (!bridge || !emailFetcher) {
            throw new Error('AccountSetupService requires AutomationBridge and EmailTokenFetcher instances.');
        }
        this.bridge = bridge;
        this.emailFetcher = emailFetcher;
        this.progressReporter = progressReporter;
    }

    /**
     * Cleanup resources when an account is marked as invalid
     * @param {number} containerNumber - The container number to free up
     * @param {string} username - The username for logging
     */
    async cleanupInvalidAccount(containerNumber, username) {
        try {
            console.log(`[AccountSetupService] 🧹 Cleaning up resources for invalid account ${username}`);
            
            // Stop any running scripts
            await this.bridge.stopScript();
            
            // Additional cleanup logic can be added here:
            // - Free up proxy assignment
            // - Mark container as available
            // - Clean up any temporary files
            // - Reset container state if needed
            
            console.log(`[AccountSetupService] ✅ Cleanup completed for container ${containerNumber}`);
        } catch (error) {
            console.warn(`[AccountSetupService] ⚠️ Error during cleanup for ${username}:`, error.message);
        }
    }

    /**
     * Runs the full account setup workflow with enhanced reliability and password reset detection.
     * @param {object} setupConfig - The configuration for the setup process.
     * @param {number} setupConfig.containerNumber - The container to use.
     * @param {string} setupConfig.username - The Instagram account username.
     * @param {string} setupConfig.password - The Instagram account password.
     * @param {string} setupConfig.email - The verification email address.
     * @param {string} setupConfig.email_password - The password for the verification email.
     * @returns {Promise<boolean>} True if successful.
     * @throws {PasswordResetDetectedError} If password reset email is detected.
     */
    async run(setupConfig) {
        const { containerNumber, username, password, email, email_password } = setupConfig;
        const sessionId = `setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        if (this.progressReporter) {
            this.progressReporter.startSession(sessionId, username, containerNumber);
        }

        try {
            // Step 1: Select Container with enhanced options
            this.progressReporter?.updateStep(1, 'Selecting Container');
            console.log(`[AccountSetupService] 🎯 Starting container selection for container ${containerNumber}`);
            
            const containerSelected = await this.bridge.selectContainer(containerNumber);
            if (!containerSelected) {
                throw new Error(`Failed to select container ${containerNumber}.`);
            }
            
            // Wait for container to stabilize
            await new Promise(resolve => setTimeout(resolve, AutomationConfig.containerSelection.stabilizationDelay));

            // Step 2: Open Instagram with enhanced execution
            this.progressReporter?.updateStep(2, 'Opening Instagram');
            console.log(`[AccountSetupService] 📱 Opening Instagram app`);
            
            const instagramOpened = await this.bridge.executeScript('open_instagram.lua', 
                AutomationConfig.getScriptProfile('complex'));
            
            if (!instagramOpened) {
                throw new Error('Failed to open Instagram');
            }

            // Step 3: Navigate past "Create Account" screen
            this.progressReporter?.updateStep(3, 'Pressing "Already have an account"');
            console.log(`[AccountSetupService] 👆 Pressing 'Already have an account' button`);
            
            const alreadyHaveAccountPressed = await this.bridge.executeScript('press_i_already_have_an_account.lua', 
                AutomationConfig.getScriptProfile('standard'));
            
            if (!alreadyHaveAccountPressed) {
                throw new Error('Failed to press "Already have an account"');
            }

            // Step 4: Enter Username with improved clipboard handling
            this.progressReporter?.updateStep(4, 'Entering Username');
            console.log(`[AccountSetupService] 📝 Setting username to clipboard: ${username}`);
            
            const clipboardSetUser = await this.bridge.setClipboardSafe(username, 'username');
            if (!clipboardSetUser) {
                throw new Error('Failed to set username to clipboard');
            }
            
            console.log(`[AccountSetupService] 📋 Pasting username into field`);
            const usernamePasted = await this.bridge.executeScript('paste_clipboard_into_username_field.lua', 
                AutomationConfig.getScriptProfile('clipboard'));
            
            if (!usernamePasted) {
                throw new Error('Failed to paste username');
            }
            
            // Critical: Wait for username paste to complete and UI to stabilize
            // This prevents the password from being pasted into the username field
            console.log(`[AccountSetupService] ⏰ Waiting for username paste to complete...`);
            await new Promise(resolve => setTimeout(resolve, AutomationConfig.clipboard.usernameStabilizationDelay));
            
            // Step 5: Enter Password & Login with enhanced synchronization
            this.progressReporter?.updateStep(5, 'Entering Password & Login');
            console.log(`[AccountSetupService] 🔑 Setting password to clipboard`);
            
            const clipboardSetPass = await this.bridge.setClipboardSafe(password, 'password');
            if (!clipboardSetPass) {
                throw new Error('Failed to set password to clipboard');
            }
            
            console.log(`[AccountSetupService] 🔐 Entering password and logging in`);
            const loginExecuted = await this.bridge.executeScript('instagram_enter_password_and_login.lua', 
                AutomationConfig.getScriptProfile('standard'));
            
            if (!loginExecuted) {
                throw new Error('Failed to enter password and login');
            }
            
            // Wait for login to be processed
            console.log(`[AccountSetupService] ⏰ Waiting for login to be processed...`);
            await new Promise(resolve => setTimeout(resolve, AutomationConfig.instagram.loginProcessDelay));

            // Step 6: Enhanced Email Monitoring - Check for both verification tokens AND password reset emails
            this.progressReporter?.updateStep(6, 'Monitoring Email (Verification & Password Reset Detection)');
            console.log(`[AccountSetupService] 📧 Starting enhanced email monitoring process`);
            
            let token = null;
            const maxTokenRetries = AutomationConfig.emailVerification.maxTokenRetries;
            
            for (let attempt = 1; attempt <= maxTokenRetries; attempt++) {
                try {
                    console.log(`[AccountSetupService] 🔍 Email monitoring attempt ${attempt}/${maxTokenRetries}`);
                    
                    // Use the enhanced email fetching with password reset detection
                    const emailResult = await this.emailFetcher.fetchLatestTokenWithResetDetection(email, email_password, username);
                    
                    // Check if password reset email was detected
                    if (emailResult.passwordResetDetected) {
                        console.log(`[AccountSetupService] 🚨 Password reset email detected for ${username}`);
                        this.progressReporter?.updateStep(6, 'Password Reset Email Detected', 'password_reset_detected');
                        
                        // Cleanup resources before throwing error
                        await this.cleanupInvalidAccount(containerNumber, username);
                        
                        // Signal frontend about the invalid password
                        this.progressReporter?.log(`Account ${username} marked as invalid due to password reset email`);
                        
                        throw new PasswordResetDetectedError(username, email);
                    }
                    
                    // Check if verification token was found
                    if (emailResult.token) {
                        token = emailResult.token;
                        console.log(`[AccountSetupService] ✅ Token retrieved: ${token}`);
                        break;
                    }
                    
                } catch (error) {
                    // If it's a password reset error, re-throw it immediately
                    if (error instanceof PasswordResetDetectedError) {
                        throw error;
                    }
                    
                    console.warn(`[AccountSetupService] ⚠️ Email monitoring attempt ${attempt} failed:`, error.message);
                    
                    if (attempt < maxTokenRetries) {
                        console.log('[AccountSetupService] 🔄 Requesting new verification code...');
                        this.progressReporter?.log('Token not found, requesting new code...');
                        
                        // Request new verification code
                        const newCodeRequested = await this.bridge.executeScript('optional_send_new_link.lua', 
                            AutomationConfig.getScriptProfile('quick'));
                        
                        if (!newCodeRequested) {
                            console.warn('[AccountSetupService] ⚠️ Failed to request new verification code');
                        }
                        
                        // Wait longer before retry
                        const waitTime = AutomationConfig.getEmailRetryDelay(attempt);
                        console.log(`[AccountSetupService] ⏰ Waiting ${waitTime}ms before next email monitoring attempt...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        
                    } else {
                        throw new Error('Failed to fetch verification token after multiple attempts.');
                    }
                }
            }
            
            if (!token) {
                console.log(`[AccountSetupService] ⚠️ No verification token found for ${username} after ${maxTokenRetries} attempts`);
                console.log(`[AccountSetupService] 📧 Account ${username} will remain in manual setup phase for token entry`);
                
                // Signal that no token was found (not an error, but a skip condition)
                this.progressReporter?.completeSession(false, {
                    type: 'no_token_found',
                    message: `No verification token found after ${maxTokenRetries} attempts. Account remains in manual setup phase.`,
                    username: username,
                    email: email,
                    skipAccount: true
                });
                
                throw new Error('Could not retrieve verification token - account remains in manual setup phase');
            }

            // Step 7: Enter Token and Skip Onboarding
            this.progressReporter?.updateStep(7, 'Entering Token & Skipping Onboarding');
            console.log(`[AccountSetupService] 🎯 Setting verification token to clipboard`);
            
            const tokenSet = await this.bridge.setClipboardSafe(token, 'token');
            if (!tokenSet) {
                throw new Error('Failed to set token to clipboard');
            }
            
            console.log(`[AccountSetupService] 🏁 Entering token and skipping onboarding`);
            const onboardingSkipped = await this.bridge.executeScript('paste_verification_and_continue.lua', 
                AutomationConfig.getScriptProfile('complex'));
            
            if (!onboardingSkipped) {
                throw new Error('Failed to enter token and skip onboarding');
            }
            
            console.log(`[AccountSetupService] ✅ Successfully set up account ${username}.`);
            this.progressReporter?.completeSession(true);
            return true;

        } catch (error) {
            console.error(`[AccountSetupService] ❌ Failed to set up account ${username}:`, error);
            
            // Handle password reset detection specially
            if (error instanceof PasswordResetDetectedError) {
                this.progressReporter?.completeSession(false, {
                    type: 'password_reset_detected',
                    message: error.message,
                    username: error.username,
                    email: error.email,
                    accountInvalid: true
                });
            } else {
                this.progressReporter?.completeSession(false, error.message);
            }
            
            // Enhanced cleanup for all error scenarios
            try {
                await this.bridge.stopScript();
                await new Promise(resolve => setTimeout(resolve, AutomationConfig.errorHandling.cleanupDelay));
            } catch (cleanupError) {
                console.warn(`[AccountSetupService] ⚠️ Cleanup failed:`, cleanupError.message);
            }
            
            throw error;
        }
    }
}

// Export both the service and the custom error
module.exports = AccountSetupService;
module.exports.PasswordResetDetectedError = PasswordResetDetectedError; 