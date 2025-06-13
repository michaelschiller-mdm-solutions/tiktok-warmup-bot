/**
 * XXTouch Elite Clipboard API Module
 * 
 * This script sends text to the iPhone clipboard using the pasteboard API.
 * After running this script, you can paste the text in any iOS app.
 * 
 * USAGE:
 * node scripts/api/clipboard.js "Your text here" [iPhone_IP:PORT]
 * 
 * EXAMPLES:
 * node scripts/api/clipboard.js "Hello World"
 * node scripts/api/clipboard.js "🌟 My Instagram bio\n📸 Photographer" http://192.168.1.100:46952
 * node scripts/api/clipboard.js "My Instagram post caption with #hashtags"
 * 
 * WORKFLOW:
 * 1. Run this script to load text into iPhone clipboard
 * 2. Execute your recorded Lua paste script on iPhone
 * 3. Text will be pasted into the active field
 */

const axios = require('axios');

class ClipboardAPI {
    constructor(baseUrl = 'http://127.0.0.1:46952') {
        this.baseUrl = baseUrl;
    }

    /**
     * Send text to iPhone clipboard
     * @param {string} text - Text to place in clipboard
     * @param {string} uti - Data type (default: public.plain-text)
     * @returns {Promise<Object>} API response
     */
    async setText(text, uti = 'public.plain-text') {
        try {
            console.log(`📋 Sending text to iPhone clipboard...`);
            console.log(`Text: "${text}"`);
            console.log(`Length: ${text.length} characters`);
            
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
            
            console.log('✅ Text successfully sent to iPhone clipboard!');
            console.log(`Response: ${JSON.stringify(response.data)}`);
            
            return {
                success: true,
                data: response.data,
                text: text,
                length: text.length
            };
            
        } catch (error) {
            console.error('❌ Failed to send text to clipboard:', error.message);
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error(`Response: ${JSON.stringify(error.response.data)}`);
            }
            
            return {
                success: false,
                error: error.message,
                text: text
            };
        }
    }
}

// Main execution when called directly
async function main() {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('❌ Error: No text provided');
        console.log('\n📖 USAGE:');
        console.log('node scripts/api/clipboard.js "Your text here" [iPhone_IP:PORT]');
        console.log('\n📝 EXAMPLES:');
        console.log('node scripts/api/clipboard.js "Hello World"');
        console.log('node scripts/api/clipboard.js "🌟 My bio\\n📸 Photographer" http://192.168.1.100:46952');
        process.exit(1);
    }
    
    const text = args[0];
    const baseUrl = args[1] || 'http://127.0.0.1:46952';
    
    console.log('🔗 XXTouch Elite Clipboard API');
    console.log('==============================');
    console.log(`📱 iPhone: ${baseUrl}`);
    console.log(`📝 Text: "${text}"`);
    console.log('');
    
    const clipboard = new ClipboardAPI(baseUrl);
    const result = await clipboard.setText(text);
    
    if (result.success) {
        console.log('\n🎉 SUCCESS!');
        console.log('📱 Next steps:');
        console.log('1. Go to your iPhone');
        console.log('2. Open the target app (Instagram, Notes, etc.)');
        console.log('3. Tap in a text field');
        console.log('4. Execute your recorded paste Lua script');
        console.log('5. The text should appear in the field');
    } else {
        console.log('\n💥 FAILED!');
        console.log(`Error: ${result.error}`);
        process.exit(1);
    }
}

// Export for use as module
module.exports = ClipboardAPI;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 