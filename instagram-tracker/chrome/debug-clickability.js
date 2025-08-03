// Debug Clickability Issues
// This script helps debug why elements are not considered clickable

console.log('🔧 CLICKABILITY DEBUG');
console.log('====================');

function debugClickability() {
    console.log('\n1️⃣ Finding Search Button...');

    // Use the same selector that the extension uses
    const primarySelector = 'a[href="#"] svg[aria-label="Search"]';
    const searchSvg = document.querySelector(primarySelector);

    if (!searchSvg) {
        console.log('❌ Primary selector failed:', primarySelector);

        // Try alternative selectors
        const altSelectors = [
            'a[href="#"] img[alt="Search"]',
            'a:contains("Search")',
            'svg[aria-label="Search"]'
        ];

        for (const selector of altSelectors) {
            try {
                let element;
                if (selector.includes(':contains(')) {
                    element = Array.from(document.querySelectorAll('a')).find(el =>
                        el.textContent.toLowerCase().includes('search')
                    );
                } else {
                    element = document.querySelector(selector);
                }

                if (element) {
                    console.log('✅ Alternative selector works:', selector);
                    console.log('   Element:', element.tagName, element.className);
                    break;
                }
            } catch (error) {
                console.log('❌ Selector failed:', selector, error.message);
            }
        }
        return;
    }

    console.log('✅ Found SVG element:', searchSvg);
    console.log('   Tag:', searchSvg.tagName);
    console.log('   Aria-label:', searchSvg.getAttribute('aria-label'));
    console.log('   Classes:', searchSvg.className);

    console.log('\n2️⃣ Finding Parent Element...');

    // Find the clickable parent (this is what the extension should do)
    let clickableElement = searchSvg;
    if (searchSvg.tagName === 'SVG' || searchSvg.tagName === 'IMG') {
        clickableElement = searchSvg.closest('a, button, div[role="button"], [onclick]') || searchSvg.parentElement;
    }

    console.log('✅ Clickable element:', clickableElement);
    console.log('   Tag:', clickableElement.tagName);
    console.log('   Href:', clickableElement.getAttribute('href'));
    console.log('   Classes:', clickableElement.className);
    console.log('   Text:', clickableElement.textContent?.trim());

    console.log('\n3️⃣ Clickability Tests...');

    // Test 1: Basic existence
    console.log('   Element exists:', !!clickableElement ? '✅' : '❌');

    // Test 2: Visibility
    const style = window.getComputedStyle(clickableElement);
    const isVisible = style.display !== 'none' && style.visibility !== 'hidden';
    console.log('   Is visible:', isVisible ? '✅' : '❌');
    console.log('     Display:', style.display);
    console.log('     Visibility:', style.visibility);

    // Test 3: Disabled state
    const isDisabled = clickableElement.disabled;
    console.log('   Is disabled:', isDisabled ? '❌' : '✅');

    // Test 4: Bounding rect
    const rect = clickableElement.getBoundingClientRect();
    const hasSize = rect.width > 0 && rect.height > 0;
    console.log('   Has size:', hasSize ? '✅' : '❌');
    console.log('     Width:', rect.width);
    console.log('     Height:', rect.height);
    console.log('     Position:', `x=${Math.round(rect.x)}, y=${Math.round(rect.y)}`);

    // Test 5: Click function
    const hasClickFunction = typeof clickableElement.click === 'function';
    console.log('   Has click function:', hasClickFunction ? '✅' : '❌');

    // Test 6: Instagram-specific checks
    const isLink = clickableElement.tagName === 'A';
    const isButton = clickableElement.tagName === 'BUTTON';
    const hasRole = clickableElement.getAttribute('role') === 'button' || clickableElement.getAttribute('role') === 'link';
    const isInNavigation = clickableElement.closest('nav') !== null;
    const hasHref = clickableElement.hasAttribute('href');

    console.log('   Is link:', isLink ? '✅' : '❌');
    console.log('   Is button:', isButton ? '✅' : '❌');
    console.log('   Has role:', hasRole ? '✅' : '❌');
    console.log('   In navigation:', isInNavigation ? '✅' : '❌');
    console.log('   Has href:', hasHref ? '✅' : '❌');

    // Test 7: Extension's clickability logic
    const extensionClickable = hasClickFunction || isButton || hasRole || (isLink && hasHref && isInNavigation);
    console.log('   Extension logic:', extensionClickable ? '✅' : '❌');

    console.log('\n4️⃣ Manual Click Test...');

    try {
        console.log('   Attempting manual click...');
        clickableElement.click();
        console.log('   ✅ Manual click successful!');

        // Wait and check if search opened
        setTimeout(() => {
            const searchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
            if (searchInput) {
                console.log('   ✅ Search interface opened!');
            } else {
                console.log('   ⚠️  Search interface not detected');
                console.log('   Current URL:', window.location.href);
            }
        }, 2000);

    } catch (error) {
        console.log('   ❌ Manual click failed:', error.message);
    }

    console.log('\n5️⃣ Recommendations...');

    if (!isVisible) {
        console.log('   🔧 Element is not visible - check CSS display/visibility');
    }

    if (!hasSize) {
        console.log('   🔧 Element has no size - may be hidden or collapsed');
    }

    if (!hasClickFunction) {
        console.log('   🔧 Element has no click function - try event dispatching');
    }

    if (!extensionClickable) {
        console.log('   🔧 Extension logic rejects element - update isElementClickable method');
    }

    if (isVisible && hasSize && hasClickFunction) {
        console.log('   ✅ Element should be clickable - check extension logic');
    }

    return {
        element: clickableElement,
        isVisible,
        hasSize,
        hasClickFunction,
        extensionClickable
    };
}

// Run the debug
const result = debugClickability();

console.log('\n🎯 SUMMARY:');
console.log('   Element found:', !!result.element ? '✅' : '❌');
console.log('   Visible:', result.isVisible ? '✅' : '❌');
console.log('   Has size:', result.hasSize ? '✅' : '❌');
console.log('   Has click function:', result.hasClickFunction ? '✅' : '❌');
console.log('   Extension accepts:', result.extensionClickable ? '✅' : '❌');

// Make available for manual testing
window.debugClickability = debugClickability;