/**
 * Test the username update functionality
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testUsernameUpdate() {
  try {
    console.log('🧪 TESTING USERNAME UPDATE FUNCTIONALITY');
    console.log('========================================\n');

    // Find an account with username phase available
    const usernameAccountQuery = `
      SELECT 
        a.id, a.username, a.container_number,
        awp.phase, awp.status, awp.assigned_text_id,
        ctc.text_content as new_username
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'username' 
      AND awp.status = 'available'
      AND a.container_number IS NOT NULL
      AND a.lifecycle_state = 'warmup'
      LIMIT 1
    `;
    
    const usernameResult = await pool.query(usernameAccountQuery);
    
    if (usernameResult.rows.length === 0) {
      console.log('❌ No accounts with available username phase found');
      
      // Show what username phases exist
      const allUsernameQuery = `
        SELECT 
          a.username, awp.status, ctc.text_content as new_username
        FROM accounts a
        JOIN account_warmup_phases awp ON a.id = awp.account_id
        LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE awp.phase = 'username'
        AND a.lifecycle_state = 'warmup'
        ORDER BY awp.updated_at DESC
        LIMIT 5
      `;
      
      const allResult = await pool.query(allUsernameQuery);
      console.log('\n📋 All username phases:');
      allResult.rows.forEach(row => {
        console.log(`  - ${row.username} → "${row.new_username}" (${row.status})`);
      });
      
      return;
    }
    
    const testAccount = usernameResult.rows[0];
    console.log(`🎯 Testing username update with account: ${testAccount.username} (ID: ${testAccount.id})`);
    console.log(`   Container: ${testAccount.container_number}`);
    console.log(`   Current username: "${testAccount.username}"`);
    console.log(`   New username: "${testAccount.new_username}"`);

    // Test the warmup executor with username phase
    console.log(`\n🤖 Testing warmup executor for username phase...`);
    
    const { spawn } = require('child_process');
    const path = require('path');
    
    const executorScript = path.join(__dirname, '../bot/scripts/api/warmup_executor.js');
    
    const executorTest = await new Promise((resolve) => {
      const child = spawn('node', [executorScript, 
        '--account-id', testAccount.id.toString(),
        '--container-number', testAccount.container_number.toString(),
        '--phase', 'username',
        '--username', testAccount.username
      ], {
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
        console.log(`📊 Warmup executor: ${code === 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (stdout.includes('Username updated:')) {
          console.log('   ✅ Username update detected in output');
        }
        
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n');
          const lastLines = lines.slice(-5).join('\n   ');
          console.log(`   Output: ${lastLines}`);
        }
        
        if (stderr.trim()) {
          console.log(`   Errors: ${stderr.trim()}`);
        }
        
        resolve(code === 0);
      });
    });

    // Check if username was actually updated in database
    console.log(`\n🔍 Checking if username was updated in database...`);
    
    const checkUpdateQuery = `
      SELECT username, updated_at
      FROM accounts 
      WHERE id = $1
    `;
    
    const checkResult = await pool.query(checkUpdateQuery, [testAccount.id]);
    const updatedAccount = checkResult.rows[0];
    
    console.log(`📊 Database check result:`);
    console.log(`   Current username in DB: "${updatedAccount.username}"`);
    console.log(`   Expected new username: "${testAccount.new_username}"`);
    console.log(`   Last updated: ${updatedAccount.updated_at}`);
    
    if (updatedAccount.username === testAccount.new_username) {
      console.log(`   ✅ Username successfully updated in database!`);
    } else {
      console.log(`   ❌ Username was NOT updated in database`);
    }

    console.log(`\n🎉 Username update test completed!`);
    console.log(`   Executor: ${executorTest ? '✅' : '❌'}`);
    console.log(`   DB Update: ${updatedAccount.username === testAccount.new_username ? '✅' : '❌'}`);

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

testUsernameUpdate();