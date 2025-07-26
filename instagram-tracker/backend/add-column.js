const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function addColumn() {
  try {
    console.log('Adding first_automation_completed column...');
    
    // Add the column
    await pool.query(`
      ALTER TABLE accounts 
      ADD COLUMN IF NOT EXISTS first_automation_completed BOOLEAN DEFAULT FALSE
    `);
    
    console.log('✅ Column added');
    
    // Set all existing accounts to false
    const updateResult = await pool.query(`
      UPDATE accounts 
      SET first_automation_completed = FALSE 
      WHERE first_automation_completed IS NULL
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} accounts`);
    
    // Verify
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      AND column_name = 'first_automation_completed'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Column verified:', verifyResult.rows[0]);
    } else {
      console.log('❌ Column not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addColumn();