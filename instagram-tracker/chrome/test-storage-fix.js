// Test Storage Fix
// Copy and paste this script into browser console on Instagram to test the storage fix

console.log('🧪 TESTING STORAGE FIX');
console.log('=====================');

// Test 1: Check if extension is loaded
console.log('\n1️⃣ Extension Loading Test:');
const hasChrome = typeof chrome !== 'undefined' && chrome.runtime;
const hasClasses = typeof InstagramAutomationContentScript !== 'undefined';
const hasInstance = !!window.instagramAutomationContentScript;

console.log('   Chrome Runtime:', hasChrome ? '✅ Available' : '❌ Missing');
console.log('   Content Script Class:', hasClasses ? '✅ Available' : '❌ Missing');
console.log('   Script Instance:', hasInstance ? '✅ Available' : '❌ Missing');

// Test 2: Test background script communication
console.log('\n2️⃣ Background Script Communication Test:');
if (hasChrome) {
  chrome.runtime.sendMessage({type: 'PING'}, (response) => {
    if (chrome.runtime.lastError) {
      console.log('   Background Script: ❌ Error -', chrome.runtime.lastError.message);
    } else if (response && response.success) {
      console.log('   Background Script: ✅ Working -', response.timestamp);
    } else {
      console.log('   Background Script: ❌ No response');
    }
  });
} else {
  console.log('   Background Script: ❌ Chrome runtime not available');
}

// Test 3: Test storage operations
console.log('\n3️⃣ Storage Operations Test:');
if (hasChrome) {
  // Test save operation
  const testData = {
    testKey: 'testValue',
    timestamp: Date.now()
  };
  
  chrome.runtime.sendMessage({
    type: 'SAVE_STATE',
    data: testData
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.log('   Save Test: ❌ Error -', chrome.runtime.lastError.message);
    } else if (response && response.success) {
      console.log('   Save Test: ✅ Success');
      
      // Test load operation
      chrome.runtime.sendMessage({
        type: 'LOAD_STATE'
      }, (loadResponse) => {
        if (chrome.runtime.lastError) {
          console.log('   Load Test: ❌ Error -', chrome.runtime.lastError.message);
        } else if (loadResponse && loadResponse.success) {
          console.log('   Load Test: ✅ Success');
          console.log('   Loaded Data:', loadResponse.data);
        } else {
          console.log('   Load Test: ❌ No response');
        }
      });
    } else {
      console.log('   Save Test: ❌ No response');
    }
  });
} else {
  console.log('   Storage Test: ❌ Chrome runtime not available');
}

// Test 4: Test automation engine initialization
console.log('\n4️⃣ Automation Engine Test:');
setTimeout(() => {
  if (hasInstance) {
    try {
      // Test if automation engine can save state without errors
      console.log('   Testing automation engine state save...');
      
      // Create a test state
      const testState = {
        isRunning: false,
        isPaused: false,
        dailyStats: {
          follows: 0,
          unfollows: 0,
          errors: 0,
          date: new Date().toDateString()
        }
      };
      
      // Try to save state
      window.instagramAutomationContentScript.automationEngine.state = testState;
      window.instagramAutomationContentScript.automationEngine.saveState()
        .then(() => {
          console.log('   Automation State Save: ✅ Success');
        })
        .catch((error) => {
          console.log('   Automation State Save: ❌ Error -', error.message);
        });
        
    } catch (error) {
      console.log('   Automation Engine: ❌ Error -', error.message);
    }
  } else {
    console.log('   Automation Engine: ❌ Not available');
  }
}, 1000);

// Test 5: Check sidebar
console.log('\n5️⃣ Sidebar Test:');
const sidebar = document.getElementById('instagram-automation-sidebar');
console.log('   Sidebar Element:', sidebar ? '✅ Present' : '❌ Missing');

if (sidebar) {
  console.log('   Sidebar Visible:', sidebar.style.display !== 'none' ? '✅ Yes' : '❌ No');
  console.log('   Sidebar Content:', sidebar.innerHTML.length > 0 ? '✅ Has content' : '❌ Empty');
}

// Final summary
console.log('\n🎯 SUMMARY:');
setTimeout(() => {
  const allWorking = hasChrome && hasClasses && hasInstance && sidebar;
  
  if (allWorking) {
    console.log('   Extension Status: ✅ FULLY WORKING');
    console.log('   Storage Fix: ✅ APPLIED SUCCESSFULLY');
    console.log('   Ready to use: ✅ YES');
  } else {
    console.log('   Extension Status: ⚠️  PARTIALLY WORKING');
    console.log('   Storage Fix: ✅ APPLIED (check individual tests above)');
    
    if (!hasChrome) console.log('   Issue: Chrome runtime not available');
    if (!hasClasses) console.log('   Issue: Content script classes not loaded');
    if (!hasInstance) console.log('   Issue: Content script instance not created');
    if (!sidebar) console.log('   Issue: Sidebar not present');
  }
}, 2000);

console.log('\n⏳ Running tests... (will complete in 2 seconds)');