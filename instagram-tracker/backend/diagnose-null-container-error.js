/**
 * Diagnose null container error in warmup automation
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

async function diagnoseNullContainerError() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Diagnosing null container error...');
    
    // 1. Check accounts with null container_number
    console.log('\n📊 Accounts with null container_number:');
    const nullContainerQuery = `
      SELECT 
        id,
        username,
        container_number,
        lifecycle_state,
        status,
        created_at,
        updated_at
      FROM accounts 
      WHERE container_number IS NULL
      AND lifecycle_state = 'warmup'
      ORDER BY updated_at DESC
      LIMIT 10;
    `;
    
    const nullResult = await client.query(nullContainerQuery);
    
    if (nullResult.rows.length === 0) {
      console.log('  ✅ No warmup accounts have null container_number');
    } else {
      console.log(`  ⚠️  Found ${nullResult.rows.length} warmup accounts with null container_number:`);
      nullResult.rows.forEach(account => {
        console.log(`    - ${account.username} (ID: ${account.id})`);
        console.log(`      Lifecycle: ${account.lifecycle_state}`);
        console.log(`      Status: ${account.status}`);
        console.log(`      Updated: ${account.updated_at}`);
        console.log('');
      });
    }
    
    // 2. Check accounts in warmup queue with null containers
    console.log('\n📊 Warmup queue accounts with null containers:');
    const queueNullQuery = `
      SELECT 
        awp.account_id,
        a.username,
        a.container_number,
        awp.phase,
        awp.status,
        awp.available_at,
        awp.updated_at
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE a.container_number IS NULL
      AND a.lifecycle_state = 'warmup'
      AND awp.status IN ('pending', 'available', 'in_progress')
      ORDER BY awp.updated_at DESC
      LIMIT 10;
    `;
    
    const queueNullResult = await client.query(queueNullQuery);
    
    if (queueNullResult.rows.length === 0) {
      console.log('  ✅ No active warmup queue items have null containers');
    } else {
      console.log(`  🚨 Found ${queueNullResult.rows.length} active warmup queue items with null containers:`);
      queueNullResult.rows.forEach(item => {
        console.log(`    - ${item.username} (ID: ${item.account_id})`);
        console.log(`      Phase: ${item.phase} (${item.status})`);
        console.log(`      Container: ${item.container_number || 'NULL'}`);
        console.log(`      Available at: ${item.available_at}`);
        console.log('');
      });
    }
    
    // 3. Check recent warmup automation attempts
    console.log('\n📊 Recent warmup automation attempts:');
    const recentAttemptsQuery = `
      SELECT 
        awp.account_id,
        a.username,
        a.container_number,
        awp.phase,
        awp.status,
        awp.started_at,
        awp.bot_id,
        awp.error_message
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.started_at > NOW() - INTERVAL '1 hour'
      OR awp.error_message IS NOT NULL
      ORDER BY awp.started_at DESC NULLS LAST
      LIMIT 10;
    `;
    
    const attemptsResult = await client.query(recentAttemptsQuery);
    
    if (attemptsResult.rows.length === 0) {
      console.log('  ℹ️  No recent warmup automation attempts found');
    } else {
      console.log(`  📊 Found ${attemptsResult.rows.length} recent attempts:`);
      attemptsResult.rows.forEach(attempt => {
        console.log(`    - ${attempt.username} (ID: ${attempt.account_id})`);
        console.log(`      Phase: ${attempt.phase} (${attempt.status})`);
        console.log(`      Container: ${attempt.container_number || 'NULL'}`);
        console.log(`      Started: ${attempt.started_at || 'Never'}`);
        console.log(`      Bot ID: ${attempt.bot_id || 'None'}`);
        if (attempt.error_message) {
          console.log(`      Error: ${attempt.error_message}`);
        }
        console.log('');
      });
    }
    
    // 4. Check container assignment logic
    console.log('\n🔧 Checking container assignment logic:');
    
    // Check if there are available containers
    const containerStatsQuery = `
      SELECT 
        container_number,
        COUNT(*) as account_count,
        COUNT(CASE WHEN lifecycle_state = 'warmup' THEN 1 END) as warmup_accounts,
        COUNT(CASE WHEN lifecycle_state = 'archived' THEN 1 END) as archived_accounts
      FROM accounts 
      WHERE container_number IS NOT NULL
      GROUP BY container_number
      ORDER BY container_number
      LIMIT 10;
    `;
    
    const containerStatsResult = await client.query(containerStatsQuery);
    
    if (containerStatsResult.rows.length === 0) {
      console.log('  ⚠️  No containers are assigned to any accounts');
    } else {
      console.log('  📊 Container usage statistics:');
      containerStatsResult.rows.forEach(stat => {
        console.log(`    Container ${stat.container_number}: ${stat.account_count} total (${stat.warmup_accounts} warmup, ${stat.archived_accounts} archived)`);
      });
    }
    
    // 5. Check container assignment triggers/functions
    console.log('\n🔍 Checking container assignment triggers:');
    
    const triggersQuery = `
      SELECT 
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'accounts'
      AND (trigger_name LIKE '%container%' OR action_statement LIKE '%container%')
      ORDER BY trigger_name;
    `;
    
    const triggersResult = await client.query(triggersQuery);
    
    if (triggersResult.rows.length === 0) {
      console.log('  ⚠️  No container-related triggers found');
    } else {
      console.log(`  📊 Found ${triggersResult.rows.length} container-related triggers:`);
      triggersResult.rows.forEach(trigger => {
        console.log(`    - ${trigger.trigger_name} on ${trigger.event_manipulation}`);
      });
    }
    
    // 6. Check if accounts are being processed without containers
    console.log('\n🚨 Checking for automation processing without containers:');
    
    const processingWithoutContainerQuery = `
      SELECT 
        awp.account_id,
        a.username,
        a.container_number,
        awp.phase,
        awp.status,
        awp.bot_id,
        awp.started_at
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.status = 'in_progress'
      AND a.container_number IS NULL
      ORDER BY awp.started_at DESC;
    `;
    
    const processingResult = await client.query(processingWithoutContainerQuery);
    
    if (processingResult.rows.length === 0) {
      console.log('  ✅ No accounts are being processed without containers');
    } else {
      console.log(`  🚨 CRITICAL: ${processingResult.rows.length} accounts being processed without containers:`);
      processingResult.rows.forEach(item => {
        console.log(`    - ${item.username} (ID: ${item.account_id})`);
        console.log(`      Phase: ${item.phase}`);
        console.log(`      Bot ID: ${item.bot_id}`);
        console.log(`      Started: ${item.started_at}`);
        console.log('');
      });
    }
    
    // 7. Check the warmup queue service logic
    console.log('\n🔍 Checking warmup queue service behavior:');
    
    // Look for accounts that should have containers but don't
    const shouldHaveContainerQuery = `
      SELECT 
        a.id,
        a.username,
        a.container_number,
        a.lifecycle_state,
        a.created_at,
        a.updated_at
      FROM accounts a
      WHERE a.lifecycle_state IN ('warmup', 'ready_for_bot_assignment')
      AND a.container_number IS NULL
      ORDER BY a.updated_at DESC
      LIMIT 5;
    `;
    
    const shouldHaveResult = await client.query(shouldHaveContainerQuery);
    
    if (shouldHaveResult.rows.length === 0) {
      console.log('  ✅ All warmup/ready accounts have containers assigned');
    } else {
      console.log(`  ⚠️  Found ${shouldHaveResult.rows.length} accounts that should have containers:`);
      shouldHaveResult.rows.forEach(account => {
        console.log(`    - ${account.username} (ID: ${account.id})`);
        console.log(`      Lifecycle: ${account.lifecycle_state}`);
        console.log(`      Created: ${account.created_at}`);
        console.log(`      Updated: ${account.updated_at}`);
        console.log('');
      });
    }
    
    // 8. Recommendations
    console.log('\n💡 Diagnosis Summary and Recommendations:');
    
    if (nullResult.rows.length > 0) {
      console.log('  🚨 ISSUE: Warmup accounts with null containers found');
      console.log('    - These accounts will fail automation with "Invalid container number: null"');
      console.log('    - Container assignment logic may be broken');
    }
    
    if (queueNullResult.rows.length > 0) {
      console.log('  🚨 CRITICAL: Active warmup queue items with null containers');
      console.log('    - These will cause immediate automation failures');
      console.log('    - Need to assign containers or remove from queue');
    }
    
    if (processingResult.rows.length > 0) {
      console.log('  🚨 EMERGENCY: Accounts being processed without containers');
      console.log('    - This will cause 403 errors and automation failures');
      console.log('    - Need immediate intervention');
    }
    
    console.log('\n🔧 Suggested fixes:');
    console.log('  1. Check container assignment triggers/functions');
    console.log('  2. Manually assign containers to null accounts');
    console.log('  3. Fix container assignment logic in warmup queue service');
    console.log('  4. Add validation to prevent null containers in automation');
    
  } catch (error) {
    console.error('💥 Error diagnosing null container error:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await diagnoseNullContainerError();
    console.log('\n🎉 Null container error diagnosis completed!');
  } catch (error) {
    console.error('💥 Diagnosis failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { diagnoseNullContainerError };