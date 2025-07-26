/**
 * Start the warmup queue service manually for testing
 */

async function startWarmupQueue() {
  try {
    console.log('🚀 Starting Warmup Queue Service...\n');

    // Import the service (using require since it's a .js file)
    const { WarmupQueueService } = require('./src/services/WarmupQueueService.ts');
    
    const queueService = new WarmupQueueService();
    
    // Start the service
    await queueService.start();
    
    console.log('✅ Warmup Queue Service started successfully!');
    console.log('📊 Service will check for ready accounts every 30 seconds');
    console.log('🔄 Processing accounts with available phases...\n');
    
    // Keep the process running
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down Warmup Queue Service...');
      await queueService.stop();
      process.exit(0);
    });
    
    // Log status every minute
    setInterval(() => {
      const status = queueService.getStatus();
      console.log(`📊 Queue Status: ${JSON.stringify(status)} - ${new Date().toISOString()}`);
    }, 60000);
    
  } catch (error) {
    console.error('💥 Failed to start Warmup Queue Service:', error);
    process.exit(1);
  }
}

startWarmupQueue();