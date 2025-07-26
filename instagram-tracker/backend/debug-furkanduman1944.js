/**
 * Debug why furkanduman1944 didn't get skip onboarding
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function debugFurkanduman1944() {
  try {
    console.log('🔍 DEBUGGING furkanduman1944 SKIP ONBOARDING');
    console.log('===============================================\n');

    // 1. Get account info
    console.log('1. Account Information:');
    
    const accountQuery = `
      SELECT id, username, first_automation_completed, lifecycle_state, created_at
      FROM accounts 
      WHERE username = 'furkanduman1944'
    `;
    
    const accountResult = await pool.query(accountQuery);
    
    if (accountResult.rows.length === 0) {
      console.log('❌ Account not found');
      return;
    }
    
    const account = accountResult.rows[0];
    console.log(`   ID: ${account.id}`);
    console.log(`   Username: ${account.username}`);
    console.log(`   First automation completed: ${account.first_automation_completed}`);
    console.log(`   Lifecycle state: ${account.lifecycle_state}`);
    console.log(`   Created: ${account.created_at}`);

    // 2. Check completed phases
    console.log('\n2. Completed Phases Check:');
    
    const completedPhasesQuery = `
      SELECT phase, status, completed_at, started_at
      FROM account_warmup_phases 
      WHERE account_id = $1 
      AND status = 'completed'
      ORDER BY completed_at ASC
    `;
    
    const completedResult = await pool.query(completedPhasesQuery, [account.id]);
    
    console.log(`   Total completed phases: ${completedResult.rows.length}`);
    
    if (completedResult.rows.length > 0) {
      console.log('   Completed phases:');
      completedResult.rows.forEach(phase => {
        console.log(`     - ${phase.phase}: ${phase.status} (completed: ${phase.completed_at})`);
      });
    }

    // 3. Check completed phases excluding manual_setup (the logic we use)
    console.log('\n3. Skip Onboarding Logic Check:');
    
    const skipOnboardingQuery = `
      SELECT COUNT(*) as completed_phases
      FROM account_warmup_phases 
      WHERE account_id = $1 
      AND status = 'completed'
      AND phase != 'manual_setup'
    `;
    
    const skipResult = await pool.query(skipOnboardingQuery, [account.id]);
    const completedPhases = parseInt(skipResult.rows[0].completed_phases);
    const needsSkipOnboarding = completedPhases === 0;
    
    console.log(`   Completed phases (excluding manual_setup): ${completedPhases}`);
    console.log(`   Should need skip onboarding: ${needsSkipOnboarding ? 'YES' : 'NO'}`);

    // 4. Check all phases for this account
    console.log('\n4. All Warmup Phases:');
    
    const allPhasesQuery = `
      SELECT phase, status, started_at, completed_at, bot_id
      FROM account_warmup_phases 
      WHERE account_id = $1 
      ORDER BY 
        CASE phase
          WHEN 'manual_setup' THEN 1
          WHEN 'bio' THEN 2
          WHEN 'gender' THEN 3
          WHEN 'name' THEN 4
          WHEN 'username' THEN 5
          ELSE 99
        END
    `;
    
    const allPhasesResult = await pool.query(allPhasesQuery, [account.id]);
    
    console.log(`   Total phases: ${allPhasesResult.rows.length}`);
    allPhasesResult.rows.forEach(phase => {
      console.log(`     - ${phase.phase}: ${phase.status} ${phase.started_at ? `(started: ${phase.started_at})` : ''} ${phase.completed_at ? `(completed: ${phase.completed_at})` : ''} ${phase.bot_id ? `(bot: ${phase.bot_id})` : ''}`);
    });

    // 5. Check recent bio phase execution
    console.log('\n5. Recent Bio Phase Execution:');
    
    const bioPhaseQuery = `
      SELECT phase, status, started_at, completed_at, bot_id, bot_session_id, error_message
      FROM account_warmup_phases 
      WHERE account_id = $1 AND phase = 'bio'
      ORDER BY started_at DESC
      LIMIT 1
    `;
    
    const bioResult = await pool.query(bioPhaseQuery, [account.id]);
    
    if (bioResult.rows.length > 0) {
      const bioPhase = bioResult.rows[0];
      console.log(`   Bio phase status: ${bioPhase.status}`);
      console.log(`   Started: ${bioPhase.started_at}`);
      console.log(`   Completed: ${bioPhase.completed_at}`);
      console.log(`   Bot ID: ${bioPhase.bot_id}`);
      console.log(`   Session ID: ${bioPhase.bot_session_id}`);
      if (bioPhase.error_message) {
        console.log(`   Error: ${bioPhase.error_message}`);
      }
    }

    // 6. Simulate the checkFirstAutomation logic
    console.log('\n6. Simulating WarmupAutomationService Logic:');
    
    // This is the exact query from WarmupAutomationService.checkFirstAutomation
    const simulateQuery = `
      SELECT COUNT(*) as completed_phases
      FROM account_warmup_phases 
      WHERE account_id = $1 
      AND status = 'completed'
      AND phase != 'manual_setup'
    `;
    
    const simulateResult = await pool.query(simulateQuery, [account.id]);
    const simulatedCompletedPhases = parseInt(simulateResult.rows[0].completed_phases);
    const simulatedNeedsSkipOnboarding = simulatedCompletedPhases === 0;
    
    console.log(`   Query result: ${simulatedCompletedPhases} completed phases`);
    console.log(`   Logic result: ${simulatedNeedsSkipOnboarding ? 'SHOULD RUN skip_onboarding.lua' : 'SHOULD SKIP skip_onboarding.lua'}`);

    // 7. Check if bio phase was completed BEFORE the current execution
    console.log('\n7. Timeline Analysis:');
    
    const timelineQuery = `
      SELECT phase, status, started_at, completed_at
      FROM account_warmup_phases 
      WHERE account_id = $1 
      AND (status = 'completed' OR phase = 'bio')
      ORDER BY COALESCE(completed_at, started_at) ASC
    `;
    
    const timelineResult = await pool.query(timelineQuery, [account.id]);
    
    console.log('   Phase execution timeline:');
    timelineResult.rows.forEach((phase, index) => {
      const time = phase.completed_at || phase.started_at;
      console.log(`     ${index + 1}. ${phase.phase}: ${phase.status} at ${time}`);
    });

    // 8. Conclusion
    console.log('\n🎯 CONCLUSION:');
    console.log('==============');
    
    if (simulatedNeedsSkipOnboarding) {
      console.log('✅ Account SHOULD have gotten skip_onboarding.lua');
      console.log('❌ But the logs show it didn\'t run');
      console.log('🔍 This indicates a bug in the WarmupAutomationService integration');
    } else {
      console.log('❌ Account should NOT have gotten skip_onboarding.lua');
      console.log('✅ The system worked correctly');
    }
    
    console.log('\n💡 Next steps:');
    console.log('   1. Check if WarmupAutomationService.checkFirstAutomation() is being called');
    console.log('   2. Check if the --skip-onboarding flag is being passed to warmup_executor.js');
    console.log('   3. Add more logging to trace the execution flow');

  } catch (error) {
    console.error('💥 Debug failed:', error);
  } finally {
    await pool.end();
  }
}

debugFurkanduman1944();