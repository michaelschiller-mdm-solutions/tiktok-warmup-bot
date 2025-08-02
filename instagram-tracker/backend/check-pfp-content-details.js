// Check detailed pfp content availability
const { db } = require('./dist/database');

(async () => {
  try {
    const client = await db.connect();
    
    console.log('🔍 Checking pfp content details...\n');
    
    // Check central_content for pfp category
    const pfpContentResult = await client.query(`
      SELECT 
        id, filename, original_name, file_path, content_type, 
        categories, status, created_at
      FROM central_content 
      WHERE categories ? 'pfp'
      ORDER BY created_at DESC
    `);
    
    console.log('📁 Central Content with pfp category:');
    if (pfpContentResult.rows.length > 0) {
      pfpContentResult.rows.forEach(row => {
        console.log(`  - ID: ${row.id}`);
        console.log(`    File: ${row.filename} (${row.original_name})`);
        console.log(`    Path: ${row.file_path}`);
        console.log(`    Type: ${row.content_type}`);
        console.log(`    Categories: ${JSON.stringify(row.categories)}`);
        console.log(`    Status: ${row.status}`);
        console.log(`    Created: ${row.created_at}`);
        console.log('');
      });
    } else {
      console.log('  ❌ No pfp content found');
    }
    
    // Check if models have pfp content assigned
    const modelPfpResult = await client.query(`
      SELECT 
        m.id as model_id, m.name as model_name,
        COUNT(cc.id) as pfp_content_count
      FROM models m
      LEFT JOIN central_content cc ON cc.categories ? 'pfp'
      GROUP BY m.id, m.name
      ORDER BY m.name
    `);
    
    console.log('🎯 Models and pfp content availability:');
    if (modelPfpResult.rows.length > 0) {
      modelPfpResult.rows.forEach(row => {
        console.log(`  - Model: ${row.model_name} (ID: ${row.model_id})`);
        console.log(`    Available pfp content: ${row.pfp_content_count} items`);
      });
    } else {
      console.log('  ❌ No models found');
    }
    
    // Check if there are any accounts that might need profile pictures
    const accountsResult = await client.query(`
      SELECT 
        a.id, a.username, a.model_id, m.name as model_name,
        a.lifecycle_state, a.profile_picture_url
      FROM accounts a
      JOIN models m ON a.model_id = m.id
      WHERE a.lifecycle_state IN ('warmup', 'ready_for_bot_assignment')
      ORDER BY a.model_id, a.username
      LIMIT 10
    `);
    
    console.log('\n👥 Sample accounts that might need profile pictures:');
    if (accountsResult.rows.length > 0) {
      accountsResult.rows.forEach(row => {
        console.log(`  - ${row.username} (Model: ${row.model_name})`);
        console.log(`    Lifecycle: ${row.lifecycle_state}`);
        console.log(`    Current PFP URL: ${row.profile_picture_url || 'None'}`);
      });
    } else {
      console.log('  ❌ No accounts in warmup or ready state found');
    }
    
    client.release();
    console.log('\n✅ PFP content details check completed');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error checking pfp content details:', err);
    process.exit(1);
  }
})();