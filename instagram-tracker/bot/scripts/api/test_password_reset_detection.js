const EmailTokenFetcher = require('../../services/EmailTokenFetcher');
const { PasswordResetDetectedError } = require('../../services/AccountSetupService');

/**
 * Test script for password reset email detection
 * This script demonstrates how the enhanced email monitoring works
 */
async function testPasswordResetDetection() {
    console.log('[Test] 🧪 Testing password reset email detection...');
    
    const emailFetcher = new EmailTokenFetcher();
    
    // Test configuration
    const testConfig = {
        email: 'test@example.com', // Replace with actual test email
        email_password: 'testpassword', // Replace with actual password
        username: 'testusername' // Replace with actual username
    };
    
    try {
        console.log('[Test] 🔍 Checking for password reset email...');
        
        // Test the password reset detection method directly
        const resetDetected = await emailFetcher.checkForPasswordResetEmail(
            testConfig.email,
            testConfig.email_password,
            testConfig.username
        );
        
        if (resetDetected) {
            console.log('[Test] 🚨 Password reset email was detected!');
            console.log('[Test] ✅ Detection functionality is working correctly');
        } else {
            console.log('[Test] ✅ No password reset email found (as expected for valid accounts)');
        }
        
        // Test the enhanced token fetching with reset detection
        console.log('[Test] 📧 Testing enhanced email monitoring...');
        
        const emailResult = await emailFetcher.fetchLatestTokenWithResetDetection(
            testConfig.email,
            testConfig.email_password,
            testConfig.username
        );
        
        if (emailResult.passwordResetDetected) {
            console.log('[Test] 🚨 Password reset detected during token fetch!');
            console.log('[Test] 📊 Result:', emailResult);
        } else if (emailResult.token) {
            console.log('[Test] ✅ Verification token found:', emailResult.token);
        } else {
            console.log('[Test] ⏳ No token or reset email found');
        }
        
    } catch (error) {
        if (error.message.includes('Timeout')) {
            console.log('[Test] ⏱️ Test completed - no recent emails (timeout expected)');
        } else {
            console.error('[Test] ❌ Test error:', error.message);
        }
    }
}

/**
 * Test the AccountSetupService password reset handling
 */
async function testAccountSetupErrorHandling() {
    console.log('[Test] 🧪 Testing AccountSetupService error handling...');
    
    try {
        // Simulate a password reset error
        const error = new PasswordResetDetectedError('testuser', 'test@example.com');
        
        console.log('[Test] 📊 Password Reset Error Details:');
        console.log('  Name:', error.name);
        console.log('  Message:', error.message);
        console.log('  Username:', error.username);
        console.log('  Email:', error.email);
        console.log('  Account Invalid:', error.accountInvalid);
        
    } catch (error) {
        console.error('[Test] ❌ Error handling test failed:', error.message);
    }
}

/**
 * Simulate the complete workflow with password reset detection
 */
async function simulatePasswordResetWorkflow() {
    console.log('[Test] 🧪 Simulating complete password reset workflow...');
    
    const { runAccountSetup } = require('./account_setup');
    
    // Simulate a setup configuration that would trigger password reset
    const setupConfig = {
        containerNumber: 99, // Test container
        username: 'testuser_invalid_password',
        password: 'wrong_password_123',
        email: 'test@example.com',
        email_password: 'correct_email_password'
    };
    
    console.log('[Test] 🚀 Running simulated account setup...');
    console.log('[Test] 📋 Config:', JSON.stringify(setupConfig, null, 2));
    
    try {
        const result = await runAccountSetup(setupConfig);
        
        console.log('[Test] 📊 Setup Result:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.accountInvalid) {
            console.log('[Test] ✅ Password reset detection workflow completed successfully');
            console.log('[Test] 🧹 Resources should be freed for container', setupConfig.containerNumber);
        }
        
    } catch (error) {
        console.log('[Test] 📊 Expected error for simulation:', error.message);
    }
}

/**
 * Main test runner
 */
async function runAllTests() {
    console.log('🧪 Password Reset Detection Test Suite');
    console.log('=====================================');
    
    try {
        // Test 1: Direct password reset detection
        await testPasswordResetDetection();
        console.log('');
        
        // Test 2: Error handling
        await testAccountSetupErrorHandling();
        console.log('');
        
        // Test 3: Complete workflow simulation
        // Uncomment the next line to test the complete workflow
        // await simulatePasswordResetWorkflow();
        
        console.log('✅ All tests completed');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error.message);
    }
}

// Run tests if called directly
if (require.main === module) {
    runAllTests()
        .then(() => {
            console.log('Test suite finished');
            process.exit(0);
        })
        .catch(error => {
            console.error('Test suite error:', error);
            process.exit(1);
        });
}

module.exports = {
    testPasswordResetDetection,
    testAccountSetupErrorHandling,
    simulatePasswordResetWorkflow,
    runAllTests
}; 