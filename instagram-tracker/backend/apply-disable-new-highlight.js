// Disable new_highlight phase entirely since the script doesn't exist on iPhone
const { db } = require('./dist/database');

async function disableNewHighlight() {
    try {
        console.log('🔧 Disabling new_highlight phase entirely...\n');
        
        // Check current status
        const currentStatus = await db.query(`
            SELECT phase, status, COUNT(*) as count
            FROM account_warmup_phases 
            WHERE phase = 'new_highlight'
            GROUP BY phase, status
            ORDER BY status
        `);
        
        console.log('📊 Current new_highlight phase status:');
        currentStatus.rows.forEach(row => {
            console.log(`  ${row.status}: ${row.count} accounts`);
        });
        
        // Set all new_highlight phases to completed
        const updateResult = await db.query(`
            UPDATE account_warmup_phases 
            SET status = 'completed', 
                updated_at = NOW(),
                error_message = 'Phase disabled - script not available on device'
            WHERE phase = 'new_highlight' 
            AND status IN ('available', 'failed', 'in_progress')
        `);
        
        console.log(`\n✅ Updated ${updateResult.rowCount} new_highlight phases to completed`);
        
        // Check how many accounts are now complete
        const completionCheck = await db.query(`
            SELECT COUNT(*) as complete_count
            FROM accounts a
            WHERE is_warmup_complete(a.id) = true
        `);
        
        console.log(`\n🎯 Accounts now complete: ${completionCheck.rows[0].complete_count}`);
        
        // Show accounts that were affected
        const affectedAccounts = await db.query(`
            SELECT a.username, awp.status, awp.updated_at
            FROM accounts a
            JOIN account_warmup_phases awp ON a.id = awp.account_id
            WHERE awp.phase = 'new_highlight'
            AND awp.error_message = 'Phase disabled - script not available on device'
            ORDER BY awp.updated_at DESC
            LIMIT 10
        `);
        
        console.log('\n📋 Recently updated accounts:');
        affectedAccounts.rows.forEach(row => {
            console.log(`  ${row.username}: ${row.status}`);
        });
        
        console.log('\n🎉 new_highlight phase disabled successfully!');
        console.log('💡 All accounts can now complete warmup without this phase');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

disableNewHighlight();