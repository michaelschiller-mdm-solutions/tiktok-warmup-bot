/**
 * Quick status check for current automation state
 */

const { db } = require('./src/database');

async function checkCurrentStatus() {
  try {
    console.log('🔍 Checking current automation status...\n');
    
    // Check accounts in progress
    const inProgressQuery = `
      SELECT 
        a.id, a.username, a.container_number,
        awp.phase, awp.status, awp.started_at,
        EXTRACT(EPOCH FROM (NOW() - awp.started_at)) as seconds_running
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'in_progress'
      ORDER BY awp.started_at DESC
    `;
    
    const inProgress = await db.query(inProgressQuery);
    
    if (inProgress.rows.length > 0) {
      console.log('🔄 Accounts currently in progress:');
      inProgress.rows.forEach(row => {
        console.log(`  • ${row.username} (${row.id}) - ${row.phase} - Running for ${Math.round(row.seconds_running)}s`);
      });
      console.log('');
    } else {
      console.log('✅ No accounts currently in progress\n');
    }
    
    // Check ready accounts
    const readyQuery = `
      SELECT 
        id, username, container_number, ready_phases, next_phase_info
      FROM bot_ready_accounts
      WHERE ready_phases > 0
      ORDER BY ready_phases DESC
      LIMIT 5
    `;
    
    const ready = await db.query(readyQuery);
    
    if (ready.rows.length > 0) {
      console.log('🎯 Accounts ready for processing:');
      ready.rows.forEach(row => {
        const nextPhase = row.next_phase_info?.phase || 'unknown';
        console.log(`  • ${row.username} (${row.id}) - Next: ${nextPhase} - Container: ${row.container_number}`);
      });
      console.log('');
    } else {
      console.log('⏳ No accounts ready for processing\n');
    }
    
    // Check recent completions
    const recentQuery = `
      SELECT 
        a.username, awp.phase, awp.completed_at,
        EXTRACT(EPOCH FROM (awp.completed_at - awp.started_at)) as execution_seconds
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'completed' 
        AND awp.completed_at > NOW() - INTERVAL '1 hour'
      ORDER BY awp.completed_at DESC
      LIMIT 10
    `;
    
    const recent = await db.query(recentQuery);
    
    if (recent.rows.length > 0) {
      console.log('✅ Recent completions (last hour):');
      recent.rows.forEach(row => {
        const executionTime = Math.round(row.execution_seconds || 0);
        console.log(`  • ${row.username} - ${row.phase} - ${executionTime}s execution time`);
      });
      console.log('');
    } else {
      console.log('📭 No recent completions in the last hour\n');
    }
    
  } catch (error) {
    console.error('❌ Error checking status:', error.message);
  } finally {
    process.exit(0);
  }
}

checkCurrentStatus();