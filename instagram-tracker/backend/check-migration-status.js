// Check migration status for the failing migration
const { db } = require('./dist/database');

(async () => {
  try {
    const client = await db.connect();
    
    // Check migration history for this specific migration
    const result = await client.query('SELECT * FROM migration_history WHERE migration_name = $1', ['050-make-new-highlight-optional']);
    console.log('Migration history for 050-make-new-highlight-optional:');
    console.log(result.rows);
    
    // Check if migration table exists and has any locks
    const tableCheck = await client.query(`
      SELECT schemaname, tablename, tableowner 
      FROM pg_tables 
      WHERE tablename = 'migration_history'
    `);
    console.log('\nMigration table info:');
    console.log(tableCheck.rows);
    
    // Check for any active connections
    const connections = await client.query(`
      SELECT pid, state, query 
      FROM pg_stat_activity 
      WHERE datname = current_database() 
      AND state = 'active'
    `);
    console.log('\nActive connections:');
    console.log(connections.rows);
    
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();