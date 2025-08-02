/**
 * Reset accounts stuck on new_highlight phase due to missing script
 */

const { db } = require('./dist/database');

async function resetStuckNewHighlightAccounts() {
  try {
    console.log('🔧 Resetting accounts stuck on new_highlight phase...\n');
    
    // Find accounts stuck on new_highlight phase
    const stuckAccounts = await db.query(`
      SELECT 
        a.id,
        a.username,
        awp.id as phase_id,
        awp.phase,
        awp.status,
        awp.error_message,
        awp.started_at,
        awp.updated_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.phase = 'new_highlight'
      AND awp.status IN ('in_progress', 'failed')
      ORDER BY awp.updated_at DESC
    `);
    
    console.log(`📋 Found ${stuckAccounts.rowCount} accounts stuck on new_highlight phase:`);
    
    if (stuckAccounts.rowCount === 0) {
      console.log('   No stuck accounts found');
      return;
    }
    
    // Show stuck accounts
    stuckAccounts.rows.forEach(account => {
      console.log(`   - ${account.username}: ${account.status}`);
      if (account.error_message) {
        console.log(`     Error: ${account.error_message.substring(0, 100)}...`);
      }
      console.log(`     Last updated: ${account.updated_at}`);
    });
    
    // Reset the stuck phases
    console.log(`\n🔄 Resetting stuck new_highlight phases...`);
    
    const resetResult = await db.query(`
      UPDATE account_warmup_phases 
      SET 
        status = 'available',
        bot_id = NULL,
        bot_session_id = NULL,
        started_at = NULL,
        error_message = 'Reset due to missing script - phase is now optional',
        updated_at = NOW()
      WHERE phase = 'new_highlight'
      AND status IN ('in_progress', 'failed')
      RETURNING account_id, phase
    `);
    
    console.log(`✅ Reset ${resetResult.rowCount} stuck new_highlight phases`);
    
    // Check if any accounts are now complete after making new_highlight optional
    console.log(`\n🎯 Checking if any accounts are now complete...`);
    
    const nowComplete = await db.query(`
      SELECT 
        a.id,
        a.username,
        is_warmup_complete(a.id) as is_complete
      FROM accounts a
      WHERE a.lifecycle_state = 'warmup'
      AND is_warmup_complete(a.id) = true
      LIMIT 10
    `);
    
    if (nowComplete.rowCount > 0) {
      console.log(`🎉 ${nowComplete.rowCount} accounts are now complete:`);
      nowComplete.rows.forEach(account => {
        console.log(`   - ${account.username} (ID: ${account.id})`);
      });
      
      console.log(`\n💡 These accounts should be moved to 'active' state automatically`);
    } else {
      console.log(`   No accounts are complete yet`);
    }
    
    // Show summary
    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Reset ${resetResult.rowCount} stuck new_highlight phases`);
    console.log(`   🎯 ${nowComplete.rowCount} accounts now complete`);
    console.log(`   ⚪ new_highlight phase is now optional`);
    console.log(`   🚀 Automation can continue without the missing script`);
    
  } catch (error) {
    console.error('❌ Reset failed:', error);
  } finally {
    await db.end();
  }
}

resetStuckNewHighlightAccounts();