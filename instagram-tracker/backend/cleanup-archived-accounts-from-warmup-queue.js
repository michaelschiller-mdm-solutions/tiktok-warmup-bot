/**
 * Clean up archived accounts from warmup queue to prevent null container errors
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

async function cleanupArchivedAccountsFromWarmupQueue() {
  const client = await pool.connect();
  
  try {
    console.log('🧹 Cleaning up archived accounts from warmup queue...');
    
    // 1. Find archived accounts still in warmup queue
    console.log('\n📊 Finding archived accounts in warmup queue:');
    const archivedInQueueQuery = `
      SELECT 
        a.id,
        a.username,
        a.container_number,
        a.lifecycle_state,
        COUNT(CASE WHEN awp.status IN ('pending', 'available', 'in_progress') THEN 1 END) as active_phases,
        COUNT(*) as total_phases
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'archived'
      GROUP BY a.id, a.username, a.container_number, a.lifecycle_state
      HAVING COUNT(CASE WHEN awp.status IN ('pending', 'available', 'in_progress') THEN 1 END) > 0
      ORDER BY a.username;
    `;
    
    const archivedResult = await client.query(archivedInQueueQuery);
    
    if (archivedResult.rows.length === 0) {
      console.log('  ✅ No archived accounts found in warmup queue');
      return;
    }
    
    console.log(`  🚨 Found ${archivedResult.rows.length} archived accounts still in warmup queue:`);
    archivedResult.rows.forEach(account => {
      console.log(`    - ${account.username} (ID: ${account.id})`);
      console.log(`      Container: ${account.container_number || 'NULL'}`);
      console.log(`      Active phases: ${account.active_phases}/${account.total_phases}`);
    });
    
    // 2. Clean up these accounts
    console.log('\n🔧 Cleaning up archived accounts...');
    
    await client.query('BEGIN');
    
    let totalCleaned = 0;
    let totalPhasesSkipped = 0;
    
    for (const account of archivedResult.rows) {
      try {
        console.log(`\n  🧹 Cleaning up ${account.username} (ID: ${account.id})...`);
        
        // Skip all active warmup phases
        const skipPhasesQuery = `
          UPDATE account_warmup_phases 
          SET 
            status = 'skipped',
            completed_at = NOW(),
            updated_at = NOW(),
            error_message = NULL,
            started_at = NULL,
            bot_id = NULL
          WHERE account_id = $1
          AND status IN ('pending', 'available', 'in_progress');
        `;
        
        const skipResult = await client.query(skipPhasesQuery, [account.id]);
        const phasesSkipped = skipResult.rowCount;
        totalPhasesSkipped += phasesSkipped;
        
        console.log(`    ✅ Skipped ${phasesSkipped} active phases`);
        
        // Clear container if it exists (archived accounts shouldn't have containers)
        if (account.container_number) {
          const clearContainerQuery = `
            UPDATE accounts 
            SET 
              container_number = NULL,
              updated_at = NOW()
            WHERE id = $1;
          `;
          
          await client.query(clearContainerQuery, [account.id]);
          console.log(`    ✅ Cleared container ${account.container_number}`);
        }
        
        totalCleaned++;
        
      } catch (error) {
        console.error(`    ❌ Failed to clean up ${account.username}:`, error.message);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n📈 Cleanup Summary:');
    console.log(`  ✅ Cleaned up accounts: ${totalCleaned}`);
    console.log(`  ✅ Skipped phases: ${totalPhasesSkipped}`);
    console.log(`  ✅ Freed containers: ${archivedResult.rows.filter(a => a.container_number).length}`);
    
    // 3. Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    
    const verifyResult = await client.query(archivedInQueueQuery);
    
    if (verifyResult.rows.length === 0) {
      console.log('  ✅ All archived accounts removed from warmup queue');
    } else {
      console.log(`  ⚠️  ${verifyResult.rows.length} archived accounts still in queue`);
    }
    
    // 4. Check for any other potential issues
    console.log('\n🔍 Checking for other potential issues...');
    
    // Check for accounts with null containers in active states
    const nullContainerActiveQuery = `
      SELECT 
        id,
        username,
        container_number,
        lifecycle_state
      FROM accounts 
      WHERE container_number IS NULL
      AND lifecycle_state IN ('warmup', 'ready_for_bot_assignment', 'ready')
      ORDER BY username;
    `;
    
    const nullActiveResult = await client.query(nullContainerActiveQuery);
    
    if (nullActiveResult.rows.length === 0) {
      console.log('  ✅ No active accounts with null containers');
    } else {
      console.log(`  ⚠️  Found ${nullActiveResult.rows.length} active accounts with null containers:`);
      nullActiveResult.rows.forEach(account => {
        console.log(`    - ${account.username} (${account.lifecycle_state})`);
      });
    }
    
    // 5. Recommendations
    console.log('\n💡 Recommendations:');
    console.log('  1. ✅ Archived accounts cleaned up from warmup queue');
    console.log('  2. 🔧 Consider improving the account invalidation process to:');
    console.log('     - Automatically skip all warmup phases when archiving');
    console.log('     - Clear containers immediately');
    console.log('     - Remove from warmup queue processing');
    console.log('  3. 🔍 Monitor for accounts that get archived but remain in queue');
    console.log('  4. ⚡ The "Invalid container number: null" error should be resolved');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Error cleaning up archived accounts:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await cleanupArchivedAccountsFromWarmupQueue();
    console.log('\n🎉 Archived accounts cleanup completed!');
  } catch (error) {
    console.error('💥 Cleanup failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { cleanupArchivedAccountsFromWarmupQueue };