/**
 * Test if the application is actually working
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testApplicationStatus() {
  try {
    console.log('🔍 TESTING APPLICATION STATUS');
    console.log('=============================\n');

    // 1. Check if database is accessible
    console.log('1. Database Connection:');
    const dbTest = await pool.query('SELECT NOW() as current_time');
    console.log(`   ✅ Database connected: ${dbTest.rows[0].current_time}`);

    // 2. Check if there are accounts in the system
    console.log('\n2. Account Status:');
    const accountsQuery = `
      SELECT 
        lifecycle_state,
        COUNT(*) as count
      FROM accounts 
      GROUP BY lifecycle_state
      ORDER BY count DESC
    `;
    const accountsResult = await pool.query(accountsQuery);
    
    console.log('   Account distribution:');
    accountsResult.rows.forEach(row => {
      console.log(`     - ${row.lifecycle_state}: ${row.count} accounts`);
    });

    // 3. Check if there are accounts ready for automation
    console.log('\n3. Automation Queue Status:');
    const queueQuery = `
      SELECT 
        COUNT(*) as total_warmup_accounts,
        COUNT(CASE WHEN container_number IS NOT NULL THEN 1 END) as accounts_with_container,
        COUNT(CASE WHEN container_number IS NOT NULL AND EXISTS (
          SELECT 1 FROM account_warmup_phases awp 
          WHERE awp.account_id = a.id AND awp.status = 'available'
        ) THEN 1 END) as accounts_ready_for_automation
      FROM accounts a
      WHERE lifecycle_state = 'warmup'
    `;
    const queueResult = await pool.query(queueQuery);
    const queueStats = queueResult.rows[0];
    
    console.log(`   Total warmup accounts: ${queueStats.total_warmup_accounts}`);
    console.log(`   Accounts with containers: ${queueStats.accounts_with_container}`);
    console.log(`   Accounts ready for automation: ${queueStats.accounts_ready_for_automation}`);

    // 4. Check current automation activity
    console.log('\n4. Current Automation Activity:');
    const activityQuery = `
      SELECT 
        COUNT(*) as in_progress_phases,
        COUNT(DISTINCT account_id) as accounts_being_processed
      FROM account_warmup_phases 
      WHERE status = 'in_progress'
    `;
    const activityResult = await pool.query(activityQuery);
    const activity = activityResult.rows[0];
    
    console.log(`   Phases in progress: ${activity.in_progress_phases}`);
    console.log(`   Accounts being processed: ${activity.accounts_being_processed}`);

    if (activity.in_progress_phases > 0) {
      // Show which accounts are currently being processed
      const currentQuery = `
        SELECT 
          a.username,
          awp.phase,
          awp.started_at,
          awp.bot_id
        FROM account_warmup_phases awp
        JOIN accounts a ON awp.account_id = a.id
        WHERE awp.status = 'in_progress'
        ORDER BY awp.started_at DESC
      `;
      const currentResult = await pool.query(currentQuery);
      
      console.log('   Currently processing:');
      currentResult.rows.forEach(row => {
        const timeAgo = Math.round((Date.now() - new Date(row.started_at).getTime()) / 1000 / 60);
        console.log(`     - ${row.username}: ${row.phase} (${timeAgo}m ago, bot: ${row.bot_id})`);
      });
    }

    // 5. Check recent automation activity
    console.log('\n5. Recent Automation Activity (last 24h):');
    const recentQuery = `
      SELECT 
        COUNT(*) as completed_phases,
        COUNT(DISTINCT account_id) as accounts_processed,
        MIN(completed_at) as first_completion,
        MAX(completed_at) as last_completion
      FROM account_warmup_phases 
      WHERE status = 'completed' 
      AND completed_at > NOW() - INTERVAL '24 hours'
    `;
    const recentResult = await pool.query(recentQuery);
    const recent = recentResult.rows[0];
    
    console.log(`   Phases completed (24h): ${recent.completed_phases}`);
    console.log(`   Accounts processed (24h): ${recent.accounts_processed}`);
    if (recent.first_completion) {
      console.log(`   First completion: ${recent.first_completion}`);
      console.log(`   Last completion: ${recent.last_completion}`);
    }

    // 6. Check for accounts that need skip onboarding
    console.log('\n6. Skip Onboarding Status:');
    const skipOnboardingQuery = `
      SELECT 
        a.username,
        COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') as completed_automation_phases,
        COUNT(awp.id) FILTER (WHERE awp.status = 'available') as available_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
        AND a.container_number IS NOT NULL
      GROUP BY a.id, a.username
      HAVING COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') = 0
        AND COUNT(awp.id) FILTER (WHERE awp.status = 'available') > 0
      ORDER BY a.username
      LIMIT 5
    `;
    const skipOnboardingResult = await pool.query(skipOnboardingQuery);
    
    console.log(`   Accounts that need skip_onboarding.lua: ${skipOnboardingResult.rows.length}`);
    skipOnboardingResult.rows.forEach(row => {
      console.log(`     - ${row.username}: ${row.completed_automation_phases} automation phases completed, ${row.available_phases} phases available`);
    });

    // 7. Check for stuck or failed phases
    console.log('\n7. System Health Check:');
    const healthQuery = `
      SELECT 
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_phases,
        COUNT(CASE WHEN status = 'in_progress' AND started_at < NOW() - INTERVAL '1 hour' THEN 1 END) as stuck_phases,
        COUNT(CASE WHEN status = 'requires_review' THEN 1 END) as phases_needing_review
      FROM account_warmup_phases
    `;
    const healthResult = await pool.query(healthQuery);
    const health = healthResult.rows[0];
    
    console.log(`   Failed phases: ${health.failed_phases}`);
    console.log(`   Stuck phases (>1h): ${health.stuck_phases}`);
    console.log(`   Phases needing review: ${health.phases_needing_review}`);

    // 8. Overall system status
    console.log('\n🎯 SYSTEM STATUS SUMMARY:');
    console.log('=========================');
    
    if (queueStats.accounts_ready_for_automation > 0) {
      console.log(`✅ System is operational: ${queueStats.accounts_ready_for_automation} accounts ready for automation`);
    } else {
      console.log('⚠️  No accounts ready for automation');
    }
    
    if (activity.in_progress_phases > 0) {
      console.log(`🔄 Currently processing: ${activity.accounts_being_processed} account(s)`);
    } else {
      console.log('💤 No automation currently running');
    }
    
    if (recent.completed_phases > 0) {
      console.log(`📈 Recent activity: ${recent.completed_phases} phases completed in last 24h`);
    } else {
      console.log('📉 No recent automation activity');
    }
    
    if (skipOnboardingResult.rows.length > 0) {
      console.log(`🎯 Skip onboarding ready: ${skipOnboardingResult.rows.length} accounts will get skip_onboarding.lua`);
    }

    // 9. Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('===================');
    
    if (queueStats.accounts_ready_for_automation === 0) {
      console.log('❌ No accounts ready for automation');
      console.log('   - Check if accounts have containers assigned');
      console.log('   - Check if accounts have available phases');
      console.log('   - Check if content is assigned to accounts');
    }
    
    if (activity.in_progress_phases === 0 && queueStats.accounts_ready_for_automation > 0) {
      console.log('⚠️  Accounts are ready but no automation is running');
      console.log('   - Check if WarmupQueueService is running');
      console.log('   - Check server logs for errors');
      console.log('   - Restart the server if needed');
    }
    
    if (health.stuck_phases > 0) {
      console.log('🚨 Stuck phases detected');
      console.log('   - Check for hung automation processes');
      console.log('   - Consider resetting stuck phases');
    }
    
    if (skipOnboardingResult.rows.length > 0) {
      console.log('✅ Skip onboarding integration is ready to test');
      console.log('   - Next automation cycle will include skip_onboarding.lua');
      console.log('   - Watch logs for "FIRST TIME AUTOMATION DETECTED" message');
    }

  } catch (error) {
    console.error('💥 Application test failed:', error);
  } finally {
    await pool.end();
  }
}

testApplicationStatus();