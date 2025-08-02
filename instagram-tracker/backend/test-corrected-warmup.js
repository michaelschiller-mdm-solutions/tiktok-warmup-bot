const { WarmupQueueService } = require('./dist/services/WarmupQueueService');

async function testCorrectedWarmup() {
  try {
    console.log('🧪 Testing corrected warmup queue service...');
    
    const warmupQueue = new WarmupQueueService();
    
    console.log('🚀 Starting warmup queue...');
    await warmupQueue.start();
    
    console.log('✅ Warmup queue started successfully!');
    console.log('📊 Status:', warmupQueue.getStatus());
    
    // Let it run for a few seconds to test processing
    setTimeout(async () => {
      console.log('🛑 Stopping warmup queue...');
      await warmupQueue.stop();
      console.log('✅ Test completed successfully!');
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testCorrectedWarmup();