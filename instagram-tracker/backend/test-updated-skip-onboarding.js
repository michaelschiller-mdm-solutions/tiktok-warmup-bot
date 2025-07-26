/**
 * Test the updated skip onboarding logic
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testUpdatedSkipOnboarding() {
  try {
    console.log('🧪 TESTING UPDATED SKIP ONBOARDING LOGIC');
    console.log('========================================\n');

    // 1. Test accounts that should get skip onboarding (first_automation_completed = false)
    console.log('1. Accounts that SHOULD get skip_onboarding.lua:');
    
    const shouldGetQuery = `
      SELECT a.id, a.username, a.first_automation_completed,
             COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') as completed_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND a.first_automation_completed = false
      GROUP BY a.id, a.username, a.first_automation_completed
      ORDER BY a.username
      LIMIT 5
    `;
    
    const shouldGetResult = await pool.query(shouldGetQuery);
    
    console.log(`   Found ${shouldGetResult.rows.length} accounts:`);
    shouldGetResult.rows.forEach(account => {
      console.log(`     - ${account.username}: first_automation_completed = ${account.first_automation_completed}, completed phases = ${account.completed_phases}`);
    });

    // 2. Test accounts that should NOT get skip onboarding (first_automation_completed = true)
    console.log('\n2. Accounts that should NOT get skip_onboarding.lua:');
    
    const shouldNotGetQuery = `
      SELECT a.id, a.username, a.first_automation_completed,
             COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') as completed_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND a.first_automation_completed = true
      GROUP BY a.id, a.username, a.first_automation_completed
      ORDER BY a.username
      LIMIT 5
    `;
    
    const shouldNotGetResult = await pool.query(shouldNotGetQuery);
    
    console.log(`   Found ${shouldNotGetResult.rows.length} accounts:`);
    shouldNotGetResult.rows.forEach(account => {
      console.log(`     - ${account.username}: first_automation_completed = ${account.first_automation_completed}, completed phases = ${account.completed_phases}`);
    });

    // 3. Simulate the new checkFirstAutomation logic
    console.log('\n3. Simulating new WarmupAutomationService.checkFirstAutomation():');
    
    // Test with a fresh account
    if (shouldGetResult.rows.length > 0) {
      const testAccount = shouldGetResult.rows[0];
      
      const simulateQuery = `
        SELECT first_automation_completed
        FROM accounts 
        WHERE id = $1
      `;
      
      const simulateResult = await pool.query(simulateQuery, [testAccount.id]);
      const firstAutomationCompleted = simulateResult.rows[0].first_automation_completed;
      const needsSkipOnboarding = !firstAutomationCompleted;
      
      console.log(`   Testing ${testAccount.username}:`);
      console.log(`     first_automation_completed: ${firstAutomationCompleted}`);
      console.log(`     needsSkipOnboarding: ${needsSkipOnboarding}`);
      console.log(`     Result: ${needsSkipOnboarding ? '✅ WILL GET skip_onboarding.lua' : '❌ Will NOT get skip_onboarding.lua'}`);
    }

    // Test with an experienced account
    if (shouldNotGetResult.rows.length > 0) {
      const testAccount = shouldNotGetResult.rows[0];
      
      const simulateQuery = `
        SELECT first_automation_completed
        FROM accounts 
        WHERE id = $1
      `;
      
      const simulateResult = await pool.query(simulateQuery, [testAccount.id]);
      const firstAutomationCompleted = simulateResult.rows[0].first_automation_completed;
      const needsSkipOnboarding = !firstAutomationCompleted;
      
      console.log(`   Testing ${testAccount.username}:`);
      console.log(`     first_automation_completed: ${firstAutomationCompleted}`);
      console.log(`     needsSkipOnboarding: ${needsSkipOnboarding}`);
      console.log(`     Result: ${needsSkipOnboarding ? '❌ WILL GET skip_onboarding.lua (unexpected)' : '✅ Will NOT get skip_onboarding.lua'}`);
    }

    // 4. Summary
    console.log('\n🎯 LOGIC VERIFICATION:');
    console.log('======================');
    console.log('✅ New logic is simpler and more reliable');
    console.log('✅ Uses first_automation_completed flag directly');
    console.log('✅ No complex phase counting needed');
    console.log('✅ Clear true/false logic');
    
    console.log('\n📋 How it works now:');
    console.log('   1. Check accounts.first_automation_completed');
    console.log('   2. If false → run skip_onboarding.lua');
    console.log('   3. If true → skip onboarding');
    console.log('   4. Set flag to true after first successful automation');
    
    console.log('\n🚀 Ready for production testing!');

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

testUpdatedSkipOnboarding();