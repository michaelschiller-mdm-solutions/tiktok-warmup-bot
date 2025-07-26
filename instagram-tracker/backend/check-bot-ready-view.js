/**
 * Check the bot_ready_accounts view definition
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkBotReadyView() {
  try {
    // Get the view definition
    const viewQuery = `
      SELECT definition 
      FROM pg_views 
      WHERE viewname = 'bot_ready_accounts'
    `;
    
    const viewResult = await pool.query(viewQuery);
    if (viewResult.rows.length > 0) {
      console.log('📋 bot_ready_accounts view definition:');
      console.log('=====================================');
      console.log(viewResult.rows[0].definition);
    } else {
      console.log('❌ bot_ready_accounts view not found');
    }

    // Check accounts table structure for lifecycle or warmup fields
    const accountsStructureQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      AND (column_name LIKE '%lifecycle%' OR column_name LIKE '%warmup%' OR column_name LIKE '%state%')
      ORDER BY ordinal_position
    `;
    
    const structureResult = await pool.query(accountsStructureQuery);
    console.log('\n📊 Accounts table lifecycle/warmup/state columns:');
    structureResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check what lifecycle_state values exist
    const lifecycleQuery = `
      SELECT DISTINCT lifecycle_state, COUNT(*) as count
      FROM accounts 
      WHERE lifecycle_state IS NOT NULL
      GROUP BY lifecycle_state
      ORDER BY count DESC
    `;
    
    const lifecycleResult = await pool.query(lifecycleQuery);
    console.log('\n🏷️  Lifecycle state values in use:');
    lifecycleResult.rows.forEach(row => {
      console.log(`  - ${row.lifecycle_state}: ${row.count} accounts`);
    });

  } catch (error) {
    console.error('❌ Error checking bot ready view:', error);
  } finally {
    await pool.end();
  }
}

checkBotReadyView();