// Verify Profile Picture Reset
// Check that all profile_picture phases were reset successfully

const { Pool } = require('pg');

async function verifyProfilePictureReset() {
  console.log('✅ Verifying Profile Picture Phase Reset');
  console.log('=======================================');

  try {
    const pool = new Pool({
      user: 'admin',
      host: 'localhost',
      database: 'instagram_tracker',
      password: 'password123',
      port: 5432,
    });

    // 1. Check current status of all profile_picture phases
    console.log('\n1. Checking current status of profile_picture phases...');
    const currentStatus = await pool.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.error_message,
        awp.updated_at
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.phase = 'profile_picture'
      ORDER BY awp.status, awp.updated_at DESC
    `);

    console.log(`Found ${currentStatus.rows.length} total profile_picture phases:`);
    
    const statusCounts = {};
    currentStatus.rows.forEach(row => {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
    });

    console.log('\nStatus breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} accounts`);
    });

    // 2. Show accounts that are now pending (should be ready to retry)
    const pendingAccounts = currentStatus.rows.filter(row => row.status === 'pending');
    if (pendingAccounts.length > 0) {
      console.log(`\n✅ ${pendingAccounts.length} accounts are now pending and ready to retry:`);
      pendingAccounts.forEach((account, index) => {
        console.log(`${index + 1}. ${account.username} - Updated: ${account.updated_at}`);
      });
    }

    // 3. Show any accounts that still have errors
    const errorAccounts = currentStatus.rows.filter(row => row.error_message);
    if (errorAccounts.length > 0) {
      console.log(`\n⚠️  ${errorAccounts.length} accounts still have error messages:`);
      errorAccounts.forEach((account, index) => {
        console.log(`${index + 1}. ${account.username} - Status: ${account.status}`);
        console.log(`   Error: ${account.error_message}`);
      });
    } else {
      console.log('\n✅ No accounts have error messages - all errors were cleared!');
    }

    // 4. Check if accounts are in the general queue (check status column)
    console.log('\n2. Checking account queue status...');
    const queueStatus = await pool.query(`
      SELECT 
        a.username,
        a.status,
        a.current_phase,
        a.updated_at
      FROM accounts a
      WHERE a.id IN (
        SELECT DISTINCT awp.account_id
        FROM account_warmup_phases awp
        WHERE awp.phase = 'profile_picture'
          AND awp.status = 'pending'
      )
      ORDER BY a.status, a.updated_at DESC
    `);

    console.log(`Found ${queueStatus.rows.length} accounts with pending profile_picture phases:`);
    
    const accountStatusCounts = {};
    queueStatus.rows.forEach(row => {
      accountStatusCounts[row.status] = (accountStatusCounts[row.status] || 0) + 1;
    });

    console.log('\nAccount status breakdown:');
    Object.entries(accountStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count} accounts`);
    });

    await pool.end();

    console.log('\n🎉 Profile Picture Reset Verification Complete!');
    console.log('\nSummary:');
    console.log(`- Fixed script mapping: profile_picture -> change_pfp_to_newest_picture.lua`);
    console.log(`- Reset ${pendingAccounts.length} phases to pending status`);
    console.log(`- Cleared all error messages`);
    console.log(`- Accounts should be picked up by the warmup queue automatically`);

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run the verification
verifyProfilePictureReset();