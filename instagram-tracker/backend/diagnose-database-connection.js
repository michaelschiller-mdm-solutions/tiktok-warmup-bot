// Diagnose database connection issues
const { Client } = require('pg');

async function diagnoseDatabaseConnection() {
  console.log('🔍 Diagnosing database connection issues...');
  
  // Test basic connection
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'instagram_tracker',
    user: 'admin',
    password: 'password123',
    connectionTimeoutMillis: 5000,
    query_timeout: 10000,
  });

  try {
    console.log('🔌 Attempting to connect to PostgreSQL...');
    console.log('   Host: localhost');
    console.log('   Port: 5432');
    console.log('   Database: instagram_tracker');
    console.log('   User: admin');
    
    await client.connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Query test successful:');
    console.log(`   Current time: ${result.rows[0].current_time}`);
    console.log(`   PostgreSQL version: ${result.rows[0].pg_version.split(' ')[0]}`);
    
    await client.end();
    console.log('✅ Connection closed successfully');
    
    console.log('\n🎯 Database is working correctly!');
    console.log('💡 The timeout issue might be in the migration script or server startup process.');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 SOLUTION: Database container is not running');
      console.log('   Run: pnpm run db:start');
      console.log('   Or: docker-compose up -d');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 SOLUTION: Database host not found');
      console.log('   Check if PostgreSQL is installed and running');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 SOLUTION: Connection timeout');
      console.log('   Database might be starting up - wait a moment and try again');
    } else if (error.message.includes('authentication')) {
      console.log('\n💡 SOLUTION: Authentication failed');
      console.log('   Check username/password in .env file');
    } else {
      console.log('\n💡 SOLUTION: Unknown database error');
      console.log('   Check database logs and configuration');
    }
  }
  
  process.exit(0);
}

diagnoseDatabaseConnection();