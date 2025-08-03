// Test Search vs Explore Button Detection
// This script helps distinguish between Search and Explore buttons

console.log('🔍 SEARCH vs EXPLORE DETECTION TEST');
console.log('===================================');

function testSearchVsExplore() {
    console.log('\n1️⃣ Finding All Navigation Links...');

    // Find all navigation links
    const allNavLinks = document.querySelectorAll('a, link');
    const navInfo = [];

    allNavLinks.forEach((link, index) => {
        const href = link.getAttribute('href') || '';
        const text = link.textContent?.trim() || '';
        const img = link.querySelector('img');
        const svg = link.querySelector('svg');
        const imgAlt = img?.getAttribute('alt') || '';
        const svgLabel = svg?.getAttribute('aria-label') || '';

        // Only show navigation-related links
        if (text.toLowerCase().includes('search') ||
            text.toLowerCase().includes('explore') ||
            imgAlt.toLowerCase().includes('search') ||
            imgAlt.toLowerCase().includes('explore') ||
            svgLabel.toLowerCase().includes('search') ||
            svgLabel.toLowerCase().includes('explore')) {

            navInfo.push({
                index,
                element: link,
                href,
                text,
                imgAlt,
                svgLabel,
                type: text.toLowerCase().includes('search') ? 'SEARCH' :
                    text.toLowerCase().includes('explore') ? 'EXPLORE' : 'UNKNOWN'
            });
        }
    });

    console.log('   Found navigation links:', navInfo.length);
    navInfo.forEach(info => {
        console.log(`   ${info.type}: href="${info.href}" text="${info.text}" imgAlt="${info.imgAlt}" svgLabel="${info.svgLabel}"`);
    });

    console.log('\n2️⃣ Testing Search Button Selectors...');

    const searchSelectors = [
        'a[href="#"] img[alt="Search"]',
        'a[href="#"]:has(img[alt="Search"])',
        'a:contains("Search"):not(:contains("Explore"))',
        'a[href="#"] svg[aria-label="Search"]'
    ];

    searchSelectors.forEach(selector => {
        try {
            let elements;
            if (selector.includes(':contains(')) {
                // Handle text-based selector manually
                elements = Array.from(document.querySelectorAll('a')).filter(el => {
                    const text = el.textContent.toLowerCase();
                    return text.includes('search') && !text.includes('explore');
                });
            } else {
                elements = document.querySelectorAll(selector);
            }

            console.log(`   "${selector}": ${elements.length} found`);

            if (elements.length > 0) {
                Array.from(elements).forEach((el, i) => {
                    const href = el.getAttribute('href');
                    const text = el.textContent?.trim();
                    console.log(`     ${i + 1}. href="${href}" text="${text}"`);
                });
            }
        } catch (error) {
            console.log(`   "${selector}": ERROR - ${error.message}`);
        }
    });

    console.log('\n3️⃣ Manual Search Button Identification...');

    // Find the exact search button
    const searchButton = navInfo.find(info =>
        info.type === 'SEARCH' &&
        info.href === '#' &&
        !info.href.includes('/explore/')
    );

    const exploreButton = navInfo.find(info =>
        info.type === 'EXPLORE' ||
        info.href.includes('/explore/')
    );

    if (searchButton) {
        console.log('   ✅ Search Button Found:');
        console.log('     Element:', searchButton.element.tagName);
        console.log('     Href:', searchButton.href);
        console.log('     Text:', searchButton.text);
        console.log('     Image Alt:', searchButton.imgAlt);
        console.log('     SVG Label:', searchButton.svgLabel);
    } else {
        console.log('   ❌ Search Button Not Found');
    }

    if (exploreButton) {
        console.log('   ✅ Explore Button Found:');
        console.log('     Element:', exploreButton.element.tagName);
        console.log('     Href:', exploreButton.href);
        console.log('     Text:', exploreButton.text);
        console.log('     Image Alt:', exploreButton.imgAlt);
        console.log('     SVG Label:', exploreButton.svgLabel);
    } else {
        console.log('   ❌ Explore Button Not Found');
    }

    console.log('\n4️⃣ Testing Click Targets...');

    if (searchButton) {
        console.log('   Testing Search Button Click...');
        try {
            // Get bounding rect to see if it's visible
            const rect = searchButton.element.getBoundingClientRect();
            console.log('     Position:', `x=${Math.round(rect.x)}, y=${Math.round(rect.y)}, w=${Math.round(rect.width)}, h=${Math.round(rect.height)}`);
            console.log('     Visible:', rect.width > 0 && rect.height > 0 ? '✅' : '❌');
            console.log('     Has click function:', typeof searchButton.element.click === 'function' ? '✅' : '❌');

            // Test click (but don't actually navigate)
            console.log('     Click test: Ready (not executed to avoid navigation)');

        } catch (error) {
            console.log('     Click test: ❌ Error -', error.message);
        }
    }

    console.log('\n5️⃣ Recommended Selector...');

    if (searchButton) {
        // Generate the most specific selector for this search button
        let recommendedSelector = '';

        if (searchButton.href === '#' && searchButton.imgAlt === 'Search') {
            recommendedSelector = 'a[href="#"] img[alt="Search"]';
        } else if (searchButton.href === '#' && searchButton.svgLabel === 'Search') {
            recommendedSelector = 'a[href="#"] svg[aria-label="Search"]';
        } else if (searchButton.text.includes('Search')) {
            recommendedSelector = 'a:contains("Search"):not(:contains("Explore"))';
        }

        console.log('   Recommended selector:', recommendedSelector);

        // Test the recommended selector
        try {
            let testElement;
            if (recommendedSelector.includes(':contains(')) {
                testElement = Array.from(document.querySelectorAll('a')).find(el => {
                    const text = el.textContent.toLowerCase();
                    return text.includes('search') && !text.includes('explore');
                });
            } else {
                testElement = document.querySelector(recommendedSelector);
            }

            console.log('   Selector test:', testElement ? '✅ Works' : '❌ Failed');

            if (testElement) {
                console.log('   Found element matches:', testElement === searchButton.element ? '✅' : '❌');
            }

        } catch (error) {
            console.log('   Selector test: ❌ Error -', error.message);
        }
    }

    return { searchButton, exploreButton };
}

// Run the test
const result = testSearchVsExplore();

console.log('\n🎯 SUMMARY:');
console.log('   Search Button:', result.searchButton ? '✅ Found' : '❌ Not Found');
console.log('   Explore Button:', result.exploreButton ? '✅ Found' : '❌ Not Found');

if (result.searchButton && result.exploreButton) {
    console.log('   Distinction:', result.searchButton.element !== result.exploreButton.element ? '✅ Clear' : '❌ Ambiguous');
}

// Make available for manual testing
window.testSearchVsExplore = testSearchVsExplore;