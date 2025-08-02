const { db } = require('./dist/database');

async function checkAccountsStructure() {
  try {
    console.log('📋 Checking accounts table structure...');
    const accountColumns = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'accounts'
      ORDER BY ordinal_position
    `);
    
    console.log('All columns in accounts table:');
    accountColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check account_warmup_phases structure
    console.log('\n📋 Sample data from account_warmup_phases...');
    const samplePhases = await db.query(`
      SELECT awp.*, a.username 
      FROM account_warmup_phases awp
      JOIN accounts a ON a.id = awp.account_id
      LIMIT 5
    `);
    
    console.log('Sample warmup phases:');
    samplePhases.rows.forEach(phase => {
      console.log(`  - ${phase.username}: ${phase.phase} (order: ${phase.phase_order}, status: ${phase.status})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking accounts structure:', error);
    process.exit(1);
  }
}

checkAccountsStructure();