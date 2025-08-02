// Check status of atacadaodamodabarbalhace09 account after new_highlight fix
const { db } = require('./dist/database');

async function checkAtacadaStatus() {
    try {
        console.log('🔍 Checking atacadaodamodabarbalhace09 status after new_highlight fix...\n');
        
        // Get recent phases
        const recentPhases = await db.query(`
            SELECT a.username, awp.phase, awp.status, awp.updated_at 
            FROM accounts a 
            JOIN account_warmup_phases awp ON a.id = awp.account_id 
            WHERE a.username = 'atacadaodamodabarbalhace09' 
            ORDER BY awp.updated_at DESC 
            LIMIT 10
        `);
        
        console.log('📋 Recent phases:');
        recentPhases.rows.forEach(row => {
            const time = new Date(row.updated_at).toLocaleString();
            console.log(`  ${row.phase}: ${row.status} (${time})`);
        });
        
        // Check if warmup is complete
        const warmupStatus = await db.query(`
            SELECT a.username, is_warmup_complete(a.id) as is_complete
            FROM accounts a 
            WHERE a.username = 'atacadaodamodabarbalhace09'
        `);
        
        console.log('\n🎯 Warmup completion status:');
        if (warmupStatus.rows.length > 0) {
            const isComplete = warmupStatus.rows[0].is_complete;
            console.log(`  Warmup complete: ${isComplete ? 'YES ✅' : 'NO ❌'}`);
        }
        
        // Check current queue status
        const queueStatus = await db.query(`
            SELECT * FROM bot_ready_view 
            WHERE username = 'atacadaodamodabarbalhace09'
        `);
        
        console.log('\n🚀 Queue status:');
        if (queueStatus.rows.length > 0) {
            const row = queueStatus.rows[0];
            console.log(`  Ready for processing: YES`);
            console.log(`  Next phase: ${row.phase}`);
            console.log(`  Status: ${row.status}`);
        } else {
            console.log(`  Ready for processing: NO (in cooldown or complete)`);
        }
        
        console.log('\n✅ Status check complete!');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

checkAtacadaStatus();