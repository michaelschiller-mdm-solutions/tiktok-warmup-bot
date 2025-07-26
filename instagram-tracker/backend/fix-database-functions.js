/**
 * Fix database functions with column name errors
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function fixDatabaseFunctions() {
  try {
    console.log('🔧 Fixing database functions...\n');

    // First, let's check the central_content table structure
    const contentStructureQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'central_content'
      AND column_name LIKE '%categor%'
      ORDER BY ordinal_position
    `;
    
    const contentStructure = await pool.query(contentStructureQuery);
    console.log('📊 central_content category columns:');
    contentStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Check central_text_content structure
    const textStructureQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns 
      WHERE table_name = 'central_text_content'
      AND column_name LIKE '%categor%'
      ORDER BY ordinal_position
    `;
    
    const textStructure = await pool.query(textStructureQuery);
    console.log('\n📊 central_text_content category columns:');
    textStructure.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

    // Now fix the model_has_required_content_bundles function
    console.log('\n🔧 Fixing model_has_required_content_bundles function...');
    
    const fixFunctionQuery = `
      CREATE OR REPLACE FUNCTION model_has_required_content_bundles(p_model_id INTEGER)
      RETURNS BOOLEAN AS $$
      DECLARE
          required_categories TEXT[] := ARRAY['bio', 'name', 'highlight', 'post', 'story'];
          category_name TEXT;
      BEGIN
          -- Check if model has active bundle assignments
          IF NOT EXISTS (
              SELECT 1 FROM model_bundle_assignments mba
              JOIN content_bundles cb ON mba.bundle_id = cb.id
              WHERE mba.model_id = p_model_id 
              AND mba.status = 'active'
              AND cb.status = 'active'
          ) THEN
              RETURN FALSE;
          END IF;
          
          -- Check each required category
          FOREACH category_name IN ARRAY required_categories
          LOOP
              IF NOT EXISTS (
                  SELECT 1 FROM model_bundle_assignments mba
                  JOIN content_bundles cb ON mba.bundle_id = cb.id
                  JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
                  LEFT JOIN central_content cc ON bca.content_id = cc.id
                  LEFT JOIN central_text_content ctc ON bca.text_content_id = ctc.id
                  WHERE mba.model_id = p_model_id 
                  AND mba.status = 'active'
                  AND cb.status = 'active'
                  AND (
                      (cc.id IS NOT NULL AND cc.categories::text LIKE '%' || category_name || '%')
                      OR (ctc.id IS NOT NULL AND ctc.categories::text LIKE '%' || category_name || '%')
                  )
              ) THEN
                  RETURN FALSE;
              END IF;
          END LOOP;
          
          RETURN TRUE;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await pool.query(fixFunctionQuery);
    console.log('✅ Fixed model_has_required_content_bundles function');

    // Test the function
    console.log('\n🧪 Testing fixed function...');
    const testQuery = `SELECT model_has_required_content_bundles(1) as result`;
    const testResult = await pool.query(testQuery);
    console.log(`✅ Function test result: ${testResult.rows[0].result}`);

    // Now test the bot_ready_accounts view
    console.log('\n🧪 Testing bot_ready_accounts view...');
    const viewTestQuery = `SELECT COUNT(*) as count FROM bot_ready_accounts`;
    const viewTestResult = await pool.query(viewTestQuery);
    console.log(`✅ bot_ready_accounts view works, found ${viewTestResult.rows[0].count} ready accounts`);

    // Get some sample ready accounts
    const sampleQuery = `
      SELECT id, username, lifecycle_state, ready_phases, completed_phases, has_required_content
      FROM bot_ready_accounts 
      WHERE ready_phases > 0
      LIMIT 5
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    console.log('\n📋 Sample ready accounts:');
    sampleResult.rows.forEach(account => {
      console.log(`  - ${account.username}: ${account.ready_phases} ready phases, content: ${account.has_required_content}`);
    });

  } catch (error) {
    console.error('❌ Error fixing database functions:', error);
  } finally {
    await pool.end();
  }
}

fixDatabaseFunctions();