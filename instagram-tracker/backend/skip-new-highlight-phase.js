/**
 * Skip new_highlight phase for stuck accounts
 * 
 * This script simply marks the new_highlight phase as skipped for all accounts
 * that are stuck in it, allowing them to proceed to the next phase naturally.
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

async function skipNewHighlightPhase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for accounts stuck in new_highlight phase...');
    
    // Find all accounts currently in new_highlight phase
    const stuckAccountsQuery = `
      SELECT 
        awp.account_id,
        a.username,
        awp.status
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.phase = 'new_highlight'
      AND awp.status IN ('pending', 'available', 'in_progress')
      ORDER BY a.username;
    `;
    
    const stuckResult = await client.query(stuckAccountsQuery);
    const stuckAccounts = stuckResult.rows;
    
    if (stuckAccounts.length === 0) {
      console.log('✅ No accounts found stuck in new_highlight phase');
      return;
    }
    
    console.log(`📊 Found ${stuckAccounts.length} accounts stuck in new_highlight phase:`);
    stuckAccounts.forEach(account => {
      console.log(`  - ${account.username} (ID: ${account.account_id}) - Status: ${account.status}`);
    });
    
    console.log('\n🔄 Skipping new_highlight phase for stuck accounts...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Update all stuck accounts to skip the new_highlight phase
    const skipQuery = `
      UPDATE account_warmup_phases 
      SET 
        status = 'skipped',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE phase = 'new_highlight'
      AND status IN ('pending', 'available', 'in_progress');
    `;
    
    const result = await client.query(skipQuery);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log(`✅ Successfully skipped new_highlight phase for ${result.rowCount} accounts`);
    
    console.log('\n🎯 Next steps:');
    console.log('  1. The warmup system will now skip new_highlight phase for these accounts');
    console.log('  2. Accounts will proceed to the next available phase in their warmup sequence');
    console.log('  3. The missing script file issue is bypassed');
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    const verifyQuery = `
      SELECT 
        a.username,
        awp.status
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.phase = 'new_highlight'
      AND a.id = ANY($1)
      ORDER BY a.username;
    `;
    
    const accountIds = stuckAccounts.map(acc => acc.account_id);
    const verifyResult = await client.query(verifyQuery, [accountIds]);
    
    console.log('Updated new_highlight phase status:');
    verifyResult.rows.forEach(account => {
      console.log(`  - ${account.username}: ${account.status}`);
    });
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('💥 Error during migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await skipNewHighlightPhase();
    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { skipNewHighlightPhase };