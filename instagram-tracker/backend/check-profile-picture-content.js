// Check if profile_picture content category exists in the system
const { db } = require('./dist/database');

(async () => {
  try {
    const client = await db.connect();
    
    console.log('🔍 Checking for profile_picture content category...\n');
    
    // Check central_content for profile_picture category
    const centralContentResult = await client.query(`
      SELECT 
        id, filename, categories, status, created_at
      FROM central_content 
      WHERE categories ? 'profile_picture'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log('📁 Central Content with profile_picture category:');
    if (centralContentResult.rows.length > 0) {
      centralContentResult.rows.forEach(row => {
        console.log(`  - ID: ${row.id}, File: ${row.filename}, Categories: ${JSON.stringify(row.categories)}`);
      });
    } else {
      console.log('  ❌ No central content found with profile_picture category');
    }
    
    // Check model_content for profile_picture category (if this table exists)
    try {
      const modelContentResult = await client.query(`
        SELECT 
          mc.id, mc.model_id, mc.categories, m.name as model_name
        FROM model_content mc
        JOIN models m ON mc.model_id = m.id
        WHERE mc.categories ? 'profile_picture'
        ORDER BY mc.created_at DESC
        LIMIT 10
      `);
      
      console.log('\n🎯 Model Content with profile_picture category:');
      if (modelContentResult.rows.length > 0) {
        modelContentResult.rows.forEach(row => {
          console.log(`  - ID: ${row.id}, Model: ${row.model_name}, Categories: ${JSON.stringify(row.categories)}`);
        });
      } else {
        console.log('  ❌ No model content found with profile_picture category');
      }
    } catch (error) {
      console.log('\n⚠️  model_content table may not exist or has different structure');
    }
    
    // Check all available categories in central_content
    const categoriesResult = await client.query(`
      SELECT DISTINCT jsonb_array_elements_text(categories) as category
      FROM central_content
      WHERE status = 'active'
      ORDER BY category
    `);
    
    console.log('\n📋 All available categories in central_content:');
    if (categoriesResult.rows.length > 0) {
      categoriesResult.rows.forEach(row => {
        console.log(`  - ${row.category}`);
      });
    } else {
      console.log('  ❌ No categories found');
    }
    
    // Check warmup phases that might need profile_picture content
    const warmupPhasesResult = await client.query(`
      SELECT DISTINCT phase
      FROM account_warmup_phases
      ORDER BY phase
    `);
    
    console.log('\n🔄 Current warmup phases in system:');
    if (warmupPhasesResult.rows.length > 0) {
      warmupPhasesResult.rows.forEach(row => {
        console.log(`  - ${row.phase}`);
      });
    } else {
      console.log('  ❌ No warmup phases found');
    }
    
    client.release();
    console.log('\n✅ Profile picture content check completed');
    process.exit(0);
    
  } catch (err) {
    console.error('❌ Error checking profile picture content:', err);
    process.exit(1);
  }
})();