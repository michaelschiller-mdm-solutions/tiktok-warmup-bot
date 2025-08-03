// Test script to verify Chrome extension functionality
// Run this in the browser console on Instagram to test the extension

console.log('Testing Instagram Automation Extension...');

// Test 1: Check if content script is loaded
function testContentScriptLoaded() {
  console.log('Test 1: Checking if content script is loaded...');
  
  if (window.instagramAutomationContentScript) {
    console.log('✓ Content script is loaded');
    return true;
  } else {
    console.log('✗ Content script not found');
    return false;
  }
}

// Test 2: Check if sidebar is injected
function testSidebarInjected() {
  console.log('Test 2: Checking if sidebar is injected...');
  
  const sidebar = document.getElementById('instagram-automation-sidebar');
  if (sidebar) {
    console.log('✓ Sidebar is injected');
    return true;
  } else {
    console.log('✗ Sidebar not found');
    return false;
  }
}

// Test 3: Test message communication
async function testMessageCommunication() {
  console.log('Test 3: Testing message communication...');
  
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'PING'
    });
    
    if (response && response.success) {
      console.log('✓ Background script communication working');
      return true;
    } else {
      console.log('✗ Background script not responding');
      return false;
    }
  } catch (error) {
    console.log('✗ Message communication failed:', error.message);
    return false;
  }
}

// Test 4: Test automation engine initialization
function testAutomationEngine() {
  console.log('Test 4: Checking automation engine...');
  
  if (window.instagramAutomationContentScript && 
      window.instagramAutomationContentScript.automationEngine) {
    console.log('✓ Automation engine is initialized');
    return true;
  } else {
    console.log('✗ Automation engine not initialized');
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('=== Instagram Automation Extension Tests ===');
  
  const results = {
    contentScript: testContentScriptLoaded(),
    sidebar: testSidebarInjected(),
    communication: await testMessageCommunication(),
    automationEngine: testAutomationEngine()
  };
  
  console.log('\n=== Test Results ===');
  console.log('Content Script:', results.contentScript ? '✓ PASS' : '✗ FAIL');
  console.log('Sidebar:', results.sidebar ? '✓ PASS' : '✗ FAIL');
  console.log('Communication:', results.communication ? '✓ PASS' : '✗ FAIL');
  console.log('Automation Engine:', results.automationEngine ? '✓ PASS' : '✗ FAIL');
  
  const allPassed = Object.values(results).every(result => result);
  
  console.log('\n=== Overall Result ===');
  if (allPassed) {
    console.log('🎉 All tests passed! Extension is working correctly.');
  } else {
    console.log('❌ Some tests failed. Extension may need troubleshooting.');
    
    // Provide troubleshooting suggestions
    console.log('\n=== Troubleshooting Suggestions ===');
    
    if (!results.contentScript) {
      console.log('- Refresh the Instagram page');
      console.log('- Check if extension is enabled in chrome://extensions/');
    }
    
    if (!results.sidebar) {
      console.log('- Content script may not be fully initialized');
      console.log('- Check browser console for errors');
    }
    
    if (!results.communication) {
      console.log('- Background script may not be running');
      console.log('- Try reloading the extension');
    }
    
    if (!results.automationEngine) {
      console.log('- Automation engine failed to initialize');
      console.log('- Check for JavaScript errors in console');
    }
  }
  
  return results;
}

// Auto-run tests if this script is executed
if (typeof window !== 'undefined' && window.location.hostname.includes('instagram.com')) {
  runAllTests();
} else {
  console.log('Please run this script on an Instagram page');
}

// Export for manual testing
window.testInstagramExtension = runAllTests;