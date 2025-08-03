// Quick Functionality Check
// Rapid test to see what's actually working

console.log('\n🔍 QUICK FUNCTIONALITY CHECK');
console.log('=============================');

// Check 1: Extension loaded
const sidebar = document.querySelector('.instagram-automation-sidebar');
console.log('Extension loaded:', !!sidebar);

// Check 2: EnhancedQueueManager exists
console.log('EnhancedQueueManager exists:', typeof EnhancedQueueManager !== 'undefined');

// Check 3: Instagram automation object
console.log('instagramAutomation exists:', typeof window.instagramAutomation !== 'undefined');

// Check 4: Automation engine
if (window.instagramAutomation) {
    console.log('Automation engine exists:', !!window.instagramAutomation.automationEngine);
    console.log('Queue manager exists:', !!window.instagramAutomation.queueManager);

    // Check methods
    const methods = ['saveSettings', 'scheduleUnfollow', 'refreshFollowsList'];
    methods.forEach(method => {
        console.log(`${method} method:`, typeof window.instagramAutomation[method] === 'function');
    });
}

// Check 5: Test a simple setting change
if (sidebar) {
    const followInput = sidebar.querySelector('#follow-limit-input');
    if (followInput) {
        const originalValue = followInput.value;
        followInput.value = '999';
        console.log('Can change input value:', followInput.value === '999');
        followInput.value = originalValue; // restore
    }
}

// Check 6: Test save button
const saveBtn = sidebar?.querySelector('#save-settings-btn');
if (saveBtn) {
    console.log('Save button exists:', true);
    console.log('Save button clickable:', typeof saveBtn.click === 'function');

    // Test click (but don't actually save)
    const originalText = saveBtn.textContent;
    console.log('Save button text:', originalText);
}

// Check 7: Chrome storage
console.log('Chrome storage available:', !!(typeof chrome !== 'undefined' && chrome.storage));

console.log('\n📊 SUMMARY: Extension appears to be',
    sidebar && typeof window.instagramAutomation !== 'undefined' ? 'LOADED' : 'NOT LOADED');

// Check if the new queue management settings are actually connected
if (window.instagramAutomation && window.instagramAutomation.automationEngine) {
    const engine = window.instagramAutomation.automationEngine;
    console.log('\nEngine state exists:', !!engine.state);
    console.log('Engine settings exist:', !!engine.state?.settings);

    if (engine.state?.settings) {
        console.log('Settings categories:', Object.keys(engine.state.settings));
        console.log('Has queueManagement settings:', !!engine.state.settings.queueManagement);
        console.log('Has followTracking settings:', !!engine.state.settings.followTracking);
    }
}