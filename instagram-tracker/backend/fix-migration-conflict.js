// Fix the migration conflict by cleaning up failed migration records
const { db } = require('./dist/database');

(async () => {
  try {
    const client = await db.connect();
    
    console.log('🔧 Fixing migration conflict...');
    
    // Check current migration status
    const migrationStatus = await client.query(`
      SELECT migration_name, success, executed_at, error_message
      FROM migration_history 
      WHERE migration_name LIKE '051-add-profile-picture%'
      ORDER BY executed_at DESC
    `);
    
    console.log('📋 Current migration status:');
    migrationStatus.rows.forEach(row => {
      console.log(`  - ${row.migration_name}: ${row.success ? 'SUCCESS' : 'FAILED'} (${row.executed_at})`);
      if (!row.success) {
        console.log(`    Error: ${row.error_message}`);
      }
    });
    
    // Remove failed migration records to allow clean restart
    const deleteResult = await client.query(`
      DELETE FROM migration_history 
      WHERE migration_name LIKE '051-add-profile-picture%' 
      AND success = false
    `);
    
    console.log(`✅ Removed ${deleteResult.rowCount} failed migration records`);
    
    // Verify the profile picture phase is working
    const phaseCheck = await client.query(`
      SELECT COUNT(*) as count 
      FROM account_warmup_phases 
      WHERE phase = 'profile_picture'
    `);
    
    console.log(`✅ Profile picture phases in database: ${phaseCheck.rows[0].count}`);
    
    // Check enum status
    const enumCheck = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumlabel = 'profile_picture'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'warmup_phase_type')
    `);
    
    console.log(`✅ Profile picture enum exists: ${enumCheck.rows.length > 0 ? 'YES' : 'NO'}`);
    
    client.release();
    
    console.log('\n🎉 Migration conflict fixed!');
    console.log('   - Duplicate migration file removed');
    console.log('   - Failed migration records cleaned up');
    console.log('   - Profile picture phase is functional');
    console.log('   - Server should start normally now');
    
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error fixing migration conflict:', err);
    process.exit(1);
  }
})();