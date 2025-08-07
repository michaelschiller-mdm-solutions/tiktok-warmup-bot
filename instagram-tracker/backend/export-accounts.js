const { Pool } = require('pg');

const db = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'instagram_tracker',
  user: 'admin',
  password: 'password123'
});

async function exportAccounts() {
  try {
    console.log('📊 Exporting accounts data...');
    
    // Query to get all accounts with essential data
    const query = `
      SELECT 
        id,
        username,
        email,
        password,
        account_code as email_password,
        status,
        lifecycle_state,
        created_at,
        updated_at
      FROM accounts 
      ORDER BY id
    `;
    
    const result = await db.query(query);
    const accounts = result.rows;
    
    console.log(`✅ Found ${accounts.length} accounts`);
    
    // Create the export data
    const exportData = {
      exported_at: new Date().toISOString(),
      total_accounts: accounts.length,
      accounts: accounts
    };
    
    // Write to file
    const fs = require('fs');
    const filename = `accounts-export-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    console.log(`💾 Exported to: ${filename}`);
    console.log(`📋 Sample data structure:`);
    console.log(JSON.stringify(exportData.accounts.slice(0, 2), null, 2));
    
    // Also create a CSV version
    const csvFilename = `accounts-export-${new Date().toISOString().split('T')[0]}.csv`;
    const csvHeaders = ['id', 'username', 'email', 'password', 'email_password', 'status', 'lifecycle_state'];
    const csvContent = [
      csvHeaders.join(','),
      ...accounts.map(account => 
        csvHeaders.map(header => 
          JSON.stringify(account[header] || '')
        ).join(',')
      )
    ].join('\n');
    
    fs.writeFileSync(csvFilename, csvContent);
    console.log(`📄 Also exported CSV: ${csvFilename}`);
    
  } catch (error) {
    console.error('❌ Error exporting accounts:', error);
  } finally {
    await db.end();
  }
}

exportAccounts(); 