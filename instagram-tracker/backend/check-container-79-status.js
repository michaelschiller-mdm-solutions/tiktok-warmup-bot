/**
 * Check the status of container 79 and investigate resource cleanup
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

async function checkContainer79Status() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking container 79 status and resource cleanup...');
    
    // Check if there are any accounts with container 79
    const accountsQuery = `
      SELECT 
        id, 
        username, 
        container_number, 
        lifecycle_state, 
        status,
        proxy_host,
        proxy_port,
        created_at,
        updated_at
      FROM accounts 
      WHERE container_number = 79
      ORDER BY updated_at DESC;
    `;
    
    const accountsResult = await client.query(accountsQuery);
    console.log(`\n📊 Accounts with container 79: ${accountsResult.rows.length}`);
    
    if (accountsResult.rows.length > 0) {
      accountsResult.rows.forEach(account => {
        console.log(`  - ${account.username} (ID: ${account.id})`);
        console.log(`    Lifecycle: ${account.lifecycle_state}`);
        console.log(`    Status: ${account.status}`);
        console.log(`    Proxy: ${account.proxy_host}:${account.proxy_port}`);
        console.log(`    Updated: ${account.updated_at}`);
        console.log('');
      });
    }
    
    // Check warmup queue for container 79
    const queueQuery = `
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
      WHERE a.container_number = 79
      AND awp.status IN ('pending', 'available', 'in_progress')
      ORDER BY awp.updated_at DESC;
    `;
    
    const queueResult = await client.query(queueQuery);
    console.log(`📊 Container 79 accounts in warmup queue: ${queueResult.rows.length}`);
    
    if (queueResult.rows.length > 0) {
      queueResult.rows.forEach(item => {
        console.log(`  - ${item.username} (ID: ${item.account_id})`);
        console.log(`    Phase: ${item.phase} (${item.status})`);
        console.log(`    Available at: ${item.available_at}`);
        console.log(`    Updated: ${item.updated_at}`);
        console.log('');
      });
    }
    
    // Check for any archived/invalid accounts that might still have container 79
    const archivedQuery = `
      SELECT 
        id, 
        username, 
        container_number, 
        lifecycle_state, 
        status,
        updated_at
      FROM accounts 
      WHERE container_number = 79
      AND lifecycle_state = 'archived'
      ORDER BY updated_at DESC;
    `;
    
    const archivedResult = await client.query(archivedQuery);
    console.log(`📊 Archived accounts with container 79: ${archivedResult.rows.length}`);
    
    if (archivedResult.rows.length > 0) {
      archivedResult.rows.forEach(account => {
        console.log(`  - ${account.username} (ID: ${account.id})`);
        console.log(`    Lifecycle: ${account.lifecycle_state}`);
        console.log(`    Status: ${account.status}`);
        console.log(`    Updated: ${account.updated_at}`);
        console.log('');
      });
    }
    
    // Check if container 79 should be freed up
    const allContainer79Query = `
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN lifecycle_state != 'archived' THEN 1 END) as active_accounts,
        COUNT(CASE WHEN lifecycle_state = 'archived' THEN 1 END) as archived_accounts
      FROM accounts 
      WHERE container_number = 79;
    `;
    
    const summaryResult = await client.query(allContainer79Query);
    const summary = summaryResult.rows[0];
    
    console.log('📈 Container 79 Summary:');
    console.log(`  Total accounts: ${summary.total_accounts}`);
    console.log(`  Active accounts: ${summary.active_accounts}`);
    console.log(`  Archived accounts: ${summary.archived_accounts}`);
    
    if (summary.active_accounts === '0' && summary.archived_accounts > '0') {
      console.log('\n⚠️  ISSUE FOUND: Container 79 has only archived accounts but is not freed up!');
      console.log('   This suggests the invalid button did not properly clean up resources.');
    } else if (summary.total_accounts === '0') {
      console.log('\n✅ Container 79 is properly cleaned up (no accounts assigned)');
    } else {
      console.log('\n🔍 Container 79 still has active accounts - this is expected');
    }
    
    // Check recent lifecycle changes for container 79
    console.log('\n🔍 Checking recent lifecycle changes...');
    const lifecycleQuery = `
      SELECT 
        a.id,
        a.username,
        a.container_number,
        a.lifecycle_state,
        a.updated_at
      FROM accounts a
      WHERE a.container_number = 79
      OR (a.container_number IS NULL AND a.updated_at > NOW() - INTERVAL '1 day')
      ORDER BY a.updated_at DESC
      LIMIT 10;
    `;
    
    const lifecycleResult = await client.query(lifecycleQuery);
    console.log('Recent account changes:');
    lifecycleResult.rows.forEach(account => {
      console.log(`  - ${account.username} (ID: ${account.id})`);
      console.log(`    Container: ${account.container_number || 'NULL'}`);
      console.log(`    Lifecycle: ${account.lifecycle_state}`);
      console.log(`    Updated: ${account.updated_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('💥 Error checking container 79 status:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await checkContainer79Status();
  } catch (error) {
    console.error('💥 Failed to check container status:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}