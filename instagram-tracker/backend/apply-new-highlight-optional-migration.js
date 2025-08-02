/**
 * Apply migration to make new_highlight phase optional
 */

const { db } = require('./dist/database');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  try {
    console.log('🔧 Applying migration to make new_highlight phase optional...\n');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/050-make-new-highlight-optional.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Migration content:');
    console.log('   - Excludes new_highlight from warmup completion requirement');
    console.log('   - Excludes first_highlight from warmup completion requirement');
    console.log('   - Both highlight phases are now optional');
    
    // Apply the migration
    console.log('\n🚀 Executing migration...');
    await db.query(migrationSQL);
    
    console.log('✅ Migration applied successfully!');
    
    // Test the updated function
    console.log('\n🧪 Testing updated is_warmup_complete function...');
    
    // Get a test account with new_highlight phase
    const testAccount = await db.query(`
      SELECT 
        a.id,
        a.username,
        COUNT(awp.id) as total_phases,
        COUNT(CASE WHEN awp.status = 'completed' THEN 1 END) as completed_phases,
        COUNT(CASE WHEN awp.phase = 'new_highlight' THEN 1 END) as has_new_highlight,
        is_warmup_complete(a.id) as is_complete_now
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      AND EXISTS (
        SELECT 1 FROM account_warmup_phases 
        WHERE account_id = a.id AND phase = 'new_highlight'
      )
      GROUP BY a.id, a.username
      LIMIT 5
    `);
    
    if (testAccount.rowCount > 0) {
      console.log('\n📊 Test Results:');
      testAccount.rows.forEach(account => {
        console.log(`   ${account.username}:`);
        console.log(`     Total phases: ${account.total_phases}`);
        console.log(`     Completed phases: ${account.completed_phases}`);
        console.log(`     Has new_highlight: ${account.has_new_highlight > 0 ? 'Yes' : 'No'}`);
        console.log(`     Warmup complete: ${account.is_complete_now ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   No accounts with new_highlight phase found for testing');
    }
    
    // Check how many accounts are now considered complete
    const completionStats = await db.query(`
      SELECT 
        COUNT(*) as total_warmup_accounts,
        COUNT(CASE WHEN is_warmup_complete(id) THEN 1 END) as complete_accounts
      FROM accounts 
      WHERE lifecycle_state = 'warmup'
    `);
    
    const stats = completionStats.rows[0];
    console.log(`\n📈 Warmup Completion Stats:`);
    console.log(`   Total warmup accounts: ${stats.total_warmup_accounts}`);
    console.log(`   Complete accounts: ${stats.complete_accounts}`);
    console.log(`   Completion rate: ${Math.round((stats.complete_accounts / stats.total_warmup_accounts) * 100)}%`);
    
    // Show which phases are now required vs optional
    console.log(`\n📋 Phase Requirements After Migration:`);
    console.log(`   ✅ Required phases:`);
    console.log(`      - bio, gender, name, username`);
    console.log(`      - post_caption, post_no_caption`);
    console.log(`      - story_caption, story_no_caption`);
    console.log(`   ⚪ Optional phases (don't block completion):`);
    console.log(`      - manual_setup (always optional)`);
    console.log(`      - first_highlight (made optional previously)`);
    console.log(`      - new_highlight (made optional now)`);
    
    console.log(`\n🎉 Migration completed successfully!`);
    console.log(`   Accounts can now complete warmup without new_highlight phase`);
    console.log(`   The missing script won't block warmup completion anymore`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await db.end();
  }
}

applyMigration();