/*
 * Test script to verify CSV parsing works correctly
 * This uses the same logic as the working premium-followed-scraper.js
 */

const fs = require('fs');

function testCSVParsing() {
    console.log('🧪 Testing CSV parsing logic...\n');
    
    try {
        if (!fs.existsSync('./target_accounts.csv')) {
            console.error('❌ target_accounts.csv not found');
            return;
        }
        
        const content = fs.readFileSync('./target_accounts.csv', 'utf8');
        const lines = content.split('\n').slice(1); // Skip header
        
        const accounts = [];
        let errorCount = 0;
        
        lines.forEach((line, index) => {
            if (line.trim()) {
                try {
                    // Split by comma but handle the URL that contains commas
                    const parts = line.split(',');
                    if (parts.length >= 4) {
                        let name = parts[0];
                        let userId = parts[1];
                        
                        // Handle quoted names first
                        if (name.startsWith('"')) {
                            // Find the closing quote
                            let fullName = name;
                            let partIndex = 1;
                            while (!fullName.endsWith('"') && partIndex < parts.length) {
                                fullName += ',' + parts[partIndex];
                                partIndex++;
                            }
                            name = fullName.replace(/^"|"$/g, '').replace(/""/g, '"');
                            userId = parts[partIndex];
                            
                            // Reconstruct the full URL from the remaining parts after the quoted name
                            let urlParts = parts.slice(partIndex + 1);
                            let profileUrl = urlParts.join(',').trim();
                            
                            accounts.push({
                                name: name,
                                userId: userId,
                                link: profileUrl
                            });
                        } else {
                            // No quoted name - reconstruct URL from parts 2 onwards
                            let urlParts = parts.slice(2);
                            let profileUrl = urlParts.join(',').trim();
                            
                            accounts.push({
                                name: name,
                                userId: userId,
                                link: profileUrl
                            });
                        }
                        
                        // Show first 10 parsed accounts
                        if (accounts.length <= 10) {
                            console.log(`✅ Account ${accounts.length}: "${accounts[accounts.length-1].name}" -> ${accounts[accounts.length-1].link}`);
                        }
                    } else {
                        console.log(`⚠️ Line ${index + 2}: Insufficient parts (${parts.length}): ${line.substring(0, 100)}...`);
                        errorCount++;
                    }
                } catch (error) {
                    console.error(`❌ Line ${index + 2}: Parse error: ${error.message}`);
                    errorCount++;
                }
            }
        });

        console.log(`\n📊 Results:`);
        console.log(`✅ Successfully parsed: ${accounts.length} accounts`);
        console.log(`❌ Parse errors: ${errorCount}`);
        console.log(`📋 Total lines processed: ${lines.length}`);
        
        // Validate URLs
        const validUrls = accounts.filter(acc => acc.link && acc.link.includes('markt.de') && acc.link.includes('profile.htm'));
        console.log(`🔗 Valid URLs: ${validUrls.length}/${accounts.length}`);
        
        if (validUrls.length !== accounts.length) {
            console.log('\n⚠️ Invalid URLs found:');
            accounts.filter(acc => !acc.link || !acc.link.includes('markt.de') || !acc.link.includes('profile.htm'))
                    .slice(0, 5)
                    .forEach(acc => {
                        console.log(`   "${acc.name}": ${acc.link}`);
                    });
        }
        
        console.log('\n🎯 Test completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testCSVParsing();