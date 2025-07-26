/**
 * Test that WarmupQueueService starts without errors
 */

async function testServiceStartup() {
  try {
    console.log('🧪 Testing WarmupQueueService startup...');
    
    // Import the service
    const { WarmupQueueService } = require('./src/services/WarmupQueueService.ts');
    
    console.log('✅ Service imported successfully');
    
    // Create instance
    const service = new WarmupQueueService();
    console.log('✅ Service instance created');
    
    // Test start method
    console.log('🚀 Testing start method...');
    await service.start();
    console.log('✅ Service started successfully');
    
    // Test status
    const status = service.getStatus();
    console.log('📊 Service status:', status);
    
    // Test stop method
    console.log('🛑 Testing stop method...');
    await service.stop();
    console.log('✅ Service stopped successfully');
    
    console.log('\\n🎉 WarmupQueueService startup test PASSED!');
    console.log('   All methods are properly defined and working');
    
  } catch (error) {
    console.error('💥 Service startup test FAILED:', error.message);
    console.error('Stack:', error.stack);
  }
}

testServiceStartup();