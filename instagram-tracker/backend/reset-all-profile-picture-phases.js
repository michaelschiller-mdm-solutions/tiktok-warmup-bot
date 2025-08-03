// Reset All Profile Picture Phases
// Reset all accounts stuck on profile_picture phase so they can retry with the fixed script mapping

const { Pool } = require('pg');

async function resetAllProfilePicturePhases() {
  console.log('🔄 Resetting ALL Profile Picture Phases');
  console.log('======================================');

  try {
    const pool = new Pool({
      user: 'admin',
      host: 'localhost',
      database: 'instagram_tracker',
      password: 'password123',
      port: 5432,
    });

    // 1. Find all accounts stuck on profile_picture phase
    console.log('\n1. Finding all accounts stuck on profile_picture phase...');
    const stuckAccounts = await pool.query(`
      SELECT 
        a.username,
        a.id as account_id,
        awp.phase,
        awp.status,
        awp.error_message,
        awp.updated_at
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.phase = 'profile_picture'
        AND awp.status IN ('pending', 'in_progress', 'failed')
      ORDER BY awp.updated_at DESC
    `);

    if (stuckAccounts.rows.length === 0) {
      console.log('✅ No accounts found stuck on profile_picture phase');
      await pool.end();
      return;
    }

    console.log(`Found ${stuckAccounts.rows.length} accounts stuck on profile_picture phase:`);
    stuckAccounts.rows.forEach((account, index) => {
      console.log(`${index + 1}. ${account.username} - Status: ${account.status} - Updated: ${account.updated_at}`);
      if (account.error_message) {
        console.log(`   Error: ${account.error_message}`);
      }
    });

    // 2. Reset all profile_picture phases to pending
    console.log('\n2. Resetting all profile_picture phases to pending...');
    const resetResult = await pool.query(`
      UPDATE account_warmup_phases 
      SET 
        status = 'pending',
        error_message = NULL,
        started_at = NULL,
        completed_at = NULL,
        updated_at = NOW()
      WHERE phase = 'profile_picture'
        AND status IN ('pending', 'in_progress', 'failed')
      RETURNING account_id
    `);

    console.log(`✅ Reset ${resetResult.rows.length} profile_picture phases to pending`);

    // 3. Get account usernames for the reset phases
    const resetAccountIds = resetResult.rows.map(row => row.account_id);
    if (resetAccountIds.length > 0) {
      const resetAccounts = await pool.query(`
        SELECT username FROM accounts WHERE id = ANY($1::int[])
      `, [resetAccountIds]);

      console.log('\nReset accounts:');
      resetAccounts.rows.forEach((account, index) => {
        console.log(`${index + 1}. ${account.username}`);
      });
    }

    // 4. Ensure all these accounts are back in the warmup queue
    console.log('\n3. Ensuring all accounts are back in warmup queue...');
    const queueUpdateResult = await pool.query(`
      UPDATE accounts 
      SET 
        warmup_status = 'in_queue',
        updated_at = NOW()
      WHERE id IN (
        SELECT DISTINCT awp.account_id
        FROM account_warmup_phases awp
        WHERE awp.phase = 'profile_picture'
          AND awp.status = 'pending'
      )
      AND warmup_status != 'in_queue'
      RETURNING username
    `);

    if (queueUpdateResult.rows.length > 0) {
      console.log(`✅ Added ${queueUpdateResult.rows.length} accounts back to warmup queue:`);
      queueUpdateResult.rows.forEach((account, index) => {
        console.log(`${index + 1}. ${account.username}`);
      });
    } else {
      console.log('✅ All accounts were already in warmup queue');
    }

    // 5. Verify the fix by checking current status
    console.log('\n4. Verifying current status...');
    const verifyResult = await pool.query(`
      SELECT 
        COUNT(*) as total_pending,
        COUNT(CASE WHEN awp.status = 'pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN a.warmup_status = 'in_queue' THEN 1 END) as in_queue_count
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.phase = 'profile_picture'
        AND awp.status IN ('pending', 'in_progress', 'failed')
    `);

    const stats = verifyResult.rows[0];
    console.log(`📊 Current status:`);
    console.log(`   - Total profile_picture phases: ${stats.total_pending}`);
    console.log(`   - Pending phases: ${stats.pending_count}`);
    console.log(`   - Accounts in queue: ${stats.in_queue_count}`);

    await pool.end();

    console.log('\n🎉 All Profile Picture Phases Reset Complete!');
    console.log('All accounts should now be able to process the profile_picture phase with the fixed script mapping.');
    console.log('The warmup queue should pick them up automatically and retry the phase.');

  } catch (error) {
    console.error('❌ Reset failed:', error.message);
    console.error('Full error:', error);
  }
}

// Run the reset
resetAllProfilePicturePhases();