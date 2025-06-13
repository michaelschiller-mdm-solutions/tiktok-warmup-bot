const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ImagePasteboardTester {
    constructor(baseUrl = 'http://127.0.0.1:46952') {
        this.baseUrl = baseUrl;
    }

    /**
     * Write image to iOS clipboard using XXTouch Elite pasteboard API
     * @param {Buffer|string} imageData - Image data (Buffer or base64 string)
     * @param {string} uti - Data type identifier for images
     * @returns {Promise<Object>} Response from the API
     */
    async writeImageToClipboard(imageData, uti = 'public.image') {
        try {
            console.log(`🖼️ Writing image to clipboard (UTI: ${uti})`);
            console.log(`Image data size: ${imageData.length} bytes`);
            
            const response = await axios.post(
                `${this.baseUrl}/pasteboard?uti=${uti}`,
                imageData,
                {
                    headers: {
                        'Content-Type': 'application/octet-stream'
                    },
                    timeout: 30000 // Longer timeout for images
                }
            );
            
            console.log('✅ Successfully wrote image to clipboard');
            console.log('Response:', response.data);
            return { success: true, data: response.data };
            
        } catch (error) {
            console.error('❌ Failed to write image to clipboard:', error.message);
            if (error.response) {
                console.error('Status:', error.response.status);
                console.error('Response:', error.response.data);
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Test various image formats and UTI types
     */
    async runImageTests() {
        console.log('\n🧪 Starting Image Pasteboard API Tests...\n');

        // First, let's create some test images if they don't exist
        await this.createTestImages();

        const imageTestCases = [
            {
                name: 'Small JPEG',
                fileName: 'test_small.jpg',
                uti: 'public.jpeg',
                description: 'Small JPEG image for quick testing'
            },
            {
                name: 'PNG with Transparency', 
                fileName: 'test_profile.png',
                uti: 'public.png',
                description: 'PNG image suitable for profile pictures'
            },
            {
                name: 'Generic Image',
                fileName: 'test_small.jpg',
                uti: 'public.image',
                description: 'Using generic image UTI'
            }
        ];

        const results = [];
        
        for (const testCase of imageTestCases) {
            console.log(`\n📷 Test: ${testCase.name}`);
            console.log(`Description: ${testCase.description}`);
            console.log(`UTI: ${testCase.uti}`);
            
            try {
                const imagePath = path.join(__dirname, 'test_images', testCase.fileName);
                
                if (!fs.existsSync(imagePath)) {
                    console.log(`⚠️ Image not found: ${imagePath}`);
                    results.push({
                        ...testCase,
                        success: false,
                        error: `Image file not found: ${testCase.fileName}`,
                        timestamp: new Date().toISOString()
                    });
                    continue;
                }

                const imageData = fs.readFileSync(imagePath);
                console.log(`📁 Loaded image: ${imageData.length} bytes`);
                
                const result = await this.writeImageToClipboard(imageData, testCase.uti);
                results.push({
                    ...testCase,
                    ...result,
                    imageSize: imageData.length,
                    timestamp: new Date().toISOString()
                });
                
            } catch (error) {
                console.error(`💥 Test failed: ${error.message}`);
                results.push({
                    ...testCase,
                    success: false,
                    error: error.message,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Brief pause between tests
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        return results;
    }

    /**
     * Create simple test images for testing
     */
    async createTestImages() {
        const testImagesDir = path.join(__dirname, 'test_images');
        
        if (!fs.existsSync(testImagesDir)) {
            fs.mkdirSync(testImagesDir, { recursive: true });
            console.log(`📁 Created test images directory: ${testImagesDir}`);
        }

        // Create a simple test pattern (1x1 pixel images for basic testing)
        const testImages = [
            {
                name: 'test_small.jpg',
                description: 'Minimal JPEG for testing',
                // This is a 1x1 red pixel JPEG in base64
                data: '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA=='
            },
            {
                name: 'test_profile.png',
                description: 'Minimal PNG for testing',
                // This is a 1x1 transparent pixel PNG in base64
                data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAFGhT/5qgAAAABJRU5ErkJggg=='
            }
        ];

        for (const image of testImages) {
            const imagePath = path.join(testImagesDir, image.name);
            if (!fs.existsSync(imagePath)) {
                const imageBuffer = Buffer.from(image.data, 'base64');
                fs.writeFileSync(imagePath, imageBuffer);
                console.log(`✅ Created test image: ${image.name} (${imageBuffer.length} bytes)`);
            }
        }
    }

    /**
     * Test Instagram-specific image workflows
     */
    async testInstagramImageWorkflows() {
        console.log('\n📸 Testing Instagram Image Workflows...\n');

        const workflows = [
            {
                name: 'Profile Picture Update',
                description: 'Test profile picture clipboard workflow',
                instructions: [
                    'Open Instagram app',
                    'Go to Profile → Edit Profile',
                    'Tap profile picture → Change Profile Photo',
                    'Try to paste the image (check if paste option appears)',
                    'If no paste option, select from library to compare'
                ]
            },
            {
                name: 'Post Image Selection',
                description: 'Test post image clipboard workflow', 
                instructions: [
                    'Open Instagram app',
                    'Tap + button → Post',
                    'Try to paste image (check if paste option appears)',
                    'If no paste option, select from gallery to compare'
                ]
            },
            {
                name: 'Story Image Selection',
                description: 'Test story image clipboard workflow',
                instructions: [
                    'Open Instagram app', 
                    'Tap + button → Story',
                    'Try to paste image (check if paste option appears)',
                    'If no paste option, select from gallery to compare'
                ]
            }
        ];

        // Test with a sample image
        try {
            const imagePath = path.join(__dirname, 'test_images', 'test_small.jpg');
            if (fs.existsSync(imagePath)) {
                const imageData = fs.readFileSync(imagePath);
                console.log(`📋 Placing test image in clipboard for manual testing...`);
                
                const result = await this.writeImageToClipboard(imageData, 'public.image');
                
                if (result.success) {
                    console.log('✅ Image successfully placed in clipboard!');
                    console.log('\n🧪 Manual Testing Instructions:');
                    console.log('=' .repeat(60));
                    
                    workflows.forEach((workflow, index) => {
                        console.log(`\n${index + 1}. ${workflow.name}`);
                        console.log(`   ${workflow.description}`);
                        workflow.instructions.forEach((instruction, i) => {
                            console.log(`   ${i + 1}. ${instruction}`);
                        });
                    });
                    
                    console.log('\n📝 Things to check:');
                    console.log('- Does long press show "Paste" option?');
                    console.log('- Does the paste action work?');
                    console.log('- Does the image appear correctly?');
                    console.log('- Any sizing or quality issues?');
                    
                } else {
                    console.log('❌ Failed to place image in clipboard');
                }
            } else {
                console.log('⚠️ No test image available for manual testing');
            }
        } catch (error) {
            console.error('💥 Workflow test failed:', error.message);
        }
    }

    /**
     * Generate comprehensive test report
     */
    generateTestReport(results) {
        console.log('\n📊 Image Test Results Summary:');
        console.log('='.repeat(50));
        
        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        
        console.log(`✅ Successful: ${successful}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
        
        console.log('\nDetailed Results:');
        results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${index + 1}. ${status} ${result.name} (${result.uti})`);
            if (result.success && result.imageSize) {
                console.log(`   Size: ${result.imageSize} bytes`);
            }
            if (!result.success) {
                console.log(`   Error: ${result.error}`);
            }
        });
    }
}

// Main execution
async function main() {
    console.log('🖼️ XXTouch Elite Image Pasteboard API Tester');
    console.log('==========================================\n');
    
    // Check if custom IP/port provided
    const customUrl = process.argv[2];
    const baseUrl = customUrl || 'http://127.0.0.1:46952';
    
    console.log(`🔗 Using XXTouch Elite at: ${baseUrl}`);
    
    const tester = new ImagePasteboardTester(baseUrl);
    
    try {
        // Run image pasteboard tests
        const results = await tester.runImageTests();
        tester.generateTestReport(results);
        
        // Test Instagram-specific workflows
        await tester.testInstagramImageWorkflows();
        
        console.log('\n✅ All image tests completed!');
        console.log('\n💡 Next Steps:');
        console.log('1. Test manual image pasting in Instagram app');
        console.log('2. If pasting works, record paste gesture for images');
        console.log('3. Combine image clipboard + paste for complete automation');
        console.log('4. Test different image formats and sizes');
        
    } catch (error) {
        console.error('💥 Test execution failed:', error.message);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { ImagePasteboardTester }; 