// Test script to verify the manifest fix works
// Copy and paste this into browser console on Instagram

console.log('🔧 Testing Manifest Fix');
console.log('======================');

// Wait a moment for extension to load
setTimeout(() => {
  console.log('\n📊 Extension Status After Manifest Fix:');
  
  // Test Chrome runtime
  const hasRuntime = typeof chrome !== 'undefined' && chrome.runtime;
  console.log('Chrome Runtime:', hasRuntime ? '✅ Available' : '❌ Still Missing');
  
  if (hasRuntime) {
    console.log('Extension ID:', chrome.runtime.id);
    
    // Test background communication
    chrome.runtime.sendMessage({type: 'PING'}, (response) => {
      if (chrome.runtime.lastError) {
        console.log('Background Script: ❌ Error -', chrome.runtime.lastError.message);
      } else if (response && response.success) {
        console.log('Background Script: ✅ Working');
      } else {
        console.log('Background Script: ❌ No response');
      }
    });
  }
  
  // Test content script classes
  console.log('\nContent Script Classes:');
  const classes = {
    'HumanBehaviorSimulator': typeof HumanBehaviorSimulator !== 'undefined',
    'InstagramInterface': typeof InstagramInterface !== 'undefined',
    'AutomationEngine': typeof AutomationEngine !== 'undefined',
    'ContentScript': typeof InstagramAutomationContentScript !== 'undefined'
  };
  
  Object.entries(classes).forEach(([name, loaded]) => {
    console.log(`   ${name}: ${loaded ? '✅ Loaded' : '❌ Missing'}`);
  });
  
  // Test content script instance
  const hasInstance = !!window.instagramAutomationContentScript;
  console.log('\nContent Script Instance:', hasInstance ? '✅ Created' : '❌ Missing');
  
  if (hasInstance) {
    console.log('   Initialized:', window.instagramAutomationContentScript.isInitialized ? '✅ Yes' : '❌ No');
    console.log('   Automation Engine:', !!window.instagramAutomationContentScript.automationEngine ? '✅ Yes' : '❌ No');
  }
  
  // Test sidebar
  const sidebar = document.getElementById('instagram-automation-sidebar');
  console.log('\nSidebar:', sidebar ? '✅ Present' : '❌ Missing');
  
  // Overall status
  const allClassesLoaded = Object.values(classes).every(Boolean);
  const isWorking = hasRuntime && allClassesLoaded && hasInstance && sidebar;
  
  console.log('\n🎯 Overall Status:', isWorking ? '✅ WORKING' : '❌ NEEDS MORE FIXES');
  
  if (isWorking) {
    console.log('\n🎉 Extension is now working!');
    console.log('✅ You can now test follow/unfollow functionality');
    console.log('✅ Look for the sidebar on the right side of Instagram');
    console.log('✅ Enter a username and click "Test Follow" or "Test Unfollow"');
  } else {
    console.log('\n🔧 Still needs fixes:');
    if (!hasRuntime) console.log('   - Chrome runtime still not available');
    if (!allClassesLoaded) console.log('   - Content script classes not loading');
    if (!hasInstance) console.log('   - Content script instance not created');
    if (!sidebar) console.log('   - Sidebar not appearing');
    
    console.log('\n💡 Next steps:');
    console.log('   1. Go to chrome://extensions/');
    console.log('   2. Find "Instagram Follow/Unfollow Automation"');
    console.log('   3. Click "Reload" button');
    console.log('   4. Refresh this Instagram page');
    console.log('   5. Wait 10 seconds and run this test again');
  }
  
}, 2000); // Wait 2 seconds for extension to load

console.log('⏳ Waiting 2 seconds for extension to load...');