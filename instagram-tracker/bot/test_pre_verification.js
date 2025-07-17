/**
 * Test Pre-Verification Functionality
 * 
 * This script tests the fixed checkForExistingVerificationToken method
 * to ensure it works correctly with real email credentials.
 * 
 * Usage:
 * node test_pre_verification.js "email@domain.com" "password"
 */

const EmailTokenFetcher = require('./services/EmailTokenFetcher');

async function testPreVerification() {
    const args = process.argv.slice(2);
    const email = args[0] || 'oilcxkwtvg@rambler.ru';
    const password = args[1] || '4247270JRzeza';

    if (!email || !password) {
        console.error('❌ Usage: node test_pre_verification.js "email@domain.com" "password"');
        process.exit(1);
    }

    console.log('🧪 Testing Pre-Verification Functionality');
    console.log('=' .repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log(`🔍 Testing checkForExistingVerificationToken method...`);
    console.log();

    try {
        const emailFetcher = new EmailTokenFetcher();
        const startTime = Date.now();
        
        console.log(`⏰ Starting pre-verification check at ${new Date().toISOString()}`);
        
        const result = await emailFetcher.checkForExistingVerificationToken(email, password);
        
        const duration = Date.now() - startTime;
        console.log(`⏱️ Check completed in ${duration}ms`);
        console.log();
        
        console.log('📊 RESULTS:');
        console.log('-'.repeat(40));
        console.log(`Success: ${result.success}`);
        console.log(`Token Found: ${result.token ? `✅ ${result.token}` : '❌ None'}`);
        console.log(`Error: ${result.error || 'None'}`);
        console.log();
        
        if (result.success && result.token) {
            console.log('🎉 SUCCESS: Found existing verification token!');
            console.log(`📋 Token: ${result.token}`);
            console.log('✅ This account should be marked as ready for bot assignment');
        } else if (result.success && !result.token) {
            console.log('📭 NO TOKEN: No existing verification token found');
            console.log('✅ This account should proceed with normal automation');
        } else {
            console.log('❌ FAILURE: Email connection failed');
            console.log(`⚠️ Error: ${result.error}`);
            console.log('🚫 This account should be marked as invalid');
        }
        
        console.log();
        console.log('🔄 RECOMMENDED ACTION:');
        if (result.success && result.token) {
            console.log('   → Transition to: ready_for_bot_assignment');
            console.log('   → Reason: Pre-verification found existing token');
        } else if (result.success && !result.token) {
            console.log('   → No action needed');
            console.log('   → Reason: No existing token, proceed normally');
        } else {
            console.log('   → Mark account as invalid');
            console.log('   → Reason: Email connection failed');
        }

    } catch (error) {
        console.error('💥 Test failed with exception:', error.message);
        console.error('📚 Stack:', error.stack);
        process.exit(1);
    }
}

// Test the specific functionality that was failing
async function testAccountData() {
    console.log('\n🔬 Testing with Account Data Format');
    console.log('=' .repeat(60));
    
    const testAccountData = {
        id: 999,
        email: 'oilcxkwtvg@rambler.ru',
        email_password: '4247270JRzeza'
    };
    
    console.log('📝 Account Data:', testAccountData);
    console.log();
    
    try {
        const emailFetcher = new EmailTokenFetcher();
        const result = await emailFetcher.checkForExistingVerificationToken(
            testAccountData.email, 
            testAccountData.email_password
        );
        
        console.log('📊 Result for Account ID', testAccountData.id + ':');
        console.log(`   Success: ${result.success}`);
        console.log(`   Token: ${result.token || 'None'}`);
        console.log(`   Error: ${result.error || 'None'}`);
        
        // Simulate what the pre_verify_email.js script would do
        const scriptResult = {
            accountId: testAccountData.id,
            success: false,
            action: 'none',
            message: ''
        };
        
        if (!result.success) {
            scriptResult.success = true;
            scriptResult.action = 'mark_invalid';
            scriptResult.message = `Email connection failed: ${result.error}`;
            console.log('📤 Script would output: mark_invalid');
        } else if (result.token) {
            scriptResult.success = true;
            scriptResult.action = 'mark_ready';
            scriptResult.token = result.token;
            scriptResult.message = `Verification token found: ${result.token}`;
            console.log('📤 Script would output: mark_ready');
        } else {
            scriptResult.success = true;
            scriptResult.action = 'none';
            scriptResult.message = 'No existing verification token found - account unchanged';
            console.log('📤 Script would output: none');
        }
        
        console.log('🎯 Final Script Result:', JSON.stringify(scriptResult, null, 2));
        
    } catch (error) {
        console.error('💥 Account data test failed:', error.message);
    }
}

// Main execution
async function main() {
    try {
        await testPreVerification();
        await testAccountData();
        
        console.log('\n✅ All tests completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run the tests
if (require.main === module) {
    main();
}

module.exports = { testPreVerification, testAccountData }; 