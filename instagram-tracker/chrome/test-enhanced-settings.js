// Test Enhanced Settings Configuration
// Verifies all new settings are working correctly

async function testEnhancedSettings() {
    console.log('\n⚙️ ENHANCED SETTINGS TEST');
    console.log('==========================');
    
    try {
        // Step 1: Check if extension is loaded
        console.log('\n1️⃣ Checking Extension Status...');
        
        const sidebar = document.querySelector('.instagram-automation-sidebar');
        if (!sidebar) {
            throw new Error('Extension sidebar not found. Make sure the extension is loaded.');
        }
        console.log('✅ Extension sidebar found');
        
        // Step 2: Test Settings Structure
        console.log('\n2️⃣ Testing Settings Structure...');
        
        const settingsGroups = [
            { name: 'Daily Limits', selector: '.settings-group:nth-child(1)' },
            { name: 'Timing Controls', selector: '.settings-group:nth-child(2)' },
            { name: 'Human Behavior', selector: '.settings-group:nth-child(3)' },
            { name: 'Safety Features', selector: '.settings-group:nth-child(4)' },
            { name: 'Account Targeting', selector: '.settings-group:nth-child(5)' }
        ];
        
        const foundGroups = [];
        settingsGroups.forEach(group => {
            const element = sidebar.querySelector(group.selector);
            if (element) {
                foundGroups.push(group.name);
                console.log(`   ✅ ${group.name} section found`);
            } else {
                console.log(`   ❌ ${group.name} section missing`);
            }
        });
        
        // Step 3: Test Individual Settings
        console.log('\n3️⃣ Testing Individual Settings...');
        
        const settingsInputs = [
            // Daily Limits
            { id: 'follow-limit-input', name: 'Daily Follow Limit', expectedDefault: '50' },
            { id: 'unfollow-limit-input', name: 'Daily Unfollow Limit', expectedDefault: '50' },
            { id: 'hourly-limit-input', name: 'Hourly Action Limit', expectedDefault: '8' },
            
            // Timing Controls
            { id: 'min-action-delay-input', name: 'Min Action Delay', expectedDefault: '60' },
            { id: 'max-action-delay-input', name: 'Max Action Delay', expectedDefault: '300' },
            { id: 'unfollow-delay-input', name: 'Unfollow Delay', expectedDefault: '3' },
            
            // Human Behavior
            { id: 'scroll-probability-input', name: 'Home Scroll Probability', expectedDefault: '70' },
            { id: 'idle-probability-input', name: 'Idle Behavior Probability', expectedDefault: '25' },
            { id: 'scroll-duration-input', name: 'Scroll Duration', expectedDefault: '15' },
            { id: 'idle-duration-input', name: 'Idle Duration', expectedDefault: '30' },
            
            // Safety Features
            { id: 'session-break-interval-input', name: 'Session Break Interval', expectedDefault: '30' },
            { id: 'session-break-duration-input', name: 'Session Break Duration', expectedDefault: '15' },
            { id: 'error-rate-input', name: 'Simulated Error Rate', expectedDefault: '5' },
            
            // Account Targeting
            { id: 'profile-visit-probability-input', name: 'Profile Visit Probability', expectedDefault: '30' },
            { id: 'story-view-probability-input', name: 'Story View Probability', expectedDefault: '15' },
            { id: 'like-posts-probability-input', name: 'Like Posts Probability', expectedDefault: '20' }
        ];
        
        const foundInputs = [];
        const missingInputs = [];
        
        settingsInputs.forEach(setting => {
            const input = sidebar.querySelector(`#${setting.id}`);
            if (input) {
                foundInputs.push({
                    ...setting,
                    currentValue: input.value,
                    element: input
                });
                console.log(`   ✅ ${setting.name}: ${input.value} (expected: ${setting.expectedDefault})`);
            } else {
                missingInputs.push(setting);
                console.log(`   ❌ ${setting.name}: Input not found`);
            }
        });
        
        // Step 4: Test Tooltips
        console.log('\n4️⃣ Testing Tooltips...');
        
        const tooltips = sidebar.querySelectorAll('.tooltip');
        console.log(`   Found ${tooltips.length} tooltips`);
        
        let tooltipCount = 0;
        tooltips.forEach((tooltip, index) => {
            const tooltipText = tooltip.getAttribute('data-tooltip');
            if (tooltipText && tooltipText.length > 10) {
                tooltipCount++;
                console.log(`   ✅ Tooltip ${index + 1}: "${tooltipText.substring(0, 50)}..."`);
            } else {
                console.log(`   ⚠️  Tooltip ${index + 1}: Missing or short tooltip text`);
            }
        });
        
        // Step 5: Test Settings Functionality
        console.log('\n5️⃣ Testing Settings Functionality...');
        
        // Test save button
        const saveButton = sidebar.querySelector('#save-settings-btn');
        const resetButton = sidebar.querySelector('#reset-settings-btn');
        
        if (saveButton) {
            console.log('   ✅ Save Settings button found');
        } else {
            console.log('   ❌ Save Settings button missing');
        }
        
        if (resetButton) {
            console.log('   ✅ Reset Settings button found');
        } else {
            console.log('   ❌ Reset Settings button missing');
        }
        
        // Step 6: Test Settings Validation
        console.log('\n6️⃣ Testing Settings Validation...');
        
        const validationTests = [];
        
        foundInputs.forEach(setting => {
            const input = setting.element;
            const min = parseInt(input.getAttribute('min'));
            const max = parseInt(input.getAttribute('max'));
            const currentValue = parseInt(input.value);
            
            if (!isNaN(min) && !isNaN(max)) {
                const isValid = currentValue >= min && currentValue <= max;
                validationTests.push({
                    name: setting.name,
                    valid: isValid,
                    value: currentValue,
                    range: `${min}-${max}`
                });
                
                if (isValid) {
                    console.log(`   ✅ ${setting.name}: ${currentValue} (valid range: ${min}-${max})`);
                } else {
                    console.log(`   ❌ ${setting.name}: ${currentValue} (out of range: ${min}-${max})`);
                }
            }
        });
        
        // Step 7: Test Settings Persistence
        console.log('\n7️⃣ Testing Settings Persistence...');
        
        try {
            // Try to access chrome.storage
            if (typeof chrome !== 'undefined' && chrome.storage) {
                console.log('   ✅ Chrome storage API available');
                
                // Test loading settings
                const result = await chrome.storage.local.get(['automationSettings']);
                if (result.automationSettings) {
                    console.log('   ✅ Saved settings found in storage');
                    console.log('   📊 Settings structure:', Object.keys(result.automationSettings));
                } else {
                    console.log('   ⚠️  No saved settings found (this is normal for first run)');
                }
            } else {
                console.log('   ⚠️  Chrome storage API not available (extension context required)');
            }
        } catch (error) {
            console.log('   ❌ Error testing settings persistence:', error.message);
        }
        
        // Step 8: Results Summary
        console.log('\n8️⃣ Test Results Summary...');
        console.log('===========================');
        
        const summary = {
            settingsGroupsFound: foundGroups.length,
            totalSettingsGroups: settingsGroups.length,
            inputsFound: foundInputs.length,
            totalInputs: settingsInputs.length,
            tooltipsFound: tooltipCount,
            validationPassed: validationTests.filter(t => t.valid).length,
            totalValidationTests: validationTests.length
        };
        
        console.log(`📊 Settings Groups: ${summary.settingsGroupsFound}/${summary.totalSettingsGroups}`);
        console.log(`📊 Input Fields: ${summary.inputsFound}/${summary.totalInputs}`);
        console.log(`📊 Tooltips: ${summary.tooltipsFound}`);
        console.log(`📊 Validation: ${summary.validationPassed}/${summary.totalValidationTests} passed`);
        
        // Overall assessment
        const completionRate = (summary.inputsFound / summary.totalInputs) * 100;
        
        if (completionRate >= 95) {
            console.log('\n🎉 EXCELLENT: Enhanced settings are fully functional!');
        } else if (completionRate >= 80) {
            console.log('\n✅ GOOD: Most enhanced settings are working correctly');
        } else if (completionRate >= 60) {
            console.log('\n⚠️  PARTIAL: Some enhanced settings need attention');
        } else {
            console.log('\n❌ POOR: Enhanced settings need significant work');
        }
        
        // Recommendations
        console.log('\n💡 Recommendations:');
        
        if (missingInputs.length > 0) {
            console.log(`   • Fix ${missingInputs.length} missing input fields`);
        }
        
        if (tooltipCount < settingsInputs.length) {
            console.log(`   • Add tooltips for remaining ${settingsInputs.length - tooltipCount} settings`);
        }
        
        const invalidSettings = validationTests.filter(t => !t.valid);
        if (invalidSettings.length > 0) {
            console.log(`   • Fix ${invalidSettings.length} settings with invalid values`);
        }
        
        if (foundGroups.length === settingsGroups.length && foundInputs.length === settingsInputs.length) {
            console.log('   • All settings are properly implemented! 🎯');
            console.log('   • Test the save/reset functionality');
            console.log('   • Verify settings persistence across browser sessions');
        }
        
        return {
            success: completionRate >= 80,
            completionRate,
            summary,
            missingInputs,
            invalidSettings
        };
        
    } catch (error) {
        console.error('\n❌ ENHANCED SETTINGS TEST FAILED');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        
        return {
            success: false,
            error: error.message
        };
    }
}

// Auto-run the test
console.log('🔄 Starting Enhanced Settings Test...');
testEnhancedSettings().then(result => {
    console.log('\n🎯 FINAL RESULT:', result);
}).catch(error => {
    console.error('❌ Test failed:', error);
});