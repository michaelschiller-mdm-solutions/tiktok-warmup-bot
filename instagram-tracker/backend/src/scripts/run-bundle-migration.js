const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

console.log('Starting bundle migration script...');

// Database connection (using same config as main app)
const db = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'instagram_tracker',
  user: 'admin',
  password: 'password123',
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  console.log('Testing database connection...');
  try {
    const client = await db.connect();
    const result = await client.query('SELECT NOW()');
    console.log('✅ Database connection successful:', result.rows[0]);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

async function runMigration() {
  console.log('🔄 Starting content bundle migration...');
  
  if (!(await testConnection())) {
    console.error('Cannot proceed without database connection');
    return;
  }

  const client = await db.connect();
  try {
    // Check if tables already exist
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('content_bundles', 'bundle_content_assignments', 'model_bundle_assignments')
    `);
    
    if (existingTables.rows.length > 0) {
      console.log('📋 Some bundle tables already exist:');
      existingTables.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));
      
      if (existingTables.rows.length === 3) {
        console.log('✅ All bundle tables already exist. Migration not needed.');
        return;
      }
    }

    // Read migration file
    const migrationPath = path.join(__dirname, '..', '..', 'database', 'migrations', '999-add-content-bundle-system.sql');
    console.log(`Reading migration from: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log(`Migration SQL loaded (${migrationSQL.length} characters)`);

    // Execute migration
    console.log('Executing migration...');
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    console.log('✅ Migration executed successfully!');

    // Verify results
    const newTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('content_bundles', 'bundle_content_assignments', 'model_bundle_assignments')
      ORDER BY table_name
    `);

    console.log('📋 Verification - Created tables:');
    newTables.rows.forEach(row => console.log(`   ✓ ${row.table_name}`));

    // Check bundle count
    const bundleCount = await client.query('SELECT COUNT(*) as count FROM content_bundles');
    console.log(`📦 Default bundles created: ${bundleCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) console.error('Details:', error.detail);
    try {
      await client.query('ROLLBACK');
      console.log('Transaction rolled back');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError.message);
    }
  } finally {
    client.release();
    await db.end();
    console.log('Database connection closed');
  }
}

// Run the migration
runMigration().catch(console.error); 