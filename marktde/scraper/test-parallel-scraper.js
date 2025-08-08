// Quick test to run the parallel scraper with debugging
const ParallelScraper = require('./parallel-premium-scraper.js');

async function test() {
    console.log('🧪 Testing parallel scraper...');
    
    const scraper = new ParallelScraper();
    
    // Test CSV loading
    if (!scraper.loadTargetAccounts()) {
        console.error('❌ Failed to load target accounts');
        return;
    }
    
    console.log(`✅ Loaded ${scraper.targetAccounts.length} accounts`);
    
    // Test with just first 3 accounts
    scraper.targetAccounts = scraper.targetAccounts.slice(0, 3);
    console.log(`🔬 Testing with first 3 accounts: ${scraper.targetAccounts.map(a => a.name).join(', ')}`);
    
    // Run the scraper
    await scraper.run();
}

test().catch(console.error);