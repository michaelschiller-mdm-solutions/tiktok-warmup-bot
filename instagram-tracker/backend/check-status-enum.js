/**
 * Check the warmup_phase_status enum values
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkStatusEnum() {
  try {
    console.log('🔍 Checking warmup_phase_status enum values...');
    
    // Check if enum exists and get its values
    const enumQuery = `
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'warmup_phase_status'
      )
      ORDER BY enumsortorder
    `;
    
    const enumResult = await pool.query(enumQuery);
    
    if (enumResult.rows.length > 0) {
      console.log('✅ warmup_phase_status enum values:');
      enumResult.rows.forEach(row => {
        console.log(`  - '${row.enumlabel}'`);
      });
    } else {
      console.log('❌ warmup_phase_status enum not found');
      
      // Check column type
      const columnQuery = `
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns 
        WHERE table_name = 'account_warmup_phases' AND column_name = 'status'
      `;
      
      const columnResult = await pool.query(columnQuery);
      
      if (columnResult.rows.length > 0) {
        console.log('Column info:', columnResult.rows[0]);
      }
    }
    
    // Check current status values in use
    console.log('\n📊 Current status values in database:');
    
    const currentStatusQuery = `
      SELECT status, COUNT(*) as count
      FROM account_warmup_phases 
      GROUP BY status
      ORDER BY count DESC
    `;
    
    const currentStatusResult = await pool.query(currentStatusQuery);
    
    currentStatusResult.rows.forEach(row => {
      console.log(`  - '${row.status}': ${row.count} records`);
    });

  } catch (error) {
    console.error('💥 Check failed:', error);
  } finally {
    await pool.end();
  }
}

checkStatusEnum();