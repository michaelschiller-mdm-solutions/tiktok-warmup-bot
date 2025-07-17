const { Pool } = require('pg');

const db = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'instagram_tracker',
  user: 'admin',
  password: 'password123'
});

async function checkAccountStates() {
  try {
    console.log('=== CHECKING ACCOUNTS BY LIFECYCLE STATE ===');
    const lifecycleStates = await db.query(`
      SELECT lifecycle_state, COUNT(*) as count 
      FROM accounts 
      GROUP BY lifecycle_state 
      ORDER BY lifecycle_state
    `);
    
    console.log('Account lifecycle states:');
    lifecycleStates.rows.forEach(row => {
      console.log(`  ${row.lifecycle_state}: ${row.count}`);
    });
    
    console.log('\n=== CHECKING ACCOUNTS BY STATUS ===');
    const statusStates = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM accounts 
      GROUP BY status 
      ORDER BY status
    `);
    
    console.log('Account status states:');
    statusStates.rows.forEach(row => {
      console.log(`  ${row.status}: ${row.count}`);
    });
    
    console.log('\n=== INVALID ACCOUNTS (Per API Query) ===');
    const invalidQuery = await db.query(`
      SELECT 
        a.id,
        a.username,
        a.email,
        a.status,
        a.lifecycle_state,
        a.order_number,
        a.import_source,
        a.state_changed_at,
        a.state_notes
      FROM accounts a
      WHERE 
        a.lifecycle_state = 'archived' 
        OR a.lifecycle_state = 'cleanup'
        OR a.status IN ('banned', 'suspended')
      ORDER BY a.username
    `);
    
    console.log(`Found ${invalidQuery.rows.length} invalid accounts:`);
    invalidQuery.rows.forEach(acc => {
      console.log(`  ${acc.username} - Status: ${acc.status}, Lifecycle: ${acc.lifecycle_state}`);
      if (acc.order_number) console.log(`    Order: ${acc.order_number}`);
      if (acc.state_notes) console.log(`    Notes: ${acc.state_notes}`);
    });
    
    console.log('\n=== ACCOUNTS WITH ERROR FIELDS ===');
    const errorAccounts = await db.query(`
      SELECT username, status, lifecycle_state, error_message, error_type, last_error_at
      FROM accounts 
      WHERE error_message IS NOT NULL OR error_type IS NOT NULL
      ORDER BY username
    `);
    
    if (errorAccounts.rows.length > 0) {
      console.log('Accounts with error information:');
      errorAccounts.rows.forEach(acc => {
        console.log(`  ${acc.username} - ${acc.status}/${acc.lifecycle_state}`);
        if (acc.error_message) console.log(`    Error: ${acc.error_message}`);
        if (acc.error_type) console.log(`    Type: ${acc.error_type}`);
        if (acc.last_error_at) console.log(`    Last Error: ${acc.last_error_at}`);
      });
    } else {
      console.log('No accounts found with error information');
    }
    
    console.log('\n=== SAMPLE OF ALL ACCOUNTS ===');
    const allAccounts = await db.query(`
      SELECT username, status, lifecycle_state, container_id, model_id
      FROM accounts 
      ORDER BY username
      LIMIT 10
    `);
    
    console.log('Sample accounts (first 10):');
    allAccounts.rows.forEach(acc => {
      console.log(`  ${acc.username} - ${acc.status}/${acc.lifecycle_state} (Model: ${acc.model_id || 'none'}, Container: ${acc.container_id || 'none'})`);
    });
    
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await db.end();
  }
}

checkAccountStates(); 