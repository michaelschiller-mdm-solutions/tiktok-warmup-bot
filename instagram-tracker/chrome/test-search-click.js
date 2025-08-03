// Test Search Click Functionality
// Copy and paste this into browser console to test search button clicking

console.log('🔍 SEARCH CLICK TEST');
console.log('===================');

async function testSearchClick() {
  console.log('\n1️⃣ Finding Search Button...');
  
  // Try multiple selectors for the search button
  const searchSelectors = [
    'a[href="#"] img[alt="Search"]',
    'link[href="#"] img[alt="Search"]', 
    'a[role="link"] img[alt="Search"]',
    'svg[aria-label="Search"]',
    'a[href="#"] svg[aria-label="Search"]',
    'a:contains("Search")',
    'link:contains("Search")'
  ];
  
  let searchButton = null;
  let usedSelector = '';
  
  for (const selector of searchSelectors) {
    try {
      if (selector.includes(':contains(')) {
        // Handle text-based selector
        const elements = Array.from(document.querySelectorAll('a, link')).filter(el => 
          el.textContent.toLowerCase().includes('search')
        );
        if (elements.length > 0) {
          searchButton = elements[0];
          usedSelector = selector;
          break;
        }
      } else {
        const element = document.querySelector(selector);
        if (element) {
          searchButton = element;
          usedSelector = selector;
          break;
        }
      }
    } catch (error) {
      console.log(`   Selector "${selector}" failed:`, error.message);
    }
  }
  
  if (!searchButton) {
    console.log('   ❌ No search button found with any selector');
    return false;
  }
  
  console.log('   ✅ Found search button with selector:', usedSelector);
  console.log('   Element details:', {
    tagName: searchButton.tagName,
    className: searchButton.className,
    href: searchButton.getAttribute('href'),
    ariaLabel: searchButton.getAttribute('aria-label'),
    textContent: searchButton.textContent?.trim()
  });
  
  // Find the clickable element
  let clickableElement = searchButton;
  if (searchButton.tagName === 'SVG' || searchButton.tagName === 'IMG') {
    clickableElement = searchButton.closest('a, button, div[role="button"], [onclick]') || searchButton.parentElement;
  }
  
  console.log('   Clickable element:', clickableElement.tagName);
  
  // Test clickability
  const style = window.getComputedStyle(clickableElement);
  const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
  const hasClickFunction = typeof clickableElement.click === 'function';
  const isDisabled = clickableElement.disabled;
  
  console.log('   Visibility check:', isVisible ? '✅' : '❌');
  console.log('   Has click function:', hasClickFunction ? '✅' : '❌');
  console.log('   Is disabled:', isDisabled ? '❌' : '✅');
  
  if (!isVisible || !hasClickFunction || isDisabled) {
    console.log('   ❌ Element is not clickable');
    return false;
  }
  
  console.log('\n2️⃣ Testing Click...');
  
  try {
    // Method 1: Direct click
    console.log('   Trying direct click...');
    clickableElement.click();
    console.log('   ✅ Direct click executed');
    
    // Wait and check if search interface appeared
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const searchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
    if (searchInput) {
      console.log('   ✅ Search interface opened!');
      console.log('   Search input:', searchInput.placeholder || searchInput.getAttribute('aria-label'));
      return true;
    } else {
      console.log('   ⚠️  Click executed but search interface not detected');
      
      // Check if URL changed or page state changed
      if (window.location.pathname.includes('explore') || window.location.hash.includes('search')) {
        console.log('   ✅ URL indicates search was activated');
        return true;
      }
    }
    
  } catch (error) {
    console.log('   ❌ Click failed:', error.message);
    
    // Method 2: Event dispatch
    console.log('   Trying event dispatch...');
    
    const rect = clickableElement.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    const events = [
      new MouseEvent('mousedown', { bubbles: true, clientX: x, clientY: y }),
      new MouseEvent('mouseup', { bubbles: true, clientX: x, clientY: y }),
      new MouseEvent('click', { bubbles: true, clientX: x, clientY: y })
    ];
    
    events.forEach(event => clickableElement.dispatchEvent(event));
    console.log('   ✅ Events dispatched');
    
    // Wait and check again
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const searchInput2 = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
    if (searchInput2) {
      console.log('   ✅ Search interface opened via event dispatch!');
      return true;
    }
  }
  
  console.log('   ❌ Search interface did not open');
  return false;
}

// Run the test
testSearchClick().then(success => {
  console.log('\n🎯 RESULT:', success ? '✅ SUCCESS' : '❌ FAILED');
  
  if (!success) {
    console.log('\n💡 TROUBLESHOOTING:');
    console.log('   1. Make sure you\'re on https://www.instagram.com');
    console.log('   2. Try manually clicking the search button to see if it works');
    console.log('   3. Check browser console for any JavaScript errors');
    console.log('   4. Instagram may have changed their interface structure');
  }
});

// Make function available for manual testing
window.testSearchClick = testSearchClick;