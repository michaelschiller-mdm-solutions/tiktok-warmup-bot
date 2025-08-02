// Test the improved cleanup logic for orphaned processes
const { db } = require('./dist/database');

async function testImprovedCleanup() {
  try {
    console.log('🧪 TESTING IMPROVED CLEANUP LOGIC');
    console.log('=================================\n');
    
    // 1. Check current state
    console.log('1. 📊 CURRENT STATE:');
    const currentState = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.started_at,
        awp.updated_at,
        CASE 
          WHEN awp.started_at IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - awp.started_at)) / 60
          ELSE NULL
        END as minutes_running
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'in_progress'
      ORDER BY awp.started_at DESC
    `);
    
    if (currentState.rowCount === 0) {
      console.log('✅ No accounts currently in progress');
    } else {
      console.log(`Found ${currentState.rowCount} accounts in progress:`);
      currentState.rows.forEach(row => {
        const runningTime = row.minutes_running ? 
          `${Math.round(row.minutes_running)} minutes` : 
          'unknown duration';
        console.log(`  - ${row.username}: ${row.phase} (${runningTime})`);
      });
    }
    
    // 2. Simulate the new cleanup logic
    console.log('\n2. 🧹 SIMULATING NEW CLEANUP LOGIC:');
    console.log('(This is what happens on server startup)');
    
    // Show what would be reset
    const wouldReset = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.started_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'in_progress'
    `);
    
    if (wouldReset.rowCount === 0) {
      console.log('✅ No orphaned processes to clean up');
    } else {
      console.log(`Would reset ${wouldReset.rowCount} orphaned processes:`);
      wouldReset.rows.forEach(row => {
        console.log(`  - Would reset: ${row.username} (${row.phase})`);
      });
      
      // Actually perform the cleanup (same logic as in WarmupQueueService)
      console.log('\n🔄 Performing cleanup...');
      const resetResult = await db.query(`
        UPDATE account_warmup_phases 
        SET 
          status = 'available',
          started_at = NULL,
          bot_id = NULL,
          error_message = 'Reset by test cleanup - orphaned process',
          updated_at = NOW()
        WHERE status = 'in_progress'
        RETURNING account_id, phase
      `);
      
      console.log(`✅ Reset ${resetResult.rowCount} orphaned processes`);
    }
    
    // 3. Verify cleanup worked
    console.log('\n3. ✅ VERIFICATION:');
    const afterCleanup = await db.query(`
      SELECT COUNT(*) as in_progress_count
      FROM account_warmup_phases 
      WHERE status = 'in_progress'
    `);
    
    const readyCount = await db.query(`
      SELECT COUNT(*) as available_count
      FROM account_warmup_phases 
      WHERE status = 'available'
      AND available_at <= NOW()
    `);
    
    console.log(`In progress after cleanup: ${afterCleanup.rows[0].in_progress_count}`);
    console.log(`Ready for processing: ${readyCount.rows[0].available_count}`);
    
    if (afterCleanup.rows[0].in_progress_count === '0') {
      console.log('✅ SUCCESS: All orphaned processes cleaned up');
      console.log('🚀 Automation queue should now be unblocked');
    } else {
      console.log('⚠️ WARNING: Some processes still in progress');
    }
    
    // 4. Show next accounts that would be processed
    console.log('\n4. 🎯 NEXT ACCOUNTS FOR PROCESSING:');
    const nextAccounts = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.available_at,
        CASE 
          WHEN awp.available_at <= NOW() THEN 'READY NOW'
          ELSE CONCAT('Available in ', ROUND(EXTRACT(EPOCH FROM (awp.available_at - NOW())) / 60), ' minutes')
        END as availability
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'available'
      ORDER BY awp.available_at ASC
      LIMIT 5
    `);
    
    nextAccounts.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.phase} (${row.availability})`);
    });
    
    console.log('\n🎉 IMPROVED CLEANUP TEST COMPLETE!');
    console.log('💡 The WarmupQueueService should now properly clean up orphaned processes on startup');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing improved cleanup:', error);
    process.exit(1);
  }
}

testImprovedCleanup();