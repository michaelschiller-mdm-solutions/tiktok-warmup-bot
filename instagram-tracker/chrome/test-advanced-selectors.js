// Advanced Selector Test with Browser MCP Integration
// This script tests the enhanced selector system and human behavior simulation

console.log('🧪 ADVANCED SELECTOR & BEHAVIOR TEST');
console.log('====================================');

// Test 1: Search Button Detection
console.log('\n1️⃣ Search Button Detection Test:');

async function testSearchButtonDetection() {
  try {
    // Test if our extension's Instagram interface is available
    if (!window.instagramAutomationContentScript?.automationEngine?.instagramInterface) {
      console.log('   ❌ Extension not properly loaded');
      return false;
    }
    
    const instagramInterface = window.instagramAutomationContentScript.automationEngine.instagramInterface;
    
    // Test advanced search button detection
    console.log('   Testing advanced search button detection...');
    const searchButton = await instagramInterface.findSearchButtonAdvanced();
    
    if (searchButton) {
      console.log('   ✅ Search button found:', searchButton.tagName);
      console.log('   Element details:', {
        tagName: searchButton.tagName,
        className: searchButton.className,
        id: searchButton.id,
        ariaLabel: searchButton.getAttribute('aria-label'),
        alt: searchButton.getAttribute('alt'),
        href: searchButton.getAttribute('href')
      });
      
      // Test clickable element detection
      const clickableElement = instagramInterface.getClickableElement(searchButton);
      const isClickable = instagramInterface.isElementClickable(clickableElement);
      
      console.log('   Clickable element:', clickableElement.tagName);
      console.log('   Is clickable:', isClickable ? '✅' : '❌');
      
      return true;
    } else {
      console.log('   ❌ Search button not found');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

// Test 2: Human Behavior Simulation
console.log('\n2️⃣ Human Behavior Simulation Test:');

async function testHumanBehavior() {
  try {
    if (!window.instagramAutomationContentScript?.automationEngine?.instagramInterface?.humanBehavior) {
      console.log('   ❌ Human behavior simulator not available');
      return false;
    }
    
    const humanBehavior = window.instagramAutomationContentScript.automationEngine.instagramInterface.humanBehavior;
    
    console.log('   Behavior profile:', {
      typingSkill: humanBehavior.behaviorProfile.typingSkill.toFixed(2),
      mouseAccuracy: humanBehavior.behaviorProfile.mouseAccuracy.toFixed(2),
      patience: humanBehavior.behaviorProfile.patience.toFixed(2),
      handedness: humanBehavior.behaviorProfile.handedness,
      deviceType: humanBehavior.behaviorProfile.deviceType
    });
    
    // Test mouse position tracking
    console.log('   Current mouse position:', humanBehavior.currentMousePosition);
    
    // Test timing variation
    const baseDelay = 1000;
    const variedDelay = baseDelay * (humanBehavior.antiDetection.timingJitter.min + 
      Math.random() * (humanBehavior.antiDetection.timingJitter.max - humanBehavior.antiDetection.timingJitter.min));
    
    console.log('   Timing variation: base=' + baseDelay + 'ms, varied=' + Math.round(variedDelay) + 'ms');
    
    return true;
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

// Test 3: Anti-Detection Features
console.log('\n3️⃣ Anti-Detection Features Test:');

function testAntiDetection() {
  try {
    if (!window.instagramAutomationContentScript?.automationEngine?.instagramInterface?.humanBehavior) {
      console.log('   ❌ Human behavior simulator not available');
      return false;
    }
    
    const humanBehavior = window.instagramAutomationContentScript.automationEngine.instagramInterface.humanBehavior;
    const antiDetection = humanBehavior.antiDetection;
    
    console.log('   Click variation: ±' + antiDetection.clickVariation.x + 'px');
    console.log('   Timing jitter: ' + (antiDetection.timingJitter.min * 100) + '% - ' + (antiDetection.timingJitter.max * 100) + '%');
    console.log('   Action randomization:', antiDetection.actionSequenceRandomization ? '✅' : '❌');
    console.log('   Human errors:', antiDetection.humanErrors.enabled ? '✅' : '❌');
    console.log('   Contextual behavior:', antiDetection.contextualBehavior ? '✅' : '❌');
    console.log('   Biometric simulation:', antiDetection.biometricSimulation.enabled ? '✅' : '❌');
    
    return true;
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

// Test 4: Live Search Test
console.log('\n4️⃣ Live Search Test:');

async function testLiveSearch() {
  try {
    if (!window.instagramAutomationContentScript?.automationEngine?.instagramInterface) {
      console.log('   ❌ Extension not properly loaded');
      return false;
    }
    
    const instagramInterface = window.instagramAutomationContentScript.automationEngine.instagramInterface;
    
    console.log('   Attempting to navigate to search...');
    
    // This will test the actual search navigation
    await instagramInterface.navigateToSearch();
    
    console.log('   ✅ Search navigation completed');
    
    // Wait a moment and check if search interface appeared
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const searchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
    if (searchInput) {
      console.log('   ✅ Search interface opened successfully');
      console.log('   Search input found:', searchInput.placeholder || searchInput.getAttribute('aria-label'));
      return true;
    } else {
      console.log('   ⚠️  Search navigation completed but input not found');
      return false;
    }
    
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

// Test 5: Mouse Movement Visualization
console.log('\n5️⃣ Mouse Movement Visualization:');

function testMouseVisualization() {
  try {
    // Create a visual indicator for mouse movements
    const indicator = document.createElement('div');
    indicator.id = 'mouse-indicator';
    indicator.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: red;
      border-radius: 50%;
      pointer-events: none;
      z-index: 999999;
      transition: all 0.1s ease;
    `;
    document.body.appendChild(indicator);
    
    // Track mouse movements
    let moveCount = 0;
    const originalDispatchMouseEvent = window.instagramAutomationContentScript?.automationEngine?.instagramInterface?.humanBehavior?.dispatchMouseEvent;
    
    if (originalDispatchMouseEvent) {
      window.instagramAutomationContentScript.automationEngine.instagramInterface.humanBehavior.dispatchMouseEvent = function(type, x, y) {
        if (type === 'mousemove') {
          indicator.style.left = x + 'px';
          indicator.style.top = y + 'px';
          moveCount++;
        }
        return originalDispatchMouseEvent.call(this, type, x, y);
      };
      
      console.log('   ✅ Mouse movement visualization enabled');
      console.log('   Red dot will show simulated mouse movements');
      
      // Remove indicator after 30 seconds
      setTimeout(() => {
        indicator.remove();
        console.log('   Mouse movements tracked:', moveCount);
      }, 30000);
      
      return true;
    } else {
      console.log('   ❌ Cannot enable visualization - extension not loaded');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Running all tests...\n');
  
  const results = {
    searchDetection: await testSearchButtonDetection(),
    humanBehavior: await testHumanBehavior(),
    antiDetection: testAntiDetection(),
    mouseVisualization: testMouseVisualization()
  };
  
  console.log('\n📊 TEST RESULTS:');
  console.log('================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`   ${test}: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
  });
  
  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  
  console.log(`\n🎯 OVERALL: ${passedCount}/${totalCount} tests passed`);
  
  if (passedCount === totalCount) {
    console.log('🎉 ALL TESTS PASSED! Extension is ready for advanced automation.');
  } else {
    console.log('⚠️  Some tests failed. Check the extension loading and try again.');
  }
  
  // Offer to run live search test
  if (results.searchDetection) {
    console.log('\n💡 Ready to test live search? Run: testLiveSearch()');
    window.testLiveSearch = testLiveSearch;
  }
}

// Make functions available globally for manual testing
window.testSearchButtonDetection = testSearchButtonDetection;
window.testHumanBehavior = testHumanBehavior;
window.testAntiDetection = testAntiDetection;
window.testMouseVisualization = testMouseVisualization;
window.runAllTests = runAllTests;

// Auto-run tests
runAllTests();