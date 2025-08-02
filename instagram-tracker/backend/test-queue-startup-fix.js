// Test the fixed WarmupQueueService startup
const { WarmupQueueService } = require('./dist/services/WarmupQueueService');

async function testQueueStartup() {
  try {
    console.log('🧪 Testing WarmupQueueService startup fix...');
    
    const queueService = new WarmupQueueService();
    
    console.log('🚀 Starting queue service...');
    const startTime = Date.now();
    
    await queueService.start();
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ Queue service started successfully in ${duration}ms`);
    console.log('⏰ Service should begin processing accounts in ~1 second');
    console.log('🔄 Then continue every 30 seconds');
    
    // Wait a bit to see if it starts processing
    console.log('\n⏳ Waiting 5 seconds to see if processing begins...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('✅ Test complete - stopping service');
    await queueService.stop();
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testQueueStartup();