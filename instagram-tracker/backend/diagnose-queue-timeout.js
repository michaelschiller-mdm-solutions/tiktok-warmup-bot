// Diagnose why WarmupQueueService is timing out during startup
const { db } = require('./dist/database');

async function diagnoseTimeout() {
  try {
    console.log('🔍 Diagnosing WarmupQueueService timeout...');
    
    console.log('\n1. Testing database connection...');
    const dbTest = await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connection works:', dbTest.rows[0].current_time);
    
    console.log('\n2. Testing detectAndResetStuckProcesses query...');
    const stuckProcesses = await db.query(`
      UPDATE account_warmup_phases 
      SET status = 'available',
          bot_id = NULL,
          started_at = NULL,
          updated_at = NOW()
      WHERE status = 'in_progress' 
      AND (started_at IS NULL OR started_at < NOW() - INTERVAL '10 minutes')
      RETURNING account_id, phase, bot_id
    `);
    console.log(`✅ Stuck processes reset: ${stuckProcesses.rowCount} rows`);
    
    console.log('\n3. Testing isAnyAccountInProgress query...');
    const inProgressCheck = await db.query(`
      SELECT COUNT(*) as count 
      FROM account_warmup_phases 
      WHERE status = 'in_progress'
    `);
    console.log(`✅ Accounts in progress: ${inProgressCheck.rows[0].count}`);
    
    console.log('\n4. Testing getValidatedReadyAccounts query...');
    const readyAccounts = await db.query(`
      SELECT 
        a.id,
        a.username,
        a.model_id,
        awp.phase as next_phase_info,
        awp.available_at,
        awp.status
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'available'
      AND awp.available_at <= NOW()
      ORDER BY awp.available_at ASC
      LIMIT 5
    `);
    console.log(`✅ Ready accounts found: ${readyAccounts.rowCount}`);
    readyAccounts.rows.forEach(acc => {
      console.log(`  - ${acc.username}: ${acc.next_phase_info} (available: ${acc.available_at})`);
    });
    
    console.log('\n5. Testing full processQueue simulation...');
    console.log('🎯 Simulating processQueue method...');
    
    // Simulate the exact same logic
    if (inProgressCheck.rows[0].count > 0) {
      console.log('⏸️ Would skip - account in progress');
      return;
    }
    
    if (readyAccounts.rowCount === 0) {
      console.log('⏸️ Would skip - no ready accounts');
      return;
    }
    
    const account = readyAccounts.rows[0];
    console.log(`🔥 Would process: ${account.username} - Phase: ${account.next_phase_info}`);
    
    console.log('\n✅ All queries work fine - timeout might be in processAccountPhase');
    console.log('💡 Suggestion: The timeout is likely in the actual automation execution, not the queue logic');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    process.exit(1);
  }
}

diagnoseTimeout();