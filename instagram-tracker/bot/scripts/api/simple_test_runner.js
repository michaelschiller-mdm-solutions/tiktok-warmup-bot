/**
 * Simple Test Runner for AutomationBridge Container Selection
 * 
 * This script tests the simplified `selectContainer` method.
 * It overrides the default action delay to a shorter duration for faster testing.
 * 
 * USAGE:
 * node scripts/api/simple_test_runner.js <container_number>
 * 
 * EXAMPLE:
 * node scripts/api/simple_test_runner.js 365
 */

const path = require('path');
const projectRoot = path.resolve(__dirname, '../../');
const AutomationBridge = require(path.join(projectRoot, 'services', 'AutomationBridge.js'));

async function simpleTest() {
    const args = process.argv.slice(2);
    const containerNumber = parseInt(args[0], 10);

    if (isNaN(containerNumber)) {
        console.log('❌ Please provide a valid container number.');
        console.log('Usage: node scripts/api/simple_test_runner.js <container_number>');
        return;
    }

    console.log('🚀 Initializing Automation Bridge with short delay for testing...');
    
    // Override the default config with a shorter delay for this test run
    const testConfig = {
        actionDelay: 3000 // 3 seconds
    };
    const bridge = new AutomationBridge(testConfig);

    try {
        console.log(`\n==================================================`);
        console.log(`▶️  TESTING CONTAINER: ${containerNumber}`);
        console.log(`==================================================`);
        
        const success = await bridge.selectContainer(containerNumber);

        if (success) {
            console.log(`\n✅✅✅ TEST SUCCEEDED for container ${containerNumber}. ✅✅✅`);
        } else {
            // In the new implementation, executeScript throws an error on failure
            // so this branch may not be hit, but it's good practice to keep.
            console.log(`\n❌❌❌ TEST FAILED for container ${containerNumber}. ❌❌❌`);
        }
    } catch (error) {
        console.error(`\n❌❌❌ TEST FAILED for container ${containerNumber} with an error: ❌❌❌`);
        console.error(error.message);
    }

    console.log(`\n\n🏁 Test completed.`);
}

simpleTest(); 