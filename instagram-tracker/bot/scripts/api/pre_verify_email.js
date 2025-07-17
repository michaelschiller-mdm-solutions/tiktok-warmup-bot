/**
 * Pre-Automation Email Verification Script
 * 
 * This script checks if an Instagram verification email with code already exists
 * in the account's email inbox. This is run BEFORE any automation scripts to:
 * 
 * 1. If verification code found → Mark account as ready for warmup immediately
 * 2. If email connection fails → Mark account as invalid
 * 3. If no code found → Leave account unchanged for normal automation
 * 
 * USAGE:
 * node scripts/api/pre_verify_email.js '{"id": 123, "email": "test@gmail.com", "email_password": "pass123"}'
 * 
 * OUTPUT (JSON to stdout):
 * {
 *   "accountId": 123,
 *   "success": true,
 *   "action": "mark_ready|mark_invalid|none",
 *   "token": "123456", // if found
 *   "message": "Description of what happened"
 * }
 */

const EmailTokenFetcher = require('../../services/EmailTokenFetcher');

async function preVerifyEmail() {
    const args = process.argv.slice(2);

    if (args.length < 1) {
        console.error('❌ Usage: node scripts/api/pre_verify_email.js \'{"id": 123, "email": "test@email.com", "email_password": "password"}\'');
        process.exit(1);
    }

    let accountData;
    try {
        accountData = JSON.parse(args[0]);
    } catch (error) {
        console.error('❌ Invalid JSON provided');
        process.exit(1);
    }

    const { id, email, email_password } = accountData;

    if (!id || !email || !email_password) {
        console.error('❌ Missing required fields: id, email, email_password');
        process.exit(1);
    }

    console.error(`[PreVerifyEmail] 🔍 Starting pre-verification for account ${id} (${email})`);

    const result = {
        accountId: id,
        success: false,
        action: 'none',
        message: ''
    };

    try {
        const emailFetcher = new EmailTokenFetcher();
        
        // Check for existing verification token
        const verificationResult = await emailFetcher.checkForExistingVerificationToken(email, email_password);

        if (!verificationResult.success) {
            // Email connection failed - mark account as invalid
            console.error(`[PreVerifyEmail] ❌ Email connection failed for ${email}: ${verificationResult.error}`);
            
            // Update account status to invalid
            const updateResult = await updateAccountStatus(id, 'mark_invalid', `Email connection failed: ${verificationResult.error}`);
            
            result.success = true;
            result.action = 'mark_invalid';
            result.message = `Email connection failed: ${verificationResult.error}`;
            
            if (!updateResult.success) {
                result.message += ` (Warning: Failed to update account status in database)`;
            }
            
        } else if (verificationResult.token) {
            // Verification code found - mark account as ready for warmup
            console.error(`[PreVerifyEmail] ✅ Found verification token for ${email}: ${verificationResult.token}`);
            
            // Update account status to ready for warmup
            const updateResult = await updateAccountStatus(id, 'mark_ready', `Pre-verification found existing token: ${verificationResult.token}`);
            
            result.success = true;
            result.action = 'mark_ready';
            result.token = verificationResult.token;
            result.message = `Verification token found: ${verificationResult.token}`;
            
            if (!updateResult.success) {
                result.message += ` (Warning: Failed to update account status in database)`;
            }
            
        } else {
            // No verification code found - proceed with normal automation
            console.error(`[PreVerifyEmail] 📭 No existing verification token found for ${email}`);
            
            result.success = true;
            result.action = 'none';
            result.message = 'No existing verification token found - account unchanged';
        }

    } catch (error) {
        console.error(`[PreVerifyEmail] ❌ Error during pre-verification for ${email}:`, error.message);
        
        result.success = false;
        result.action = 'none';
        result.message = `Pre-verification error: ${error.message}`;
    }

    // Output result as JSON to stdout for parent process
    process.stdout.write(JSON.stringify(result));
    process.exit(result.success ? 0 : 1);
}

/**
 * Update account status in the database via backend API
 * @param {number} accountId - The account ID to update
 * @param {string} action - Either 'mark_ready' or 'mark_invalid'
 * @param {string} reason - Reason for the status change
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updateAccountStatus(accountId, action, reason) {
    try {
        // Dynamic import for fetch (node-fetch 3.x is ES module)
        const { default: fetch } = await import('node-fetch');
        
        let endpoint, body;
        
        if (action === 'mark_ready') {
            // Two-step transition: imported -> ready -> ready_for_bot_assignment
            // Step 1: Transition to ready state first
            const readyEndpoint = `http://localhost:3001/api/accounts/lifecycle/${accountId}/transition`;
            const readyBody = {
                to_state: 'ready',
                reason: reason,
                notes: 'Pre-verification found verification token',
                force: true  // Bypass validation requirements
            };
            
            const readyResponse = await fetch(readyEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(readyBody)
            });
            
            if (!readyResponse.ok) {
                const readyError = await readyResponse.json().catch(() => ({ error: 'Unknown error' }));
                console.error(`[PreVerifyEmail] ❌ Failed to transition to ready state:`, readyError);
                return { success: false, error: `Failed to transition to ready: ${readyError.error}` };
            }
            
            console.error(`[PreVerifyEmail] ✅ Account ${accountId} transitioned to ready state`);
            
            // Step 2: Transition to ready_for_bot_assignment
            endpoint = `http://localhost:3001/api/accounts/lifecycle/${accountId}/transition`;
            body = {
                to_state: 'ready_for_bot_assignment',
                reason: 'Account has verification code and is ready for content assignment',
                notes: 'Transitioned from pre-verification with existing token',
                force: true  // Bypass validation requirements
            };
        } else if (action === 'mark_invalid') {
            endpoint = `http://localhost:3001/api/accounts/lifecycle/${accountId}/invalidate`;
            body = {
                reason: reason
            };
        } else {
            return { success: false, error: 'Invalid action specified' };
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.ok) {
            console.error(`[PreVerifyEmail] ✅ Account ${accountId} status updated successfully (${action})`);
            return { success: true };
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`[PreVerifyEmail] ❌ Failed to update account ${accountId} status:`, errorData);
            return { success: false, error: errorData.error || 'API error' };
        }

    } catch (error) {
        console.error(`[PreVerifyEmail] ❌ Error updating account ${accountId} status:`, error.message);
        return { success: false, error: error.message };
    }
}

// Run the pre-verification
preVerifyEmail(); 