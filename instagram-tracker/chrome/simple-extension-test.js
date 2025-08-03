// Simple Extension Test
// Copy and paste this into browser console to test basic extension functionality

console.log('🧪 SIMPLE EXTENSION TEST');
console.log('========================');

// Test 1: Check if we're on Instagram
console.log('\n1️⃣ Page Check:');
const isInstagram = window.location.hostname.includes('instagram.com');
const isHTTPS = window.location.protocol === 'https:';
console.log('   Instagram:', isInstagram ? '✅' : '❌');
console.log('   HTTPS:', isHTTPS ? '✅' : '❌');

if (!isInstagram || !isHTTPS) {
    console.log('   ❌ Extension only works on https://www.instagram.com');
    console.log('   Please navigate to Instagram first');
    return;
}

// Test 2: Check Chrome extension APIs
console.log('\n2️⃣ Chrome APIs:');
console.log('   chrome:', typeof chrome);
console.log('   chrome.runtime:', typeof chrome?.runtime);

if (typeof chrome === 'undefined') {
    console.log('   ❌ Chrome APIs not available');
    console.log('   This means the extension is not loaded');
    console.log('');
    console.log('   🔧 TROUBLESHOOTING STEPS:');
    console.log('   1. Open chrome://extensions/');
    console.log('   2. Find "Instagram Follow/Unfollow Automation"');
    console.log('   3. Make sure it\'s ENABLED (toggle should be blue)');
    console.log('   4. Click the RELOAD button (circular arrow)');
    console.log('   5. Check for any error messages');
    console.log('   6. Come back to Instagram and refresh (Ctrl+F5)');
    console.log('   7. Run this test again');
    return;
}

// Test 3: Extension ID and manifest
console.log('\n3️⃣ Extension Details:');
if (chrome.runtime && chrome.runtime.id) {
    console.log('   Extension ID:', chrome.runtime.id);

    try {
        const manifest = chrome.runtime.getManifest();
        console.log('   Name:', manifest.name);
        console.log('   Version:', manifest.version);
        console.log('   Manifest V:', manifest.manifest_version);
    } catch (error) {
        console.log('   Manifest error:', error.message);
    }
} else {
    console.log('   ❌ Extension runtime not available');
}

// Test 4: Background script communication
console.log('\n4️⃣ Background Script:');
if (chrome.runtime) {
    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('   Background script: ❌', chrome.runtime.lastError.message);
        } else if (response) {
            console.log('   Background script: ✅ Working');
            console.log('   Response:', response);
        } else {
            console.log('   Background script: ❌ No response');
        }
    });
} else {
    console.log('   ❌ Cannot test - runtime not available');
}

// Test 5: Content script classes
console.log('\n5️⃣ Content Scripts:');
const classes = ['HumanBehaviorSimulator', 'InstagramInterface', 'AutomationEngine', 'InstagramAutomationContentScript'];
let loadedClasses = 0;

classes.forEach(className => {
    const exists = typeof window[className] !== 'undefined';
    console.log(`   ${className}: ${exists ? '✅' : '❌'}`);
    if (exists) loadedClasses++;
});

console.log(`   Loaded: ${loadedClasses}/${classes.length}`);

// Test 6: Content script instance
console.log('\n6️⃣ Content Script Instance:');
const hasInstance = !!window.instagramAutomationContentScript;
console.log('   Instance exists:', hasInstance ? '✅' : '❌');

if (hasInstance) {
    console.log('   Initialized:', window.instagramAutomationContentScript.isInitialized ? '✅' : '❌');
}

// Test 7: Sidebar
console.log('\n7️⃣ Sidebar UI:');
const sidebar = document.getElementById('instagram-automation-sidebar');
console.log('   Sidebar element:', sidebar ? '✅' : '❌');

if (sidebar) {
    console.log('   Visible:', sidebar.style.display !== 'none' ? '✅' : '❌');
    console.log('   Has content:', sidebar.innerHTML.length > 0 ? '✅' : '❌');
}

// Final summary
console.log('\n🎯 SUMMARY:');
setTimeout(() => {
    const chromeOK = typeof chrome !== 'undefined' && chrome.runtime;
    const scriptsOK = loadedClasses >= 2; // At least half the classes loaded
    const instanceOK = hasInstance;
    const sidebarOK = !!sidebar;

    console.log('   Chrome APIs:', chromeOK ? '✅' : '❌');
    console.log('   Content Scripts:', scriptsOK ? '✅' : '❌');
    console.log('   Script Instance:', instanceOK ? '✅' : '❌');
    console.log('   Sidebar UI:', sidebarOK ? '✅' : '❌');

    if (chromeOK && scriptsOK && instanceOK && sidebarOK) {
        console.log('\n   🎉 EXTENSION IS WORKING! ✅');
        console.log('   You should see the automation sidebar on the right side of the page.');
    } else if (!chromeOK) {
        console.log('\n   🔴 EXTENSION NOT LOADED');
        console.log('   Follow the troubleshooting steps above.');
    } else {
        console.log('\n   🟡 EXTENSION PARTIALLY WORKING');
        console.log('   Some components loaded but not all.');
        console.log('   Try reloading the extension and refreshing the page.');
    }
}, 2000);

console.log('\n⏳ Running tests... (will complete in 2 seconds)');