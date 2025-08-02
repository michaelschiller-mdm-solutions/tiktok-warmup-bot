// Diagnose why multiple automation processes are running simultaneously
const { db } = require('./dist/database');

async function diagnoseDuplicateProcesses() {
  try {
    console.log('🔍 Diagnosing duplicate automation processes...');
    
    console.log('\n1. Current accounts in progress:');
    const inProgress = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.bot_id,
        awp.started_at,
        awp.updated_at,
        EXTRACT(EPOCH FROM (NOW() - awp.started_at)) as seconds_running
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'in_progress'
      ORDER BY awp.started_at DESC
    `);
    
    console.log(`Found ${inProgress.rowCount} accounts in progress:`);
    inProgress.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.phase}`);
      console.log(`    Started: ${row.started_at}`);
      console.log(`    Running for: ${Math.round(row.seconds_running)} seconds`);
      console.log(`    Bot ID: ${row.bot_id}`);
    });
    
    console.log('\n2. Recent phase updates (last 5 minutes):');
    const recentUpdates = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.started_at,
        awp.updated_at,
        awp.bot_id
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.updated_at > NOW() - INTERVAL '5 minutes'
      ORDER BY awp.updated_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${recentUpdates.rowCount} recent updates:`);
    recentUpdates.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.phase} → ${row.status}`);
      console.log(`    Updated: ${row.updated_at}`);
      console.log(`    Bot ID: ${row.bot_id}`);
    });
    
    console.log('\n3. Checking for race condition indicators:');
    
    // Check if the same account has multiple recent status changes
    const raceConditions = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        COUNT(*) as update_count,
        MIN(awp.updated_at) as first_update,
        MAX(awp.updated_at) as last_update
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.updated_at > NOW() - INTERVAL '2 minutes'
      GROUP BY a.username, awp.phase
      HAVING COUNT(*) > 1
      ORDER BY update_count DESC
    `);
    
    if (raceConditions.rowCount > 0) {
      console.log('⚠️ RACE CONDITIONS DETECTED:');
      raceConditions.rows.forEach(row => {
        console.log(`  - ${row.username}: ${row.phase} updated ${row.update_count} times`);
        console.log(`    From: ${row.first_update} to ${row.last_update}`);
      });
    } else {
      console.log('✅ No obvious race conditions in recent updates');
    }
    
    console.log('\n4. Checking queue service behavior:');
    console.log('💡 Analysis:');
    
    if (inProgress.rowCount > 1) {
      console.log('❌ CRITICAL: Multiple accounts in progress simultaneously!');
      console.log('   This violates the single-bot constraint');
      console.log('   Likely causes:');
      console.log('   - Multiple WarmupQueueService instances running');
      console.log('   - Race condition in isAnyAccountInProgress() check');
      console.log('   - Timer intervals overlapping');
    } else if (inProgress.rowCount === 1) {
      const account = inProgress.rows[0];
      if (account.seconds_running > 300) { // 5 minutes
        console.log('⚠️ Account has been running for a long time');
        console.log('   This might indicate a stuck process');
      } else {
        console.log('✅ Single account in progress (as expected)');
        console.log('   But logs show duplicate processing - investigate timer logic');
      }
    } else {
      console.log('✅ No accounts currently in progress');
      console.log('   But logs show processing - check for timing issues');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error diagnosing duplicate processes:', error);
    process.exit(1);
  }
}

diagnoseDuplicateProcesses();