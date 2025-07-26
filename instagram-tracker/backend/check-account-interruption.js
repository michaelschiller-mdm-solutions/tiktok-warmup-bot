/**
 * Check why accounts are being interrupted and multiple accounts processed simultaneously
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkAccountInterruption() {
  try {
    console.log('🚨 CHECKING ACCOUNT INTERRUPTION ISSUES');
    console.log('======================================\n');

    // 1. Check the single bot constraint configuration
    console.log('🔒 1. Single Bot Constraint Configuration:');
    const constraintQuery = `
      SELECT 
        wc.model_id,
        m.name as model_name,
        wc.single_bot_constraint,
        COUNT(a.id) as accounts_in_warmup
      FROM warmup_configuration wc
      JOIN models m ON wc.model_id = m.id
      LEFT JOIN accounts a ON a.model_id = wc.model_id AND a.lifecycle_state = 'warmup'
      GROUP BY wc.model_id, m.name, wc.single_bot_constraint
      ORDER BY accounts_in_warmup DESC
    `;
    
    const constraintResult = await pool.query(constraintQuery);
    constraintResult.rows.forEach(config => {
      console.log(`   - Model "${config.model_name}": Single bot = ${config.single_bot_constraint}, ${config.accounts_in_warmup} accounts`);
    });

    // 2. Check for accounts currently being processed
    console.log('\n⚙️  2. Accounts Currently Being Processed:');
    const processingQuery = `
      SELECT 
        a.id, a.username, a.model_id,
        awp.phase, awp.status, awp.started_at, awp.bot_id, awp.bot_session_id,
        EXTRACT(EPOCH FROM (NOW() - awp.started_at))/60 as minutes_running
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'in_progress'
      AND a.lifecycle_state = 'warmup'
      ORDER BY awp.started_at ASC
    `;
    
    const processingResult = await pool.query(processingQuery);
    if (processingResult.rows.length > 0) {
      console.log(`   Found ${processingResult.rows.length} accounts currently being processed:`);
      processingResult.rows.forEach(account => {
        const minutesRunning = Math.round(account.minutes_running * 100) / 100;
        console.log(`   - ${account.username}: ${account.phase} (${minutesRunning} min) by ${account.bot_id}`);
        console.log(`     Session: ${account.bot_session_id}`);
      });
      
      if (processingResult.rows.length > 1) {
        console.log(`   🚨 ISSUE: ${processingResult.rows.length} accounts being processed simultaneously!`);
        console.log(`   This violates the single bot constraint`);
      }
    } else {
      console.log('   ✅ No accounts currently being processed');
    }

    // 3. Check recent bot activity logs
    console.log('\n📊 3. Recent Bot Activity:');
    const activityQuery = `
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.bot_id,
        awp.started_at,
        awp.completed_at,
        awp.error_message,
        CASE 
          WHEN awp.completed_at IS NOT NULL THEN EXTRACT(EPOCH FROM (awp.completed_at - awp.started_at))/60
          WHEN awp.started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (NOW() - awp.started_at))/60
          ELSE NULL
        END as duration_minutes
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.started_at > NOW() - INTERVAL '2 hours'
      ORDER BY awp.started_at DESC
      LIMIT 20
    `;
    
    const activityResult = await pool.query(activityQuery);
    if (activityResult.rows.length > 0) {
      console.log('   Recent bot activity (last 2 hours):');
      activityResult.rows.forEach(activity => {
        const duration = activity.duration_minutes ? Math.round(activity.duration_minutes * 100) / 100 : 'ongoing';
        const status = activity.status === 'failed' ? `❌ ${activity.status}` : 
                     activity.status === 'completed' ? `✅ ${activity.status}` : 
                     `🔄 ${activity.status}`;
        console.log(`   - ${activity.username}: ${activity.phase} ${status} (${duration} min) by ${activity.bot_id}`);
        if (activity.error_message) {
          console.log(`     Error: ${activity.error_message}`);
        }
      });
    } else {
      console.log('   ❌ No recent bot activity found');
    }

    // 4. Check WarmupQueueService logic
    console.log('\n🤖 4. WarmupQueueService Single Bot Logic:');
    console.log('   The queue service should only process ONE account at a time');
    console.log('   Let me check if there are any race conditions...');
    
    // Check if multiple queue services might be running
    const sessionQuery = `
      SELECT DISTINCT bot_id, COUNT(*) as active_sessions
      FROM account_warmup_phases
      WHERE status = 'in_progress'
      AND started_at > NOW() - INTERVAL '1 hour'
      GROUP BY bot_id
    `;
    
    const sessionResult = await pool.query(sessionQuery);
    if (sessionResult.rows.length > 0) {
      console.log('   Active bot sessions:');
      sessionResult.rows.forEach(session => {
        console.log(`   - Bot "${session.bot_id}": ${session.active_sessions} active sessions`);
      });
      
      if (sessionResult.rows.length > 1) {
        console.log('   🚨 ISSUE: Multiple bot instances running simultaneously!');
      }
    }

    // 5. Check for stuck/orphaned processes
    console.log('\n🔍 5. Stuck/Orphaned Processes:');
    const stuckQuery = `
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.started_at,
        EXTRACT(EPOCH FROM (NOW() - awp.started_at))/60 as minutes_stuck
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'in_progress'
      AND awp.started_at < NOW() - INTERVAL '30 minutes'
    `;
    
    const stuckResult = await pool.query(stuckQuery);
    if (stuckResult.rows.length > 0) {
      console.log('   Found stuck processes (running > 30 minutes):');
      stuckResult.rows.forEach(stuck => {
        const minutesStuck = Math.round(stuck.minutes_stuck * 100) / 100;
        console.log(`   - ${stuck.username}: ${stuck.phase} stuck for ${minutesStuck} minutes`);
      });
      console.log('   🚨 These processes may be blocking the queue');
    } else {
      console.log('   ✅ No stuck processes found');
    }

    // 6. Analysis and recommendations
    console.log('\n📋 ACCOUNT INTERRUPTION ANALYSIS:');
    console.log('=================================');
    
    const issues = [];
    
    if (processingResult.rows.length > 1) {
      issues.push('Multiple accounts being processed simultaneously');
    }
    
    if (sessionResult.rows.length > 1) {
      issues.push('Multiple bot instances running');
    }
    
    if (stuckResult.rows.length > 0) {
      issues.push('Stuck processes blocking the queue');
    }
    
    if (issues.length > 0) {
      console.log('❌ ISSUES FOUND:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      
      console.log('\n💡 SOLUTIONS:');
      console.log('1. Ensure only ONE backend instance is running');
      console.log('2. Add better process cleanup in WarmupQueueService');
      console.log('3. Add timeout handling for stuck processes');
      console.log('4. Improve single bot constraint enforcement');
    } else {
      console.log('✅ No account interruption issues detected');
    }

  } catch (error) {
    console.error('❌ Error checking account interruption:', error);
  } finally {
    await pool.end();
  }
}

checkAccountInterruption();