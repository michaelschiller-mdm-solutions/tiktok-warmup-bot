// Comprehensive Extension Loading Diagnostic
// Copy and paste this entire script into browser console on Instagram

console.log('🔍 COMPREHENSIVE EXTENSION DIAGNOSTIC');
console.log('=====================================');

// Step 1: Check basic browser environment
console.log('\n1️⃣ Browser Environment Check:');
console.log('   User Agent:', navigator.userAgent);
console.log('   URL:', window.location.href);
console.log('   Protocol:', window.location.protocol);
console.log('   Hostname:', window.location.hostname);

// Step 2: Check Chrome APIs availability
console.log('\n2️⃣ Chrome APIs Check:');
console.log('   chrome object:', typeof chrome !== 'undefined' ? '✅ Available' : '❌ Missing');

if (typeof chrome !== 'undefined') {
    console.log('   chrome.runtime:', chrome.runtime ? '✅ Available' : '❌ Missing');
    console.log('   chrome.storage:', chrome.storage ? '✅ Available' : '❌ Missing');
    console.log('   chrome.tabs:', chrome.tabs ? '✅ Available' : '❌ Missing');

    if (chrome.runtime) {
        console.log('   Extension ID:', chrome.runtime.id || 'Unknown');
        console.log('   Extension URL:', chrome.runtime.getURL('') || 'Unknown');
    }
}

// Step 3: Check for extension errors
console.log('\n3️⃣ Extension Error Check:');
if (typeof chrome !== 'undefined' && chrome.runtime) {
    if (chrome.runtime.lastError) {
        console.log('   Last Error:', chrome.runtime.lastError.message);
    } else {
        console.log('   No runtime errors detected');
    }
}

// Step 4: Check content script files loading
console.log('\n4️⃣ Content Script Files Check:');
const expectedClasses = [
    'HumanBehaviorSimulator',
    'InstagramInterface',
    'AutomationEngine',
    'InstagramAutomationContentScript'
];

expectedClasses.forEach(className => {
    const exists = typeof window[className] !== 'undefined';
    console.log(`   ${className}: ${exists ? '✅ Loaded' : '❌ Missing'}`);

    if (exists) {
        console.log(`      - Type: ${typeof window[className]}`);
        console.log(`      - Constructor: ${typeof window[className] === 'function' ? '✅ Function' : '❌ Not Function'}`);
    }
});

// Step 5: Check DOM elements
console.log('\n5️⃣ DOM Elements Check:');
const sidebar = document.getElementById('instagram-automation-sidebar');
console.log('   Sidebar Element:', sidebar ? '✅ Present' : '❌ Missing');

if (sidebar) {
    console.log('   Sidebar Display:', sidebar.style.display || 'default');
    console.log('   Sidebar Visibility:', sidebar.style.visibility || 'default');
    console.log('   Sidebar Classes:', sidebar.className || 'none');
    console.log('   Sidebar Children:', sidebar.children.length);
}

// Step 6: Check for JavaScript errors
console.log('\n6️⃣ JavaScript Errors Check:');
const originalError = window.onerror;
const errors = [];

window.onerror = function (message, source, lineno, colno, error) {
    errors.push({
        message: message,
        source: source,
        line: lineno,
        column: colno,
        error: error
    });

    if (originalError) {
        originalError.apply(this, arguments);
    }
};

// Wait a moment to catch any errors
setTimeout(() => {
    if (errors.length > 0) {
        console.log('   JavaScript Errors Found:');
        errors.forEach((err, index) => {
            console.log(`   ${index + 1}. ${err.message}`);
            console.log(`      Source: ${err.source}:${err.line}:${err.column}`);
        });
    } else {
        console.log('   No JavaScript errors detected');
    }
}, 1000);

// Step 7: Test background script communication
console.log('\n7️⃣ Background Script Communication:');
if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('   Testing PING message...');

    chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('   Background Response: ❌ Error -', chrome.runtime.lastError.message);
        } else if (response) {
            console.log('   Background Response: ✅ Success -', JSON.stringify(response));
        } else {
            console.log('   Background Response: ❌ No response');
        }
    });
} else {
    console.log('   Cannot test - Chrome runtime not available');
}

// Step 8: Manual content script initialization attempt
console.log('\n8️⃣ Manual Initialization Attempt:');
setTimeout(() => {
    if (typeof InstagramAutomationContentScript !== 'undefined') {
        if (!window.instagramAutomationContentScript) {
            console.log('   Attempting to create content script instance...');
            try {
                window.instagramAutomationContentScript = new InstagramAutomationContentScript();
                console.log('   ✅ Content script instance created');

                console.log('   Attempting to initialize...');
                window.instagramAutomationContentScript.initialize();
                console.log('   ✅ Content script initialized');

            } catch (error) {
                console.log('   ❌ Initialization failed:', error.message);
                console.log('   Error stack:', error.stack);
            }
        } else {
            console.log('   Content script instance already exists');
            console.log('   Initialized:', window.instagramAutomationContentScript.isInitialized ? '✅ Yes' : '❌ No');
        }
    } else {
        console.log('   ❌ InstagramAutomationContentScript class not available');
    }
}, 2000);

// Step 9: Extension manifest check
console.log('\n9️⃣ Extension Manifest Check:');
if (typeof chrome !== 'undefined' && chrome.runtime) {
    try {
        const manifest = chrome.runtime.getManifest();
        console.log('   Manifest Version:', manifest.manifest_version);
        console.log('   Extension Name:', manifest.name);
        console.log('   Extension Version:', manifest.version);
        console.log('   Content Scripts:', manifest.content_scripts ? manifest.content_scripts.length : 0);
        console.log('   Permissions:', manifest.permissions ? manifest.permissions.length : 0);
    } catch (error) {
        console.log('   ❌ Cannot access manifest:', error.message);
    }
}

// Step 10: Final diagnosis
console.log('\n🎯 FINAL DIAGNOSIS:');
setTimeout(() => {
    const hasChrome = typeof chrome !== 'undefined' && chrome.runtime;
    const hasClasses = expectedClasses.every(cls => typeof window[cls] !== 'undefined');
    const hasInstance = !!window.instagramAutomationContentScript;
    const hasSidebar = !!document.getElementById('instagram-automation-sidebar');

    console.log('   Chrome Runtime:', hasChrome ? '✅' : '❌');
    console.log('   Content Classes:', hasClasses ? '✅' : '❌');
    console.log('   Script Instance:', hasInstance ? '✅' : '❌');
    console.log('   Sidebar Present:', hasSidebar ? '✅' : '❌');

    if (hasChrome && hasClasses && hasInstance && hasSidebar) {
        console.log('\n🎉 EXTENSION STATUS: ✅ WORKING');
        console.log('   The extension should now be functional!');
    } else {
        console.log('\n⚠️  EXTENSION STATUS: ❌ NEEDS FIXING');

        if (!hasChrome) {
            console.log('\n🔧 CHROME RUNTIME ISSUE:');
            console.log('   - Extension may not be loaded properly');
            console.log('   - Check chrome://extensions/ for errors');
            console.log('   - Try reloading the extension');
            console.log('   - Ensure you\'re on https://www.instagram.com');
        }

        if (!hasClasses) {
            console.log('\n🔧 CONTENT SCRIPT LOADING ISSUE:');
            console.log('   - Content script files are not loading');
            console.log('   - Check for JavaScript errors in console');
            console.log('   - Verify all files exist in chrome/content/ folder');
            console.log('   - Check manifest.json content_scripts configuration');
        }

        if (!hasInstance) {
            console.log('\n🔧 INITIALIZATION ISSUE:');
            console.log('   - Content script class exists but instance not created');
            console.log('   - Check for initialization errors');
            console.log('   - Try manual initialization (attempted above)');
        }
    }

}, 3000);

console.log('\n⏳ Running comprehensive diagnostic... (will complete in 3 seconds)');