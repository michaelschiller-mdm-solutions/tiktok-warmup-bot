// Fix the stuck account that's blocking the queue
const { db } = require('./dist/database');

async function fixStuckAccount() {
  try {
    console.log('🔧 Fixing stuck account blocking the queue...');

    console.log('\n1. Current stuck accounts:');
    const stuck = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.bot_id,
        awp.started_at,
        awp.updated_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'in_progress'
      ORDER BY awp.started_at DESC
    `);

    stuck.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.phase} (started: ${row.started_at})`);
    });

    console.log('\n2. Resetting stuck accounts to available...');
    const resetResult = await db.query(`
      UPDATE account_warmup_phases 
      SET status = 'available',
          bot_id = NULL,
          started_at = NULL,
          updated_at = NOW()
      WHERE status = 'in_progress'
      RETURNING account_id, phase
    `);

    console.log(`✅ Reset ${resetResult.rowCount} stuck phases`);

    console.log('\n3. Checking ready accounts now:');
    const readyAccounts = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.available_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'available'
      AND awp.available_at <= NOW()
      ORDER BY awp.available_at ASC
      LIMIT 5
    `);

    console.log(`Found ${readyAccounts.rowCount} ready accounts:`);
    readyAccounts.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.phase} (available: ${row.available_at})`);
    });

    console.log('\n✅ Queue should now be unblocked!');
    console.log('🚀 The automation system can now discover and process the next account');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing stuck account:', error);
    process.exit(1);
  }
}

fixStuckAccount();