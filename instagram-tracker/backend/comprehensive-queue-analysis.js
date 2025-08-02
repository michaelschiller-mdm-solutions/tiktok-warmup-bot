// Comprehensive analysis of the queue system, phase completion, cooldowns, and account discovery
const { db } = require('./dist/database');

async function comprehensiveQueueAnalysis() {
  try {
    console.log('🔍 COMPREHENSIVE QUEUE SYSTEM ANALYSIS');
    console.log('=====================================\n');
    
    // 1. QUEUE DISCOVERY - How many accounts are actually ready?
    console.log('1. 📊 QUEUE DISCOVERY ANALYSIS:');
    console.log('===============================');
    
    // Total accounts in warmup
    const totalWarmup = await db.query(`
      SELECT COUNT(*) as count
      FROM accounts 
      WHERE lifecycle_state = 'warmup'
    `);
    console.log(`Total accounts in warmup: ${totalWarmup.rows[0].count}`);
    
    // Accounts by status
    const statusBreakdown = await db.query(`
      SELECT 
        awp.status,
        COUNT(*) as count
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      GROUP BY awp.status
      ORDER BY count DESC
    `);
    
    console.log('\nPhase status breakdown:');
    statusBreakdown.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count} phases`);
    });
    
    // Available phases (ready now)
    const availableNow = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.available_at,
        awp.assigned_content_id,
        awp.assigned_text_id,
        CASE 
          WHEN awp.available_at <= NOW() THEN 'READY NOW'
          ELSE CONCAT('Available in ', ROUND(EXTRACT(EPOCH FROM (awp.available_at - NOW())) / 60), ' minutes')
        END as availability
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND awp.status = 'available'
      ORDER BY awp.available_at ASC
      LIMIT 20
    `);
    
    console.log(`\nAccounts ready for processing (showing first 20 of ${availableNow.rowCount}):`);
    availableNow.rows.forEach(row => {
      const contentStatus = row.assigned_content_id ? '✅' : '❌';
      const textStatus = row.assigned_text_id ? '✅' : '❌';
      console.log(`  - ${row.username}: ${row.phase} (${row.availability}) [Content:${contentStatus} Text:${textStatus}]`);
    });
    
    // 2. PHASE COMPLETION & COOLDOWN MECHANISM
    console.log('\n2. 🔄 PHASE COMPLETION & COOLDOWN ANALYSIS:');
    console.log('==========================================');
    
    // Recent completions
    const recentCompletions = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.completed_at,
        awp.bot_id,
        EXTRACT(EPOCH FROM (NOW() - awp.completed_at)) / 60 as minutes_ago
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'completed'
      AND awp.completed_at > NOW() - INTERVAL '2 hours'
      ORDER BY awp.completed_at DESC
      LIMIT 10
    `);
    
    console.log(`Recent completions (last 2 hours):`);
    if (recentCompletions.rowCount === 0) {
      console.log('  No recent completions found');
    } else {
      recentCompletions.rows.forEach(row => {
        console.log(`  - ${row.username}: ${row.phase} (${Math.round(row.minutes_ago)} min ago, bot: ${row.bot_id})`);
      });
    }
    
    // Check if completed phases triggered next phases
    console.log('\nChecking if completed phases triggered next phases:');
    const phaseProgression = await db.query(`
      SELECT 
        a.username,
        completed.phase as completed_phase,
        completed.completed_at,
        next_available.phase as next_phase,
        next_available.available_at,
        EXTRACT(EPOCH FROM (next_available.available_at - completed.completed_at)) / 3600 as cooldown_hours
      FROM accounts a
      JOIN account_warmup_phases completed ON a.id = completed.account_id
      LEFT JOIN account_warmup_phases next_available ON a.id = next_available.account_id
      WHERE completed.status = 'completed'
      AND completed.completed_at > NOW() - INTERVAL '2 hours'
      AND next_available.status = 'available'
      AND next_available.available_at > completed.completed_at
      ORDER BY completed.completed_at DESC
      LIMIT 10
    `);
    
    if (phaseProgression.rowCount === 0) {
      console.log('  No clear phase progressions found in recent completions');
    } else {
      phaseProgression.rows.forEach(row => {
        console.log(`  - ${row.username}: ${row.completed_phase} → ${row.next_phase} (${Math.round(row.cooldown_hours * 10) / 10}h cooldown)`);
      });
    }
    
    // 3. FIRST AUTOMATION CHECK
    console.log('\n3. 🚀 FIRST AUTOMATION ANALYSIS:');
    console.log('===============================');
    
    // Check first_automation_completed flag
    const firstAutomationStats = await db.query(`
      SELECT 
        first_automation_completed,
        COUNT(*) as count
      FROM accounts 
      WHERE lifecycle_state = 'warmup'
      GROUP BY first_automation_completed
    `);
    
    console.log('First automation status:');
    firstAutomationStats.rows.forEach(row => {
      const status = row.first_automation_completed ? 'Completed' : 'Needs skip_onboarding.lua';
      console.log(`  ${status}: ${row.count} accounts`);
    });
    
    // Accounts that need skip_onboarding
    const needsSkipOnboarding = await db.query(`
      SELECT 
        a.username,
        a.first_automation_completed,
        COUNT(CASE WHEN awp.status = 'available' THEN 1 END) as available_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND a.first_automation_completed = false
      GROUP BY a.id, a.username, a.first_automation_completed
      LIMIT 10
    `);
    
    console.log(`\nAccounts needing skip_onboarding.lua (showing first 10):`);
    needsSkipOnboarding.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.available_phases} available phases`);
    });
    
    // 4. USERNAME COMPLETION ANALYSIS
    console.log('\n4. 🔤 USERNAME COMPLETION ANALYSIS:');
    console.log('==================================');
    
    // Username phases and their status
    const usernamePhases = await db.query(`
      SELECT 
        a.username as account_username,
        awp.phase,
        awp.status,
        awp.completed_at,
        ctc.text_content as assigned_username_text,
        awp.assigned_text_id
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'username'
      AND (awp.status = 'completed' OR awp.status = 'available')
      ORDER BY awp.completed_at DESC NULLS LAST
      LIMIT 15
    `);
    
    console.log('Username phases (completed and available):');
    usernamePhases.rows.forEach(row => {
      const expectedUsername = row.assigned_username_text ? 
        `${row.assigned_username_text}${row.assigned_username_text.slice(-1).toLowerCase()}${row.assigned_username_text.slice(-1).toLowerCase()}` : 
        'No text assigned';
      const match = row.account_username === expectedUsername ? '✅' : '❌';
      console.log(`  - ${row.account_username} (${row.status}): assigned "${row.assigned_username_text}" → expected "${expectedUsername}" ${match}`);
    });
    
    // 5. QUEUE DISCOVERY LOGIC ANALYSIS
    console.log('\n5. 🔍 QUEUE DISCOVERY LOGIC ANALYSIS:');
    console.log('====================================');
    
    // Simulate the exact query used by getValidatedReadyAccounts
    const queueQuery = `
      SELECT 
        a.id,
        a.username,
        a.model_id,
        a.container_number,
        a.lifecycle_state,
        a.first_automation_completed,
        JSON_BUILD_OBJECT(
          'id', awp.id,
          'phase', awp.phase,
          'status', awp.status,
          'available_at', awp.available_at,
          'assigned_content_id', awp.assigned_content_id,
          'assigned_text_id', awp.assigned_text_id
        ) as next_phase_info
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND a.container_number IS NOT NULL
      AND awp.status = 'available'
      AND awp.available_at <= NOW()
      ORDER BY awp.available_at ASC
      LIMIT 10
    `;
    
    const queueResults = await db.query(queueQuery);
    console.log(`Queue discovery query results: ${queueResults.rowCount} accounts found`);
    
    queueResults.rows.forEach(row => {
      const phase = row.next_phase_info;
      const hasContent = phase.assigned_content_id ? '✅' : '❌';
      const hasText = phase.assigned_text_id ? '✅' : '❌';
      const firstAuto = row.first_automation_completed ? '✅' : '❌ (needs skip_onboarding)';
      console.log(`  - ${row.username}: ${phase.phase} [Content:${hasContent} Text:${hasText} FirstAuto:${firstAuto}]`);
    });
    
    // 6. CONTENT ASSIGNMENT STATUS
    console.log('\n6. 📋 CONTENT ASSIGNMENT STATUS:');
    console.log('===============================');
    
    const contentAssignmentStats = await db.query(`
      SELECT 
        awp.phase,
        COUNT(*) as total,
        COUNT(awp.assigned_content_id) as has_content,
        COUNT(awp.assigned_text_id) as has_text,
        COUNT(CASE WHEN awp.status = 'available' AND awp.available_at <= NOW() THEN 1 END) as ready_now
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      GROUP BY awp.phase
      ORDER BY ready_now DESC, total DESC
    `);
    
    console.log('Content assignment by phase:');
    contentAssignmentStats.rows.forEach(row => {
      const contentPct = Math.round((row.has_content / row.total) * 100);
      const textPct = Math.round((row.has_text / row.total) * 100);
      console.log(`  ${row.phase}: ${row.ready_now}/${row.total} ready (Content:${contentPct}% Text:${textPct}%)`);
    });
    
    // 7. SUMMARY & RECOMMENDATIONS
    console.log('\n7. 💡 SUMMARY & RECOMMENDATIONS:');
    console.log('===============================');
    
    const totalAvailable = await db.query(`
      SELECT COUNT(*) as count
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND awp.status = 'available'
      AND awp.available_at <= NOW()
    `);
    
    const totalPending = await db.query(`
      SELECT COUNT(*) as count
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND awp.status = 'pending'
    `);
    
    console.log(`📊 Queue Status:`);
    console.log(`  - Available now: ${totalAvailable.rows[0].count} phases`);
    console.log(`  - Pending (future): ${totalPending.rows[0].count} phases`);
    console.log(`  - Total warmup accounts: ${totalWarmup.rows[0].count}`);
    
    if (totalAvailable.rows[0].count < 10) {
      console.log('\n⚠️  WARNING: Low number of available phases');
      console.log('   - Check if cooldowns are too long');
      console.log('   - Verify content assignment is working');
      console.log('   - Check if phase completion is triggering next phases');
    }
    
    if (needsSkipOnboarding.rowCount > 0) {
      console.log(`\n🚀 FIRST AUTOMATION: ${needsSkipOnboarding.rowCount} accounts need skip_onboarding.lua`);
    }
    
    console.log('\n✅ Analysis complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in comprehensive analysis:', error);
    process.exit(1);
  }
}

comprehensiveQueueAnalysis();