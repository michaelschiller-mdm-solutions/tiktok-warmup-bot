/**
 * Test the complete username automation flow including content delivery
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testCompleteUsernameFlow() {
  try {
    console.log('🧪 TESTING COMPLETE USERNAME AUTOMATION FLOW');
    console.log('============================================\n');

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
      AND awp.assigned_text_id IS NOT NULL
      LIMIT 1
    `;
    
    const usernameResult = await pool.query(usernameAccountQuery);
    
    if (usernameResult.rows.length === 0) {
      console.log('❌ No accounts with available username phase and assigned text found');
      
      // Check what's missing
      const debugQuery = `
        SELECT 
          a.username, awp.status, awp.assigned_text_id,
          ctc.text_content as new_username
        FROM accounts a
        JOIN account_warmup_phases awp ON a.id = awp.account_id
        LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
        WHERE awp.phase = 'username'
        AND a.lifecycle_state = 'warmup'
        ORDER BY awp.updated_at DESC
        LIMIT 5
      `;
      
      const debugResult = await pool.query(debugQuery);
      console.log('\n📋 Username phases debug:');
      debugResult.rows.forEach(row => {
        console.log(`  - ${row.username}: ${row.status}, Text ID: ${row.assigned_text_id}, New: "${row.new_username}"`);
      });
      
      return;
    }
    
    const testAccount = usernameResult.rows[0];
    console.log(`🎯 Testing complete username flow with account: ${testAccount.username} (ID: ${testAccount.id})`);
    console.log(`   Container: ${testAccount.container_number}`);
    console.log(`   Current username: "${testAccount.username}"`);
    console.log(`   New username: "${testAccount.new_username}"`);
    console.log(`   Text assigned: ${testAccount.assigned_text_id ? '✅' : '❌'}`);

    // Step 1: Test content delivery to iPhone
    console.log(`\n📱 Step 1: Testing content delivery to iPhone...`);
    
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
        
        if (stdout.includes('Text sent to iPhone clipboard successfully')) {
          console.log(`   ✅ Username "${testAccount.new_username}" sent to clipboard`);
        } else {
          console.log(`   ❌ Username not sent to clipboard`);
        }
        
        if (code !== 0 && stderr.trim()) {
          console.log(`   Error: ${stderr.trim()}`);
        }
        
        resolve(code === 0);
      });
    });

    if (!contentTest) {
      console.log('❌ Content delivery failed, stopping test');
      return;
    }

    // Step 2: Test warmup executor (which includes container navigation + script execution)
    console.log(`\n🤖 Step 2: Testing warmup executor...`);
    
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
        
        if (stdout.includes('change_username_to_clipboard.lua')) {
          console.log(`   ✅ Username change script executed`);
        }
        
        if (stdout.includes('Username updated:')) {
          console.log(`   ✅ Database update detected`);
        }
        
        // Show key output lines
        if (stdout.trim()) {
          const lines = stdout.trim().split('\n');
          const keyLines = lines.filter(line => 
            line.includes('change_username_to_clipboard.lua') ||
            line.includes('Username updated:') ||
            line.includes('success')
          );
          if (keyLines.length > 0) {
            console.log(`   Key output: ${keyLines.join(' | ')}`);
          }
        }
        
        resolve(code === 0);
      });
    });

    // Step 3: Check if username was actually updated in database
    console.log(`\n🔍 Step 3: Checking database update...`);
    
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
    
    const dbUpdated = updatedAccount.username === testAccount.new_username;
    console.log(`   Database updated: ${dbUpdated ? '✅ YES' : '❌ NO'}`);

    // Summary
    console.log(`\n🎉 COMPLETE USERNAME AUTOMATION TEST RESULTS`);
    console.log(`============================================`);
    console.log(`📱 Content delivery (clipboard): ${contentTest ? '✅' : '❌'}`);
    console.log(`🤖 Script execution: ${executorTest ? '✅' : '❌'}`);
    console.log(`💾 Database update: ${dbUpdated ? '✅' : '❌'}`);
    
    if (contentTest && executorTest && dbUpdated) {
      console.log(`\n🎯 SUCCESS: Complete username automation flow working!`);
      console.log(`   The automation correctly:`);
      console.log(`   1. Sent new username to iPhone clipboard`);
      console.log(`   2. Navigated to correct Instagram container`);
      console.log(`   3. Executed username change script`);
      console.log(`   4. Updated database with new username`);
    } else {
      console.log(`\n⚠️  ISSUES DETECTED in the automation flow`);
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

testCompleteUsernameFlow();