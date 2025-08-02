// Run the simple profile picture phase migration
const { db } = require('./dist/database');
const fs = require('fs');
const path = require('path');

(async () => {
  try {
    const client = await db.connect();
    
    console.log('🔄 Running simple profile picture phase migration...');
    
    // Read and execute the migration
    const migrationPath = path.join(__dirname, '../database/migrations/051-add-profile-picture-phase-simple.sql');
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
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'warmup_phase_type')
      ORDER BY enumlabel
    `);
    
    console.log('✅ Available warmup phases:');
    enumCheck.rows.forEach(row => {
      console.log(`  - ${row.enumlabel}`);
    });
    
    // Show sample profile picture phases
    const samplePhases = await client.query(`
      SELECT 
        awp.account_id,
        a.username,
        awp.phase_order,
        awp.status,
        awp.assigned_content_id,
        cc.filename
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
      WHERE awp.phase = 'profile_picture'
      ORDER BY a.username
      LIMIT 5
    `);
    
    console.log('\n✅ Sample profile picture phases:');
    samplePhases.rows.forEach(row => {
      console.log(`  - ${row.username}: order ${row.phase_order}, status ${row.status}, content: ${row.filename || 'none'}`);
    });
    
    client.release();
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
})();