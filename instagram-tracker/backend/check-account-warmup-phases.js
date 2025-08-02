/**
 * Check account_warmup_phases table structure and find stuck accounts
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

async function checkAccountWarmupPhases() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking account_warmup_phases table structure...');
    
    // Check table structure
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'account_warmup_phases'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await client.query(columnsQuery);
    console.log('\n📊 account_warmup_phases table columns:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check for accounts in new_highlight phase
    const newHighlightQuery = `
      SELECT 
        awp.account_id,
        a.username,
        awp.phase,
        awp.status,
        awp.available_at,
        awp.created_at,
        awp.updated_at
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.phase = 'new_highlight'
      ORDER BY a.username;
    `;
    
    const newHighlightResult = await client.query(newHighlightQuery);
    console.log(`\n📊 Accounts in new_highlight phase: ${newHighlightResult.rows.length}`);
    
    if (newHighlightResult.rows.length > 0) {
      console.log('\nStuck accounts:');
      newHighlightResult.rows.forEach(row => {
        console.log(`  - ${row.username} (ID: ${row.account_id})`);
        console.log(`    Status: ${row.status}`);
        console.log(`    Available at: ${row.available_at}`);
        console.log(`    Updated: ${row.updated_at}`);
        console.log('');
      });
    }
    
    // Also check what phases exist
    const phasesQuery = `
      SELECT DISTINCT phase, COUNT(*) as count
      FROM account_warmup_phases
      GROUP BY phase
      ORDER BY phase;
    `;
    
    const phasesResult = await client.query(phasesQuery);
    console.log('\n📊 All warmup phases in use:');
    phasesResult.rows.forEach(row => {
      console.log(`  - ${row.phase}: ${row.count} accounts`);
    });
    
  } catch (error) {
    console.error('💥 Error checking account_warmup_phases:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await checkAccountWarmupPhases();
  } catch (error) {
    console.error('💥 Failed to check account_warmup_phases:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}