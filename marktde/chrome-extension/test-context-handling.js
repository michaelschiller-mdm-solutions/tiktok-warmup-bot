/*
 * Context Handling Test - Tests extension context invalidation handling
 * Run this in the browser console on markt.de to test the extension
 */

console.log('🧪 Testing Markt.de Extension Context Handling...\n');

// Test 1: Check if extension context is available
console.log('1️⃣ Extension Context Check:');
if (typeof chrome !== 'undefined') {
    console.log('   Chrome API: ✅ Available');

    if (chrome.runtime) {
        console.log('   Runtime API: ✅ Available');

        if (chrome.runtime.lastError) {
            console.log('   Last Error: ⚠️', chrome.runtime.lastError.message);
        } else {
            console.log('   Last Error: ✅ None');
        }
    } else {
        console.log('   Runtime API: ❌ Not available');
    }

    if (chrome.storage && chrome.storage.local) {
        console.log('   Storage API: ✅ Available');
    } else {
        console.log('   Storage API: ❌ Not available');
    }
} else {
    console.log('   Chrome API: ❌ Not available');
}

// Test 2: Check if content script is loaded
console.log('\n2️⃣ Content Script Check:');
if (typeof window.marktDMContentScript !== 'undefined') {
    console.log('   Content Script: ✅ Loaded');

    const debugInfo = window.getMarktDMDebugInfo();
    if (debugInfo) {
        console.log('   Debug Info: ✅ Available');
        console.log('   Initialized:', debugInfo.isInitialized);
        console.log('   Ready:', debugInfo.isReady);
        console.log('   URL:', debugInfo.url);
    } else {
        console.log('   Debug Info: ❌ Not available');
    }
} else {
    console.log('   Content Script: ❌ Not loaded');
}

// Test 3: Test storage operations
console.log('\n3️⃣ Storage Operations Test:');
if (typeof StorageManager !== 'undefined') {
    console.log('   StorageManager: ✅ Available');

    const storage = new StorageManager();

    // Test context validation
    const contextValid = storage.isContextValid();
    console.log('   Context Valid:', contextValid ? '✅ Yes' : '❌ No');

    if (contextValid) {
        // Test basic storage operations
        storage.set('test_key', { test: true, timestamp: Date.now() })
            .then(success => {
                console.log('   Storage Set:', success ? '✅ Success' : '❌ Failed');

                return storage.get('test_key');
            })
            .then(value => {
                console.log('   Storage Get:', value ? '✅ Success' : '❌ Failed');

                return storage.remove('test_key');
            })
            .then(success => {
                console.log('   Storage Remove:', success ? '✅ Success' : '❌ Failed');
            })
            .catch(error => {
                console.log('   Storage Test: ❌ Error -', error.message);
            });
    }
} else {
    console.log('   StorageManager: ❌ Not available');
}

// Test 4: Test message communication
console.log('\n4️⃣ Message Communication Test:');
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    console.log('   Message API: ✅ Available');

    // Test ping message
    chrome.runtime.sendMessage({ type: 'ping', data: {} }, (response) => {
        if (chrome.runtime.lastError) {
            console.log('   Background Ping: ❌ Error -', chrome.runtime.lastError.message);
        } else if (response) {
            console.log('   Background Ping: ✅ Success -', response);
        } else {
            console.log('   Background Ping: ⚠️ No response');
        }
    });
} else {
    console.log('   Message API: ❌ Not available');
}

// Test 5: Test logger functionality
console.log('\n5️⃣ Logger Test:');
if (typeof Logger !== 'undefined') {
    console.log('   Logger Class: ✅ Available');

    const logger = new Logger('TestComponent');

    // Test context validation
    const contextValid = logger.isContextValid();
    console.log('   Logger Context:', contextValid ? '✅ Valid' : '❌ Invalid');

    // Test logging
    logger.info('Test log message from context handling test');
    console.log('   Test Log: ✅ Sent');

    // Test log stats
    const stats = logger.getLogStats();
    console.log('   Log Stats: ✅ Available -', stats.total, 'total logs');
} else {
    console.log('   Logger Class: ❌ Not available');
}

// Test 6: Extension reload simulation
console.log('\n6️⃣ Extension Reload Simulation:');
console.log('   To test context invalidation:');
console.log('   1. Go to chrome://extensions/');
console.log('   2. Click the reload button for Markt.de DM Bot');
console.log('   3. Come back to this page and run this test again');
console.log('   4. You should see graceful handling of context invalidation');

console.log('\n✅ Context Handling Test Complete!');
console.log('If you see errors about "Extension context invalidated", that\'s normal during development.');
console.log('The extension should handle these gracefully and continue working after reload.');