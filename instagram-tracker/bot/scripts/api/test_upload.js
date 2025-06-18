/**
 * Test XXTouch File Upload Functionality
 * 
 * Based on the script_choose.js code we discovered, XXTouch uses:
 * - /write_file endpoint for uploading files
 * - Base64 encoding for file data
 * - JSON format with filename and data fields
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class XXTouchUploader {
    constructor() {
        this.apiBase = "http://192.168.178.65:46952";
    }

    /**
     * Convert file to base64 (as seen in XXTouch JavaScript)
     */
    fileToBase64(filePath) {
        try {
            const fileBuffer = fs.readFileSync(filePath);
            return fileBuffer.toString('base64');
        } catch (error) {
            console.log('❌ Error reading file:', error.message);
            return null;
        }
    }

    /**
     * Test upload endpoints
     */
    async testUploadEndpoints() {
        console.log('🔍 Testing XXTouch upload endpoints...\n');

        const testData = 'print("Hello from uploaded script!")';
        const testFilename = 'lua/scripts/test_upload.lua';

        const endpoints = [
            {
                path: '/write_file',
                body: {
                    filename: testFilename,
                    data: Buffer.from(testData).toString('base64')
                }
            },
            {
                path: '/upload_file', 
                body: {
                    filename: testFilename,
                    data: testData
                }
            },
            {
                path: '/file_upload',
                body: {
                    filename: testFilename,
                    content: testData
                }
            }
        ];

        for (const endpoint of endpoints) {
            try {
                console.log(`🧪 Testing ${endpoint.path}...`);
                
                const response = await axios.post(`${this.apiBase}${endpoint.path}`, endpoint.body, {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                console.log(`✅ ${endpoint.path}: SUCCESS`);
                console.log(`   Status: ${response.status}`);
                console.log(`   Response:`, response.data);
                console.log('');

            } catch (error) {
                if (error.response) {
                    if (error.response.status === 403) {
                        console.log(`❌ ${endpoint.path}: 403 Forbidden`);
                    } else {
                        console.log(`🔍 ${endpoint.path}: ${error.response.status} - ${error.response.statusText}`);
                        if (error.response.data) {
                            console.log(`   Response:`, error.response.data);
                        }
                    }
                } else {
                    console.log(`❌ ${endpoint.path}: ${error.message}`);
                }
                console.log('');
            }
        }
    }

    /**
     * Upload a local script file to iPhone
     */
    async uploadScript(localPath, remoteName = null) {
        try {
            if (!fs.existsSync(localPath)) {
                console.log('❌ Local file not found:', localPath);
                return false;
            }

            const fileName = remoteName || path.basename(localPath);
            const remoteFilename = `lua/scripts/${fileName}`;
            
            console.log(`📤 Uploading script: ${localPath} → ${remoteFilename}`);

            // Read and encode file (XXTouch uses base64)
            const fileContent = fs.readFileSync(localPath, 'utf8');
            const base64Content = Buffer.from(fileContent).toString('base64');

            const response = await axios.post(`${this.apiBase}/write_file`, {
                filename: remoteFilename,
                data: base64Content
            }, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.code === 0) {
                console.log('✅ Upload successful!');
                console.log('📝 Response:', response.data.message);
                return true;
            } else {
                console.log('❌ Upload failed:', response.data.message);
                return false;
            }

        } catch (error) {
            console.log('❌ Upload error:', error.message);
            if (error.response) {
                console.log('📊 Status:', error.response.status);
                console.log('📋 Response:', error.response.data);
            }
            return false;
        }
    }

    /**
     * List available local scripts for upload
     */
    listLocalScripts() {
        console.log('📁 Available local scripts for upload:\n');

        const scriptDirs = [
            './scripts/iphone_lua/',
            './scripts/open_container/',
            './scripts/instagram/'
        ];

        let totalScripts = 0;

        scriptDirs.forEach(dir => {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir)
                    .filter(file => file.endsWith('.lua'))
                    .sort();

                if (files.length > 0) {
                    console.log(`📂 ${path.basename(dir)} (${files.length} scripts):`);
                    files.forEach((file, index) => {
                        const fullPath = path.join(dir, file);
                        const stats = fs.statSync(fullPath);
                        const size = (stats.size / 1024).toFixed(1);
                        console.log(`   ${index + 1}. ${file} (${size} KB)`);
                    });
                    console.log('');
                    totalScripts += files.length;
                }
            }
        });

        console.log(`📊 Total scripts available: ${totalScripts}`);
        return totalScripts;
    }
}

// CLI Interface
async function main() {
    const uploader = new XXTouchUploader();
    const command = process.argv[2];
    const scriptPath = process.argv[3];

    if (!command) {
        console.log('📤 XXTouch File Upload Tester');
        console.log('=============================\n');
        console.log('🔧 Usage:');
        console.log('  node scripts/api/test_upload.js test');
        console.log('  node scripts/api/test_upload.js list');
        console.log('  node scripts/api/test_upload.js upload <script_path>');
        console.log('');
        console.log('📝 Examples:');
        console.log('  node scripts/api/test_upload.js test');
        console.log('  node scripts/api/test_upload.js upload scripts/iphone_lua/change_bio_to_clipboard.lua');
        return;
    }

    try {
        switch (command) {
            case 'test':
                await uploader.testUploadEndpoints();
                break;

            case 'list':
                uploader.listLocalScripts();
                break;

            case 'upload':
                if (!scriptPath) {
                    console.log('❌ Please specify script path');
                    console.log('💡 Usage: node scripts/api/test_upload.js upload <script_path>');
                    return;
                }
                await uploader.uploadScript(scriptPath);
                break;

            default:
                console.log('❌ Unknown command:', command);
                console.log('💡 Use: test, list, or upload');
                break;
        }
    } catch (error) {
        console.error('💥 Upload test failed:', error.message);
    }
}

// Export for use as module
module.exports = XXTouchUploader;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 