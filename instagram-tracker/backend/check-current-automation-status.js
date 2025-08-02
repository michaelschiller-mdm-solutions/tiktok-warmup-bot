// Check current automation status after server restart
const { db } = require('./dist/database');

async function checkAutomationStatus() {
  try {
    console.log('📊 CURRENT AUTOMATION STATUS');
    console.log('============================\n');
    
    // 1. Check accounts in progress
    console.log('1. 🔄 ACCOUNTS IN PROGRESS:');
    const inProgress = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.started_at,
        EXTRACT(EPOCH FROM (NOW() - awp.started_at)) / 60 as minutes_running
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'in_progress'
      ORDER BY awp.started_at DESC
    `);
    
    if (inProgress.rowCount === 0) {
      console.log('✅ No accounts currently in progress');
    } else {
      inProgress.rows.forEach(row => {
        console.log(`  - ${row.username}: ${row.phase} (running ${Math.round(row.minutes_running)} minutes)`);
      });
    }
    
    // 2. Check ready accounts
    console.log('\n2. ⏳ ACCOUNTS READY FOR PROCESSING:');
    const readyAccounts = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.available_at,
        CASE 
          WHEN awp.available_at <= NOW() THEN 'READY NOW'
          ELSE CONCAT('Available in ', EXTRACT(EPOCH FROM (awp.available_at - NOW())) / 60, ' minutes')
        END as availability_status
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'available'
      ORDER BY awp.available_at ASC
      LIMIT 10
    `);
    
    console.log(`Found ${readyAccounts.rowCount} ready accounts:`);
    readyAccounts.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.phase} (${row.availability_status})`);
    });
    
    // 3. Check recent completions
    console.log('\n3. ✅ RECENT COMPLETIONS (last hour):');
    const recentCompletions = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.completed_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'completed'
      AND awp.completed_at > NOW() - INTERVAL '1 hour'
      ORDER BY awp.completed_at DESC
      LIMIT 10
    `);
    
    if (recentCompletions.rowCount === 0) {
      console.log('No recent completions in the last hour');
    } else {
      recentCompletions.rows.forEach(row => {
        console.log(`  - ${row.username}: ${row.phase} (completed at ${row.completed_at})`);
      });
    }
    
    // 4. Verify our fixes are still working
    console.log('\n4. 🔧 VERIFYING IMPLEMENTED FIXES:');
    
    // Check story_caption removal
    const storyCaptionCount = await db.query(`
      SELECT COUNT(*) as count FROM account_warmup_phases WHERE phase = 'story_caption'
    `);
    console.log(`✅ story_caption phases: ${storyCaptionCount.rows[0].count} (should be 0)`);
    
    // Check username uniqueness
    const duplicateUsernames = await db.query(`
      SELECT COUNT(*) as count
      FROM (
        SELECT assigned_text_id
        FROM account_warmup_phases 
        WHERE phase = 'username' AND assigned_text_id IS NOT NULL
        GROUP BY assigned_text_id
        HAVING COUNT(*) > 1
      ) duplicates
    `);
    console.log(`✅ Duplicate username assignments: ${duplicateUsernames.rows[0].count} (should be 0)`);
    
    // 5. System health summary
    console.log('\n5. 🎯 SYSTEM HEALTH SUMMARY:');
    const systemStats = await db.query(`
      SELECT 
        COUNT(CASE WHEN awp.status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN awp.status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN awp.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN awp.status = 'pending' THEN 1 END) as pending
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE a.lifecycle_state = 'warmup'
    `);
    
    const stats = systemStats.rows[0];
    console.log(`📊 Phase Status Distribution:`);
    console.log(`   Available: ${stats.available} (ready to process)`);
    console.log(`   In Progress: ${stats.in_progress} (currently running)`);
    console.log(`   Completed: ${stats.completed} (finished successfully)`);
    console.log(`   Pending: ${stats.pending} (awaiting cooldowns)`);
    
    if (stats.in_progress === '0' && stats.available > 0) {
      console.log('\n🚀 AUTOMATION READY: No processes running, accounts available for processing');
    } else if (stats.in_progress === '1') {
      console.log('\n⏳ AUTOMATION ACTIVE: One account being processed (correct single-bot behavior)');
    } else if (stats.in_progress > 1) {
      console.log('\n⚠️ WARNING: Multiple accounts in progress (should not happen with single-bot constraint)');
    }
    
    console.log('\n✅ Status check complete!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking automation status:', error);
    process.exit(1);
  }
}

checkAutomationStatus();