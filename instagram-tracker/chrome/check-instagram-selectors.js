// Instagram Selector Checker
// Copy and paste this into browser console on Instagram to check current selectors

console.log('🔍 INSTAGRAM SELECTOR CHECKER');
console.log('==============================');

// Check 1: Search button selectors
console.log('\n1️⃣ Search Button Selectors:');
const searchSelectors = [
  'a[href="#"] img[alt="Search"]',
  'a[aria-label="Search"]', 
  'svg[aria-label="Search"]',
  'a[href="#"]:has(img[alt="Search"])',
  '[data-testid="search-icon"]',
  'a[role="link"]:has(img[alt="Search"])',
  'div[role="button"]:has(img[alt="Search"])',
  // New potential selectors
  'a[href="/explore/search/"]',
  'a[href*="search"]',
  'svg[aria-label*="Search"]',
  '[aria-label*="Search"]',
  'a[role="link"] svg[aria-label="Search"]',
  'div[role="button"] svg[aria-label="Search"]'
];

let foundSearchButton = null;
searchSelectors.forEach((selector, index) => {
  try {
    const element = document.querySelector(selector);
    const found = !!element;
    console.log(`   ${index + 1}. ${selector}: ${found ? '✅' : '❌'}`);
    
    if (found && !foundSearchButton) {
      foundSearchButton = element;
      console.log(`      → FOUND: ${element.tagName} with classes: ${element.className}`);
      console.log(`      → Has click function: ${typeof element.click === 'function' ? '✅' : '❌'}`);
    }
  } catch (error) {
    console.log(`   ${index + 1}. ${selector}: ❌ (Error: ${error.message})`);
  }
});

// Check 2: Alternative search methods
console.log('\n2️⃣ Alternative Search Methods:');

// Check for navigation links
const navLinks = document.querySelectorAll('nav a, [role="navigation"] a');
console.log(`   Navigation links found: ${navLinks.length}`);

navLinks.forEach((link, index) => {
  if (link.href && (link.href.includes('search') || link.href.includes('explore'))) {
    console.log(`   ${index + 1}. ${link.href} - ${link.getAttribute('aria-label') || 'No label'}`);
  }
});

// Check for SVG icons
const svgIcons = document.querySelectorAll('svg[aria-label]');
console.log(`   SVG icons with labels: ${svgIcons.length}`);

svgIcons.forEach((svg, index) => {
  const label = svg.getAttribute('aria-label');
  if (label && label.toLowerCase().includes('search')) {
    console.log(`   ${index + 1}. SVG: "${label}" - Parent: ${svg.parentElement.tagName}`);
    console.log(`      → Parent clickable: ${typeof svg.parentElement.click === 'function' ? '✅' : '❌'}`);
  }
});

// Check 3: Current page analysis
console.log('\n3️⃣ Current Page Analysis:');
console.log(`   URL: ${window.location.href}`);
console.log(`   Page title: ${document.title}`);

// Check if we're on home page vs profile page
const isHomePage = window.location.pathname === '/';
const isProfilePage = window.location.pathname.match(/^\/[^\/]+\/?$/);
console.log(`   Home page: ${isHomePage ? '✅' : '❌'}`);
console.log(`   Profile page: ${isProfilePage ? '✅' : '❌'}`);

// Check 4: Manual search test
console.log('\n4️⃣ Manual Search Test:');
if (foundSearchButton) {
  console.log('   Found search button, testing click...');
  try {
    // Test if we can click it
    foundSearchButton.click();
    console.log('   ✅ Search button click successful');
    
    // Wait a moment then check if search opened
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
      if (searchInput) {
        console.log('   ✅ Search interface opened');
        console.log(`   Search input found: ${searchInput.placeholder || searchInput.getAttribute('aria-label')}`);
      } else {
        console.log('   ❌ Search interface did not open');
      }
    }, 1000);
    
  } catch (error) {
    console.log(`   ❌ Search button click failed: ${error.message}`);
  }
} else {
  console.log('   ❌ No working search button found');
}

// Check 5: Recommended selectors
console.log('\n5️⃣ Recommended Selectors:');
setTimeout(() => {
  // Find the most reliable selector
  const workingSelectors = [];
  
  searchSelectors.forEach(selector => {
    try {
      const element = document.querySelector(selector);
      if (element && typeof element.click === 'function') {
        workingSelectors.push(selector);
      }
    } catch (error) {
      // Ignore errors
    }
  });
  
  if (workingSelectors.length > 0) {
    console.log('   ✅ Working selectors found:');
    workingSelectors.forEach((selector, index) => {
      console.log(`   ${index + 1}. ${selector}`);
    });
    console.log(`\n   📋 RECOMMENDED: Use "${workingSelectors[0]}" as primary selector`);
  } else {
    console.log('   ❌ No working selectors found');
    console.log('   📋 SOLUTION: Instagram may have changed their interface');
    console.log('   Try refreshing the page or check if you\'re logged in');
  }
}, 2000);

console.log('\n⏳ Running analysis... (will complete in 2 seconds)');