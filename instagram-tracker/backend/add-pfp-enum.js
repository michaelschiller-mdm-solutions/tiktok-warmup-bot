// Add profile_picture to the warmup_phase_type enum
const { db } = require('./dist/database');

(async () => {
  try {
    const client = await db.connect();
    
    console.log('🔄 Adding profile_picture to warmup_phase_type enum...');
    
    // Check if profile_picture is already in the enum
    const enumCheck = await client.query(`
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'profile_picture' 
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'warmup_phase_type')
    `);
    
    if (enumCheck.rows.length === 0) {
      // Add profile_picture to the enum
      await client.query(`ALTER TYPE warmup_phase_type ADD VALUE 'profile_picture'`);
      console.log('✅ Added profile_picture to warmup_phase_type enum');
    } else {
      console.log('✅ profile_picture already exists in warmup_phase_type enum');
    }
    
    // Verify the enum was updated
    const allEnums = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'warmup_phase_type')
      ORDER BY enumlabel
    `);
    
    console.log('\n✅ Available warmup phases:');
    allEnums.rows.forEach(row => {
      console.log(`  - ${row.enumlabel}`);
    });
    
    client.release();
    console.log('\n✅ Enum update completed successfully!');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Enum update failed:', err);
    process.exit(1);
  }
})();