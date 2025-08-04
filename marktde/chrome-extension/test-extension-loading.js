/*
 * Extension Loading Test - Test if the extension loads without duplicate class errors
 * Run this in the browser console on markt.de to test extension loading
 */

function testExtensionLoading() {
  console.log('🧪 Testing Extension Loading...');
  
  // Check if we're on markt.de
  if (!window.location.hostname.includes('markt.de')) {
    console.error('❌ Not on markt.de domain');
    return;
  }
  
  console.log('✅ On markt.de domain');
  
  // Check if classes are available
  const classes = [
    'Logger',
    'StorageManager', 
    'CSVParser',
    'ErrorHandler',
    'HumanBehavior',
    'MarktInterface',
    'AutomationEngine',
    'MarktDMContentScript'
  ];
  
  console.log('🔍 Checking class availability...');
  
  let allClassesLoaded = true;
  
  for (const className of classes) {
    if (typeof window[className] !== 'undefined') {
      console.log(`✅ ${className} - Available`);
    } else {
      console.log(`❌ ${className} - Not available`);
      allClassesLoaded = false;
    }
  }
  
  // Check if content script is initialized
  if (window.marktDMContentScript) {
    console.log('✅ Content script initialized');
    
    // Get debug info
    try {
      const debugInfo = window.getMarktDMDebugInfo();
      if (debugInfo) {
        console.log('✅ Debug info available');
        console.log('   - Initialized:', debugInfo.isInitialized);
        console.log('   - Ready:', debugInfo.isReady);
        console.log('   - URL:', debugInfo.url);
      }
    } catch (error) {
      console.log('⚠️ Debug info error:', error.message);
    }
  } else {
    console.log('❌ Content script not initialized');
    allClassesLoaded = false;
  }
  
  // Check for JavaScript errors
  const errors = [];
  const originalError = console.error;
  console.error = function(...args) {
    errors.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  // Wait a moment to catch any delayed errors
  setTimeout(() => {
    console.error = originalError;
    
    if (errors.length > 0) {
      console.log('⚠️ JavaScript errors detected:');
      errors.forEach(error => console.log(`   - ${error}`));
    } else {
      console.log('✅ No JavaScript errors detected');
    }
    
    // Final result
    if (allClassesLoaded && errors.length === 0) {
      console.log('🎉 Extension loaded successfully!');
      console.log('✅ All classes available');
      console.log('✅ No duplicate class errors');
      console.log('✅ Content script initialized');
    } else {
      console.log('❌ Extension loading issues detected');
      if (!allClassesLoaded) {
        console.log('   - Some classes not available');
      }
      if (errors.length > 0) {
        console.log('   - JavaScript errors present');
      }
    }
  }, 2000);
  
  return allClassesLoaded;
}

// Auto-run test
testExtensionLoading();

// Make available globally
window.testExtensionLoading = testExtensionLoading;

console.log('🧪 Extension loading test completed. Check results above.');