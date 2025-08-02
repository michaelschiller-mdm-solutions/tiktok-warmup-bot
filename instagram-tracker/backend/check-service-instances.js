// Check if multiple WarmupQueueService instances are running
const { db } = require('./dist/database');

async function checkServiceInstances() {
  try {
    console.log('🔍 Checking for multiple service instances...');
    
    // Add a unique identifier to track service instances
    const serviceId = `service-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🆔 This check has ID: ${serviceId}`);
    
    console.log('\n1. Testing the single bot constraint check:');
    
    // Simulate the exact same check the service does
    const inProgressCheck = await db.query(`
      SELECT COUNT(*) as count 
      FROM account_warmup_phases 
      WHERE status = 'in_progress'
    `);
    
    const hasInProgress = parseInt(inProgressCheck.rows[0].count) > 0;
    console.log(`📊 Accounts in progress: ${inProgressCheck.rows[0].count}`);
    console.log(`🚦 Should skip processing: ${hasInProgress}`);
    
    if (hasInProgress) {
      console.log('✅ Single bot constraint should prevent new processing');
      
      // Get details of the in-progress account
      const details = await db.query(`
        SELECT 
          a.username,
          awp.phase,
          awp.started_at,
          EXTRACT(EPOCH FROM (NOW() - awp.started_at)) as seconds_running
        FROM accounts a
        JOIN account_warmup_phases awp ON a.id = awp.account_id
        WHERE awp.status = 'in_progress'
      `);
      
      details.rows.forEach(row => {
        console.log(`  - ${row.username}: ${row.phase} (running ${Math.round(row.seconds_running)}s)`);
      });
    } else {
      console.log('⚠️ No constraint - processing would proceed');
    }
    
    console.log('\n2. Checking for timing issues:');
    console.log('💡 Possible causes of duplicate processing:');
    console.log('   A) Multiple WarmupQueueService instances running');
    console.log('   B) Race condition between setTimeout and setInterval');
    console.log('   C) Long-running process not updating status quickly enough');
    console.log('   D) Database transaction isolation issues');
    
    console.log('\n3. Recommendations:');
    if (hasInProgress) {
      console.log('✅ Constraint is working - likely cause is (B) race condition');
      console.log('   Fix: Add process-level locking or disable setTimeout');
    } else {
      console.log('⚠️ No constraint active - investigate why status not set');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking service instances:', error);
    process.exit(1);
  }
}

checkServiceInstances();