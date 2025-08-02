// Run the profile picture phase migration
const { db } = require('./dist/database');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const client = await db.connect();
    
    console.log('🔄 Running profile picture phase migration...');
    
    // Read and execute the migration
    const migrationPath = path.join(__dirname, '../database/migrations/051-add-profile-picture-phase.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('✅ Profile picture phase migration completed successfully!');
    
    // Verify the migration worked
    const phaseCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM account_warmup_phases 
      WHERE phase = 'profile_picture'
    `);
    
    console.log(`✅ Profile picture phases created: ${phaseCheck.rows[0].count}`);
    
    // Check enum was updated
    const enumCheck = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'warmup_phase_enum')
      ORDER BY enumlabel
    `);
    
    console.log('✅ Available warmup phases:');
    enumCheck.rows.forEach(row => {
      console.log(`  - ${row.enumlabel}`);
    });
    
    client.release();
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
})();