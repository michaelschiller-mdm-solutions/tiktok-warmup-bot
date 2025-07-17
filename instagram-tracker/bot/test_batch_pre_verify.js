/**
 * Test script for batched pre-verification API endpoint
 * Tests the fixed batch processing with a small number of accounts
 */

async function testBatchPreVerify() {
    const { default: fetch } = await import('node-fetch');
    
    // Test accounts (using our working test account plus some fake ones)
    const testAccounts = [
        {
            id: 1,
            email: 'oilcxkwtvg@rambler.ru',
            email_password: '4247270JRzeza'
        },
        {
            id: 2,
            email: 'fake1@nonexistent.com',
            email_password: 'fakepass123'
        },
        {
            id: 3,
            email: 'fake2@nonexistent.com', 
            email_password: 'fakepass456'
        }
    ];

    console.log('🧪 Testing Batched Pre-Verification API');
    console.log('============================================================');
    console.log(`📧 Testing with ${testAccounts.length} accounts`);
    console.log('Expected results:');
    console.log('  - Account 1: Should process successfully (no token found)');
    console.log('  - Account 2-3: Should fail with email connection errors');
    console.log('');

    try {
        const startTime = Date.now();
        
        const response = await fetch('http://localhost:3001/api/automation/pre-verify-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accounts: testAccounts
            })
        });

        const duration = Date.now() - startTime;

        if (!response.ok) {
            const errorData = await response.json();
            console.error('❌ API Error:', errorData);
            return;
        }

        const result = await response.json();
        
        console.log(`⏱️ API call completed in ${duration}ms`);
        console.log('');
        console.log('📊 SUMMARY:', result.summary);
        console.log('');
        console.log('📋 DETAILED RESULTS:');
        console.log('----------------------------------------');
        
        result.results.forEach((accountResult, index) => {
            const account = testAccounts[index];
            console.log(`\n🔍 Account ${accountResult.accountId} (${account.email}):`);
            console.log(`   Success: ${accountResult.success ? '✅' : '❌'}`);
            console.log(`   Action: ${accountResult.action}`);
            console.log(`   Message: ${accountResult.message || accountResult.error || 'No message'}`);
            if (accountResult.token) {
                console.log(`   Token: ${accountResult.token}`);
            }
        });

        console.log('\n✅ Batch pre-verification test completed successfully!');
        
        // Verify expected behavior
        const validAccount = result.results.find(r => r.accountId === 1);
        const invalidAccounts = result.results.filter(r => r.accountId !== 1);
        
        console.log('\n🔬 VALIDATION:');
        if (validAccount && validAccount.success && validAccount.action === 'none') {
            console.log('✅ Valid email account processed correctly');
        } else {
            console.log('❌ Valid email account did not process as expected');
        }
        
        if (invalidAccounts.every(r => !r.success || r.action === 'mark_invalid')) {
            console.log('✅ Invalid email accounts handled correctly');
        } else {
            console.log('❌ Invalid email accounts not handled as expected');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Make sure the backend server is running on port 3001');
    }
}

// Run the test
testBatchPreVerify(); 