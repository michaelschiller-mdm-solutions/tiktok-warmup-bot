// Reset the stuck totoroaudpp account that's been running for 23+ hours
const { db } = require('./dist/database');

async function resetStuckAccount() {
  try {
    console.log('🔧 Resetting stuck totoroaudpp account...');
    
    // Check current status
    const currentStatus = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.started_at,
        EXTRACT(EPOCH FROM (NOW() - awp.started_at)) / 60 as minutes_running
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.username = 'totoroaudpp'
      AND awp.status = 'in_progress'
    `);
    
    if (currentStatus.rowCount === 0) {
      console.log('✅ No stuck processes found for totoroaudpp');
      process.exit(0);
    }
    
    const stuck = currentStatus.rows[0];
    console.log(`📊 Found stuck process:`);
    console.log(`   Account: ${stuck.username}`);
    console.log(`   Phase: ${stuck.phase}`);
    console.log(`   Running for: ${Math.round(stuck.minutes_running)} minutes (${Math.round(stuck.minutes_running/60)} hours)`);
    console.log(`   Started at: ${stuck.started_at}`);
    
    // Reset the stuck phase back to available
    const resetResult = await db.query(`
      UPDATE account_warmup_phases 
      SET 
        status = 'available',
        started_at = NULL,
        bot_id = NULL,
        error_message = 'Reset due to stuck process (running 23+ hours)',
        updated_at = NOW()
      WHERE account_id = (SELECT id FROM accounts WHERE username = 'totoroaudpp')
      AND status = 'in_progress'
      RETURNING phase
    `);
    
    console.log(`✅ Reset ${resetResult.rowCount} stuck phase(s) for totoroaudpp`);
    
    // Verify the reset
    const verifyResult = await db.query(`
      SELECT 
        COUNT(CASE WHEN awp.status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN awp.status = 'available' THEN 1 END) as available_count
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE a.lifecycle_state = 'warmup'
    `);
    
    const verify = verifyResult.rows[0];
    console.log(`\n📊 System status after reset:`);
    console.log(`   In Progress: ${verify.in_progress_count} (should be 0)`);
    console.log(`   Available: ${verify.available_count} (ready for processing)`);
    
    if (verify.in_progress_count === '0') {
      console.log('\n🚀 SUCCESS: Queue is now unblocked!');
      console.log('✅ Automation system can now process the next available account');
      console.log('💡 The WarmupQueueService should automatically pick up the next account in ~30 seconds');
    } else {
      console.log('\n⚠️ WARNING: Other accounts may still be stuck in progress');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting stuck account:', error);
    process.exit(1);
  }
}

resetStuckAccount();