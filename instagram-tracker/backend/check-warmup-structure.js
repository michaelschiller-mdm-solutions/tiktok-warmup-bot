const { db } = require('./dist/database');

async function checkWarmupStructure() {
  try {
    // Check account_warmup_phases table
    console.log('📋 Checking account_warmup_phases table...');
    const accountWarmupPhases = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'account_warmup_phases'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in account_warmup_phases:');
    accountWarmupPhases.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check warmup_configuration table
    console.log('\n📋 Checking warmup_configuration table...');
    const warmupConfig = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'warmup_configuration'
      ORDER BY ordinal_position
    `);
    
    console.log('Columns in warmup_configuration:');
    warmupConfig.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check accounts table for warmup-related columns
    console.log('\n📋 Checking accounts table for warmup columns...');
    const accountColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      AND column_name LIKE '%warmup%'
      ORDER BY ordinal_position
    `);
    
    console.log('Warmup columns in accounts:');
    accountColumns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });
    
    // Check if there are any sample records
    console.log('\n📊 Sample data from accounts (warmup related):');
    const sampleAccounts = await db.query(`
      SELECT username, warmup_status, warmup_phase_order, warmup_in_progress
      FROM accounts 
      WHERE warmup_status IS NOT NULL
      LIMIT 5
    `);
    
    sampleAccounts.rows.forEach(acc => {
      console.log(`  - ${acc.username}: status=${acc.warmup_status}, phase_order=${acc.warmup_phase_order}, in_progress=${acc.warmup_in_progress}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking warmup structure:', error);
    process.exit(1);
  }
}

checkWarmupStructure();