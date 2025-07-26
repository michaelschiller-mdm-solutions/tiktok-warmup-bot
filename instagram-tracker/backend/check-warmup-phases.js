/**
 * Check what warmup phases exist and which need automation
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkWarmupPhases() {
  try {
    console.log('🔍 CHECKING WARMUP PHASES');
    console.log('=========================\n');

    // Get all distinct phases in the system
    const phasesQuery = `
      SELECT 
        phase,
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
      FROM account_warmup_phases 
      GROUP BY phase
      ORDER BY total_accounts DESC
    `;
    
    const phasesResult = await pool.query(phasesQuery);
    console.log('📊 All warmup phases in system:');
    console.log('Phase                | Total | Available | Pending | Completed');
    console.log('---------------------|-------|-----------|---------|----------');
    
    phasesResult.rows.forEach(row => {
      const phase = row.phase.padEnd(20);
      const total = row.total_accounts.toString().padStart(5);
      const available = row.available.toString().padStart(9);
      const pending = row.pending.toString().padStart(7);
      const completed = row.completed.toString().padStart(9);
      console.log(`${phase} | ${total} | ${available} | ${pending} | ${completed}`);
    });

    // Check which phases are currently available for processing
    const availablePhasesQuery = `
      SELECT 
        awp.phase,
        COUNT(*) as count,
        array_agg(DISTINCT a.username) as sample_accounts
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.status = 'available'
      AND a.lifecycle_state = 'warmup'
      AND a.container_number IS NOT NULL
      GROUP BY awp.phase
      ORDER BY count DESC
    `;
    
    const availableResult = await pool.query(availablePhasesQuery);
    console.log('\n🎯 Phases ready for automation:');
    availableResult.rows.forEach(row => {
      console.log(`  - ${row.phase}: ${row.count} accounts (e.g., ${row.sample_accounts.slice(0, 3).join(', ')})`);
    });

    // Check the WarmupPhases.md to see what phases need automation
    const fs = require('fs');
    const path = require('path');
    const warmupPhasesPath = path.join(__dirname, '../bot/WarmupPhases.md');
    
    if (fs.existsSync(warmupPhasesPath)) {
      const content = fs.readFileSync(warmupPhasesPath, 'utf8');
      const phaseMatches = content.match(/## Phase [^#]+/g) || [];
      
      console.log('\n📋 Phases defined in WarmupPhases.md:');
      phaseMatches.forEach(match => {
        const phaseName = match.replace('## Phase ', '').split('\n')[0];
        console.log(`  - ${phaseName}`);
      });
    }

    // Check which phases need manual vs automated handling
    console.log('\n🤖 Phase automation requirements:');
    
    const phaseAutomationMap = {
      'manual_setup': 'MANUAL - No automation needed',
      'bio': 'AUTOMATED - change_bio_to_clipboard.lua',
      'gender': 'AUTOMATED - change_gender_to_female.lua', 
      'name': 'AUTOMATED - change_name_to_clipboard.lua',
      'username': 'AUTOMATED - change_username_to_clipboard.lua',
      'first_highlight': 'AUTOMATED - upload_first_highlight_group_with_clipboard_name_newest_media_no_caption.lua',
      'new_highlight': 'AUTOMATED - upload_new_highlightgroup_clipboard_name_newest_media_no_caption.lua',
      'post_caption': 'AUTOMATED - upload_post_newest_media_clipboard_caption.lua',
      'post_no_caption': 'AUTOMATED - upload_post_newest_media_no_caption.lua',
      'story_caption': 'AUTOMATED - upload_story_newest_media_clipboard_caption.lua',
      'story_no_caption': 'AUTOMATED - upload_story_newest_media_no_caption.lua',
      'set_to_private': 'AUTOMATED - set_account_private.lua'
    };

    Object.entries(phaseAutomationMap).forEach(([phase, automation]) => {
      const phaseData = phasesResult.rows.find(r => r.phase === phase);
      const count = phaseData ? phaseData.total_accounts : 0;
      console.log(`  - ${phase.padEnd(15)}: ${automation} (${count} accounts)`);
    });

  } catch (error) {
    console.error('❌ Error checking warmup phases:', error);
  } finally {
    await pool.end();
  }
}

checkWarmupPhases();