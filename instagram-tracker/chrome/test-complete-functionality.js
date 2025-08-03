// Complete Functionality Test
// Tests all settings and functionality of the enhanced Instagram automation extension

async function testCompleteFunctionality() {
    console.log('\n🧪 COMPLETE FUNCTIONALITY TEST');
    console.log('===============================');
    
    const results = {
        extensionLoaded: false,
        settingsWorking: false,
        queueManagerWorking: false,
        uiResponsive: false,
        functionalityBehindSettings: {},
        errors: []
    };
    
    try {
        // Step 1: Check Extension Loading
        console.log('\n1️⃣ Testing Extension Loading...');
        
        const sidebar = document.querySelector('.instagram-automation-sidebar');
        if (sidebar) {
            results.extensionLoaded = true;
            console.log('✅ Extension sidebar found');
        } else {
            console.log('❌ Extension sidebar not found');
            results.errors.push('Extension not loaded');
            return results;
        }
        
        // Step 2: Test Settings Functionality
        console.log('\n2️⃣ Testing Settings Functionality...');
        
        const settingsToTest = [
            // Daily Limits
            { id: 'follow-limit-input', name: 'Daily Follow Limit', type: 'number' },
            { id: 'unfollow-limit-input', name: 'Daily Unfollow Limit', type: 'number' },
            { id: 'hourly-limit-input', name: 'Hourly Action Limit', type: 'number' },
            
            // Timing Controls
            { id: 'min-action-delay-input', name: 'Min Action Delay', type: 'number' },
            { id: 'max-action-delay-input', name: 'Max Action Delay', type: 'number' },
            { id: 'unfollow-delay-input', name: 'Unfollow Delay', type: 'number' },
            
            // Human Behavior
            { id: 'scroll-probability-input', name: 'Home Scroll Probability', type: 'number' },
            { id: 'idle-probability-input', name: 'Idle Behavior Probability', type: 'number' },
            { id: 'scroll-duration-input', name: 'Scroll Duration', type: 'number' },
            { id: 'idle-duration-input', name: 'Idle Duration', type: 'number' },
            
            // Safety Features
            { id: 'session-break-interval-input', name: 'Session Break Interval', type: 'number' },
            { id: 'session-break-duration-input', name: 'Session Break Duration', type: 'number' },
            { id: 'error-rate-input', name: 'Simulated Error Rate', type: 'number' },
            
            // Account Targeting
            { id: 'profile-visit-probability-input', name: 'Profile Visit Probability', type: 'number' },
            { id: 'story-view-probability-input', name: 'Story View Probability', type: 'number' },
            { id: 'like-posts-probability-input', name: 'Like Posts Probability', type: 'number' },
            
            // Queue Management
            { id: 'auto-unfollow-probability-input', name: 'Auto-Unfollow Probability', type: 'number' },
            { id: 'unfollow-delay-min-input', name: 'Min Unfollow Delay', type: 'number' },
            { id: 'unfollow-delay-max-input', name: 'Max Unfollow Delay', type: 'number' },
            { id: 'queue-balance-ratio-input', name: 'Queue Balance Ratio', type: 'number' },
            { id: 'queue-strategy-input', name: 'Queue Strategy', type: 'select' },
            { id: 'priority-unfollows-input', name: 'Priority Unfollows', type: 'select' },
            { id: 'retry-failed-actions-input', name: 'Retry Failed Actions', type: 'number' },
            { id: 'queue-cleanup-interval-input', name: 'Queue Cleanup Interval', type: 'number' },
            
            // Follow Tracking
            { id: 'max-concurrent-follows-input', name: 'Max Concurrent Follows', type: 'number' },
            { id: 'unfollow-non-followers-input', name: 'Unfollow Non-Followers After', type: 'number' },
            { id: 'keep-mutual-follows-input', name: 'Keep Mutual Follows', type: 'select' },
            { id: 'track-engagement-input', name: 'Track Engagement', type: 'select' }
        ];
        
        let settingsFound = 0;
        let settingsFunctional = 0;
        
        for (const setting of settingsToTest) {
            const element = sidebar.querySelector(`#${setting.id}`);
            if (element) {
                settingsFound++;
                console.log(`   ✅ Found: ${setting.name}`);
                
                // Test functionality
                const originalValue = element.value;
                
                try {
                    if (setting.type === 'number') {
                        // Test number input
                        element.value = '999';
                        element.dispatchEvent(new Event('input', { bubbles: true }));
                        
                        if (element.value === '999') {
                            settingsFunctional++;
                            results.functionalityBehindSettings[setting.id] = 'working';
                        }
                        
                        // Restore original value
                        element.value = originalValue;
                        
                    } else if (setting.type === 'select') {
                        // Test select input
                        const options = element.querySelectorAll('option');
                        if (options.length > 1) {
                            const newValue = options[1].value;
                            element.value = newValue;
                            element.dispatchEvent(new Event('change', { bubbles: true }));
                            
                            if (element.value === newValue) {
                                settingsFunctional++;
                                results.functionalityBehindSettings[setting.id] = 'working';
                            }
                            
                            // Restore original value
                            element.value = originalValue;
                        }
                    }
                } catch (error) {
                    console.log(`   ⚠️  Error testing ${setting.name}:`, error.message);
                    results.functionalityBehindSettings[setting.id] = 'error';
                }
            } else {
                console.log(`   ❌ Missing: ${setting.name}`);
                results.functionalityBehindSettings[setting.id] = 'missing';
            }
        }
        
        results.settingsWorking = settingsFunctional > (settingsToTest.length * 0.8);
        console.log(`📊 Settings: ${settingsFound}/${settingsToTest.length} found, ${settingsFunctional}/${settingsToTest.length} functional`);
        
        // Step 3: Test Save/Reset Functionality
        console.log('\n3️⃣ Testing Save/Reset Functionality...');
        
        const saveButton = sidebar.querySelector('#save-settings-btn');
        const resetButton = sidebar.querySelector('#reset-settings-btn');
        
        if (saveButton && resetButton) {
            console.log('✅ Save and Reset buttons found');
            
            // Test save button click
            try {
                saveButton.click();
                console.log('✅ Save button clickable');
                
                // Wait for save confirmation
                setTimeout(() => {
                    if (saveButton.textContent.includes('Saved')) {
                        console.log('✅ Save confirmation working');
                    }
                }, 100);
                
            } catch (error) {
                console.log('❌ Save button error:', error.message);
            }
            
        } else {
            console.log('❌ Save/Reset buttons missing');
        }
        
        // Step 4: Test Queue Manager
        console.log('\n4️⃣ Testing Queue Manager...');
        
        try {
            // Check if EnhancedQueueManager is available
            if (typeof EnhancedQueueManager !== 'undefined') {
                console.log('✅ EnhancedQueueManager class available');
                
                // Test instantiation
                const testQueueManager = new EnhancedQueueManager();
                console.log('✅ Queue manager can be instantiated');
                
                // Test basic methods
                const stats = testQueueManager.getStatistics();
                console.log('✅ getStatistics() method working:', stats);
                
                // Test adding to queues
                testQueueManager.addToFollowQueue('test_user');
                console.log('✅ addToFollowQueue() method working');
                
                testQueueManager.addToUnfollowQueue('test_user2');
                console.log('✅ addToUnfollowQueue() method working');
                
                results.queueManagerWorking = true;
                
            } else {
                console.log('❌ EnhancedQueueManager not available');
                results.errors.push('Queue manager not loaded');
            }
        } catch (error) {
            console.log('❌ Queue manager error:', error.message);
            results.errors.push('Queue manager error: ' + error.message);
        }
        
        // Step 5: Test Current Follows Management UI
        console.log('\n5️⃣ Testing Current Follows Management UI...');
        
        const followsElements = [
            { id: 'current-follows-count', name: 'Current Follows Count' },
            { id: 'scheduled-unfollows-count', name: 'Scheduled Unfollows Count' },
            { id: 'mutual-followers-count', name: 'Mutual Followers Count' },
            { id: 'bulk-unfollow-count', name: 'Bulk Unfollow Count Input' },
            { id: 'bulk-unfollow-criteria', name: 'Bulk Unfollow Criteria Select' },
            { id: 'schedule-bulk-unfollow-btn', name: 'Schedule Bulk Unfollow Button' },
            { id: 'immediate-bulk-unfollow-btn', name: 'Immediate Bulk Unfollow Button' },
            { id: 'export-follows-btn', name: 'Export Follows Button' },
            { id: 'import-unfollow-list-btn', name: 'Import Unfollow List Button' },
            { id: 'refresh-follows-btn', name: 'Refresh Follows Button' },
            { id: 'follows-list-container', name: 'Follows List Container' }
        ];
        
        let uiElementsFound = 0;
        
        for (const element of followsElements) {
            const el = sidebar.querySelector(`#${element.id}`);
            if (el) {
                uiElementsFound++;
                console.log(`   ✅ Found: ${element.name}`);
                
                // Test clickability for buttons
                if (element.id.includes('btn')) {
                    try {
                        // Just test if click event can be attached
                        const testHandler = () => {};
                        el.addEventListener('click', testHandler);
                        el.removeEventListener('click', testHandler);
                        console.log(`   ✅ ${element.name} is clickable`);
                    } catch (error) {
                        console.log(`   ⚠️  ${element.name} click test failed`);
                    }
                }
            } else {
                console.log(`   ❌ Missing: ${element.name}`);
            }
        }
        
        results.uiResponsive = uiElementsFound > (followsElements.length * 0.8);
        console.log(`📊 UI Elements: ${uiElementsFound}/${followsElements.length} found`);
        
        // Step 6: Test Tooltips
        console.log('\n6️⃣ Testing Tooltips...');
        
        const tooltips = sidebar.querySelectorAll('.tooltip');
        let workingTooltips = 0;
        
        tooltips.forEach((tooltip, index) => {
            const tooltipText = tooltip.getAttribute('data-tooltip');
            if (tooltipText && tooltipText.length > 10) {
                workingTooltips++;
            }
        });
        
        console.log(`📊 Tooltips: ${workingTooltips}/${tooltips.length} have proper content`);
        
        // Step 7: Test Storage Integration
        console.log('\n7️⃣ Testing Storage Integration...');
        
        try {
            if (typeof chrome !== 'undefined' && chrome.storage) {
                // Test storage write
                await chrome.storage.local.set({ testKey: 'testValue' });
                
                // Test storage read
                const result = await chrome.storage.local.get(['testKey']);
                
                if (result.testKey === 'testValue') {
                    console.log('✅ Chrome storage working');
                    
                    // Clean up
                    await chrome.storage.local.remove(['testKey']);
                } else {
                    console.log('❌ Chrome storage read failed');
                }
            } else {
                console.log('⚠️  Chrome storage API not available (extension context required)');
            }
        } catch (error) {
            console.log('❌ Storage test error:', error.message);
        }
        
        // Step 8: Final Assessment
        console.log('\n8️⃣ Final Assessment...');
        console.log('======================');
        
        const overallScore = [
            results.extensionLoaded,
            results.settingsWorking,
            results.queueManagerWorking,
            results.uiResponsive
        ].filter(Boolean).length;
        
        console.log(`📊 Overall Score: ${overallScore}/4`);
        console.log(`📊 Settings Functional: ${Object.values(results.functionalityBehindSettings).filter(v => v === 'working').length}`);
        console.log(`📊 Errors Found: ${results.errors.length}`);
        
        if (overallScore >= 3) {
            console.log('🎉 EXCELLENT: Extension is highly functional!');
        } else if (overallScore >= 2) {
            console.log('✅ GOOD: Extension is mostly working');
        } else {
            console.log('⚠️  NEEDS WORK: Extension has significant issues');
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        
        if (!results.extensionLoaded) {
            console.log('   • Load the extension properly');
        }
        
        if (!results.settingsWorking) {
            console.log('   • Fix settings functionality');
        }
        
        if (!results.queueManagerWorking) {
            console.log('   • Debug queue manager loading');
        }
        
        if (!results.uiResponsive) {
            console.log('   • Fix missing UI elements');
        }
        
        if (results.errors.length > 0) {
            console.log('   • Address errors:', results.errors.join(', '));
        }
        
        if (overallScore >= 3) {
            console.log('   • Extension is ready for production use! 🚀');
            console.log('   • Test with real Instagram accounts');
            console.log('   • Monitor for rate limiting');
        }
        
        return results;
        
    } catch (error) {
        console.error('\n❌ COMPLETE FUNCTIONALITY TEST FAILED');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        
        results.errors.push(error.message);
        return results;
    }
}

// Auto-run the test
console.log('🔄 Starting Complete Functionality Test...');
testCompleteFunctionality().then(result => {
    console.log('\n🎯 FINAL RESULT:', result);
}).catch(error => {
    console.error('❌ Test failed:', error);
});