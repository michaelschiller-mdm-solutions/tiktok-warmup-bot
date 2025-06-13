const axios = require('axios');

class PasteboardTester {
    constructor(baseUrl = 'http://127.0.0.1:46952') {
        this.baseUrl = baseUrl;
    }

    /**
     * Write text to iOS clipboard using XXTouch Elite pasteboard API
     * @param {string} text - Text to write to clipboard
     * @param {string} uti - Data type identifier (default: public.plain-text)
     * @returns {Promise<Object>} Response from the API
     */
    async writeToClipboard(text, uti = 'public.plain-text') {
        try {
            console.log(`📋 Writing to clipboard: "${text}"`);
            
            const response = await axios.post(
                `${this.baseUrl}/pasteboard?uti=${uti}`,
                text,
                {
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    timeout: 10000
                }
            );
            
            console.log('✅ Successfully wrote to clipboard');
            console.log('Response:', response.data);
            return { success: true, data: response.data };
            
        } catch (error) {
            console.error('❌ Failed to write to clipboard:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Response:', error.response.data);
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Test various types of text content
     */
    async runBasicTests() {
        console.log('\n🧪 Starting Pasteboard API Tests...\n');

        const testCases = [
            {
                name: 'Simple Text',
                text: 'Hello World!',
                description: 'Basic ASCII text'
            },
            {
                name: 'Instagram Bio',
                text: '🌟 Living my best life\n📸 Photography enthusiast\n🌍 Travel lover\n✨ #blessed',
                description: 'Multi-line bio with emojis'
            },
            {
                name: 'Instagram Caption',
                text: 'What an amazing sunset! 🌅 #sunset #nature #photography #beautiful #nofilter',
                description: 'Post caption with hashtags'
            },
            {
                name: 'Special Characters',
                text: 'Testing: áéíóú ñ ¿¡ @username #hashtag www.example.com',
                description: 'Accented characters and symbols'
            },
            {
                name: 'Long Text',
                text: 'This is a much longer piece of text to test how the clipboard handles larger content. It includes multiple sentences and should test the reliability of the pasteboard API with substantial text content.',
                description: 'Extended text content'
            }
        ];

        const results = [];
        
        for (const testCase of testCases) {
            console.log(`\n📝 Test: ${testCase.name}`);
            console.log(`Description: ${testCase.description}`);
            console.log(`Text length: ${testCase.text.length} characters`);
            
            const result = await this.writeToClipboard(testCase.text);
            results.push({
                ...testCase,
                ...result,
                timestamp: new Date().toISOString()
            });
            
            // Brief pause between tests
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        return results;
    }

    /**
     * Generate a comprehensive test report
     */
    generateTestReport(results) {
        console.log('\n📊 Test Results Summary:');
        console.log('='.repeat(50));
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`✅ Successful: ${successful}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
        
        console.log('\nDetailed Results:');
        results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${index + 1}. ${status} ${result.name}`);
            if (!result.success) {
                console.log(`   Error: ${result.error}`);
            }
        });
    }
}

// Enhanced test with Instagram workflow simulation
class InstagramWorkflowTester extends PasteboardTester {
    
    /**
     * Simulate Instagram bio update workflow
     */
    async simulateBioUpdate(bioText) {
        console.log('\n🔄 Simulating Instagram Bio Update Workflow...');
        
        // Step 1: Write bio to clipboard
        console.log('Step 1: Writing bio to clipboard...');
        const clipboardResult = await this.writeToClipboard(bioText);
        
        if (!clipboardResult.success) {
            return { success: false, step: 'clipboard', error: clipboardResult.error };
        }
        
        // Step 2: You would now manually test pasting in Instagram
        console.log('Step 2: 📱 Now test pasting in Instagram bio field manually');
        console.log('   - Open Instagram app');
        console.log('   - Go to Profile → Edit Profile');
        console.log('   - Tap Bio field');
        console.log('   - Long press and select "Paste"');
        console.log('   - Verify the text appears correctly');
        
        return { 
            success: true, 
            message: 'Bio text successfully written to clipboard. Test pasting manually in Instagram.',
            bioText: bioText
        };
    }

    /**
     * Simulate Instagram post caption workflow
     */
    async simulatePostCaption(captionText) {
        console.log('\n📸 Simulating Instagram Post Caption Workflow...');
        
        const clipboardResult = await this.writeToClipboard(captionText);
        
        if (!clipboardResult.success) {
            return { success: false, step: 'clipboard', error: clipboardResult.error };
        }
        
        console.log('📱 Now test pasting in Instagram post creation:');
        console.log('   - Open Instagram app');
        console.log('   - Tap + button → Post');
        console.log('   - Select image');
        console.log('   - Tap "Write a caption..." field');
        console.log('   - Long press and select "Paste"');
        console.log('   - Verify caption appears correctly');
        
        return { 
            success: true, 
            message: 'Caption successfully written to clipboard',
            captionText: captionText
        };
    }
}

// Main execution
async function main() {
    console.log('🚀 XXTouch Elite Pasteboard API Tester');
    console.log('=====================================\n');
    
    // Check if custom IP/port provided
    const customUrl = process.argv[2];
    const baseUrl = customUrl || 'http://127.0.0.1:46952';
    
    console.log(`🔗 Using XXTouch Elite at: ${baseUrl}`);
    
    const tester = new PasteboardTester(baseUrl);
    const workflowTester = new InstagramWorkflowTester(baseUrl);
    
    try {
        // Run basic pasteboard tests
        const results = await tester.runBasicTests();
        tester.generateTestReport(results);
        
        // Test Instagram-specific workflows
        console.log('\n' + '='.repeat(50));
        console.log('🎯 Instagram Workflow Tests');
        console.log('='.repeat(50));
        
        // Test bio update
        await workflowTester.simulateBioUpdate(
            '🌟 Photographer & Explorer\n📍 San Francisco\n✨ Capturing life\'s moments\n🔗 www.myportfolio.com'
        );
        
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Test post caption
        await workflowTester.simulatePostCaption(
            'Beautiful sunset from my evening walk! 🌅\n\nThe colors tonight were absolutely incredible. Sometimes you just have to stop and appreciate the natural beauty around us.\n\n#sunset #nature #photography #golden hour #peaceful #gratitude #nofilter'
        );
        
        console.log('\n✅ All tests completed!');
        console.log('\n💡 Next Steps:');
        console.log('1. Test manual pasting in Instagram app');
        console.log('2. If pasting works, create Lua scripts to automate the paste action');
        console.log('3. Combine clipboard + paste for complete text automation');
        
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { PasteboardTester, InstagramWorkflowTester }; 