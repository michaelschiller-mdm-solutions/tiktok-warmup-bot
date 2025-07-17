const { db } = require('./backend/dist/database/index.js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Running bot_ready_accounts view migration...');
    
    const migrationPath = path.join(__dirname, 'database/migrations/040-fix-bot-ready-accounts-view.sql');
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    await db.query(migration);
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 