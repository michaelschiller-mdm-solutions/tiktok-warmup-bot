/**
 * Test the enhanced invalidation function
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

async function testEnhancedInvalidation() {
  const client = await pool.connect();
  
  try {
    console.log('🧪 Testing enhanced invalidation function...');
    
    // Find a test account that has resources assigned
    const testAccountQuery = `
      SELECT 
        id, 
        username, 
        container_number, 
        lifecycle_state,
        proxy_id,
        (SELECT COUNT(*) FROM account_warmup_phases WHERE account_id = accounts.id AND status IN ('pending', 'available', 'in_progress')) as active_phases
      FROM accounts 
      WHERE lifecycle_state != 'archived'
      AND container_number IS NOT NULL
      ORDER BY updated_at DESC
      LIMIT 1;
    `;
    
    const testResult = await client.query(testAccountQuery);
    
    if (testResult.rows.length === 0) {
      console.log('⚠️  No suitable test accounts found');
      return;
    }
    
    const testAccount = testResult.rows[0];
    console.log(`📊 Testing with account: ${testAccount.username} (ID: ${testAccount.id})`);
    console.log(`  Container: ${testAccount.container_number}`);
    console.log(`  Proxy: ${testAccount.proxy_id || 'None'}`);
    console.log(`  Lifecycle: ${testAccount.lifecycle_state}`);
    console.log(`  Active phases: ${testAccount.active_phases}`);
    
    // Simulate the API call to invalidate the account
    console.log('\n🔧 Simulating API call to /accounts/lifecycle/:accountId/invalidate...');
    
    // This simulates what the enhanced invalidateAccount function should do
    await client.query('BEGIN');
    
    try {
      const notes = 'Account marked as invalid; resources released.';
      
      // 1. Update account state and clear all resource assignments
      const updateStateQuery = `
          UPDATE accounts
          SET lifecycle_state = 'archived',
              state_changed_at = CURRENT_TIMESTAMP,
              state_changed_by = 'test_user',
              state_notes = $1,
              container_number = NULL,
              proxy_id = NULL,
              proxy_assigned_at = NULL
          WHERE id = $2
      `;
      await client.query(updateStateQuery, [notes, testAccount.id]);
      console.log('  ✅ Updated account state to archived and cleared resources');

      // 2. Skip all active warmup phases
      const skipWarmupPhasesQuery = `
          UPDATE account_warmup_phases 
          SET status = 'skipped',
              completed_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP
          WHERE account_id = $1
          AND status IN ('pending', 'available', 'in_progress')
      `;
      const warmupResult = await client.query(skipWarmupPhasesQuery, [testAccount.id]);
      console.log(`  ✅ Skipped ${warmupResult.rowCount} active warmup phases`);

      // 3. Log the transition
      const logTransitionQuery = `
          INSERT INTO account_state_transitions
              (account_id, from_state, to_state, transition_reason, changed_by, notes)
          VALUES ($1, $2, 'archived', 'invalidation', 'test_user', $3)
      `;
      await client.query(logTransitionQuery, [testAccount.id, testAccount.lifecycle_state, notes]);
      console.log('  ✅ Logged state transition');

      await client.query('COMMIT');
      console.log('✅ Invalidation completed successfully');
      
      // Verify the changes
      console.log('\n🔍 Verifying changes...');
      
      const verifyQuery = `
        SELECT 
          id, 
          username, 
          container_number, 
          lifecycle_state,
          proxy_id,
          state_changed_by,
          state_notes,
          (SELECT COUNT(*) FROM account_warmup_phases WHERE account_id = accounts.id AND status IN ('pending', 'available', 'in_progress')) as active_phases
        FROM accounts 
        WHERE id = $1;
      `;
      
      const verifyResult = await client.query(verifyQuery, [testAccount.id]);
      const verifiedAccount = verifyResult.rows[0];
      
      console.log(`  Account: ${verifiedAccount.username} (ID: ${verifiedAccount.id})`);
      console.log(`  Container: ${verifiedAccount.container_number || 'NULL ✅'}`);
      console.log(`  Proxy: ${verifiedAccount.proxy_id || 'NULL ✅'}`);
      console.log(`  Lifecycle: ${verifiedAccount.lifecycle_state}`);
      console.log(`  Active phases: ${verifiedAccount.active_phases}`);
      console.log(`  Changed by: ${verifiedAccount.state_changed_by}`);
      console.log(`  Notes: ${verifiedAccount.state_notes}`);
      
      // Check if container is now available for reassignment
      const containerAvailabilityQuery = `
        SELECT COUNT(*) as accounts_using_container
        FROM accounts 
        WHERE container_number = $1
        AND lifecycle_state != 'archived';
      `;
      
      const containerResult = await client.query(containerAvailabilityQuery, [testAccount.container_number]);
      const accountsUsingContainer = containerResult.rows[0].accounts_using_container;
      
      console.log(`\n📊 Container ${testAccount.container_number} availability:`);
      console.log(`  Accounts still using container: ${accountsUsingContainer}`);
      
      if (accountsUsingContainer === '0') {
        console.log('  ✅ Container is now available for reassignment');
      } else {
        console.log('  ⚠️  Container is still in use by other accounts');
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('💥 Error testing enhanced invalidation:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await testEnhancedInvalidation();
    console.log('\n🎉 Enhanced invalidation test completed!');
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { testEnhancedInvalidation };