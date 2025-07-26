/**
 * Check table structures for warmup system
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkTableStructures() {
  try {
    console.log('🔍 Checking warmup table structures...\n');

    // Check warmup_content_assignments structure
    const wcaQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'warmup_content_assignments' 
      ORDER BY ordinal_position
    `;
    
    const wcaResult = await pool.query(wcaQuery);
    console.log(`📋 warmup_content_assignments table structure:`);
    wcaResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check account_warmup_phases structure
    const awpQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'account_warmup_phases' 
      ORDER BY ordinal_position
    `;
    
    const awpResult = await pool.query(awpQuery);
    console.log(`\n🔄 account_warmup_phases table structure:`);
    awpResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check bot_ready_accounts view structure
    const braQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'bot_ready_accounts' 
      ORDER BY ordinal_position
    `;
    
    const braResult = await pool.query(braQuery);
    console.log(`\n🤖 bot_ready_accounts view structure:`);
    braResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Sample data from warmup_content_assignments
    const sampleWcaQuery = `SELECT * FROM warmup_content_assignments LIMIT 3`;
    const sampleWcaResult = await pool.query(sampleWcaQuery);
    console.log(`\n📁 Sample warmup_content_assignments data: ${sampleWcaResult.rows.length} rows`);
    sampleWcaResult.rows.forEach((row, index) => {
      console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
    });

    // Sample data from account_warmup_phases
    const sampleAwpQuery = `SELECT * FROM account_warmup_phases LIMIT 3`;
    const sampleAwpResult = await pool.query(sampleAwpQuery);
    console.log(`\n🔄 Sample account_warmup_phases data: ${sampleAwpResult.rows.length} rows`);
    sampleAwpResult.rows.forEach((row, index) => {
      console.log(`  Row ${index + 1}:`, JSON.stringify(row, null, 2));
    });

  } catch (error) {
    console.error('❌ Error checking table structures:', error);
  } finally {
    await pool.end();
  }
}

checkTableStructures();