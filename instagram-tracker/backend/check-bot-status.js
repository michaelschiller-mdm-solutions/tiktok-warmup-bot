// Check current bot status and account processing state
const { db } = require('./dist/database');

async function checkBotStatus() {
  try {
    console.log('🔍 Checking bot status and account processing state...');
    
    console.log('\n1. Accounts currently in progress:');
    const inProgress = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.bot_id,
        awp.started_at,
        awp.updated_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'in_progress'
      ORDER BY awp.started_at DESC
    `);
    
    if (inProgress.rowCount === 0) {
      console.log('✅ No accounts currently in progress');
    } else {
      inProgress.rows.forEach(row => {
        console.log(`  - ${row.username}: ${row.phase} (bot: ${row.bot_id}, started: ${row.started_at})`);
      });
    }
    
    console.log('\n2. Bot status:');
    const botStatus = await db.query(`
      SELECT 
        id,
        status,
        current_account_id,
        last_activity,
        updated_at
      FROM bots
      ORDER BY id
    `);
    
    botStatus.rows.forEach(bot => {
      console.log(`  Bot ${bot.id}: ${bot.status} (account: ${bot.current_account_id}, last activity: ${bot.last_activity})`);
    });
    
    console.log('\n3. Recently completed phases:');
    const recentCompleted = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.completed_at,
        awp.bot_id
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'completed'
      AND awp.completed_at > NOW() - INTERVAL '5 minutes'
      ORDER BY awp.completed_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${recentCompleted.rowCount} recently completed phases:`);
    recentCompleted.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.phase} (completed: ${row.completed_at}, bot: ${row.bot_id})`);
    });
    
    console.log('\n4. Next ready accounts:');
    const readyAccounts = await db.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.available_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.status = 'available'
      AND awp.available_at <= NOW()
      ORDER BY awp.available_at ASC
      LIMIT 5
    `);
    
    console.log(`Found ${readyAccounts.rowCount} ready accounts:`);
    readyAccounts.rows.forEach(row => {
      console.log(`  - ${row.username}: ${row.phase} (available: ${row.available_at})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking bot status:', error);
    process.exit(1);
  }
}

checkBotStatus();