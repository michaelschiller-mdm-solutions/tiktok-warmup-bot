// Fix the failed migration by removing it from history and re-running
const { db } = require('./dist/database');

(async () => {
  try {
    const client = await db.connect();
    
    console.log('🔍 Checking current migration status...');
    
    // Check current status
    const currentStatus = await client.query('SELECT * FROM migration_history WHERE migration_name = $1', ['050-make-new-highlight-optional']);
    console.log('Current status:', currentStatus.rows);
    
    if (currentStatus.rows.length > 0 && !currentStatus.rows[0].success) {
      console.log('🧹 Removing failed migration record...');
      await client.query('DELETE FROM migration_history WHERE migration_name = $1 AND success = false', ['050-make-new-highlight-optional']);
      console.log('✅ Failed migration record removed');
    }
    
    // Now manually run the migration
    console.log('🔄 Manually applying migration...');
    
    try {
      await client.query('BEGIN');
      
      // Read and execute the migration SQL
      const fs = require('fs');
      const path = require('path');
      const migrationPath = path.join(__dirname, '../database/migrations/050-make-new-highlight-optional.sql');
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      await client.query(migrationSQL);
      
      // Record successful migration
      await client.query("SELECT record_migration($1, true, NULL)", ['050-make-new-highlight-optional']);
      
      await client.query('COMMIT');
      console.log('✅ Migration applied successfully!');
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('❌ Migration failed again:', err);
      throw err;
    }
    
    // Verify the migration was recorded
    const finalStatus = await client.query('SELECT * FROM migration_history WHERE migration_name = $1', ['050-make-new-highlight-optional']);
    console.log('Final status:', finalStatus.rows);
    
    client.release();
    console.log('🎉 Migration fix completed!');
    process.exit(0);
    
  } catch (err) {
    console.error('Error fixing migration:', err);
    process.exit(1);
  }
})();