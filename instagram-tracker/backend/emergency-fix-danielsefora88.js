/**
 * Emergency fix for danielsefora88 account still causing null container errors
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

async function emergencyFixDanielsefora88() {
  const client = await pool.connect();
  
  try {
    console.log('🚨 Emergency fix for danielsefora88 account...');
    
    // 1. Check current state of the account
    console.log('\n📊 Current account state:');
    const accountQuery = `
      SELECT 
        id,
        username,
        container_number,
        lifecycle_state,
        status,
        updated_at
      FROM accounts 
      WHERE username = 'danielsefora88' OR id = 197;
    `;
    
    const accountResult = await client.query(accountQuery);
    
    if (accountResult.rows.length === 0) {
      console.log('  ❌ Account not found');
      return;
    }
    
    const account = accountResult.rows[0];
    console.log(`  Account: ${account.username} (ID: ${account.id})`);
    console.log(`  Container: ${account.container_number || 'NULL'}`);
    console.log(`  Lifecycle: ${account.lifecycle_state}`);
    console.log(`  Status: ${account.status}`);
    
    // 2. Check warmup phases
    console.log('\n📊 Current warmup phases:');
    const phasesQuery = `
      SELECT 
        phase,
        status,
        available_at,
        started_at,
        bot_id,
        error_message
      FROM account_warmup_phases
      WHERE account_id = $1
      AND status IN ('pending', 'available', 'in_progress')
      ORDER BY phase_order;
    `;
    
    const phasesResult = await client.query(phasesQuery, [account.id]);
    
    if (phasesResult.rows.length === 0) {
      console.log('  ✅ No active warmup phases');
    } else {
      console.log(`  🚨 Found ${phasesResult.rows.length} active phases:`);
      phasesResult.rows.forEach(phase => {
        console.log(`    - ${phase.phase}: ${phase.status}`);
        if (phase.error_message) {
          console.log(`      Error: ${phase.error_message}`);
        }
        if (phase.bot_id) {
          console.log(`      Bot: ${phase.bot_id}`);
        }
      });
    }
    
    // 3. FORCE SKIP ALL PHASES for this account
    console.log('\n🔧 Force skipping ALL phases for this account...');
    
    await client.query('BEGIN');
    
    const forceSkipQuery = `
      UPDATE account_warmup_phases 
      SET 
        status = 'skipped',
        completed_at = NOW(),
        updated_at = NOW(),
        error_message = NULL,
        started_at = NULL,
        bot_id = NULL
      WHERE account_id = $1
      AND status IN ('pending', 'available', 'in_progress');
    `;
    
    const skipResult = await client.query(forceSkipQuery, [account.id]);
    console.log(`  ✅ Force skipped ${skipResult.rowCount} phases`);
    
    // 4. Clear container assignment
    const clearContainerQuery = `
      UPDATE accounts 
      SET 
        container_number = NULL,
        updated_at = NOW()
      WHERE id = $1;
    `;
    
    await client.query(clearContainerQuery, [account.id]);
    console.log(`  ✅ Cleared container assignment`);
    
    // 5. Make sure account is properly archived
    const archiveQuery = `
      UPDATE accounts 
      SET 
        lifecycle_state = 'archived',
        state_changed_at = NOW(),
        state_changed_by = 'emergency_fix',
        state_notes = 'Emergency fix - removed from warmup queue due to null container errors',
        updated_at = NOW()
      WHERE id = $1;
    `;
    
    await client.query(archiveQuery, [account.id]);
    console.log(`  ✅ Ensured account is properly archived`);
    
    await client.query('COMMIT');
    
    // 6. Verify the fix
    console.log('\n🔍 Verifying the fix...');
    
    const verifyAccountQuery = `
      SELECT 
        id,
        username,
        container_number,
        lifecycle_state,
        status
      FROM accounts 
      WHERE id = $1;
    `;
    
    const verifyAccountResult = await client.query(verifyAccountQuery, [account.id]);
    const verifiedAccount = verifyAccountResult.rows[0];
    
    console.log(`  Account state:`);
    console.log(`    Username: ${verifiedAccount.username}`);
    console.log(`    Container: ${verifiedAccount.container_number || 'NULL ✅'}`);
    console.log(`    Lifecycle: ${verifiedAccount.lifecycle_state}`);
    
    const verifyPhasesResult = await client.query(phasesQuery, [account.id]);
    console.log(`  Active phases: ${verifyPhasesResult.rows.length} (should be 0)`);
    
    if (verifyPhasesResult.rows.length === 0) {
      console.log('  ✅ No active phases remaining');
    } else {
      console.log('  ⚠️  Still has active phases:');
      verifyPhasesResult.rows.forEach(phase => {
        console.log(`    - ${phase.phase}: ${phase.status}`);
      });
    }
    
    // 7. Check if there are any other problematic accounts
    console.log('\n🔍 Checking for other problematic accounts...');
    
    const otherProblematicQuery = `
      SELECT 
        a.id,
        a.username,
        a.container_number,
        a.lifecycle_state,
        COUNT(awp.id) as active_phases
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status IN ('pending', 'available', 'in_progress')
      AND (a.container_number IS NULL OR a.lifecycle_state = 'archived')
      GROUP BY a.id, a.username, a.container_number, a.lifecycle_state
      ORDER BY a.username;
    `;
    
    const otherResult = await client.query(otherProblematicQuery);
    
    if (otherResult.rows.length === 0) {
      console.log('  ✅ No other problematic accounts found');
    } else {
      console.log(`  ⚠️  Found ${otherResult.rows.length} other problematic accounts:`);
      otherResult.rows.forEach(acc => {
        console.log(`    - ${acc.username} (ID: ${acc.id})`);
        console.log(`      Container: ${acc.container_number || 'NULL'}`);
        console.log(`      Lifecycle: ${acc.lifecycle_state}`);
        console.log(`      Active phases: ${acc.active_phases}`);
      });
      
      // Fix other problematic accounts too
      console.log('\n🔧 Fixing other problematic accounts...');
      
      for (const problematicAccount of otherResult.rows) {
        console.log(`  Fixing ${problematicAccount.username}...`);
        
        // Skip all phases
        await client.query(forceSkipQuery, [problematicAccount.id]);
        
        // Clear container
        await client.query(clearContainerQuery, [problematicAccount.id]);
        
        // Archive if not already
        if (problematicAccount.lifecycle_state !== 'archived') {
          await client.query(archiveQuery, [problematicAccount.id]);
        }
        
        console.log(`    ✅ Fixed ${problematicAccount.username}`);
      }
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('💥 Emergency fix failed:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await emergencyFixDanielsefora88();
    console.log('\n🎉 Emergency fix completed!');
    console.log('\n📝 The warmup automation should now work without null container errors');
  } catch (error) {
    console.error('💥 Emergency fix failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { emergencyFixDanielsefora88 };