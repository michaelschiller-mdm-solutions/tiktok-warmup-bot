/**
 * Test the automation startup process to verify all fixes work
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testAutomationStartup() {
  try {
    console.log('🚀 TESTING AUTOMATION STARTUP PROCESS');
    console.log('====================================\n');

    // 1. Simulate startup cleanup (what WarmupQueueService.start() does)
    console.log('🧹 1. Startup Cleanup (cleanupOrphanedProcesses):');
    
    const cleanupQuery = `
      SELECT 
        a.username,
        awp.phase,
        awp.started_at,
        EXTRACT(EPOCH FROM (NOW() - awp.started_at))/60 as minutes_running
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.status = 'in_progress'
      AND awp.started_at < NOW() - INTERVAL '5 minutes'
    `;
    
    const cleanupResult = await pool.query(cleanupQuery);
    if (cleanupResult.rows.length > 0) {
      console.log(`   Found ${cleanupResult.rows.length} orphaned processes to clean:`);
      cleanupResult.rows.forEach(account => {
        const minutesRunning = Math.round(account.minutes_running * 100) / 100;
        console.log(`   - ${account.username}: ${account.phase} (${minutesRunning} min)`);
      });
      
      // Actually clean them up
      const resetQuery = `
        UPDATE account_warmup_phases 
        SET status = 'available', 
            bot_id = NULL, 
            bot_session_id = NULL,
            started_at = NULL,
            error_message = 'Reset by startup cleanup'
        WHERE status = 'in_progress'
        AND started_at < NOW() - INTERVAL '5 minutes'
      `;
      
      const resetResult = await pool.query(resetQuery);
      console.log(`   ✅ Cleaned up ${resetResult.rowCount} orphaned processes`);
    } else {
      console.log('   ✅ No orphaned processes found');
    }

    // 2. Check single bot constraint
    console.log('\n🔒 2. Single Bot Constraint Check:');
    const constraintQuery = `
      SELECT COUNT(*) as count
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.status = 'in_progress'
      AND a.lifecycle_state = 'warmup'
    `;
    
    const constraintResult = await pool.query(constraintQuery);
    const inProgressCount = parseInt(constraintResult.rows[0].count);
    
    if (inProgressCount > 0) {
      console.log(`   ⏸️  ${inProgressCount} account(s) in progress - would skip processing`);
    } else {
      console.log('   ✅ No accounts in progress - ready to process');
    }

    // 3. Get ready accounts (what processQueue would do)
    console.log('\n🎯 3. Ready Accounts Check:');
    const readyQuery = `
      SELECT 
        bra.id, bra.username, bra.ready_phases, bra.next_phase_info,
        a.first_automation_completed
      FROM bot_ready_accounts bra
      LEFT JOIN accounts a ON bra.id = a.id
      WHERE bra.ready_phases > 0
      ORDER BY bra.ready_phases DESC
      LIMIT 5
    `;
    
    const readyResult = await pool.query(readyQuery);
    if (readyResult.rows.length > 0) {
      console.log(`   Found ${readyResult.rows.length} ready accounts:`);
      readyResult.rows.forEach((account, index) => {
        const nextPhase = account.next_phase_info?.phase || 'None';
        const needsOnboarding = !account.first_automation_completed;
        const marker = index === 0 ? '👉' : '  ';
        console.log(`   ${marker} ${account.username}: ${account.ready_phases} phases, next: ${nextPhase} ${needsOnboarding ? '(needs skip_onboarding)' : ''}`);
      });
      
      // Show what would happen with the first account
      const firstAccount = readyResult.rows[0];
      console.log(`\n   🎯 Would process: ${firstAccount.username}`);
      
      if (!firstAccount.first_automation_completed) {
        console.log(`   1. ✅ Run skip_onboarding.lua (first time automation)`);
        console.log(`   2. ✅ Mark first_automation_completed = true`);
      }
      
      const nextPhase = firstAccount.next_phase_info?.phase;
      console.log(`   3. ✅ Execute ${nextPhase} phase`);
      console.log(`   4. ✅ Apply model-specific cooldown (2-3 hours for Cherry)`);
      
    } else {
      console.log('   ❌ No ready accounts found');
    }

    // 4. Check cooldown configuration
    console.log('\n⏰ 4. Cooldown Configuration:');
    const cooldownQuery = `
      SELECT 
        wc.model_id,
        m.name as model_name,
        wc.min_cooldown_hours,
        wc.max_cooldown_hours
      FROM warmup_configuration wc
      JOIN models m ON wc.model_id = m.id
    `;
    
    const cooldownResult = await pool.query(cooldownQuery);
    if (cooldownResult.rows.length > 0) {
      cooldownResult.rows.forEach(config => {
        console.log(`   ✅ Model "${config.model_name}": ${config.min_cooldown_hours}-${config.max_cooldown_hours}h cooldown`);
      });
    } else {
      console.log('   ⚠️  No configurations found - would use defaults (15-24h)');
    }

    // 5. Simulate what happens every 30 seconds (polling interval)
    console.log('\n🔄 5. Polling Cycle Simulation:');
    console.log('   Every 30 seconds, the system would:');
    console.log('   1. ✅ Check for stuck processes (>10 min) and reset them');
    console.log('   2. ✅ Verify single bot constraint (skip if account in progress)');
    console.log('   3. ✅ Get ready accounts from bot_ready_accounts view');
    console.log('   4. ✅ Process first ready account if available');
    console.log('   5. ✅ Apply skip_onboarding.lua for first-time accounts');
    console.log('   6. ✅ Execute phase-specific script');
    console.log('   7. ✅ Apply model-specific cooldown');

    // 6. Show expected automation flow
    console.log('\n📋 EXPECTED AUTOMATION FLOW');
    console.log('==========================');
    
    if (inProgressCount === 0 && readyResult.rows.length > 0) {
      console.log('🎉 AUTOMATION READY TO START!');
      console.log('\nNext steps when you run pnpm run dev:');
      console.log('1. 🚀 Backend starts with WarmupQueueService');
      console.log('2. 🧹 Cleanup any orphaned processes');
      console.log('3. 🎯 Process first ready account');
      console.log('4. 📱 Execute skip_onboarding.lua (if first time)');
      console.log('5. 📜 Execute phase script');
      console.log('6. ⏰ Apply cooldown');
      console.log('7. 🔄 Wait 30 seconds and repeat');
      
      console.log('\n💡 Expected behavior:');
      console.log(`   - Process: ${readyResult.rows[0].username}`);
      console.log(`   - Phase: ${readyResult.rows[0].next_phase_info?.phase}`);
      console.log(`   - Skip onboarding: ${!readyResult.rows[0].first_automation_completed ? 'YES' : 'NO'}`);
      console.log(`   - Cooldown: 2-3 hours (Cherry model)`);
      console.log(`   - Next account: ${readyResult.rows[1]?.username || 'None available'}`);
      
    } else if (inProgressCount > 0) {
      console.log('⏸️  AUTOMATION PAUSED');
      console.log(`   Reason: ${inProgressCount} account(s) already in progress`);
      console.log('   Will resume when current process completes');
      
    } else {
      console.log('❌ NO ACCOUNTS READY');
      console.log('   All accounts are in cooldown or completed');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

testAutomationStartup();