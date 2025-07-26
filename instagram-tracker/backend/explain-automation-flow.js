/**
 * Explain how the automation works and check current account states
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function explainAutomationFlow() {
  try {
    console.log('🤖 HOW THE WARMUP AUTOMATION WORKS');
    console.log('==================================\n');

    // 1. Show current account states
    console.log('📊 1. CURRENT ACCOUNT STATES');
    console.log('----------------------------');
    
    const accountStatesQuery = `
      SELECT 
        lifecycle_state,
        COUNT(*) as count,
        array_agg(DISTINCT username ORDER BY username) as sample_accounts
      FROM accounts 
      WHERE lifecycle_state IS NOT NULL
      GROUP BY lifecycle_state
      ORDER BY count DESC
    `;
    
    const statesResult = await pool.query(accountStatesQuery);
    statesResult.rows.forEach(row => {
      const samples = row.sample_accounts.slice(0, 3).join(', ');
      console.log(`   ${row.lifecycle_state}: ${row.count} accounts (e.g., ${samples})`);
    });

    // 2. Show phase distribution
    console.log('\n🔄 2. PHASE DISTRIBUTION');
    console.log('------------------------');
    
    const phasesQuery = `
      SELECT 
        awp.phase,
        awp.status,
        COUNT(*) as count,
        array_agg(DISTINCT a.username ORDER BY a.username) as sample_accounts
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE a.lifecycle_state = 'warmup'
      GROUP BY awp.phase, awp.status
      ORDER BY awp.phase, awp.status
    `;
    
    const phasesResult = await pool.query(phasesQuery);
    let currentPhase = '';
    phasesResult.rows.forEach(row => {
      if (row.phase !== currentPhase) {
        console.log(`\n   📋 ${row.phase.toUpperCase()}:`);
        currentPhase = row.phase;
      }
      const samples = row.sample_accounts.slice(0, 2).join(', ');
      console.log(`      ${row.status}: ${row.count} accounts (${samples})`);
    });

    // 3. Show ready accounts for processing
    console.log('\n🎯 3. ACCOUNTS READY FOR PROCESSING');
    console.log('-----------------------------------');
    
    const readyQuery = `
      SELECT 
        bra.id, bra.username, bra.container_number, bra.ready_phases,
        bra.next_phase_info, bra.has_required_content
      FROM bot_ready_accounts bra
      WHERE bra.ready_phases > 0
      ORDER BY bra.ready_phases DESC
      LIMIT 10
    `;
    
    const readyResult = await pool.query(readyQuery);
    console.log(`   Found ${readyResult.rows.length} accounts ready for processing:`);
    
    readyResult.rows.forEach(account => {
      const nextPhase = account.next_phase_info?.phase || 'None';
      console.log(`   - ${account.username} (${account.id}): Container ${account.container_number}, Next: ${nextPhase}, Ready: ${account.ready_phases}`);
    });

    // 4. Explain the automation flow
    console.log('\n⚙️  4. AUTOMATION FLOW EXPLANATION');
    console.log('----------------------------------');
    
    console.log(`
   The automation works like this:
   
   🔄 EVERY 30 SECONDS:
   1. WarmupQueueService polls bot_ready_accounts view
   2. Finds accounts with ready_phases > 0
   3. Selects ONE account (single bot constraint)
   4. Gets the next available phase for that account
   
   📱 FOR EACH SELECTED ACCOUNT:
   1. Send content to iPhone (images → gallery, text → clipboard)
   2. Navigate to correct Instagram container on iPhone
   3. Execute phase-specific Lua script
   4. Update database: pending → in_progress → completed
   5. Apply cooldown (15-24 hours) before next phase
   
   🎲 PHASE SELECTION:
   - NOT sequential - picks RANDOM available phase
   - Respects dependencies (new_highlight needs first_highlight)
   - Continues until ALL phases completed
   - Final phase: set_to_private (makes account private)
    `);

    // 5. Check username phase specifically
    console.log('\n👤 5. USERNAME PHASE ANALYSIS');
    console.log('-----------------------------');
    
    const usernameQuery = `
      SELECT 
        a.id, a.username, awp.status, awp.assigned_text_id,
        ctc.text_content as new_username,
        awp.completed_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'username'
      AND a.lifecycle_state = 'warmup'
      ORDER BY awp.updated_at DESC
      LIMIT 5
    `;
    
    const usernameResult = await pool.query(usernameQuery);
    console.log(`   Username phases found: ${usernameResult.rows.length}`);
    
    usernameResult.rows.forEach(row => {
      console.log(`   - ${row.username} → "${row.new_username}" (${row.status})`);
      if (row.completed_at) {
        console.log(`     ⚠️  COMPLETED but username NOT updated in database!`);
      }
    });

    if (usernameResult.rows.length > 0) {
      console.log(`\n   🚨 USERNAME UPDATE ISSUE DETECTED:`);
      console.log(`   The WarmupPhases.md mentions: "After this step, the username needs to be updated in our database"`);
      console.log(`   But the current automation doesn't update the database username field!`);
    }

  } catch (error) {
    console.error('❌ Error explaining automation:', error);
  } finally {
    await pool.end();
  }
}

explainAutomationFlow();