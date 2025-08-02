/**
 * Check profile picture phase assignment and content assignment logic
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'instagram_tracker',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});

async function checkProfilePicturePhaseAssignment() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking profile picture phase assignment...');
    
    // 1. Check all warmup phases distribution
    console.log('\n📊 Warmup phases distribution:');
    const phasesDistributionQuery = `
      SELECT 
        phase,
        status,
        COUNT(*) as count
      FROM account_warmup_phases
      WHERE phase IN ('bio', 'gender', 'name', 'username', 'profile_picture', 'first_highlight', 'new_highlight', 'post_caption', 'post_no_caption', 'story_caption', 'story_no_caption')
      GROUP BY phase, status
      ORDER BY 
        CASE phase
          WHEN 'bio' THEN 1
          WHEN 'gender' THEN 2
          WHEN 'name' THEN 3
          WHEN 'username' THEN 4
          WHEN 'profile_picture' THEN 5
          WHEN 'first_highlight' THEN 6
          WHEN 'new_highlight' THEN 7
          WHEN 'post_caption' THEN 8
          WHEN 'post_no_caption' THEN 9
          WHEN 'story_caption' THEN 10
          WHEN 'story_no_caption' THEN 11
          ELSE 12
        END,
        status;
    `;
    
    const distributionResult = await client.query(phasesDistributionQuery);
    
    let currentPhase = '';
    distributionResult.rows.forEach(row => {
      if (row.phase !== currentPhase) {
        console.log(`\n  ${row.phase.toUpperCase()}:`);
        currentPhase = row.phase;
      }
      console.log(`    ${row.status}: ${row.count} accounts`);
    });
    
    // 2. Check specifically for profile_picture phase
    console.log('\n🖼️  Profile Picture Phase Analysis:');
    const profilePictureQuery = `
      SELECT 
        awp.status,
        COUNT(*) as count,
        COUNT(CASE WHEN awp.assigned_content_id IS NOT NULL THEN 1 END) as with_content,
        COUNT(CASE WHEN awp.assigned_content_id IS NULL THEN 1 END) as without_content
      FROM account_warmup_phases awp
      JOIN accounts a ON awp.account_id = a.id
      WHERE awp.phase = 'profile_picture'
      AND a.lifecycle_state != 'archived'
      GROUP BY awp.status
      ORDER BY awp.status;
    `;
    
    const profilePictureResult = await client.query(profilePictureQuery);
    
    if (profilePictureResult.rows.length === 0) {
      console.log('  ❌ No accounts found in profile_picture phase');
    } else {
      profilePictureResult.rows.forEach(row => {
        console.log(`  ${row.status}: ${row.count} accounts (${row.with_content} with content, ${row.without_content} without)`);
      });
    }
    
    // 3. Check accounts that should be in profile_picture phase
    console.log('\n🔍 Accounts that should be in profile_picture phase:');
    const shouldBeInProfilePictureQuery = `
      SELECT 
        a.id,
        a.username,
        a.lifecycle_state,
        COUNT(CASE WHEN awp.phase = 'username' AND awp.status = 'completed' THEN 1 END) as username_completed,
        COUNT(CASE WHEN awp.phase = 'profile_picture' THEN 1 END) as has_profile_picture_phase,
        MAX(CASE WHEN awp.phase = 'profile_picture' THEN awp.status END) as profile_picture_status
      FROM accounts a
      LEFT JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE a.lifecycle_state = 'warmup'
      GROUP BY a.id, a.username, a.lifecycle_state
      HAVING COUNT(CASE WHEN awp.phase = 'username' AND awp.status = 'completed' THEN 1 END) > 0
      AND COUNT(CASE WHEN awp.phase = 'profile_picture' THEN 1 END) = 0
      ORDER BY a.username
      LIMIT 10;
    `;
    
    const shouldBeResult = await client.query(shouldBeInProfilePictureQuery);
    
    if (shouldBeResult.rows.length === 0) {
      console.log('  ✅ All accounts with completed username phase have profile_picture phase');
    } else {
      console.log(`  ⚠️  Found ${shouldBeResult.rows.length} accounts missing profile_picture phase:`);
      shouldBeResult.rows.forEach(row => {
        console.log(`    - ${row.username} (ID: ${row.id}) - Username completed but no profile_picture phase`);
      });
    }
    
    // 4. Check content assignment for profile pictures
    console.log('\n🎨 Profile Picture Content Assignment:');
    
    // Check available PFP content
    const pfpContentQuery = `
      SELECT 
        cc.id,
        cc.content_type,
        cc.file_path,
        cc.bundle_id,
        cb.name as bundle_name,
        cb.model_id
      FROM central_content cc
      JOIN content_bundles cb ON cc.bundle_id = cb.id
      WHERE cc.content_type = 'pfp'
      ORDER BY cb.model_id, cc.id
      LIMIT 10;
    `;
    
    const pfpContentResult = await client.query(pfpContentQuery);
    
    if (pfpContentResult.rows.length === 0) {
      console.log('  ❌ No PFP content found in central_content table');
    } else {
      console.log(`  📊 Found ${pfpContentResult.rows.length} PFP content items:`);
      pfpContentResult.rows.forEach(row => {
        console.log(`    - ID: ${row.id}, Bundle: ${row.bundle_name} (Model: ${row.model_id}), Path: ${row.file_path}`);
      });
    }
    
    // 5. Check model bundle assignments
    console.log('\n📦 Model Bundle Assignments:');
    const modelBundleQuery = `
      SELECT 
        m.id as model_id,
        m.name as model_name,
        cb.id as bundle_id,
        cb.name as bundle_name,
        COUNT(CASE WHEN cc.content_type = 'pfp' THEN 1 END) as pfp_content_count
      FROM models m
      LEFT JOIN content_bundles cb ON m.id = cb.model_id
      LEFT JOIN central_content cc ON cb.id = cc.bundle_id
      GROUP BY m.id, m.name, cb.id, cb.name
      HAVING COUNT(CASE WHEN cc.content_type = 'pfp' THEN 1 END) > 0
      ORDER BY m.id;
    `;
    
    const modelBundleResult = await client.query(modelBundleQuery);
    
    if (modelBundleResult.rows.length === 0) {
      console.log('  ❌ No models have bundles with PFP content');
    } else {
      console.log(`  📊 Models with PFP content:`);
      modelBundleResult.rows.forEach(row => {
        console.log(`    - Model: ${row.model_name} (ID: ${row.model_id})`);
        console.log(`      Bundle: ${row.bundle_name} (ID: ${row.bundle_id})`);
        console.log(`      PFP Content: ${row.pfp_content_count} items`);
      });
    }
    
    // 6. Check content assignment logic
    console.log('\n🔧 Content Assignment Logic Check:');
    
    // Check if there are accounts in profile_picture phase without content assigned
    const unassignedContentQuery = `
      SELECT 
        a.id,
        a.username,
        a.model_id,
        awp.status,
        awp.assigned_content_id,
        awp.content_assigned_at
      FROM accounts a
      JOIN account_warmup_phases awp ON a.id = awp.account_id
      WHERE awp.phase = 'profile_picture'
      AND a.lifecycle_state = 'warmup'
      AND awp.assigned_content_id IS NULL
      ORDER BY a.username
      LIMIT 10;
    `;
    
    const unassignedResult = await client.query(unassignedContentQuery);
    
    if (unassignedResult.rows.length === 0) {
      console.log('  ✅ All profile_picture phases have content assigned');
    } else {
      console.log(`  ⚠️  Found ${unassignedResult.rows.length} profile_picture phases without content:`);
      unassignedResult.rows.forEach(row => {
        console.log(`    - ${row.username} (ID: ${row.id}, Model: ${row.model_id}) - Status: ${row.status}`);
      });
    }
    
    // 7. Check the content assignment function
    console.log('\n🔍 Testing Content Assignment Function:');
    
    if (unassignedResult.rows.length > 0) {
      const testAccount = unassignedResult.rows[0];
      console.log(`  Testing with account: ${testAccount.username} (ID: ${testAccount.id})`);
      
      // Check if there's available PFP content for this model
      const availableContentQuery = `
        SELECT 
          cc.id,
          cc.file_path,
          cb.name as bundle_name
        FROM central_content cc
        JOIN content_bundles cb ON cc.bundle_id = cb.id
        WHERE cc.content_type = 'pfp'
        AND cb.model_id = $1
        AND cc.id NOT IN (
          SELECT assigned_content_id 
          FROM account_warmup_phases 
          WHERE assigned_content_id IS NOT NULL
          AND phase = 'profile_picture'
        )
        LIMIT 1;
      `;
      
      const availableResult = await client.query(availableContentQuery, [testAccount.model_id]);
      
      if (availableResult.rows.length === 0) {
        console.log(`    ❌ No available PFP content for model ${testAccount.model_id}`);
      } else {
        const availableContent = availableResult.rows[0];
        console.log(`    ✅ Available content: ${availableContent.file_path} (ID: ${availableContent.id})`);
        console.log(`    Bundle: ${availableContent.bundle_name}`);
      }
    }
    
    // 8. Summary and recommendations
    console.log('\n📋 Summary and Recommendations:');
    
    const totalProfilePicturePhases = profilePictureResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    const totalWithContent = profilePictureResult.rows.reduce((sum, row) => sum + parseInt(row.with_content), 0);
    const totalWithoutContent = profilePictureResult.rows.reduce((sum, row) => sum + parseInt(row.without_content), 0);
    
    console.log(`  📊 Profile Picture Phase Stats:`);
    console.log(`    Total phases: ${totalProfilePicturePhases}`);
    console.log(`    With content: ${totalWithContent}`);
    console.log(`    Without content: ${totalWithoutContent}`);
    
    if (totalProfilePicturePhases === 0) {
      console.log('\n  🚨 ISSUE: No accounts in profile_picture phase');
      console.log('    Possible causes:');
      console.log('    1. Profile picture phase not being created during warmup setup');
      console.log('    2. Accounts not progressing to profile_picture phase');
      console.log('    3. Phase ordering issue');
    }
    
    if (totalWithoutContent > 0) {
      console.log('\n  ⚠️  ISSUE: Some profile_picture phases lack content assignment');
      console.log('    Possible causes:');
      console.log('    1. Content assignment service not running');
      console.log('    2. No PFP content available for the model');
      console.log('    3. Content assignment logic not handling profile_picture phase');
    }
    
    if (pfpContentResult.rows.length === 0) {
      console.log('\n  🚨 CRITICAL: No PFP content found');
      console.log('    Action needed: Upload PFP content to content bundles');
    }
    
  } catch (error) {
    console.error('💥 Error checking profile picture phase assignment:', error);
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await checkProfilePicturePhaseAssignment();
    console.log('\n🎉 Profile picture phase assignment check completed!');
  } catch (error) {
    console.error('💥 Check failed:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkProfilePicturePhaseAssignment };