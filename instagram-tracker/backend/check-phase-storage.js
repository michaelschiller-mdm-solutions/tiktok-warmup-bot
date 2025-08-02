// Check how warmup phases are stored in the database
const { db } = require('./dist/database');

(async () => {
  try {
    const client = await db.connect();
    
    console.log('🔍 Checking how warmup phases are stored...\n');
    
    // Check the account_warmup_phases table structure
    const tableStructure = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'account_warmup_phases'
      ORDER BY ordinal_position
    `);
    
    console.log('📋 account_warmup_phases table structure:');
    tableStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
    // Check current phase values
    const currentPhases = await client.query(`
      SELECT DISTINCT phase, COUNT(*) as count
      FROM account_warmup_phases
      GROUP BY phase
      ORDER BY phase
    `);
    
    console.log('\n🔄 Current phases in database:');
    currentPhases.rows.forEach(row => {
      console.log(`  - ${row.phase}: ${row.count} records`);
    });
    
    // Check if there are any enums related to warmup
    const enumCheck = await client.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname LIKE '%warmup%' OR t.typname LIKE '%phase%'
      ORDER BY t.typname, e.enumlabel
    `);
    
    console.log('\n📝 Warmup-related enums:');
    if (enumCheck.rows.length > 0) {
      let currentType = '';
      enumCheck.rows.forEach(row => {
        if (row.typname !== currentType) {
          console.log(`\n  ${row.typname}:`);
          currentType = row.typname;
        }
        console.log(`    - ${row.enumlabel}`);
      });
    } else {
      console.log('  ❌ No warmup-related enums found');
    }
    
    client.release();
    console.log('\n✅ Phase storage check completed');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error checking phase storage:', err);
    process.exit(1);
  }
})();