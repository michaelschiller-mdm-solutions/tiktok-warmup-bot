console.log('Simple test script starting...');

const { Pool } = require('pg');

console.log('Creating database pool...');
const db = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'instagram_tracker',
  user: 'admin',
  password: 'password123',
});

console.log('Testing database connection...');
db.query('SELECT NOW() as current_time')
  .then(result => {
    console.log('✅ Database connected successfully!');
    console.log('Current time:', result.rows[0].current_time);
    return db.end();
  })
  .then(() => {
    console.log('Database connection closed');
    console.log('Test completed successfully!');
  })
  .catch(error => {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }); 