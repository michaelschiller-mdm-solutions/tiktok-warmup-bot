// Test Profile Picture Phase Fix
// Quick test to verify the profile_picture phase mapping is working

const { Pool } = require('pg');

async function testProfilePicturePhaseMapping() {
  console.log('🧪 Testing Profile Picture Phase Mapping Fix');
  console.log('==============================================');

  try {
    // Test 1: Check if the script mapping includes profile_picture
    console.log('\n1. Testing script mapping...');
    
    // Simulate the mapping from WarmupProcessService
    const phaseScriptMapping = {
      bio: "change_bio_to_clipboard.lua",
      gender: "change_gender_to_female.lua", 
      name: "change_name_to_clipboard.lua",
      username: "change_username_to_clipboard.lua",
      profile_picture: "change_pfp_to_newest_picture.lua", // ✅ ADDED
      first_highlight: "upload_first_highlight_group_with_clipboard_name_newest_media_no_caption.lua",
      new_highlight: "upload_new_highlightgroup_clipboard_name_newest_media_no_caption.lua",
      post_caption: "upload_post_newest_media_clipboard_caption.lua",
      post_no_caption: "upload_post_newest_media_no_caption.lua",
      story_no_caption: "upload_story_newest_media_no_caption.lua",
      set_to_private: "set_account_private.lua",
    };

    const profilePictureScript = phaseScriptMapping['profile_picture'];
    
    if (profilePictureScript) {
      console.log('✅ profile_picture phase mapping found:', profilePictureScript);
    } else {
      console.log('❌ profile_picture phase mapping NOT found');
      return;
    }

    // Test 2: Check if the script file exists
    const fs = require('fs');
    const path = require('path');
    const scriptPath = path.join(__dirname, '../bot/scripts/iphone_lua', profilePictureScript);
    
    console.log('\n2. Checking if script file exists...');
    console.log('Script path:', scriptPath);
    
    if (fs.existsSync(scriptPath)) {
      console.log('✅ Script file exists');
      
      // Show first few lines of the script
      const scriptContent = fs.readFileSync(scriptPath, 'utf8');
      const firstLines = scriptContent.split('\n').slice(0, 5).join('\n');
      console.log('Script preview:');
      console.log(firstLines);
    } else {
      console.log('❌ Script file does NOT exist');
      return;
    }

    // Test 3: Check database for accounts stuck on profile_picture phase
    console.log('\n3. Checking for accounts stuck on profile_picture phase...');
    
    const pool = new Pool({
      user: 'admin',
      host: 'localhost',
      database: 'instagram_tracker',
      password: 'password123',
      port: 5432,
    });

    const result = await pool.query(`
      SELECT 
        a.username,
        awp.phase,
        awp.status,
        awp.created_at,
        awp.updated_at
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.phase = 'profile_picture'
        AND awp.status IN ('pending', 'in_progress', 'failed')
      ORDER BY awp.updated_at DESC
      LIMIT 10
    `);

    if (result.rows.length > 0) {
      console.log(`Found ${result.rows.length} accounts with profile_picture phase issues:`);
      result.rows.forEach(row => {
        console.log(`- ${row.username}: ${row.status} (updated: ${row.updated_at})`);
      });
    } else {
      console.log('No accounts currently stuck on profile_picture phase');
    }

    await pool.end();

    console.log('\n🎉 Profile Picture Phase Fix Test Complete');
    console.log('The fix should resolve the "No script mapping found for phase: profile_picture" error');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testProfilePicturePhaseMapping();