// Debug Search Navigation Flow
// This script traces exactly what happens when we click the search button

console.log('🔍 SEARCH NAVIGATION DEBUG');
console.log('==========================');

async function debugSearchNavigation() {
    console.log('\n📍 Starting URL:', window.location.href);

    // Step 1: Find the search button
    console.log('\n1️⃣ Finding Search Button...');
    const searchSelector = 'a[href="#"] svg[aria-label="Search"]';
    const searchSvg = document.querySelector(searchSelector);

    if (!searchSvg) {
        console.log('❌ Search SVG not found');
        return false;
    }

    console.log('✅ Found search SVG');

    // Find the parent link
    const parentLink = searchSvg.closest('a');
    if (!parentLink) {
        console.log('❌ Parent link not found');
        return false;
    }

    console.log('✅ Found parent link:', parentLink.href, parentLink.getAttribute('href'));

    // Step 2: Check current state before click
    console.log('\n2️⃣ Pre-Click State...');
    const preClickUrl = window.location.href;
    const preClickSearchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');

    console.log('   URL before click:', preClickUrl);
    console.log('   Search input before click:', preClickSearchInput ? 'Present' : 'Not present');

    // Step 3: Click and monitor changes
    console.log('\n3️⃣ Clicking Search Button...');

    // Set up observers to monitor changes
    let urlChanged = false;
    let searchInputAppeared = false;
    let domChanged = false;

    // Monitor URL changes
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function (...args) {
        console.log('📍 URL changed via pushState:', args[2]);
        urlChanged = true;
        return originalPushState.apply(this, args);
    };

    history.replaceState = function (...args) {
        console.log('📍 URL changed via replaceState:', args[2]);
        urlChanged = true;
        return originalReplaceState.apply(this, args);
    };

    // Monitor DOM changes
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                // Check if search input was added
                const newSearchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
                if (newSearchInput && !preClickSearchInput) {
                    console.log('🎯 Search input appeared in DOM!');
                    searchInputAppeared = true;
                }
                domChanged = true;
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // Perform the click
    try {
        parentLink.click();
        console.log('✅ Click executed');
    } catch (error) {
        console.log('❌ Click failed:', error.message);
        return false;
    }

    // Wait and monitor changes
    console.log('\n4️⃣ Monitoring Changes...');

    for (let i = 0; i < 50; i++) { // Monitor for 5 seconds
        await new Promise(resolve => setTimeout(resolve, 100));

        const currentUrl = window.location.href;
        const currentSearchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');

        if (currentUrl !== preClickUrl) {
            console.log(`📍 URL changed after ${i * 100}ms:`, currentUrl);
            urlChanged = true;
        }

        if (currentSearchInput && !preClickSearchInput) {
            console.log(`🎯 Search input appeared after ${i * 100}ms`);
            searchInputAppeared = true;
            break;
        }

        // Check for any modal or overlay that might contain search
        const modal = document.querySelector('[role="dialog"], .modal, [data-testid*="search"]');
        if (modal) {
            console.log(`🎯 Modal/overlay appeared after ${i * 100}ms:`, modal.className);
            break;
        }
    }

    // Clean up observers
    observer.disconnect();
    history.pushState = originalPushState;
    history.replaceState = originalReplaceState;

    // Step 4: Final state analysis
    console.log('\n5️⃣ Final State Analysis...');
    const finalUrl = window.location.href;
    const finalSearchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');

    console.log('   Final URL:', finalUrl);
    console.log('   URL changed:', urlChanged ? '✅' : '❌');
    console.log('   Search input present:', finalSearchInput ? '✅' : '❌');
    console.log('   Search input appeared:', searchInputAppeared ? '✅' : '❌');
    console.log('   DOM changed:', domChanged ? '✅' : '❌');

    // Check what type of search interface we have
    if (finalSearchInput) {
        console.log('   Search input type:', finalSearchInput.tagName);
        console.log('   Search input placeholder:', finalSearchInput.placeholder);
        console.log('   Search input aria-label:', finalSearchInput.getAttribute('aria-label'));
        console.log('   Search input visible:', finalSearchInput.offsetWidth > 0 && finalSearchInput.offsetHeight > 0);
    }

    // Step 5: Recommendations
    console.log('\n6️⃣ Recommendations...');

    if (finalUrl.includes('/explore/search/')) {
        console.log('   🔧 Ended up on explore/search page - this is actually correct!');
        console.log('   🔧 The search button redirects to explore/search, not an overlay');
        console.log('   🔧 Extension should accept this as successful navigation');
    } else if (finalSearchInput) {
        console.log('   ✅ Search interface opened successfully');
    } else if (!urlChanged && !searchInputAppeared) {
        console.log('   ❌ Nothing happened - click may have failed');
        console.log('   🔧 Try different click method or selector');
    } else {
        console.log('   ⚠️  Unexpected behavior - investigate further');
    }

    return {
        urlChanged,
        searchInputAppeared,
        finalUrl,
        finalSearchInput: !!finalSearchInput
    };
}

// Run the debug
debugSearchNavigation().then(result => {
    console.log('\n🎯 SUMMARY:');
    console.log('   URL Changed:', result.urlChanged ? '✅' : '❌');
    console.log('   Search Input Appeared:', result.searchInputAppeared ? '✅' : '❌');
    console.log('   Final URL:', result.finalUrl);
    console.log('   Has Search Input:', result.finalSearchInput ? '✅' : '❌');

    if (result.finalUrl.includes('/explore/search/')) {
        console.log('\n💡 INSIGHT: Instagram\'s search button navigates to /explore/search/');
        console.log('   This is the correct behavior, not a fallback!');
        console.log('   The extension should accept this as successful search navigation.');
    }
});

// Make available for manual testing
window.debugSearchNavigation = debugSearchNavigation;