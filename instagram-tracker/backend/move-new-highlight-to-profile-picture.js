/**
 * Move accounts stuck in new_highlight phase to profile_picture phase
 * 
 * This script addresses accounts that are stuck in the new_highlight phase
 * due to the missing upload_new_highlightgroup_clipboard_name_newest_media_no_caption.lua script.
 * It moves them to the profile_picture phase so they can continue their warmup process.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'instagram_tracker',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

async function moveNewHighlightToProfilePicture() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking for accounts stuck in new_highlight phase...');
    
    // First, find all accounts currently in new_highlight phase
    const stuckAccountsQuery = `
      SELECT 
        awp.account_id,
        a.username,
        a.model_id,
        awp.phase,
        awp.status,
        awp.available_at
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.phase = 'new_highlight'
      ORDER BY a.username;
    `;
    
    const stuckResult = await client.query(stuckAccountsQuery);
    const stuckAccounts = stuckResult.rows;
    
    if (stuckAccounts.length === 0) {
      console.log('✅ No accounts found stuck in new_highlight phase');
      return;
    }
    
    console.log(`📊 Found ${stuckAccounts.length} accounts stuck in new_highlight phase:`);
    stuckAccounts.forEach(account => {
      console.log(`  - ${account.username} (ID: ${account.account_id}) - Status: ${account.status}`);
    });
    
    console.log('\n🔄 Moving accounts to profile_picture phase...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const account of stuckAccounts) {
      try {
        // Mark the new_highlight phase as skipped
        const updateNewHighlightQuery = `
          UPDATE account_warmup_phases 
          SET 
            status = 'skipped',
            completed_at = NOW(),
            updated_at = NOW()
          WHERE account_id = $1 AND phase = 'new_highlight';
        `;
        
        await client.query(updateNewHighlightQuery, [account.account_id]);
        
        // Check if profile_picture phase already exists for this account
        const checkProfilePictureQuery = `
          SELECT id, status FROM account_warmup_phases 
          WHERE account_id = $1 AND phase = 'profile_picture';
        `;
        
        const profilePictureResult = await client.query(checkProfilePictureQuery, [account.account_id]);
        
        if (profilePictureResult.rows.length > 0) {
          // Profile picture phase exists, update it to be available
          const updateProfilePictureQuery = `
            UPDATE account_warmup_phases 
            SET 
              status = 'available',
              available_at = NOW(),
              updated_at = NOW()
            WHERE account_id = $1 AND phase = 'profile_picture';
          `;
          
          await client.query(updateProfilePictureQuery, [account.account_id]);
          console.log(`  ✅ Updated existing profile_picture phase for ${account.username} (ID: ${account.account_id})`);
        } else {
          // Profile picture phase doesn't exist, create it
          const createProfilePictureQuery = `
            INSERT INTO account_warmup_phases (
              account_id, 
              phase, 
              status, 
              available_at,
              phase_order,
              created_at,
              updated_at
            )
            VALUES (
              $1, 
              'profile_picture', 
              'available', 
              NOW(),
              (SELECT phase_order FROM account_warmup_phases WHERE account_id = $1 AND phase = 'username' LIMIT 1) + 1,
              NOW(),
              NOW()
            );
          `;
          
          await client.query(createProfilePictureQuery, [account.account_id]);
          console.log(`  ✅ Created profile_picture phase for ${account.username} (ID: ${account.account_id})`);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`  ❌ Failed to move ${account.username} (ID: ${account.account_id}):`, error.message);
        errorCount++;
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n📈 Migration Summary:');
    console.log(`  ✅ Successfully moved: ${successCount} accounts`);
    console.log(`  ❌ Failed to move: ${errorCount} accounts`);
    
    if (successCount > 0) {
      console.log('\n🎯 Next steps:');
      console.log('  1. The moved accounts now have profile_picture phase available');
      console.log('  2. They will need profile picture content assigned');
      console.log('  3. The warmup automation can continue from profile_picture phase');
      console.log('  4. new_highlight phase has been marked as skipped for these accounts');
    }
    
    // Verify the changes
    console.log('\n🔍 Verifying changes...');
    const verifyQuery = `
      SELECT 
        a.username,
        awp.phase,
        awp.status
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.id = ANY($1) AND awp.phase IN ('new_highlight', 'profile_picture')
      ORDER BY a.username, awp.phase;
    `;
    
    const accountIds = stuckAccounts.map(acc => acc.account_id);
    const verifyResult = await client.query(verifyQuery, [accountIds]);
    
    console.log('Updated account phases:');
    let currentUsername = '';
    verifyResult.rows.forEach(account => {
      if (account.username !== currentUsername) {
        console.log(`  - ${account.username}:`);
        currentUsername = account.username;
      }
      console.log(`    ${account.phase}: ${account.status}`);
    });
    
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('💥 Error during migration:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await moveNewHighlightToProfilePicture();
    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { moveNewHighlightToProfilePicture };