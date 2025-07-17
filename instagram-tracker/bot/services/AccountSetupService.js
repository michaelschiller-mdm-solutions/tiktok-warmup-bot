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
     * Cleanup resources for invalid accounts
     */
    async cleanupInvalidAccount(containerNumber, username) {
        try {
            console.log(`[AccountSetupService] 🧹 Cleaning up resources for invalid account ${username} in container ${containerNumber}`);
            
            // Close Instagram if it's still open
            await this.bridge.executeScript('close_instagram.lua', AutomationConfig.getScriptProfile('quick'));
            
            // Return to home screen
            await this.bridge.executeScript('go_home.lua', AutomationConfig.getScriptProfile('quick'));
            
            console.log(`[AccountSetupService] ✅ Cleanup completed for ${username}`);
        } catch (error) {
            console.warn(`[AccountSetupService] ⚠️ Cleanup failed for ${username}:`, error.message);
        }
    }

    /**
     * Run the data cleaning sequence for setup automation
     * This sequence cleans container data before opening Instagram
     */
    async runDataCleaningSequence(containerNumber) {
        try {
            console.log(`[AccountSetupService] 🧹 Starting data cleaning sequence for container ${containerNumber}`);
            
            // Step 1: Open settings for data deletion
            console.log(`[AccountSetupService] ⚙️ Opening settings for data deletion`);
            const settingsOpened = await this.bridge.executeScript('open_settings_for_data_deletion.lua', 
                AutomationConfig.getScriptProfile('standard'));
            
            if (!settingsOpened) {
                throw new Error('Failed to open settings for data deletion');
            }
            
            // Step 2: Wait for settings to load and scroll to top
            console.log(`[AccountSetupService] 🔝 Waiting for settings to load`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for settings to load
            
            // Step 3: Adjust window placement
            console.log(`[AccountSetupService] 📐 Adjusting window placement`);
            const windowAdjusted = await this.bridge.executeScript('adjust_window_placement.lua', 
                AutomationConfig.getScriptProfile('standard'));
            
            if (!windowAdjusted) {
                throw new Error('Failed to adjust window placement');
            }
            
            // Step 4: Container navigation (WITHOUT open_settings.lua)
            console.log(`[AccountSetupService] 🎯 Navigating to container ${containerNumber} for data deletion`);
            const containerNavigated = await this.navigateToContainerOnly(containerNumber);
            
            if (!containerNavigated) {
                throw new Error(`Failed to navigate to container ${containerNumber} for data deletion`);
            }
            
            // Wait for container to stabilize
            await new Promise(resolve => setTimeout(resolve, AutomationConfig.containerSelection.stabilizationDelay));
            
            // Step 5: Delete container data
            console.log(`[AccountSetupService] 🗑️ Deleting container data`);
            const dataDeleted = await this.bridge.executeScript('delete_container_data.lua', 
                AutomationConfig.getScriptProfile('complex'));
            
            if (!dataDeleted) {
                throw new Error('Failed to delete container data');
            }
            
            // Wait for data deletion to complete
            console.log(`[AccountSetupService] ⏰ Waiting for data deletion to complete...`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds for deletion to complete
            
            // Step 6: Scroll to top after data deletion to reset UI state
            console.log(`[AccountSetupService] 🔝 Scrolling to top after data deletion`);
            const scrolledToTop = await this.bridge.executeScript('scroll_to_top_container.lua', 
                AutomationConfig.getScriptProfile('quick'));
            
            if (!scrolledToTop) {
                console.warn(`[AccountSetupService] ⚠️ Failed to scroll to top after data deletion, continuing anyway`);
            }
            
            console.log(`[AccountSetupService] ✅ Data cleaning sequence completed successfully`);
            return true;
            
        } catch (error) {
            console.error(`[AccountSetupService] ❌ Data cleaning sequence failed:`, error);
            return false;
        }
    }

    /**
     * Navigate to container using only the navigation scripts (without open_settings.lua)
     * This is used during data cleaning when settings are already open
     */
    async navigateToContainerOnly(containerNumber) {
        try {
            console.log(`[AccountSetupService] 🧭 Starting container navigation for container ${containerNumber}`);
            
            // Get the script sequence but skip the first two scripts (open_settings.lua and scroll_to_top_container.lua)
            const fullSequence = this.getContainerScriptSequence(containerNumber);
            
            // Skip 'open_settings.lua' and 'scroll_to_top_container.lua' since we're already in settings
            const navigationSequence = fullSequence.slice(2);
            
            console.log(`[AccountSetupService] 📝 Navigation sequence for container ${containerNumber}:`, navigationSequence);
            console.log(`[AccountSetupService] ▶️ Executing ${navigationSequence.length} navigation scripts...`);
            
            // Execute each script in sequence
            for (const scriptName of navigationSequence) {
                console.log(`[AccountSetupService] 🎯 Executing navigation script: ${scriptName}`);
                const success = await this.bridge.executeScript(scriptName, AutomationConfig.getScriptProfile('standard'));
                
                if (!success) {
                    throw new Error(`Navigation script "${scriptName}" failed during container navigation`);
                }
                
                // Small delay between scripts for stability
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log(`[AccountSetupService] ✅ Successfully navigated to container ${containerNumber}`);
            return true;
            
        } catch (error) {
            console.error(`[AccountSetupService] ❌ Container navigation failed:`, error);
            return false;
        }
    }

    /**
     * Get the script sequence for a container (copied from AutomationBridge.getScriptSequence)
     * This is a pure function with no side-effects.
     */
    getContainerScriptSequence(containerNumber) {
        if (containerNumber <= 0) {
            throw new Error(`Invalid container number: ${containerNumber}. Must be 1 or greater.`);
        }

        const sequence = ['open_settings.lua', 'scroll_to_top_container.lua'];

        if (containerNumber <= 12) {
            // Page 1
            sequence.push(`select_container_page1_${containerNumber}.lua`);
            return sequence;
        }

        // Page 2 or higher - using the same logic as AutomationBridge
        let pageNumber;
        let positionOnPage;

        if (containerNumber >= 13 && containerNumber <= 26) {           // Page 2 (14 items)
            pageNumber = 2;
            positionOnPage = containerNumber - 13 + 1;                  // 13 -> 1, 26 -> 14
        } else if (containerNumber >= 27 && containerNumber <= 40) {    // Page 3
            pageNumber = 3;
            positionOnPage = containerNumber - 27 + 1;
        } else if (containerNumber >= 41 && containerNumber <= 54) {    // Page 4
            pageNumber = 4;
            positionOnPage = containerNumber - 41 + 1;
        } else if (containerNumber >= 55 && containerNumber <= 68) {    // Page 5
            pageNumber = 5;
            positionOnPage = containerNumber - 55 + 1;
        } else if (containerNumber >= 69 && containerNumber <= 82) {    // Page 6
            pageNumber = 6;
            positionOnPage = containerNumber - 69 + 1;
        } else if (containerNumber >= 83 && containerNumber <= 96) {    // Page 7
            pageNumber = 7;
            positionOnPage = containerNumber - 83 + 1;
        } else if (containerNumber >= 97 && containerNumber <= 110) {   // Page 8
            pageNumber = 8;
            positionOnPage = containerNumber - 97 + 1;
        } else if (containerNumber >= 111 && containerNumber <= 124) {  // Page 9
            pageNumber = 9;
            positionOnPage = containerNumber - 111 + 1;
        } else if (containerNumber >= 125 && containerNumber <= 138) {  // Page 10
            pageNumber = 10;
            positionOnPage = containerNumber - 125 + 1;
        } else if (containerNumber >= 139 && containerNumber <= 152) {  // Page 11
            pageNumber = 11;
            positionOnPage = containerNumber - 139 + 1;
        } else if (containerNumber >= 153 && containerNumber <= 166) {  // Page 12
            pageNumber = 12;
            positionOnPage = containerNumber - 153 + 1;
        } else if (containerNumber >= 167 && containerNumber <= 180) {  // Page 13
            pageNumber = 13;
            positionOnPage = containerNumber - 167 + 1;
        } else if (containerNumber >= 181 && containerNumber <= 194) {  // Page 14
            pageNumber = 14;
            positionOnPage = containerNumber - 181 + 1;
        } else if (containerNumber >= 195 && containerNumber <= 208) {  // Page 15
            pageNumber = 15;
            positionOnPage = containerNumber - 195 + 1;
        } else if (containerNumber >= 209 && containerNumber <= 222) {  // Page 16
            pageNumber = 16;
            positionOnPage = containerNumber - 209 + 1;
        } else if (containerNumber >= 223 && containerNumber <= 236) {  // Page 17
            pageNumber = 17;
            positionOnPage = containerNumber - 223 + 1;
        } else if (containerNumber >= 237 && containerNumber <= 250) {  // Page 18
            pageNumber = 18;
            positionOnPage = containerNumber - 237 + 1;
        } else if (containerNumber >= 251 && containerNumber <= 264) {  // Page 19
            pageNumber = 19;
            positionOnPage = containerNumber - 251 + 1;
        } else if (containerNumber >= 265 && containerNumber <= 278) {  // Page 20
            pageNumber = 20;
            positionOnPage = containerNumber - 265 + 1;
        } else {
            // For containers beyond what we've mapped, use a generic approach
            // Each page has 14 items starting from page 2
            pageNumber = Math.floor((containerNumber - 13) / 14) + 2;
            positionOnPage = ((containerNumber - 13) % 14) + 1;
        }

        console.log(`🔎 Mapping: Container ${containerNumber} is on Page ${pageNumber}, Position ${positionOnPage}.`);

        // Navigate to page 2 first
        sequence.push('container_page_2.lua');

        // Navigate to the correct page (if beyond page 2)
        for (let i = 3; i <= pageNumber; i++) {
            sequence.push('next_container_page.lua');
        }

        // Select the specific position on the final page
        sequence.push(`select_container_page_n_position_${positionOnPage}.lua`);

        return sequence;
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
        const { containerNumber, username, password, email, email_password, accountId, verificationConfig } = setupConfig;
        const sessionId = setupConfig.sessionId || `setup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 🆕 NEW: Handle verification configuration
        const config = verificationConfig || {
            requireManualVerification: true,
            skipVerification: false,
            requireScreenshot: true,
            autoCompleteOnSuccess: false
        };

        console.log(`[AccountSetupService] ⚙️ Verification config for ${username}:`, {
            requireManualVerification: config.requireManualVerification,
            skipVerification: config.skipVerification,
            requireScreenshot: config.requireScreenshot,
            autoCompleteOnSuccess: config.autoCompleteOnSuccess
        });

        if (this.progressReporter) {
            console.log(`[AccountSetupService] 📊 Starting progress session for account ${accountId} (${username})`);
            this.progressReporter.startSession(sessionId, username, containerNumber, accountId);
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

            // Step 2: Data Cleaning (ONLY for setup automation)
            this.progressReporter?.updateStep(2, 'Cleaning Container Data');
            console.log(`[AccountSetupService] 🧹 Starting container data cleaning process`);
            
            // Run the data cleaning sequence
            const dataCleaningCompleted = await this.runDataCleaningSequence(containerNumber);
            if (!dataCleaningCompleted) {
                throw new Error('Failed to complete data cleaning process');
            }

            // Step 3: Open Instagram with enhanced execution
            this.progressReporter?.updateStep(3, 'Opening Instagram');
            console.log(`[AccountSetupService] 📱 Opening Instagram app`);
            
            // Safety delay to ensure container selection is fully complete
            console.log(`[AccountSetupService] 🛡️ Safety delay before opening Instagram...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            const instagramOpened = await this.bridge.executeScript('open_instagram.lua', 
                AutomationConfig.getScriptProfile('complex'));
            
            if (!instagramOpened) {
                throw new Error('Failed to open Instagram');
            }

            // Step 4: Navigate past "Create Account" screen
            this.progressReporter?.updateStep(4, 'Pressing "Already have an account"');
            console.log(`[AccountSetupService] 👆 Pressing 'Already have an account' button`);
            
            const alreadyHaveAccountPressed = await this.bridge.executeScript('press_i_already_have_an_account.lua', 
                AutomationConfig.getScriptProfile('standard'));
            
            if (!alreadyHaveAccountPressed) {
                throw new Error('Failed to press "Already have an account"');
            }

            // Step 5: Enter Username with improved clipboard handling
            this.progressReporter?.updateStep(5, 'Entering Username');
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
            
            // Additional safety delay between critical clipboard operations
            console.log(`[AccountSetupService] 🛡️ Safety delay before password operation...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Step 6: Enter Password & Login with enhanced synchronization
            this.progressReporter?.updateStep(6, 'Entering Password & Login');
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

            // Step 7: Enhanced Email Monitoring - Check for both verification tokens AND password reset emails
            this.progressReporter?.updateStep(7, 'Monitoring Email (Verification & Password Reset Detection)');
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
                        this.progressReporter?.updateStep(7, 'Password Reset Email Detected', 'password_reset_detected');
                        
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
                    
                    // Check if this is an email connection failure (likely invalid email password)
                    if (error.message.includes('Invalid credentials') || 
                        error.message.includes('Authentication failed') ||
                        error.message.includes('AUTHENTICATIONFAILED') ||
                        error.message.includes('Login failed') ||
                        error.message.includes('connection failed')) {
                        
                        console.log(`[AccountSetupService] 🚨 Email authentication failed for ${username} - marking as invalid password`);
                        this.progressReporter?.updateStep(7, 'Email Authentication Failed', 'email_auth_failed');
                        
                        // Cleanup resources before throwing error
                        await this.cleanupInvalidAccount(containerNumber, username);
                        
                        // Mark as invalid password due to email connection failure
                        throw new Error(`Email authentication failed for ${username}. Invalid email password provided.`);
                    }
                    
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
                        // After all retries failed, check if it might be email connection issue
                        if (error.message.includes('timeout') || error.message.includes('connection')) {
                            console.log(`[AccountSetupService] 🚨 Email connection timeout for ${username} - marking as invalid password`);
                            this.progressReporter?.updateStep(7, 'Email Connection Failed', 'email_connection_failed');
                            
                            // Cleanup resources before throwing error
                            await this.cleanupInvalidAccount(containerNumber, username);
                            
                            throw new Error(`Email connection failed for ${username}. Likely invalid email password.`);
                        }
                        
                        throw new Error('Failed to fetch verification token after multiple attempts.');
                    }
                }
            }
            
            if (!token) {
                console.log(`[AccountSetupService] ⚠️ No verification token found for ${username} after ${maxTokenRetries} attempts`);
                console.log(`[AccountSetupService] 🔄 Triggering manual verification - automation paused for human intervention`);
                
                // 🆕 ENHANCED: Trigger pending verification with sound notification instead of manual completion
                this.progressReporter?.updateStep(8, 'Manual Verification Required - No Token', 'pending_verification', {
                    reason: 'No verification code received after multiple attempts - automation paused',
                    requiresManualVerification: true,
                    automationStoppedAt: 'email_verification',
                    nextAction: 'Check device screen and manually complete Instagram login process',
                    token: 'No token'
                });
                
                // Report pending verification status to trigger UI notification with sound
                this.progressReporter?.reportAccountStatusChange(
                    username, 
                    email, 
                    'pending_verification', 
                    'No verification token found - manual completion required',
                    'No token'
                );
                
                // Clean up Instagram but leave device ready for manual intervention
                console.log(`[AccountSetupService] 🧹 Preparing device for manual completion`);
                await this.bridge.executeScript('go_home.lua', AutomationConfig.getScriptProfile('quick'));
                
                // Return success with manual verification requirement
                return {
                    success: true,
                    username,
                    requiresManualVerification: true,
                    token: 'No token',
                    reason: 'no_verification_code',
                    message: 'Automation paused - manual verification required due to missing token'
                };
            }

            // Step 8: Final Token Entry & Skip Onboarding + Screenshot Verification
            this.progressReporter?.updateStep(8, 'Completing Setup & Verification');
            console.log(`[AccountSetupService] 🎯 Completing final setup steps`);
            
            // Set token to clipboard before executing the entry script
            console.log(`[AccountSetupService] 📋 Setting token to clipboard: ${token}`);
            const clipboardSetToken = await this.bridge.setClipboardSafe(token, 'token');
            
            if (!clipboardSetToken) {
                console.error(`[AccountSetupService] ❌ Failed to set token to clipboard`);
                throw new Error('Failed to set verification token to clipboard');
            }
            
            console.log(`[AccountSetupService] ✅ Token set to clipboard successfully`);
            
            const finalSetupSuccess = await this.bridge.executeScript('enter_token_and_skip_onboarding.lua', 
                AutomationConfig.getScriptProfile('standard'));
            
            if (!finalSetupSuccess) {
                throw new Error('Failed to complete token entry and onboarding skip');
            }
            
            // Wait for Instagram to process the token and load the main interface
            console.log(`[AccountSetupService] ⏰ Waiting for Instagram to load main interface...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // 🆕 ENHANCED: Handle verification configuration
            if (config.requireManualVerification && config.requireScreenshot) {
                // Take screenshot for manual verification
                console.log(`[AccountSetupService] 📸 Taking screenshot for manual verification`);
                this.progressReporter?.updateStep(8, 'Taking Screenshot for Verification');
                
                let screenshotResult = null;
                try {
                    screenshotResult = await this.captureVerificationScreenshot(username, containerNumber);
                    if (screenshotResult.success) {
                        console.log(`[AccountSetupService] ✅ Screenshot saved: ${screenshotResult.filename}`);
                        
                        // Store screenshot info for frontend verification
                        this.progressReporter?.updateStep(8, 'Setup Complete - Manual Verification Required', 'verification_required', {
                            screenshotPath: screenshotResult.filename,
                            screenshotTimestamp: new Date().toISOString(),
                            requiresManualVerification: true
                        });
                    } else {
                        console.warn(`[AccountSetupService] ⚠️ Screenshot capture failed: ${screenshotResult.error}`);
                        // Continue anyway - screenshot is for verification, not critical for setup
                    }
                } catch (error) {
                    console.warn(`[AccountSetupService] ⚠️ Screenshot capture error:`, error.message);
                    // Continue anyway - don't fail the entire setup for screenshot issues
                }
                
                // Clean up Instagram (close it to return to clean state)
                console.log(`[AccountSetupService] 🧹 Cleaning up Instagram app`);
                await this.bridge.executeScript('close_instagram.lua', AutomationConfig.getScriptProfile('quick'));
                await this.bridge.executeScript('go_home.lua', AutomationConfig.getScriptProfile('quick'));
                
                this.progressReporter?.log(`Account ${username} setup completed successfully! Manual verification required.`);
                
                return {
                    success: true,
                    username,
                    token,
                    screenshotCaptured: !!screenshotResult?.success,
                    requiresManualVerification: true
                };
                
            } else {
                // Skip verification - mark as completed immediately
                console.log(`[AccountSetupService] ✅ Skipping manual verification - marking account as completed`);
                this.progressReporter?.updateStep(8, 'Setup Complete - No Verification Required');
                
                // Clean up Instagram (close it to return to clean state)
                console.log(`[AccountSetupService] 🧹 Cleaning up Instagram app`);
                await this.bridge.executeScript('close_instagram.lua', AutomationConfig.getScriptProfile('quick'));
                await this.bridge.executeScript('go_home.lua', AutomationConfig.getScriptProfile('quick'));
                
                this.progressReporter?.log(`Account ${username} setup completed successfully! No verification required.`);
                
                // Mark account as ready for bot assignment
                this.progressReporter?.completeSession(true, {
                    type: 'setup_completed_no_verification',
                    message: `Account setup completed successfully without manual verification.`,
                    username: username,
                    email: email,
                    requiresManualVerification: false
                });
                
                return {
                    success: true,
                    username,
                    token,
                    screenshotCaptured: false,
                    requiresManualVerification: false,
                    message: 'Account setup completed successfully - ready for bot assignment'
                };
            }

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

    /**
     * Capture verification screenshot after account setup
     * @param {string} username - Account username
     * @param {number} containerNumber - Container number
     * @returns {Promise<Object>} Screenshot result with filename or error
     */
    async captureVerificationScreenshot(username, containerNumber) {
        try {
            console.log(`[AccountSetupService] 📸 Capturing verification screenshot for ${username}`);
            
            // Generate unique filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `verification_${username}_${timestamp}_container${containerNumber}.jpeg`;
            
            // Take screenshot using device snapshot API
            const screenshotResult = await this.bridge.captureScreenshot(filename);
            
            if (screenshotResult.success) {
                return {
                    success: true,
                    filename: screenshotResult.filename,
                    fullPath: screenshotResult.fullPath,
                    timestamp: new Date().toISOString()
                };
            } else {
                return {
                    success: false,
                    error: screenshotResult.error || 'Failed to capture screenshot'
                };
            }
        } catch (error) {
            console.error(`[AccountSetupService] ❌ Screenshot capture error:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Export both the service and the custom error
module.exports = AccountSetupService;
module.exports.PasswordResetDetectedError = PasswordResetDetectedError; 