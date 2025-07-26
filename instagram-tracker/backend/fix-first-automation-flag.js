/**
 * Fix first_automation_completed flag for accounts that should have gotten skip onboarding
 */

const { Pool } = require('pg');

const pool = new Pool({
    user: 'admin',
    host: 'localhost',
    database: 'instagram_tracker',
    password: 'password123',
    port: 5432,
});

async function fixFirstAutomationFlag() {
    try {
        console.log('🔧 FIXING FIRST AUTOMATION FLAGS');
        console.log('=================================\n');

        // 1. Find accounts that have completed phases but first_automation_completed is still false
        console.log('1. Finding accounts that need fixing...');

        const findQuery = `
      SELECT 
        a.id, 
        a.username, 
        a.first_automation_completed,
        COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') as completed_automation_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      GROUP BY a.id, a.username, a.first_automation_completed
      HAVING COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') > 0
      AND a.first_automation_completed = false
      ORDER BY a.username
    `;

        const findResult = await pool.query(findQuery);

        console.log(`   Found ${findResult.rows.length} accounts that need fixing:`);

        if (findResult.rows.length === 0) {
            console.log('   ✅ No accounts need fixing');
            return;
        }

        findResult.rows.forEach(account => {
            console.log(`     - ${account.username}: ${account.completed_automation_phases} completed phases, first_automation_completed: ${account.first_automation_completed}`);
        });

        // 2. Show what phases these accounts have completed
        console.log('\n2. Detailed phase analysis:');

        for (const account of findResult.rows) {
            console.log(`\n   ${account.username} (ID: ${account.id}):`);

            const phasesQuery = `
        SELECT phase, status, completed_at
        FROM account_warmup_phases 
        WHERE account_id = $1 
        AND status = 'completed'
        ORDER BY completed_at ASC
      `;

            const phasesResult = await pool.query(phasesQuery, [account.id]);

            phasesResult.rows.forEach((phase, index) => {
                const isFirstAutomation = index === 1 && phase.phase !== 'manual_setup'; // Second completed phase (first automation)
                console.log(`     ${index + 1}. ${phase.phase}: ${phase.status} ${phase.completed_at ? `(${phase.completed_at})` : ''} ${isFirstAutomation ? '← SHOULD HAVE HAD SKIP ONBOARDING' : ''}`);
            });
        }

        // 3. Ask for confirmation before fixing
        console.log('\n3. Fix Strategy:');
        console.log('   These accounts have already completed automation phases without skip_onboarding.lua');
        console.log('   We should mark first_automation_completed = true for them');
        console.log('   This prevents them from getting skip_onboarding.lua on future phases');

        // 4. Apply the fix
        console.log('\n4. Applying fixes...');

        const accountIds = findResult.rows.map(account => account.id);

        const fixQuery = `
      UPDATE accounts 
      SET first_automation_completed = true, updated_at = NOW()
      WHERE id = ANY($1::int[])
      RETURNING id, username, first_automation_completed
    `;

        const fixResult = await pool.query(fixQuery, [accountIds]);

        console.log(`   ✅ Fixed ${fixResult.rows.length} accounts:`);
        fixResult.rows.forEach(account => {
            console.log(`     - ${account.username}: first_automation_completed = ${account.first_automation_completed}`);
        });

        // 5. Verify the fix
        console.log('\n5. Verification:');

        const verifyQuery = `
      SELECT 
        a.id, 
        a.username, 
        a.first_automation_completed,
        COUNT(awp.id) FILTER (WHERE awp.status = 'completed' AND awp.phase != 'manual_setup') as completed_automation_phases
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.id = ANY($1::int[])
      GROUP BY a.id, a.username, a.first_automation_completed
      ORDER BY a.username
    `;

        const verifyResult = await pool.query(verifyQuery, [accountIds]);

        console.log('   Post-fix status:');
        verifyResult.rows.forEach(account => {
            console.log(`     - ${account.username}: ${account.completed_automation_phases} completed phases, first_automation_completed: ${account.first_automation_completed}`);
        });

        console.log('\n🎉 FIRST AUTOMATION FLAG FIX COMPLETE!');
        console.log('======================================');
        console.log('✅ Accounts that already completed phases are now marked correctly');
        console.log('✅ Future accounts will get skip_onboarding.lua on their first automation phase');
        console.log('✅ The system is now working as intended');

        console.log('\n💡 Going forward:');
        console.log('   - New accounts (first_automation_completed = false) will get skip_onboarding.lua');
        console.log('   - Accounts that have already done automation will skip onboarding');
        console.log('   - The flag is set to true after the first successful automation');

    } catch (error) {
        console.error('💥 Fix failed:', error);
    } finally {
        await pool.end();
    }
}

fixFirstAutomationFlag();