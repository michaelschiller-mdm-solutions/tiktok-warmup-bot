// Complete Follow Test
// Tests the entire follow flow from search to profile

console.log('🎯 COMPLETE FOLLOW TEST');
console.log('======================');

async function testCompleteFollow(username = 'kodomarketing') {
    console.log(`\n🔍 Testing complete follow flow for: ${username}`);

    // Check if extension is loaded
    if (!window.instagramAutomationContentScript?.automationEngine?.instagramInterface) {
        console.log('❌ Extension not loaded properly');
        return false;
    }

    const instagramInterface = window.instagramAutomationContentScript.automationEngine.instagramInterface;

    try {
        console.log('\n1️⃣ Step 1: Navigate to Search...');

        // Test search navigation
        await instagramInterface.navigateToSearch();
        console.log('✅ Search navigation completed');

        // Wait a moment for search interface
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if search interface is available
        const searchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
        if (searchInput) {
            console.log('✅ Search interface detected');
        } else {
            console.log('⚠️  Search interface not detected, but continuing...');
        }

        console.log('\n2️⃣ Step 2: Search for user...');

        // Test user search
        const searchResult = await instagramInterface.searchAccount(username);

        if (searchResult) {
            console.log(`✅ Successfully found user: ${username}`);

            // Check current URL to see where we ended up
            console.log('Current URL:', window.location.href);

            // Check if we're on a profile page
            const isOnProfile = window.location.pathname.includes(`/${username}/`) ||
                document.querySelector('h1, h2')?.textContent?.toLowerCase().includes(username.toLowerCase());

            if (isOnProfile) {
                console.log('✅ Successfully navigated to user profile');

                console.log('\n3️⃣ Step 3: Check follow button...');

                // Look for follow/following button
                const followButton = document.querySelector('button:contains("Follow"), button:contains("Following")') ||
                    Array.from(document.querySelectorAll('button')).find(btn =>
                        btn.textContent?.toLowerCase().includes('follow')
                    );

                if (followButton) {
                    console.log('✅ Follow button found:', followButton.textContent);
                    console.log('Button type:', followButton.textContent?.includes('Following') ? 'Already Following' : 'Can Follow');
                } else {
                    console.log('⚠️  Follow button not found - may need to scroll or wait');
                }

                return true;
            } else {
                console.log('⚠️  Not on profile page, search may have failed');
                return false;
            }

        } else {
            console.log(`❌ Failed to find user: ${username}`);
            return false;
        }

    } catch (error) {
        console.log('❌ Error during follow test:', error.message);
        console.log('Error details:', error);
        return false;
    }
}

// Test with different usernames
async function runFollowTests() {
    console.log('🚀 Running follow tests...\n');

    const testUsers = ['kodomarketing', 'instagram', 'cristiano'];
    const results = {};

    for (const username of testUsers) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Testing: ${username}`);
        console.log(`${'='.repeat(50)}`);

        try {
            const result = await testCompleteFollow(username);
            results[username] = result;

            if (result) {
                console.log(`✅ ${username}: SUCCESS`);
            } else {
                console.log(`❌ ${username}: FAILED`);
            }

            // Wait between tests
            await new Promise(resolve => setTimeout(resolve, 3000));

        } catch (error) {
            console.log(`❌ ${username}: ERROR - ${error.message}`);
            results[username] = false;
        }
    }

    console.log('\n📊 FINAL RESULTS:');
    console.log('==================');
    Object.entries(results).forEach(([username, success]) => {
        console.log(`   ${username}: ${success ? '✅ PASS' : '❌ FAIL'}`);
    });

    const passCount = Object.values(results).filter(Boolean).length;
    const totalCount = Object.keys(results).length;

    console.log(`\n🎯 OVERALL: ${passCount}/${totalCount} tests passed`);

    return results;
}

// Make functions available globally
window.testCompleteFollow = testCompleteFollow;
window.runFollowTests = runFollowTests;

console.log('\n💡 Available commands:');
console.log('   testCompleteFollow("username") - Test single user');
console.log('   runFollowTests() - Test multiple users');
console.log('\n🎮 Quick test: testCompleteFollow("kodomarketing")');