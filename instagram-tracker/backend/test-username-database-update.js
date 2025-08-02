// Test the username database update logic
const { db } = require('./dist/database');

async function testUsernameUpdate() {
  try {
    console.log('🧪 TESTING USERNAME DATABASE UPDATE LOGIC');
    console.log('==========================================\n');
    
    // 1. Find accounts with completed username phases
    console.log('1. 📊 CHECKING COMPLETED USERNAME PHASES:');
    const completedUsername = await db.query(`
      SELECT 
        a.id,
        a.username as current_db_username,
        awp.phase,
        awp.status,
        awp.completed_at,
        ctc.text_content as assigned_username_text
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'username'
      AND awp.status = 'completed'
      ORDER BY awp.completed_at DESC
      LIMIT 5
    `);
    
    if (completedUsername.rowCount === 0) {
      console.log('No completed username phases found');
    } else {
      console.log(`Found ${completedUsername.rowCount} completed username phases:`);
      completedUsername.rows.forEach(row => {
        const expectedUsername = row.assigned_username_text ? 
          row.assigned_username_text + row.assigned_username_text.slice(-1).toLowerCase() + row.assigned_username_text.slice(-1).toLowerCase() :
          'N/A';
        
        console.log(`  - Account ${row.id}: ${row.current_db_username}`);
        console.log(`    Assigned text: ${row.assigned_username_text || 'N/A'}`);
        console.log(`    Expected username: ${expectedUsername}`);
        console.log(`    Match: ${row.current_db_username === expectedUsername ? '✅' : '❌'}`);
        console.log('');
      });
    }
    
    // 2. Check accounts with username phases ready for processing
    console.log('2. ⏳ ACCOUNTS WITH USERNAME PHASES READY:');
    const readyUsername = await db.query(`
      SELECT 
        a.id,
        a.username as current_db_username,
        awp.phase,
        awp.status,
        ctc.text_content as assigned_username_text
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'username'
      AND awp.status = 'available'
      AND awp.available_at <= NOW()
      ORDER BY awp.available_at ASC
      LIMIT 3
    `);
    
    if (readyUsername.rowCount === 0) {
      console.log('No username phases ready for processing');
    } else {
      console.log(`Found ${readyUsername.rowCount} username phases ready:`);
      readyUsername.rows.forEach(row => {
        const expectedUsername = row.assigned_username_text ? 
          row.assigned_username_text + row.assigned_username_text.slice(-1).toLowerCase() + row.assigned_username_text.slice(-1).toLowerCase() :
          'N/A';
        
        console.log(`  - Account ${row.id}: ${row.current_db_username}`);
        console.log(`    Assigned text: ${row.assigned_username_text || 'N/A'}`);
        console.log(`    Will become: ${expectedUsername}`);
        console.log('');
      });
    }
    
    // 3. Test the username modification logic
    console.log('3. 🔤 TESTING USERNAME MODIFICATION LOGIC:');
    const testCases = [
      'CherryMiller',
      'JohnSmith', 
      'TestUser',
      'A',
      'Username123'
    ];
    
    testCases.forEach(original => {
      if (original && original.length > 0) {
        const lastLetter = original.slice(-1).toLowerCase();
        const modified = original + lastLetter + lastLetter;
        console.log(`  ${original} → ${modified}`);
      }
    });
    
    // 4. Check for potential issues
    console.log('\n4. 🔍 CHECKING FOR POTENTIAL ISSUES:');
    
    // Check for accounts with username phases but no assigned text
    const missingText = await db.query(`
      SELECT 
        a.id,
        a.username,
        awp.phase,
        awp.status,
        awp.assigned_text_id
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.phase = 'username'
      AND awp.assigned_text_id IS NULL
      AND awp.status != 'pending'
    `);
    
    if (missingText.rowCount > 0) {
      console.log(`⚠️ Found ${missingText.rowCount} username phases without assigned text:`);
      missingText.rows.forEach(row => {
        console.log(`  - Account ${row.id} (${row.username}): ${row.status}`);
      });
    } else {
      console.log('✅ All username phases have assigned text');
    }
    
    console.log('\n🎯 SUMMARY:');
    console.log('- The improved updateUsernameInDatabase method now has detailed logging');
    console.log('- It will show [USERNAME UPDATE] messages when processing username phases');
    console.log('- The database username should match the Instagram username after completion');
    console.log('- Conflicting update logic in WarmupProcessService has been removed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing username update:', error);
    process.exit(1);
  }
}

testUsernameUpdate();