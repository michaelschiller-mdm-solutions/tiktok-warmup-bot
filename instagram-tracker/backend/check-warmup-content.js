/**
 * Check warmup content assignments and account states
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkWarmupContent() {
  try {
    console.log('🔍 Checking warmup content assignments...\n');

    // Check recent accounts and their status
    const accountsQuery = `
      SELECT a.id, a.username, a.status, a.container_number, a.model_id, a.cooldown_until
      FROM accounts a
      ORDER BY a.created_at DESC 
      LIMIT 5
    `;
    
    const accountsResult = await pool.query(accountsQuery);
    console.log(`📊 Recent accounts: ${accountsResult.rows.length}`);
    
    for (const account of accountsResult.rows) {
      console.log(`\n👤 Account: ${account.username} (ID: ${account.id}, Status: ${account.status})`);
      console.log(`   Container: ${account.container_number}, Cooldown: ${account.cooldown_until}`);
      
      // Check warmup content assignments
      const contentQuery = `
        SELECT wca.phase, wca.content_type, wca.file_path, wca.text_content, wca.assigned_at
        FROM warmup_content_assignments wca
        WHERE wca.account_id = $1
        ORDER BY wca.assigned_at DESC
        LIMIT 10
      `;
      
      const contentResult = await pool.query(contentQuery, [account.id]);
      console.log(`   📁 Warmup content: ${contentResult.rows.length} items`);
      
      contentResult.rows.forEach(content => {
        if (content.content_type === 'image') {
          console.log(`     - ${content.phase}: IMAGE - ${content.file_path}`);
        } else if (content.content_type === 'text') {
          console.log(`     - ${content.phase}: TEXT - "${content.text_content}"`);
        }
      });
      
      // Check account warmup phases
      const phasesQuery = `
        SELECT awp.phase, awp.status, awp.assigned_at, awp.completed_at, awp.cooldown_until
        FROM account_warmup_phases awp
        WHERE awp.account_id = $1 
        ORDER BY awp.assigned_at DESC
      `;
      
      const phasesResult = await pool.query(phasesQuery, [account.id]);
      console.log(`   🔄 Warmup phases: ${phasesResult.rows.length}`);
      phasesResult.rows.forEach(phase => {
        console.log(`     - ${phase.phase}: ${phase.status} (Cooldown: ${phase.cooldown_until})`);
      });
    }

    // Check bot_ready_accounts view
    console.log(`\n🤖 Checking bot_ready_accounts view...`);
    const readyQuery = `
      SELECT bra.id, bra.username, bra.status, bra.container_number, bra.ready_phases, bra.completed_phases
      FROM bot_ready_accounts bra
      WHERE bra.ready_phases > 0
      ORDER BY bra.ready_phases DESC 
      LIMIT 5
    `;
    
    const readyResult = await pool.query(readyQuery);
    console.log(`🎯 Ready accounts: ${readyResult.rows.length}`);
    readyResult.rows.forEach(account => {
      console.log(`  - ${account.username}: Ready=${account.ready_phases}, Completed=${account.completed_phases}`);
    });

    // Check if there are any accounts that should be in warmup
    const warmupStatusQuery = `
      SELECT COUNT(*) as total,
             COUNT(CASE WHEN status = 'warmup' THEN 1 END) as warmup_count,
             COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
             COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count
      FROM accounts
    `;
    
    const statusResult = await pool.query(warmupStatusQuery);
    const stats = statusResult.rows[0];
    console.log(`\n📈 Account status summary:`);
    console.log(`  - Total: ${stats.total}`);
    console.log(`  - Warmup: ${stats.warmup_count}`);
    console.log(`  - Active: ${stats.active_count}`);
    console.log(`  - Pending: ${stats.pending_count}`);

  } catch (error) {
    console.error('❌ Error checking warmup content:', error);
  } finally {
    await pool.end();
  }
}

checkWarmupContent();