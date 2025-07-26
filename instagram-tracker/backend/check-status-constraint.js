/**
 * Check what status values are allowed for accounts
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkStatusConstraint() {
  try {
    // Check constraint information
    const constraintQuery = `
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = 'accounts' 
      AND tc.constraint_type = 'CHECK'
      AND tc.constraint_name LIKE '%status%'
    `;
    
    const constraintResult = await pool.query(constraintQuery);
    console.log('📋 Status constraints:');
    constraintResult.rows.forEach(row => {
      console.log(`  - ${row.constraint_name}: ${row.check_clause}`);
    });

    // Check current status values in use
    const statusQuery = `
      SELECT DISTINCT status 
      FROM accounts 
      WHERE status IS NOT NULL
      ORDER BY status
    `;
    
    const statusResult = await pool.query(statusQuery);
    console.log('\n📊 Current status values in use:');
    statusResult.rows.forEach(row => {
      console.log(`  - ${row.status}`);
    });

    // Check if there's an enum type for status
    const enumQuery = `
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid 
        FROM pg_type 
        WHERE typname = 'account_status'
      )
      ORDER BY enumsortorder
    `;
    
    const enumResult = await pool.query(enumQuery);
    if (enumResult.rows.length > 0) {
      console.log('\n🏷️  Account status enum values:');
      enumResult.rows.forEach(row => {
        console.log(`  - ${row.enumlabel}`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking status constraint:', error);
  } finally {
    await pool.end();
  }
}

checkStatusConstraint();