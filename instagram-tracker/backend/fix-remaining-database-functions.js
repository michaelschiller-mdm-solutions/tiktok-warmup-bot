/**
 * Fix the remaining database function with column name errors
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'instagram_tracker',
  password: 'password123',
  port: 5432,
});

async function fixRemainingDatabaseFunctions() {
  try {
    console.log('🔧 Fixing remaining database functions...\n');

    // Fix the get_content_readiness_details function
    console.log('🔧 Fixing get_content_readiness_details function...');
    
    const fixContentReadinessFunction = `
      CREATE OR REPLACE FUNCTION get_content_readiness_details(p_account_id INTEGER)
      RETURNS JSONB AS $$
      DECLARE
          account_record RECORD;
          required_categories TEXT[] := ARRAY['bio', 'name', 'highlight', 'post', 'story'];
          category_name TEXT;
          result JSONB := '{}';
      BEGIN
          -- Get account details
          SELECT * INTO account_record FROM accounts WHERE id = p_account_id;
          
          IF NOT FOUND THEN
              RETURN '{"error": "Account not found"}';
          END IF;
          
          -- Check each required category
          FOREACH category_name IN ARRAY required_categories
          LOOP
              result := result || jsonb_build_object(
                  category_name,
                  EXISTS (
                      SELECT 1 FROM model_bundle_assignments mba
                      JOIN content_bundles cb ON mba.bundle_id = cb.id
                      JOIN bundle_content_assignments bca ON cb.id = bca.bundle_id
                      LEFT JOIN central_content cc ON bca.content_id = cc.id
                      LEFT JOIN central_text_content ctc ON bca.text_content_id = ctc.id
                      WHERE mba.model_id = account_record.model_id 
                      AND mba.status = 'active'
                      AND cb.status = 'active'
                      AND (
                          (cc.id IS NOT NULL AND cc.categories::text LIKE '%' || category_name || '%')
                          OR (ctc.id IS NOT NULL AND ctc.categories::text LIKE '%' || category_name || '%')
                      )
                  )
              );
          END LOOP;
          
          RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await pool.query(fixContentReadinessFunction);
    console.log('✅ Fixed get_content_readiness_details function');

    // Test the function
    console.log('\n🧪 Testing fixed function...');
    const testQuery = `SELECT get_content_readiness_details(199) as result`;
    const testResult = await pool.query(testQuery);
    console.log(`✅ Function test result: ${JSON.stringify(testResult.rows[0].result)}`);

    // Test the bot_ready_accounts view again
    console.log('\n🧪 Testing bot_ready_accounts view...');
    const viewTestQuery = `SELECT COUNT(*) as count FROM bot_ready_accounts WHERE ready_phases > 0`;
    const viewTestResult = await pool.query(viewTestQuery);
    console.log(`✅ bot_ready_accounts view works, found ${viewTestResult.rows[0].count} ready accounts`);

  } catch (error) {
    console.error('❌ Error fixing database functions:', error);
  } finally {
    await pool.end();
  }
}

fixRemainingDatabaseFunctions();