// Remove all story_caption phases temporarily from the database
const { db } = require('./dist/database');

async function removeStoryCaptionPhases() {
  try {
    console.log('🧹 Removing story_caption phases temporarily...');
    
    // First, check how many story_caption phases exist
    const countResult = await db.query(`
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count
      FROM account_warmup_phases 
      WHERE phase = 'story_caption'
    `);
    
    const counts = countResult.rows[0];
    console.log(`📊 Found ${counts.total_count} story_caption phases:`);
    console.log(`  - Available: ${counts.available_count}`);
    console.log(`  - Completed: ${counts.completed_count}`);
    console.log(`  - In Progress: ${counts.in_progress_count}`);
    
    // Show which accounts will be affected
    const affectedAccounts = await db.query(`
      SELECT 
        a.username,
        awp.status,
        awp.available_at,
        awp.completed_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.phase = 'story_caption'
      ORDER BY a.username
    `);
    
    console.log(`\n📋 Affected accounts:`);
    affectedAccounts.rows.forEach(row => {
      const statusInfo = row.status === 'available' ? 
        `available at ${row.available_at}` : 
        row.status === 'completed' ? 
        `completed at ${row.completed_at}` : 
        row.status;
      console.log(`  - ${row.username}: ${statusInfo}`);
    });
    
    // Remove all story_caption phases
    const deleteResult = await db.query(`
      DELETE FROM account_warmup_phases 
      WHERE phase = 'story_caption'
      RETURNING account_id
    `);
    
    console.log(`\n✅ Successfully removed ${deleteResult.rowCount} story_caption phases`);
    
    // Verify removal
    const verifyResult = await db.query(`
      SELECT COUNT(*) as remaining_count
      FROM account_warmup_phases 
      WHERE phase = 'story_caption'
    `);
    
    if (verifyResult.rows[0].remaining_count === '0') {
      console.log('✅ Verification: No story_caption phases remain in database');
    } else {
      console.log(`⚠️ Warning: ${verifyResult.rows[0].remaining_count} story_caption phases still exist`);
    }
    
    console.log('\n🎯 Result: story_caption automation errors should now be resolved');
    console.log('💡 Note: This is temporary - story_caption can be re-enabled later when dependencies are fixed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error removing story_caption phases:', error);
    process.exit(1);
  }
}

removeStoryCaptionPhases();