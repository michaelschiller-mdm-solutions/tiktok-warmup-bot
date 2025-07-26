/**
 * Test the bio phase automation specifically
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testBioPhase() {
  try {
    console.log('🧪 TESTING BIO PHASE AUTOMATION');
    console.log('===============================\n');

    // Find an account with bio phase available
    const bioAccountQuery = `
      SELECT 
        a.id, a.username, a.container_number,
        awp.phase, awp.status, awp.assigned_text_id,
        ctc.text_content
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.phase = 'bio' 
      AND awp.status = 'available'
      AND a.container_number IS NOT NULL
      AND a.lifecycle_state = 'warmup'
      LIMIT 1
    `;
    
    const bioResult = await pool.query(bioAccountQuery);
    
    if (bioResult.rows.length === 0) {
      console.log('❌ No accounts with available bio phase found');
      return;
    }
    
    const testAccount = bioResult.rows[0];
    console.log(`🎯 Testing bio phase with account: ${testAccount.username} (ID: ${testAccount.id})`);
    console.log(`   Container: ${testAccount.container_number}`);
    console.log(`   Bio text: "${testAccount.text_content || 'None assigned'}"`);

    // Test content delivery
    console.log(`\n📱 Testing content delivery...`);
    
    const { spawn } = require('child_process');
    const path = require('path');
    
    const sendScript = path.join(__dirname, 'src/scripts/send-to-iphone.js');
    
    const contentTest = await new Promise((resolve) => {
      const child = spawn('node', [sendScript, testAccount.id.toString(), 'bio', '--simple'], {
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
          console.log('   ✅ Bio text sent to clipboard');
        }
        resolve(code === 0);
      });
    });

    if (!contentTest) {
      console.log('❌ Content delivery failed, skipping automation test');
      return;
    }

    // Test warmup executor
    console.log(`\n🤖 Testing warmup executor for bio phase...`);
    
    const executorScript = path.join(__dirname, '../bot/scripts/api/warmup_executor.js');
    
    const executorTest = await new Promise((resolve) => {
      const child = spawn('node', [executorScript, 
        '--account-id', testAccount.id.toString(),
        '--container-number', testAccount.container_number.toString(),
        '--phase', 'bio',
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
        
        try {
          const result = JSON.parse(stdout.trim());
          console.log(`   Result: ${JSON.stringify(result, null, 2)}`);
        } catch (e) {
          console.log(`   Output: ${stdout.trim()}`);
        }
        
        if (stderr.trim()) {
          console.log(`   Errors: ${stderr.trim()}`);
        }
        
        resolve(code === 0);
      });
    });

    // Test manual_setup phase handling
    console.log(`\n🔧 Testing manual_setup phase handling...`);
    
    const manualTest = await new Promise((resolve) => {
      const child = spawn('node', [executorScript, 
        '--account-id', testAccount.id.toString(),
        '--container-number', testAccount.container_number.toString(),
        '--phase', 'manual_setup',
        '--username', testAccount.username
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.on('close', (code) => {
        console.log(`📊 Manual phase test: ${code === 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        try {
          const result = JSON.parse(stdout.trim());
          if (result.message && result.message.includes('Manual phase')) {
            console.log('   ✅ Manual phase correctly handled');
          }
        } catch (e) {
          console.log(`   Output: ${stdout.trim()}`);
        }
        
        resolve(code === 0);
      });
    });

    console.log(`\n🎉 Bio phase automation test completed!`);
    console.log(`   Content delivery: ${contentTest ? '✅' : '❌'}`);
    console.log(`   Bio automation: ${executorTest ? '✅' : '❌'}`);
    console.log(`   Manual phase handling: ${manualTest ? '✅' : '❌'}`);

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

testBioPhase();