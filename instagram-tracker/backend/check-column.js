const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function checkColumn() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'accounts' 
      AND column_name = 'first_automation_completed'
    `);
    
    console.log('Column exists:', result.rows.length > 0);
    if (result.rows.length > 0) {
      console.log('Column details:', result.rows[0]);
    }
    
    // Also check the bot_ready_accounts view
    const viewResult = await pool.query(`
      SELECT view_definition 
      FROM information_schema.views 
      WHERE table_name = 'bot_ready_accounts'
    `);
    
    if (viewResult.rows.length > 0) {
      console.log('\\nView definition includes first_automation_completed:', 
        viewResult.rows[0].view_definition.includes('first_automation_completed'));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumn();