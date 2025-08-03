// Extension Reload Helper
// Run this script to help reload and test the extension

console.log('🔄 Instagram Automation Extension Reload Helper');

// Function to check extension status
function checkExtensionStatus() {
  console.log('\n📊 Extension Status Check:');
  
  // Check if we're on Instagram
  const isInstagram = window.location.hostname.includes('instagram.com');
  console.log('   - On Instagram:', isInstagram ? '✅' : '❌');
  
  // Check if Chrome runtime is available
  const hasRuntime = typeof chrome !== 'undefined' && chrome.runtime;
  console.log('   - Chrome Runtime:', hasRuntime ? '✅' : '❌');
  
  if (hasRuntime) {
    console.log('   - Extension ID:', chrome.runtime.id || 'Not available');
  }
  
  // Check content script classes
  console.log('   - HumanBehaviorSimulator:', typeof HumanBehaviorSimulator !== 'undefined' ? '✅' : '❌');
  console.log('   - InstagramInterface:', typeof InstagramInterface !== 'undefined' ? '✅' : '❌');
  console.log('   - AutomationEngine:', typeof AutomationEngine !== 'undefined' ? '✅' : '❌');
  console.log('   - ContentScript:', typeof InstagramAutomationContentScript !== 'undefined' ? '✅' : '❌');
  
  // Check if content script instance exists
  console.log('   - Content Script Instance:', window.instagramAutomationContentScript ? '✅' : '❌');
  
  // Check sidebar
  const sidebar = document.getElementById('instagram-automation-sidebar');
  console.log('   - Sidebar Present:', sidebar ? '✅' : '❌');
  
  return {
    isInstagram,
    hasRuntime,
    hasClasses: typeof InstagramAutomationContentScript !== 'undefined',
    hasInstance: !!window.instagramAutomationContentScript,
    hasSidebar: !!sidebar
  };
}

// Function to manually initialize extension
function manualInitialize() {
  console.log('\n🚀 Attempting Manual Initialization...');
  
  try {
    // Check if classes are available
    if (typeof InstagramAutomationContentScript === 'undefined') {
      console.log('❌ InstagramAutomationContentScript class not available');
      console.log('💡 Try reloading the extension in chrome://extensions/');
      return false;
    }
    
    // Initialize content script
    if (!window.instagramAutomationContentScript) {
      window.instagramAutomationContentScript = new InstagramAutomationContentScript();
      console.log('✅ Content script instance created');
    }
    
    // Initialize if not already done
    if (!window.instagramAutomationContentScript.isInitialized) {
      window.instagramAutomationContentScript.initialize();
      console.log('✅ Content script initialized');
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Manual initialization failed:', error.message);
    return false;
  }
}

// Function to test search functionality
async function testSearchButton() {
  console.log('\n🔍 Testing Search Button Detection...');
  
  const searchSelectors = [
    'a[href="#"] img[alt="Search"]',
    'a[aria-label="Search"]',
    'svg[aria-label="Search"]',
    'a[href="#"]:has(img[alt="Search"])',
    '[data-testid="search-icon"]'
  ];
  
  let found = false;
  for (const selector of searchSelectors) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        console.log(`✅ Found search element: ${selector}`);
        console.log('   - Element:', element);
        console.log('   - Visible:', element.offsetParent !== null);
        found = true;
        break;
      }
    } catch (e) {
      console.log(`❌ Selector failed: ${selector} (${e.message})`);
    }
  }
  
  if (!found) {
    console.log('❌ No search button found with any selector');
    console.log('💡 Instagram may have updated their interface');
  }
  
  return found;
}

// Function to provide troubleshooting steps
function showTroubleshootingSteps() {
  console.log('\n🛠️  Troubleshooting Steps:');
  console.log('');
  console.log('1. 📋 Check Extension Loading:');
  console.log('   - Go to chrome://extensions/');
  console.log('   - Find "Instagram Follow/Unfollow Automation"');
  console.log('   - Ensure it\'s enabled (toggle should be blue)');
  console.log('   - Click "Reload" if you see any errors');
  console.log('');
  console.log('2. 🔄 Refresh Instagram:');
  console.log('   - Press Ctrl+F5 to hard refresh this page');
  console.log('   - Wait 5-10 seconds for extension to load');
  console.log('   - Look for sidebar on the right side');
  console.log('');
  console.log('3. 🧪 Test Extension:');
  console.log('   - Run: checkExtensionStatus()');
  console.log('   - Run: manualInitialize()');
  console.log('   - Run: testSearchButton()');
  console.log('');
  console.log('4. 🔍 Check Console Errors:');
  console.log('   - Look for red error messages in this console');
  console.log('   - Check for "Failed to load" or "Uncaught" errors');
  console.log('');
  console.log('5. 📁 Verify Files:');
  console.log('   - Ensure all files exist in the chrome folder');
  console.log('   - Check that icons folder has PNG files');
  console.log('   - Verify manifest.json is valid');
}

// Auto-run status check
const status = checkExtensionStatus();

if (!status.hasRuntime) {
  console.log('\n⚠️  Extension not loaded or not available');
  showTroubleshootingSteps();
} else if (!status.hasInstance) {
  console.log('\n⚠️  Content script not initialized');
  console.log('🔄 Attempting manual initialization...');
  manualInitialize();
} else {
  console.log('\n✅ Extension appears to be working');
  console.log('🧪 Testing search functionality...');
  testSearchButton();
}

// Export functions for manual use
window.extensionReloadHelper = {
  checkExtensionStatus,
  manualInitialize,
  testSearchButton,
  showTroubleshootingSteps
};

console.log('\n💡 Available functions:');
console.log('   - extensionReloadHelper.checkExtensionStatus()');
console.log('   - extensionReloadHelper.manualInitialize()');
console.log('   - extensionReloadHelper.testSearchButton()');
console.log('   - extensionReloadHelper.showTroubleshootingSteps()');