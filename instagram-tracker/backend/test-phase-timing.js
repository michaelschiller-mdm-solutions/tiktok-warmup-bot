/**
 * Test script to verify phase timing with 15-second delays
 */

const WarmupExecutor = require('../bot/scripts/api/warmup_executor');

async function testPhaseTiming() {
  try {
    console.log('🧪 Testing phase timing with 15-second delays...\n');
    
    // Create a mock executor for testing
    const executor = new WarmupExecutor();
    
    // Mock the bridge.executeScript method to simulate script execution
    executor.bridge.executeScript = async (scriptName, options) => {
      console.log(`🎯 Mock executing script: ${scriptName}`);
      console.log(`   Timeout: ${options.timeout}ms, Retries: ${options.retries}`);
      
      // Simulate script execution time (2 seconds)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        success: true,
        message: `Mock execution of ${scriptName} completed`
      };
    };
    
    // Mock the bridge.selectContainer method
    executor.bridge.selectContainer = async (containerNumber) => {
      console.log(`📦 Mock selecting container: ${containerNumber}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    };
    
    // Test different phases to verify timing
    const testPhases = [
      { phase: 'bio', description: 'Bio change phase' },
      { phase: 'username', description: 'Username change phase' },
      { phase: 'first_highlight', description: 'First highlight upload phase' }
    ];
    
    for (const testCase of testPhases) {
      console.log(`\n🔄 Testing ${testCase.description}...`);
      const startTime = Date.now();
      
      const result = await executor.executePhase(
        123, // accountId
        5,   // containerNumber
        testCase.phase,
        'test_username',
        false // skipOnboarding
      );
      
      const totalTime = Date.now() - startTime;
      const expectedMinTime = 30000; // 15s before + 15s after = 30s minimum
      
      console.log(`⏱️  Total execution time: ${totalTime}ms`);
      console.log(`📊 Expected minimum time: ${expectedMinTime}ms`);
      
      if (totalTime >= expectedMinTime) {
        console.log(`✅ Timing test PASSED for ${testCase.phase}`);
      } else {
        console.log(`❌ Timing test FAILED for ${testCase.phase} - too fast!`);
      }
      
      console.log(`📋 Result:`, result.success ? 'SUCCESS' : 'FAILED');
    }
    
    // Test manual phase (should not have delays)
    console.log(`\n🔄 Testing manual phase (should be fast)...`);
    const manualStartTime = Date.now();
    
    const manualResult = await executor.executePhase(
      123, // accountId
      5,   // containerNumber
      'manual_setup',
      'test_username',
      false
    );
    
    const manualTime = Date.now() - manualStartTime;
    console.log(`⏱️  Manual phase time: ${manualTime}ms`);
    console.log(`📋 Manual result:`, manualResult.success ? 'SUCCESS' : 'FAILED');
    
    if (manualTime < 5000) { // Should be under 5 seconds
      console.log(`✅ Manual phase timing test PASSED`);
    } else {
      console.log(`❌ Manual phase timing test FAILED - too slow!`);
    }
    
    console.log('\n🎉 Phase timing tests completed!');
    console.log('\n📝 Summary:');
    console.log('   - Automated phases now include 15s delays before and after script execution');
    console.log('   - Manual phases remain fast (no delays)');
    console.log('   - Total automation time per phase increased by ~30 seconds for stability');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testPhaseTiming();