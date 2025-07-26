/**
 * Manual test of the queue service logic without starting the full server
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function manualQueueTest() {
  try {
    console.log('🧪 MANUAL QUEUE SERVICE TEST');
    console.log('============================\n');

    // Simulate the queue service logic
    console.log('🔍 Step 1: Getting ready accounts...');
    
    const query = `
      SELECT 
        bra.id, bra.username, bra.container_number, bra.ready_phases,
        bra.next_phase_info, bra.has_required_content
      FROM bot_ready_accounts bra
      WHERE bra.container_number IS NOT NULL
        AND bra.ready_phases > 0
        AND bra.has_required_content = true
      ORDER BY bra.ready_phases DESC, bra.completed_phases ASC
      LIMIT 5
    `;

    const result = await pool.query(query);
    console.log(`✅ Found ${result.rows.length} ready accounts`);

    if (result.rows.length === 0) {
      console.log('❌ No accounts ready for processing');
      return;
    }

    // Pick the first account
    const account = result.rows[0];
    const nextPhase = account.next_phase_info?.phase;
    
    console.log(`\n🎯 Selected account: ${account.username} (ID: ${account.id})`);
    console.log(`   Container: ${account.container_number}`);
    console.log(`   Next phase: ${nextPhase}`);
    console.log(`   Ready phases: ${account.ready_phases}`);

    if (!nextPhase) {
      console.log('❌ No next phase available');
      return;
    }

    // Test content delivery
    console.log(`\n📱 Step 2: Testing content delivery...`);
    
    const { spawn } = require('child_process');
    const path = require('path');
    
    const sendScript = path.join(__dirname, 'src/scripts/send-to-iphone.js');
    
    const contentTest = await new Promise((resolve) => {
      const child = spawn('node', [sendScript, account.id.toString(), nextPhase, '--simple'], {
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
        if (code !== 0) {
          console.log(`   Error: ${stderr.trim()}`);
        }
        resolve(code === 0);
      });
    });

    if (!contentTest) {
      console.log('❌ Content delivery failed, stopping test');
      return;
    }

    // Test warmup executor
    console.log(`\n🤖 Step 3: Testing warmup executor...`);
    
    const executorScript = path.join(__dirname, '../bot/scripts/api/warmup_executor.js');
    
    const executorTest = await new Promise((resolve) => {
      const child = spawn('node', [executorScript, 
        '--account-id', account.id.toString(),
        '--container-number', account.container_number.toString(),
        '--phase', nextPhase,
        '--username', account.username
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
          console.log(`   Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
          console.log(`   Message: ${result.message || result.error}`);
        } catch (e) {
          if (stdout.trim()) {
            console.log(`   Output: ${stdout.trim().split('\n').slice(-2).join(' ')}`);
          }
        }
        
        resolve(code === 0);
      });
    });

    console.log(`\n🎉 MANUAL QUEUE TEST COMPLETED`);
    console.log(`================================`);
    console.log(`Content delivery: ${contentTest ? '✅' : '❌'}`);
    console.log(`Phase automation: ${executorTest ? '✅' : '❌'}`);
    
    if (contentTest && executorTest) {
      console.log(`\n✅ The queue service logic is working correctly!`);
      console.log(`📋 To start automatic processing:`);
      console.log(`   1. cd instagram-tracker/backend`);
      console.log(`   2. npm start`);
      console.log(`   3. Watch for "🤖 Warmup automation queue started" message`);
      console.log(`   4. Queue will process accounts every 30 seconds`);
    } else {
      console.log(`\n❌ There are issues with the automation components`);
    }

  } catch (error) {
    console.error('💥 Manual test failed:', error);
  } finally {
    await pool.end();
  }
}

manualQueueTest();