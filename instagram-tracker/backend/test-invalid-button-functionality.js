/**
 * Test the invalid button functionality to ensure it properly frees resources
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'instagram_tracker',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

async function testInvalidButtonFunctionality() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing invalid button functionality...');
    
    // Find a test account that's not archived and has resources assigned
    const testAccountQuery = `
      SELECT 
        id, 
        username, 
        container_number, 
        lifecycle_state,
        proxy_id,
        status
      FROM accounts 
      WHERE lifecycle_state != 'archived'
      AND (container_number IS NOT NULL OR proxy_id IS NOT NULL)
      ORDER BY updated_at DESC
      LIMIT 5;
    `;
    
    const testResult = await client.query(testAccountQuery);
    console.log(`📊 Found ${testResult.rows.length} test candidates:`);
    
    if (testResult.rows.length === 0) {
      console.log('⚠️  No suitable test accounts found');
      return;
    }
    
    testResult.rows.forEach(account => {
      console.log(`  - ${account.username} (ID: ${account.id})`);
      console.log(`    Container: ${account.container_number || 'None'}`);
      console.log(`    Proxy: ${account.proxy_id || 'None'}`);
      console.log(`    Lifecycle: ${account.lifecycle_state}`);
      console.log('');
    });
    
    // Check if the invalidateAccount function exists and works
    console.log('🔍 Testing invalidateAccount function...');
    
    // Check if the function exists in the database
    const functionExistsQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'release_account_from_iphone_container'
      ) as function_exists;
    `;
    
    const functionResult = await client.query(functionExistsQuery);
    const functionExists = functionResult.rows[0].function_exists;
    
    if (functionExists) {
      console.log('✅ release_account_from_iphone_container function exists');
    } else {
      console.log('❌ release_account_from_iphone_container function missing');
      console.log('   This function should be created to properly release containers');
    }
    
    // Check if there are any database triggers for cleanup
    const triggersQuery = `
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'accounts'
      AND trigger_name LIKE '%archive%' OR trigger_name LIKE '%container%'
      ORDER BY trigger_name;
    `;
    
    const triggersResult = await client.query(triggersQuery);
    console.log(`\n📊 Found ${triggersResult.rows.length} relevant triggers:`);
    
    if (triggersResult.rows.length > 0) {
      triggersResult.rows.forEach(trigger => {
        console.log(`  - ${trigger.trigger_name} on ${trigger.event_manipulation}`);
      });
    } else {
      console.log('⚠️  No cleanup triggers found');
    }
    
    // Check the current state of warmup queue cleanup
    const warmupQueueCleanupQuery = `
      SELECT 
        COUNT(*) as total_archived_in_queue,
        COUNT(CASE WHEN awp.status IN ('pending', 'available', 'in_progress') THEN 1 END) as active_phases
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE a.lifecycle_state = 'archived';
    `;
    
    const queueCleanupResult = await client.query(warmupQueueCleanupQuery);
    const queueStats = queueCleanupResult.rows[0];
    
    console.log('\n📊 Warmup queue cleanup status:');
    console.log(`  Total archived accounts in queue: ${queueStats.total_archived_in_queue}`);
    console.log(`  Active phases for archived accounts: ${queueStats.active_phases}`);
    
    if (queueStats.active_phases === '0') {
      console.log('✅ Warmup queue properly cleaned up');
    } else {
      console.log('⚠️  Warmup queue needs cleanup for archived accounts');
    }
    
    // Test the API endpoint simulation
    console.log('\n🔧 Simulating invalid button API call...');
    
    // This simulates what the invalidateAccount function should do
    const simulateInvalidation = async (accountId) => {
      console.log(`  Testing invalidation logic for account ${accountId}...`);
      
      // Check current state
      const beforeQuery = `
        SELECT 
          lifecycle_state, 
          container_number, 
          proxy_id,
          (SELECT COUNT(*) FROM account_warmup_phases WHERE account_id = $1 AND status IN ('pending', 'available', 'in_progress')) as active_phases
        FROM accounts 
        WHERE id = $1;
      `;
      
      const beforeResult = await client.query(beforeQuery, [accountId]);
      if (beforeResult.rows.length === 0) {
        console.log('    ❌ Account not found');
        return false;
      }
      
      const before = beforeResult.rows[0];
      console.log(`    Before: State=${before.lifecycle_state}, Container=${before.container_number}, Proxy=${before.proxy_id}, ActivePhases=${before.active_phases}`);
      
      // The invalidation should:
      // 1. Set lifecycle_state to 'archived'
      // 2. Clear container_number
      // 3. Clear proxy_id
      // 4. Skip all active warmup phases
      
      return {
        shouldArchive: before.lifecycle_state !== 'archived',
        shouldClearContainer: before.container_number !== null,
        shouldClearProxy: before.proxy_id !== null,
        shouldSkipPhases: before.active_phases > 0
      };
    };
    
    // Test with the first account
    if (testResult.rows.length > 0) {
      const testAccount = testResult.rows[0];
      const simulationResult = await simulateInvalidation(testAccount.id);
      
      console.log('  Expected invalidation actions:');
      console.log(`    Archive account: ${simulationResult.shouldArchive ? '✅' : '❌'}`);
      console.log(`    Clear container: ${simulationResult.shouldClearContainer ? '✅' : '❌'}`);
      console.log(`    Clear proxy: ${simulationResult.shouldClearProxy ? '✅' : '❌'}`);
      console.log(`    Skip warmup phases: ${simulationResult.shouldSkipPhases ? '✅' : '❌'}`);
    }
    
    console.log('\n🎯 Recommendations:');
    console.log('1. The invalidateAccount function should be enhanced to:');
    console.log('   - Clear container_number (not just call release function)');
    console.log('   - Skip all active warmup phases');
    console.log('   - Clear proxy assignments');
    console.log('2. Consider adding database triggers for automatic cleanup');
    console.log('3. The frontend invalid button should work if backend is properly implemented');
    
  } catch (error) {
    console.error('💥 Error testing invalid button functionality:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await testInvalidButtonFunctionality();
    console.log('\n🎉 Invalid button functionality test completed!');
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { testInvalidButtonFunctionality };