/**
 * Check database schema and tables
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkDatabaseSchema() {
  try {
    console.log('🔍 Checking database schema...\n');

    // List all tables
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    console.log(`📊 Tables in database: ${tablesResult.rows.length}`);
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check accounts table structure
    const accountsStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      ORDER BY ordinal_position
    `;
    
    const accountsStructure = await pool.query(accountsStructureQuery);
    console.log(`\n📋 Accounts table structure:`);
    accountsStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check if warmup_phases table exists
    const warmupPhasesQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'warmup_phases' 
      ORDER BY ordinal_position
    `;
    
    const warmupPhasesResult = await pool.query(warmupPhasesQuery);
    if (warmupPhasesResult.rows.length > 0) {
      console.log(`\n🔄 Warmup phases table structure:`);
      warmupPhasesResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log(`\n❌ warmup_phases table does not exist`);
    }

    // Check for content-related tables
    const contentTablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%content%'
      ORDER BY table_name
    `;
    
    const contentTablesResult = await pool.query(contentTablesQuery);
    console.log(`\n📁 Content-related tables: ${contentTablesResult.rows.length}`);
    contentTablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

  } catch (error) {
    console.error('❌ Error checking database schema:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseSchema();