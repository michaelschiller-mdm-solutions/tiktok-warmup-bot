// Reset Cherry.Grccc Profile Picture Phase
// Reset the stuck profile_picture phase so it can retry with the fixed script mapping

const { Pool } = require('pg');

async function resetCherryProfilePicture() {
  console.log('🔄 Resetting Cherry.Grccc Profile Picture Phase');
  console.log('===============================================');

  try {
    const pool = new Pool({
      user: 'admin',
      host: 'localhost',
      database: 'instagram_tracker',
      password: 'password123',
      port: 5432,
    });

    // 1. Check current status
    console.log('\n1. Checking current status...');
    const currentStatus = await pool.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.attempts,
        awp.error_message,
        awp.updated_at
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE a.username = 'Cherry.Grccc' AND awp.phase = 'profile_picture'
    `);

    if (currentStatus.rows.length === 0) {
      console.log('❌ No profile_picture phase found for Cherry.Grccc');
      await pool.end();
      return;
    }

    const phase = currentStatus.rows[0];
    console.log(`Current status: ${phase.status}`);
    console.log(`Attempts: ${phase.attempts}`);
    console.log(`Error: ${phase.error_message || 'None'}`);
    console.log(`Last updated: ${phase.updated_at}`);

    // 2. Reset the phase to pending
    console.log('\n2. Resetting phase to pending...');
    const resetResult = await pool.query(`
      UPDATE account_warmup_phases 
      SET 
        status = 'pending',
        attempts = 0,
        error_message = NULL,
        started_at = NULL,
        completed_at = NULL,
        updated_at = NOW()
      WHERE account_id = (SELECT id FROM accounts WHERE username = 'Cherry.Grccc')
        AND phase = 'profile_picture'
      RETURNING *
    `);

    if (resetResult.rows.length > 0) {
      console.log('✅ Phase reset successfully');
      console.log('New status:', resetResult.rows[0].status);
      console.log('Attempts reset to:', resetResult.rows[0].attempts);
    } else {
      console.log('❌ Failed to reset phase');
    }

    // 3. Check if account is in warmup queue
    console.log('\n3. Checking warmup queue status...');
    const queueStatus = await pool.query(`
      SELECT 
        a.username,
        a.warmup_status,
        a.current_phase,
        a.updated_at
      FROM accounts a
      WHERE a.username = 'Cherry.Grccc'
    `);

    if (queueStatus.rows.length > 0) {
      const account = queueStatus.rows[0];
      console.log(`Account warmup status: ${account.warmup_status}`);
      console.log(`Current phase: ${account.current_phase}`);
      
      // If account is not in queue, add it back
      if (account.warmup_status !== 'in_queue') {
        console.log('\n4. Adding account back to warmup queue...');
        await pool.query(`
          UPDATE accounts 
          SET 
            warmup_status = 'in_queue',
            updated_at = NOW()
          WHERE username = 'Cherry.Grccc'
        `);
        console.log('✅ Account added back to warmup queue');
      } else {
        console.log('✅ Account is already in warmup queue');
      }
    }

    await pool.end();

    console.log('\n🎉 Cherry.Grccc Profile Picture Phase Reset Complete');
    console.log('The account should now be able to process the profile_picture phase with the fixed script mapping');

  } catch (error) {
    console.error('❌ Reset failed:', error.message);
  }
}

// Run the reset
resetCherryProfilePicture();