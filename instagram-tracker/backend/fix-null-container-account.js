/**
 * Fix the specific account with null container that's causing automation errors
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

async function fixNullContainerAccount() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing account with null container...');
    
    // 1. Find the specific problematic account
    console.log('\n📊 Checking danielsefora88 account:');
    const problemAccountQuery = `
      SELECT 
        id,
        username,
        container_number,
        lifecycle_state,
        status,
        created_at,
        updated_at
      FROM accounts 
      WHERE username = 'danielsefora88' OR id = 197;
    `;
    
    const problemResult = await client.query(problemAccountQuery);
    
    if (problemResult.rows.length === 0) {
      console.log('  ❌ Account danielsefora88 not found');
      return;
    }
    
    const account = problemResult.rows[0];
    console.log(`  📊 Account details:`);
    console.log(`    ID: ${account.id}`);
    console.log(`    Username: ${account.username}`);
    console.log(`    Container: ${account.container_number || 'NULL'}`);
    console.log(`    Lifecycle: ${account.lifecycle_state}`);
    console.log(`    Status: ${account.status}`);
    console.log(`    Created: ${account.created_at}`);
    console.log(`    Updated: ${account.updated_at}`);
    
    // 2. Check if this account has warmup phases
    const warmupPhasesQuery = `
      SELECT 
        phase,
        status,
        available_at,
        started_at,
        error_message
      FROM account_warmup_phases
      WHERE account_id = $1
      ORDER BY phase_order, phase;
    `;
    
    const phasesResult = await client.query(warmupPhasesQuery, [account.id]);
    console.log(`\n  📊 Warmup phases (${phasesResult.rows.length} total):`);
    phasesResult.rows.forEach(phase => {
      console.log(`    - ${phase.phase}: ${phase.status}`);
      if (phase.error_message) {
        console.log(`      Error: ${phase.error_message}`);
      }
    });
    
    // 3. Find an available container to assign
    console.log('\n🔍 Finding available container...');
    
    const availableContainerQuery = `
      WITH container_usage AS (
        SELECT 
          generate_series(1, 200) as container_num
      ),
      used_containers AS (
        SELECT DISTINCT container_number 
        FROM accounts 
        WHERE container_number IS NOT NULL
        AND lifecycle_state != 'archived'
      )
      SELECT cu.container_num
      FROM container_usage cu
      LEFT JOIN used_containers uc ON cu.container_num = uc.container_number
      WHERE uc.container_number IS NULL
      ORDER BY cu.container_num
      LIMIT 1;
    `;
    
    const availableResult = await client.query(availableContainerQuery);
    
    if (availableResult.rows.length === 0) {
      console.log('  ❌ No available containers found');
      return;
    }
    
    const availableContainer = availableResult.rows[0].container_num;
    console.log(`  ✅ Found available container: ${availableContainer}`);
    
    // 4. Assign the container to the account
    console.log('\n🔧 Assigning container to account...');
    
    await client.query('BEGIN');
    
    try {
      const updateQuery = `
        UPDATE accounts 
        SET 
          container_number = $1,
          updated_at = NOW()
        WHERE id = $2;
      `;
      
      await client.query(updateQuery, [availableContainer, account.id]);
      
      console.log(`  ✅ Assigned container ${availableContainer} to ${account.username}`);
      
      // 5. Reset any failed warmup phases
      const resetFailedPhasesQuery = `
        UPDATE account_warmup_phases 
        SET 
          status = 'available',
          error_message = NULL,
          started_at = NULL,
          bot_id = NULL,
          updated_at = NOW()
        WHERE account_id = $1
        AND error_message IS NOT NULL;
      `;
      
      const resetResult = await client.query(resetFailedPhasesQuery, [account.id]);
      
      if (resetResult.rowCount > 0) {
        console.log(`  ✅ Reset ${resetResult.rowCount} failed warmup phases`);
      }
      
      await client.query('COMMIT');
      
      // 6. Verify the fix
      console.log('\n🔍 Verifying the fix...');
      
      const verifyQuery = `
        SELECT 
          id,
          username,
          container_number,
          lifecycle_state
        FROM accounts 
        WHERE id = $1;
      `;
      
      const verifyResult = await client.query(verifyQuery, [account.id]);
      const updatedAccount = verifyResult.rows[0];
      
      console.log(`  📊 Updated account:`);
      console.log(`    Username: ${updatedAccount.username}`);
      console.log(`    Container: ${updatedAccount.container_number}`);
      console.log(`    Lifecycle: ${updatedAccount.lifecycle_state}`);
      
      // 7. Check for other accounts with null containers
      console.log('\n🔍 Checking for other accounts with null containers...');
      
      const otherNullQuery = `
        SELECT 
          id,
          username,
          container_number,
          lifecycle_state
        FROM accounts 
        WHERE container_number IS NULL
        AND lifecycle_state IN ('warmup', 'ready_for_bot_assignment', 'ready')
        ORDER BY updated_at DESC
        LIMIT 5;
      `;
      
      const otherNullResult = await client.query(otherNullQuery);
      
      if (otherNullResult.rows.length === 0) {
        console.log('  ✅ No other accounts with null containers found');
      } else {
        console.log(`  ⚠️  Found ${otherNullResult.rows.length} other accounts with null containers:`);
        otherNullResult.rows.forEach(acc => {
          console.log(`    - ${acc.username} (ID: ${acc.id}) - ${acc.lifecycle_state}`);
        });
        
        console.log('\n🔧 Fixing other null container accounts...');
        
        for (const nullAccount of otherNullResult.rows) {
          // Find next available container
          const nextAvailableQuery = `
            WITH container_usage AS (
              SELECT 
                generate_series(1, 200) as container_num
            ),
            used_containers AS (
              SELECT DISTINCT container_number 
              FROM accounts 
              WHERE container_number IS NOT NULL
              AND lifecycle_state != 'archived'
            )
            SELECT cu.container_num
            FROM container_usage cu
            LEFT JOIN used_containers uc ON cu.container_num = uc.container_number
            WHERE uc.container_number IS NULL
            ORDER BY cu.container_num
            LIMIT 1;
          `;
          
          const nextAvailableResult = await client.query(nextAvailableQuery);
          
          if (nextAvailableResult.rows.length > 0) {
            const nextContainer = nextAvailableResult.rows[0].container_num;
            
            await client.query(updateQuery, [nextContainer, nullAccount.id]);
            console.log(`    ✅ Assigned container ${nextContainer} to ${nullAccount.username}`);
          }
        }
      }
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('💥 Error fixing null container account:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await fixNullContainerAccount();
    console.log('\n🎉 Null container account fix completed!');
    console.log('\n📝 Next steps:');
    console.log('  1. The automation should now work without container null errors');
    console.log('  2. Monitor for any other accounts that might get null containers');
    console.log('  3. Check container assignment triggers if issue persists');
  } catch (error) {
    console.error('💥 Fix failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixNullContainerAccount };