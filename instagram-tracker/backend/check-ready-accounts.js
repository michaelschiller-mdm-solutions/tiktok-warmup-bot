/**
 * Check accounts ready for warmup processing
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkReadyAccounts() {
  try {
    console.log('🔍 Checking accounts ready for warmup processing...\n');

    // Check bot_ready_accounts view
    const readyQuery = `
      SELECT bra.id, bra.username, bra.model_id, bra.container_number, 
             bra.lifecycle_state, bra.completed_phases, bra.ready_phases,
             bra.has_required_content, bra.content_readiness, bra.next_phase_info
      FROM bot_ready_accounts bra
      WHERE bra.ready_phases > 0
      ORDER BY bra.ready_phases DESC 
      LIMIT 10
    `;
    
    const readyResult = await pool.query(readyQuery);
    console.log(`🎯 Ready accounts: ${readyResult.rows.length}`);
    
    readyResult.rows.forEach(account => {
      console.log(`\n👤 ${account.username} (ID: ${account.id})`);
      console.log(`   Container: ${account.container_number}, State: ${account.lifecycle_state}`);
      console.log(`   Ready phases: ${account.ready_phases}, Completed: ${account.completed_phases}`);
      console.log(`   Has content: ${account.has_required_content}`);
      console.log(`   Next phase: ${JSON.stringify(account.next_phase_info)}`);
      console.log(`   Content readiness: ${JSON.stringify(account.content_readiness)}`);
    });

    // Check accounts with pending phases
    const pendingQuery = `
      SELECT a.id, a.username, a.status, a.container_number,
             awp.phase, awp.status as phase_status, awp.available_at,
             awp.assigned_text_id, awp.assigned_content_id
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'pending'
      AND a.container_number IS NOT NULL
      ORDER BY awp.created_at DESC
      LIMIT 10
    `;
    
    const pendingResult = await pool.query(pendingQuery);
    console.log(`\n⏳ Accounts with pending phases: ${pendingResult.rows.length}`);
    
    pendingResult.rows.forEach(account => {
      console.log(`  - ${account.username}: ${account.phase} (${account.phase_status})`);
      console.log(`    Container: ${account.container_number}, Available: ${account.available_at}`);
      console.log(`    Content ID: ${account.assigned_content_id}, Text ID: ${account.assigned_text_id}`);
    });

    // Check if content assignment is working
    if (pendingResult.rows.length > 0) {
      const accountId = pendingResult.rows[0].id;
      const textId = pendingResult.rows[0].assigned_text_id;
      
      if (textId) {
        const textQuery = `SELECT * FROM central_text_content WHERE id = $1`;
        const textResult = await pool.query(textQuery, [textId]);
        
        console.log(`\n📝 Text content for account ${pendingResult.rows[0].username}:`);
        if (textResult.rows.length > 0) {
          console.log(`   Text: "${textResult.rows[0].content}"`);
          console.log(`   Category: ${textResult.rows[0].categories}`);
        } else {
          console.log(`   ❌ Text content not found for ID ${textId}`);
        }
      }
    }

    // Test the content assignment function
    console.log(`\n🧪 Testing content assignment function...`);
    try {
      const testQuery = `SELECT is_content_assignment_complete(205) as result`;
      const testResult = await pool.query(testQuery);
      console.log(`   Content assignment complete for account 205: ${testResult.rows[0].result}`);
    } catch (error) {
      console.log(`   ❌ Content assignment function error: ${error.message}`);
    }

  } catch (error) {
    console.error('❌ Error checking ready accounts:', error);
  } finally {
    await pool.end();
  }
}

checkReadyAccounts();