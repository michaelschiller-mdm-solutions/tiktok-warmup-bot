const { db } = require('./dist/database');

async function checkTableStructure() {
  try {
    console.log('📋 CHECKING TABLE STRUCTURES');
    console.log('============================\n');
    
    // Check account_warmup_phases table
    console.log('1. account_warmup_phases columns:');
    const awpColumns = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'account_warmup_phases' 
      ORDER BY ordinal_position
    `);
    
    awpColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check accounts table
    console.log('\n2. accounts table columns:');
    const accountColumns = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      ORDER BY ordinal_position
    `);
    
    accountColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check how cooldowns are implemented
    console.log('\n3. Checking cooldown implementation:');
    
    // Look for available_at column usage
    const availableAtUsage = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.available_at,
        awp.completed_at,
        CASE 
          WHEN awp.available_at > NOW() THEN 'In cooldown'
          WHEN awp.available_at <= NOW() THEN 'Available'
          ELSE 'No cooldown set'
        END as cooldown_status
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status IN ('pending', 'available')
      AND awp.available_at IS NOT NULL
      ORDER BY awp.available_at DESC
      LIMIT 10
    `);
    
    console.log('Recent phases with available_at (cooldown mechanism):');
    availableAtUsage.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.phase} (${row.status}) → ${row.cooldown_status}`);
      console.log(`    Available at: ${row.available_at}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTableStructure();