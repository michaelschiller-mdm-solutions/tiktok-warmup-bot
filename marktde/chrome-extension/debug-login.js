/*
 * Debug Login Issues - Diagnose and fix login problems
 * Run this in the browser console on markt.de to debug the extension
 */

console.log('🔍 Starting Markt.de Extension Debug...');

// Check if extension is loaded
console.log('Extension loaded:', typeof chrome !== 'undefined' && chrome.runtime);

// Check if content script is loaded
console.log('Content script loaded:', typeof window.marktDMContentScript !== 'undefined');

// Check if classes are available
console.log('Logger available:', typeof Logger !== 'undefined');
console.log('StorageManager available:', typeof StorageManager !== 'undefined');
console.log('HumanBehavior available:', typeof HumanBehavior !== 'undefined');
console.log('MarktInterface available:', typeof MarktInterface !== 'undefined');
console.log('AutomationEngine available:', typeof AutomationEngine !== 'undefined');

// Test StorageManager creation
try {
  const testStorage = new StorageManager();
  console.log('✅ StorageManager created successfully');
} catch (error) {
  console.error('❌ StorageManager creation failed:', error);
}

// Check content script status
if (window.marktDMContentScript) {
  console.log('Content script status:', window.marktDMContentScript.getDebugInfo());
} else {
  console.log('❌ Content script not initialized');
}

// Test background communication
chrome.runtime.sendMessage({ type: 'ping' }, (response) => {
  if (chrome.runtime.lastError) {
    console.error('❌ Background communication failed:', chrome.runtime.lastError);
  } else {
    console.log('✅ Background communication working:', response);
  }
});

// Check if we're on the right domain
console.log('Current domain:', window.location.hostname);
console.log('Is markt.de:', window.location.hostname.includes('markt.de'));

// Check extension context
console.log('Extension context valid:', 
  typeof chrome !== 'undefined' && 
  chrome.runtime && 
  chrome.runtime.sendMessage && 
  !chrome.runtime.lastError
);

console.log('🔍 Debug complete. Check the logs above for issues.');