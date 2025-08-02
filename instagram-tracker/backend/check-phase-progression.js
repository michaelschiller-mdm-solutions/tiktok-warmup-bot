const { db } = require('./dist/database');

async function checkPhaseProgression() {
  try {
    console.log('🔍 Checking phase progression for gloryaria20...\n');

    // Get all phases for gloryaria20
    const username = process.argv[2] || 'gloryaria20';
    console.log(`🔍 Checking phase progression for ${username}...\n`);

    const phases = await db.query(`
      SELECT phase, status, available_at, completed_at, phase_order
      FROM account_warmup_phases 
      WHERE account_id = (SELECT id FROM accounts WHERE username = $1)
      ORDER BY phase_order
    `, [username]);

    console.log('📋 All phases for gloryaria20:');
    phases.rows.forEach(p => {
      const availableTime = p.available_at ? new Date(p.available_at).toLocaleString() : 'NULL';
      const completedTime = p.completed_at ? new Date(p.completed_at).toLocaleString() : 'NULL';
      console.log(`  ${p.phase_order}. ${p.phase}: ${p.status}`);
      console.log(`     Available: ${availableTime}`);
      console.log(`     Completed: ${completedTime}`);
      console.log('');
    });

    // Check what phases are currently available
    const availablePhases = await db.query(`
      SELECT phase, status, available_at
      FROM account_warmup_phases 
      WHERE account_id = (SELECT id FROM accounts WHERE username = $1)
      AND status = 'available'
      AND available_at <= NOW()
      ORDER BY phase_order
    `, [username]);

    console.log(`🎯 Currently available phases: ${availablePhases.rows.length}`);
    availablePhases.rows.forEach(p => {
      console.log(`  - ${p.phase}: ${p.status} (available since ${new Date(p.available_at).toLocaleString()})`);
    });

    // Check account cooldown
    const account = await db.query(`
      SELECT username, cooldown_until, lifecycle_state
      FROM accounts 
      WHERE username = $1
    `, [username]);

    if (account.rows.length > 0) {
      const acc = account.rows[0];
      const cooldownTime = acc.cooldown_until ? new Date(acc.cooldown_until).toLocaleString() : 'NULL';
      console.log(`\n👤 Account status:`);
      console.log(`  Username: ${acc.username}`);
      console.log(`  Lifecycle: ${acc.lifecycle_state}`);
      console.log(`  Cooldown until: ${cooldownTime}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPhaseProgression();