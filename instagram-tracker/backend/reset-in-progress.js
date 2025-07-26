const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function reset() {
  try {
    const result = await pool.query(`
      UPDATE account_warmup_phases 
      SET status = 'available', 
          bot_id = NULL, 
          bot_session_id = NULL, 
          started_at = NULL 
      WHERE status = 'in_progress'
    `);
    
    console.log(`Reset ${result.rowCount} in-progress processes`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

reset();