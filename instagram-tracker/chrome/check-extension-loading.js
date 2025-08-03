// Extension Loading Checker
// Copy and paste this script into browser console to check extension loading

console.log('🔍 EXTENSION LOADING CHECKER');
console.log('============================');

// Check 1: Basic environment
console.log('\n1️⃣ Environment Check:');
console.log('   URL:', window.location.href);
console.log('   Domain:', window.location.hostname);
console.log('   Protocol:', window.location.protocol);

// Check 2: Chrome extension context
console.log('\n2️⃣ Chrome Extension Context:');
console.log('   chrome object:', typeof chrome);
console.log('   chrome.runtime:', typeof chrome?.runtime);
console.log('   chrome.storage:', typeof chrome?.storage);

if (typeof chrome !== 'undefined' && chrome.runtime) {
  console.log('   Extension ID:', chrome.runtime.id);
  console.log('   Extension URL:', chrome.runtime.getURL(''));
  
  // Try to get manifest
  try {
    const manifest = chrome.runtime.getManifest();
    console.log('   Manifest available:', !!manifest);
    if (manifest) {
      console.log('   Extension name:', manifest.name);
      console.log('   Version:', manifest.version);
      console.log('   Manifest version:', manifest.manifest_version);
    }
  } catch (error) {
    console.log('   Manifest error:', error.message);
  }
} else {
  console.log('   ❌ Chrome runtime not available');
}

// Check 3: Content script injection
console.log('\n3️⃣ Content Script Injection:');

// Check for script tags
const scripts = Array.from(document.querySelectorAll('script')).filter(script => 
  script.src && script.src.includes('chrome-extension')
);
console.log('   Extension scripts found:', scripts.length);
scripts.forEach((script, index) => {
  console.log(`   Script ${index + 1}:`, script.src);
});

// Check for expected classes
const expectedClasses = [
  'HumanBehaviorSimulator',
  'InstagramInterface',
  'AutomationEngine',
  'InstagramAutomationContentScript'
];

console.log('   Expected classes:');
expectedClasses.forEach(className => {
  const exists = typeof window[className] !== 'undefined';
  console.log(`   - ${className}: ${exists ? '✅' : '❌'}`);
});

// Check 4: Extension errors
console.log('\n4️⃣ Extension Errors:');
if (typeof chrome !== 'undefined' && chrome.runtime) {
  if (chrome.runtime.lastError) {
    console.log('   Last error:', chrome.runtime.lastError.message);
  } else {
    console.log('   No runtime errors');
  }
} else {
  console.log('   Cannot check - runtime not available');
}

// Check 5: Manual script loading test
console.log('\n5️⃣ Manual Script Loading Test:');
console.log('   Attempting to manually load content scripts...');

// Function to load script
function loadScript(src, name) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      console.log(`   ✅ ${name} loaded successfully`);
      resolve();
    };
    script.onerror = () => {
      console.log(`   ❌ ${name} failed to load`);
      reject(new Error(`Failed to load ${name}`));
    };
    document.head.appendChild(script);
  });
}

// Try to load scripts manually (this will fail if extension isn't loaded)
if (typeof chrome !== 'undefined' && chrome.runtime) {
  const extensionUrl = chrome.runtime.getURL('');
  const scriptsToLoad = [
    { src: extensionUrl + 'content/human-behavior.js', name: 'HumanBehavior' },
    { src: extensionUrl + 'content/instagram-interface.js', name: 'InstagramInterface' },
    { src: extensionUrl + 'content/automation-engine.js', name: 'AutomationEngine' },
    { src: extensionUrl + 'content/content-script.js', name: 'ContentScript' }
  ];
  
  console.log('   Extension URL:', extensionUrl);
  
  // Try loading first script as test
  loadScript(scriptsToLoad[0].src, scriptsToLoad[0].name)
    .then(() => {
      console.log('   ✅ Manual script loading works');
    })
    .catch(() => {
      console.log('   ❌ Manual script loading failed');
      console.log('   This suggests the extension is not properly loaded');
    });
} else {
  console.log('   ❌ Cannot test - Chrome runtime not available');
}

// Check 6: Extension installation status
console.log('\n6️⃣ Extension Installation Status:');
console.log('   Please check chrome://extensions/ for:');
console.log('   1. Extension is present and enabled');
console.log('   2. No error messages shown');
console.log('   3. Developer mode is enabled');
console.log('   4. Extension has proper permissions');

// Check 7: Page compatibility
console.log('\n7️⃣ Page Compatibility:');
const isInstagram = window.location.hostname.includes('instagram.com');
const isHTTPS = window.location.protocol === 'https:';
console.log('   Instagram domain:', isInstagram ? '✅' : '❌');
console.log('   HTTPS protocol:', isHTTPS ? '✅' : '❌');

if (!isInstagram) {
  console.log('   ⚠️  Not on Instagram - extension only works on Instagram');
}
if (!isHTTPS) {
  console.log('   ⚠️  Not HTTPS - extension requires secure connection');
}

// Final diagnosis
console.log('\n🎯 DIAGNOSIS:');
setTimeout(() => {
  const hasRuntime = typeof chrome !== 'undefined' && chrome.runtime;
  const hasClasses = expectedClasses.some(cls => typeof window[cls] !== 'undefined');
  
  if (!hasRuntime) {
    console.log('   🔴 CRITICAL: Chrome runtime not available');
    console.log('   📋 SOLUTION:');
    console.log('   1. Go to chrome://extensions/');
    console.log('   2. Find "Instagram Follow/Unfollow Automation"');
    console.log('   3. Make sure it\'s ENABLED');
    console.log('   4. Click RELOAD button');
    console.log('   5. Hard refresh this page (Ctrl+F5)');
  } else if (!hasClasses) {
    console.log('   🟡 WARNING: Extension loaded but content scripts not injected');
    console.log('   📋 SOLUTION:');
    console.log('   1. Check chrome://extensions/ for errors');
    console.log('   2. Reload the extension');
    console.log('   3. Check manifest.json content_scripts configuration');
  } else {
    console.log('   🟢 SUCCESS: Extension appears to be working');
  }
}, 1000);

console.log('\n⏳ Running diagnosis... (will complete in 1 second)');