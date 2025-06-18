/**
 * Test Runner for the AutomationBridge Container Selection
 * 
 * This script is designed to test the `selectContainer` method in the 
 * `services/AutomationBridge.js` class. It provides a simple command-line
 * interface to test the selection of specific container numbers.
 * 
 * USAGE:
 * node scripts/api/test_container_selection.js <container_number_1> <container_number_2> ...
 * 
 * EXAMPLE:
 * node scripts/api/test_container_selection.js 365 500
 * node scripts/api/test_container_selection.js 8 20 51
 */

const path = require('path');
// Since this script is in `scripts/api`, we need to go up two levels to reach the project root.
const projectRoot = path.resolve(__dirname, '../../');
const AutomationBridge = require(path.join(projectRoot, 'services', 'AutomationBridge.js'));

async function testContainerSelection() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('❌ Please provide at least one container number to test.');
        console.log('Usage: node scripts/api/test_container_selection.js <container_number_1> ...');
        console.log('Example: node scripts/api/test_container_selection.js 365 500');
        return;
    }

    const containerNumbers = args.map(num => parseInt(num, 10)).filter(num => !isNaN(num));

    if (containerNumbers.length === 0) {
        console.log('❌ No valid container numbers provided.');
        return;
    }

    console.log('🚀 Initializing Automation Bridge for testing...');
    const bridge = new AutomationBridge();

    // Give the bridge a moment to initialize if needed (e.g., health checks)
    await new Promise(resolve => setTimeout(resolve, 1000));

    for (const number of containerNumbers) {
        console.log(`\n==================================================`);
        console.log(`▶️  TESTING CONTAINER: ${number}`);
        console.log(`==================================================`);
        
        const success = await bridge.selectContainer(number);

        if (success) {
            console.log(`✅✅✅ TEST SUCCEEDED for container ${number}. ✅✅✅`);
        } else {
            console.log(`❌❌❌ TEST FAILED for container ${number}. ❌❌❌`);
        }
        
        // Pause between tests to allow observation on the device
        if (containerNumbers.indexOf(number) < containerNumbers.length - 1) {
            console.log('\n⏸️  Pausing for 5 seconds before next test...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    console.log(`\n\n🏁 All tests completed.`);
}

testContainerSelection().catch(error => {
    console.error('An unexpected error occurred during the test run:', error);
}); 