/**
 * Test send-to-iphone script specifically for djawab9si account
 */

const { spawn } = require('child_process');
const path = require('path');

async function testSendToIphone() {
  console.log('🧪 Testing send-to-iphone.js for djawab9si account...\n');

  try {
    // First, let's get the account ID for djawab9si
    const { Pool } = require('pg');

    const db = new Pool({
      user: 'admin',
      host: 'localhost',
      database: 'instagram_tracker',
      password: 'password123',
      port: 5432,
    });

    const accountQuery = await db.query(
      'SELECT id FROM accounts WHERE username = $1',
      ['djawab9si']
    );

    if (accountQuery.rows.length === 0) {
      console.log('❌ Account djawab9si not found!');
      return;
    }

    const accountId = accountQuery.rows[0].id;
    console.log(`📋 Found account ID: ${accountId}\n`);

    // Test the send-to-iphone script
    const sendContentScript = path.join(process.cwd(), 'src/scripts/send-to-iphone.js');

    console.log('🚀 Executing send-to-iphone.js...');
    console.log(`Command: node ${sendContentScript} ${accountId} post_no_caption\n`);

    const child = spawn('node', [sendContentScript, accountId.toString(), 'post_no_caption'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(output.trim());
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.error('STDERR:', output.trim());
    });

    child.on('close', (code) => {
      console.log(`\n📊 Process completed with exit code: ${code}`);

      if (code === 0) {
        console.log('✅ send-to-iphone.js completed successfully');

        // Check what actually happened
        if (stdout.includes('💥 Using nuclear cleaner')) {
          console.log('✅ Nuclear cleaner was executed');
        } else {
          console.log('⚠️ Nuclear cleaner was NOT executed');
        }

        if (stdout.includes('📱 Executing wake_up.lua')) {
          console.log('✅ Wake-up script was executed');
        } else {
          console.log('⚠️ Wake-up script was NOT executed');
        }

        if (stdout.includes('📤 Sending image to iPhone gallery')) {
          console.log('✅ Image was sent to iPhone');
        } else {
          console.log('⚠️ No image was sent to iPhone');
        }

      } else {
        console.log('❌ send-to-iphone.js failed');
        console.log('Error output:', stderr);
      }

      process.exit(0);
    });

    child.on('error', (error) => {
      console.error('❌ Failed to start process:', error.message);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Error during test:', error.message);
    process.exit(1);
  }
}

testSendToIphone();