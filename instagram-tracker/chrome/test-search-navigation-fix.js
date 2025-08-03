// Test Search Navigation Fix
// Run this in Instagram console to test the updated search navigation

async function testSearchNavigationFix() {
    console.log('\n🔍 SEARCH NAVIGATION FIX TEST');
    console.log('==============================');
    
    try {
        // Step 1: Check current state
        console.log('\n1️⃣ Current State Analysis...');
        console.log('   URL:', window.location.href);
        
        const existingSearchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
        console.log('   Search input already visible:', !!existingSearchInput);
        
        if (existingSearchInput) {
            console.log('   ✅ Search interface already open, no navigation needed');
            return { success: true, alreadyOpen: true };
        }
        
        // Step 2: Find search button
        console.log('\n2️⃣ Finding Search Button...');
        
        const searchSvg = document.querySelector('svg[aria-label="Search"]');
        let searchButton = null;
        
        if (searchSvg) {
            searchButton = searchSvg.closest('a') || searchSvg.closest('[role="link"]') || searchSvg.closest('div[role="button"]');
            console.log('   ✅ Found search SVG and parent element:', searchButton?.tagName);
        }
        
        if (!searchButton) {
            console.log('   ⚠️  SVG method failed, trying fallback selectors...');
            const fallbackSelectors = [
                'a[href="/explore/search/"]',
                'a[href="#"]',
                '[aria-label="Search"]'
            ];
            
            for (const selector of fallbackSelectors) {
                searchButton = document.querySelector(selector);
                if (searchButton) {
                    console.log(`   ✅ Found with fallback: ${selector}`);
                    break;
                }
            }
        }
        
        if (!searchButton) {
            throw new Error('Search button not found with any method');
        }
        
        // Step 3: Analyze button properties
        console.log('\n3️⃣ Button Analysis...');
        console.log('   Tag:', searchButton.tagName);
        console.log('   Href:', searchButton.getAttribute('href'));
        console.log('   Role:', searchButton.getAttribute('role'));
        console.log('   Text:', searchButton.textContent?.trim());
        console.log('   Has click function:', typeof searchButton.click === 'function');
        
        // Check visibility
        const rect = searchButton.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        console.log('   Visible:', isVisible);
        console.log('   Size:', `${rect.width}x${rect.height}`);
        
        // Step 4: Test click
        console.log('\n4️⃣ Testing Click...');
        console.log('   Pre-click URL:', window.location.href);
        
        // Simulate the click
        searchButton.click();
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Step 5: Check results
        console.log('\n5️⃣ Results Analysis...');
        console.log('   Post-click URL:', window.location.href);
        
        const searchInputAfter = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
        console.log('   Search input appeared:', !!searchInputAfter);
        
        if (searchInputAfter) {
            console.log('   Input placeholder:', searchInputAfter.placeholder);
            console.log('   Input aria-label:', searchInputAfter.getAttribute('aria-label'));
            console.log('   Input visible:', searchInputAfter.offsetParent !== null);
        }
        
        // Step 6: Summary
        console.log('\n6️⃣ Test Summary...');
        
        const success = !!searchInputAfter;
        if (success) {
            console.log('   ✅ Search navigation fix is working correctly');
            console.log('   ✅ Search input appeared after click');
            console.log('   ✅ Ready for username search');
        } else {
            console.log('   ❌ Search navigation fix needs more work');
            console.log('   ❌ Search input did not appear');
        }
        
        return {
            success,
            searchButtonFound: !!searchButton,
            searchInputAppeared: !!searchInputAfter,
            urlChanged: window.location.href !== 'https://www.instagram.com/',
            buttonTag: searchButton?.tagName,
            buttonHref: searchButton?.getAttribute('href')
        };
        
    } catch (error) {
        console.error('\n❌ TEST FAILED');
        console.error('Error:', error.message);
        return { success: false, error: error.message };
    }
}

// Auto-run the test
console.log('🔄 Starting Search Navigation Fix Test...');
testSearchNavigationFix().then(result => {
    console.log('\n📊 FINAL RESULT:', result);
});