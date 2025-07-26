/**
 * Test if the WarmupQueueService is working and picking up accounts
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function testQueueService() {
  try {
    console.log('🧪 TESTING WARMUP QUEUE SERVICE');
    console.log('===============================\n');

    // Check if there are ready accounts
    const readyQuery = `
      SELECT 
        bra.id, bra.username, bra.container_number, bra.ready_phases,
        bra.next_phase_info, bra.has_required_content
      FROM bot_ready_accounts bra
      WHERE bra.container_number IS NOT NULL
        AND bra.ready_phases > 0
        AND bra.has_required_content = true
      ORDER BY bra.ready_phases DESC
      LIMIT 5
    `;
    
    const readyResult = await pool.query(readyQuery);
    console.log(`📊 Ready accounts for processing: ${readyResult.rows.length}`);
    
    if (readyResult.rows.length === 0) {
      console.log('❌ No accounts ready for processing');
      console.log('   This explains why the queue service isn\'t processing anything');
      
      // Check what's blocking accounts
      const blockingQuery = `
        SELECT 
          COUNT(*) as total_warmup,
          COUNT(CASE WHEN container_number IS NULL THEN 1 END) as no_container,
          COUNT(CASE WHEN ready_phases = 0 THEN 1 END) as no_ready_phases
        FROM bot_ready_accounts
      `;
      
      const blockingResult = await pool.query(blockingQuery);
      const blocking = blockingResult.rows[0];
      
      console.log('\n🔍 Blocking factors:');
      console.log(`   - Total warmup accounts: ${blocking.total_warmup}`);
      console.log(`   - Missing container: ${blocking.no_container}`);
      console.log(`   - No ready phases: ${blocking.no_ready_phases}`);
      
    } else {
      console.log('\n📋 Ready accounts:');
      readyResult.rows.forEach(account => {
        const nextPhase = account.next_phase_info?.phase || 'None';
        console.log(`  - ${account.username} (${account.id}): Container ${account.container_number}, Phase: ${nextPhase}`);
      });
      
      // Test the queue service manually
      console.log('\n🤖 Testing queue service manually...');
      
      try {
        // Import the service
        const { WarmupQueueService } = require('./src/services/WarmupQueueService.ts');
        const queueService = new WarmupQueueService();
        
        console.log('✅ Queue service imported successfully');
        
        // Test a single processing cycle
        console.log('🔄 Running single processing cycle...');
        
        // We can't directly call processQueue since it's private, but we can start and stop quickly
        await queueService.start();
        console.log('✅ Queue service started');
        
        // Let it run for a few seconds to process
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        await queueService.stop();
        console.log('✅ Queue service stopped');
        
      } catch (error) {
        console.log(`❌ Queue service test failed: ${error.message}`);
      }
    }

    // Check recent phase activity
    console.log('\n📈 Recent phase activity:');
    const activityQuery = `
      SELECT 
        awp.phase, awp.status, awp.updated_at, a.username
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.updated_at > NOW() - INTERVAL '1 hour'
      ORDER BY awp.updated_at DESC
      LIMIT 10
    `;
    
    const activityResult = await pool.query(activityQuery);
    if (activityResult.rows.length > 0) {
      console.log('Recent activity found:');
      activityResult.rows.forEach(row => {
        console.log(`  - ${row.username}: ${row.phase} → ${row.status} (${row.updated_at})`);
      });
    } else {
      console.log('❌ No recent phase activity in the last hour');
      console.log('   This confirms the queue service isn\'t processing accounts');
    }

    // Check if backend server is running
    console.log('\n🔍 Checking backend server status...');
    try {
      const axios = require('axios');
      const response = await axios.get('http://localhost:3001/health', { timeout: 5000 });
      console.log('✅ Backend server is running');
      console.log(`   Status: ${response.data.status}`);
    } catch (error) {
      console.log('❌ Backend server not accessible');
      console.log('   The queue service won\'t run if the backend isn\'t started');
      console.log('   Run: npm start in the backend directory');
    }

  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await pool.end();
  }
}

testQueueService();