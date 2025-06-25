const AutomationBridge = require('../../services/AutomationBridge');
const EmailTokenFetcher = require('../../services/EmailTokenFetcher');
const AccountSetupService = require('../../services/AccountSetupService');
const ProgressReporter = require('../../services/ProgressReporter');

/**
 * Direct execution test for a single account setup.
 * This bypasses the API layer and directly invokes the core services.
 */
async function directExecutionTest() {
    console.log('--- 🚀 Starting Direct Execution Test ---');

    // Account details provided by the user
    const accountConfig = {
        containerNumber: 47, // From previous logs
        username: 'bbdc507',
        password: 'bebe3311',
        email: 'bbdc507@gmail.com',
        email_password: 'bebe3311'
    };

    console.log('Test Account Configuration:');
    console.log(JSON.stringify(accountConfig, null, 2));

    const progressReporter = new ProgressReporter();

    try {
        console.log('\n--- Initializing Services ---');
        const bridge = new AutomationBridge();
        const fetcher = new EmailTokenFetcher();
        const setupService = new AccountSetupService(bridge, fetcher, progressReporter);

        console.log('\n--- 🏃‍♂️ Running Account Setup ---');
        await setupService.run(accountConfig);

        console.log('\n--- ✅ Test Completed Successfully ---');
        console.log(JSON.stringify({
            success: true,
            message: `Account setup for ${accountConfig.username} appears to have completed.`
        }));

    } catch (error) {
        console.error('\n--- ❌ Test Failed ---');
        console.error(JSON.stringify({
            success: false,
            error: error.message || 'An unknown error occurred during the direct execution test.'
        }));
        
    } finally {
        console.log('\n--- 🛑 Test script finished ---');
        // The process will exit naturally.
    }
}


directExecutionTest(); 