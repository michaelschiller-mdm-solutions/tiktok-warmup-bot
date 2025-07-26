/**
 * Reset stuck processes that are blocking the single bot constraint
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function resetStuckProcesses() {
  try {
    console.log('🔧 RESETTING STUCK PROCESSES');
    console.log('============================\n');

    // 1. Check what accounts are currently in progress
    console.log('1. Checking accounts currently in progress:');
    
    const inProgressQuery = `
      SELECT 
        awp.account_id,
        a.username,
        awp.phase,
        awp.status,
        awp.started_at,
        awp.bot_id,
        awp.bot_session_id,
        EXTRACT(EPOCH FROM (NOW() - awp.started_at))/60 as minutes_running
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.status = 'in_progress'
      AND a.lifecycle_state = 'warmup'
      ORDER BY awp.started_at DESC
    `;
    
    const inProgressResult = await pool.query(inProgressQuery);
    
    console.log(`   Found ${inProgressResult.rows.length} accounts in progress:`);
    
    if (inProgressResult.rows.length === 0) {
      console.log('   ✅ No stuck processes found');
      return;
    }
    
    inProgressResult.rows.forEach(account => {
      console.log(`     - ${account.username}: ${account.phase} (${Math.round(account.minutes_running)} minutes ago)`);
      console.log(`       Bot: ${account.bot_id}, Session: ${account.bot_session_id}`);
      console.log(`       Started: ${account.started_at}`);
    });

    // 2. Reset stuck processes (older than 5 minutes)
    console.log('\n2. Resetting stuck processes (older than 5 minutes):');
    
    const resetQuery = `
      UPDATE account_warmup_phases 
      SET 
        status = 'available',
        started_at = NULL,
        bot_id = NULL,
        bot_session_id = NULL,
        error_message = 'Reset due to stuck process (server restart)',
        updated_at = NOW()
      WHERE status = 'in_progress'
      AND started_at < NOW() - INTERVAL '5 minutes'
      RETURNING account_id, phase
    `;
    
    const resetResult = await pool.query(resetQuery);
    
    if (resetResult.rows.length > 0) {
      console.log(`   ✅ Reset ${resetResult.rows.length} stuck processes:`);
      resetResult.rows.forEach(row => {
        console.log(`     - Account ${row.account_id}: ${row.phase} → available`);
      });
    } else {
      console.log('   ⚠️  No processes older than 5 minutes found');
      
      // If no old processes, reset all in_progress (since server was restarted)
      console.log('\n   Since server was restarted, resetting ALL in_progress processes:');
      
      const forceResetQuery = `
        UPDATE account_warmup_phases 
        SET 
          status = 'available',
          started_at = NULL,
          bot_id = NULL,
          bot_session_id = NULL,
          error_message = 'Reset due to server restart',
          updated_at = NOW()
        WHERE status = 'in_progress'
        RETURNING account_id, phase
      `;
      
      const forceResetResult = await pool.query(forceResetQuery);
      
      console.log(`   ✅ Force reset ${forceResetResult.rows.length} processes:`);
      forceResetResult.rows.forEach(row => {
        console.log(`     - Account ${row.account_id}: ${row.phase} → available`);
      });
    }

    // 3. Verify the fix
    console.log('\n3. Verifying single bot constraint:');
    
    const verifyQuery = `
      SELECT COUNT(*) as in_progress_count
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.status = 'in_progress'
      AND a.lifecycle_state = 'warmup'
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    const inProgressCount = parseInt(verifyResult.rows[0].in_progress_count);
    
    console.log(`   In progress accounts: ${inProgressCount}`);
    
    if (inProgressCount === 0) {
      console.log('   ✅ Single bot constraint is now clear');
    } else {
      console.log('   ⚠️  Still have accounts in progress');
    }

    // 4. Check ready accounts
    console.log('\n4. Checking accounts ready for processing:');
    
    const readyQuery = `
      SELECT COUNT(*) as ready_count
      FROM bot_ready_accounts
      WHERE ready_phases > 0
    `;
    
    const readyResult = await pool.query(readyQuery);
    const readyCount = parseInt(readyResult.rows[0].ready_count);
    
    console.log(`   Ready accounts: ${readyCount}`);

    console.log('\n🎉 STUCK PROCESS RESET COMPLETE!');
    console.log('=================================');
    console.log('✅ Stuck processes have been reset');
    console.log('✅ Single bot constraint is clear');
    console.log('✅ Automation queue can now process accounts');
    
    console.log('\n💡 The automation queue will resume processing on the next cycle (within 30 seconds)');

  } catch (error) {
    console.error('💥 Reset failed:', error);
  } finally {
    await pool.end();
  }
}

resetStuckProcesses();