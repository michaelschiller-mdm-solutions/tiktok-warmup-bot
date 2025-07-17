/**
 * Test script to find real accounts and test pre-verification with actual data
 */

async function testRealAccounts() {
    try {
        // Dynamic import for fetch (node-fetch 3.x is ES module)
        const { default: fetch } = await import('node-fetch');
        
        console.log('🔍 Finding real accounts in database...\n');
        
        // Get accounts from database
        const accountsResponse = await fetch('http://localhost:3001/api/accounts?limit=10');
        if (!accountsResponse.ok) {
            throw new Error(`Failed to fetch accounts: ${accountsResponse.statusText}`);
        }
        
        const accountsData = await accountsResponse.json();
        console.log('📊 Raw response:', JSON.stringify(accountsData, null, 2));
        
        // Handle different response formats
        const accounts = accountsData.data?.accounts || accountsData.data || accountsData || [];
        console.log(`📊 Found ${accounts.length} accounts in database`);
        
        if (accounts.length === 0) {
            console.log('❌ No accounts found in database. Cannot test pre-verification.');
            return;
        }
        
        // Show account details
        console.log('\n📋 Available Accounts:');
        accounts.forEach(account => {
            console.log(`  ID: ${account.id}, Username: ${account.username}, Email: ${account.email || 'N/A'}, State: ${account.lifecycle_state}`);
        });
        
        // Find accounts with email credentials
        const accountsWithEmail = accounts.filter(acc => acc.email && acc.email_password);
        console.log(`\n📧 Accounts with email credentials: ${accountsWithEmail.length}`);
        
        if (accountsWithEmail.length === 0) {
            console.log('❌ No accounts with email credentials found. Cannot test pre-verification.');
            return;
        }
        
        // Test pre-verification with account 204 which we know has verification codes
        const testAccount = accounts.find(acc => acc.id === 204) || accountsWithEmail[0];
        console.log(`\n🧪 Testing pre-verification with account:`, {
            id: testAccount.id,
            username: testAccount.username,
            email: testAccount.email,
            current_state: testAccount.lifecycle_state
        });
        
        // Call pre-verification API
        console.log('\n🚀 Starting pre-verification test...');
        const preVerifyResponse = await fetch('http://localhost:3001/api/automation/pre-verify-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                accounts: [{
                    id: testAccount.id,
                    email: testAccount.email,
                    email_password: testAccount.email_password,
                    username: testAccount.username
                }]
            })
        });
        
        const preVerifyData = await preVerifyResponse.json();
        console.log('📥 Pre-verification response:', JSON.stringify(preVerifyData, null, 2));
        
        // Check if account state changed
        console.log('\n🔍 Checking if account state changed...');
        const updatedAccountResponse = await fetch(`http://localhost:3001/api/accounts/${testAccount.id}`);
        const updatedAccountData = await updatedAccountResponse.json();
        
        console.log(`📊 Account ${testAccount.id} state:`, {
            before: testAccount.lifecycle_state,
            after: updatedAccountData.data?.lifecycle_state || 'Failed to fetch'
        });
        
        // Check ready_for_bot_assignment accounts
        console.log('\n🔍 Checking accounts in ready_for_bot_assignment state...');
        const readyAccountsResponse = await fetch('http://localhost:3001/api/accounts?lifecycle_state=ready_for_bot_assignment&limit=50');
        const readyAccountsData = await readyAccountsResponse.json();
        
        const readyAccounts = readyAccountsData.data?.accounts || readyAccountsData.data || readyAccountsData || [];
        console.log(`📊 Found ${readyAccounts.length} accounts in ready_for_bot_assignment state:`);
        if (readyAccounts.length > 0) {
            readyAccounts.forEach(acc => {
                console.log(`  - ID: ${acc.id}, Username: ${acc.username}, Email: ${acc.email}`);
            });
        } else {
            console.log('  (No accounts in ready_for_bot_assignment state)');
        }
        
        console.log('\n✅ Test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testRealAccounts(); 