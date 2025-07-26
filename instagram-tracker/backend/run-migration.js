/**
 * Run the first_automation_completed migration
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function runMigration() {
  try {
    console.log('🔄 Running first_automation_completed migration...');
    
    const migrationPath = path.join(__dirname, '../database/migrations/047-add-first-automation-completed.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the column was added
    const verifyQuery = `
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'accounts' AND column_name = 'first_automation_completed'
    `;
    
    const result = await pool.query(verifyQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ Column verification:', result.rows[0]);
    } else {
      console.log('❌ Column not found after migration');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();