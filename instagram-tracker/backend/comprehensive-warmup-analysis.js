/**
 * Comprehensive Warmup Automation System Analysis
 * 
 * This script provides a complete overview of:
 * 1. Queue discovery mechanism
 * 2. Phase progression and cooldown system
 * 3. Account readiness and content assignment
 * 4. First automation tracking
 * 5. System health and recommendations
 */

const { db } = require('./dist/database');

async function comprehensiveWarmupAnalysis() {
  try {
    console.log('🔍 COMPREHENSIVE WARMUP AUTOMATION ANALYSIS');
    console.log('===========================================\n');
    
    // 1. SYSTEM OVERVIEW
    console.log('1. 📊 SYSTEM OVERVIEW:');
    console.log('======================');
    
    const systemStats = await db.query(`
      SELECT 
        COUNT(DISTINCT a.id) as total_accounts,
        COUNT(DISTINCT CASE WHEN a.lifecycle_state = 'warmup' THEN a.id END) as warmup_accounts,
        COUNT(DISTINCT CASE WHEN a.lifecycle_state = 'ready' THEN a.id END) as ready_accounts,
        COUNT(DISTINCT CASE WHEN a.lifecycle_state = 'active' THEN a.id END) as active_accounts,
        COUNT(DISTINCT CASE WHEN a.container_number IS NOT NULL THEN a.id END) as accounts_with_containers,
        COUNT(awp.id) as total_phases,
        COUNT(CASE WHEN awp.status = 'available' THEN 1 END) as available_phases,
        COUNT(CASE WHEN awp.status = 'pending' THEN 1 END) as pending_phases,
        COUNT(CASE WHEN awp.status = 'completed' THEN 1 END) as completed_phases,
        COUNT(CASE WHEN awp.status = 'in_progress' THEN 1 END) as in_progress_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
    `);
    
    const stats = systemStats.rows[0];
    console.log(`📈 Account Distribution:`);
    console.log(`   Total accounts: ${stats.total_accounts}`);
    console.log(`   - Warmup: ${stats.warmup_accounts} (actively being warmed up)`);
    console.log(`   - Ready: ${stats.ready_accounts} (ready to start warmup)`);
    console.log(`   - Active: ${stats.active_accounts} (warmup completed)`);
    console.log(`   - With containers: ${stats.accounts_with_containers} (can be processed)`);
    
    console.log(`\n📋 Phase Distribution:`);
    console.log(`   Total phases: ${stats.total_phases}`);
    console.log(`   - Available: ${stats.available_phases} (ready to process)`);
    console.log(`   - Pending: ${stats.pending_phases} (in cooldown)`);
    console.log(`   - Completed: ${stats.completed_phases} (finished)`);
    console.log(`   - In Progress: ${stats.in_progress_phases} (currently running)`);
    
    // 2. QUEUE DISCOVERY MECHANISM
    console.log('\n2. 🔍 QUEUE DISCOVERY MECHANISM:');
    console.log('================================');
    
    // Simulate the exact queue discovery logic from WarmupQueueService
    const queueDiscoveryQuery = `
      SELECT 
        a.id,
        a.username,
        a.model_id,
        a.container_number,
        a.lifecycle_state,
        a.first_automation_completed,
        awp.phase,
        awp.status,
        awp.available_at,
        awp.assigned_content_id,
        awp.assigned_text_id,
        CASE 
          WHEN awp.available_at <= NOW() THEN 'READY NOW'
          ELSE CONCAT('Available in ', ROUND(EXTRACT(EPOCH FROM (awp.available_at - NOW())) / 60), ' minutes')
        END as availability_status
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND a.container_number IS NOT NULL
      AND awp.status = 'available'
      AND awp.available_at <= NOW()
      ORDER BY awp.available_at ASC
      LIMIT 10
    `;
    
    const queueResults = await db.query(queueDiscoveryQuery);
    console.log(`🎯 Queue Discovery Results: ${queueResults.rowCount} accounts ready for processing`);
    
    if (queueResults.rowCount > 0) {
      console.log('\nAccounts discovered by queue:');
      queueResults.rows.forEach((account, index) => {
        const hasContent = account.assigned_content_id ? '✅' : '❌';
        const hasText = account.assigned_text_id ? '✅' : '❌';
        const firstAuto = account.first_automation_completed ? '✅' : '❌ (needs skip_onboarding)';
        console.log(`   ${index + 1}. ${account.username}: ${account.phase}`);
        console.log(`      Container: ${account.container_number}, Content: ${hasContent}, Text: ${hasText}`);
        console.log(`      First automation: ${firstAuto}`);
      });
    } else {
      console.log('   ❌ No accounts currently ready for processing');
    }
    
    // 3. PHASE PROGRESSION & COOLDOWN SYSTEM
    console.log('\n3. ⏰ PHASE PROGRESSION & COOLDOWN SYSTEM:');
    console.log('=========================================');
    
    // Check cooldown configuration
    const cooldownConfig = await db.query(`
      SELECT 
        wc.model_id,
        m.name as model_name,
        wc.min_cooldown_hours,
        wc.max_cooldown_hours,
        wc.single_bot_constraint
      FROM warmup_configuration wc
      JOIN models m ON wc.model_id = m.id
      ORDER BY wc.updated_at DESC
    `);
    
    console.log('🔧 Cooldown Configuration:');
    if (cooldownConfig.rowCount > 0) {
      cooldownConfig.rows.forEach(config => {
        console.log(`   - Model "${config.model_name}": ${config.min_cooldown_hours}-${config.max_cooldown_hours} hours`);
        console.log(`     Single bot constraint: ${config.single_bot_constraint}`);
      });
    } else {
      console.log('   ❌ No cooldown configurations found (using defaults: 15-24 hours)');
    }
    
    // Recent completions and their cooldowns
    const recentCompletions = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.completed_at,
        awp.available_at as next_available,
        EXTRACT(EPOCH FROM (awp.available_at - awp.completed_at)) / 3600 as cooldown_hours
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.status = 'completed'
      AND awp.completed_at > NOW() - INTERVAL '24 hours'
      ORDER BY awp.completed_at DESC
      LIMIT 10
    `);
    
    console.log(`\n📈 Recent Completions (last 24 hours): ${recentCompletions.rowCount}`);
    if (recentCompletions.rowCount > 0) {
      recentCompletions.rows.forEach(completion => {
        const cooldownHours = completion.cooldown_hours ? Math.round(completion.cooldown_hours * 100) / 100 : 'N/A';
        console.log(`   - ${completion.username}: ${completion.phase} → ${cooldownHours}h cooldown`);
      });
    } else {
      console.log('   No recent completions found');
    }
    
    // Check accounts in cooldown
    const inCooldown = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.available_at,
        EXTRACT(EPOCH FROM (awp.available_at - NOW())) / 3600 as hours_remaining
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.status = 'pending'
      AND awp.available_at > NOW()
      ORDER BY awp.available_at ASC
      LIMIT 10
    `);
    
    console.log(`\n❄️ Accounts in Cooldown: ${inCooldown.rowCount}`);
    if (inCooldown.rowCount > 0) {
      inCooldown.rows.forEach(account => {
        const hoursRemaining = Math.round(account.hours_remaining * 100) / 100;
        console.log(`   - ${account.username}: ${account.phase} → ${hoursRemaining}h remaining`);
      });
    }
    
    // 4. FIRST AUTOMATION TRACKING
    console.log('\n4. 🚀 FIRST AUTOMATION TRACKING:');
    console.log('================================');
    
    const firstAutomationStats = await db.query(`
      SELECT 
        first_automation_completed,
        COUNT(*) as count
      FROM accounts 
      WHERE lifecycle_state = 'warmup'
      GROUP BY first_automation_completed
    `);
    
    console.log('First automation status:');
    firstAutomationStats.rows.forEach(stat => {
      const status = stat.first_automation_completed ? 'Completed' : 'Needs skip_onboarding.lua';
      console.log(`   ${status}: ${stat.count} accounts`);
    });
    
    // Accounts that need skip_onboarding
    const needsSkipOnboarding = await db.query(`
      SELECT 
        a.username,
        a.container_number,
        COUNT(CASE WHEN awp.status = 'available' AND awp.available_at <= NOW() THEN 1 END) as ready_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND a.first_automation_completed = false
      AND a.container_number IS NOT NULL
      GROUP BY a.id, a.username, a.container_number
      HAVING COUNT(CASE WHEN awp.status = 'available' AND awp.available_at <= NOW() THEN 1 END) > 0
      ORDER BY ready_phases DESC
      LIMIT 10
    `);
    
    console.log(`\n🎯 Accounts needing skip_onboarding.lua with ready phases: ${needsSkipOnboarding.rowCount}`);
    needsSkipOnboarding.rows.forEach(account => {
      console.log(`   - ${account.username} (container ${account.container_number}): ${account.ready_phases} ready phases`);
    });
    
    // 5. CONTENT ASSIGNMENT STATUS
    console.log('\n5. 📋 CONTENT ASSIGNMENT STATUS:');
    console.log('================================');
    
    const contentStats = await db.query(`
      SELECT 
        awp.phase,
        COUNT(*) as total_phases,
        COUNT(awp.assigned_content_id) as has_content,
        COUNT(awp.assigned_text_id) as has_text,
        COUNT(CASE WHEN awp.status = 'available' AND awp.available_at <= NOW() THEN 1 END) as ready_now
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE a.lifecycle_state = 'warmup'
      GROUP BY awp.phase
      ORDER BY ready_now DESC, total_phases DESC
    `);
    
    console.log('Content assignment by phase:');
    contentStats.rows.forEach(stat => {
      const contentPct = stat.total_phases > 0 ? Math.round((stat.has_content / stat.total_phases) * 100) : 0;
      const textPct = stat.total_phases > 0 ? Math.round((stat.has_text / stat.total_phases) * 100) : 0;
      console.log(`   ${stat.phase}: ${stat.ready_now}/${stat.total_phases} ready (Content:${contentPct}% Text:${textPct}%)`);
    });
    
    // 6. USERNAME COMPLETION ANALYSIS
    console.log('\n6. 🔤 USERNAME COMPLETION ANALYSIS:');
    console.log('===================================');
    
    const usernameAnalysis = await db.query(`
      SELECT 
        a.username as current_username,
        awp.status,
        ctc.text_content as assigned_text,
        awp.completed_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'username'
      AND awp.status IN ('completed', 'available')
      ORDER BY awp.completed_at DESC NULLS LAST
      LIMIT 10
    `);
    
    console.log('Username phase analysis (recent 10):');
    usernameAnalysis.rows.forEach(row => {
      if (row.assigned_text) {
        // Apply the username modification logic (append last letter twice)
        const lastLetter = row.assigned_text.slice(-1).toLowerCase();
        const expectedUsername = row.assigned_text + lastLetter + lastLetter;
        const match = row.current_username === expectedUsername ? '✅' : '❌';
        console.log(`   - ${row.current_username} (${row.status}): "${row.assigned_text}" → "${expectedUsername}" ${match}`);
      } else {
        console.log(`   - ${row.current_username} (${row.status}): No text assigned`);
      }
    });
    
    // 7. SYSTEM HEALTH CHECK
    console.log('\n7. 🏥 SYSTEM HEALTH CHECK:');
    console.log('==========================');
    
    // Check for stuck processes
    const stuckProcesses = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.started_at,
        EXTRACT(EPOCH FROM (NOW() - awp.started_at)) / 60 as minutes_running
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.status = 'in_progress'
      ORDER BY awp.started_at ASC
    `);
    
    console.log(`🔄 Processes in progress: ${stuckProcesses.rowCount}`);
    if (stuckProcesses.rowCount > 0) {
      stuckProcesses.rows.forEach(process => {
        const minutesRunning = Math.round(process.minutes_running);
        const status = minutesRunning > 10 ? '⚠️ STUCK' : '✅ Normal';
        console.log(`   - ${process.username}: ${process.phase} (${minutesRunning} min) ${status}`);
      });
    } else {
      console.log('   ✅ No processes currently running');
    }
    
    // Check single bot constraint
    if (stuckProcesses.rowCount > 1) {
      console.log('   ❌ WARNING: Multiple processes running (violates single bot constraint)');
    } else if (stuckProcesses.rowCount === 1) {
      console.log('   ✅ Single bot constraint respected');
    }
    
    // 8. RECOMMENDATIONS
    console.log('\n8. 💡 RECOMMENDATIONS:');
    console.log('======================');
    
    const recommendations = [];
    
    if (queueResults.rowCount === 0) {
      recommendations.push('❌ No accounts ready for processing - check cooldowns and content assignment');
    } else {
      recommendations.push(`✅ ${queueResults.rowCount} accounts ready for processing`);
    }
    
    if (stuckProcesses.rowCount > 1) {
      recommendations.push('❌ Multiple processes running - reset stuck processes');
    }
    
    const stuckCount = stuckProcesses.rows.filter(p => p.minutes_running > 10).length;
    if (stuckCount > 0) {
      recommendations.push(`❌ ${stuckCount} stuck processes detected - run fix-stuck-account.js`);
    }
    
    if (cooldownConfig.rowCount === 0) {
      recommendations.push('⚠️ No cooldown configuration found - using default values');
    }
    
    const needsSkipCount = needsSkipOnboarding.rowCount;
    if (needsSkipCount > 0) {
      recommendations.push(`🚀 ${needsSkipCount} accounts need skip_onboarding.lua automation`);
    }
    
    // Content assignment issues
    const contentIssues = contentStats.rows.filter(stat => 
      stat.ready_now > 0 && (stat.has_content === 0 || stat.has_text === 0)
    );
    if (contentIssues.length > 0) {
      recommendations.push('📋 Some ready phases missing content assignment');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ System appears healthy and ready for automation');
    }
    
    recommendations.forEach(rec => console.log(`   ${rec}`));
    
    // 9. NEXT STEPS
    console.log('\n9. 🚀 NEXT STEPS:');
    console.log('=================');
    
    if (queueResults.rowCount > 0) {
      const nextAccount = queueResults.rows[0];
      console.log(`🎯 Next account to process: ${nextAccount.username}`);
      console.log(`   Phase: ${nextAccount.phase}`);
      console.log(`   Container: ${nextAccount.container_number}`);
      console.log(`   Needs skip_onboarding: ${!nextAccount.first_automation_completed ? 'Yes' : 'No'}`);
      
      if (stuckProcesses.rowCount === 0) {
        console.log('\n✅ System ready for automation - WarmupQueueService should pick this up automatically');
      } else {
        console.log('\n⚠️ Reset stuck processes first, then automation will resume');
      }
    } else {
      console.log('⏳ No accounts ready - check cooldown timers and content assignment');
    }
    
    console.log('\n✅ Analysis complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in comprehensive analysis:', error);
    process.exit(1);
  }
}

comprehensiveWarmupAnalysis();