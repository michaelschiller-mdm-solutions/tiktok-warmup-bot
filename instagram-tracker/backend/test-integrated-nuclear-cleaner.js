/**
 * Test the integrated nuclear cleaner with final photos fix
 */

const iOS16PhotoCleaner = require('../bot/scripts/api/ios16_photo_cleaner.js');

async function testIntegratedCleaner() {
    console.log('🧪 Testing Integrated Nuclear Cleaner with Final Photos Fix');
    console.log('==========================================================\n');
    
    try {
        const cleaner = new iOS16PhotoCleaner();
        
        console.log('🚀 Running nuclear cleaner with integrated final photos fix...');
        await cleaner.performiOS16Cleanup();
        
        console.log('\n✅ Integrated nuclear cleaner test completed');
        console.log('📱 Photos app should now be working properly');
        console.log('🎯 Test opening Photos app on your iPhone to verify');
        
    } catch (error) {
        console.error('❌ Integrated nuclear cleaner test failed:', error.message);
    }
}

// Run test
testIntegratedCleaner().catch(console.error);