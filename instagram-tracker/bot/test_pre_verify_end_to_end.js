/**
 * End-to-End Pre-Verification Test
 * 
 * This script simulates the complete pre-verification process including
 * the EmailTokenFetcher and API calls to update account status.
 */

const EmailTokenFetcher = require('./services/EmailTokenFetcher');

async function testEndToEndPreVerification() {
    // Test data
    const accountData = {
        id: 999,
        email: 'oilcxkwtvg@rambler.ru',
        email_password: '4247270JRzeza'
    };

    console.log('🧪 End-to-End Pre-Verification Test');
    console.log('=' .repeat(60));
    console.log('📝 Account Data:', accountData);
    console.log();

    const result = {
        accountId: accountData.id,
        success: false,
        action: 'none',
        message: ''
    };

    try {
        console.log(`[PreVerifyEmail] 🔍 Starting pre-verification for account ${accountData.id} (${accountData.email})`);

        const emailFetcher = new EmailTokenFetcher();
        
        // Check for existing verification token
        const verificationResult = await emailFetcher.checkForExistingVerificationToken(
            accountData.email, 
            accountData.email_password
        );

        if (!verificationResult.success) {
            // Email connection failed - mark account as invalid
            console.log(`[PreVerifyEmail] ❌ Email connection failed for ${accountData.email}: ${verificationResult.error}`);
            
            result.success = true;
            result.action = 'mark_invalid';
            result.message = `Email connection failed: ${verificationResult.error}`;
            
            console.log(`[PreVerifyEmail] 📤 Would call API to mark account ${accountData.id} as invalid`);
            console.log(`[PreVerifyEmail] 📤 Endpoint: POST /api/accounts/lifecycle/${accountData.id}/invalidate`);
            console.log(`[PreVerifyEmail] 📤 Body: {"reason": "${result.message}"}`);
            
        } else if (verificationResult.token) {
            // Verification code found - mark account as ready for warmup
            console.log(`[PreVerifyEmail] ✅ Found verification token for ${accountData.email}: ${verificationResult.token}`);
            
            result.success = true;
            result.action = 'mark_ready';
            result.token = verificationResult.token;
            result.message = `Verification token found: ${verificationResult.token}`;
            
            console.log(`[PreVerifyEmail] 📤 Would call API to transition account ${accountData.id} to ready_for_bot_assignment`);
            console.log(`[PreVerifyEmail] 📤 Endpoint: POST /api/accounts/lifecycle/${accountData.id}/transition`);
            console.log(`[PreVerifyEmail] 📤 Body: {`);
            console.log(`[PreVerifyEmail] 📤   "to_state": "ready_for_bot_assignment",`);
            console.log(`[PreVerifyEmail] 📤   "reason": "${result.message}",`);
            console.log(`[PreVerifyEmail] 📤   "notes": "Account has verification code and is ready for content assignment"`);
            console.log(`[PreVerifyEmail] 📤 }`);
            
        } else {
            // No verification code found - proceed with normal automation
            console.log(`[PreVerifyEmail] 📭 No existing verification token found for ${accountData.email}`);
            
            result.success = true;
            result.action = 'none';
            result.message = 'No existing verification token found - account unchanged';
            
            console.log(`[PreVerifyEmail] 📤 No API call needed - account remains unchanged`);
        }

    } catch (error) {
        console.error(`[PreVerifyEmail] ❌ Error during pre-verification for ${accountData.email}:`, error.message);
        
        result.success = false;
        result.action = 'none';
        result.message = `Pre-verification error: ${error.message}`;
    }

    console.log();
    console.log('📊 FINAL RESULT:');
    console.log('-'.repeat(40));
    console.log('Script Output (JSON):', JSON.stringify(result, null, 2));
    console.log();
    
    console.log('🔄 WHAT WOULD HAPPEN:');
    if (result.action === 'mark_invalid') {
        console.log('❌ Account would be marked as INVALID due to email connection failure');
        console.log('   - Account lifecycle_state → invalid');
        console.log('   - Account excluded from automation');
        console.log('   - Admin notified of email issue');
    } else if (result.action === 'mark_ready') {
        console.log('✅ Account would be transitioned to READY_FOR_BOT_ASSIGNMENT');
        console.log('   - Account lifecycle_state → ready_for_bot_assignment');
        console.log('   - Account appears in "Assign Content to Ready Accounts" button');
        console.log('   - Manual content assignment can be triggered');
        console.log(`   - Verification token ${result.token} available for use`);
    } else {
        console.log('📭 Account would remain UNCHANGED');
        console.log('   - Account lifecycle_state → unchanged');
        console.log('   - Normal automation workflow continues');
        console.log('   - Account will go through standard setup process');
    }

    console.log();
    console.log(`🎯 Exit Code: ${result.success ? 0 : 1}`);
    
    return result;
}

// Test with error simulation
async function testWithBadCredentials() {
    console.log();
    console.log('🧪 Testing with Bad Credentials (Connection Failure)');
    console.log('=' .repeat(60));
    
    const badAccountData = {
        id: 998,
        email: 'nonexistent@example.com',
        email_password: 'wrongpassword'
    };

    console.log('📝 Bad Account Data:', badAccountData);
    console.log();

    try {
        const emailFetcher = new EmailTokenFetcher();
        const verificationResult = await emailFetcher.checkForExistingVerificationToken(
            badAccountData.email, 
            badAccountData.email_password
        );

        console.log('📊 Bad Credentials Result:');
        console.log(`   Success: ${verificationResult.success}`);
        console.log(`   Token: ${verificationResult.token || 'None'}`);
        console.log(`   Error: ${verificationResult.error || 'None'}`);

        if (!verificationResult.success) {
            console.log('✅ CORRECT: Bad credentials properly detected as connection failure');
            console.log('   → Account would be marked as invalid');
        } else {
            console.log('⚠️ UNEXPECTED: Bad credentials should have failed');
        }

    } catch (error) {
        console.log('✅ CORRECT: Exception thrown for bad credentials');
        console.log(`   Error: ${error.message}`);
    }
}

// Main execution
async function main() {
    try {
        await testEndToEndPreVerification();
        await testWithBadCredentials();
        
        console.log();
        console.log('✅ End-to-end pre-verification test completed!');
        console.log('🚀 The fixed system should now work correctly for all email scenarios.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
} 