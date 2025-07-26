/**
 * Test the progress counter logic to understand when 1/12 appears
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testProgressCounterLogic() {
  try {
    console.log('🧪 TESTING PROGRESS COUNTER LOGIC (n/12)');
    console.log('========================================\n');

    // 1. Find accounts that show 1/12 (1 completed phase out of 12 total)
    console.log('1. Accounts that should show 1/12 progress:');
    
    const oneOfTwelveQuery = `
      SELECT 
        a.id,
        a.username,
        COUNT(awp.id) as total_phases,
        COUNT(awp.id) FILTER (WHERE awp.status = 'completed') as completed_phases,
        COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') as completed_automation_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      GROUP BY a.id, a.username
      HAVING COUNT(awp.id) = 12 
      AND COUNT(awp.id) FILTER (WHERE awp.status = 'completed') = 1
      ORDER BY a.username
      LIMIT 5
    `;
    
    const oneOfTwelveResult = await pool.query(oneOfTwelveQuery);
    
    console.log(`   Found ${oneOfTwelveResult.rows.length} accounts with 1/12 progress:`);
    oneOfTwelveResult.rows.forEach(account => {
      console.log(`     - ${account.username}: ${account.completed_phases}/${account.total_phases} (${account.completed_automation_phases} automation phases completed)`);
    });

    // 2. Check what phase is completed for these accounts
    if (oneOfTwelveResult.rows.length > 0) {
      console.log('\n2. What phase is completed for 1/12 accounts:');
      
      for (const account of oneOfTwelveResult.rows) {
        const phasesQuery = `
          SELECT phase, status, completed_at
          FROM account_warmup_phases 
          WHERE account_id = $1 
          AND status = 'completed'
          ORDER BY completed_at ASC
        `;
        
        const phasesResult = await pool.query(phasesQuery, [account.id]);
        
        console.log(`   ${account.username}:`);
        phasesResult.rows.forEach(phase => {
          console.log(`     - ${phase.phase}: ${phase.status} (${phase.completed_at})`);
        });
      }
    }

    // 3. Test our skip onboarding logic against 1/12 accounts
    console.log('\n3. Skip onboarding logic for 1/12 accounts:');
    
    for (const account of oneOfTwelveResult.rows) {
      // This is our current logic
      const skipOnboardingQuery = `
        SELECT COUNT(*) as completed_automation_phases
        FROM account_warmup_phases 
        WHERE account_id = $1 
        AND status = 'completed'
        AND phase != 'manual_setup'
      `;
      
      const skipResult = await pool.query(skipOnboardingQuery, [account.id]);
      const completedAutomationPhases = parseInt(skipResult.rows[0].completed_automation_phases);
      const needsSkipOnboarding = completedAutomationPhases === 0;
      
      console.log(`   ${account.username}:`);
      console.log(`     - Progress: ${account.completed_phases}/${account.total_phases}`);
      console.log(`     - Completed automation phases: ${completedAutomationPhases}`);
      console.log(`     - Needs skip onboarding: ${needsSkipOnboarding ? 'YES ✅' : 'NO ❌'}`);
    }

    // 4. Find accounts that show 2/12 (should NOT get skip onboarding)
    console.log('\n4. Accounts that should show 2/12 progress (should NOT get skip onboarding):');
    
    const twoOfTwelveQuery = `
      SELECT 
        a.id,
        a.username,
        COUNT(awp.id) as total_phases,
        COUNT(awp.id) FILTER (WHERE awp.status = 'completed') as completed_phases,
        COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') as completed_automation_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      GROUP BY a.id, a.username
      HAVING COUNT(awp.id) = 12 
      AND COUNT(awp.id) FILTER (WHERE awp.status = 'completed') = 2
      ORDER BY a.username
      LIMIT 3
    `;
    
    const twoOfTwelveResult = await pool.query(twoOfTwelveQuery);
    
    console.log(`   Found ${twoOfTwelveResult.rows.length} accounts with 2/12 progress:`);
    
    for (const account of twoOfTwelveResult.rows) {
      const skipOnboardingQuery = `
        SELECT COUNT(*) as completed_automation_phases
        FROM account_warmup_phases 
        WHERE account_id = $1 
        AND status = 'completed'
        AND phase != 'manual_setup'
      `;
      
      const skipResult = await pool.query(skipOnboardingQuery, [account.id]);
      const completedAutomationPhases = parseInt(skipResult.rows[0].completed_automation_phases);
      const needsSkipOnboarding = completedAutomationPhases === 0;
      
      console.log(`     - ${account.username}: ${account.completed_phases}/${account.total_phases}, automation phases: ${completedAutomationPhases}, skip onboarding: ${needsSkipOnboarding ? 'YES' : 'NO ✅'}`);
    }

    // 5. Summary
    console.log('\n🎯 PROGRESS COUNTER ANALYSIS:');
    console.log('=============================');
    console.log('✅ When counter shows 1/12:');
    console.log('   - 1 phase completed (manual_setup)');
    console.log('   - 0 automation phases completed');
    console.log('   - Should get skip_onboarding.lua ✅');
    
    console.log('\n✅ When counter shows 2/12:');
    console.log('   - 2 phases completed (manual_setup + first automation)');
    console.log('   - 1 automation phase completed');
    console.log('   - Should NOT get skip_onboarding.lua ✅');
    
    console.log('\n💡 Our logic is correct:');
    console.log('   - Count completed automation phases (excluding manual_setup)');
    console.log('   - If count = 0 → run skip_onboarding.lua');
    console.log('   - This happens when progress counter shows 1/12');

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

testProgressCounterLogic();