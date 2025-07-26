/**
 * Test the complete warmup automation system
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testWarmupAutomation() {
  try {
    console.log('🧪 TESTING WARMUP AUTOMATION SYSTEM');
    console.log('===================================\n');

    // 1. Get a ready account for testing
    const readyAccountQuery = `
      SELECT id, username, container_number, ready_phases, next_phase_info
      FROM bot_ready_accounts 
      WHERE ready_phases > 0 
      AND container_number IS NOT NULL
      LIMIT 1
    `;
    
    const readyResult = await pool.query(readyAccountQuery);
    
    if (readyResult.rows.length === 0) {
      console.log('❌ No ready accounts found for testing');
      return;
    }
    
    const testAccount = readyResult.rows[0];
    const nextPhase = testAccount.next_phase_info?.phase;
    
    console.log(`🎯 Testing with account: ${testAccount.username} (ID: ${testAccount.id})`);
    console.log(`   Container: ${testAccount.container_number}`);
    console.log(`   Ready phases: ${testAccount.ready_phases}`);
    console.log(`   Next phase: ${nextPhase}`);

    if (!nextPhase) {
      console.log('❌ No next phase available for testing');
      return;
    }

    // 2. Check if content is assigned for this phase
    const contentQuery = `
      SELECT 
        awp.phase,
        awp.status,
        awp.assigned_content_id,
        awp.assigned_text_id,
        cc.file_path as image_path,
        ctc.text_content
      FROM account_warmup_phases awp
      LEFT JOIN central_content cc ON awp.assigned_content_id = cc.id
      LEFT JOIN central_text_content ctc ON awp.assigned_text_id = ctc.id
      WHERE awp.account_id = $1 AND awp.phase = $2
    `;
    
    const contentResult = await pool.query(contentQuery, [testAccount.id, nextPhase]);
    
    if (contentResult.rows.length === 0) {
      console.log(`❌ No phase data found for ${nextPhase}`);
      return;
    }
    
    const phaseData = contentResult.rows[0];
    console.log(`\n📋 Phase data for ${nextPhase}:`);
    console.log(`   Status: ${phaseData.status}`);
    console.log(`   Image: ${phaseData.image_path || 'None'}`);
    console.log(`   Text: ${phaseData.text_content ? `"${phaseData.text_content.substring(0, 50)}..."` : 'None'}`);

    // 3. Test content delivery to iPhone
    console.log(`\n📱 Testing content delivery to iPhone...`);
    
    const { spawn } = require('child_process');
    const path = require('path');
    const sendScript = path.join(__dirname, 'src/scripts/send-to-iphone.js');
    
    const contentDeliveryTest = await new Promise((resolve) => {
      const child = spawn('node', [sendScript, testAccount.id.toString(), nextPhase, '--simple'], {
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
        console.log(`📊 Content delivery result: ${code === 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
        if (stdout.trim()) {
          console.log(`   Output: ${stdout.trim().split('\n').slice(-3).join('\n   ')}`);
        }
        if (stderr.trim()) {
          console.log(`   Errors: ${stderr.trim()}`);
        }
        resolve(code === 0);
      });
    });

    // 4. Test warmup executor
    if (contentDeliveryTest) {
      console.log(`\n🤖 Testing warmup executor...`);
      
      const executorScript = path.join(__dirname, '../bot/scripts/api/warmup_executor.js');
      
      const executorTest = await new Promise((resolve) => {
        const child = spawn('node', [executorScript, 
          '--account-id', testAccount.id.toString(),
          '--container-number', testAccount.container_number.toString(),
          '--phase', nextPhase,
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
          console.log(`📊 Warmup executor result: ${code === 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
          if (stdout.trim()) {
            console.log(`   Output: ${stdout.trim()}`);
          }
          if (stderr.trim()) {
            console.log(`   Errors: ${stderr.trim()}`);
          }
          resolve(code === 0);
        });
      });
    }

    // 5. Test the WarmupQueueService
    console.log(`\n🔄 Testing WarmupQueueService integration...`);
    
    try {
      // Import and test the queue service
      const { WarmupQueueService } = require('./src/services/WarmupQueueService.ts');
      const queueService = new WarmupQueueService();
      
      console.log(`📊 Queue service status: ${JSON.stringify(queueService.getStatus())}`);
      
      // Test processing a single account
      console.log(`🎯 Testing queue processing...`);
      
      // This would normally be called by the queue service automatically
      // but we can test the logic manually
      
    } catch (error) {
      console.log(`❌ Queue service test failed: ${error.message}`);
    }

    // 6. Check if the automation is actually running
    console.log(`\n🔍 Checking if automation is running...`);
    
    const runningProcessQuery = `
      SELECT COUNT(*) as active_sessions
      FROM active_bot_sessions 
      WHERE session_type = 'warmup'
      AND status = 'active'
    `;
    
    const runningResult = await pool.query(runningProcessQuery);
    const activeSessions = runningResult.rows[0].active_sessions;
    
    console.log(`📊 Active warmup sessions: ${activeSessions}`);

    // 7. Final recommendations
    console.log(`\n💡 RECOMMENDATIONS:`);
    console.log(`================`);
    
    if (activeSessions === 0) {
      console.log(`🚀 Start the warmup queue service to begin processing accounts`);
      console.log(`   The service should be running in the backend app.ts`);
    }
    
    console.log(`📱 Ensure iPhone automation server is running on 192.168.178.65:46952`);
    console.log(`🔄 Monitor the queue service logs for processing activity`);
    console.log(`📋 Check account phase status updates in the frontend`);

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

testWarmupAutomation();