/**
 * Diagnostic script for djawab9si account and post_no_caption phase
 */

const { Pool } = require('pg');

const db = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function diagnoseDjawab9si() {
  try {
    console.log('🔍 Diagnosing djawab9si account and post_no_caption phase...\n');
    
    // 1. Check account details
    const accountQuery = `
      SELECT id, username, container_number, lifecycle_state, model_id
      FROM accounts 
      WHERE username = 'djawab9si'
    `;
    
    const account = await db.query(accountQuery);
    
    if (account.rows.length === 0) {
      console.log('❌ Account djawab9si not found!');
      return;
    }
    
    const accountData = account.rows[0];
    console.log('📋 Account Details:');
    console.log(`  • ID: ${accountData.id}`);
    console.log(`  • Username: ${accountData.username}`);
    console.log(`  • Container: ${accountData.container_number}`);
    console.log(`  • Lifecycle State: ${accountData.lifecycle_state}`);
    console.log(`  • Model ID: ${accountData.model_id}\n`);
    
    // 2. Check warmup phase status
    const phaseQuery = `
      SELECT 
        id, phase, status, available_at, started_at, completed_at,
        assigned_content_id, assigned_text_id, content_assigned_at,
        error_message, retry_count
      FROM account_warmup_phases 
      WHERE account_id = $1 AND phase = 'post_no_caption'
    `;
    
    const phase = await db.query(phaseQuery, [accountData.id]);
    
    if (phase.rows.length === 0) {
      console.log('❌ post_no_caption phase not found for this account!');
      return;
    }
    
    const phaseData = phase.rows[0];
    console.log('📋 Phase Details:');
    console.log(`  • Phase ID: ${phaseData.id}`);
    console.log(`  • Status: ${phaseData.status}`);
    console.log(`  • Available At: ${phaseData.available_at}`);
    console.log(`  • Started At: ${phaseData.started_at}`);
    console.log(`  • Completed At: ${phaseData.completed_at}`);
    console.log(`  • Assigned Content ID: ${phaseData.assigned_content_id}`);
    console.log(`  • Assigned Text ID: ${phaseData.assigned_text_id}`);
    console.log(`  • Content Assigned At: ${phaseData.content_assigned_at}`);
    console.log(`  • Error Message: ${phaseData.error_message}`);
    console.log(`  • Retry Count: ${phaseData.retry_count}\n`);
    
    // 3. Check content assignment details
    if (phaseData.assigned_content_id) {
      const contentQuery = `
        SELECT id, filename, original_name, file_path, content_type, categories, status
        FROM central_content 
        WHERE id = $1
      `;
      
      const content = await db.query(contentQuery, [phaseData.assigned_content_id]);
      
      if (content.rows.length > 0) {
        const contentData = content.rows[0];
        console.log('📋 Assigned Content Details:');
        console.log(`  • Content ID: ${contentData.id}`);
        console.log(`  • Filename: ${contentData.filename}`);
        console.log(`  • Original Name: ${contentData.original_name}`);
        console.log(`  • File Path: ${contentData.file_path}`);
        console.log(`  • Content Type: ${contentData.content_type}`);
        console.log(`  • Categories: ${JSON.stringify(contentData.categories)}`);
        console.log(`  • Status: ${contentData.status}\n`);
        
        // Check if file exists
        const fs = require('fs');
        const path = require('path');
        const fullPath = path.join(process.cwd(), contentData.file_path);
        const fileExists = fs.existsSync(fullPath);
        console.log(`📁 File Exists: ${fileExists ? '✅ YES' : '❌ NO'}`);
        if (fileExists) {
          const stats = fs.statSync(fullPath);
          console.log(`📁 File Size: ${Math.round(stats.size / 1024)}KB`);
        }
        console.log('');
      }
    } else {
      console.log('⚠️ NO CONTENT ASSIGNED to this phase!\n');
    }
    
    // 4. Check if content assignment is complete for this account
    const completionQuery = `
      SELECT is_content_assignment_complete($1) as is_complete
    `;
    
    const completion = await db.query(completionQuery, [accountData.id]);
    const isComplete = completion.rows[0].is_complete;
    
    console.log(`📋 Content Assignment Status: ${isComplete ? '✅ COMPLETE' : '❌ INCOMPLETE'}\n`);
    
    // 5. Check available content for post category
    const availableContentQuery = `
      SELECT COUNT(*) as count
      FROM central_content 
      WHERE categories @> '["post"]'::jsonb 
      AND status = 'active'
    `;
    
    const availableContent = await db.query(availableContentQuery);
    const contentCount = availableContent.rows[0].count;
    
    console.log(`📋 Available Post Content: ${contentCount} items\n`);
    
    // 6. Check what should happen next
    console.log('🎯 DIAGNOSIS:');
    
    if (!phaseData.assigned_content_id) {
      console.log('❌ PROBLEM: No content assigned to post_no_caption phase');
      console.log('💡 SOLUTION: Run content assignment for this account');
      console.log('   Command: node src/scripts/assign-content-simple.js ' + accountData.id);
    } else if (phaseData.status === 'in_progress') {
      console.log('⚠️ ISSUE: Phase is in_progress but may be stuck');
      console.log('💡 Check if automation is actually running or if it needs to be reset');
    } else if (phaseData.status === 'available') {
      console.log('✅ Phase looks ready to run');
      console.log('💡 Content is assigned and phase is available');
    } else {
      console.log(`ℹ️ Phase status: ${phaseData.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error during diagnosis:', error.message);
  } finally {
    process.exit(0);
  }
}

diagnoseDjawab9si();