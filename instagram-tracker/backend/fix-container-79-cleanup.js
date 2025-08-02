/**
 * Fix container 79 cleanup issue for archived account
 * 
 * This script will properly clean up the archived account that still has
 * container 79 assigned and is still in the warmup queue.
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

async function fixContainer79Cleanup() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing container 79 cleanup for archived accounts...');
    
    // Find all archived accounts that still have containers assigned
    const archivedWithContainersQuery = `
      SELECT 
        id, 
        username, 
        container_number, 
        lifecycle_state,
        proxy_id,
        updated_at
      FROM accounts 
      WHERE lifecycle_state = 'archived'
      AND container_number IS NOT NULL
      ORDER BY updated_at DESC;
    `;
    
    const archivedResult = await client.query(archivedWithContainersQuery);
    console.log(`📊 Found ${archivedResult.rows.length} archived accounts with containers still assigned:`);
    
    if (archivedResult.rows.length === 0) {
      console.log('✅ No archived accounts with containers found');
      return;
    }
    
    archivedResult.rows.forEach(account => {
      console.log(`  - ${account.username} (ID: ${account.id}) - Container: ${account.container_number}`);
    });
    
    console.log('\n🔄 Starting cleanup process...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    let cleanedAccounts = 0;
    let cleanedWarmupPhases = 0;
    
    for (const account of archivedResult.rows) {
      try {
        console.log(`\n🧹 Cleaning up ${account.username} (ID: ${account.id})...`);
        
        // 1. Remove container assignment
        const removeContainerQuery = `
          UPDATE accounts 
          SET 
            container_number = NULL,
            updated_at = NOW()
          WHERE id = $1;
        `;
        
        await client.query(removeContainerQuery, [account.id]);
        console.log(`  ✅ Removed container ${account.container_number} assignment`);
        
        // 2. Remove from warmup queue (mark all phases as skipped)
        const skipWarmupPhasesQuery = `
          UPDATE account_warmup_phases 
          SET 
            status = 'skipped',
            completed_at = NOW(),
            updated_at = NOW()
          WHERE account_id = $1
          AND status IN ('pending', 'available', 'in_progress');
        `;
        
        const warmupResult = await client.query(skipWarmupPhasesQuery, [account.id]);
        const phasesSkipped = warmupResult.rowCount || 0;
        cleanedWarmupPhases += phasesSkipped;
        
        if (phasesSkipped > 0) {
          console.log(`  ✅ Skipped ${phasesSkipped} warmup phases`);
        }
        
        // 3. Release proxy if still assigned
        if (account.proxy_id) {
          const releaseProxyQuery = `
            UPDATE accounts 
            SET 
              proxy_id = NULL,
              proxy_assigned_at = NULL,
              updated_at = NOW()
            WHERE id = $1;
          `;
          
          await client.query(releaseProxyQuery, [account.id]);
          console.log(`  ✅ Released proxy assignment`);
        }
        
        cleanedAccounts++;
        
      } catch (error) {
        console.error(`  ❌ Failed to clean up ${account.username}:`, error.message);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n📈 Cleanup Summary:');
    console.log(`  ✅ Cleaned up accounts: ${cleanedAccounts}`);
    console.log(`  ✅ Skipped warmup phases: ${cleanedWarmupPhases}`);
    console.log(`  ✅ Freed containers: ${cleanedAccounts}`);
    
    // Verify the cleanup
    console.log('\n🔍 Verifying cleanup...');
    
    const verifyQuery = `
      SELECT 
        id, 
        username, 
        container_number, 
        lifecycle_state,
        proxy_id
      FROM accounts 
      WHERE lifecycle_state = 'archived'
      AND (container_number IS NOT NULL OR proxy_id IS NOT NULL);
    `;
    
    const verifyResult = await client.query(verifyQuery);
    
    if (verifyResult.rows.length === 0) {
      console.log('✅ All archived accounts properly cleaned up!');
    } else {
      console.log(`⚠️  ${verifyResult.rows.length} archived accounts still have resources assigned:`);
      verifyResult.rows.forEach(account => {
        console.log(`  - ${account.username}: Container ${account.container_number}, Proxy ${account.proxy_id}`);
      });
    }
    
    // Check warmup queue cleanup
    const warmupQueueQuery = `
      SELECT COUNT(*) as count
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE a.lifecycle_state = 'archived'
      AND awp.status IN ('pending', 'available', 'in_progress');
    `;
    
    const queueResult = await client.query(warmupQueueQuery);
    const queueCount = queueResult.rows[0].count;
    
    if (queueCount === '0') {
      console.log('✅ Warmup queue properly cleaned up!');
    } else {
      console.log(`⚠️  ${queueCount} archived accounts still in warmup queue`);
    }
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('💥 Error during cleanup:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await fixContainer79Cleanup();
    console.log('\n🎉 Container cleanup completed successfully!');
  } catch (error) {
    console.error('💥 Container cleanup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixContainer79Cleanup };