/**
 * XXTouch Elite File Downloader
 * 
 * This script downloads a file from the iPhone using the /read_file API endpoint
 * and saves it to a local path.
 *
 * USAGE:
 * node scripts/api/file_downloader.js <remote_path> [local_path]
 * 
 * EXAMPLES:
 * node scripts/api/file_downloader.js /var/mobile/Media/test_ffi_result.txt
 * node scripts/api/file_downloader.js /var/mobile/Media/1ferver/lua/scripts/some_script.lua ./downloaded_script.lua
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class FileDownloader {
    constructor(baseUrl = 'http://192.168.178.65:46952') {
        this.baseUrl = baseUrl;
    }

    /**
     * Download a file from the iPhone.
     * @param {string} remotePath - The full path of the file on the iPhone.
     * @param {string} [localPath] - The local path to save the file to. Defaults to the Downloads folder.
     * @returns {Promise<boolean>} - True on success, false on failure.
     */
    async downloadFile(remotePath, localPath) {
        if (!localPath) {
            // Default to a 'downloads' folder in the script's directory
            const downloadsDir = path.join(__dirname, 'downloads');
            if (!fs.existsSync(downloadsDir)) {
                fs.mkdirSync(downloadsDir);
            }
            localPath = path.join(downloadsDir, path.basename(remotePath));
        }

        console.log(`📥 Downloading file:`);
        console.log(`   From: ${remotePath}`);
        console.log(`   To:   ${localPath}`);

        try {
            const response = await axios.post(
                `${this.baseUrl}/read_file`,
                { filename: remotePath },
                {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 30000 // 30 second timeout
                }
            );

            if (response.data.code === 0) {
                // Assuming the file content is in a 'data' or 'content' field
                // This might need adjustment based on the actual API response structure
                const fileContent = response.data.data || response.data.content || response.data.message;

                if (typeof fileContent !== 'string') {
                    console.error('❌ Download failed: The API did not return readable file content.');
                    console.error('   Received:', JSON.stringify(response.data));
                    return false;
                }

                fs.writeFileSync(localPath, fileContent, 'utf8');
                console.log('✅ File downloaded successfully!');
                console.log(`   Size: ${fileContent.length} bytes`);
                return true;
            } else {
                console.error(`❌ Download failed: ${response.data.message}`);
                return false;
            }
        } catch (error) {
            console.error('❌ Download error:', error.message);
            if (error.response) {
                console.error(`   Status: ${error.response.status}`);
                console.error(`   Response: ${JSON.stringify(error.response.data)}`);
            }
            return false;
        }
    }
}

// Main execution when called directly
async function main() {
    const downloader = new FileDownloader();
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('❌ Error: Missing required remote file path.');
        console.log('\n📖 USAGE:');
        console.log('   node scripts/api/file_downloader.js <remote_path> [local_path]');
        console.log('\n📝 EXAMPLES:');
        console.log('   node scripts/api/file_downloader.js /var/mobile/Media/test_ffi_result.txt');
        console.log('   node scripts/api/file_downloader.js /var/mobile/Media/1ferver/lua/scripts/some_script.lua ./downloaded.lua');
        process.exit(1);
    }

    const remotePath = args[0];
    const localPath = args[1]; // Optional

    await downloader.downloadFile(remotePath, localPath);
}

if (require.main === module) {
    main().catch(error => {
        console.error("💥 An unexpected error occurred:", error);
        process.exit(1);
    });
}

module.exports = FileDownloader; 