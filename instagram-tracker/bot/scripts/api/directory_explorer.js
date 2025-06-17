/**
 * XXTouch Elite Directory Explorer
 * 
 * This script explores the iPhone directory structure to understand
 * where photos and media files are stored for proper cleanup.
 * 
 * USAGE:
 * node scripts/api/directory_explorer.js [iPhone_IP:PORT]
 * 
 * EXAMPLES:
 * node scripts/api/directory_explorer.js
 * node scripts/api/directory_explorer.js http://192.168.1.100:46952
 * 
 * This will help us find the correct paths for media cleanup.
 */

const axios = require('axios');

class DirectoryExplorer {
    constructor(baseUrl = 'http://127.0.0.1:46952') {
        this.baseUrl = baseUrl;
    }

    /**
     * List directory contents (if there's a list API)
     * Since we don't have a direct list API, we'll try common directories
     */
    async exploreCommonDirectories() {
        console.log('🔍 Exploring iPhone Directory Structure...\n');
        console.log('📁 Root directory according to API: /var/mobile/Media/1ferver');
        console.log('');
        
        // Try to delete test directories to see what exists
        const testDirectories = [
            // iOS Camera Roll locations
            '/DCIM',
            '/DCIM/100APPLE',
            '/DCIM/101APPLE', 
            '/DCIM/Camera',
            
            // Photo app locations
            '/PhotoData',
            '/Photos',
            '/PhotoLibrary',
            '/CameraRoll',
            
            // Media directories
            '/Media',
            '/Pictures',
            '/Images',
            
            // Temporary locations
            '/tmp',
            '/temp',
            '/Temporary',
            
            // Download locations
            '/Downloads',
            '/Download',
            
            // iOS specific
            '/Screenshots',
            '/Recents',
            '/Albums',
            '/PhotoStream',
            '/SharedPhoto',
            
            // App-specific
            '/Instagram',
            '/Camera',
            '/Videos',
            
            // System locations
            '/Library',
            '/Documents',
            '/Caches',
        ];
        
        const results = [];
        
        for (const directory of testDirectories) {
            console.log(`🔍 Testing directory: ${directory}`);
            
            try {
                const response = await axios.post(
                    `${this.baseUrl}/rmdir`,
                    {
                        directory: directory
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    }
                );
                
                // If successful, directory existed
                console.log(`✅ Directory existed and was deleted: ${directory}`);
                console.log(`   Response: ${JSON.stringify(response.data)}`);
                
                results.push({
                    directory: directory,
                    existed: true,
                    deleted: true,
                    response: response.data
                });
                
            } catch (error) {
                // Directory might not exist, or deletion failed
                let existed = false;
                let reason = 'Unknown';
                
                if (error.response) {
                    const status = error.response.status;
                    const data = error.response.data;
                    
                    if (status === 404) {
                        reason = 'Directory not found';
                    } else if (status === 403) {
                        reason = 'Permission denied';
                        existed = true; // Directory exists but can't be deleted
                    } else if (status === 400) {
                        reason = 'Bad request / Invalid path';
                    } else {
                        reason = `HTTP ${status}: ${JSON.stringify(data)}`;
                        existed = true; // Assume it exists if we got a server response
                    }
                }
                
                console.log(`❌ ${directory}: ${reason}`);
                
                results.push({
                    directory: directory,
                    existed: existed,
                    deleted: false,
                    error: error.message,
                    reason: reason
                });
            }
            
            // Brief pause between requests
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        return results;
    }

    /**
     * Generate directory exploration report
     */
    generateExplorationReport(results) {
        console.log('\n📊 Directory Exploration Results:');
        console.log('='.repeat(60));
        
        const existedAndDeleted = results.filter(r => r.existed && r.deleted);
        const existedButFailed = results.filter(r => r.existed && !r.deleted);
        const notFound = results.filter(r => !r.existed);
        
        console.log(`🗂️ Total directories tested: ${results.length}`);
        console.log(`✅ Existed and deleted: ${existedAndDeleted.length}`);
        console.log(`⚠️ Existed but couldn't delete: ${existedButFailed.length}`);
        console.log(`❌ Not found: ${notFound.length}`);
        
        if (existedAndDeleted.length > 0) {
            console.log('\n✅ DIRECTORIES THAT EXISTED (and were deleted):');
            existedAndDeleted.forEach(result => {
                console.log(`   • ${result.directory}`);
            });
        }
        
        if (existedButFailed.length > 0) {
            console.log('\n⚠️ DIRECTORIES THAT EXIST (but couldn\'t be deleted):');
            existedButFailed.forEach(result => {
                console.log(`   • ${result.directory} - ${result.reason}`);
            });
        }
        
        console.log('\n💡 RECOMMENDED DIRECTORIES FOR MEDIA CLEANUP:');
        const recommendedDirs = [...existedAndDeleted, ...existedButFailed]
            .filter(r => r.directory.includes('DCIM') || 
                        r.directory.includes('Photo') || 
                        r.directory.includes('Camera') ||
                        r.directory.includes('Download') ||
                        r.directory.includes('tmp'))
            .map(r => r.directory);
            
        if (recommendedDirs.length > 0) {
            recommendedDirs.forEach(dir => {
                console.log(`   • ${dir}`);
            });
        } else {
            console.log('   No obvious photo directories found');
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const baseUrl = args[0] || 'http://127.0.0.1:46952';
    
    console.log('🔍 XXTouch Elite Directory Explorer');
    console.log('===================================');
    console.log(`📱 iPhone: ${baseUrl}`);
    console.log('');
    
    const explorer = new DirectoryExplorer(baseUrl);
    
    try {
        const results = await explorer.exploreCommonDirectories();
        explorer.generateExplorationReport(results);
        
        console.log('\n🎯 Next Steps:');
        console.log('1. Use the recommended directories to update media_cleaner.js');
        console.log('2. Focus cleanup on directories that actually existed');
        console.log('3. Test media cleanup with the correct paths');
        
    } catch (error) {
        console.error('💥 Directory exploration failed:', error.message);
    }
}

// Export for use as module
module.exports = DirectoryExplorer;

// Run main if called directly
if (require.main === module) {
    main().catch(console.error);
} 