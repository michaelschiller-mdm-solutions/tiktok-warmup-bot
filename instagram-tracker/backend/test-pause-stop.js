/**
 * Test script to verify pause and stop automation functionality
 * 
 * Usage: node test-pause-stop.js
 */

async function testPauseStopFunctionality() {
    console.log('🧪 Testing Pause & Stop Automation Functionality');
    console.log('='.repeat(50));

    const BASE_URL = 'http://localhost:3001/api/automation';
    
    try {
        // Dynamic import for fetch (node-fetch 3.x is ES module)
        const { default: fetch } = await import('node-fetch');

        // Test data - minimal account for testing
        const testAccounts = [{
            accountId: 999,
            containerNumber: 1,
            username: 'test_pause_stop',
            password: 'test123',
            email: 'test@example.com',
            email_password: 'test123'
        }];

        console.log('1️⃣ Starting test automation session...');
        
        // Start automation session
        const startResponse = await fetch(`${BASE_URL}/start-account-setup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accounts: testAccounts,
                verificationConfig: {
                    requireManualVerification: true,
                    skipVerification: false,
                    requireScreenshot: true,
                    autoCompleteOnSuccess: false
                }
            })
        });

        if (!startResponse.ok) {
            throw new Error(`Failed to start session: ${startResponse.status}`);
        }

        const startData = await startResponse.json();
        const sessionId = startData.sessionId;
        
        console.log(`✅ Session started successfully: ${sessionId}`);

        // Wait a bit for session to begin
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('\n2️⃣ Testing pause functionality...');
        
        // Test pause
        const pauseResponse = await fetch(`${BASE_URL}/pause/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (pauseResponse.ok) {
            const pauseData = await pauseResponse.json();
            console.log(`✅ Pause successful:`, pauseData);
        } else {
            const pauseError = await pauseResponse.json();
            console.log(`❌ Pause failed:`, pauseError);
        }

        // Check status after pause
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await fetch(`${BASE_URL}/status/${sessionId}`);
        if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            console.log(`📊 Status after pause: ${statusData.status}`);
        }

        console.log('\n3️⃣ Testing resume functionality...');
        
        // Test resume
        const resumeResponse = await fetch(`${BASE_URL}/resume/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (resumeResponse.ok) {
            const resumeData = await resumeResponse.json();
            console.log(`✅ Resume successful:`, resumeData);
        } else {
            const resumeError = await resumeResponse.json();
            console.log(`❌ Resume failed:`, resumeError);
        }

        // Wait a bit for resume to take effect
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('\n4️⃣ Testing stop functionality...');
        
        // Test stop
        const stopResponse = await fetch(`${BASE_URL}/stop/${sessionId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (stopResponse.ok) {
            const stopData = await stopResponse.json();
            console.log(`✅ Stop successful:`, stopData);
        } else {
            const stopError = await stopResponse.json();
            console.log(`❌ Stop failed:`, stopError);
        }

        // Verify session is cleaned up
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const finalStatusResponse = await fetch(`${BASE_URL}/status/${sessionId}`);
        const finalStatusData = await finalStatusResponse.json();
        console.log(`📊 Final status: ${finalStatusData.hasActiveSession ? 'Still active' : 'Cleaned up'}`);

        console.log('\n🎉 Pause/Stop functionality test completed!');
        console.log('='.repeat(50));

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Test different scenarios
async function testErrorScenarios() {
    console.log('\n🧪 Testing Error Scenarios');
    console.log('-'.repeat(30));

    try {
        const { default: fetch } = await import('node-fetch');
        const BASE_URL = 'http://localhost:3001/api/automation';

        // Test pause non-existent session
        console.log('❓ Testing pause on non-existent session...');
        const pauseInvalidResponse = await fetch(`${BASE_URL}/pause/invalid-session-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const pauseInvalidData = await pauseInvalidResponse.json();
        console.log(`🔍 Expected error for invalid session:`, pauseInvalidData);

        // Test stop non-existent session
        console.log('\n❓ Testing stop on non-existent session...');
        const stopInvalidResponse = await fetch(`${BASE_URL}/stop/invalid-session-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const stopInvalidData = await stopInvalidResponse.json();
        console.log(`🔍 Expected error for invalid session:`, stopInvalidData);

    } catch (error) {
        console.error('❌ Error scenario test failed:', error.message);
    }
}

// Run tests
async function runAllTests() {
    console.log('🚀 Starting Pause/Stop Functionality Tests');
    console.log('📝 Make sure the backend server is running on localhost:3001');
    console.log('📝 This test will create and manipulate automation sessions');
    console.log();

    await testPauseStopFunctionality();
    await testErrorScenarios();

    console.log('\n✨ All tests completed!');
    console.log('💡 Check the backend console logs for detailed session handling information');
}

// Execute if called directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('💥 Test execution failed:', error);
        process.exit(1);
    });
}

module.exports = {
    testPauseStopFunctionality,
    testErrorScenarios,
    runAllTests
}; 