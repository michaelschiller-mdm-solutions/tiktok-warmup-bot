// Debug script for Instagram Automation Extension
// Run this in the browser console on Instagram to test extension functionality

console.log('=== Instagram Automation Extension Debug ===');

// Test 1: Check if content script is loaded
function testContentScriptLoaded() {
  console.log('\n1. Testing content script loading...');
  
  if (window.instagramAutomationContentScript) {
    console.log('✅ Content script is loaded');
    console.log('   - Initialized:', window.instagramAutomationContentScript.isInitialized);
    console.log('   - Automation Engine:', !!window.instagramAutomationContentScript.automationEngine);
    return true;
  } else {
    console.log('❌ Content script not found');
    console.log('   - Checking for required classes...');
    console.log('   - HumanBehaviorSimulator:', typeof HumanBehaviorSimulator !== 'undefined' ? '✅' : '❌');
    console.log('   - InstagramInterface:', typeof InstagramInterface !== 'undefined' ? '✅' : '❌');
    console.log('   - AutomationEngine:', typeof AutomationEngine !== 'undefined' ? '✅' : '❌');
    console.log('   - InstagramAutomationContentScript:', typeof InstagramAutomationContentScript !== 'undefined' ? '✅' : '❌');
    
    // Try to manually initialize if classes are available
    if (typeof InstagramAutomationContentScript !== 'undefined') {
      console.log('   - Attempting manual initialization...');
      try {
        window.instagramAutomationContentScript = new InstagramAutomationContentScript();
        window.instagramAutomationContentScript.initialize();
        console.log('   - ✅ Manual initialization successful');
        return true;
      } catch (error) {
        console.log('   - ❌ Manual initialization failed:', error.message);
      }
    }
    
    return false;
  }
}

// Test 2: Check if sidebar is present
function testSidebarPresent() {
  console.log('\n2. Testing sidebar presence...');
  
  const sidebar = document.getElementById('instagram-automation-sidebar');
  if (sidebar) {
    console.log('✅ Sidebar is present');
    console.log('   - Visible:', sidebar.style.display !== 'none');
    return true;
  } else {
    console.log('❌ Sidebar not found');
    return false;
  }
}

// Test 3: Test message communication
async function testMessageCommunication() {
  console.log('\n3. Testing message communication...');
  
  try {
    // Check if chrome runtime is available
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      console.log('❌ Chrome runtime not available - extension may not be loaded');
      return false;
    }
    
    // Test PING message
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'PING' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });
    
    if (response && response.success) {
      console.log('✅ Message communication working');
      return true;
    } else {
      console.log('❌ Message communication failed - no response');
      return false;
    }
  } catch (error) {
    console.log('❌ Message communication failed:', error.message);
    return false;
  }
}

// Test 4: Test search functionality
async function testSearchFunctionality() {
  console.log('\n4. Testing search functionality...');
  
  if (!window.instagramAutomationContentScript || !window.instagramAutomationContentScript.automationEngine) {
    console.log('❌ Cannot test - automation engine not available');
    return false;
  }
  
  try {
    const instagramInterface = window.instagramAutomationContentScript.automationEngine.instagramInterface;
    
    // Test search button selectors
    console.log('   Testing search button selectors...');
    const searchSelectors = [
      'a[href="#"]:has(img[alt="Search"])',
      'a[href="#"] img[alt="Search"]',
      'a[aria-label="Search"]',
      'svg[aria-label="Search"]'
    ];
    
    let searchButtonFound = false;
    for (const selector of searchSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`   ✅ Found search element with: ${selector}`);
          searchButtonFound = true;
          break;
        }
      } catch (e) {
        // Selector might not be supported
      }
    }
    
    if (!searchButtonFound) {
      console.log('   ❌ No search button found with any selector');
    }
    
    // Test search input selectors
    console.log('   Testing search input selectors...');
    const inputSelectors = [
      'textbox[placeholder="Search input"]',
      'input[placeholder="Search input"]',
      'input[aria-label*="Search"]'
    ];
    
    let searchInputFound = false;
    for (const selector of inputSelectors) {
      try {
        const element = document.querySelector(selector);
        if (element) {
          console.log(`   ✅ Found search input with: ${selector}`);
          searchInputFound = true;
          break;
        }
      } catch (e) {
        // Selector might not be supported
      }
    }
    
    if (!searchInputFound) {
      console.log('   ❌ No search input found with any selector');
    }
    
    return searchButtonFound || searchInputFound;
    
  } catch (error) {
    console.log('❌ Search functionality test failed:', error.message);
    return false;
  }
}

// Test 5: Test direct profile navigation
async function testDirectProfileNavigation(username = 'instagram') {
  console.log(`\n5. Testing direct profile navigation to: ${username}...`);
  
  try {
    const profileUrl = `https://www.instagram.com/${username}/`;
    console.log(`   Navigating to: ${profileUrl}`);
    
    // Save current URL
    const originalUrl = window.location.href;
    
    // Navigate to profile
    window.location.href = profileUrl;
    
    // Wait a bit for navigation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if we're on the profile page
    if (window.location.pathname.includes(`/${username}/`)) {
      console.log('✅ Direct profile navigation successful');
      return true;
    } else {
      console.log('❌ Direct profile navigation failed');
      return false;
    }
    
  } catch (error) {
    console.log('❌ Direct profile navigation test failed:', error.message);
    return false;
  }
}

// Test 6: Check extension permissions
function testExtensionPermissions() {
  console.log('\n6. Testing extension permissions...');
  
  try {
    // Check if chrome.runtime is available
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      console.log('✅ Chrome runtime available');
      
      // Check if we can access extension ID
      if (chrome.runtime.id) {
        console.log('✅ Extension ID accessible:', chrome.runtime.id);
      } else {
        console.log('❌ Extension ID not accessible');
      }
      
      return true;
    } else {
      console.log('❌ Chrome runtime not available');
      return false;
    }
  } catch (error) {
    console.log('❌ Extension permissions test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Instagram Automation Extension Debug Tests...\n');
  
  const results = {
    contentScript: testContentScriptLoaded(),
    sidebar: testSidebarPresent(),
    permissions: testExtensionPermissions(),
    messaging: await testMessageCommunication(),
    search: await testSearchFunctionality()
  };
  
  console.log('\n=== Test Results Summary ===');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
  });
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📊 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Extension should be working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the issues above.');
  }
  
  return results;
}

// Auto-run tests
runAllTests();

// Export functions for manual testing
window.debugInstagramExtension = {
  runAllTests,
  testContentScriptLoaded,
  testSidebarPresent,
  testMessageCommunication,
  testSearchFunctionality,
  testDirectProfileNavigation,
  testExtensionPermissions
};

console.log('\n💡 You can run individual tests using:');
console.log('   window.debugInstagramExtension.testContentScriptLoaded()');
console.log('   window.debugInstagramExtension.testSearchFunctionality()');
console.log('   etc.');