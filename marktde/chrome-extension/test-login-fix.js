/*
 * Test Login Fix - Verify that the class loading issues are resolved
 * Run this in the browser console on markt.de to test the fixes
 */

console.log('🔧 Testing Login Fix...');

// Test class availability
const classTests = [
  { name: 'Logger', class: window.Logger },
  { name: 'StorageManager', class: window.StorageManager },
  { name: 'CSVParser', class: window.CSVParser },
  { name: 'ErrorHandler', class: window.ErrorHandler },
  { name: 'HumanBehavior', class: window.HumanBehavior },
  { name: 'MarktInterface', class: window.MarktInterface },
  { name: 'AutomationEngine', class: window.AutomationEngine }
];

let allClassesAvailable = true;

classTests.forEach(test => {
  if (typeof test.class === 'function') {
    console.log(`✅ ${test.name} class is available`);
  } else {
    console.error(`❌ ${test.name} class is NOT available`);
    allClassesAvailable = false;
  }
});

if (allClassesAvailable) {
  console.log('✅ All classes are available');
  
  // Test StorageManager creation
  try {
    const testStorage = new StorageManager();
    console.log('✅ StorageManager created successfully');
    
    // Test Logger creation
    const testLogger = new Logger('Test');
    console.log('✅ Logger created successfully');
    
    // Test HumanBehavior creation
    const testBehavior = new HumanBehavior();
    console.log('✅ HumanBehavior created successfully');
    
    // Test MarktInterface creation
    const testInterface = new MarktInterface(testBehavior, testLogger);
    console.log('✅ MarktInterface created successfully');
    
    // Test AutomationEngine creation
    const testEngine = new AutomationEngine(testInterface, testBehavior, testStorage, testLogger);
    console.log('✅ AutomationEngine created successfully');
    
    console.log('🎉 All class instantiation tests passed!');
    
  } catch (error) {
    console.error('❌ Class instantiation failed:', error);
  }
} else {
  console.error('❌ Some classes are missing, cannot proceed with instantiation tests');
}

// Test content script initialization
if (window.marktDMContentScript) {
  console.log('✅ Content script is initialized');
  console.log('Content script status:', window.marktDMContentScript.getDebugInfo());
} else {
  console.log('⚠️ Content script not yet initialized, this is normal if the page just loaded');
}

// Test background communication
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Background communication failed:', chrome.runtime.lastError);
    } else {
      console.log('✅ Background communication working:', response);
    }
  });
} else {
  console.error('❌ Chrome extension context not available');
}

console.log('🔧 Login fix test completed!');