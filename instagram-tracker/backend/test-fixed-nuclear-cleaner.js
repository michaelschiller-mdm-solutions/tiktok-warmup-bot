/**
 * Test script for the fixed nuclear cleaner
 */

const FixedIOS16PhotoCleaner = require('../bot/scripts/api/fixed_ios16_photo_cleaner.js');

async function testFixedCleaner() {
    console.log('🧪 Testing Fixed Nuclear Cleaner...\n');
    
    const cleaner = new FixedIOS16PhotoCleaner();
    
    try {
        console.log('🚀 Running fixed nuclear cleanup...');
        await cleaner.performFixedCleanup();
        
        console.log('\n✅ Fixed nuclear cleaner test completed');
        console.log('📱 Check if Photos app is now accessible on iPhone');
        
    } catch (error) {
        console.error('❌ Fixed nuclear cleaner test failed:', error.message);
    }
}

// Run test
testFixedCleaner().catch(console.error);