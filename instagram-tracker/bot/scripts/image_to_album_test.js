const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ImageToAlbumTester {
    constructor(baseUrl = 'http://127.0.0.1:46952') {
        this.baseUrl = baseUrl;
    }

    /**
     * Save image directly to iPhone photo album
     * @param {Buffer} imageData - Image binary data
     * @param {string} imageName - Name of the image for logging
     * @returns {Promise<Object>} Response from the API
     */
    async saveImageToAlbum(imageData, imageName = 'image') {
        try {
            console.log(`📸 Saving "${imageName}" to iPhone photo album...`);
            console.log(`Image size: ${imageData.length} bytes`);
            
            const response = await axios.post(
                `${this.baseUrl}/image_to_album`,
                imageData,
                {
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    },
                    timeout: 30000 // 30 second timeout for image upload
                }
            );
            
            console.log('✅ Successfully saved image to album!');
            console.log('Response:', response.data);
            return { success: true, data: response.data };
            
        } catch (error) {
            console.error('❌ Failed to save image to album:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Response:', error.response.data);
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Test with Facebook Profile Image.png
     */
    async testFacebookProfileImage() {
        console.log('\n🧪 Testing Facebook Profile Image Upload...\n');
        
        const imagePath = path.join(__dirname, 'Facebook Profile Image.png');
        
        try {
            // Check if file exists
            if (!fs.existsSync(imagePath)) {
                console.error(`❌ Image not found: ${imagePath}`);
                console.log('\n💡 Please place "Facebook Profile Image.png" in the scripts/ folder');
                return { success: false, error: 'Image file not found' };
            }
            
            // Load image data
            const imageData = fs.readFileSync(imagePath);
            const stats = fs.statSync(imagePath);
            
            console.log(`📁 Found image: ${imagePath}`);
            console.log(`📊 File size: ${imageData.length} bytes (${(imageData.length / 1024).toFixed(1)} KB)`);
            console.log(`📅 Last modified: ${stats.mtime}`);
            
            // Upload to iPhone album
            const result = await this.saveImageToAlbum(imageData, 'Facebook Profile Image.png');
            
            if (result.success) {
                console.log('\n🎉 SUCCESS! Image saved to iPhone photo album');
                console.log('\n📱 Next steps:');
                console.log('1. Open Photos app on iPhone');
                console.log('2. Check if "Facebook Profile Image.png" appears in recent photos');
                console.log('3. Open Instagram app');
                console.log('4. Try creating a post/story and see if the image appears in gallery selection');
                console.log('5. Test using it as profile picture');
            }
            
            return result;
            
        } catch (error) {
            console.error('💥 Test failed:', error.message);
            return { success: false, error: error.message };
        }
    }
}

// Main execution
async function main() {
    console.log('📷 XXTouch Elite Image-to-Album API Tester');
    console.log('=========================================\n');
    
    // Check if custom IP/port provided
    const customUrl = process.argv[2];
    const baseUrl = customUrl || 'http://127.0.0.1:46952';
    
    console.log(`🔗 Using XXTouch Elite at: ${baseUrl}`);
    
    const tester = new ImageToAlbumTester(baseUrl);
    
    try {
        const result = await tester.testFacebookProfileImage();
        
        console.log('\n📊 Test Summary:');
        console.log('='.repeat(40));
        if (result.success) {
            console.log('✅ Status: SUCCESS');
            console.log('📸 Image successfully saved to iPhone photo album');
            console.log('🎯 Ready for Instagram automation testing');
        } else {
            console.log('❌ Status: FAILED');
            console.log(`💥 Error: ${result.error}`);
        }
        
        console.log('\n🚀 This API is PERFECT for Instagram automation!');
        console.log('💡 Why this is better than pasteboard for images:');
        console.log('   • Images go directly to photo gallery');
        console.log('   • Instagram can immediately find and use them');
        console.log('   • No complex paste gestures needed');
        console.log('   • Works for posts, stories, and profile pictures');
        
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { ImageToAlbumTester }; 