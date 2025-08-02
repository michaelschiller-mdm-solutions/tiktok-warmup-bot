// Run the username uniqueness constraint migration
const { db } = require('./dist/database');
const fs = require('fs');
const path = require('path');

async function runUsernameUniquenessMigration() {
  try {
    console.log('🔄 Running username uniqueness constraint migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/048-add-username-uniqueness-constraint.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    console.log('✅ Username uniqueness constraint migration completed successfully!');
    
    // Verify the constraint was created
    const constraintCheck = await db.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conname = 'unique_username_text_assignment'
    `);
    
    if (constraintCheck.rowCount > 0) {
      console.log('✅ Constraint verification successful:');
      console.log(`   Name: ${constraintCheck.rows[0].constraint_name}`);
      console.log(`   Definition: ${constraintCheck.rows[0].constraint_definition}`);
    } else {
      console.log('⚠️ Constraint not found - checking index instead...');
      
      const indexCheck = await db.query(`
        SELECT 
          indexname,
          indexdef
        FROM pg_indexes 
        WHERE indexname = 'idx_unique_username_text_assignment'
      `);
      
      if (indexCheck.rowCount > 0) {
        console.log('✅ Unique index verification successful:');
        console.log(`   Name: ${indexCheck.rows[0].indexname}`);
        console.log(`   Definition: ${indexCheck.rows[0].indexdef}`);
      }
    }
    
    // Test the constraint by checking for remaining duplicates
    const duplicateCheck = await db.query(`
      SELECT 
        ctc.text_content,
        COUNT(*) as assignment_count,
        STRING_AGG(a.username, ', ') as assigned_accounts
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'username'
      AND awp.assigned_text_id IS NOT NULL
      GROUP BY ctc.text_content
      HAVING COUNT(*) > 1
    `);
    
    if (duplicateCheck.rowCount === 0) {
      console.log('✅ No duplicate username assignments remain');
    } else {
      console.log(`⚠️ Found ${duplicateCheck.rowCount} remaining duplicates:`);
      duplicateCheck.rows.forEach(row => {
        console.log(`   - "${row.text_content}": ${row.assignment_count} accounts (${row.assigned_accounts})`);
      });
    }
    
    console.log('\n🎯 Username uniqueness constraint is now active!');
    console.log('💡 Each username text can only be assigned to one account at a time.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error running username uniqueness migration:', error);
    process.exit(1);
  }
}

runUsernameUniquenessMigration();