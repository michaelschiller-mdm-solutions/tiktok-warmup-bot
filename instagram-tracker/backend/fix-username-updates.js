/**
 * Fix Username Updates Script
 * 
 * This script identifies accounts that have completed the username phase
 * but don't have their database usernames updated, and fixes them.
 */

const { Pool } = require('pg');

const db = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'instagram_tracker',
  user: 'admin',
  password: 'password123'
});

async function updateUsernameInDatabase(accountId, oldUsername) {
  try {
    console.log(`🔄 [USERNAME UPDATE] Starting database update for account ${accountId} (${oldUsername})`);
    
    // Get the assigned username text
    const getNewUsernameQuery = `
      SELECT ctc.text_content as new_username
      FROM account_warmup_phases awp
      JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.account_id = $1 AND awp.phase = 'username'
    `;
    
    console.log(`🔍 [USERNAME UPDATE] Querying assigned username text for account ${accountId}`);
    const result = await db.query(getNewUsernameQuery, [accountId]);
    
    if (result.rows.length === 0) {
      console.error(`❌ [USERNAME UPDATE] No username text found for account ${accountId} - this should not happen!`);
      return false;
    }
    
    let newUsername = result.rows[0].new_username;
    console.log(`📝 [USERNAME UPDATE] Original assigned text: "${newUsername}"`);
    
    // Apply username modification: append last letter twice (same logic as clipboard)
    if (newUsername && newUsername.length > 0) {
      const lastLetter = newUsername.slice(-1).toLowerCase();
      newUsername = newUsername + lastLetter + lastLetter;
      console.log(`🔤 [USERNAME UPDATE] Modified username: ${result.rows[0].new_username} → ${newUsername} (appended "${lastLetter}" twice)`);
    } else {
      console.error(`❌ [USERNAME UPDATE] Invalid username text: "${newUsername}"`);
      return false;
    }
    
    // Update the username in accounts table
    const updateQuery = `
      UPDATE accounts 
      SET username = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING username
    `;
    
    console.log(`💾 [USERNAME UPDATE] Executing database update: ${oldUsername} → ${newUsername}`);
    const updateResult = await db.query(updateQuery, [newUsername, accountId]);
    
    if (updateResult.rowCount === 1) {
      console.log(`✅ [USERNAME UPDATE] SUCCESS: Database updated for account ${accountId}`);
      console.log(`   Old username: ${oldUsername}`);
      console.log(`   New username: ${updateResult.rows[0].username}`);
      console.log(`   Instagram username should now match database username`);
      return true;
    } else {
      console.error(`❌ [USERNAME UPDATE] Database update failed - no rows affected for account ${accountId}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ [USERNAME UPDATE] CRITICAL ERROR updating username for account ${accountId}:`, error);
    console.error(`   This means the database username will NOT match the Instagram username!`);
    return false;
  }
}

async function findAndFixUsernameUpdates() {
  try {
    console.log('🔍 Finding accounts with completed username phases that need database updates...');
    
    // Find accounts with completed username phases
    const query = `
      SELECT 
        a.id,
        a.username as current_username,
        ctc.text_content as assigned_username,
        awp.completed_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'username' 
      AND awp.status = 'completed'
      ORDER BY awp.completed_at DESC
    `;
    
    const result = await db.query(query);
    
    if (result.rows.length === 0) {
      console.log('✅ No accounts with completed username phases found');
      return;
    }
    
    console.log(`📋 Found ${result.rows.length} accounts with completed username phases:`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const row of result.rows) {
      console.log(`\n--- Account ${row.id} (${row.current_username}) ---`);
      console.log(`   Assigned username: ${row.assigned_username}`);
      console.log(`   Completed at: ${row.completed_at}`);
      
      // Check if the username needs to be updated
      const expectedUsername = row.assigned_username + row.assigned_username.slice(-1).toLowerCase() + row.assigned_username.slice(-1).toLowerCase();
      
      if (row.current_username === expectedUsername) {
        console.log(`   ✅ Username already correct: ${row.current_username}`);
        skippedCount++;
      } else {
        console.log(`   ❌ Username needs update: ${row.current_username} → ${expectedUsername}`);
        
        const success = await updateUsernameInDatabase(row.id, row.current_username);
        if (success) {
          updatedCount++;
        }
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total accounts with completed username phases: ${result.rows.length}`);
    console.log(`   Accounts updated: ${updatedCount}`);
    console.log(`   Accounts already correct: ${skippedCount}`);
    
  } catch (error) {
    console.error('❌ Error finding and fixing username updates:', error);
  } finally {
    await db.end();
  }
}

// Run the script
findAndFixUsernameUpdates().catch(console.error); 