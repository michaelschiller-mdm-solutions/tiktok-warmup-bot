/**
 * Test if skip onboarding is actually working in the live system
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testSkipOnboardingWorking() {
  try {
    console.log('🔍 TESTING IF SKIP ONBOARDING IS ACTUALLY WORKING');
    console.log('=================================================\n');

    // 1. Check if there are accounts that should get skip onboarding
    console.log('1. Accounts that should get skip_onboarding.lua:');
    
    const shouldGetQuery = `
      SELECT 
        a.id,
        a.username,
        a.container_number,
        COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') as completed_automation_phases,
        COUNT(awp.id) FILTER (WHERE awp.status = 'available') as available_phases,
        (SELECT phase FROM account_warmup_phases WHERE account_id = a.id AND status = 'available' ORDER BY phase LIMIT 1) as next_phase
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
        AND a.container_number IS NOT NULL
      GROUP BY a.id, a.username, a.container_number
      HAVING COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') = 0
        AND COUNT(awp.id) FILTER (WHERE awp.status = 'available') > 0
      ORDER BY a.username
      LIMIT 3
    `;
    
    const shouldGetResult = await pool.query(shouldGetQuery);
    
    if (shouldGetResult.rows.length === 0) {
      console.log('   ❌ No accounts found that need skip onboarding');
      console.log('   This means either:');
      console.log('     - All accounts have already completed their first automation phase');
      console.log('     - No accounts are ready for automation');
      console.log('     - Accounts don\'t have containers assigned');
      
      // Check why no accounts are ready
      const debugQuery = `
        SELECT 
          COUNT(*) as total_warmup,
          COUNT(CASE WHEN container_number IS NOT NULL THEN 1 END) as with_container,
          COUNT(CASE WHEN container_number IS NOT NULL AND EXISTS (
            SELECT 1 FROM account_warmup_phases awp 
            WHERE awp.account_id = a.id AND awp.status = 'available'
          ) THEN 1 END) as ready_for_automation,
          COUNT(CASE WHEN container_number IS NOT NULL AND EXISTS (
            SELECT 1 FROM account_warmup_phases awp 
            WHERE awp.account_id = a.id AND awp.status = 'available'
          ) AND NOT EXISTS (
            SELECT 1 FROM account_warmup_phases awp2
            WHERE awp2.account_id = a.id AND awp2.status = 'completed' AND awp2.phase != 'manual_setup'
          ) THEN 1 END) as need_skip_onboarding
        FROM accounts a
        WHERE lifecycle_state = 'warmup'
      `;
      
      const debugResult = await pool.query(debugQuery);
      const debug = debugResult.rows[0];
      
      console.log('\n   Debug info:');
      console.log(`     - Total warmup accounts: ${debug.total_warmup}`);
      console.log(`     - With containers: ${debug.with_container}`);
      console.log(`     - Ready for automation: ${debug.ready_for_automation}`);
      console.log(`     - Need skip onboarding: ${debug.need_skip_onboarding}`);
      
      return;
    }
    
    console.log(`   Found ${shouldGetResult.rows.length} accounts that should get skip_onboarding.lua:`);
    shouldGetResult.rows.forEach(account => {
      console.log(`     - ${account.username}: next phase = ${account.next_phase}, container = ${account.container_number}`);
    });

    // 2. Check recent automation logs to see if skip onboarding has been executed
    console.log('\n2. Recent automation activity (looking for skip onboarding):');
    
    const recentQuery = `
      SELECT 
        a.username,
        awp.phase,
        awp.started_at,
        awp.completed_at,
        awp.bot_id,
        awp.bot_session_id
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.completed_at > NOW() - INTERVAL '2 hours'
        OR awp.started_at > NOW() - INTERVAL '2 hours'
      ORDER BY COALESCE(awp.completed_at, awp.started_at) DESC
      LIMIT 10
    `;
    
    const recentResult = await pool.query(recentQuery);
    
    if (recentResult.rows.length === 0) {
      console.log('   ❌ No recent automation activity in the last 2 hours');
      console.log('   This suggests the automation system might not be running');
    } else {
      console.log('   Recent automation activity:');
      recentResult.rows.forEach(row => {
        const timeAgo = row.completed_at 
          ? Math.round((Date.now() - new Date(row.completed_at).getTime()) / 1000 / 60)
          : Math.round((Date.now() - new Date(row.started_at).getTime()) / 1000 / 60);
        const status = row.completed_at ? 'completed' : 'in progress';
        console.log(`     - ${row.username}: ${row.phase} (${status}, ${timeAgo}m ago)`);
      });
    }

    // 3. Check if any accounts have been processed since our fix
    console.log('\n3. Checking if accounts have been processed since skip onboarding fix:');
    
    // Look for accounts that completed their first automation phase recently
    const firstAutomationQuery = `
      SELECT 
        a.username,
        awp.phase,
        awp.completed_at,
        COUNT(awp2.id) FILTER (WHERE awp2.status = 'completed' AND awp2.phase != 'manual_setup') as total_automation_phases
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      LEFT JOIN account_warmup_phases awp2 ON awp2.account_id = a.id
      WHERE awp.status = 'completed'
        AND awp.phase != 'manual_setup'
        AND awp.completed_at > NOW() - INTERVAL '4 hours'
      GROUP BY a.id, a.username, awp.phase, awp.completed_at
      HAVING COUNT(awp2.id) FILTER (WHERE awp2.status = 'completed' AND awp2.phase != 'manual_setup') = 1
      ORDER BY awp.completed_at DESC
      LIMIT 5
    `;
    
    const firstAutomationResult = await pool.query(firstAutomationQuery);
    
    if (firstAutomationResult.rows.length === 0) {
      console.log('   ❌ No accounts completed their first automation phase in the last 4 hours');
      console.log('   This means we haven\'t had a chance to test skip onboarding yet');
    } else {
      console.log('   Accounts that completed their first automation phase recently:');
      firstAutomationResult.rows.forEach(row => {
        const timeAgo = Math.round((Date.now() - new Date(row.completed_at).getTime()) / 1000 / 60);
        console.log(`     - ${row.username}: ${row.phase} (${timeAgo}m ago) - SHOULD HAVE HAD skip_onboarding.lua`);
      });
    }

    // 4. Test the current WarmupQueueService logic
    console.log('\n4. Testing current WarmupQueueService logic:');
    
    if (shouldGetResult.rows.length > 0) {
      const testAccount = shouldGetResult.rows[0];
      
      // Simulate the checkFirstAutomation logic
      const checkQuery = `
        SELECT COUNT(*) as completed_automation_phases
        FROM account_warmup_phases 
        WHERE account_id = $1 
        AND status = 'completed'
        AND phase != 'manual_setup'
      `;
      
      const checkResult = await pool.query(checkQuery, [testAccount.id]);
      const completedAutomationPhases = parseInt(checkResult.rows[0].completed_automation_phases);
      const needsSkipOnboarding = completedAutomationPhases === 0;
      
      console.log(`   Testing ${testAccount.username}:`);
      console.log(`     - Completed automation phases: ${completedAutomationPhases}`);
      console.log(`     - checkFirstAutomation() would return: ${needsSkipOnboarding}`);
      console.log(`     - Would get --skip-onboarding flag: ${needsSkipOnboarding ? 'YES ✅' : 'NO'}`);
      
      if (needsSkipOnboarding) {
        console.log(`     - Command would be: node warmup_executor.js --account-id ${testAccount.id} --container-number ${testAccount.container_number} --phase ${testAccount.next_phase} --username ${testAccount.username} --skip-onboarding true`);
      }
    }

    // 5. Check if the system is currently running
    console.log('\n5. System Status Check:');
    
    const systemQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        MAX(CASE WHEN status = 'completed' THEN completed_at END) as last_completion
      FROM account_warmup_phases
    `;
    
    const systemResult = await pool.query(systemQuery);
    const system = systemResult.rows[0];
    
    console.log(`   Phases in progress: ${system.in_progress}`);
    console.log(`   Phases available: ${system.available}`);
    console.log(`   Last completion: ${system.last_completion || 'None'}`);
    
    if (system.in_progress > 0) {
      console.log('   ✅ System is currently running automation');
    } else if (system.available > 0) {
      console.log('   ⚠️  System has work to do but nothing is running');
      console.log('   Check if WarmupQueueService is active');
    } else {
      console.log('   💤 No work available for automation');
    }

    // 6. Final assessment
    console.log('\n🎯 SKIP ONBOARDING STATUS ASSESSMENT:');
    console.log('====================================');
    
    if (shouldGetResult.rows.length > 0) {
      console.log('✅ Accounts are ready to test skip onboarding');
      console.log(`   - ${shouldGetResult.rows.length} accounts need skip_onboarding.lua`);
      console.log('   - Next automation cycle will test the fix');
      
      if (system.in_progress === 0) {
        console.log('⚠️  But automation is not currently running');
        console.log('   - Start the server with: pnpm run dev');
        console.log('   - Check logs for WarmupQueueService activity');
      } else {
        console.log('🚀 Automation is running - skip onboarding should work on next cycle');
      }
    } else {
      console.log('❌ No accounts currently need skip onboarding');
      console.log('   - All accounts have already completed their first automation');
      console.log('   - Or no accounts are ready for automation');
    }
    
    if (firstAutomationResult.rows.length > 0) {
      console.log('\n📊 Recent first automation phases detected:');
      console.log('   - These accounts should have gotten skip_onboarding.lua');
      console.log('   - Check server logs to see if skip onboarding was executed');
      console.log('   - Look for "FIRST TIME AUTOMATION DETECTED" messages');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

testSkipOnboardingWorking();