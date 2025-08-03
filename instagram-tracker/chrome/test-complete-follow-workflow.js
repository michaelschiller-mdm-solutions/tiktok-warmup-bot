// Complete Follow Workflow Test
// Tests the entire follow process from search to follow action

async function testCompleteFollowWorkflow() {
    console.log('\n🚀 COMPLETE FOLLOW WORKFLOW TEST');
    console.log('==================================');
    
    // Test configuration
    const testUsername = 'instagram'; // Use Instagram's official account for testing
    
    try {
        // Step 1: Initialize the extension components
        console.log('\n1️⃣ Initializing Extension Components...');
        
        // Check if extension is loaded
        if (typeof window.instagramAutomation === 'undefined') {
            console.log('❌ Extension not loaded, loading components...');
            
            // Load required scripts (simulate extension loading)
            const scripts = [
                'content/human-behavior.js',
                'content/instagram-interface.js',
                'content/automation-engine.js'
            ];
            
            for (const script of scripts) {
                try {
                    const response = await fetch(chrome.runtime.getURL(script));
                    const code = await response.text();
                    eval(code);
                    console.log(`✅ Loaded ${script}`);
                } catch (error) {
                    console.log(`⚠️  Could not load ${script}:`, error.message);
                }
            }
        }
        
        // Initialize components
        const humanBehavior = new HumanBehavior();
        const instagramInterface = new InstagramInterface(humanBehavior);
        
        console.log('✅ Extension components initialized');
        
        // Step 2: Test Search Navigation
        console.log('\n2️⃣ Testing Search Navigation...');
        
        const searchStartTime = Date.now();
        await instagramInterface.navigateToSearch();
        const searchEndTime = Date.now();
        
        console.log(`✅ Search navigation completed in ${searchEndTime - searchStartTime}ms`);
        
        // Verify search input is available
        const searchInput = document.querySelector('input[placeholder*="Search"], input[aria-label*="Search"]');
        if (!searchInput) {
            throw new Error('Search input not found after navigation');
        }
        console.log('✅ Search input is available');
        
        // Step 3: Test Account Search
        console.log('\n3️⃣ Testing Account Search...');
        
        const searchAccountStartTime = Date.now();
        const searchResult = await instagramInterface.searchAccount(testUsername);
        const searchAccountEndTime = Date.now();
        
        if (!searchResult) {
            throw new Error(`Failed to search for account: ${testUsername}`);
        }
        
        console.log(`✅ Account search completed in ${searchAccountEndTime - searchAccountStartTime}ms`);
        
        // Verify we're on the profile page
        const currentUrl = window.location.href;
        if (!currentUrl.includes(`/${testUsername}/`)) {
            console.log(`⚠️  URL doesn't contain username: ${currentUrl}`);
            console.log('   This might be normal if Instagram redirects to a different URL format');
        }
        
        // Check for profile elements
        const profileHeader = document.querySelector('header section, [data-testid="profile-header"]');
        if (!profileHeader) {
            throw new Error('Profile header not found - may not be on profile page');
        }
        console.log('✅ Profile page loaded successfully');
        
        // Step 4: Test Follow Action Detection
        console.log('\n4️⃣ Testing Follow Action Detection...');
        
        // Look for follow/following button
        const buttons = document.querySelectorAll('main button, header button');
        let followButton = null;
        let isAlreadyFollowing = false;
        
        for (const button of buttons) {
            const text = button.textContent.trim().toLowerCase();
            if (text === 'follow') {
                followButton = button;
                console.log('✅ Found Follow button');
                break;
            } else if (text.includes('following')) {
                followButton = button;
                isAlreadyFollowing = true;
                console.log('✅ Found Following button (already following)');
                break;
            }
        }
        
        if (!followButton) {
            console.log('⚠️  No follow/following button found');
            console.log('   Available buttons:');
            buttons.forEach((btn, index) => {
                console.log(`   ${index + 1}. "${btn.textContent.trim()}"`);
            });
        } else {
            console.log('✅ Follow action button detected');
        }
        
        // Step 5: Test Human Behavior Simulation
        console.log('\n5️⃣ Testing Human Behavior Simulation...');
        
        // Test mouse movement to follow button
        if (followButton) {
            console.log('Testing mouse navigation to follow button...');
            await humanBehavior.navigateToElement(followButton);
            console.log('✅ Mouse navigation completed');
            
            // Test delay simulation
            const delayStart = Date.now();
            await humanBehavior.delay(500);
            const delayEnd = Date.now();
            const actualDelay = delayEnd - delayStart;
            
            if (actualDelay >= 450 && actualDelay <= 600) {
                console.log(`✅ Delay simulation working (${actualDelay}ms)`);
            } else {
                console.log(`⚠️  Delay simulation off target (${actualDelay}ms, expected ~500ms)`);
            }
        }
        
        // Step 6: Workflow Summary
        console.log('\n6️⃣ Workflow Summary...');
        console.log('========================');
        
        const totalTime = Date.now() - searchStartTime;
        
        console.log(`✅ Complete workflow test completed in ${totalTime}ms`);
        console.log(`   Search Navigation: ${searchEndTime - searchStartTime}ms`);
        console.log(`   Account Search: ${searchAccountEndTime - searchAccountStartTime}ms`);
        console.log(`   Current URL: ${window.location.href}`);
        console.log(`   Profile Loaded: ${profileHeader ? 'Yes' : 'No'}`);
        console.log(`   Follow Button: ${followButton ? (isAlreadyFollowing ? 'Following' : 'Follow') : 'Not Found'}`);
        
        // Step 7: Recommendations
        console.log('\n7️⃣ Recommendations...');
        
        if (totalTime < 5000) {
            console.log('✅ Workflow is fast and efficient');
        } else if (totalTime < 10000) {
            console.log('⚠️  Workflow is acceptable but could be optimized');
        } else {
            console.log('❌ Workflow is slow, needs optimization');
        }
        
        if (followButton) {
            console.log('✅ Ready for follow/unfollow actions');
        } else {
            console.log('⚠️  Follow button detection needs improvement');
        }
        
        console.log('\n🎯 WORKFLOW TEST COMPLETE');
        return {
            success: true,
            totalTime,
            searchTime: searchEndTime - searchStartTime,
            accountSearchTime: searchAccountEndTime - searchAccountStartTime,
            profileLoaded: !!profileHeader,
            followButtonFound: !!followButton,
            isAlreadyFollowing,
            currentUrl
        };
        
    } catch (error) {
        console.error('\n❌ WORKFLOW TEST FAILED');
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
        
        return {
            success: false,
            error: error.message,
            currentUrl: window.location.href
        };
    }
}

// Auto-run the test
console.log('🔄 Starting Complete Follow Workflow Test...');
testCompleteFollowWorkflow().then(result => {
    console.log('\n📊 FINAL RESULT:', result);
});