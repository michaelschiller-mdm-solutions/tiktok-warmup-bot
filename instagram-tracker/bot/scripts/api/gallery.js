/**
 * XXTouch Elite Gallery API Module
 * 
 * This script sends images directly to the iPhone photo gallery using the image_to_album API.
 * After running this script, the image will appear in the Photos app and be available for Instagram.
 * 
 * USAGE:
 * node scripts/api/gallery.js "path/to/image.jpg" [iPhone_IP:PORT]
 * 
 * EXAMPLES:
 * node scripts/api/gallery.js "profile.jpg"
 * node scripts/api/gallery.js "Instagram Post.png" http://192.168.1.100:46952
 * node scripts/api/gallery.js "../assets/story_image.jpg"
 * 
 * WORKFLOW:
 * 1. Run this script to save image to iPhone photo gallery
 * 2. Open Instagram app on iPhone
 * 3. Create post/story/change profile pic
 * 4. Select the uploaded image from gallery
 * 5. Execute your recorded Lua selection script if needed
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class GalleryAPI {
    constructor(baseUrl = 'http://127.0.0.1:46952') {
        this.baseUrl = baseUrl;
    }

    /**
     * Send image to iPhone photo gallery
     * @param {string} imagePath - Path to image file
     * @returns {Promise<Object>} API response with image info
     */
    async addImage(imagePath) {
        try {
            // Resolve path relative to script location
            const fullPath = path.resolve(imagePath);
            const fileName = path.basename(fullPath);

            console.log(`📸 Sending image to iPhone photo gallery...`);
            console.log(`File: ${fileName}`);
            console.log(`Path: ${fullPath}`);

            // Check if file exists
            if (!fs.existsSync(fullPath)) {
                throw new Error(`Image file not found: ${fullPath}`);
            }

            // Get file info
            const stats = fs.statSync(fullPath);
            const imageData = fs.readFileSync(fullPath);

            console.log(`Size: ${imageData.length} bytes (${(imageData.length / 1024).toFixed(1)} KB)`);
            console.log(`Modified: ${stats.mtime.toISOString()}`);

            // Send to iPhone
            const response = await axios.post(
                `${this.baseUrl}/image_to_album`,
                imageData,
                {
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    },
                    timeout: 30000 // 30 second timeout for images
                }
            );

            console.log('✅ Image successfully saved to iPhone photo gallery!');
            console.log(`Response: ${JSON.stringify(response.data)}`);

            return {
                success: true,
                data: response.data,
                fileName: fileName,
                filePath: fullPath,
                fileSize: imageData.length,
                fileSizeKB: Math.round(imageData.length / 1024)
            };

        } catch (error) {
            console.error('❌ Failed to send image to gallery:', error.message);
            if (error.response) {
                console.error(`Status: ${error.response.status}`);
                console.error(`Response: ${JSON.stringify(error.response.data)}`);
            }

            return {
                success: false,
                error: error.message,
                fileName: path.basename(imagePath),
                filePath: imagePath
            };
        }
    }

    /**
     * Get supported image formats
     */
    static getSupportedFormats() {
        return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'];
    }

    /**
     * Check if file is a supported image format
     */
    static isSupportedImage(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        return this.getSupportedFormats().includes(ext);
    }
}

// Main execution when called directly
async function main() {
    // Get command line arguments
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('❌ Error: No image path provided');
        console.log('\n📖 USAGE:');
        console.log('node scripts/api/gallery.js "path/to/image.jpg" [iPhone_IP:PORT]');
        console.log('\n📝 EXAMPLES:');
        console.log('node scripts/api/gallery.js "profile.jpg"');
        console.log('node scripts/api/gallery.js "Instagram Post.png" http://192.168.1.100:46952');
        console.log('node scripts/api/gallery.js "../assets/story_image.jpg"');
        console.log('\n🖼️ SUPPORTED FORMATS:');
        console.log(GalleryAPI.getSupportedFormats().join(', '));
        process.exit(1);
    }

    const imagePath = args[0];
    const baseUrl = args[1] || 'http://127.0.0.1:46952';

    // Check if supported format
    if (!GalleryAPI.isSupportedImage(imagePath)) {
        console.log(`⚠️ Warning: ${path.extname(imagePath)} may not be supported`);
        console.log(`Supported formats: ${GalleryAPI.getSupportedFormats().join(', ')}`);
    }

    console.log('🖼️ XXTouch Elite Gallery API');
    console.log('============================');
    console.log(`📱 iPhone: ${baseUrl}`);
    console.log(`📁 Image: ${path.basename(imagePath)}`);
    console.log('');

    const gallery = new GalleryAPI(baseUrl);
    const result = await gallery.addImage(imagePath);

    if (result.success) {
        console.log('\n🎉 SUCCESS!');
        console.log(`📸 Image "${result.fileName}" added to iPhone photo gallery`);
        console.log(`📦 Size: ${result.fileSizeKB} KB`);
        console.log('\n📱 Next steps:');
        console.log('1. Open Photos app on iPhone to verify image appeared');
        console.log('2. Open Instagram app');
        console.log('3. Create post/story or change profile picture');
        console.log('4. Select the uploaded image from gallery');
        console.log('5. Use your recorded Lua scripts for Instagram actions');
    } else {
        console.log('\n💥 FAILED!');
        console.log(`Error: ${result.error}`);
        console.log(`File: ${result.fileName}`);
        process.exit(1);
    }
}

// Export for use as module
module.exports = GalleryAPI;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 