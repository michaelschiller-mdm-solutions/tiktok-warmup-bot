const { db } = require('./dist/database');

async function checkTables() {
  try {
    const result = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('📋 Current database tables:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check specifically for warmup_phases
    const warmupPhasesCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'warmup_phases'
      );
    `);
    
    console.log(`\n🔍 warmup_phases table exists: ${warmupPhasesCheck.rows[0].exists}`);
    
    if (warmupPhasesCheck.rows[0].exists) {
      const phases = await db.query('SELECT * FROM warmup_phases ORDER BY phase_order');
      console.log(`📊 Found ${phases.rows.length} warmup phases:`);
      phases.rows.forEach(phase => {
        console.log(`  - ${phase.phase_order}: ${phase.phase} (${phase.description})`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking tables:', error);
    process.exit(1);
  }
}

checkTables();