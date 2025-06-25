const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'instagram_tracker',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
});

async function checkIphones() {
  try {
    console.log('Checking iphones table...');
    
    // Check if table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'iphones'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ iphones table does not exist');
      return;
    }
    
    console.log('✅ iphones table exists');
    
    // Get table structure
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'iphones'
      ORDER BY ordinal_position;
    `);
    
    console.log('\nTable structure:');
    structure.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Get all iphones
    const iphones = await pool.query('SELECT * FROM iphones ORDER BY id;');
    
    console.log(`\n📱 Found ${iphones.rows.length} iPhones in database:`);
    
    if (iphones.rows.length === 0) {
      console.log('❌ No iPhones registered! You need to add iPhones first.');
      console.log('\nTo add an iPhone, you can:');
      console.log('1. Use the frontend iPhone management page');
      console.log('2. Or run this SQL:');
      console.log(`
INSERT INTO iphones (name, model, ip_address, port, status, xxtouch_port, automation_enabled)
VALUES ('iPhone Test', 'iphone_x', '127.0.0.1', 46952, 'active', 46952, true);
      `);
    } else {
      iphones.rows.forEach(iphone => {
        console.log(`\n📱 iPhone ${iphone.id}: ${iphone.name}`);
        console.log(`   Model: ${iphone.model}`);
        console.log(`   IP: ${iphone.ip_address}:${iphone.port}`);
        console.log(`   Status: ${iphone.status}`);
        console.log(`   XXTouch Port: ${iphone.xxtouch_port}`);
        console.log(`   Automation Enabled: ${iphone.automation_enabled}`);
        console.log(`   Last Seen: ${iphone.last_seen || 'Never'}`);
      });
      
      // Check active iphones
      const activeIphones = iphones.rows.filter(i => i.status === 'active');
      console.log(`\n✅ Active iPhones: ${activeIphones.length}`);
      
      if (activeIphones.length === 0) {
        console.log('❌ No active iPhones! Update status to "active" for at least one iPhone.');
      }
    }
    
  } catch (error) {
    console.error('Error checking iphones:', error);
  } finally {
    await pool.end();
  }
}

checkIphones(); 