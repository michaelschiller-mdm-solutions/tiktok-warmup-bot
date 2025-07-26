/**
 * Check content assignment status for accounts
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkContentAssignment() {
  try {
    console.log('🔍 Checking content assignment status...\n');

    // Check recent accounts and their content
    const accountsQuery = `
      SELECT a.id, a.username, a.status, a.container_number, a.model_id
      FROM accounts a
      ORDER BY a.created_at DESC 
      LIMIT 5
    `;
    
    const accountsResult = await pool.query(accountsQuery);
    console.log(`📊 Recent accounts: ${accountsResult.rows.length}`);
    
    for (const account of accountsResult.rows) {
      console.log(`\n👤 Account: ${account.username} (ID: ${account.id}, Model: ${account.model_id})`);
      
      // Check assigned content for this account
      const contentQuery = `
        SELECT ac.phase, ac.content_type, ac.file_path, ac.text_content, ac.assigned_at
        FROM assigned_content ac
        WHERE ac.account_id = $1
        ORDER BY ac.assigned_at DESC
        LIMIT 10
      `;
      
      const contentResult = await pool.query(contentQuery, [account.id]);
      console.log(`  📁 Assigned content: ${contentResult.rows.length} items`);
      
      contentResult.rows.forEach(content => {
        if (content.content_type === 'image') {
          console.log(`    - ${content.phase}: IMAGE - ${content.file_path}`);
        } else if (content.content_type === 'text') {
          console.log(`    - ${content.phase}: TEXT - "${content.text_content}"`);
        }
      });
      
      // Check if files exist for image content
      const imageContent = contentResult.rows.filter(c => c.content_type === 'image');
      if (imageContent.length > 0) {
        console.log(`  🖼️  Checking file paths...`);
        const fs = require('fs');
        imageContent.forEach(content => {
          const exists = fs.existsSync(content.file_path);
          console.log(`    - ${content.file_path}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
        });
      }
    }

    // Check warmup phases for an account
    if (accountsResult.rows.length > 0) {
      const accountId = accountsResult.rows[0].id;
      const phasesQuery = `
        SELECT phase, status, assigned_at, completed_at, cooldown_until
        FROM warmup_phases 
        WHERE account_id = $1 
        ORDER BY assigned_at DESC
      `;
      
      const phasesResult = await pool.query(phasesQuery, [accountId]);
      console.log(`\n🔄 Warmup phases for ${accountsResult.rows[0].username}: ${phasesResult.rows.length}`);
      phasesResult.rows.forEach(phase => {
        console.log(`  - ${phase.phase}: ${phase.status} (Cooldown: ${phase.cooldown_until})`);
      });
    }

  } catch (error) {
    console.error('❌ Error checking content assignment:', error);
  } finally {
    await pool.end();
  }
}

checkContentAssignment();