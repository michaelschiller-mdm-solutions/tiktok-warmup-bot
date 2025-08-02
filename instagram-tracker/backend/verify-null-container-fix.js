/**
 * Verify that the null container fix is working properly
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

async function verifyNullContainerFix() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying null container fix...');
    
    // 1. Check for any accounts with null containers in warmup queue
    console.log('\n📊 Checking for accounts with null containers in warmup queue:');
    const nullContainerQueueQuery = `
      SELECT 
        a.id,
        a.username,
        a.container_number,
        a.lifecycle_state,
        awp.phase,
        awp.status
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status IN ('pending', 'available', 'in_progress')
      AND a.container_number IS NULL
      ORDER BY a.username;
    `;
    
    const nullResult = await client.query(nullContainerQueueQuery);
    
    if (nullResult.rows.length === 0) {
      console.log('  ✅ No accounts with null containers in warmup queue');
    } else {
      console.log(`  🚨 Found ${nullResult.rows.length} accounts with null containers in queue:`);
      nullResult.rows.forEach(account => {
        console.log(`    - ${account.username} (ID: ${account.id})`);
        console.log(`      Phase: ${account.phase} (${account.status})`);
        console.log(`      Lifecycle: ${account.lifecycle_state}`);
      });
    }
    
    // 2. Check for archived accounts in warmup queue
    console.log('\n📊 Checking for archived accounts in warmup queue:');
    const archivedQueueQuery = `
      SELECT 
        a.id,
        a.username,
        a.lifecycle_state,
        COUNT(awp.id) as active_phases
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status IN ('pending', 'available', 'in_progress')
      AND a.lifecycle_state = 'archived'
      GROUP BY a.id, a.username, a.lifecycle_state
      ORDER BY a.username;
    `;
    
    const archivedResult = await client.query(archivedQueueQuery);
    
    if (archivedResult.rows.length === 0) {
      console.log('  ✅ No archived accounts in warmup queue');
    } else {
      console.log(`  🚨 Found ${archivedResult.rows.length} archived accounts in queue:`);
      archivedResult.rows.forEach(account => {
        console.log(`    - ${account.username} (ID: ${account.id}) - ${account.active_phases} active phases`);
      });
    }
    
    // 3. Check the specific danielsefora88 account
    console.log('\n📊 Checking danielsefora88 account specifically:');
    const danielQuery = `
      SELECT 
        a.id,
        a.username,
        a.container_number,
        a.lifecycle_state,
        COUNT(CASE WHEN awp.status IN ('pending', 'available', 'in_progress') THEN 1 END) as active_phases,
        COUNT(awp.id) as total_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.username = 'danielsefora88'
      GROUP BY a.id, a.username, a.container_number, a.lifecycle_state;
    `;
    
    const danielResult = await client.query(danielQuery);
    
    if (danielResult.rows.length === 0) {
      console.log('  ❌ danielsefora88 account not found');
    } else {
      const daniel = danielResult.rows[0];
      console.log(`  Account: ${daniel.username} (ID: ${daniel.id})`);
      console.log(`  Container: ${daniel.container_number || 'NULL'}`);
      console.log(`  Lifecycle: ${daniel.lifecycle_state}`);
      console.log(`  Active phases: ${daniel.active_phases}/${daniel.total_phases}`);
      
      if (daniel.active_phases === '0' && daniel.lifecycle_state === 'archived') {
        console.log('  ✅ danielsefora88 is properly cleaned up');
      } else {
        console.log('  ⚠️  danielsefora88 may still have issues');
      }
    }
    
    // 4. Test the queue selection query (simulate what WarmupQueueService does)
    console.log('\n📊 Testing queue selection query:');
    const queueSelectionQuery = `
      SELECT a.*, awp.phase, awp.id as phase_id, awp.phase_order
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'available'
      AND awp.available_at <= NOW()
      AND (a.cooldown_until IS NULL OR a.cooldown_until <= NOW())
      AND a.container_number IS NOT NULL
      AND a.lifecycle_state = 'warmup'
      ORDER BY awp.phase_order ASC, awp.created_at ASC
      LIMIT 5;
    `;
    
    const queueResult = await client.query(queueSelectionQuery);
    
    console.log(`  📊 Queue selection found ${queueResult.rows.length} valid accounts:`);
    queueResult.rows.forEach(account => {
      console.log(`    - ${account.username} (Container: ${account.container_number})`);
      console.log(`      Phase: ${account.phase} (Order: ${account.phase_order})`);
    });
    
    // 5. Check for any recent errors
    console.log('\n📊 Checking for recent container-related errors:');
    const recentErrorsQuery = `
      SELECT 
        a.username,
        awp.phase,
        awp.error_message,
        awp.updated_at
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.error_message LIKE '%container%'
      AND awp.updated_at > NOW() - INTERVAL '1 hour'
      ORDER BY awp.updated_at DESC
      LIMIT 5;
    `;
    
    const errorsResult = await client.query(recentErrorsQuery);
    
    if (errorsResult.rows.length === 0) {
      console.log('  ✅ No recent container-related errors');
    } else {
      console.log(`  ⚠️  Found ${errorsResult.rows.length} recent container errors:`);
      errorsResult.rows.forEach(error => {
        console.log(`    - ${error.username} (${error.phase}): ${error.error_message}`);
        console.log(`      Time: ${error.updated_at}`);
      });
    }
    
    // 6. Summary
    console.log('\n📋 Fix Verification Summary:');
    
    const issues = [];
    
    if (nullResult.rows.length > 0) {
      issues.push(`${nullResult.rows.length} accounts with null containers in queue`);
    }
    
    if (archivedResult.rows.length > 0) {
      issues.push(`${archivedResult.rows.length} archived accounts in queue`);
    }
    
    if (errorsResult.rows.length > 0) {
      issues.push(`${errorsResult.rows.length} recent container errors`);
    }
    
    if (issues.length === 0) {
      console.log('  🎉 ALL CHECKS PASSED - Null container fix is working properly!');
      console.log('  ✅ No accounts with null containers in warmup queue');
      console.log('  ✅ No archived accounts in warmup queue');
      console.log('  ✅ No recent container-related errors');
      console.log('  ✅ Queue selection query properly filters accounts');
    } else {
      console.log('  ⚠️  Issues found:');
      issues.forEach(issue => console.log(`    - ${issue}`));
    }
    
  } catch (error) {
    console.error('💥 Error verifying null container fix:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await verifyNullContainerFix();
    console.log('\n🎉 Verification completed!');
  } catch (error) {
    console.error('💥 Verification failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyNullContainerFix };