/**
 * Quick script to check warmup pipeline status
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkWarmupStatus() {
  try {
    console.log('🔍 Checking warmup pipeline status...\n');

    // Check accounts in warmup
    const warmupQuery = `
      SELECT id, username, status, container_number, created_at 
      FROM accounts 
      WHERE status IN ('warmup', 'pending') 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const warmupResult = await pool.query(warmupQuery);
    console.log(`📊 Accounts in warmup pipeline: ${warmupResult.rows.length}`);
    warmupResult.rows.forEach(row => {
      console.log(`  - ${row.username} (${row.id}) - Status: ${row.status} - Container: ${row.container_number}`);
    });

    // Check all accounts
    const allQuery = `
      SELECT id, username, status, container_number, created_at 
      FROM accounts 
      ORDER BY created_at DESC 
      LIMIT 10
    `;
    
    const allResult = await pool.query(allQuery);
    console.log(`\n📋 All recent accounts: ${allResult.rows.length}`);
    allResult.rows.forEach(row => {
      console.log(`  - ${row.username} (${row.id}) - Status: ${row.status} - Container: ${row.container_number}`);
    });

    // Check if bot_ready_accounts view exists
    try {
      const readyQuery = `SELECT * FROM bot_ready_accounts LIMIT 1`;
      const readyResult = await pool.query(readyQuery);
      console.log(`\n✅ bot_ready_accounts view exists`);
    } catch (error) {
      console.log(`\n❌ bot_ready_accounts view does not exist: ${error.message}`);
    }

    // Check phase status for a specific account
    if (warmupResult.rows.length > 0) {
      const accountId = warmupResult.rows[0].id;
      const phaseQuery = `
        SELECT phase, status, assigned_at, completed_at, cooldown_until
        FROM warmup_phases 
        WHERE account_id = $1 
        ORDER BY assigned_at DESC
      `;
      
      const phaseResult = await pool.query(phaseQuery, [accountId]);
      console.log(`\n🔄 Phase status for ${warmupResult.rows[0].username}:`);
      phaseResult.rows.forEach(row => {
        console.log(`  - ${row.phase}: ${row.status} (Cooldown until: ${row.cooldown_until})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking warmup status:', error);
  } finally {
    await pool.end();
  }
}

checkWarmupStatus();