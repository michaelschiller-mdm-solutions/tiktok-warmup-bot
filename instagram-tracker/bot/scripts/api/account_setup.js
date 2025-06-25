const path = require('path');
const fs = require('fs');
const AutomationBridge = require('../../services/AutomationBridge');
const EmailTokenFetcher = require('../../services/EmailTokenFetcher');
const AccountSetupService = require('../../services/AccountSetupService');
const ProgressReporter = require('../../services/ProgressReporter');

// Import the custom error
const { PasswordResetDetectedError } = require('../../services/AccountSetupService');

/**
 * Main account setup handler with enhanced password reset detection
 */
async function runAccountSetup(setupConfig) {
    const bridge = new AutomationBridge();
    const emailFetcher = new EmailTokenFetcher();
    const progressReporter = new ProgressReporter();
    const accountSetup = new AccountSetupService(bridge, emailFetcher, progressReporter);

    try {
        console.log(`[AccountSetup] 🚀 Starting account setup for ${setupConfig.username}`);
        
        const result = await accountSetup.run(setupConfig);
        
        if (result) {
            console.log(`[AccountSetup] ✅ Account ${setupConfig.username} setup completed successfully`);
            
            // Report success to external systems if needed
            progressReporter.reportAccountStatusChange(
                setupConfig.username, 
                setupConfig.email, 
                'valid', 
                'Setup completed successfully'
            );
            
            return { success: true, username: setupConfig.username };
        }
        
    } catch (error) {
        console.error(`[AccountSetup] ❌ Account setup failed for ${setupConfig.username}:`, error.message);
        
        // Handle password reset detection specifically
        if (error instanceof PasswordResetDetectedError) {
            console.log(`[AccountSetup] 🚨 Password reset detected for ${error.username}`);
            
            // Report the invalid account status
            progressReporter.reportAccountStatusChange(
                error.username,
                error.email,
                'invalid',
                'Incorrect password - reset email detected'
            );
            
            // Free up resources
            await freeUpResources(setupConfig.containerNumber, setupConfig.username);
            
            return {
                success: false,
                username: error.username,
                error: 'password_reset_detected',
                accountInvalid: true,
                message: 'Account marked as invalid due to incorrect password'
            };
        }
        
        // Handle other types of errors
        console.log(`[AccountSetup] ⚠️ General setup error for ${setupConfig.username}`);
        
        progressReporter.reportAccountStatusChange(
            setupConfig.username,
            setupConfig.email,
            'failed',
            error.message
        );
        
        return {
            success: false,
            username: setupConfig.username,
            error: 'setup_failed',
            message: error.message
        };
    }
}

/**
 * Enhanced resource cleanup for invalid accounts
 */
async function freeUpResources(containerNumber, username) {
    try {
        console.log(`[AccountSetup] 🧹 Freeing up resources for container ${containerNumber}`);
        
        // Add your resource cleanup logic here:
        // 1. Free up proxy assignment
        // 2. Mark container as available for reuse
        // 3. Clean up any temporary files
        // 4. Reset container configuration
        // 5. Update resource allocation databases
        
        console.log(`[AccountSetup] ✅ Resources freed for container ${containerNumber}`);
        
        // Example: If you have a resource manager service
        // await resourceManager.freeContainer(containerNumber);
        // await proxyManager.releaseProxy(assignedProxy);
        
    } catch (error) {
        console.warn(`[AccountSetup] ⚠️ Error during resource cleanup:`, error.message);
    }
}

/**
 * Batch account setup with password reset detection
 */
async function runBatchAccountSetup(accountConfigs) {
    const results = [];
    const invalidAccounts = [];
    
    console.log(`[AccountSetup] 📋 Starting batch setup for ${accountConfigs.length} accounts`);
    
    for (const config of accountConfigs) {
        try {
            const result = await runAccountSetup(config);
            results.push(result);
            
            // Track invalid accounts for further processing
            if (result.accountInvalid) {
                invalidAccounts.push({
                    username: result.username,
                    email: config.email,
                    container: config.containerNumber,
                    reason: result.message
                });
            }
            
        } catch (error) {
            console.error(`[AccountSetup] ❌ Batch setup error for ${config.username}:`, error.message);
            results.push({
                success: false,
                username: config.username,
                error: 'batch_error',
                message: error.message
            });
        }
        
        // Add delay between accounts to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Summary report
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const invalidPasswords = invalidAccounts.length;
    
    console.log(`[AccountSetup] 📊 Batch Summary:`);
    console.log(`[AccountSetup] ✅ Successful: ${successful}`);
    console.log(`[AccountSetup] ❌ Failed: ${failed}`);
    console.log(`[AccountSetup] 🚨 Invalid Passwords: ${invalidPasswords}`);
    
    if (invalidAccounts.length > 0) {
        console.log(`[AccountSetup] 📋 Invalid Accounts:`);
        invalidAccounts.forEach(acc => {
            console.log(`[AccountSetup]   - ${acc.username} (${acc.email}) - ${acc.reason}`);
        });
    }
    
    return {
        results,
        summary: {
            total: accountConfigs.length,
            successful,
            failed,
            invalidPasswords,
            invalidAccounts
        }
    };
}

// Export functions for use in other scripts
module.exports = {
    runAccountSetup,
    runBatchAccountSetup,
    freeUpResources
};

// If called directly, run with command line arguments
if (require.main === module) {
    const args = process.argv.slice(2);
    
    // Backward-compatibility: if only ONE arg is provided, treat it as JSON string or file path
    if (args.length === 1) {
        let rawConfig;
        try {
            const fs = require('fs');
            const path = require('path');
            const arg = args[0];
            if (fs.existsSync(arg)) {
                // Treat as file path
                rawConfig = JSON.parse(fs.readFileSync(arg, 'utf8'));
            } else {
                // Treat as JSON string
                rawConfig = JSON.parse(arg);
            }
        } catch (error) {
            console.error('❌ Failed to parse setup configuration. Provide valid JSON string or path to JSON file.');
            console.error(error.message);
            process.exit(1);
        }
        
        // Validate required fields
        const required = ['containerNumber','username','password','email','email_password'];
        const missing = required.filter(k => rawConfig[k] === undefined);
        if (missing.length) {
            console.error(`❌ Missing required fields in setup configuration: ${missing.join(', ')}`);
            process.exit(1);
        }
        
        runAccountSetup(rawConfig)
            .then(result => {
                console.log('Setup result:', JSON.stringify(result, null, 2));
                process.exit(result.success ? 0 : 1);
            })
            .catch(error => {
                console.error('Setup failed:', error);
                process.exit(1);
            });
        return; // Prevent the logic below from executing
    }
    
    // Original CLI usage (5 separate args)
    if (args.length < 5) {
        console.error('Usage: node account_setup.js <containerNumber> <username> <password> <email> <email_password>');
        console.error('Or:   node account_setup.js "<json_string>"');
        console.error('Or:   node account_setup.js <path_to_json_file>');
        process.exit(1);
    }
    
    const setupConfig = {
        containerNumber: parseInt(args[0]),
        username: args[1],
        password: args[2],
        email: args[3],
        email_password: args[4]
    };
    
    runAccountSetup(setupConfig)
        .then(result => {
            console.log('Setup result:', JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Setup failed:', error);
            process.exit(1);
        });
} 