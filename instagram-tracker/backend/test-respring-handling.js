/**
 * Test script for iPhone respring handling
 * 
 * This script tests the new respring handling logic:
 * 1. Nuclear cleaner runs (causes respring)
 * 2. Wait 15 seconds for respring to complete
 * 3. Execute wake_up.lua to wake up iPhone
 * 4. Wait additional 5 seconds for iPhone to be ready
 * 5. Continue with normal automation
 */

const AutomationBridge = require('../bot/services/AutomationBridge');
const iOS16PhotoCleaner = require('../bot/scripts/api/ios16_photo_cleaner.js');

async function testRespringHandling() {
  console.log('🧪 Testing iPhone respring handling...\n');
  
  try {
    // Step 1: Run nuclear cleaner (this will cause respring)
    console.log('💥 Step 1: Running nuclear cleaner (will cause respring)...');
    const cleaner = new iOS16PhotoCleaner();
    await cleaner.performiOS16Cleanup();
    
    // Step 2: Wait 15 seconds for respring to complete
    console.log('⏳ Step 2: Waiting 15 seconds for iPhone respring to complete...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // Step 3: Execute wake_up.lua
    console.log('📱 Step 3: Executing wake_up.lua to wake up iPhone...');
    const bridge = new AutomationBridge({
      iphoneIP: '192.168.178.65',
      iphonePort: 46952
    });
    
    const wakeUpResult = await bridge.executeScript('wake_up.lua', {
      timeout: 30000,
      retries: 3
    });
    
    if (wakeUpResult) {
      console.log('✅ iPhone wake-up completed successfully');
    } else {
      console.warn('⚠️ iPhone wake-up may have failed');
    }
    
    // Step 4: Wait additional 5 seconds for iPhone to be fully ready
    console.log('⏳ Step 4: Waiting additional 5 seconds for iPhone to be fully ready...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 5: Test basic iPhone responsiveness
    console.log('🔍 Step 5: Testing iPhone responsiveness...');
    const testResult = await bridge.executeScript('open_instagram.lua', {
      timeout: 30000,
      retries: 2
    });
    
    if (testResult) {
      console.log('✅ iPhone is responsive and ready for automation');
      console.log('\n🎉 Respring handling test PASSED!');
      console.log('📱 iPhone should now be ready for normal automation tasks');
    } else {
      console.warn('⚠️ iPhone may not be fully responsive yet');
      console.log('\n⚠️ Respring handling test completed with warnings');
    }
    
  } catch (error) {
    console.error('❌ Respring handling test FAILED:', error.message);
    console.log('\n💡 This may indicate:');
    console.log('   • iPhone is not connected or reachable');
    console.log('   • XXTouch server is not running');
    console.log('   • wake_up.lua script is missing or corrupted');
    console.log('   • Network connectivity issues');
  }
}

// Run the test
if (require.main === module) {
  testRespringHandling().catch(console.error);
}

module.exports = { testRespringHandling };