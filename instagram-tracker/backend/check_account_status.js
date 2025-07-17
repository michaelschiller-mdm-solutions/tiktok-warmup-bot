/**
 * Check account status for warmup assignment
 * Created to analyze the 95 accounts mentioned by user
 */

const { db } = require('./src/database');

async function checkAccountStatus() {
  try {
    console.log('🔍 Checking account status for warmup assignment...\n');

    // Check accounts with 'ready' or similar states
    const result = await db.query(`
      SELECT 
        lifecycle_state,
        COUNT(*) as count
      FROM accounts 
      WHERE lifecycle_state IN ('ready', 'imported', 'warmup', 'active')
      GROUP BY lifecycle_state
      ORDER BY count DESC
    `);
    
    console.log('📊 Account Lifecycle States:');
    result.rows.forEach(row => {
      console.log(`  ${row.lifecycle_state}: ${row.count} accounts`);
    });
    
    // Check specific accounts that might be 'ready for bot assignment'
    const readyAccounts = await db.query(`
      SELECT 
        id, username, lifecycle_state, status, model_id, container_number,
        created_at, state_changed_at
      FROM accounts 
      WHERE lifecycle_state = 'ready'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('\n📋 Sample Ready Accounts:');
    readyAccounts.rows.forEach(acc => {
      console.log(`  ID: ${acc.id}, Username: ${acc.username}, State: ${acc.lifecycle_state}, Container: ${acc.container_number || 'None'}, Model: ${acc.model_id || 'None'}`);
    });
    
    // Check total count of ready accounts
    const totalReady = await db.query(`
      SELECT COUNT(*) as total FROM accounts WHERE lifecycle_state = 'ready'
    `);
    
    console.log(`\n✅ Total Ready Accounts: ${totalReady.rows[0].total}`);

    // Check if these accounts have warmup phases created
    const warmupPhasesCheck = await db.query(`
      SELECT 
        a.lifecycle_state,
        COUNT(DISTINCT a.id) as accounts_with_phases,
        COUNT(awp.id) as total_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'ready'
      GROUP BY a.lifecycle_state
    `);

    console.log('\n🔄 Warmup Phases Status for Ready Accounts:');
    warmupPhasesCheck.rows.forEach(row => {
      console.log(`  Accounts with phases: ${row.accounts_with_phases}, Total phases: ${row.total_phases}`);
    });

    // Check content assignment status
    const contentCheck = await db.query(`
      SELECT 
        COUNT(DISTINCT awp.account_id) as accounts_with_content,
        COUNT(CASE WHEN awp.assigned_content_id IS NOT NULL OR awp.assigned_text_id IS NOT NULL THEN 1 END) as phases_with_content,
        COUNT(awp.id) as total_phases
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE a.lifecycle_state = 'ready'
    `);

    console.log('\n📝 Content Assignment Status:');
    if (contentCheck.rows.length > 0) {
      const row = contentCheck.rows[0];
      console.log(`  Accounts with content: ${row.accounts_with_content}`);
      console.log(`  Phases with content: ${row.phases_with_content}/${row.total_phases}`);
    }

    await db.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAccountStatus();
