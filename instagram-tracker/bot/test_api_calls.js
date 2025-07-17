/**
 * Test script to debug API call issues
 */

async function testApiCalls() {
    try {
        // Dynamic import for fetch (node-fetch 3.x is ES module)
        const { default: fetch } = await import('node-fetch');
        
        console.log('🧪 Testing API Connectivity to Backend...\n');
        
        // Test 1: Check if backend is responding
        console.log('1️⃣ Testing backend health...');
        try {
            const healthResponse = await fetch('http://localhost:3001/api/accounts/lifecycle/states');
            const healthData = await healthResponse.json();
            console.log('✅ Backend is responding:', healthResponse.ok ? 'OK' : 'Error');
            console.log('📊 States available:', healthData.success ? healthData.data.length : 'Failed');
        } catch (error) {
            console.log('❌ Backend not accessible:', error.message);
            return;
        }
        
        // Test 2: Test two-step transition (imported -> ready -> ready_for_bot_assignment)
        console.log('\n2️⃣ Testing two-step transition to ready_for_bot_assignment...');
        try {
            // Step 1: Transition to ready
            console.log('🔄 Step 1: Transitioning to ready state...');
            const readyResponse = await fetch('http://localhost:3001/api/accounts/lifecycle/204/transition', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    to_state: 'ready',
                    reason: 'API test call - preparing for bot assignment',
                    notes: 'Testing two-step transition',
                    force: true
                })
            });
            
            const readyData = await readyResponse.json();
            console.log('📤 Ready Transition Status:', readyResponse.status);
            console.log('📤 Ready Transition Response:', readyData);
            
            if (readyResponse.ok) {
                console.log('✅ Step 1 successful - Account moved to ready');
                
                // Step 2: Transition to ready_for_bot_assignment
                console.log('🔄 Step 2: Transitioning to ready_for_bot_assignment...');
                const assignmentResponse = await fetch('http://localhost:3001/api/accounts/lifecycle/204/transition', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        to_state: 'ready_for_bot_assignment',
                        reason: 'API test call - found verification token',
                        notes: 'Testing pre-verification API call',
                        force: true
                    })
                });
                
                const assignmentData = await assignmentResponse.json();
                console.log('📤 Assignment Transition Status:', assignmentResponse.status);
                console.log('📤 Assignment Transition Response:', assignmentData);
                
                if (assignmentResponse.ok) {
                    console.log('✅ Step 2 successful - Account moved to ready_for_bot_assignment');
                    console.log('✅ Complete two-step transition successful!');
                } else {
                    console.log('❌ Step 2 failed:', assignmentData.message || assignmentData.error);
                }
            } else {
                console.log('❌ Step 1 failed:', readyData.message || readyData.error);
            }
        } catch (error) {
            console.log('❌ Transition API call error:', error.message);
        }
        
        // Test 3: Test invalidate endpoint 
        console.log('\n3️⃣ Testing invalidate endpoint...');
        try {
            const invalidateResponse = await fetch('http://localhost:3001/api/accounts/lifecycle/206/invalidate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reason: 'API test call - email connection failed'
                })
            });
            
            const invalidateData = await invalidateResponse.json();
            console.log('📤 Invalidate Response Status:', invalidateResponse.status);
            console.log('📤 Invalidate Response:', invalidateData);
            
            if (invalidateResponse.ok) {
                console.log('✅ Invalidate API call successful');
            } else {
                console.log('❌ Invalidate API call failed:', invalidateData.message || invalidateData.error);
            }
        } catch (error) {
            console.log('❌ Invalidate API call error:', error.message);
        }
        
        console.log('\n📋 API Test Complete!');
        
    } catch (error) {
        console.error('❌ Overall test error:', error);
    }
}

testApiCalls(); 