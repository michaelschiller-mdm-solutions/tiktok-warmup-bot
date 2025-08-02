/**
 * Check warmup-related database tables and schema
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

async function checkWarmupTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database tables...');
    
    // Check all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%warmup%'
      ORDER BY table_name;
    `;
    
    const tablesResult = await client.query(tablesQuery);
    console.log('\n📊 Warmup-related tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check accounts table structure for warmup-related columns
    const accountsColumnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      AND (column_name LIKE '%warmup%' OR column_name LIKE '%phase%')
      ORDER BY column_name;
    `;
    
    const accountsResult = await client.query(accountsColumnsQuery);
    console.log('\n📊 Accounts table warmup columns:');
    accountsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check if there's a warmup_phases table
    const warmupPhasesQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'warmup_phases'
      ORDER BY column_name;
    `;
    
    try {
      const warmupPhasesResult = await client.query(warmupPhasesQuery);
      console.log('\n📊 warmup_phases table columns:');
      warmupPhasesResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    } catch (error) {
      console.log('\n❌ warmup_phases table does not exist');
    }
    
    // Check for accounts currently in new_highlight phase
    const newHighlightQuery = `
      SELECT 
        id, username, current_warmup_phase, warmup_phase_status
      FROM accounts 
      WHERE current_warmup_phase = 'new_highlight'
      ORDER BY username;
    `;
    
    try {
      const newHighlightResult = await client.query(newHighlightQuery);
      console.log(`\n📊 Accounts in new_highlight phase: ${newHighlightResult.rows.length}`);
      newHighlightResult.rows.forEach(row => {
        console.log(`  - ${row.username} (ID: ${row.id}) - Status: ${row.warmup_phase_status}`);
      });
    } catch (error) {
      console.log('\n❌ Could not query accounts for new_highlight phase:', error.message);
    }
    
  } catch (error) {
    console.error('💥 Error checking tables:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await checkWarmupTables();
  } catch (error) {
    console.error('💥 Failed to check tables:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}