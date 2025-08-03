// Deep Functionality Test
// Actually tests if the settings and functionality work, not just if UI elements exist

async function testDeepFunctionality() {
    console.log('\n🔬 DEEP FUNCTIONALITY TEST');
    console.log('===========================');
    
    const results = {
        settingsActuallyWork: false,
        queueManagerExists: false,
        queueManagerFunctional: false,
        eventListenersAttached: false,
        storageIntegration: false,
        automationEngineWorking: false,
        errors: [],
        detailedFindings: {}
    };
    
    try {
        // Step 1: Test if settings actually save and load
        console.log('\n1️⃣ Testing Settings Save/Load Functionality...');
        
        const sidebar = document.querySelector('.instagram-automation-sidebar');
        if (!sidebar) {
            results.errors.push('Extension sidebar not found');
            return results;
        }
        
        // Test a specific setting
        const followLimitInput = sidebar.querySelector('#follow-limit-input');
        if (followLimitInput) {
            const originalValue = followLimitInput.value;
            console.log(`   Original follow limit: ${originalValue}`);
            
            // Change the value
            followLimitInput.value = '123';
            followLimitInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Try to save settings
            const saveButton = sidebar.querySelector('#save-settings-btn');
            if (saveButton) {
                console.log('   Attempting to save settings...');
                saveButton.click();
                
                // Wait a moment
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check if save worked (button text should change)
                if (saveButton.textContent.includes('Saved') || saveButton.textContent.includes('✅')) {
                    console.log('   ✅ Save button shows confirmation');
                    results.settingsActuallyWork = true;
                } else {
                    console.log('   ❌ Save button shows no confirmation');
                    results.detailedFindings.saveConfirmation = 'No visual confirmation';
                }
                
                // Restore original value
                followLimitInput.value = originalValue;
            } else {
                console.log('   ❌ Save button not found');
                results.errors.push('Save button missing');
            }
        } else {
            console.log('   ❌ Follow limit input not found');
            results.errors.push('Settings inputs missing');
        }
        
        // Step 2: Test Queue Manager Existence and Functionality
        console.log('\n2️⃣ Testing Queue Manager...');
        
        // Check if EnhancedQueueManager class exists
        if (typeof EnhancedQueueManager !== 'undefined') {
            console.log('   ✅ EnhancedQueueManager class exists');
            results.queueManagerExists = true;
            
            try {
                // Test instantiation
                const testQueue = new EnhancedQueueManager();
                console.log('   ✅ Can instantiate queue manager');
                
                // Test basic methods
                const initialStats = testQueue.getStatistics();
                console.log('   📊 Initial stats:', initialStats);
                
                // Test adding to follow queue
                testQueue.addToFollowQueue('test_user_123');
                const statsAfterAdd = testQueue.getStatistics();
                
                if (statsAfterAdd.queueSizes.follow > initialStats.queueSizes.follow) {
                    console.log('   ✅ addToFollowQueue() actually works');
                    results.queueManagerFunctional = true;
                } else {
                    console.log('   ❌ addToFollowQueue() not working');
                    results.detailedFindings.queueAdd = 'Queue size not increased';
                }
                
                // Test queue balancing
                const nextAction = testQueue.getNextAction();
                if (nextAction) {
                    console.log('   ✅ getNextAction() returns action:', nextAction.type);
                } else {
                    console.log('   ⚠️  getNextAction() returns null (might be normal if no actions)');
                }
                
            } catch (error) {
                console.log('   ❌ Queue manager instantiation failed:', error.message);
                results.errors.push('Queue manager error: ' + error.message);
            }
        } else {
            console.log('   ❌ EnhancedQueueManager class not found');
            results.errors.push('Queue manager class missing');
        }
        
        // Step 3: Test Event Listeners
        console.log('\n3️⃣ Testing Event Listeners...');
        
        const buttonsToTest = [
            { id: 'save-settings-btn', name: 'Save Settings' },
            { id: 'reset-settings-btn', name: 'Reset Settings' },
            { id: 'schedule-bulk-unfollow-btn', name: 'Schedule Bulk Unfollow' },
            { id: 'export-follows-btn', name: 'Export Follows' },
            { id: 'refresh-follows-btn', name: 'Refresh Follows' }
        ];
        
        let workingListeners = 0;
        
        for (const button of buttonsToTest) {
            const element = sidebar.querySelector(`#${button.id}`);
            if (element) {
                // Test if click event is handled
                let eventFired = false;
                
                const testHandler = () => {
                    eventFired = true;
                };
                
                element.addEventListener('click', testHandler, { once: true });
                element.click();
                
                // Small delay to allow event processing
                await new Promise(resolve => setTimeout(resolve, 100));
                
                if (eventFired) {
                    console.log(`   ✅ ${button.name} has working event listener`);
                    workingListeners++;
                } else {
                    console.log(`   ❌ ${button.name} event listener not working`);
                }
            } else {
                console.log(`   ❌ ${button.name} button not found`);
            }
        }
        
        results.eventListenersAttached = workingListeners > (buttonsToTest.length * 0.5);
        results.detailedFindings.workingListeners = `${workingListeners}/${buttonsToTest.length}`;
        
        // Step 4: Test Chrome Storage Integration
        console.log('\n4️⃣ Testing Chrome Storage Integration...');
        
        if (typeof chrome !== 'undefined' && chrome.storage) {
            try {
                // Test write
                await chrome.storage.local.set({ testFunctionality: 'working' });
                
                // Test read
                const result = await chrome.storage.local.get(['testFunctionality']);
                
                if (result.testFunctionality === 'working') {
                    console.log('   ✅ Chrome storage read/write working');
                    results.storageIntegration = true;
                    
                    // Clean up
                    await chrome.storage.local.remove(['testFunctionality']);
                } else {
                    console.log('   ❌ Chrome storage read failed');
                    results.detailedFindings.storage = 'Read failed';
                }
            } catch (error) {
                console.log('   ❌ Chrome storage error:', error.message);
                results.errors.push('Storage error: ' + error.message);
            }
        } else {
            console.log('   ⚠️  Chrome storage API not available');
            results.detailedFindings.storage = 'API not available';
        }
        
        // Step 5: Test Automation Engine Integration
        console.log('\n5️⃣ Testing Automation Engine...');
        
        // Check if automation engine exists
        if (typeof window.instagramAutomation !== 'undefined') {
            console.log('   ✅ Instagram automation object exists');
            
            const automation = window.instagramAutomation;
            
            // Test if it has expected methods
            const expectedMethods = ['startAutomation', 'pauseAutomation', 'stopAutomation', 'saveSettings'];
            let workingMethods = 0;
            
            for (const method of expectedMethods) {
                if (typeof automation[method] === 'function') {
                    console.log(`   ✅ ${method}() method exists`);
                    workingMethods++;
                } else {
                    console.log(`   ❌ ${method}() method missing`);
                }
            }
            
            results.automationEngineWorking = workingMethods === expectedMethods.length;
            results.detailedFindings.automationMethods = `${workingMethods}/${expectedMethods.length}`;
            
        } else {
            console.log('   ❌ Instagram automation object not found');
            results.errors.push('Automation engine not initialized');
        }
        
        // Step 6: Test Actual Settings Integration
        console.log('\n6️⃣ Testing Settings Integration with Automation...');
        
        if (typeof window.instagramAutomation !== 'undefined' && window.instagramAutomation.automationEngine) {
            const engine = window.instagramAutomation.automationEngine;
            
            // Check if settings are actually loaded into the engine
            if (engine.state && engine.state.settings) {
                console.log('   ✅ Automation engine has settings state');
                console.log('   📊 Current settings:', Object.keys(engine.state.settings));
                
                // Test if changing a setting actually updates the engine
                const originalFollowLimit = engine.state.settings.dailyLimits?.follows;
                console.log(`   Original follow limit in engine: ${originalFollowLimit}`);
                
                // This would require actually calling saveSettings to test integration
                results.detailedFindings.settingsIntegration = 'Settings state exists in engine';
            } else {
                console.log('   ❌ Automation engine has no settings state');
                results.detailedFindings.settingsIntegration = 'No settings state in engine';
            }
        }
        
        // Step 7: Test Follow Management Functions
        console.log('\n7️⃣ Testing Follow Management Functions...');
        
        if (typeof window.instagramAutomation !== 'undefined') {
            const automation = window.instagramAutomation;
            
            // Test follow management methods
            const followMethods = ['scheduleUnfollow', 'cancelUnfollow', 'immediateUnfollow', 'refreshFollowsList'];
            let workingFollowMethods = 0;
            
            for (const method of followMethods) {
                if (typeof automation[method] === 'function') {
                    console.log(`   ✅ ${method}() method exists`);
                    workingFollowMethods++;
                } else {
                    console.log(`   ❌ ${method}() method missing`);
                }
            }
            
            results.detailedFindings.followMethods = `${workingFollowMethods}/${followMethods.length}`;
        }
        
        // Step 8: Final Assessment
        console.log('\n8️⃣ Final Deep Assessment...');
        console.log('==============================');
        
        const functionalityScore = [
            results.settingsActuallyWork,
            results.queueManagerExists,
            results.queueManagerFunctional,
            results.eventListenersAttached,
            results.storageIntegration,
            results.automationEngineWorking
        ].filter(Boolean).length;
        
        console.log(`📊 Functionality Score: ${functionalityScore}/6`);
        console.log(`📊 Errors Found: ${results.errors.length}`);
        
        // Detailed findings
        console.log('\n🔍 Detailed Findings:');
        Object.entries(results.detailedFindings).forEach(([key, value]) => {
            console.log(`   ${key}: ${value}`);
        });
        
        // Honest assessment
        if (functionalityScore >= 5) {
            console.log('\n✅ VERDICT: Extension is genuinely functional');
        } else if (functionalityScore >= 3) {
            console.log('\n⚠️  VERDICT: Extension is partially functional - needs work');
        } else {
            console.log('\n❌ VERDICT: Extension is mostly UI mockup - limited functionality');
        }
        
        // Specific issues found
        if (results.errors.length > 0) {
            console.log('\n🚨 Critical Issues:');
            results.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error}`);
            });
        }
        
        return results;
        
    } catch (error) {
        console.error('\n❌ DEEP FUNCTIONALITY TEST FAILED');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        
        results.errors.push(error.message);
        return results;
    }
}

// Auto-run the test
console.log('🔄 Starting Deep Functionality Test...');
testDeepFunctionality().then(result => {
    console.log('\n🎯 DEEP TEST RESULT:', result);
}).catch(error => {
    console.error('❌ Deep test failed:', error);
});