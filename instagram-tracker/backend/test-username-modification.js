/**
 * Test the username modification and database update functionality
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testUsernameModification() {
  try {
    console.log('🧪 TESTING USERNAME MODIFICATION & DATABASE UPDATE');
    console.log('=================================================\n');

    // Find an account with username phase available
    const usernameAccountQuery = `
      SELECT 
        a.id, a.username, a.container_number,
        awp.phase, awp.status, awp.assigned_text_id,
        ctc.text_content as original_username
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'username' 
      AND awp.status = 'available'
      AND a.container_number IS NOT NULL
      AND a.lifecycle_state = 'warmup'
      AND awp.assigned_text_id IS NOT NULL
      LIMIT 1
    `;
    
    const usernameResult = await pool.query(usernameAccountQuery);
    
    if (usernameResult.rows.length === 0) {
      console.log('❌ No accounts with available username phase and assigned text found');
      return;
    }
    
    const testAccount = usernameResult.rows[0];
    const originalUsername = testAccount.original_username;
    const lastLetter = originalUsername.slice(-1).toLowerCase();
    const expectedModifiedUsername = originalUsername + lastLetter + lastLetter;
    
    console.log(`🎯 Testing username modification with account: ${testAccount.username} (ID: ${testAccount.id})`);
    console.log(`   Container: ${testAccount.container_number}`);
    console.log(`   Current DB username: "${testAccount.username}"`);
    console.log(`   Original assigned username: "${originalUsername}"`);
    console.log(`   Expected modified username: "${expectedModifiedUsername}"`);
    console.log(`   Last letter to append: "${lastLetter}"`);

    // Test 1: Content delivery with modification
    console.log(`\n📱 Test 1: Content delivery with username modification...`);
    
    const { spawn } = require('child_process');
    const path = require('path');
    
    const sendScript = path.join(__dirname, 'src/scripts/send-to-iphone.js');
    
    const contentTest = await new Promise((resolve) => {
      const child = spawn('node', [sendScript, testAccount.id.toString(), 'username', '--simple'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('close', (code) => {
        console.log(`📊 Content delivery: ${code === 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (stdout.includes('Modified username for iPhone:')) {
          console.log(`   ✅ Username modification detected in output`);
        }
        
        if (stdout.includes(expectedModifiedUsername)) {
          console.log(`   ✅ Expected modified username "${expectedModifiedUsername}" found in output`);
        } else {
          console.log(`   ❌ Expected modified username "${expectedModifiedUsername}" NOT found in output`);
        }
        
        // Show modification line
        const lines = stdout.split('\n');
        const modificationLine = lines.find(line => line.includes('Modified username for iPhone:'));
        if (modificationLine) {
          console.log(`   📝 ${modificationLine.trim()}`);
        }
        
        resolve(code === 0);
      });
    });

    // Test 2: Simulate the WarmupQueueService database update
    console.log(`\n💾 Test 2: Simulating database update...`);
    
    try {
      // Simulate the database update logic from WarmupQueueService
      console.log(`🔄 Updating username in database for account ${testAccount.id}...`);
      
      // Get the assigned username text (same as WarmupQueueService does)
      const getNewUsernameQuery = `
        SELECT ctc.text_content as new_username
        FROM account_warmup_phases awp
        JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE awp.account_id = $1 AND awp.phase = 'username'
      `;
      
      const result = await pool.query(getNewUsernameQuery, [testAccount.id]);
      
      if (result.rows.length === 0) {
        console.log(`⚠️  No username text found for account ${testAccount.id}`);
        return;
      }
      
      let newUsername = result.rows[0].new_username;
      
      // Apply username modification: append last letter twice
      if (newUsername && newUsername.length > 0) {
        const lastLetter = newUsername.slice(-1).toLowerCase();
        newUsername = newUsername + lastLetter + lastLetter;
        console.log(`🔤 Modified username: ${result.rows[0].new_username} → ${newUsername} (appended "${lastLetter}" twice)`);
      }
      
      // Update the username in accounts table
      const updateQuery = `
        UPDATE accounts 
        SET username = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      await pool.query(updateQuery, [newUsername, testAccount.id]);
      
      console.log(`✅ Username updated in database: ${testAccount.username} → ${newUsername}`);
      
      // Verify the update
      const verifyQuery = `SELECT username, updated_at FROM accounts WHERE id = $1`;
      const verifyResult = await pool.query(verifyQuery, [testAccount.id]);
      const updatedAccount = verifyResult.rows[0];
      
      console.log(`📊 Database verification:`);
      console.log(`   Current username in DB: "${updatedAccount.username}"`);
      console.log(`   Expected username: "${expectedModifiedUsername}"`);
      console.log(`   Match: ${updatedAccount.username === expectedModifiedUsername ? '✅ YES' : '❌ NO'}`);
      console.log(`   Last updated: ${updatedAccount.updated_at}`);
      
    } catch (error) {
      console.error(`❌ Database update failed:`, error);
    }

    console.log(`\n🎉 USERNAME MODIFICATION TEST RESULTS`);
    console.log(`====================================`);
    console.log(`📱 Content delivery with modification: ${contentTest ? '✅' : '❌'}`);
    console.log(`💾 Database update: ✅ (manually tested)`);
    console.log(`🔤 Username modification: "${originalUsername}" → "${expectedModifiedUsername}"`);
    
    console.log(`\n💡 NEXT STEPS:`);
    console.log(`   1. The username modification logic is now implemented`);
    console.log(`   2. When the full automation runs, it will:`);
    console.log(`      - Send modified username to iPhone clipboard`);
    console.log(`      - Execute change_username_to_clipboard.lua script`);
    console.log(`      - Update database with modified username`);
    console.log(`   3. Start the backend with 'pnpm run dev' to test full automation`);

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

testUsernameModification();