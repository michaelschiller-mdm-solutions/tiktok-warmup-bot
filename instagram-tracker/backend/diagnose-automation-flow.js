import { db } from './dist/database.js';

async function diagnoseAutomationFlow() {
  try {
    console.log('🔍 Diagnosing automation flow...\n');

    // 1. Check if there are accounts ready for warmup
    console.log('1. Checking accounts ready for warmup:');
    const readyAccounts = await db.query(`
      SELECT a.username, awp.phase, awp.status, awp.available_at, a.container_number
      FROM account_warmup_phases awp
      JOIN accounts a ON a.id = awp.account_id
      WHERE awp.status = 'pending'
      AND awp.available_at <= NOW()
      ORDER BY awp.phase_order ASC
      LIMIT 10
    `);
    
    console.log(`Found ${readyAccounts.rows.length} accounts ready for warmup:`);
    readyAccounts.rows.forEach(acc => {
      console.log(`  - ${acc.username}: ${acc.phase} (container: ${acc.container_number})`);
    });

    // 2. Check if any phases are currently in progress
    console.log('\n2. Checking phases currently in progress:');
    const inProgressPhases = await db.query(`
      SELECT a.username, awp.phase, awp.status, awp.started_at, awp.bot_id
      FROM account_warmup_phases awp
      JOIN accounts a ON a.id = awp.account_id
      WHERE awp.status = 'in_progress'
    `);
    
    console.log(`Found ${inProgressPhases.rows.length} phases in progress:`);
    inProgressPhases.rows.forEach(phase => {
      console.log(`  - ${phase.username}: ${phase.phase} (bot: ${phase.bot_id}, started: ${phase.started_at})`);
    });

    // 3. Check bot activity logs
    console.log('\n3. Checking recent bot activity:');
    const botActivity = await db.query(`
      SELECT bot_id, activity_type, started_at, completed_at, account_id
      FROM bot_activity_log
      WHERE started_at > NOW() - INTERVAL '1 hour'
      ORDER BY started_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${botActivity.rows.length} recent bot activities:`);
    botActivity.rows.forEach(activity => {
      console.log(`  - Bot ${activity.bot_id}: ${activity.activity_type} (account: ${activity.account_id})`);
    });

    // 4. Check if there are any automation sessions
    console.log('\n4. Checking automation sessions:');
    try {
      const sessions = await db.query(`
        SELECT session_id, status, bot_id FROM active_bot_sessions
        ORDER BY session_id DESC
        LIMIT 5
      `);
      
      console.log(`Found ${sessions.rows.length} active sessions:`);
      sessions.rows.forEach(session => {
        console.log(`  - Session ${session.session_id}: ${session.status} (bot: ${session.bot_id})`);
      });
    } catch (error) {
      console.log('No active_bot_sessions table or error:', error.message);
    }

    // 5. Check iPhone containers
    console.log('\n5. Checking iPhone container assignments:');
    const containers = await db.query(`
      SELECT DISTINCT container_number, COUNT(*) as account_count
      FROM accounts
      WHERE container_number IS NOT NULL
      GROUP BY container_number
      ORDER BY container_number
    `);
    
    console.log(`Container assignments:`);
    containers.rows.forEach(container => {
      console.log(`  - Container ${container.container_number}: ${container.account_count} accounts`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error diagnosing automation flow:', error);
    process.exit(1);
  }
}

diagnoseAutomationFlow();  
  // 6. Check why accounts aren't ready - look at all warmup phases
    console.log('\n6. Checking all warmup phase statuses:');
    const allPhases = await db.query(`
      SELECT a.username, awp.phase, awp.status, awp.available_at, 
             CASE 
               WHEN awp.available_at > NOW() THEN 'future'
               WHEN awp.available_at <= NOW() THEN 'ready_time'
               ELSE 'unknown'
             END as time_status
      FROM account_warmup_phases awp
      JOIN accounts a ON a.id = awp.account_id
      ORDER BY a.username, awp.phase_order
      LIMIT 20
    `);
    
    console.log(`All warmup phases (first 20):`);
    allPhases.rows.forEach(phase => {
      console.log(`  - ${phase.username}: ${phase.phase} (status: ${phase.status}, time: ${phase.time_status})`);
    });

    // 7. Check account lifecycle states
    console.log('\n7. Checking account lifecycle states:');
    const lifecycleStates = await db.query(`
      SELECT lifecycle_state, COUNT(*) as count
      FROM accounts
      GROUP BY lifecycle_state
      ORDER BY count DESC
    `);
    
    console.log(`Account lifecycle states:`);
    lifecycleStates.rows.forEach(state => {
      console.log(`  - ${state.lifecycle_state || 'NULL'}: ${state.count} accounts`);
    });