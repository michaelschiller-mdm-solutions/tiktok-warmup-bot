// Simple Extension Test Script
// Copy and paste this entire script into the browser console on Instagram

console.log('🧪 Instagram Automation Extension - Simple Test');
console.log('================================================');

// Test 1: Basic Extension Check
console.log('\n1️⃣ Basic Extension Check:');
const hasChrome = typeof chrome !== 'undefined' && chrome.runtime;
console.log('   Chrome Runtime:', hasChrome ? '✅ Available' : '❌ Missing');

if (hasChrome) {
    console.log('   Extension ID:', chrome.runtime.id || 'Unknown');
}

// Test 2: Content Script Files Check
console.log('\n2️⃣ Content Script Files:');
const classes = {
    'HumanBehaviorSimulator': typeof HumanBehaviorSimulator !== 'undefined',
    'InstagramInterface': typeof InstagramInterface !== 'undefined',
    'AutomationEngine': typeof AutomationEngine !== 'undefined',
    'ContentScript': typeof InstagramAutomationContentScript !== 'undefined'
};

Object.entries(classes).forEach(([name, loaded]) => {
    console.log(`   ${name}: ${loaded ? '✅ Loaded' : '❌ Missing'}`);
});

// Test 3: Content Script Instance
console.log('\n3️⃣ Content Script Instance:');
const hasInstance = !!window.instagramAutomationContentScript;
console.log('   Instance Created:', hasInstance ? '✅ Yes' : '❌ No');

if (hasInstance) {
    console.log('   Initialized:', window.instagramAutomationContentScript.isInitialized ? '✅ Yes' : '❌ No');
}

// Test 4: UI Elements
console.log('\n4️⃣ UI Elements:');
const sidebar = document.getElementById('instagram-automation-sidebar');
console.log('   Sidebar Present:', sidebar ? '✅ Yes' : '❌ No');

if (sidebar) {
    console.log('   Sidebar Visible:', sidebar.style.display !== 'none' ? '✅ Yes' : '❌ Hidden');
}

// Test 5: Background Communication
console.log('\n5️⃣ Background Communication:');
if (hasChrome) {
    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('   Background Script: ❌ Error -', chrome.runtime.lastError.message);
        } else if (response && response.success) {
            console.log('   Background Script: ✅ Responding');
        } else {
            console.log('   Background Script: ❌ No Response');
        }
    });
} else {
    console.log('   Background Script: ❌ Chrome runtime not available');
}

// Test 6: Manual Fix Attempt
console.log('\n6️⃣ Auto-Fix Attempt:');
if (classes.ContentScript && !hasInstance) {
    console.log('   Attempting manual initialization...');
    try {
        window.instagramAutomationContentScript = new InstagramAutomationContentScript();
        window.instagramAutomationContentScript.initialize();
        console.log('   Manual Init: ✅ Success');
    } catch (error) {
        console.log('   Manual Init: ❌ Failed -', error.message);
    }
} else if (hasInstance) {
    console.log('   Auto-Fix: ✅ Not needed - already working');
} else {
    console.log('   Auto-Fix: ❌ Cannot fix - content script files missing');
}

// Summary and Next Steps
console.log('\n📋 Summary:');
const allClassesLoaded = Object.values(classes).every(Boolean);
const finalInstance = !!window.instagramAutomationContentScript;
const finalSidebar = !!document.getElementById('instagram-automation-sidebar');

if (hasChrome && allClassesLoaded && finalInstance && finalSidebar) {
    console.log('🎉 Extension Status: ✅ WORKING');
    console.log('');
    console.log('✅ Ready to test follow/unfollow:');
    console.log('   1. Look for sidebar on right side of Instagram');
    console.log('   2. Enter username in test field (try "instagram")');
    console.log('   3. Click "Test Follow" or "Test Unfollow"');
    console.log('   4. Check for success/error messages');
} else {
    console.log('⚠️  Extension Status: ❌ NEEDS FIXING');
    console.log('');
    console.log('🔧 Next Steps:');

    if (!hasChrome) {
        console.log('   1. Go to chrome://extensions/');
        console.log('   2. Find "Instagram Follow/Unfollow Automation"');
        console.log('   3. Click "Reload" button');
        console.log('   4. Refresh this Instagram page');
    } else if (!allClassesLoaded) {
        console.log('   1. Check that all files exist in chrome/ folder');
        console.log('   2. Verify manifest.json is valid');
        console.log('   3. Reload extension in chrome://extensions/');
    } else if (!finalInstance) {
        console.log('   1. Run manual initialization (attempted above)');
        console.log('   2. Check console for JavaScript errors');
        console.log('   3. Refresh page and try again');
    } else if (!finalSidebar) {
        console.log('   1. Wait 5-10 seconds for sidebar to appear');
        console.log('   2. Check if you\'re on https://www.instagram.com');
        console.log('   3. Look for sidebar on right side of page');
    }
}

console.log('\n💡 For detailed troubleshooting, see EXTENSION_TROUBLESHOOTING.md');
console.log('================================================');