// Reset atacadaodamodabarbalhace09 account - story_caption phase incorrectly completed before first_highlight
const { db } = require('./dist/database');

async function resetAccount() {
  try {
    console.log('🔄 Resetting atacadaodamodabarbalhace09 account...');
    
    const username = 'atacadaodamodabarbalhace09';
    
    // Reset the story_caption phase back to pending since it shouldn't have run
    const resetResult = await db.query(`
      UPDATE account_warmup_phases 
      SET status = 'pending',
          completed_at = NULL,
          started_at = NULL,
          bot_id = NULL,
          error_message = NULL,
          updated_at = NOW()
      WHERE account_id = (SELECT id FROM accounts WHERE username = $1)
      AND phase = 'story_caption'
    `, [username]);
    
    console.log(`✅ Reset story_caption phase (${resetResult.rowCount} rows affected)`);
    
    // Check the current status
    const phases = await db.query(`
      SELECT phase, status, available_at, completed_at
      FROM account_warmup_phases 
      WHERE account_id = (SELECT id FROM accounts WHERE username = $1)
      AND phase IN ('first_highlight', 'story_caption')
      ORDER BY phase_order
    `, [username]);
    
    console.log('\n📋 Current status:');
    phases.rows.forEach(p => {
      const availableTime = p.available_at ? new Date(p.available_at).toLocaleString() : 'NULL';
      const completedTime = p.completed_at ? new Date(p.completed_at).toLocaleString() : 'NULL';
      console.log(`  ${p.phase}: ${p.status}`);
      console.log(`    Available: ${availableTime}`);
      console.log(`    Completed: ${completedTime}`);
    });
    
    console.log('\n✅ Account reset complete!');
    console.log('📝 Next steps:');
    console.log('  1. first_highlight (ME) should be completed first');
    console.log('  2. story_caption is now disabled in the code');
    console.log('  3. Account will process first_highlight next');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting account:', error);
    process.exit(1);
  }
}

resetAccount();